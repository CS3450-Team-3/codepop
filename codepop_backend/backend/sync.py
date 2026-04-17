"""
Inter-server sync orchestration.

Usage:
    Call sync_region(fetch_fn, push_fn, local_server) from the region leader
    to run a three-phase sync:

    Phase 1 – Gather:   fetch data from every regional peer → leader
    Phase 2 – Exchange: leader pushes merged data to every other region leader,
                        then fetches their data and incorporates it
    Phase 3 – Broadcast: leader pushes the final merged dataset to every regional
                         peer and updates its own local DB

The fetch_fn / push_fn pair is the extension point: swap them out to sync
different data types without changing the orchestrator logic.

Payload contract:
    All fetch_fn / push_fn implementations must exchange dicts of the shape:
        {"items": [<serialized record>, ...]}
    Deduplication on write is left to push_fn (it knows the right key per type).
"""

import logging
import requests
from typing import Callable

from django.conf import settings

from .models import ServerRegistry

TRIGGER_SYNC_PATH = "/backend/p2p/trigger-sync/"
MASTERLIST_BROADCAST_PATH = "/backend/p2p/broadcast-masterlist/"

logger = logging.getLogger(__name__)

SYNC_TIMEOUT = 10  # seconds before an inter-server request is abandoned


# ── Transport helpers ─────────────────────────────────────────────────────────

def _build_auth_headers(local_server: ServerRegistry) -> dict:
    """Return HTTP headers that identify this server to a remote peer."""
    # Standardize: remove ALL whitespace (newlines, spaces) from the PEM
    clean_pubkey = "".join(local_server.PublicKey.split())
    key_fingerprint = clean_pubkey[:64]
    token = f"{local_server.ServerID}:{key_fingerprint}"
    return {
        "Authorization": f"Server-Token {token}",
        "Content-Type": "application/json",
        "X-Source-Server-ID": str(local_server.ServerID),
    }


def http_get(remote_server: ServerRegistry, path: str, local_server: ServerRegistry) -> dict:
    """
    Authenticated GET to a remote server.

    Args:
        remote_server: Target server (provides ServerURL).
        path: URL path, e.g. "/backend/sync/masterlist/".
        local_server: Calling server's own row (for auth headers).

    Returns:
        Parsed JSON dict from the response body.

    Raises:
        requests.RequestException: On network failure or non-2xx response.
    """
    url = remote_server.ServerURL.rstrip("/") + path
    response = requests.get(url, headers=_build_auth_headers(local_server), timeout=SYNC_TIMEOUT)
    response.raise_for_status()
    return response.json()


def http_post(remote_server: ServerRegistry, path: str, data: dict, local_server: ServerRegistry) -> dict:
    """
    Authenticated POST to a remote server.

    Args:
        remote_server: Target server (provides ServerURL).
        path: URL path, e.g. "/backend/sync/masterlist/".
        data: JSON-serializable payload.
        local_server: Calling server's own row (for auth headers).

    Returns:
        Parsed JSON dict from the response body.

    Raises:
        requests.RequestException: On network failure or non-2xx response.
    """
    url = remote_server.ServerURL.rstrip("/") + path
    response = requests.post(url, json=data, headers=_build_auth_headers(local_server), timeout=SYNC_TIMEOUT)
    response.raise_for_status()
    return response.json()


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_local_server() -> ServerRegistry:
    """
    Return this deployed instance's own ServerRegistry row.

    Each instance must set settings.LOCAL_SERVER_ID (integer PK) so the
    framework can identify itself unambiguously.
    """
    server_id = getattr(settings, "LOCAL_SERVER_ID", None)
    if server_id is None:
        raise RuntimeError(
            "settings.LOCAL_SERVER_ID is not configured. "
            "Set LOCAL_SERVER_ID in settings or via the LOCAL_SERVER_ID env var."
        )
    return ServerRegistry.objects.get(pk=server_id)


def _get_regional_peers(local_server: ServerRegistry) -> list[ServerRegistry]:
    """Return all Active servers in the same region, excluding local_server."""
    return list(
        ServerRegistry.objects.filter(
            Region=local_server.Region,
            Status="Active",
        ).exclude(pk=local_server.ServerID)
    )


def _get_region_leader(local_server: ServerRegistry) -> ServerRegistry | None:
    """Return the region leader for local_server's region, or None if local_server is already the leader."""
    if local_server.IsRegionLeader:
        return None
    return ServerRegistry.objects.filter(
        Region=local_server.Region,
        IsRegionLeader=True,
        Status="Active",
    ).exclude(pk=local_server.ServerID).first()


def trigger_sync_on_leader(local_server: ServerRegistry) -> None:
    """Forward a sync trigger to this server's region leader via HTTP POST."""
    leader = _get_region_leader(local_server)
    if leader is None:
        raise RuntimeError(
            f"No active region leader found for region {local_server.Region}. "
            "Cannot forward sync trigger."
        )
    http_post(leader, TRIGGER_SYNC_PATH, {}, local_server)


def _get_other_region_leaders(local_server: ServerRegistry) -> list[ServerRegistry]:
    """Return Active region leaders in every region other than local_server's."""
    return list(
        ServerRegistry.objects.filter(
            IsRegionLeader=True,
            Status="Active",
        ).exclude(Region=local_server.Region)
    )


def _get_other_region_representatives(local_server: ServerRegistry) -> list[ServerRegistry]:
    """
    Return one representative server per region other than local_server's.

    For regions that have a designated leader, the leader is returned.
    For regions with no active leader, any active server in that region is
    returned so that leaderless regions are still included in the Phase 2
    data exchange.
    """
    from .models import Region
    targets = []
    for region in Region.objects.exclude(pk=local_server.Region_id):
        rep = (
            ServerRegistry.objects.filter(Region=region, Status="Active", IsRegionLeader=True).first()
            or ServerRegistry.objects.filter(Region=region, Status="Active").first()
        )
        if rep:
            targets.append(rep)
    return targets


def _get_all_other_region_servers(local_server: ServerRegistry) -> list[ServerRegistry]:
    """Return every Active server not in local_server's own region."""
    return list(
        ServerRegistry.objects.filter(Status="Active").exclude(Region=local_server.Region)
    )


# ── Merge ─────────────────────────────────────────────────────────────────────

def _merge_data_chunks(chunks: list[dict]) -> dict:
    """
    Flatten a list of {"items": [...]} dicts into a single {"items": [...]}.

    Deduplication is intentionally deferred to push_fn because the correct
    identity key (e.g. UserID, ServerID) is data-type-specific.
    """
    merged: list = []
    for chunk in chunks:
        merged.extend(chunk.get("items", []))
    return {"items": merged}


# ── Generic three-phase sync orchestrator ─────────────────────────────────────

def sync_region(
    fetch_fn: Callable[[ServerRegistry], dict],
    push_fn: Callable[[ServerRegistry, dict], None],
    local_server: ServerRegistry,
) -> None:
    """
    Run a three-phase regional sync from the region leader.

    The caller supplies fetch_fn and push_fn to define WHAT data moves;
    this function handles WHO to contact and in which order.

    Phase 1 – Gather:
        fetch_fn is called on each regional peer to collect their data.
        Unreachable peers are skipped with a warning.

    Phase 2 – Exchange:
        The leader's own data is merged with Phase 1 results, then each
        other region leader receives the merged payload via push_fn and
        contributes their own data back via fetch_fn.

    Phase 3 – Broadcast:
        The fully merged dataset is distributed to every regional peer and
        written to the leader's local DB.

    Phase 3b – Direct cross-region push:
        The fully merged dataset is pushed directly to every active server in
        every other region. This avoids cascading HTTP calls (and their
        timeouts) by having the initiating leader write to each remote server
        individually instead of asking a remote representative to re-broadcast.

    Callable contracts:
        fetch_fn(server: ServerRegistry) -> dict
            Return {"items": [...]} for the given server.
            If server is local, read from the local DB.
            If server is remote, make an HTTP GET.

        push_fn(server: ServerRegistry, data: dict) -> None
            Write {"items": [...]} to the given server.
            If server is local, write to the local DB (upsert).
            If server is remote, make an HTTP POST.

    Args:
        fetch_fn:     Callable to retrieve data from a server.
        push_fn:      Callable to push data to a server.
        local_server: This server's own ServerRegistry row. Must be the leader.

    Raises:
        ValueError: If local_server.IsRegionLeader is False.
    """
    if not local_server.IsRegionLeader:
        raise ValueError(
            f"sync_region() called on non-leader server {local_server.ServerID}. "
            "Only the region leader may initiate a sync."
        )

    # ── Phase 1: Gather data from regional peers ──────────────────────────────
    logger.info("Sync Phase 1: gathering from regional peers.")
    all_data: list[dict] = []
    for peer in _get_regional_peers(local_server):
        try:
            peer_data = fetch_fn(peer)
            all_data.append(peer_data)
            logger.info("Phase 1: fetched from peer %s (%s).", peer.ServerID, peer.ServerURL)
        except Exception as exc:
            logger.warning(
                "Phase 1: could not fetch from peer %s (%s): %s — skipping.",
                peer.ServerID, peer.ServerURL, exc,
            )

    # Include the leader's own data before cross-region exchange.
    try:
        local_data = fetch_fn(local_server)
        all_data.append(local_data)
    except Exception as exc:
        logger.error("Phase 1: failed to fetch local data: %s — aborting sync.", exc)
        return

    merged = _merge_data_chunks(all_data)

    # ── Phase 2: Exchange with one representative per other region ───────────────
    # Uses the leader when one exists; falls back to any active server for
    # leaderless regions so they are not silently skipped.
    logger.info("Sync Phase 2: exchanging with other region representatives.")
    for rep in _get_other_region_representatives(local_server):
        try:
            rep_data = fetch_fn(rep)
            logger.info("Phase 2: received data from %s (%s).", rep.ServerID, rep.ServerURL)
            merged = _merge_data_chunks([merged, rep_data])
            push_fn(rep, merged)
            logger.info("Phase 2: pushed merged data to %s (%s).", rep.ServerID, rep.ServerURL)
        except Exception as exc:
            logger.warning(
                "Phase 2: exchange with %s (%s) failed: %s — skipping.",
                rep.ServerID, rep.ServerURL, exc,
            )

    # ── Phase 3: Broadcast merged data to all regional peers ─────────────────
    logger.info("Sync Phase 3: broadcasting merged data to regional peers.")
    for peer in _get_regional_peers(local_server):
        try:
            push_fn(peer, merged)
            logger.info("Phase 3: pushed to peer %s (%s).", peer.ServerID, peer.ServerURL)
        except Exception as exc:
            logger.warning(
                "Phase 3: could not push to peer %s (%s): %s — skipping.",
                peer.ServerID, peer.ServerURL, exc,
            )

    # Write merged data back to the leader's own DB last.
    try:
        push_fn(local_server, merged)
        logger.info("Phase 3: wrote merged data to local server %s.", local_server.ServerID)
    except Exception as exc:
        logger.error("Phase 3: failed to write merged data locally: %s", exc)

    # ── Phase 3b: Push merged data directly to every server in other regions ─────
    logger.info("Sync Phase 3b: pushing merged data directly to all other-region servers.")
    for server in _get_all_other_region_servers(local_server):
        try:
            push_fn(server, merged)
            logger.info("Phase 3b: pushed to %s (%s).", server.ServerID, server.ServerURL)
        except Exception as exc:
            logger.warning(
                "Phase 3b: failed to push to %s (%s): %s — skipping.",
                server.ServerID, server.ServerURL, exc,
            )

    logger.info("Sync complete for region leader %s.", local_server.ServerID)


# ── Example: MasterList sync ──────────────────────────────────────────────────

MASTERLIST_SYNC_PATH = "/backend/sync/masterlist/"


def masterlist_fetch_fn(server: ServerRegistry) -> dict:
    """
    fetch_fn implementation for MasterList data.

    Local server: reads directly from the DB.
    Remote server: performs an HTTP GET to the sync endpoint.
    """
    from .serializers import MasterListSerializer
    from .models import MasterList

    local = get_local_server()
    if server.ServerID == local.ServerID:
        records = MasterList.objects.select_related("HomeServerID").all()
        serializer = MasterListSerializer(records, many=True)
        return {"items": list(serializer.data)}
    else:
        return http_get(server, MASTERLIST_SYNC_PATH, local)


def masterlist_push_fn(server: ServerRegistry, data: dict) -> None:
    """
    push_fn implementation for MasterList data.

    Local server: upserts each item by UserID.
    Remote server: performs an HTTP POST to the sync endpoint.
    """
    from django.contrib.auth import get_user_model
    from .models import MasterList

    User = get_user_model()
    local = get_local_server()
    if server.ServerID == local.ServerID:
        known_server_ids = set(
            ServerRegistry.objects.values_list("ServerID", flat=True)
        )
        for item in data.get("items", []):
            home_id = str(item.get("HomeServerID", ""))
            if home_id not in known_server_ids:
                logger.warning(
                    "masterlist_push: skipping UserID %s — HomeServerID %s not in local registry.",
                    item.get("UserID"), home_id,
                )
                continue
            MasterList.objects.update_or_create(
                UserID=item["UserID"],
                defaults={
                    "Username": item["Username"],
                    "HomeServerID_id": home_id,
                },
            )
            # Ensure a stub CustomUser exists so the user appears in dashboards
            # on every server, not just their home server.
            try:
                user, created = User.objects.get_or_create(
                    id=item["UserID"],
                    defaults={
                        "username": item["Username"],
                        "home_server_id": home_id,
                        "user_type": "customer",
                    },
                )
                if created:
                    user.set_unusable_password()
                    user.save(update_fields=["password"])
                    logger.info(
                        "masterlist_push: created stub CustomUser for %s (home=%s).",
                        item["Username"], home_id,
                    )
                elif user.username != item["Username"]:
                    # Keep username in sync if it changed on the home server.
                    user.username = item["Username"]
                    user.home_server_id = home_id
                    user.save(update_fields=["username", "home_server_id"])
            except Exception as exc:
                logger.warning(
                    "masterlist_push: could not create stub CustomUser for %s (%s): %s — skipping.",
                    item.get("Username"), item.get("UserID"), exc,
                )
    else:
        http_post(server, MASTERLIST_SYNC_PATH, data, local)


def sync_masterlist(local_server: ServerRegistry | None = None) -> None:
    """
    Sync MasterList data across all regions. Must be called on the region leader.

    Args:
        local_server: This server's ServerRegistry row. If None, resolved via
                      settings.LOCAL_SERVER_ID.
    """
    if local_server is None:
        local_server = get_local_server()
    sync_region(masterlist_fetch_fn, masterlist_push_fn, local_server)

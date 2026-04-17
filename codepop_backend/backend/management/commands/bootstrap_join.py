"""
Join the P2P network by sending a signed JOIN request to bootstrap nodes.

Reads BOOTSTRAP_NODES env var (comma-separated host:port strings, no scheme).
Sends a signed JOIN request to each in order; stops after the first success.
Registers all peers returned in the response.

Environment variables consumed:
  BOOTSTRAP_NODES  - e.g. "backend1:9000,backup-bootstrap:9000"
  LOCAL_SERVER_ID  - this node's ID (derived by entrypoint.sh)
  SERVER_URL       - this node's reachable address
  REGION           - region name to announce (fallback: SETUP_REGION_NAME, then "default")
"""
import base64
import os
from datetime import datetime, timezone

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from backend.models import Region, ServerRegistry


class Command(BaseCommand):
    help = 'Bootstrap this node into the P2P network via signed JOIN requests.'

    def handle(self, *args, **options):
        bootstrap_raw = os.environ.get('BOOTSTRAP_NODES', '').strip()
        if not bootstrap_raw:
            self.stdout.write(self.style.WARNING('BOOTSTRAP_NODES not set — skipping bootstrap_join.'))
            return

        node_id = (os.environ.get('LOCAL_SERVER_ID') or str(settings.LOCAL_SERVER_ID or '')).strip()
        server_url = os.environ.get('SERVER_URL', '').strip()
        region = (os.environ.get('REGION') or os.environ.get('SETUP_REGION_NAME', 'default')).strip()
        store_name    = os.environ.get('STORE_NAME', '').strip()
        store_address = os.environ.get('STORE_ADDRESS', '').strip()
        store_city    = os.environ.get('STORE_CITY', '').strip()
        store_state   = os.environ.get('STORE_STATE', '').strip()
        store_zip     = os.environ.get('STORE_ZIP', '').strip()
        store_geohash = os.environ.get('STORE_GEOHASH', '').strip()

        if not node_id or not server_url:
            self.stderr.write(self.style.ERROR('LOCAL_SERVER_ID and SERVER_URL must be set.'))
            raise SystemExit(1)

        # Build signed JOIN payload
        from cryptography.hazmat.primitives import serialization, hashes
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.hazmat.backends import default_backend

        timestamp = datetime.now(timezone.utc).isoformat()
        network_token = settings.NETWORK_TOKEN
        canonical = f"{node_id}:{server_url}:{timestamp}:{network_token}".encode('utf-8')

        private_key = serialization.load_pem_private_key(
            settings.PRIVATE_KEY.encode('utf-8'),
            password=None,
            backend=default_backend()
        )
        sig_b64 = base64.b64encode(
            private_key.sign(canonical, padding.PKCS1v15(), hashes.SHA256())
        ).decode('utf-8')

        payload = {
            'node_id': node_id,
            'public_key': settings.PUBLIC_KEY,
            'region': region,
            'address': server_url,
            'store_name':    store_name,
            'store_address': store_address,
            'store_city':    store_city,
            'store_state':   store_state,
            'store_zip':     store_zip,
            'store_geohash': store_geohash,
            'timestamp': timestamp,
            'network_token': network_token,
            'signature': sig_b64,
        }

        self.stdout.write(f'Joining as node {node_id[:16]}... ({server_url})')

        for raw_url in bootstrap_raw.split(','):
            bootstrap_url = f"http://{raw_url.strip()}"
            join_url = bootstrap_url.rstrip('/') + '/backend/p2p/join/'
            self.stdout.write(f'  → {join_url}')
            try:
                resp = requests.post(join_url, json=payload, timeout=15)
                resp.raise_for_status()
                peers = resp.json().get('peers', [])
                self.stdout.write(self.style.SUCCESS(
                    f'  ✓ Joined. Received {len(peers)} peer(s).'
                ))
                self._register_peers(peers)
                return  # One successful join is enough
            except requests.HTTPError as e:
                try:
                    reason = e.response.json().get('error', e.response.text)
                except Exception:
                    reason = e.response.text
                self.stderr.write(self.style.ERROR(
                    f'  ✗ Rejected ({e.response.status_code}): {reason}'
                ))
            except requests.RequestException as e:
                self.stderr.write(self.style.WARNING(f'  ✗ Unreachable: {e}'))

        self.stderr.write(self.style.ERROR(
            'Bootstrap join failed. Check the rejection reason above.\n'
            f'  node_id  : {node_id}\n'
            f'  address  : {server_url}\n'
            f'  region   : {region}'
        ))

    def _register_peers(self, peer_list: list) -> None:
        """Upsert each peer from the returned peer list into ServerRegistry."""
        local_id = (os.environ.get('LOCAL_SERVER_ID') or str(settings.LOCAL_SERVER_ID or '')).strip()
        for peer in peer_list:
            pid = peer.get('node_id')
            purl = peer.get('address')
            pkey = peer.get('public_key')
            region_name = peer.get('region') or 'default'
            is_leader = peer.get('is_region_leader', False)

            if not pid or not purl or not pkey:
                self.stdout.write(self.style.WARNING(f'  Skipping incomplete peer entry: {peer}'))
                continue

            # Don't register ourselves
            if pid == local_id:
                continue

            store_name    = peer.get('store_name', '')
            store_address = peer.get('store_address', '')
            store_city    = peer.get('store_city', '')
            store_state   = peer.get('store_state', '')
            store_zip     = peer.get('store_zip', '')
            store_geohash = peer.get('store_geohash', '')

            region, _ = Region.objects.get_or_create(RegionName=region_name)
            ServerRegistry.objects.update_or_create(
                ServerID=pid,
                defaults={
                    'ServerURL':      purl,
                    'PublicKey':      pkey,
                    'Status':         'Active',
                    'IsRegionLeader': is_leader,
                    'Region':         region,
                    'StoreName':      store_name,
                    'StoreAddress':   store_address,
                    'StoreCity':      store_city,
                    'StoreState':     store_state,
                    'StoreZip':       store_zip,
                    'StoreGeohash':   store_geohash,
                }
            )
            self.stdout.write(f'  Registered peer {pid[:12]}... at {purl} ({store_name or "no name"})')

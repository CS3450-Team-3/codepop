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

        node_id = os.environ.get('LOCAL_SERVER_ID', '').strip()
        server_url = os.environ.get('SERVER_URL', '').strip()
        region = (os.environ.get('REGION') or os.environ.get('SETUP_REGION_NAME', 'default')).strip()

        if not node_id or not server_url:
            self.stderr.write(self.style.ERROR('LOCAL_SERVER_ID and SERVER_URL must be set.'))
            raise SystemExit(1)

        # Build signed JOIN payload
        from cryptography.hazmat.primitives import serialization, hashes
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.hazmat.backends import default_backend

        timestamp = datetime.now(timezone.utc).isoformat()
        canonical = f"{node_id}:{server_url}:{timestamp}".encode('utf-8')

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
            'timestamp': timestamp,
            'signature': sig_b64,
        }

        for raw_url in bootstrap_raw.split(','):
            bootstrap_url = f"http://{raw_url.strip()}"
            join_url = bootstrap_url.rstrip('/') + '/backend/p2p/join/'
            self.stdout.write(f'Sending JOIN to {join_url}...')
            try:
                resp = requests.post(join_url, json=payload, timeout=15)
                resp.raise_for_status()
                peers = resp.json().get('peers', [])
                self.stdout.write(self.style.SUCCESS(
                    f'  Joined via {bootstrap_url}. Received {len(peers)} peers.'
                ))
                self._register_peers(peers)
                return  # One successful join is enough
            except requests.HTTPError as e:
                self.stderr.write(self.style.ERROR(
                    f'  JOIN rejected by {bootstrap_url}: {e.response.status_code} — {e.response.text}'
                ))
            except requests.RequestException as e:
                self.stderr.write(self.style.WARNING(f'  Could not reach {bootstrap_url}: {e}'))

        self.stderr.write(self.style.ERROR('All bootstrap nodes failed — could not join network.'))

    def _register_peers(self, peer_list: list) -> None:
        """Upsert each peer from the returned peer list into ServerRegistry."""
        local_id = os.environ.get('LOCAL_SERVER_ID', '')
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

            region, _ = Region.objects.get_or_create(RegionName=region_name)
            ServerRegistry.objects.update_or_create(
                ServerID=pid,
                defaults={
                    'ServerURL': purl,
                    'PublicKey': pkey,
                    'Status': 'Active',
                    'IsRegionLeader': is_leader,
                    'Region': region,
                }
            )
            self.stdout.write(f'  Registered peer {pid[:12]}... at {purl}')

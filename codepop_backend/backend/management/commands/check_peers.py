"""
Sanity-check this server's identity and its known peers.

Usage:
    python manage.py check_peers          # list peers from DB
    python manage.py check_peers --ping   # also probe each peer's /health/
"""
import os

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from backend.models import ServerRegistry
from backend.sync import get_local_server


class Command(BaseCommand):
    help = "Show this server's identity and all peers it knows about."

    def add_arguments(self, parser):
        parser.add_argument(
            '--ping',
            action='store_true',
            help='Probe each peer\'s /health/ endpoint and show UP/DOWN status.',
        )

    def handle(self, *args, **options):
        local_id = os.environ.get('LOCAL_SERVER_ID', '') or str(settings.LOCAL_SERVER_ID or '')

        # ── Own identity ───────────────────────────────────────────────────────
        try:
            me = get_local_server()
            region = me.Region.RegionName if me.Region else 'none'
            leader = me.IsRegionLeader
            url = me.ServerURL
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Could not load local server: {e}'))
            region, leader, url = '?', False, os.environ.get('SERVER_URL', '?')

        self.stdout.write(self.style.SUCCESS('\n── This server ─────────────────────────────────────'))
        self.stdout.write(f'  ID     : {local_id[:20]}...')
        self.stdout.write(f'  URL    : {url}')
        self.stdout.write(f'  Region : {region}  (leader: {leader})')

        # ── Known peers ────────────────────────────────────────────────────────
        peers = ServerRegistry.objects.exclude(ServerID=local_id).order_by('ServerURL')

        if not peers.exists():
            self.stdout.write(self.style.WARNING('\n  No peers in registry — bootstrap join may not have run yet.\n'))
            return

        self.stdout.write(self.style.SUCCESS(f'\n── Peers ({peers.count()}) ──────────────────────────────────────'))
        for peer in peers:
            region_name = peer.Region.RegionName if peer.Region else 'none'
            short_id = peer.ServerID[:16] + '...'

            if options['ping']:
                try:
                    r = requests.get(peer.ServerURL.rstrip('/') + '/health/', timeout=5)
                    badge = self.style.SUCCESS('UP') if r.status_code == 200 else self.style.WARNING(f'HTTP {r.status_code}')
                except requests.RequestException as exc:
                    badge = self.style.ERROR(f'DOWN  ({exc})')
                self.stdout.write(f'  [{badge}]  {short_id}  {peer.ServerURL}  region={region_name}  leader={peer.IsRegionLeader}')
            else:
                self.stdout.write(f'  {short_id}  {peer.ServerURL}  region={region_name}  leader={peer.IsRegionLeader}')

        self.stdout.write('')

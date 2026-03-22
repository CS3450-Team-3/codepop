"""
Management command to set up two-server sync test data.

Creates:
  - One Region ("Region-Alpha")
  - ServerRegistry rows for both backend1 (leader) and backend2 (peer)
  - MasterList entries for users homed at this server

Run automatically from entrypoint.sh after populate_db.
Env vars consumed:
  LOCAL_SERVER_ID  - integer PK for this server (1 or 2)
  SERVER_URL       - this server's URL (e.g. http://backend1:9000)
  PEER_SERVER_URL  - the other server's URL (e.g. http://backend2:9000)
"""

import os
from django.core.management.base import BaseCommand
from django.conf import settings
from backend.models import Region, ServerRegistry, MasterList, CustomUser


class Command(BaseCommand):
    help = 'Seed Region, ServerRegistry, and MasterList for two-server sync testing.'

    def handle(self, *args, **options):
        local_id = int(os.environ.get('LOCAL_SERVER_ID', 0))
        if not local_id:
            self.stdout.write(self.style.WARNING('LOCAL_SERVER_ID not set — skipping sync test data.'))
            return

        server_url = os.environ.get('SERVER_URL', 'http://localhost:9000')
        peer_url = os.environ.get('PEER_SERVER_URL', '')
        public_key = settings.PUBLIC_KEY
        peer_id = 2 if local_id == 1 else 1

        # Create shared region
        region, _ = Region.objects.get_or_create(
            RegionID=1,
            defaults={'RegionName': 'Region-Alpha'},
        )

        # Register this server
        ServerRegistry.objects.update_or_create(
            ServerID=local_id,
            defaults={
                'ServerURL': server_url,
                'PublicKey': public_key,
                'Status': 'Active',
                'IsRegionLeader': local_id == 1,
                'Region': region,
            },
        )

        # Register the peer server (may not be reachable yet — that's fine)
        if peer_url:
            ServerRegistry.objects.update_or_create(
                ServerID=peer_id,
                defaults={
                    'ServerURL': peer_url,
                    'PublicKey': public_key,  # shared key for test convenience
                    'Status': 'Active',
                    'IsRegionLeader': peer_id == 1,
                    'Region': region,
                },
            )

        # Seed MasterList with users homed at this server
        local_server = ServerRegistry.objects.get(pk=local_id)
        for user in CustomUser.objects.all():
            MasterList.objects.get_or_create(
                UserID=user.id,
                defaults={
                    'Username': user.username,
                    'HomeServerID': local_server,
                },
            )

        count = MasterList.objects.filter(HomeServerID=local_server).count()
        self.stdout.write(
            self.style.SUCCESS(
                f'Server {local_id} ({server_url}): region=Region-Alpha, '
                f'leader={local_id == 1}, MasterList entries={count}'
            )
        )

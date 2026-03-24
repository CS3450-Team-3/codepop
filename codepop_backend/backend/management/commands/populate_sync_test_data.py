"""
Management command to set up two-server sync test data.

Creates:
  - One Region ("Region-Alpha")
  - ServerRegistry row for THIS server only (backend1)
  - MasterList entries for users homed at this server

The peer server (backend2) self-registers via the P2PJoinView after startup.
Run automatically from entrypoint.sh after populate_db.

Env vars consumed:
  LOCAL_SERVER_ID  - derived key fingerprint for this server (set by entrypoint.sh)
  SERVER_URL       - this server's URL (e.g. http://backend1:9000)
"""

import os
from django.core.management.base import BaseCommand
from django.conf import settings
from backend.models import Region, ServerRegistry, MasterList, CustomUser


class Command(BaseCommand):
    help = 'Seed Region, ServerRegistry, and MasterList for two-server sync testing.'

    def handle(self, *args, **options):
        local_id = os.environ.get('LOCAL_SERVER_ID', '').strip()
        if not local_id:
            self.stdout.write(self.style.WARNING('LOCAL_SERVER_ID not set — skipping sync test data.'))
            return

        server_url = os.environ.get('SERVER_URL', 'http://localhost:9000')
        region_name = (os.environ.get('REGION') or os.environ.get('SETUP_REGION_NAME', 'default')).strip()
        public_key = settings.PUBLIC_KEY

        # Create this server's region — it is the leader since it's the first server in it
        region, _ = Region.objects.get_or_create(RegionName=region_name)

        # Register only this server — peer servers self-register via /backend/p2p/join/
        local_server, _ = ServerRegistry.objects.update_or_create(
            ServerID=local_id,
            defaults={
                'ServerURL': server_url,
                'PublicKey': public_key,
                'Status': 'Active',
                'IsRegionLeader': True,
                'Region': region,
            },
        )

        # Seed MasterList with users homed at this server
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
                f'Server {local_id[:12]}... ({server_url}): region={region_name}, '
                f'leader=True, MasterList entries={count}'
            )
        )

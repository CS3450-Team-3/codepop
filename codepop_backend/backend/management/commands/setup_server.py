"""
First-run server setup wizard.

Runs automatically from entrypoint.sh when RUN_DEV_SEED is not set.
Can also be invoked manually: python manage.py setup_server

Two modes:
  1. Environment-variable mode (Docker / CI):
       SETUP_ADMIN_USERNAME   - admin username
       SETUP_ADMIN_PASSWORD   - admin password
       SETUP_REGION_NAME      - region name  (creates a new region; this server is the leader)
       SETUP_PEER_URL         - peer server URL  (joins that server's region instead)

     LOCAL_SERVER_ID and SERVER_URL are also read from the environment (set by docker-compose).

  2. Interactive mode (local / bare-metal):
     Falls back to terminal prompts when stdin is a TTY and env vars are absent.

After setup the standard menu is seeded and the server is registered in ServerRegistry.
"""
import os
import sys
import getpass

from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings

from backend.setup_helpers import is_configured, seed_menu_data, fetch_peer_discovery
from backend.models import CustomUser, Region, ServerRegistry, MasterList

# Environment variable names used for non-interactive (Docker) setup
_ENV_USERNAME   = 'SETUP_ADMIN_USERNAME'
_ENV_PASSWORD   = 'SETUP_ADMIN_PASSWORD'
_ENV_REGION     = 'SETUP_REGION_NAME'
_ENV_PEER_URL   = 'SETUP_PEER_URL'


def _is_interactive() -> bool:
    """Return True when stdin is connected to a real terminal."""
    return sys.stdin.isatty()


class Command(BaseCommand):
    help = 'First-run server setup: creates admin account, configures region, seeds menu.'

    def handle(self, *args, **options):
        if is_configured():
            self.stdout.write(self.style.WARNING(
                'Server already configured. Skipping setup.'
            ))
            return

        self.stdout.write(self.style.SUCCESS(
            '\n=== CodePop Server First-Run Setup ===\n'
        ))

        interactive = _is_interactive()

        # ── Gather admin credentials ───────────────────────────────────────
        username = os.environ.get(_ENV_USERNAME, '').strip()
        password = os.environ.get(_ENV_PASSWORD, '').strip()

        if not username or not password:
            if not interactive:
                self._abort_non_interactive()

            self.stdout.write('Step 1: Create admin account')
            username = input('  Admin username: ').strip()
            while True:
                password = getpass.getpass('  Admin password (min 8 chars): ')
                confirm  = getpass.getpass('  Confirm password: ')
                if len(password) >= 8 and password == confirm:
                    break
                if len(password) < 8:
                    self.stdout.write('  Password must be at least 8 characters. Try again.')
                else:
                    self.stdout.write('  Passwords do not match. Try again.')
        else:
            if len(password) < 8:
                self.stderr.write(self.style.ERROR(
                    f'  {_ENV_PASSWORD} must be at least 8 characters.'
                ))
                raise SystemExit(1)
            self.stdout.write(f'Step 1: Using admin credentials from environment ({_ENV_USERNAME}={username})')

        # ── Gather region info ─────────────────────────────────────────────
        peer_url    = os.environ.get(_ENV_PEER_URL, '').strip()
        region_name = os.environ.get(_ENV_REGION, '').strip()
        peer_data   = None

        if peer_url:
            # Join mode via env var
            self.stdout.write(f'\nStep 2: Joining region via peer {peer_url} ...')
            try:
                peer_data = fetch_peer_discovery(peer_url)
                region_name = peer_data.get('RegionName') or f'Region-{peer_data["Region"]}'
                self.stdout.write(self.style.SUCCESS(f'  Found region: {region_name}'))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'  Could not reach peer server: {e}'))
                raise SystemExit(1)
            region_mode = 'join'

        elif region_name:
            # Create mode via env var
            self.stdout.write(f'\nStep 2: Creating region "{region_name}" (from environment)')
            region_mode = 'create'

        elif interactive:
            # Fall back to interactive region prompts
            self.stdout.write('\nStep 2: Region setup')
            self.stdout.write('  [1] Create a new region (this server will be the region leader)')
            self.stdout.write('  [2] Join an existing region')
            choice = input('  Choice [1/2]: ').strip()
            region_mode = 'join' if choice == '2' else 'create'

            if region_mode == 'create':
                region_name = input('  Region name: ').strip()
            else:
                peer_url = input('  Peer server URL (e.g. http://backend1:9000): ').strip()
                self.stdout.write('  Contacting peer server...')
                try:
                    peer_data = fetch_peer_discovery(peer_url)
                    region_name = peer_data.get('RegionName') or f'Region-{peer_data["Region"]}'
                    self.stdout.write(self.style.SUCCESS(f'  Found region: {region_name}'))
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f'  Could not reach peer server: {e}'))
                    raise SystemExit(1)

        else:
            self._abort_non_interactive()

        # ── Server identity (prefer env, prompt as fallback) ───────────────
        server_id  = os.environ.get('LOCAL_SERVER_ID', '').strip()
        server_url = os.environ.get('SERVER_URL', '').strip()

        if not server_id:
            if not interactive:
                self._abort_non_interactive()
            server_id = input('\n  Server ID (unique string, e.g. "server-1"): ').strip()

        if not server_url:
            if not interactive:
                self._abort_non_interactive()
            server_url = input('  Server URL (e.g. http://backend1:9000): ').strip()

        # ── Commit everything atomically ───────────────────────────────────
        self.stdout.write('\nStep 3: Registering server and populating menu...')
        with transaction.atomic():
            region, _ = Region.objects.get_or_create(RegionName=region_name)

            is_leader = region_mode == 'create'
            local_server, _ = ServerRegistry.objects.update_or_create(
                ServerID=server_id,
                defaults={
                    'ServerURL':      server_url,
                    'PublicKey':      settings.PUBLIC_KEY,
                    'Status':         'Active',
                    'IsRegionLeader': is_leader,
                    'Region':         region,
                },
            )

            if peer_data:
                ServerRegistry.objects.update_or_create(
                    ServerID=str(peer_data['ServerID']),
                    defaults={
                        'ServerURL':      peer_data['ServerURL'],
                        'PublicKey':      peer_data['PublicKey'],
                        'Status':         'Active',
                        'IsRegionLeader': True,
                        'Region':         region,
                    },
                )

            admin = CustomUser.objects.create_superuser(
                username=username,
                email='',
                password=password,
                user_type='super_admin',
                home_server=local_server,
            )
            MasterList.objects.get_or_create(
                UserID=admin.id,
                defaults={
                    'Username':     admin.username,
                    'HomeServerID': local_server,
                },
            )

            seed_menu_data()

        # Patch os.environ so get_local_server() works without a restart.
        os.environ['LOCAL_SERVER_ID'] = server_id
        os.environ['SERVER_URL']      = server_url

        self.stdout.write(self.style.SUCCESS(
            '\n=== Setup complete! Starting server... ===\n'
        ))

    def _abort_non_interactive(self):
        self.stderr.write(self.style.ERROR(
            '\nSetup required but no terminal is available.\n'
            'Set the following environment variables and restart:\n\n'
            f'  {_ENV_USERNAME}  — admin username\n'
            f'  {_ENV_PASSWORD}  — admin password (min 8 chars)\n'
            f'  {_ENV_REGION}    — region name  (new region, this server becomes leader)\n'
            f'     OR\n'
            f'  {_ENV_PEER_URL}  — URL of a peer server to join its region\n\n'
            'Example docker-compose environment block:\n'
            '  environment:\n'
            f'    {_ENV_USERNAME}: admin\n'
            f'    {_ENV_PASSWORD}: changeme123\n'
            f'    {_ENV_REGION}: West-Coast\n'
        ))
        raise SystemExit(1)

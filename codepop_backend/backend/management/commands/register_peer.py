import requests
from django.core.management.base import BaseCommand
from backend.models import ServerRegistry, Region

class Command(BaseCommand):
    help = 'Register a peer server in the registry manually or via discovery'

    def add_arguments(self, parser):
        parser.add_argument('--url', type=str, required=True, help='URL of the remote server')
        parser.add_argument('--id', type=str, help='ID of the remote server (optional if using --discover)')
        parser.add_argument('--key', type=str, help='Public Key of the remote server (optional if using --discover)')
        parser.add_argument('--leader', action='store_true', help='Set this server as a region leader')
        parser.add_argument('--discover', action='store_true', help='Automatically fetch ID and Public Key from the URL')

    def handle(self, *args, **options):
        url = options['url'].rstrip('/')
        server_id = options.get('id')
        public_key = options.get('key')
        
        if options['discover']:
            self.stdout.write(f"Discovering server at {url}...")
            try:
                # Handshake with the remote server
                resp = requests.get(f"{url}/backend/p2p/discover/", timeout=10)
                resp.raise_for_status()
                data = resp.json()
                
                # Auto-fill missing data from discovery
                server_id = data.get('ServerID')
                public_key = data.get('PublicKey')
                url = data.get('ServerURL', url) # Use their preferred URL if provided
                
                self.stdout.write(self.style.SUCCESS(f"Discovered Server ID: {server_id}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Discovery failed: {str(e)}"))
                return

        if not server_id or not public_key:
            self.stdout.write(self.style.ERROR("Server ID and Public Key are required (provide them manually or use --discover)."))
            return

        # Ensure a default region exists
        region, _ = Region.objects.get_or_create(RegionName="Test Region")
        
        server, created = ServerRegistry.objects.update_or_create(
            ServerID=server_id,
            defaults={
                'ServerURL': url,
                'PublicKey': public_key,
                'IsRegionLeader': options['leader'],
                'Region': region,
                'Status': 'Active'
            }
        )
        status = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{status} server {server.ServerID} at {server.ServerURL} in Registry."))

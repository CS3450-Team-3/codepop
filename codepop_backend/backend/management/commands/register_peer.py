from django.core.management.base import BaseCommand
from backend.models import ServerRegistry, Region

class Command(BaseCommand):
    help = 'Register a peer server in the registry'

    def add_arguments(self, parser):
        parser.add_argument('--id', type=int, required=True)
        parser.add_argument('--url', type=str, required=True)
        parser.add_argument('--key', type=str, default='dummy-p2p-key')
        parser.add_argument('--leader', action='store_true')

    def handle(self, *args, **options):
        # Ensure a default region exists
        region, _ = Region.objects.get_or_create(RegionName="Test Region")
        
        server, created = ServerRegistry.objects.update_or_create(
            ServerID=options['id'],
            defaults={
                'ServerURL': options['url'],
                'PublicKey': options['key'],
                'IsRegionLeader': options['leader'],
                'Region': region,
                'Status': 'Active'
            }
        )
        status = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{status} server {server.ServerID} at {server.ServerURL}"))

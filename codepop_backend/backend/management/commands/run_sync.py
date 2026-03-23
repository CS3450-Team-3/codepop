"""
Management command to run the regional sync from this server (must be a region leader).

Usage:
    python manage.py run_sync

Typical cron schedule (hourly):
    0 * * * * /path/to/venv/bin/python /path/to/manage.py run_sync >> /var/log/codepop_sync.log 2>&1

To sync a different data type, import and call the appropriate sync_* function.
"""

from django.core.management.base import BaseCommand

from backend.sync import get_local_server, sync_masterlist


class Command(BaseCommand):
    help = "Run the regional MasterList sync from this server (must be the region leader)."

    def handle(self, *args, **options):
        local_server = get_local_server()

        if not local_server.IsRegionLeader:
            self.stdout.write(
                self.style.WARNING(
                    f"Server {local_server.ServerID} is not a region leader. Skipping sync."
                )
            )
            return

        self.stdout.write(f"Starting MasterList sync from leader {local_server.ServerID} ({local_server.ServerURL})...")
        try:
            sync_masterlist(local_server)
            self.stdout.write(self.style.SUCCESS("Sync completed successfully."))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Sync failed: {exc}"))
            raise

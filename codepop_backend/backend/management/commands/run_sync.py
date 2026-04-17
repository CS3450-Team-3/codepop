"""
Management command to run the regional sync from this server (must be a region leader).

Usage:
    python manage.py run_sync

Typical cron schedule (hourly):
    0 * * * * /path/to/venv/bin/python /path/to/manage.py run_sync >> /var/log/codepop_sync.log 2>&1

To sync a different data type, import and call the appropriate sync_* function.
"""

from django.core.management.base import BaseCommand

from backend.sync import get_local_server, sync_masterlist, trigger_sync_on_leader


class Command(BaseCommand):
    help = "Trigger a full MasterList sync. Non-leaders forward the request to their region leader."

    def handle(self, *args, **options):
        local_server = get_local_server()

        if not local_server.IsRegionLeader:
            self.stdout.write(
                f"Server {local_server.ServerID} is not a region leader. "
                "Forwarding sync trigger to region leader..."
            )
            try:
                trigger_sync_on_leader(local_server)
                self.stdout.write(self.style.SUCCESS("Sync trigger forwarded to region leader successfully."))
            except Exception as exc:
                self.stderr.write(self.style.ERROR(f"Failed to forward sync trigger: {exc}"))
                raise
            return

        self.stdout.write(f"Starting MasterList sync from leader {local_server.ServerID} ({local_server.ServerURL})...")
        try:
            sync_masterlist(local_server)
            self.stdout.write(self.style.SUCCESS("Sync completed successfully."))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Sync failed: {exc}"))
            raise

"""
One-time backfill: ensure every CustomUser has a home_server and a MasterList entry.

Usage:
    python manage.py backfill_masterlist

Run this after upgrading to the version that introduced automatic MasterList
registration on user creation, so that users created before the upgrade are
included in future P2P syncs.
"""

from django.core.management.base import BaseCommand

from backend.models import CustomUser, MasterList
from backend.sync import get_local_server


class Command(BaseCommand):
    help = "Backfill home_server and MasterList entries for existing users that are missing them."

    def handle(self, *args, **options):
        try:
            local_server = get_local_server()
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Could not determine local server: {exc}"))
            raise

        users_without_home = CustomUser.objects.filter(home_server__isnull=True)
        assigned = 0
        for user in users_without_home:
            user.home_server = local_server
            user.save(update_fields=["home_server"])
            assigned += 1

        if assigned:
            self.stdout.write(f"Assigned home_server to {assigned} user(s) without one.")

        existing_ids = set(MasterList.objects.values_list("UserID", flat=True))
        users_needing_entry = CustomUser.objects.filter(home_server__isnull=False).exclude(id__in=existing_ids)
        created = 0
        for user in users_needing_entry:
            MasterList.objects.create(
                UserID=user.id,
                Username=user.username,
                HomeServerID=user.home_server,
            )
            created += 1

        if created:
            self.stdout.write(f"Created MasterList entries for {created} user(s).")

        self.stdout.write(self.style.SUCCESS(
            f"Backfill complete. {assigned} home_server(s) assigned, {created} MasterList entry(s) created."
        ))

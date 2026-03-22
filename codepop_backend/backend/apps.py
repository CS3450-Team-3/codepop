import os
import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class BackendConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'backend'

    def ready(self):
        # Django's dev server calls ready() twice (autoreloader + main process).
        # Only start the scheduler in the main process.
        if os.environ.get('RUN_MAIN') != 'true':
            return
        _start_sync_scheduler()


def _start_sync_scheduler():
    from django.conf import settings
    from apscheduler.schedulers.background import BackgroundScheduler

    interval = getattr(settings, 'SYNC_INTERVAL_SECONDS', 3600)

    scheduler = BackgroundScheduler()
    scheduler.add_job(
        _run_sync_job,
        trigger='interval',
        seconds=interval,
        id='masterlist_sync',
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Sync scheduler started — running every %d seconds.", interval)


def _run_sync_job():
    """Called by APScheduler; mirrors the run_sync management command."""
    from backend.sync import get_local_server, sync_masterlist
    try:
        local_server = get_local_server()
    except Exception as exc:
        logger.warning("Sync job: could not resolve local server: %s", exc)
        return

    if not local_server.IsRegionLeader:
        logger.debug("Sync job: server %s is not a region leader — skipping.", local_server.ServerID)
        return

    logger.info("Sync job: starting MasterList sync from leader %s.", local_server.ServerID)
    try:
        sync_masterlist(local_server)
        logger.info("Sync job: completed successfully.")
    except Exception as exc:
        logger.error("Sync job: failed: %s", exc)

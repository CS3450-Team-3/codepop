#!/bin/bash
set -e

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

if [ "${RUN_DEV_SEED:-false}" = "true" ]; then
  echo "Seeding development data..."
  python manage.py populate_db
  python manage.py populate_sync_test_data
else
  # If joining an existing region, wait until the peer is reachable.
  if [ -n "${SETUP_PEER_URL}" ]; then
    echo "Waiting for peer server at ${SETUP_PEER_URL}..."
    until python -c "import urllib.request; urllib.request.urlopen('${SETUP_PEER_URL}/backend/p2p/discover/')" 2>/dev/null; do
      echo "  Peer not ready, retrying in 5s..."
      sleep 5
    done
    echo "Peer server is ready."
  fi

  echo "Running first-run setup wizard..."
  python manage.py setup_server
fi

echo "Starting Django server..."
exec python manage.py runserver 0.0.0.0:9000

#!/usr/bin/env bash
# Seed all 9 CodePop backend instances with fake data.
# Run from the repo root (where docker-compose.yml lives).
#
# Usage:
#   ./seed_all_stores.sh           # add data (idempotent)
#   ./seed_all_stores.sh --clear   # wipe non-superuser data first, then seed

set -euo pipefail

EXTRA_ARGS="${1:-}"

# backend-name → store key (must match keys in STORE_DRINKS / STOCK_PROFILES)
declare -A STORE_KEYS=(
    [backend-w1]=w1
    [backend-w2]=w2
    [backend-w3]=w3
    [backend-e1]=e1
    [backend-e2]=e2
    [backend-e3]=e3
    [backend-m1]=m1
    [backend-m2]=m2
    [backend-m3]=m3
)

echo "============================================================"
echo " CodePop Fake-Data Seeder"
echo "============================================================"

for backend in "${!STORE_KEYS[@]}"; do
    key="${STORE_KEYS[$backend]}"
    echo ""
    echo "------------------------------------------------------------"
    echo " Seeding: $backend  (store-key=$key)"
    echo "------------------------------------------------------------"
    docker compose exec "$backend" python manage.py populate_fake_data --store-key "$key" $EXTRA_ARGS
done

echo ""
echo "============================================================"
echo " All stores seeded successfully!"
echo "============================================================"

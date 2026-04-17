#!/usr/bin/env bash
# Seed today's revenue across all 9 CodePop store backends.
# Run from the repo root (where docker-compose.yml lives).
#
# Usage:
#   ./seed_today_revenue.sh            # 8–20 random orders per store
#   ./seed_today_revenue.sh --count 15 # fixed 15 orders per store

set -euo pipefail

EXTRA_ARGS="${1:-}"

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
echo " CodePop Today's Revenue Seeder"
echo "============================================================"

for backend in "${!STORE_KEYS[@]}"; do
    key="${STORE_KEYS[$backend]}"
    echo ""
    echo "------------------------------------------------------------"
    echo " Seeding today's revenue: $backend  (store-key=$key)"
    echo "------------------------------------------------------------"
    docker compose exec "$backend" python manage.py seed_today_revenue --store-key "$key" $EXTRA_ARGS
done

echo ""
echo "============================================================"
echo " All stores seeded with today's revenue!"
echo "============================================================"

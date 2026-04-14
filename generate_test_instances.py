#!/usr/bin/env python3
"""
Generate 9 test docker-compose instances: 3 regions × 3 stores each.

Usage:
    python generate_test_instances.py

Output:
    instances/
        us-west-1/   docker-compose.yml  deploy.sh
        us-west-2/   docker-compose.yml  deploy.sh
        us-west-3/   docker-compose.yml  deploy.sh
        us-east-1/   ...
        ...
        us-mountain-3/...

On each GCP VM:
    export SERVER_URL="http://<this-vm-external-ip>:9000"
    export BOOTSTRAP_NODES="<first-node-ip>:9000"   # omit for the very first node
    cd instances/<instance-name>
    docker compose up --build
"""
import os
import textwrap

# ── Instance definitions ──────────────────────────────────────────────────────
# 3 regions × 3 stores each = 9 instances
INSTANCES = [
    # region,        store_name,             address,            city,          state, zip,    geohash
    ("us-west",      "CodePop Portland 1",   "100 SW Main St",   "Portland",    "OR",  "97201", "c20g7c"),
    ("us-west",      "CodePop Portland 2",   "200 NW 23rd Ave",  "Portland",    "OR",  "97210", "c20g5v"),
    ("us-west",      "CodePop Seattle",      "400 Pine St",      "Seattle",     "WA",  "98101", "c23nb8"),
    ("us-east",      "CodePop New York 1",   "1 Wall St",        "New York",    "NY",  "10005", "dr5regy"),
    ("us-east",      "CodePop New York 2",   "350 5th Ave",      "New York",    "NY",  "10118", "dr5regw"),
    ("us-east",      "CodePop Boston",       "1 Washington St",  "Boston",      "MA",  "02108", "drt2zy3"),
    ("us-mountain",  "CodePop Denver 1",     "1600 Glenarm Pl",  "Denver",      "CO",  "80202", "9xj64u1"),
    ("us-mountain",  "CodePop Denver 2",     "2000 Larimer St",  "Denver",      "CO",  "80205", "9xj6503"),
    ("us-mountain",  "CodePop Salt Lake City","200 S Main St",   "Salt Lake City","UT","84101", "9x1ufkr"),
]

COMPOSE_TEMPLATE = """\
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: codepop_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "psql -U postgres -d codepop_db -c 'SELECT 1' > /dev/null 2>&1"]
      interval: 5s
      timeout: 5s
      retries: 20
      start_period: 15s

  backend:
    build:
      context: ../../
      dockerfile: codepop_backend/Dockerfile
    ports:
      - "9000:9000"
    environment:
      DB_HOST: db
      DB_NAME: codepop_db
      DB_USER: postgres
      DB_PASSWORD: password
      STRIPE_SECRET_KEY: "${{STRIPE_SECRET_KEY:-TODO_get_a_new_secret_stripe_key}}"
      STRIPE_PUBLISHABLE_KEY: "${{STRIPE_PUBLISHABLE_KEY:-pk_test_51T5DqLPnaMtT5PTkugtHqM5ew5RSzkCJ0jklGkdSRXw8VnaiIN3AEW5NAYJzmdrYz2cUjQ7i9uvr9N2hpQnj01gE00jCYApVMN}}"
      STRIPE_WEBHOOK_SECRET: "${{STRIPE_WEBHOOK_SECRET:-TODO_get_a_webhook_secret}}"
      SERVER_URL: "${{SERVER_URL:-http://backend:9000}}"
      BOOTSTRAP_NODES: "${{BOOTSTRAP_NODES:-}}"
      MACHINE_HOST: "machine"
      MACHINE_PORT: "9050"
      SETUP_ADMIN_USERNAME: "admin"
      SETUP_ADMIN_PASSWORD: "password123"
      SETUP_ADMIN_EMAIL: "test@email.com"
      SETUP_ADMIN_FIRST_NAME: "Test"
      SETUP_ADMIN_LAST_NAME: "Ing"
      SETUP_REGION_NAME: "{region_name}"
      STORE_NAME: "{store_name}"
      STORE_ADDRESS: "{store_address}"
      STORE_CITY: "{store_city}"
      STORE_STATE: "{store_state}"
      STORE_ZIP: "{store_zip}"
      STORE_GEOHASH: "{store_geohash}"
    volumes:
      - ../../codepop_backend:/app
      - node_data:/data
    depends_on:
      db:
        condition: service_healthy
      machine:
        condition: service_started
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:9000/health/')"]
      interval: 10s
      timeout: 5s
      retries: 15
      start_period: 30s

  machine:
    build:
      context: ../../
      dockerfile: codepop_backend/Dockerfile
    entrypoint: ["python", "pseudo_machine_server.py", "--port", "9050", "--test-mode"]
    ports:
      - "9050:9050"
    volumes:
      - ../../codepop_backend:/app

  frontend:
    build:
      context: ../../codepop_frontend
    ports:
      - "4000:4000"
    environment:
      BACKEND_URL: "http://backend:9000"
      WATCHPACK_POLLING: "true"
    volumes:
      - ../../codepop_frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      backend:
        condition: service_started

  nginx:
    image: nginx:alpine
    ports:
      - "90:80"
    volumes:
      - ../../nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend

volumes:
  postgres_data:
  node_data:
"""

DEPLOY_SCRIPT_TEMPLATE = """\
#!/usr/bin/env bash
# Deploy script for {instance_name}
# Run on the GCP VM after cloning the repo.
#
# Usage:
#   export SERVER_URL="http://<this-vm-external-ip>:9000"
#   export BOOTSTRAP_NODES="<first-node-ip>:9000"  # omit for the first node
#   bash deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"
cd "$SCRIPT_DIR"

# Derive SERVER_URL from GCP metadata if not already set
if [ -z "$SERVER_URL" ]; then
  echo "SERVER_URL not set — fetching external IP from GCP metadata..."
  EXTERNAL_IP=$(curl -sf \\
    "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip" \\
    -H "Metadata-Flavor: Google") || true
  if [ -n "$EXTERNAL_IP" ]; then
    export SERVER_URL="http://$EXTERNAL_IP:9000"
    echo "  SERVER_URL set to $SERVER_URL"
  else
    echo "WARNING: Could not detect external IP. SERVER_URL will default to http://backend:9000"
    echo "         Peer nodes will not be able to reach this node."
  fi
fi

echo "Starting {instance_name}..."
echo "  Region : {region_name}"
echo "  Store  : {store_name}"
echo "  SERVER_URL     : $SERVER_URL"
echo "  BOOTSTRAP_NODES: ${{BOOTSTRAP_NODES:-<none - this is the first node>}}"

docker compose up --build
"""


def slug(region, store_name):
    words = store_name.split()
    suffix = words[-1] if words[-1].isdigit() else words[-1].lower()
    return f"{region}-{suffix}".lower().replace(" ", "-")


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    instances_dir = os.path.join(script_dir, "instances")
    os.makedirs(instances_dir, exist_ok=True)

    print(f"Generating {len(INSTANCES)} test instances in {instances_dir}/\n")

    seen_slugs = {}
    for i, (region, store_name, address, city, state, zip_code, geohash) in enumerate(INSTANCES, 1):
        instance_name = slug(region, store_name)
        if instance_name in seen_slugs:
            instance_name = f"{instance_name}-{i}"
        seen_slugs[instance_name] = True

        instance_dir = os.path.join(instances_dir, instance_name)
        os.makedirs(instance_dir, exist_ok=True)

        compose = COMPOSE_TEMPLATE.format(
            region_name=region,
            store_name=store_name,
            store_address=address,
            store_city=city,
            store_state=state,
            store_zip=zip_code,
            store_geohash=geohash,
        )
        with open(os.path.join(instance_dir, "docker-compose.yml"), "w") as f:
            f.write(compose)

        deploy = DEPLOY_SCRIPT_TEMPLATE.format(
            instance_name=instance_name,
            region_name=region,
            store_name=store_name,
        )
        deploy_path = os.path.join(instance_dir, "deploy.sh")
        with open(deploy_path, "w") as f:
            f.write(deploy)
        os.chmod(deploy_path, 0o755)

        print(f"  [{i:2d}] {instance_name:<25}  region={region:<14}  store={store_name}")

    print(f"\nDone. To deploy an instance on a GCP VM:")
    print(textwrap.dedent("""\

        1. Clone/copy the repo onto the VM
        2. cd into instances/<instance-name>/
        3. Run:

               export BOOTSTRAP_NODES="<first-node-ip>:9000"   # omit on the first node
               bash deploy.sh

           deploy.sh will auto-detect SERVER_URL from GCP metadata, or set it manually:

               export SERVER_URL="http://<this-vm-external-ip>:9000"

        First node in the network: do NOT set BOOTSTRAP_NODES.
        All subsequent nodes: set BOOTSTRAP_NODES to the first node's external IP:9000.
    """))


if __name__ == "__main__":
    main()

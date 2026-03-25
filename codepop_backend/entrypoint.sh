#!/bin/bash
set -e

# ── Layer 1: Node Identity ────────────────────────────────────────────────────
# Priority: explicit env var > persisted key file > generate new

if [ -n "${SERVER_PRIVATE_KEY}" ]; then
    echo "Node identity: using SERVER_PRIVATE_KEY from environment."
    # Derive public key if not provided alongside the private key
    if [ -z "${SERVER_PUBLIC_KEY}" ]; then
        echo "Deriving SERVER_PUBLIC_KEY from SERVER_PRIVATE_KEY..."
        export SERVER_PUBLIC_KEY=$(python -c "
import os
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
priv = os.environ['SERVER_PRIVATE_KEY']
pk = serialization.load_pem_private_key(priv.encode(), password=None, backend=default_backend())
print(pk.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode(), end='')
")
    fi
elif [ -f "/data/node_key.pem" ]; then
    echo "Node identity: loading key pair from /data/node_key.pem"
    export SERVER_PRIVATE_KEY=$(cat /data/node_key.pem)
    export SERVER_PUBLIC_KEY=$(cat /data/node_key_pub.pem)
else
    echo "Node identity: generating new RSA-2048 key pair..."
    python -c "
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
key = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
priv = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
pub  = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
open('/data/node_key.pem','w').write(priv)
open('/data/node_key_pub.pem','w').write(pub)
"
    export SERVER_PRIVATE_KEY=$(cat /data/node_key.pem)
    export SERVER_PUBLIC_KEY=$(cat /data/node_key_pub.pem)
    echo "New key pair saved to /data/"
fi

# Derive LOCAL_SERVER_ID from the public key fingerprint if not explicitly set.
# Result: first 32 hex chars of SHA256(public_key_pem), e.g. "a3f19c8b..."
if [ -z "${LOCAL_SERVER_ID}" ]; then
    export LOCAL_SERVER_ID=$(python -c "
import hashlib, os
print(hashlib.sha256(os.environ['SERVER_PUBLIC_KEY'].encode()).hexdigest()[:32])
")
fi
echo "Node ID: ${LOCAL_SERVER_ID}"

# ── Migrations ────────────────────────────────────────────────────────────────
# Run makemigrations+migrate only when model changes or pending migrations exist
NEEDS_MAKEMIGRATIONS=false
NEEDS_MIGRATE=false
python manage.py makemigrations --check --verbosity 0 2>/dev/null || NEEDS_MAKEMIGRATIONS=true
python manage.py migrate --check --verbosity 0 2>/dev/null || NEEDS_MIGRATE=true

if [ "${NEEDS_MAKEMIGRATIONS}" = "true" ] || [ "${NEEDS_MIGRATE}" = "true" ]; then
    echo "Applying migrations..."
    python manage.py makemigrations --verbosity 0
    python manage.py migrate --verbosity 0
else
    echo "No migrations to apply."
fi

# ── Seeding / Setup ───────────────────────────────────────────────────────────
if [ "${RUN_DEV_SEED:-false}" = "true" ]; then
    echo "Seeding development data..."
    python manage.py populate_db
    python manage.py populate_sync_test_data
else
    # Readiness probe: BOOTSTRAP_NODES takes priority, then legacy SETUP_PEER_URL.
    # Bootstrap probe is capped at 12 attempts (60 s) so the first server in the
    # network can start standalone without waiting forever.
    if [ -n "${BOOTSTRAP_NODES}" ]; then
        FIRST_BOOTSTRAP=$(echo "${BOOTSTRAP_NODES}" | cut -d',' -f1 | tr -d ' ')
        echo "Waiting for bootstrap node at http://${FIRST_BOOTSTRAP} (max 60 s)..."
        BOOTSTRAP_RETRIES=0
        BOOTSTRAP_READY=false
        until [ "${BOOTSTRAP_READY}" = "true" ] || [ "${BOOTSTRAP_RETRIES}" -ge 12 ]; do
            if python -c "
import urllib.request
try:
    urllib.request.urlopen('http://${FIRST_BOOTSTRAP}/health/', timeout=5)
except Exception:
    raise SystemExit(1)
" 2>/dev/null; then
                BOOTSTRAP_READY=true
            else
                BOOTSTRAP_RETRIES=$((BOOTSTRAP_RETRIES + 1))
                echo "  Not ready (attempt ${BOOTSTRAP_RETRIES}/12), retrying in 5s..."
                sleep 5
            fi
        done
        if [ "${BOOTSTRAP_READY}" = "true" ]; then
            echo "Bootstrap node ready."
        else
            echo "Bootstrap node unreachable after 60 s — starting as standalone node."
            # Unset SETUP_PEER_URL so setup_server creates its own region instead of
            # trying (and failing) to join the unreachable peer.
            unset SETUP_PEER_URL
        fi
    elif [ -n "${SETUP_PEER_URL}" ]; then
        echo "Waiting for peer server at ${SETUP_PEER_URL}..."
        until python -c "import urllib.request; urllib.request.urlopen('${SETUP_PEER_URL}/health/')" 2>/dev/null; do
            echo "  Peer not ready, retrying in 5s..."
            sleep 5
        done
        echo "Peer server is ready."
    fi

    python manage.py setup_server

    # JOIN only runs once here at startup — never again while the server is running.
    if [ -n "${BOOTSTRAP_NODES}" ] && [ "${BOOTSTRAP_READY:-false}" = "true" ]; then
        echo "── Bootstrap join ───────────────────────────────────────────────────────────"
        python manage.py bootstrap_join
        echo "─────────────────────────────────────────────────────────────────────────────"
    elif [ -n "${BOOTSTRAP_NODES}" ]; then
        echo "Bootstrap join skipped — no bootstrap nodes were reachable at startup."
    fi
fi

echo "Starting Django server..."
exec python manage.py runserver 0.0.0.0:9000

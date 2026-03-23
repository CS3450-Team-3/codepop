# CodePop Backend

Django REST API for the CodePop beverage management and P2P networking platform.

## Environment Variables

The following environment variables must be set before running the server.

### Required

| Variable | Description |
|---|---|
| `SERVER_PRIVATE_KEY` | RSA private key (PEM format) used to sign RS256 JWTs |
| `SERVER_PUBLIC_KEY` | RSA public key (PEM format) used to verify RS256 JWTs |

### Setting the JWT Keys

A local reference copy of the current keys is stored in `jwt_keys.txt` (gitignored). Open that file and run the `export` commands it contains, or paste them into your shell profile / `.envrc`.

**Example (Linux/macOS):**
```bash
export SERVER_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
<key content>
-----END PRIVATE KEY-----"

export SERVER_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
<key content>
-----END PUBLIC KEY-----"
```

**Important:** The private key that was previously hardcoded in `settings.py` is considered compromised because it was committed to git. Generate a new key pair for any production or shared environment:

```bash
openssl genrsa -out private_key.pem 2048
openssl rsa -in private_key.pem -pubout -out public_key.pem
```

Then use the file contents as the values for the two environment variables above.

### Other Variables

| Variable | Default | Description |
|---|---|---|
| `DB_NAME` | `codepop_database` | PostgreSQL database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `password` | Database password |
| `DB_HOST` | `127.0.0.1` | Database host |
| `DB_PORT` | `5432` | Database port |
| `STRIPE_SECRET_KEY` | — | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | — | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook secret |
| `LOCAL_SERVER_ID` | `None` | Primary key of this server in the ServerRegistry |
| `SYNC_INTERVAL_SECONDS` | `3600` | Inter-server sync interval in seconds |

## Running Locally

```bash
cd codepop_backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

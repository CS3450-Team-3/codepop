# Integrated P2P Testing Suite

This directory contains the tools and documentation required to validate the CodePop decentralized Peer-to-Peer (P2P) network using asymmetric `RS256` authentication.

## TL;DR: How to Test

- [**Logic Verification (Fast)**](#level-1-logic-verification-unitmock-testing): Validates P2P logic and JWT claims using mocks.

  ```bash
  python manage.py test backend.tests_p2p
  ```

- [**Full Integration (Realistic)**](#level-2-multi-instance-orchestration-integration-testing): Orchestrates real servers, discovery, and network-level proxying

  ```bash
  python codepop_backend/integration_tests/full_p2p_automated_test.py
  ```

## Testing Strategy

...
Testing a distributed system requires two levels of verification:

### Level 1: Logic Verification (Unit/Mock Testing)

This verifies that the Python logic for proxying, MasterList lookups, and JWT asymmetric claims is correct. These tests run in a single process and mock the network calls.

**How to run:**
From the `codepop_backend` directory:

```bash
python manage.py test backend.tests_p2p
```

---

### Level 2: Multi-Instance Orchestration (Integration Testing)

This verifies real network communication between two independent Django instances using unique RSA keypairs for each.

#### Prerequisites

1. **Activate Virtual Environment**: Ensure your environment is active.

   ```bash
   source codepop_virtual_enviroment/bin/activate
   ```

2. **PostgreSQL**: This suite requires a running PostgreSQL instance (defaults to `127.0.0.1:5432`).
3. **Dependencies**: Ensure all dependencies from the root `requirements.txt` are installed.

#### Automation Script

The `full_p2p_automated_test.py` script automates the entire lifecycle:

1. **In-Memory Keys**: Generates two unique RSA keypairs (A and B).
2. **DB Setup**: Creates two temporary PostgreSQL databases (`p2p_test_a` and `p2p_test_b`).
3. **Handshake**: Launches both servers and uses the **Auto-Discovery** mechanism (`register_peer --discover`) to allow Server A and Server B to exchange public keys over the network.
4. **Proxy Authentication**: Creates a user on Server A and successfully authenticates them through Server B.
5. **Cleanup**: Automatically terminates the background servers and drops the temporary PostgreSQL databases after the test completes.

**How to run (From Project Root):**

```bash
python codepop_backend/integration_tests/full_p2p_automated_test.py
```

#### Manual Multi-Terminal Test

If you want to manually test the P2P flow, you must provide your own RSA keys via environment variables.

1. **Terminal 1 (Server A - Home):**

   ```bash
   export DJANGO_SETTINGS_MODULE=p2p_test_settings
   export DATABASE_NAME=p2p_a
   export LOCAL_SERVER_ID=1
   # Note: SERVER_PRIVATE_KEY must be a valid RSA private key in PEM format
   export SERVER_PRIVATE_KEY="$(cat your_private_a.pem)"

   python manage.py migrate
   # Register self-identity so discovery works
   python manage.py register_peer --id 1 --url http://localhost:8000 --key "$(cat your_public_a.pem)" --leader
   python manage.py runserver 8000
   ```

2. **Terminal 2 (Server B - Visiting):**

   ```bash
   export DJANGO_SETTINGS_MODULE=p2p_test_settings
   export DATABASE_NAME=p2p_b
   export LOCAL_SERVER_ID=2
   export SERVER_PRIVATE_KEY="$(cat your_private_b.pem)"

   python manage.py migrate
   # Discover Server A automatically!
   python manage.py register_peer --url http://localhost:8000 --discover
   python manage.py runserver 8001
   ```

3. **Terminal 3 (Client):**
   Login to `http://localhost:8001/backend/auth/login/` with credentials for a user that exists only on Server A.

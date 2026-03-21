# Integrated P2P Testing Suite

This directory contains the tools and documentation required to validate the CodePop decentralized Peer-to-Peer (P2P) network.

## Testing Strategy

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
This verifies real network communication between two independent Django instances.
#### Prerequisites
1. **Activate Virtual Environment**: Ensure your environment is active before running any scripts or commands.
   ```bash
   # From the project root
   source codepop_virtual_enviroment/bin/activate 
   ```
2. **No Manual Config Needed**: This suite uses `codepop_backend/p2p_test_settings.py` to automatically manage temporary databases without modifying your main `settings.py`.
2. **Environment**: Ensure the `requests` library is installed.

#### Automation Script
The `full_p2p_automated_test.py` script automates the following:
1. Sets `DJANGO_SETTINGS_MODULE` to the test-specific settings file.
2. Creates two separate databases (`p2p_test_a` and `p2p_test_b`).
3. Registers Server A and Server B in each other's `ServerRegistry` using the `register_peer` command.
4. Creates a user on Server A.
5. Performs a "Visiting Login" on Server B.

**How to run (From Project Root):**
```bash
python codepop_backend/integration_tests/full_p2p_automated_test.py
```

#### Manual Multi-Terminal Test
If you prefer to see the logs in real-time, you can manually trigger the same flow. **Run these commands from the `codepop_backend` directory:**

1. **Terminal 1 (Server A - Home):**
   ```bash
   cd codepop_backend
   export DJANGO_SETTINGS_MODULE=p2p_test_settings
   export LOCAL_SERVER_ID=1
   export DATABASE_NAME=p2p_a
   python manage.py migrate
   python manage.py register_peer --id 1 --url http://localhost:8000 --leader
   python manage.py runserver 8000
   ```

2. **Terminal 2 (Server B - Visiting):**
   ```bash
   cd codepop_backend
   export DJANGO_SETTINGS_MODULE=p2p_test_settings
   export LOCAL_SERVER_ID=2
   export DATABASE_NAME=p2p_b
   python manage.py migrate
   python manage.py register_peer --id 1 --url http://localhost:8000 --leader
   python manage.py register_peer --id 2 --url http://localhost:8001
   python manage.py run_sync
   python manage.py runserver 8001
   ```


3. **Terminal 3 (Client):**
   Attempt to login to `http://localhost:8001/backend/auth/login/` using a username that exists only on Server A.

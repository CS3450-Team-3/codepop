import subprocess
import time
import requests
import os
import jwt
import sys
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

# CONFIGURATION
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))

PORT_A = 8000
PORT_B = 8001
DB_A = "p2p_test_a"
DB_B = "p2p_test_b"

processes = []

class TestFailure(Exception):
    """Custom exception to signal a test step failure."""
    pass

def generate_keypair(label):
    """Generate a real RSA keypair in memory and return (private_pem, public_pem)."""
    print(f"Generating unique RSA keypair for Server {label}...")
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )

    # Private PEM
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    # Public PEM
    public_key = private_key.public_key()
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

    return private_pem, public_pem

def run_cmd(cmd, env_update=None):
    """Helper to run a management command in the backend directory."""
    env = os.environ.copy()
    env["DJANGO_SETTINGS_MODULE"] = "p2p_test_settings"
    if env_update:
        env.update(env_update)
    
    result = subprocess.run(cmd, cwd=BACKEND_DIR, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERROR running {' '.join(cmd)}:\n{result.stderr}")
        return False
    return True

def ensure_postgresql_db_exists(db_name):
    """Attempt to create the PostgreSQL database if it doesn't exist."""
    print(f"Ensuring PostgreSQL database '{db_name}' exists...")
    try:
        env = os.environ.copy()
        env["PGPASSWORD"] = "password"
        check_cmd = ["psql", "-U", "postgres", "-h", "127.0.0.1", "-t", "-c", f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"]
        check_proc = subprocess.run(check_cmd, env=env, capture_output=True, text=True)
        if "1" not in check_proc.stdout:
            print(f"Database '{db_name}' not found. Creating...")
            create_cmd = ["psql", "-U", "postgres", "-h", "127.0.0.1", "-c", f"CREATE DATABASE {db_name}"]
            subprocess.run(create_cmd, env=env, capture_output=True, text=True)
            print(f"Database '{db_name}' created.")
        else:
            print(f"Database '{db_name}' already exists.")
    except Exception as e:
        print(f"WARNING: Could not verify/create database via psql: {str(e)}")

def spawn_server(port, db_name, server_id, private_key, public_key, label):
    """Starts a Django instance in the background without waiting."""
    print(f"Spawning Server {label} on port {port}...")
    env = os.environ.copy()
    env["DJANGO_SETTINGS_MODULE"] = "p2p_test_settings"
    env["LOCAL_SERVER_ID"] = str(server_id)
    env["DATABASE_NAME"] = db_name
    env["SERVER_PRIVATE_KEY"] = private_key
    env["SERVER_PUBLIC_KEY"] = public_key
    
    p = subprocess.Popen(
        ["python", "-u", "manage.py", "runserver", str(port), "--noreload"],
        cwd=BACKEND_DIR,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True
    )
    processes.append(p)
    return {"process": p, "port": port, "label": label, "ready": False}

def wait_for_servers(server_list, timeout=20):
    """Wait for all servers in the list to be ready."""
    print(f"Waiting for servers to be ready (timeout {timeout}s)...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        all_ready = True
        for s in server_list:
            if s["ready"]: continue
            
            try:
                resp = requests.get(f"http://localhost:{s['port']}/backend/menu/", timeout=0.5)
                if resp.status_code == 200:
                    print(f"Server {s['label']} is READY.")
                    s["ready"] = True
                else:
                    all_ready = False
            except requests.exceptions.ConnectionError:
                all_ready = False
        
        if all_ready:
            return True
        time.sleep(0.5)
    
    # If we reached here, some servers timed out
    for s in server_list:
        if not s["ready"]:
            print(f"ERROR: Server {s['label']} timed out on port {s['port']}.")
    return False

def drop_postgresql_db(db_name):
    """Attempt to drop the PostgreSQL database."""
    print(f"Dropping PostgreSQL database '{db_name}'...")
    try:
        env = os.environ.copy()
        env["PGPASSWORD"] = "password"
        drop_cmd = ["psql", "-U", "postgres", "-h", "127.0.0.1", "-d", "postgres", "-c", f"DROP DATABASE IF EXISTS {db_name} WITH (FORCE);"]
        subprocess.run(drop_cmd, env=env, capture_output=True, text=True)
        print(f"Database '{db_name}' dropped.")
    except Exception as e:
        print(f"WARNING: Could not drop database via psql: {str(e)}")

def cleanup():
    print("\n--- Cleaning up processes and databases ---")
    for p in processes:
        p.terminate()
        p.wait()
        print(f"Terminated background server process.")
    
    time.sleep(1)
    for db in [DB_A, DB_B]:
        drop_postgresql_db(db)
    print("Done.")

def main():
    failure_count = 0
    test_count = 0
    start_suite_time = time.time()
    try:
        print("--- Starting FULL AUTOMATED P2P INTEGRATION TEST (AUTO-DISCOVERY) ---")
        
        # 0. Generate In-Memory Keys
        priv_a, pub_a = generate_keypair("A")
        priv_b, pub_b = generate_keypair("B")
        priv_malicious, pub_malicious = generate_keypair("Malicious")

        # 1. Setup Databases and Self-Identify
        print("\n[1/6] Setting up databases and self-identification...")
        for db, s_id, url, key, leader, label in [
            (DB_A, 1, f"http://localhost:{PORT_A}", pub_a, True, "A"),
            (DB_B, 2, f"http://localhost:{PORT_B}", pub_b, False, "B")
        ]:
            ensure_postgresql_db_exists(db)
            if not run_cmd(["python", "manage.py", "migrate"], env_update={"DATABASE_NAME": db}):
                failure_count += 1; raise TestFailure("Migration failed")
            
            cmd = ["python", "manage.py", "register_peer", "--id", str(s_id), "--url", url, "--key", key]
            if leader: cmd.append("--leader")
            if not run_cmd(cmd, env_update={"DATABASE_NAME": db}):
                failure_count += 1; raise TestFailure("Register peer failed")

        # 2. Launch Background Servers (PARALLEL)
        print("\n[2/6] Launching background servers in parallel...")
        s1 = spawn_server(PORT_A, DB_A, 1, priv_a, pub_a, "A")
        s2 = spawn_server(PORT_B, DB_B, 2, priv_b, pub_b, "B")
        
        if not wait_for_servers([s1, s2]):
            failure_count += 1; raise TestFailure("Servers failed to reach READY state")

        # 3. Cross-Register via AUTO-DISCOVERY
        print("\n[3/6] Performing Cross-Registration via AUTO-DISCOVERY...")
        if not run_cmd(["python", "manage.py", "register_peer", "--url", f"http://localhost:{PORT_B}", "--discover"], 
                env_update={"DATABASE_NAME": DB_A, "SERVER_PRIVATE_KEY": priv_a}):
            failure_count += 1; raise TestFailure("Discovery on A failed")
        if not run_cmd(["python", "manage.py", "register_peer", "--url", f"http://localhost:{PORT_A}", "--discover"], 
                env_update={"DATABASE_NAME": DB_B, "SERVER_PRIVATE_KEY": priv_b}):
            failure_count += 1; raise TestFailure("Discovery on B failed")

        # 4. Create User on Server A
        print("\n[4/6] Creating user 'traveler_joe' on Server A...")
        user_cmd = (
            "from backend.models import CustomUser; "
            "user, created = CustomUser.objects.get_or_create(username='traveler_joe', defaults={'email': 'joe@test.com', 'first_name': 'Joe'}); "
            "user.set_password('password123'); "
            "user.save()"
        )
        if not run_cmd(["python", "manage.py", "shell", "-c", user_cmd], env_update={"DATABASE_NAME": DB_A, "SERVER_PRIVATE_KEY": priv_a}):
            failure_count += 1; raise TestFailure("User creation failed")
        
        # Inject MasterList entry into Server B
        if not run_cmd(["python", "manage.py", "shell", "-c", 
                 "from backend.models import MasterList, ServerRegistry; "
                 "home = ServerRegistry.objects.get(ServerID=1); "
                 "MasterList.objects.update_or_create(Username='traveler_joe', defaults={'HomeServerID': home})"], 
                env_update={"DATABASE_NAME": DB_B, "SERVER_PRIVATE_KEY": priv_b}):
            failure_count += 1; raise TestFailure("MasterList injection failed")

        # 5. TEST: Authentication Flows
        print("\n[5/6] TESTING AUTHENTICATION FLOWS...")

        # Test A: Correct Password Proxy Login
        test_count += 1
        print("Test A: Correct Password Proxy Login (B -> A)...")
        resp = requests.post(f"http://localhost:{PORT_B}/backend/auth/login/", 
                             json={"username": "traveler_joe", "password": "password123"})
        if resp.status_code == 200:
            print("  SUCCESS: Proxy login worked with correct password.")
        else:
            print(f"  FAILURE: Proxy login failed with {resp.status_code}")
            failure_count += 1

        # Test B: Incorrect Password Proxy Login
        test_count += 1
        print("Test B: Incorrect Password Proxy Login (B -> A)...")
        resp = requests.post(f"http://localhost:{PORT_B}/backend/auth/login/", 
                             json={"username": "traveler_joe", "password": "WRONG_PASSWORD"})
        if resp.status_code == 401:
            print("  SUCCESS: Server correctly rejected wrong password.")
        else:
            print(f"  FAILURE: Server returned {resp.status_code} for wrong password (expected 401).")
            failure_count += 1

        # 6. TEST: Cross-Server JWT Verification (P2P)
        print("\n[6/6] TESTING CROSS-SERVER JWT VERIFICATION...")

        # Get a real token from Server A
        print("Fetching valid token from Server A...")
        resp = requests.post(f"http://localhost:{PORT_A}/backend/auth/login/", 
                             json={"username": "traveler_joe", "password": "password123"})
        if resp.status_code != 200:
            print(f"  ERROR: Could not get token from Server A: {resp.text}")
            failure_count += 1
        else:
            valid_token_a = resp.json()['access']
            user_id_a = resp.json()['user_id']

            # Attempt to use Server A's token on Server B
            test_count += 1
            print("Test C: Using Server A's Token on Server B (Cross-Verification)...")
            headers = {"Authorization": f"Bearer {valid_token_a}"}
            resp = requests.get(f"http://localhost:{PORT_B}/backend/users/me/", headers=headers)
            if resp.status_code == 200:
                print(f"  SUCCESS: Server B verified Server A's token using Server A's Public Key.")
                print(f"  Verified Identity: {resp.json().get('username')}")
            else:
                print(f"  FAILURE: Server B rejected a valid cross-server token ({resp.status_code}: {resp.text})")
                failure_count += 1

            # Test D: Malicious/Incorrectly Signed Token
            test_count += 1
            print("Test D: Using Maliciously Signed Token on Server B...")
            # Construct a token that CLAIMS to be from Server A but is signed by a different key
            malicious_payload = {
                "user_id": user_id_a,
                "username": "traveler_joe",
                "iss": "1", # Claim to be from Server 1 (A)
                "exp": int(time.time()) + 3600
            }
            malicious_token = jwt.encode(malicious_payload, priv_malicious, algorithm='RS256')
            
            headers = {"Authorization": f"Bearer {malicious_token}"}
            resp = requests.get(f"http://localhost:{PORT_B}/backend/users/me/", headers=headers)
            
            if resp.status_code == 403 or resp.status_code == 401:
                print(f"  SUCCESS: Server B correctly blocked malicious token ({resp.status_code}).")
            else:
                print(f"  FAILURE: Server B accepted a malicious token signed with the wrong key! ({resp.status_code})")
                failure_count += 1

    except TestFailure:
        # Step-level failure already tracked in failure_count
        pass
    except Exception as e:
        print(f"\nERROR DURING TEST: {str(e)}")
        failure_count += 1
    finally:
        cleanup()
    
    elapsed = time.time() - start_suite_time
    print(f"\n----------------------------------------------------------------------")
    print(f"Ran {test_count} test scenarios in {elapsed:.3f}s\n")

    # Final Summary after cleanup
    if failure_count == 0:
        print("VERIFICATION COMPLETE: All P2P Security and Auth Scenarios Passed.")
    else:
        print(f"VERIFICATION FAILED: {failure_count} test scenario(s) failed.")
    
    if failure_count > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()

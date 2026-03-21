import subprocess
import time
import requests
import os
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

def generate_keypair(label):
    """Generate a real RSA keypair in memory and return (private_pem, public_pem)."""
    print(f"Generating unique RSA keypair for {label}...")
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

def start_server(port, db_name, server_id, private_key):
    """Starts a Django instance in the background."""
    print(f"Starting Server {server_id} on port {port}...")
    env = os.environ.copy()
    env["DJANGO_SETTINGS_MODULE"] = "p2p_test_settings"
    env["LOCAL_SERVER_ID"] = str(server_id)
    env["DATABASE_NAME"] = db_name
    env["SERVER_PRIVATE_KEY"] = private_key
    
    p = subprocess.Popen(
        ["python", "-u", "manage.py", "runserver", str(port), "--noreload"],
        cwd=BACKEND_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    processes.append(p)
    
    url = f"http://localhost:{port}/backend/menu/"
    retries = 15
    while retries > 0:
        try:
            requests.get(url, timeout=1)
            print(f"Server {server_id} is READY.")
            return p
        except requests.exceptions.ConnectionError:
            time.sleep(1)
            retries -= 1
    
    print(f"ERROR: Server {server_id} failed to start on port {port}.")
    return None

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
    try:
        print("--- Starting FULL AUTOMATED P2P INTEGRATION TEST (AUTO-DISCOVERY) ---")
        
        # 0. Generate In-Memory Keys
        priv_a, pub_a = generate_keypair("Server A")
        priv_b, pub_b = generate_keypair("Server B")

        if priv_a != priv_b:
            print("\nSUCCESS: Confirmed that Server A and Server B are using unique RSA keypairs.")
        else:
            print("\nWARNING: Server A and Server B are using the same keypair!")

        # 1. Setup Databases and Self-Identify
        # A server MUST know its own public identity for the Discovery endpoint to work.
        print("\n[1/5] Setting up databases and self-identification...")
        for db, s_id, url, key, leader in [
            (DB_A, 1, f"http://localhost:{PORT_A}", pub_a, True),
            (DB_B, 2, f"http://localhost:{PORT_B}", pub_b, False)
        ]:
            ensure_postgresql_db_exists(db)
            print(f"Migrating {db}...")
            run_cmd(["python", "manage.py", "migrate"], env_update={"DATABASE_NAME": db})
            
            print(f"Registering self-identity for Server {s_id} in {db}...")
            cmd = ["python", "manage.py", "register_peer", "--id", str(s_id), "--url", url, "--key", key]
            if leader: cmd.append("--leader")
            run_cmd(cmd, env_update={"DATABASE_NAME": db})

        # 2. Launch Background Servers
        print("\n[2/5] Launching background servers...")
        if not start_server(PORT_A, DB_A, 1, priv_a): return
        if not start_server(PORT_B, DB_B, 2, priv_b): return

        # 3. Cross-Register via AUTO-DISCOVERY
        # This mirrors a real admin joining two live servers.
        print("\n[3/5] Performing Cross-Registration via AUTO-DISCOVERY...")
        
        print(f"Server A: Discovering Server B at http://localhost:{PORT_B}...")
        run_cmd(["python", "manage.py", "register_peer", "--url", f"http://localhost:{PORT_B}", "--discover"], 
                env_update={"DATABASE_NAME": DB_A, "SERVER_PRIVATE_KEY": priv_a})
        
        print(f"Server B: Discovering Server A at http://localhost:{PORT_A}...")
        run_cmd(["python", "manage.py", "register_peer", "--url", f"http://localhost:{PORT_A}", "--discover"], 
                env_update={"DATABASE_NAME": DB_B, "SERVER_PRIVATE_KEY": priv_b})

        # 4. Create User on Server A
        print("\n[4/5] Creating user 'traveler_joe' on Server A...")
        user_cmd = (
            "from backend.models import CustomUser; "
            "user, created = CustomUser.objects.get_or_create(username='traveler_joe', defaults={'email': 'joe@test.com', 'first_name': 'Joe'}); "
            "user.set_password('password123'); "
            "user.save()"
        )
        run_cmd(["python", "manage.py", "shell", "-c", user_cmd], env_update={"DATABASE_NAME": DB_A, "SERVER_PRIVATE_KEY": priv_a})
        
        # Manually inject MasterList entry into Server B's DB to simulate a synced network
        run_cmd(["python", "manage.py", "shell", "-c", 
                 "from backend.models import MasterList, ServerRegistry; "
                 "home = ServerRegistry.objects.get(ServerID=1); "
                 "MasterList.objects.update_or_create(Username='traveler_joe', defaults={'HomeServerID': home})"], 
                env_update={"DATABASE_NAME": DB_B, "SERVER_PRIVATE_KEY": priv_b})

        # 5. Perform the Proxy Login
        print("\n[5/5] ATTEMPTING PROXY LOGIN (Client -> Server B -> Server A)...")
        login_payload = {"username": "traveler_joe", "password": "password123"}
        
        start_time = time.time()
        resp = requests.post(f"http://localhost:{PORT_B}/backend/auth/login/", json=login_payload)
        end_time = time.time()

        if resp.status_code == 200:
            data = resp.json()
            print(f"\nSUCCESS! Server B (Visiting) authenticated 'traveler_joe' via Server A (Home).")
            print(f"Response Time: {end_time - start_time:.2f}s")
            print(f"Is Proxy: {data.get('is_proxy')}")
            print(f"Home Server: {data.get('home_server_id')}")
            print("\nVERIFICATION PASSED: Full P2P Authentication with Auto-Discovery is working.")
        else:
            print(f"\nFAILURE: Server B returned {resp.status_code}")
            print(f"Error Details: {resp.text}")

    except Exception as e:
        print(f"\nERROR DURING TEST: {str(e)}")
    finally:
        cleanup()

if __name__ == "__main__":
    main()

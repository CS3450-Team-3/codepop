import subprocess
import time
import requests
import os
import sys

# CONFIGURATION
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))

PORT_A = 8000
PORT_B = 8001
DB_A = "p2p_test_a"
DB_B = "p2p_test_b"

processes = []

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
    # Use psql to check/create the DB
    try:
        # Check if DB exists
        check_cmd = ["psql", "-U", "postgres", "-h", "127.0.0.1", "-t", "-c", f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"]
        # We need password for psql, we'll try to use the PGPASSWORD env var
        env = os.environ.copy()
        env["PGPASSWORD"] = "password"
        
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
        print("Please ensure you have created the databases manually if the test fails.")

def start_server(port, db_name, server_id):
    """Starts a Django instance in the background."""
    print(f"Starting Server {server_id} on port {port}...")
    env = os.environ.copy()
    env["DJANGO_SETTINGS_MODULE"] = "p2p_test_settings"
    env["LOCAL_SERVER_ID"] = str(server_id)
    env["DATABASE_NAME"] = db_name
    
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
        # We use -c to run the drop command. 
        # Note: We connect to the 'postgres' default db to drop our test db.
        drop_cmd = ["psql", "-U", "postgres", "-h", "127.0.0.1", "-d", "postgres", "-c", f"DROP DATABASE IF EXISTS {db_name} WITH (FORCE);"]
        subprocess.run(drop_cmd, env=env, capture_output=True, text=True)
        print(f"Database '{db_name}' dropped.")
    except Exception as e:
        print(f"WARNING: Could not drop database via psql: {str(e)}")

def cleanup():
    print("\n--- Cleaning up processes and databases ---")
    for p in processes:
        p.terminate()
        p.wait() # Wait for process to actually exit
        print(f"Terminated background server process.")
    
    # Give OS a moment to release file handles/sockets
    time.sleep(1)
    
    for db in [DB_A, DB_B]:
        drop_postgresql_db(db)
    print("Done.")

def main():
    try:
        print("--- Starting FULL AUTOMATED P2P INTEGRATION TEST (PostgreSQL) ---")

        # 1. Ensure DBs exist and Migrate
        print("\n[1/5] Setting up databases...")
        for db in [DB_A, DB_B]:
            ensure_postgresql_db_exists(db)
            print(f"Migrating {db}...")
            if not run_cmd(["python", "manage.py", "migrate"], env_update={"DATABASE_NAME": db}):
                print(f"FAILED to migrate {db}. Aborting.")
                return
            
        # 2. Cross-Register Servers
        print("\n[2/5] Cross-registering servers...")
        run_cmd(["python", "manage.py", "register_peer", "--id", "1", "--url", f"http://localhost:{PORT_A}", "--leader"], env_update={"DATABASE_NAME": DB_A})
        run_cmd(["python", "manage.py", "register_peer", "--id", "2", "--url", f"http://localhost:{PORT_B}"], env_update={"DATABASE_NAME": DB_A})
        run_cmd(["python", "manage.py", "register_peer", "--id", "1", "--url", f"http://localhost:{PORT_A}", "--leader"], env_update={"DATABASE_NAME": DB_B})
        run_cmd(["python", "manage.py", "register_peer", "--id", "2", "--url", f"http://localhost:{PORT_B}"], env_update={"DATABASE_NAME": DB_B})

        # 3. Create User on Server A
        print("\n[3/5] Creating user 'traveler_joe' on Server A...")
        user_cmd = (
            "from backend.models import CustomUser; "
            "user, created = CustomUser.objects.get_or_create(username='traveler_joe', defaults={'email': 'joe@test.com', 'first_name': 'Joe'}); "
            "user.set_password('password123'); "
            "user.save()"
        )
        run_cmd(["python", "manage.py", "shell", "-c", user_cmd], env_update={"DATABASE_NAME": DB_A})
        
        # Manually inject MasterList entry into Server B's DB
        print("Injecting MasterList entry into Server B...")
        run_cmd(["python", "manage.py", "shell", "-c", 
                 "from backend.models import MasterList, ServerRegistry; "
                 "home = ServerRegistry.objects.get(ServerID=1); "
                 "MasterList.objects.update_or_create(Username='traveler_joe', defaults={'HomeServerID': home})"], 
                env_update={"DATABASE_NAME": DB_B})

        # 4. Start Server Instances
        print("\n[4/5] Launching background servers...")
        if not start_server(PORT_A, DB_A, 1): return
        if not start_server(PORT_B, DB_B, 2): return

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
            print("\nVERIFICATION PASSED: Full P2P Authentication Flow is working.")
        else:
            print(f"\nFAILURE: Server B returned {resp.status_code}")
            print(f"Error Details: {resp.text}")

    except Exception as e:
        print(f"\nERROR DURING TEST: {str(e)}")
    finally:
        cleanup()

if __name__ == "__main__":
    main()

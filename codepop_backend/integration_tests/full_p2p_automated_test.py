import subprocess
import time
import requests
import os
import jwt
import sys
import concurrent.futures
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

# CONFIGURATION
SECTION_TOTAL = 9
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ANSI Color Codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
CYAN = "\033[96m"
RESET = "\033[0m"
BOLD = "\033[1m"

def print_step(step_num, msg):
    print(f"\n{BOLD}{YELLOW}[{step_num}/{SECTION_TOTAL}] {msg}{RESET}")

def print_substep(msg):
    print(f"{CYAN}{msg}{RESET}")

def print_success(msg):
    print(f"{GREEN}  SUCCESS: {msg}{RESET}")

def print_failure(msg, detail=None):
    out = f"{RED}  FAILURE: {msg}{RESET}"
    if detail:
        out += f" {RED}({detail}){RESET}"
    print(out)

def print_error(msg):
    print(f"{RED}{BOLD}ERROR: {msg}{RESET}")

def print_header(msg):
    print(f"\n{BOLD}{BLUE}{'='*10} {msg} {'='*10}{RESET}")

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
    print_substep(f"Generating unique RSA keypair for Server {label}...")
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
        print_error(f"running {' '.join(cmd)}:\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}")
        return False
    return True

def ensure_postgresql_db_exists(db_name):
    """Attempt to create the PostgreSQL database if it doesn't exist."""
    print_substep(f"Ensuring PostgreSQL database '{db_name}' exists...")
    try:
        env = os.environ.copy()
        env["PGPASSWORD"] = "password"
        check_cmd = ["psql", "-U", "postgres", "-h", "127.0.0.1", "-t", "-c", f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"]
        check_proc = subprocess.run(check_cmd, env=env, capture_output=True, text=True)
        if "1" not in check_proc.stdout:
            print_substep(f"Database '{db_name}' not found. Creating...")
            create_cmd = ["psql", "-U", "postgres", "-h", "127.0.0.1", "-c", f"CREATE DATABASE {db_name}"]
            subprocess.run(create_cmd, env=env, capture_output=True, text=True)
            print_substep(f"Database '{db_name}' created.")
        else:
            print_substep(f"Database '{db_name}' already exists.")
    except Exception as e:
        print(f"{YELLOW}WARNING: Could not verify/create database via psql: {str(e)}{RESET}")

def spawn_server(port, db_name, server_id, private_key, public_key, label):
    """Starts a Django instance in the background without waiting."""
    print_substep(f"Spawning Server {label} on port {port}...")
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
    print_substep(f"Waiting for servers to be ready (timeout {timeout}s)...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        all_ready = True
        for s in server_list:
            if s["ready"]: continue
            
            try:
                resp = requests.get(f"http://localhost:{s['port']}/backend/menu/", timeout=0.5)
                if resp.status_code == 200:
                    print_substep(f"Server {s['label']} is READY.")
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
            print_error(f"Server {s['label']} timed out on port {s['port']}.")
    return False

def drop_postgresql_db(db_name):
    """Attempt to drop the PostgreSQL database."""
    print_substep(f"Dropping PostgreSQL database '{db_name}'...")
    try:
        env = os.environ.copy()
        env["PGPASSWORD"] = "password"
        drop_cmd = ["psql", "-U", "postgres", "-h", "127.0.0.1", "-d", "postgres", "-c", f"DROP DATABASE IF EXISTS {db_name} WITH (FORCE);"]
        subprocess.run(drop_cmd, env=env, capture_output=True, text=True)
        print_substep(f"Database '{db_name}' dropped.")
    except Exception as e:
        print(f"{YELLOW}WARNING: Could not drop database via psql: {str(e)}{RESET}")

def cleanup():
    print_header("Cleaning up processes and databases")
    for p in processes:
        p.terminate()
        p.wait()
        print_substep(f"Terminated background server process.")
    
    time.sleep(1)
    for db in [DB_A, DB_B]:
        drop_postgresql_db(db)
    print_substep("Done.")


def main():
    failure_count = 0
    test_count = 0
    start_suite_time = time.time()
    try:
        print_header("Starting FULL AUTOMATED P2P INTEGRATION TEST (AUTO-DISCOVERY)")
        
        # 0. Generate In-Memory Keys
        priv_a, pub_a = generate_keypair("A")
        priv_b, pub_b = generate_keypair("B")
        priv_malicious, pub_malicious = generate_keypair("Malicious")

        # 1. Setup Databases and Self-Identify (PARALLEL)
        print_step(1, "Setting up databases and self-identification...")
        
        def setup_single_server(db, s_id, url, key, leader, label):
            ensure_postgresql_db_exists(db)
            if not run_cmd(["python", "manage.py", "migrate"], env_update={"DATABASE_NAME": db}):
                return False, "Migration failed"
            
            cmd = ["python", "manage.py", "register_peer", "--id", str(s_id), "--url", url, "--key", key]
            if leader: cmd.append("--leader")
            if not run_cmd(cmd, env_update={"DATABASE_NAME": db}):
                return False, "Register peer failed"
            return True, None

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [
                executor.submit(setup_single_server, DB_A, "server_a", f"http://localhost:{PORT_A}", pub_a, True, "A"),
                executor.submit(setup_single_server, DB_B, "server_b", f"http://localhost:{PORT_B}", pub_b, False, "B")
            ]
            for future in concurrent.futures.as_completed(futures):
                success, error_msg = future.result()
                if not success:
                    failure_count += 1
                    raise TestFailure(error_msg)

        # 2. Launch Background Servers (PARALLEL)
        print_step(2, "Launching background servers...")
        s1 = spawn_server(PORT_A, DB_A, "server_a", priv_a, pub_a, "A")
        s2 = spawn_server(PORT_B, DB_B, "server_b", priv_b, pub_b, "B")
        
        if not wait_for_servers([s1, s2]):
            failure_count += 1; raise TestFailure("Servers failed to reach READY state")

        # 3. Cross-Register via AUTO-DISCOVERY (PARALLEL)
        print_step(3, "Performing Cross-Registration via AUTO-DISCOVERY...")
        
        def discover_peer(db, url, key, s_id):
            if not run_cmd(["python", "manage.py", "register_peer", "--url", url, "--discover"], 
                    env_update={"DATABASE_NAME": db, "SERVER_PRIVATE_KEY": key, "LOCAL_SERVER_ID": s_id}):
                return False
            return True

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [
                executor.submit(discover_peer, DB_A, f"http://localhost:{PORT_B}", priv_a, "server_a"),
                executor.submit(discover_peer, DB_B, f"http://localhost:{PORT_A}", priv_b, "server_b")
            ]
            for future in concurrent.futures.as_completed(futures):
                if not future.result():
                    failure_count += 1
                    raise TestFailure("Discovery failed")

        # 4. Create User on Server A and Sync
        print_step(4, "Creating users 'traveler_joe' (admin) and 'traveler_bob' (customer) on Server A and syncing...")
        user_cmd = (
            "from backend.models import CustomUser, MasterList, ServerRegistry; "
            "home = ServerRegistry.objects.get(ServerID='server_a'); "
            "user1, _ = CustomUser.objects.get_or_create(username='traveler_joe', defaults={'email': 'joe@test.com', 'first_name': 'Joe', 'user_type': 'super_admin', 'home_server': home}); "
            "user1.set_password('password123'); user1.save(); "
            "MasterList.objects.update_or_create(UserID=user1.id, defaults={'Username': user1.username, 'HomeServerID': home}); "
            "user2, _ = CustomUser.objects.get_or_create(username='traveler_bob', defaults={'email': 'bob@test.com', 'first_name': 'Bob', 'user_type': 'customer', 'home_server': home}); "
            "user2.set_password('password123'); user2.save(); "
            "MasterList.objects.update_or_create(UserID=user2.id, defaults={'Username': user2.username, 'HomeServerID': home});"
        )
        if not run_cmd(["python", "manage.py", "shell", "-c", user_cmd], env_update={"DATABASE_NAME": DB_A, "SERVER_PRIVATE_KEY": priv_a, "LOCAL_SERVER_ID": "server_a"}):
            failure_count += 1; raise TestFailure("User creation failed")
        
        # Trigger P2P Sync from Server A (Region Leader) to organically populate Server B
        print_substep("Triggering MasterList sync from Server A...")

        if not run_cmd(["python", "manage.py", "run_sync"], env_update={"DATABASE_NAME": DB_A, "SERVER_PRIVATE_KEY": priv_a, "LOCAL_SERVER_ID": "server_a"}):
             failure_count += 1; raise TestFailure("MasterList P2P sync failed")

        # 5. TEST: Authentication Flows
        print_step(5, "TESTING AUTHENTICATION FLOWS...")

        # Test A: Correct Password Proxy Login
        test_count += 1
        print_substep("Test A: Correct Password Proxy Login (B -> A)...")
        
        # Log in Admin User
        resp_admin = requests.post(f"http://localhost:{PORT_B}/backend/auth/login/", 
                            json={"username": "traveler_joe", "password": "password123"})
        
        # Log in Customer User
        resp_customer = requests.post(f"http://localhost:{PORT_B}/backend/auth/login/", 
                            json={"username": "traveler_bob", "password": "password123"})
        
        # Track tokens for later tests
        proxy_access_token_admin = None
        proxy_refresh_token_admin = None
        proxy_access_token_customer = None

        if resp_admin.status_code == 200 and resp_customer.status_code == 200:
            data_admin = resp_admin.json()
            proxy_access_token_admin = data_admin.get('access')
            proxy_refresh_token_admin = data_admin.get('refresh')
            
            data_customer = resp_customer.json()
            proxy_access_token_customer = data_customer.get('access')
            
            # Deep Token Inspection: Verify it was actually signed by Server A
            payload = jwt.decode(proxy_access_token_admin, options={"verify_signature": False})
            
            if payload.get('iss') == "server_a" and payload.get('home_server_id') == "server_a":
                print_success("Proxy logins worked and returned authoritative tokens from Server A.")
            else:
                print_failure("Proxy login returned locally signed tokens", f"iss: {payload.get('iss')}")
                failure_count += 1
        else:
            print_failure("Proxy login failed", f"Admin: {resp_admin.status_code}, Customer: {resp_customer.status_code}")
            failure_count += 1

        # Test A.1: Using Proxied Token on Visiting Server
        test_count += 1
        print_substep("Test A.1: Using Proxied Token on Visiting Server (B)...")
        if proxy_access_token_admin:
            headers = {"Authorization": f"Bearer {proxy_access_token_admin}"}
            resp = requests.get(f"http://localhost:{PORT_B}/backend/users/me/", headers=headers)
            if resp.status_code == 200:
                print_success("Server B correctly verified and accepted Server A's proxied token.")
            else:
                print_failure("Server B rejected the proxied token", f"{resp.status_code}: {resp.text}")
                failure_count += 1
        else:
            print(f"{YELLOW}  SKIPPING Test A.1: No proxy token available.{RESET}")
            failure_count += 1

        # Test A.2: Role-Based Access Control (RBAC) Across P2P
        test_count += 1
        print_substep("Test A.2: Role-Based Access Control (RBAC) on Visiting Server (B)...")
        if proxy_access_token_admin and proxy_access_token_customer:
            # 1. Attempt as Admin (Should Succeed - 200 OK)
            headers_admin = {"Authorization": f"Bearer {proxy_access_token_admin}"}
            resp_admin_rbac = requests.get(f"http://localhost:{PORT_B}/backend/users/", headers=headers_admin)
            
            # 2. Attempt as Customer (Should Fail - 403 Forbidden)
            headers_customer = {"Authorization": f"Bearer {proxy_access_token_customer}"}
            resp_customer_rbac = requests.get(f"http://localhost:{PORT_B}/backend/users/", headers=headers_customer)
            
            if resp_admin_rbac.status_code == 200 and resp_customer_rbac.status_code == 403:
                print_success("Server B correctly granted 'super_admin' access and denied 'customer' access based on P2P tokens.")
            else:
                print_failure("RBAC failed on Server B", f"Admin response: {resp_admin_rbac.status_code}, Customer response: {resp_customer_rbac.status_code}")
                failure_count += 1
        else:
            print(f"{YELLOW}  SKIPPING Test A.2: Proxy tokens not available.{RESET}")
            failure_count += 1

        # Test B: Incorrect Password Proxy Login
        test_count += 1
        print_substep("Test B: Incorrect Password Proxy Login (B -> A)...")
        resp = requests.post(f"http://localhost:{PORT_B}/backend/auth/login/", 
                            json={"username": "traveler_joe", "password": "WRONG_PASSWORD"})
        if resp.status_code == 401:
            print_success("Server correctly rejected wrong password.")
        else:
            print_failure(f"Server returned {resp.status_code} for wrong password (expected 401).")
            failure_count += 1


        # 6. TEST: Cross-Server JWT Verification (P2P)
        print_step(6, "TESTING CROSS-SERVER JWT VERIFICATION...")

        # Get a real token from Server A
        print_substep("Fetching valid token from Server A...")
        resp = requests.post(f"http://localhost:{PORT_A}/backend/auth/login/", 
                            json={"username": "traveler_joe", "password": "password123"})
        if resp.status_code != 200:
            print_error(f"Could not get token from Server A: {resp.text}")
            failure_count += 1
        else:
            valid_token_a = resp.json()['access']
            user_id_a = resp.json()['user_id']

            # Attempt to use Server A's token on Server B
            test_count += 1
            print_substep("Test C: Using Server A's Token on Server B (Cross-Verification)...")
            headers = {"Authorization": f"Bearer {valid_token_a}"}
            resp = requests.get(f"http://localhost:{PORT_B}/backend/users/me/", headers=headers)
            if resp.status_code == 200:
                print_success("Server B verified Server A's token using Server A's Public Key.")
                print_substep(f"Verified Identity: {resp.json().get('username')}")
            else:
                print_failure("Server B rejected a valid cross-server token", f"{resp.status_code}: {resp.text}")
                failure_count += 1

            # Test D: Malicious/Incorrectly Signed Token
            test_count += 1
            print_substep("Test D: Using Maliciously Signed Token on Server B...")
            # Construct a token that CLAIMS to be from Server A but is signed by a different key
            malicious_payload = {
                "user_id": user_id_a,
                "username": "traveler_joe",
                "iss": "server_a", # Claim to be from Server A
                "exp": int(time.time()) + 3600
            }
            malicious_token = jwt.encode(malicious_payload, priv_malicious, algorithm='RS256')
            
            headers = {"Authorization": f"Bearer {malicious_token}"}
            resp = requests.get(f"http://localhost:{PORT_B}/backend/users/me/", headers=headers)
            
            if resp.status_code == 403 or resp.status_code == 401:
                print_success(f"Server B correctly blocked malicious token ({resp.status_code}).")
            else:
                print_failure(f"Server B accepted a malicious token signed with the wrong key! ({resp.status_code})")
                failure_count += 1

            # Test D.1: Expired Token Rejection
            test_count += 1
            print_substep("Test D.1: Using an Expired Token on Server B...")
            expired_payload = {
                "user_id": user_id_a,
                "username": "traveler_joe",
                "iss": "server_a", 
                "home_server_id": "server_a",
                "exp": int(time.time()) - 3600 # Expired 1 hour ago
            }
            # Signed properly by Server A, but expired
            expired_token = jwt.encode(expired_payload, priv_a, algorithm='RS256')
            
            headers = {"Authorization": f"Bearer {expired_token}"}
            resp = requests.get(f"http://localhost:{PORT_B}/backend/users/me/", headers=headers)
            
            if resp.status_code == 403 or resp.status_code == 401:
                print_success(f"Server B correctly rejected the expired token ({resp.status_code}).")
            else:
                print_failure(f"Server B accepted an expired token! ({resp.status_code})")
                failure_count += 1

        # 7. TEST: TOKEN REFRESH AND LOGOUT PROXYING
        print_step(7, "TESTING TOKEN REFRESH AND LOGOUT PROXYING")

        # Initialize variable to avoid NameError if Test F fails
        new_access_b_proxied = None
        refresh_a_after_proxy = None

        # Test E: Token Refresh on Home Server (A)
        test_count += 1
        print_substep("Test E: Token Refresh on Home Server (A)...")
        resp = requests.post(f"http://localhost:{PORT_A}/backend/auth/login/", 
                            json={"username": "traveler_joe", "password": "password123"})
        if resp.status_code != 200:
            print_error(f"Could not get login response from Server A: {resp.text}")
            failure_count += 1
        else:
            refresh_a = resp.json()['refresh']
            resp = requests.post(f"http://localhost:{PORT_A}/backend/auth/refresh/", 
                                json={"refresh": refresh_a})
            if resp.status_code == 200:
                print_success("Home server correctly refreshed its own token.")
                # Note: refresh_a is now blacklisted because ROTATE_REFRESH_TOKENS=True
            else:
                print_failure("Home server failed to refresh its own token", f"{resp.status_code}: {resp.text}")
                failure_count += 1

        # Test F: Token Refresh Proxy (B -> A)
        test_count += 1
        print_substep("Test F: Token Refresh Proxy (B -> A)...")
        # Use the refresh token we got from the Proxy Login on Server B earlier
        if proxy_refresh_token_admin:
            resp = requests.post(f"http://localhost:{PORT_B}/backend/auth/refresh/", 
                                json={"refresh": proxy_refresh_token_admin})
            if resp.status_code == 200:
                print_success("Server B proxied the refresh request to Server A.")
                new_access_b_proxied = resp.json()['access']
                refresh_a_after_proxy = resp.json().get('refresh') # The new rotated refresh token
                
                # Verify the new access token actually works on B
                headers = {"Authorization": f"Bearer {new_access_b_proxied}"}
                resp = requests.get(f"http://localhost:{PORT_B}/backend/users/me/", headers=headers)
                if resp.status_code == 200:
                    print_success("Proxied access token is valid on Server B.")
                else:
                    print_failure(f"Proxied access token rejected by Server B ({resp.status_code})")
                    failure_count += 1
            else:
                print_failure("Server B failed to proxy refresh request", f"{resp.status_code}: {resp.text}")
                failure_count += 1
        else:
            print(f"{YELLOW}  SKIPPING Test F: Dependency from Test A not met.{RESET}")
            failure_count += 1

        # Test G: Logout Proxy (B -> A)
        test_count += 1
        print_substep("Test G: Logout Proxy (B -> A)...")
        if new_access_b_proxied and refresh_a_after_proxy:
            # Logout using Server B, providing the latest rotated refresh token
            headers = {"Authorization": f"Bearer {new_access_b_proxied}"}
            resp = requests.post(f"http://localhost:{PORT_B}/backend/auth/logout/", 
                                json={"refresh": refresh_a_after_proxy}, headers=headers)
            if resp.status_code == 200:
                print_success("Server B proxied the logout/blacklist request to Server A.")
                
                # Now verify the refresh token is blacklisted on Server A
                print_substep("Verifying token is blacklisted on Server A...")
                resp = requests.post(f"http://localhost:{PORT_A}/backend/auth/refresh/", 
                                    json={"refresh": refresh_a_after_proxy})
                if resp.status_code == 401 or resp.status_code == 400:
                    # SimpleJWT might return 401 or 400 depending on version/config for blacklisted tokens
                    print_success(f"Refresh token is now invalid on Server A ({resp.status_code}).")
                else:
                    print_failure(f"Refresh token still valid on Server A after logout proxy ({resp.status_code})")
                    failure_count += 1
            else:
                print_failure("Server B failed to proxy logout request", f"{resp.status_code}: {resp.text}")
                failure_count += 1
        else:
            print(f"{YELLOW}  SKIPPING Test G: Dependency from Test F not met.{RESET}")
            failure_count += 1

        # 8. TEST: CROSS-SERVER REGISTRATION
        print_step(8, "TESTING CROSS-SERVER REGISTRATION")
        
        # Test H: Registering on a Visiting Server
        test_count += 1
        print_substep("Test H: Registering a brand new user directly on Server B...")
        reg_payload = {
            "username": "new_guy_bob",
            "password": "securepassword123",
            "first_name": "Bob",
            "last_name": "Newguy",
            "user_type": "customer"
        }
        resp = requests.post(f"http://localhost:{PORT_B}/backend/auth/register/", json=reg_payload)
        
        if resp.status_code == 201:
            data = resp.json()
            new_access_token = data.get('access')
            
            # Verify the token was signed by Server B, claiming ownership
            payload = jwt.decode(new_access_token, options={"verify_signature": False})
            if payload.get('iss') == "server_b" and payload.get('home_server_id') == "server_b":
                print_success("Server B registered the new user and issued a token claiming ownership.")
            else:
                print_failure("Server B issued a token with incorrect claims", f"iss: {payload.get('iss')}, home: {payload.get('home_server_id')}")
                failure_count += 1
        else:
            print_failure("Server B failed to register new user", f"{resp.status_code}: {resp.text}")
            failure_count += 1

        # 9. TEST: ORDER CREATION AND STRIPE WEBHOOKS
        print_step(SECTION_TOTAL, "TESTING ORDER CREATION AND STRIPE WEBHOOKS")
        
        test_count += 1
        print_substep("Test I: End-to-End Order Creation and Payment Webhook...")
        try:
            # Step 0: Get a token for traveler_bob on Server A
            resp = requests.post(f"http://localhost:{PORT_A}/backend/auth/login/", json={"username": "traveler_bob", "password": "password123"})
            if resp.status_code != 200:
                raise Exception("Failed to login as traveler_bob on Server A")
            customer_a_token = resp.json().get('access')

            # Step 1: Use customer_a_token to create a drink and an order
            drink_payload = {
                "Name": "Customer A Test Drink",
                "SodaUsed": ["Cola"],
                "SyrupsUsed": ["Vanilla"],
                "Ice": "Regular",
                "Size": "24oz",
                "User_Created": True,
                "Price": 2.50
            }
            
            resp = requests.post(
                f"http://localhost:{PORT_A}/backend/drinks/",
                headers={"Authorization": f"Bearer {customer_a_token}"},
                json=drink_payload
            )
            if resp.status_code != 201:
                raise Exception(f"Failed to create drink: {resp.text}")
            
            drink_id = resp.json().get('DrinkID')
            
            order_payload = {
                "Drinks": [drink_id],
                "OrderStatus": "Pending",
                "PaymentStatus": "Pending"
            }
            
            resp = requests.post(
                f"http://localhost:{PORT_A}/backend/orders/",
                headers={"Authorization": f"Bearer {customer_a_token}"},
                json=order_payload
            )
            if resp.status_code != 201:
                raise Exception(f"Failed to create order: {resp.text}")
            
            order_id = resp.json().get('OrderID')
            
            # Step 2: Create Payment Intent
            pi_payload = {
                "amount": 2.50, # Optional now, but required by API contract
                "order_id": order_id
            }
            resp = requests.post(
                f"http://localhost:{PORT_A}/backend/create-payment-intent/",
                headers={"Authorization": f"Bearer {customer_a_token}"},
                json=pi_payload
            )
            if resp.status_code != 200:
                raise Exception(f"Failed to create payment intent: {resp.text}")
            
            # Verify StripeID was set
            resp = requests.get(
                f"http://localhost:{PORT_A}/backend/orders/{order_id}/",
                headers={"Authorization": f"Bearer {customer_a_token}"}
            )
            order_data = resp.json()
            stripe_id = order_data.get('StripeID')
            if stripe_id != 'pi_mock_123':
                raise Exception(f"Order did not get mock StripeID. Got: {stripe_id}")
            
            # Step 3: Simulate Stripe Webhook
            webhook_payload = {
                "type": "payment_intent.succeeded",
                "data": {
                    "object": {
                        "id": stripe_id
                    }
                }
            }
            
            resp = requests.post(
                f"http://localhost:{PORT_A}/backend/stripe/webhook/",
                headers={"Stripe-Signature": "mock_signature_for_testing"},
                json=webhook_payload
            )
            
            if resp.status_code != 200:
                raise Exception(f"Webhook rejected: {resp.text}")
            
            # Step 4: Verify Order Fulfillment
            resp = requests.get(
                f"http://localhost:{PORT_A}/backend/orders/{order_id}/",
                headers={"Authorization": f"Bearer {customer_a_token}"}
            )
            
            if resp.json().get('PaymentStatus') != 'Paid':
                raise Exception(f"Order PaymentStatus was not updated to Paid! Got: {resp.json().get('PaymentStatus')}")
            
            print_success("Full order creation, payment intent, and webhook flow passed.")
            
        except Exception as e:
            print_failure(str(e))
            failure_count += 1

    except TestFailure:
        # Step-level failure already tracked in failure_count
        pass
    except Exception as e:
        print_error(f"DURING TEST: {str(e)}")
        failure_count += 1
    finally:
        cleanup()
    
    elapsed = time.time() - start_suite_time
    print(f"\n----------------------------------------------------------------------")
    print(f"Ran {test_count} test scenarios in {elapsed:.3f}s\n")

    # Final Summary after cleanup
    if failure_count == 0:
        print_success("VERIFICATION COMPLETE: All P2P Security and Auth Scenarios Passed.")
    else:
        print_error(f"VERIFICATION FAILED: {failure_count} test scenario(s) failed.")
    
    if failure_count > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()

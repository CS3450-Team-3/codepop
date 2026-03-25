"""
P2P Orchestrator Template

This script provides a blueprint for running a full end-to-end test 
between two live Django instances. 

NOTE: This script is intended to be run on a local machine with 
access to multiple terminal windows or a process manager.
"""

import requests
import time
import subprocess
import os
from port_utils import find_n_available_ports

# ANSI Color Codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
CYAN = "\033[96m"
RESET = "\033[0m"
BOLD = "\033[1m"

# CONFIGURATION
# Find available ports starting from 8050
found_ports = find_n_available_ports(2)
PORT_A = found_ports[0]
PORT_B = found_ports[1]
SERVER_A_URL = f"http://localhost:{PORT_A}"
SERVER_B_URL = f"http://localhost:{PORT_B}"

def run_e2e_test():
    print(f"{BOLD}{BLUE}--- Starting End-to-End P2P Authentication Test ---{RESET}")
    print(f"{CYAN}Using dynamic ports: Server A = {PORT_A}, Server B = {PORT_B}{RESET}")

    # 1. Verification: Are servers running?
    try:
        requests.get(SERVER_A_URL, timeout=2)
        requests.get(SERVER_B_URL, timeout=2)
    except requests.exceptions.ConnectionError:
        print(f"{RED}{BOLD}ERROR: Both servers must be running before starting this test.{RESET}")
        print(f"Server A: {SERVER_A_URL}")
        print(f"Server B: {SERVER_B_URL}")
        return

    # 2. Step 1: Create a user on Server A
    print(f"\n{YELLOW}[Step 1] Registering user 'traveler_joe' on Server A...{RESET}")
    reg_payload = {
        "username": "traveler_joe",
        "password": "securepassword123",
        "first_name": "Joe",
        "last_name": "Traveler",
        "user_type": "customer"
    }
    resp = requests.post(f"{SERVER_A_URL}/backend/auth/register/", json=reg_payload)
    if resp.status_code == 201:
        print(f"{GREEN}SUCCESS: User registered on Server A.{RESET}")
    else:
        print(f"{RED}FAILED: {resp.text}{RESET}")
        return

    # 3. Step 2: Trigger Sync on Server B
    print(f"\n{YELLOW}[Step 2] Triggering MasterList sync on Server B...{RESET}")
    print(f"{CYAN}(Make sure you have registered Server A in Server B's ServerRegistry table first!){RESET}")
    
    # 4. Step 3: Attempt Proxy Login on Server B
    print(f"\n{YELLOW}[Step 3] Attempting login for 'traveler_joe' on Server B (Visiting Server)...{RESET}")
    login_payload = {
        "username": "traveler_joe",
        "password": "securepassword123"
    }
    
    start_time = time.time()
    resp = requests.post(f"{SERVER_B_URL}/backend/auth/login/", json=login_payload)
    end_time = time.time()

    if resp.status_code == 200:
        data = resp.json()
        print(f"{GREEN}SUCCESS: Server B proxied the request and issued a token in {end_time - start_time:.2f}s{RESET}")
        print(f"Token user_type: {data.get('user_type')}")
        print(f"Is Proxy: {data.get('is_proxy')}")
        print(f"Home Server ID: {data.get('home_server_id')}")
    else:
        print(f"{RED}FAILED: {resp.status_code} - {resp.text}{RESET}")

    print(f"\n{BOLD}{BLUE}--- Test Complete ---{RESET}")


if __name__ == "__main__":
    run_e2e_test()

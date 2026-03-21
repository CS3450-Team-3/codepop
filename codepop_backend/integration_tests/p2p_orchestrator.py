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

# CONFIGURATION
SERVER_A_URL = "http://localhost:8000"
SERVER_B_URL = "http://localhost:8001"

def run_e2e_test():
    print("--- Starting End-to-End P2P Authentication Test ---")

    # 1. Verification: Are servers running?
    try:
        requests.get(SERVER_A_URL, timeout=2)
        requests.get(SERVER_B_URL, timeout=2)
    except requests.exceptions.ConnectionError:
        print("ERROR: Both servers must be running before starting this test.")
        print(f"Server A: {SERVER_A_URL}")
        print(f"Server B: {SERVER_B_URL}")
        return

    # 2. Step 1: Create a user on Server A
    print(f"\n[Step 1] Registering user 'traveler_joe' on Server A...")
    reg_payload = {
        "username": "traveler_joe",
        "password": "securepassword123",
        "first_name": "Joe",
        "last_name": "Traveler",
        "user_type": "customer"
    }
    resp = requests.post(f"{SERVER_A_URL}/backend/auth/register/", json=reg_payload)
    if resp.status_code == 201:
        print("SUCCESS: User registered on Server A.")
    else:
        print(f"FAILED: {resp.text}")
        return

    # 3. Step 2: Trigger Sync on Server B
    # In a real environment, you would run `python manage.py run_sync` on Server B.
    # This ensures Server B's MasterList knows about traveler_joe.
    print(f"\n[Step 2] Triggering MasterList sync on Server B...")
    print("(Make sure you have registered Server A in Server B's ServerRegistry table first!)")
    
    # Simulate the sync by manually adding to the MasterList if needed, 
    # or by calling the sync management command via subprocess.
    # subprocess.run(["python", "manage.py", "run_sync"], env={"LOCAL_SERVER_ID": "2"})

    # 4. Step 3: Attempt Proxy Login on Server B
    print(f"\n[Step 3] Attempting login for 'traveler_joe' on Server B (Visiting Server)...")
    login_payload = {
        "username": "traveler_joe",
        "password": "securepassword123"
    }
    
    start_time = time.time()
    resp = requests.post(f"{SERVER_B_URL}/backend/auth/login/", json=login_payload)
    end_time = time.time()

    if resp.status_code == 200:
        data = resp.json()
        print(f"SUCCESS: Server B proxied the request and issued a token in {end_time - start_time:.2f}s")
        print(f"Token user_type: {data.get('user_type')}")
        print(f"Is Proxy: {data.get('is_proxy')}")
        print(f"Home Server ID: {data.get('home_server_id')}")
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")

    print("\n--- Test Complete ---")

if __name__ == "__main__":
    run_e2e_test()

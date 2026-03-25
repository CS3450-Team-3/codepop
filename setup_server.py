#!/usr/bin/env python3
"""
CodePop Server Setup Wizard

Run this script once to configure your store and generate a docker-compose.yml.
After completing the wizard, start your server with:

    docker compose up --build

"""
import getpass
import os
import re
import subprocess
import sys
import textwrap
from time import sleep


COMPOSE_TEMPLATE = """\
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: codepop_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "psql -U postgres -d codepop_db -c 'SELECT 1' > /dev/null 2>&1"]
      interval: 5s
      timeout: 5s
      retries: 20
      start_period: 15s

  backend:
    build:
      context: .
      dockerfile: codepop_backend/Dockerfile
    ports:
      - "9000:9000"
    environment:
      DB_HOST: db
      DB_NAME: codepop_db
      DB_USER: postgres
      DB_PASSWORD: password
      SERVER_URL: "http://backend:9000"
      SETUP_ADMIN_USERNAME: {admin_username}
      SETUP_ADMIN_PASSWORD: {admin_password}
      SETUP_ADMIN_EMAIL: {admin_email}
      SETUP_ADMIN_FIRST_NAME: {admin_first_name}
      SETUP_ADMIN_LAST_NAME: {admin_last_name}
      SETUP_REGION_NAME: {region_name}
      STORE_NAME: {store_name}
      STORE_ADDRESS: {store_address}
      STORE_CITY: {store_city}
      STORE_STATE: {store_state}
      STORE_ZIP: {store_zip}
    volumes:
      - node_data:/data
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:9000/health/')"]
      interval: 10s
      timeout: 5s
      retries: 15
      start_period: 30s

  frontend:
    build:
      context: ./codepop_frontend
    ports:
      - "4000:4000"
    environment:
      BACKEND_URL: "http://backend:9000"
    depends_on:
      backend:
        condition: service_healthy

  nginx:
    image: nginx:alpine
    ports:
      - "90:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend

volumes:
  postgres_data:
  node_data:
"""


def _prompt(label, required=True, default=None):
    """Prompt for a value, optionally showing a default."""
    display = f"  {label}"
    if default:
        display += f" [{default}]"
    display += ": "
    while True:
        value = input(display).strip()
        if not value and default:
            return default
        if value or not required:
            return value
        print(f"  This field is required.")


def _prompt_password(label):
    """Prompt for a password with confirmation, minimum 8 characters."""
    while True:
        password = getpass.getpass(f"  {label} (min 8 chars): ")
        if len(password) < 8:
            print("  Password must be at least 8 characters. Try again.")
            continue
        confirm = getpass.getpass("  Confirm password: ")
        if password != confirm:
            print("  Passwords do not match. Try again.")
            continue
        return password


def _yaml_value(value):
    """Wrap a value in double quotes, escaping any existing double quotes."""
    escaped = value.replace('"', '\\"')
    return f'"{escaped}"'


def _section(title):
    print(f"\n--- {title} ---")


def main():
    print("=" * 60)
    print("  CodePop Server Setup Wizard")
    print("=" * 60)
    print(textwrap.dedent("""\
        This wizard will collect your store information and generate
        a docker-compose.yml ready to launch your CodePop server.
    """))

    test_config      = _prompt("Setup with default TESTING values? (Y/n)")
    if test_config.lower() in ("y", "yes", ""):
        # ── Test Config ───────────────────────────────────────────────
        _section("Test Config")
        print("  Using test configuration with default credentials and store info.")
        admin_username   = "admin"
        admin_password   = "password123"
        admin_email      = "test@email.com"
        admin_first_name = "Test"
        admin_last_name  = "Ing"
        store_name       = "Test Store"
        store_address    = "123 Test St"
        store_city       = "Testville"
        store_state      = "TS"
        store_zip        = "12345"
        region_name      = "test-region"
    else:

      # ── Admin Credentials ─────────────────────────────────────────
      _section("Step 1: Admin Account")
      admin_username   = _prompt("Username")
      admin_password   = _prompt_password("Password")
      admin_email      = _prompt("Email")
      admin_first_name = _prompt("First name")
      admin_last_name  = _prompt("Last name")

      # ── Store Info ────────────────────────────────────────────────
      _section("Step 2: Store Information")
      store_name    = _prompt("Store name")
      store_address = _prompt("Street address")
      store_city    = _prompt("City")
      store_state   = _prompt("State (e.g. OR)")
      store_zip     = _prompt("ZIP code")

      # ── Region ────────────────────────────────────────────────────
      _section("Step 3: Region")
      print("  The region identifies this store in the CodePop network.")
      region_name = _prompt("Region name (e.g. us-west, Pacific-Northwest)")

      # ── Confirm ───────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  Review")
    print("=" * 60)
    print(f"  Admin username : {admin_username}")
    print(f"  Admin email    : {admin_email}")
    print(f"  Admin name     : {admin_first_name} {admin_last_name}")
    print(f"  Store name     : {store_name}")
    print(f"  Address        : {store_address}, {store_city}, {store_state} {store_zip}")
    print(f"  Region         : {region_name}")
    print()

    confirm = input("Generate docker-compose.yml with these settings? [Y/n]: ").strip().lower()
    if confirm not in ("", "y", "yes"):
        print("Aborted.")
        sys.exit(0)

    # ── Write compose file ────────────────────────────────────────
    compose_content = COMPOSE_TEMPLATE.format(
        admin_username=_yaml_value(admin_username),
        admin_password=_yaml_value(admin_password),
        admin_email=_yaml_value(admin_email),
        admin_first_name=_yaml_value(admin_first_name),
        admin_last_name=_yaml_value(admin_last_name),
        region_name=_yaml_value(region_name),
        store_name=_yaml_value(store_name),
        store_address=_yaml_value(store_address),
        store_city=_yaml_value(store_city),
        store_state=_yaml_value(store_state),
        store_zip=_yaml_value(store_zip),
    )

    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, "docker-compose.yml")

    with open(output_path, "w") as f:
        f.write(compose_content)

    print()
    print(f"  docker-compose.yml written to:")
    print(f"  {output_path}")
    print()
    print("=" * 60)
    print("  Next Steps")
    print("=" * 60)
    print(textwrap.dedent(f"""\
        Server is now configured and ready to launch!
        
        For subsequent server start run

            docker compose up

        Stop your server:

            docker compose down

        Stop and wipe ALL data (full reset):

            docker compose down -v

        Your server will be available at:
            Frontend : http://localhost:4000
            Backend  : http://localhost:9000
                          
        Now starting the server with `docker compose up --build`...
    """))


if __name__ == "__main__":
    main()
    sleep(5)  # Give user a moment to read the final message before logs start
    subprocess.run(["docker", "compose", "up", "--build"])

#!/usr/bin/env python3
"""
Run all 9 CodePop instances locally on a single machine.

Usage:
    python run_local.py           # start all 9 instances
    python run_local.py --stop    # stop and remove all instances
    python run_local.py --logs 3  # tail logs for instance 3 (1-indexed)

Each instance gets its own ports so nothing conflicts:
    Instance  Backend  Machine  Frontend  Nginx
       1       9001     9051     4001      91
       2       9002     9052     4002      92
       ...
       9       9009     9059     4009      99

Instance 1 (us-west-1) is the bootstrap node — all others join it.
Logs are written to instances/<name>/docker.log
"""
import argparse
import http.client
import http.server
import json
import os
import signal
import subprocess
import sys
import textwrap
import threading
import time

# ── Instance definitions (same as generate_test_instances.py) ─────────────────
INSTANCES = [
    ("us-west",     "CodePop Portland 1",    "100 SW Main St",    "Portland",       "OR", "97201", "c20g7c"),
    ("us-west",     "CodePop Portland 2",    "200 NW 23rd Ave",   "Portland",       "OR", "97210", "c20g5v"),
    ("us-west",     "CodePop Seattle",       "400 Pine St",       "Seattle",        "WA", "98101", "c23nb8"),
    ("us-east",     "CodePop New York 1",    "1 Wall St",         "New York",       "NY", "10005", "dr5regy"),
    ("us-east",     "CodePop New York 2",    "350 5th Ave",       "New York",       "NY", "10118", "dr5regw"),
    ("us-east",     "CodePop Boston",        "1 Washington St",   "Boston",         "MA", "02108", "drt2zy3"),
    ("us-mountain", "CodePop Denver 1",      "1600 Glenarm Pl",   "Denver",         "CO", "80202", "9xj64u1"),
    ("us-mountain", "CodePop Denver 2",      "2000 Larimer St",   "Denver",         "CO", "80205", "9xj6503"),
    ("us-mountain", "CodePop Salt Lake City","200 S Main St",     "Salt Lake City", "UT", "84101", "9x1ufkr"),
]

COMPOSE_TEMPLATE = """\
name: {project_name}

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
      context: ../../
      dockerfile: codepop_backend/Dockerfile
    ports:
      - "{backend_port}:9000"
    environment:
      DB_HOST: db
      DB_NAME: codepop_db
      DB_USER: postgres
      DB_PASSWORD: password
      STRIPE_SECRET_KEY: "${{STRIPE_SECRET_KEY:-TODO_get_a_new_secret_stripe_key}}"
      STRIPE_PUBLISHABLE_KEY: "${{STRIPE_PUBLISHABLE_KEY:-pk_test_51T5DqLPnaMtT5PTkugtHqM5ew5RSzkCJ0jklGkdSRXw8VnaiIN3AEW5NAYJzmdrYz2cUjQ7i9uvr9N2hpQnj01gE00jCYApVMN}}"
      STRIPE_WEBHOOK_SECRET: "${{STRIPE_WEBHOOK_SECRET:-TODO_get_a_webhook_secret}}"
      SERVER_URL: "http://localhost:{backend_port}"
      BOOTSTRAP_NODES: "{bootstrap_nodes}"
      MACHINE_HOST: "machine"
      MACHINE_PORT: "9050"
      SETUP_ADMIN_USERNAME: "admin"
      SETUP_ADMIN_PASSWORD: "password123"
      SETUP_ADMIN_EMAIL: "test@email.com"
      SETUP_ADMIN_FIRST_NAME: "Test"
      SETUP_ADMIN_LAST_NAME: "Ing"
      SETUP_REGION_NAME: "{region_name}"
      STORE_NAME: "{store_name}"
      STORE_ADDRESS: "{store_address}"
      STORE_CITY: "{store_city}"
      STORE_STATE: "{store_state}"
      STORE_ZIP: "{store_zip}"
      STORE_GEOHASH: "{store_geohash}"
    volumes:
      - ../../codepop_backend:/app
      - node_data:/data
    depends_on:
      db:
        condition: service_healthy
      machine:
        condition: service_started
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:9000/health/')"]
      interval: 10s
      timeout: 5s
      retries: 15
      start_period: 30s

  machine:
    build:
      context: ../../
      dockerfile: codepop_backend/Dockerfile
    entrypoint: ["python", "pseudo_machine_server.py", "--port", "9050", "--test-mode"]
    ports:
      - "{machine_port}:9050"
    volumes:
      - ../../codepop_backend:/app

  frontend:
    build:
      context: ../../codepop_frontend
    ports:
      - "{frontend_port}:4000"
    environment:
      BACKEND_URL: "http://backend:9000"
      WATCHPACK_POLLING: "true"
    volumes:
      - ../../codepop_frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      backend:
        condition: service_started

  nginx:
    image: nginx:alpine
    ports:
      - "{nginx_port}:80"
    volumes:
      - ../../nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend

volumes:
  postgres_data:
  node_data:
"""


def slug(region, store_name):
    words = store_name.split()
    suffix = words[-1] if words[-1].isdigit() else words[-1].lower()
    return f"{region}-{suffix}".lower().replace(" ", "-")


def instance_dir(name):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, "instances", name)


def generate_instances():
    """Write docker-compose.yml for each instance with unique ports."""
    # First node's backend port — used as BOOTSTRAP_NODES for all others
    first_backend_port = 9001

    seen = {}
    names = []
    for i, (region, store_name, address, city, state, zip_code, geohash) in enumerate(INSTANCES):
        name = slug(region, store_name)
        if name in seen:
            name = f"{name}-{i+1}"
        seen[name] = True
        names.append(name)

        backend_port  = 9000 + (i + 1)
        machine_port  = 9050 + (i + 1)
        frontend_port = 4000 + (i + 1)
        nginx_port    = 90   + (i + 1)

        bootstrap = "" if i == 0 else f"localhost:{first_backend_port}"

        compose = COMPOSE_TEMPLATE.format(
            project_name=name,
            backend_port=backend_port,
            machine_port=machine_port,
            frontend_port=frontend_port,
            nginx_port=nginx_port,
            bootstrap_nodes=bootstrap,
            region_name=region,
            store_name=store_name,
            store_address=address,
            store_city=city,
            store_state=state,
            store_zip=zip_code,
            store_geohash=geohash,
        )

        idir = instance_dir(name)
        os.makedirs(idir, exist_ok=True)
        with open(os.path.join(idir, "docker-compose.yml"), "w") as f:
            f.write(compose)

    return names


REGION_COLORS = {
    "us-west":     "#3b82f6",
    "us-east":     "#10b981",
    "us-mountain": "#f59e0b",
}

# Hop-by-hop headers that must not be forwarded by a proxy (RFC 2616 §13.5.1)
_HOP_BY_HOP = frozenset({
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade",
})


def build_selector_page(names, current_instance=None):
    """Return an HTML string for the instance selector served at localhost:4000.

    current_instance: value of the codepop_instance cookie, or None.
    The matching card is highlighted so the user can see which instance is active.
    """
    cards = ""
    for i, (name, (region, store_name, *_)) in enumerate(zip(names, INSTANCES)):
        frontend_port = 4001 + i
        backend_port  = 9001 + i
        color = REGION_COLORS.get(region, "#6b7280")
        is_active = (name == current_instance)
        active_badge = (
            '<div class="active-badge">Currently selected</div>' if is_active else ""
        )
        active_style = f"outline: 2px solid {color}; outline-offset: -2px;" if is_active else ""
        cards += f"""
        <button class="card" onclick="selectInstance('{name}')"
                style="border-top: 4px solid {color}; {active_style}">
          {active_badge}
          <div class="region" style="color:{color}">{region}</div>
          <div class="store">{store_name}</div>
          <div class="ports">Frontend :{frontend_port} &nbsp;·&nbsp; Backend :{backend_port}</div>
        </button>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CodePop — Instance Selector</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: system-ui, sans-serif; background: #0f172a; color: #f1f5f9; min-height: 100vh; padding: 48px 24px; }}
    h1 {{ text-align: center; font-size: 2rem; margin-bottom: 8px; }}
    p  {{ text-align: center; color: #94a3b8; margin-bottom: 40px; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; max-width: 1000px; margin: 0 auto; }}
    .card {{ display: block; background: #1e293b; border-radius: 10px; padding: 24px; cursor: pointer;
             text-align: left; color: inherit; transition: transform .15s, box-shadow .15s;
             border-left: none; border-right: none; border-bottom: none; width: 100%; }}
    .card:hover {{ transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.4); }}
    .region {{ font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }}
    .store  {{ font-size: 1.1rem; font-weight: 600; margin-bottom: 10px; }}
    .ports  {{ font-size: .8rem; color: #64748b; }}
    .active-badge {{ font-size: .7rem; background: #334155; color: #94a3b8; padding: 2px 8px;
                     border-radius: 4px; margin-bottom: 10px; display: inline-block; }}
    .hint {{ text-align: center; font-size: .8rem; color: #475569; margin-top: 32px; }}
  </style>
</head>
<body>
  <h1>CodePop</h1>
  <p>Select an instance to connect to</p>
  <div class="grid">{cards}
  </div>
  <p class="hint">Switch instances any time: <code>localhost:4000/__proxy_selector__</code></p>
  <script>
    function selectInstance(name) {{
      document.cookie = "codepop_instance=" + name + "; path=/; SameSite=Lax";
      window.location.href = "/";
    }}
  </script>
</body>
</html>"""


def start_proxy(names, port=4000):
    """Start a cookie-based reverse proxy on *port* in a background daemon thread.

    Reads the ``codepop_instance`` cookie to decide which frontend port (4001-4009)
    to forward the request to. No redirects — fully transparent proxying.
    First visit (no cookie) serves the instance selector page instead.
    Visit /__proxy_selector__ at any time to switch instances.

    WebSocket (Next.js HMR) is not proxied — access ports 4001-4009 directly
    if you need hot-module reload.
    """
    instance_port_map = {name: 4001 + i for i, name in enumerate(names)}

    class _ProxyHandler(http.server.BaseHTTPRequestHandler):

        def log_message(self, format, *args):  # noqa: A002
            pass  # suppress per-request console noise

        def do_GET(self):     self._handle()
        def do_POST(self):    self._handle()
        def do_PUT(self):     self._handle()
        def do_PATCH(self):   self._handle()
        def do_DELETE(self):  self._handle()
        def do_HEAD(self):    self._handle()
        def do_OPTIONS(self): self._handle()

        def _parse_instance_cookie(self):
            raw = self.headers.get("Cookie", "")
            for part in raw.split(";"):
                part = part.strip()
                if "=" in part:
                    k, v = part.split("=", 1)
                    if k.strip() == "codepop_instance":
                        return v.strip()
            return None

        def _serve_selector(self, current_instance=None):
            html = build_selector_page(names, current_instance).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(html)

        def _serve_error(self, code, message):
            body = f"<h1>{code}</h1><p>{message}</p>".encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _handle(self):
            # Always show selector at this escape-hatch path regardless of cookie.
            if self.path == "/__proxy_selector__" or \
               self.path.startswith("/__proxy_selector__?"):
                self._serve_selector(current_instance=self._parse_instance_cookie())
                return

            # Instance metadata endpoint — used by the Locations page to map
            # backend ports back to proxy instance names for cookie-based switching.
            if self.path == "/__proxy/instances":
                data = json.dumps([
                    {"name": name, "backend_port": 9001 + i, "frontend_port": 4001 + i}
                    for i, name in enumerate(names)
                ]).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return

            instance_name = self._parse_instance_cookie()
            if not instance_name or instance_name not in instance_port_map:
                self._serve_selector()
                return

            self._proxy(instance_name, instance_port_map[instance_name])

        def _proxy(self, instance_name, target_port):
            # 1. Read request body if Content-Length is present.
            body = None
            raw_length = self.headers.get("Content-Length")
            if raw_length:
                try:
                    body = self.rfile.read(int(raw_length))
                except (ValueError, OSError):
                    body = None

            # 2. Strip hop-by-hop headers, rewrite Host.
            forward_headers = {}
            for hname, hval in self.headers.items():
                if hname.lower() not in _HOP_BY_HOP:
                    forward_headers[hname] = hval
            forward_headers["Host"] = f"localhost:{target_port}"

            conn = None
            try:
                conn = http.client.HTTPConnection("localhost", target_port, timeout=30)
                conn.request(self.command, self.path, body=body,
                             headers=forward_headers)
                resp = conn.getresponse()

                # resp.read() reassembles chunked responses transparently.
                resp_body = resp.read()

                # Forward status without injecting extra Server/Date headers.
                self.send_response_only(resp.status, resp.reason)

                # Forward response headers, preserving duplicate Set-Cookie entries.
                for hname, hval in resp.headers.items():
                    if hname.lower() not in _HOP_BY_HOP:
                        self.send_header(hname, hval)

                # Synthesize Content-Length if upstream used chunked encoding.
                if resp.headers.get("Content-Length") is None and resp_body:
                    self.send_header("Content-Length", str(len(resp_body)))

                self.send_header("Connection", "close")
                self.end_headers()

                # Suppress body for HEAD per RFC 7231 §4.3.2.
                if self.command != "HEAD":
                    self.wfile.write(resp_body)

            except ConnectionRefusedError:
                self._serve_error(
                    502,
                    f"Instance '{instance_name}' (port {target_port}) is not running. "
                    f"Check instances/{instance_name}/docker.log — or visit "
                    f"<a href='/__proxy_selector__'>/__proxy_selector__</a> to switch.",
                )
            except TimeoutError:
                self._serve_error(
                    504,
                    f"Instance '{instance_name}' (port {target_port}) did not respond "
                    f"within 30 seconds.",
                )
            except Exception as exc:
                self._serve_error(502, f"Proxy error: {exc}")
            finally:
                if conn:
                    conn.close()

    server = http.server.ThreadingHTTPServer(("", port), _ProxyHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def start_all(names):
    print("Starting all 9 instances...\n")
    print(f"  {'#':<3} {'Instance':<25} {'Backend':<10} {'Frontend':<10}")
    print(f"  {'-'*3} {'-'*25} {'-'*10} {'-'*10}")
    for i, name in enumerate(names):
        print(f"  {i+1:<3} {name:<25} :{9001+i:<9} :{4001+i:<9}")
    print()
    print("  Instance 1 is the bootstrap node. All others will join it.")
    print("  Logs: instances/<name>/docker.log")
    print()
    print("  Press Ctrl+C to stop all instances.\n")
    print("=" * 60)

    start_proxy(names, port=4000)
    print("  Proxy running at http://localhost:4000\n")

    processes = []

    # Start instance 1 first and wait for its backend to be ready
    # before starting the rest, so BOOTSTRAP_NODES resolves correctly.
    for i, name in enumerate(names):
        idir = instance_dir(name)
        log_path = os.path.join(idir, "docker.log")
        log_file = open(log_path, "w")

        proc = subprocess.Popen(
            ["docker", "compose", "up", "--build"],
            cwd=idir,
            stdout=log_file,
            stderr=log_file,
        )
        processes.append((name, proc, log_file))
        print(f"  [{i+1}] Started {name} (pid {proc.pid}) → {log_path}")

        # Stagger startup: give instance 1 a head start before others try to join
        if i == 0:
            print(f"  Waiting 30s for bootstrap node to initialize...")
            time.sleep(30)
        else:
            time.sleep(3)

    print("\nAll instances launched. Waiting... (Ctrl+C to stop all)\n")

    def shutdown(sig, frame):
        print("\nStopping all instances...")
        for name, proc, log_file in processes:
            proc.terminate()
        for name, proc, log_file in processes:
            proc.wait()
            log_file.close()
            print(f"  Stopped {name}")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Keep main thread alive and report any crashed processes
    while True:
        time.sleep(10)
        for name, proc, log_file in processes:
            if proc.poll() is not None:
                print(f"  WARNING: {name} exited with code {proc.returncode}. Check instances/{name}/docker.log")


def stop_all(names):
    print("Stopping all instances...")
    for name in names:
        idir = instance_dir(name)
        if os.path.exists(os.path.join(idir, "docker-compose.yml")):
            print(f"  Stopping {name}...")
            subprocess.run(["docker", "compose", "down"], cwd=idir, capture_output=True)
    print("Done.")


def tail_logs(names, index):
    if index < 1 or index > len(names):
        print(f"Instance index must be 1-{len(names)}")
        sys.exit(1)
    name = names[index - 1]
    log_path = os.path.join(instance_dir(name), "docker.log")
    if not os.path.exists(log_path):
        print(f"No log file found at {log_path} — has the instance been started?")
        sys.exit(1)
    print(f"Tailing logs for {name} ({log_path}) — Ctrl+C to stop\n")
    subprocess.run(["tail", "-f", log_path])


def main():
    parser = argparse.ArgumentParser(description="Run all 9 CodePop instances locally.")
    parser.add_argument("--stop", action="store_true", help="Stop all instances")
    parser.add_argument("--logs", type=int, metavar="N", help="Tail logs for instance N (1-indexed)")
    args = parser.parse_args()

    names = generate_instances()

    if args.stop:
        stop_all(names)
    elif args.logs:
        tail_logs(names, args.logs)
    else:
        start_all(names)


if __name__ == "__main__":
    main()

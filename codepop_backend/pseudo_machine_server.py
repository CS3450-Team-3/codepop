import http.server
import json
import socketserver
import time
import random
import uuid
import sys
import argparse

# Define initial state
MACHINE_STATE = {
    "machine_id": str(uuid.uuid4()),
    "machine_type": "CodePop V1 Dispenser",
    "status": "running",
    "last_status_change": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "time_until_inoperable": None,
    "broken_parts": []
}

class MachineHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            # If not in forced test mode, have a random chance to fail
            if not getattr(self.server, 'test_mode', False) and MACHINE_STATE["status"] == "running" and random.random() < 0.05:
                self.trigger_error()
            
            response = json.dumps(MACHINE_STATE).encode('utf-8')
            self.wfile.write(response)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/run-test':
            # Simulate running a diagnostic test
            print("Machine: Running self-diagnostic test...")
            time.sleep(1) # Artificial delay
            
            MACHINE_STATE["status"] = "running"
            MACHINE_STATE["broken_parts"] = []
            MACHINE_STATE["time_until_inoperable"] = None
            MACHINE_STATE["last_status_change"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = json.dumps(MACHINE_STATE).encode('utf-8')
            self.wfile.write(response)
            print("Machine: Diagnostics complete. All systems nominal.")
        else:
            self.send_response(404)
            self.end_headers()

    def trigger_error(self):
        MACHINE_STATE["status"] = "error"
        MACHINE_STATE["broken_parts"] = [random.choice(["Syrup Pump 1", "Syrup Pump 2", "CO2 Valve", "Ice Maker"])]
        MACHINE_STATE["time_until_inoperable"] = random.randint(1, 48)
        MACHINE_STATE["last_status_change"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    def log_message(self, format, *args):
        # Suppress logging to keep tests clean
        pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Pseudo Machine Server')
    parser.add_argument('--port', type=int, default=9050, help='Port to run on')
    parser.add_argument('--test-mode', action='store_true', help='Start with a broken part')
    args = parser.parse_args()

    if args.test_mode:
        # Initialize in error state
        MACHINE_STATE["status"] = "error"
        MACHINE_STATE["broken_parts"] = ["Initial Test Fault: Main Valve"]
        MACHINE_STATE["time_until_inoperable"] = 24
        print(f"Machine: Starting in TEST MODE (Manual fault injected) on port {args.port}")

    # Set allow_reuse_address at the class level BEFORE instantiation
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", args.port), MachineHandler) as httpd:
        httpd.test_mode = args.test_mode
        print(f"Pseudo machine server started on port {args.port} (Test Mode: {args.test_mode})")
        httpd.serve_forever()

import socket

def is_port_in_use(port):
    """Check if a port is in use on localhost."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return False
        except socket.error:
            return True

def find_available_port(start_port=8050, exclude_ports=None):
    """Find the next available port starting from start_port, excluding specific ports."""
    if exclude_ports is None:
        exclude_ports = {9000, 9001, 8000, 8001, 3000, 4000}
    
    port = start_port
    while True:
        if port not in exclude_ports and not is_port_in_use(port):
            return port
        port += 1

def find_n_available_ports(n, start_port=8050, exclude_ports=None):
    """Find n available ports starting from start_port."""
    ports = []
    current_port = start_port
    for _ in range(n):
        available_port = find_available_port(current_port, exclude_ports)
        ports.append(available_port)
        current_port = available_port + 1
    return ports

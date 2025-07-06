#!/usr/bin/env python3
"""
Secure proxy server with authentication and logging
"""

import os
import json
import base64
import hashlib
import logging
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import requests

# Configuration
PROXY_PORT = 8899
AUTH_REALM = "F1 Pivot Table"
MAX_FAILED_ATTEMPTS = 3
BLOCK_DURATION = 300  # 5 minutes

# Set up logging
logging.basicConfig(
    filename='access.log',
    level=logging.INFO,
    format='%(asctime)s - %(message)s'
)

# Simple in-memory store for failed attempts
failed_attempts = {}

class SecureProxyHandler(SimpleHTTPRequestHandler):
    """HTTP request handler with authentication and security features."""
    
    def do_AUTHHEAD(self):
        """Send authentication header."""
        self.send_response(401)
        self.send_header('WWW-Authenticate', f'Basic realm="{AUTH_REALM}"')
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(b'Authentication required')
    
    def check_auth(self):
        """Check if the request has valid authentication."""
        auth_header = self.headers.get('Authorization')
        
        if auth_header is None:
            return False
        
        # Get credentials from environment or use defaults
        valid_username = os.getenv('APP_USERNAME', 'admin')
        valid_password = os.getenv('APP_PASSWORD', 'changeme123')
        
        # Parse auth header
        try:
            auth_type, credentials = auth_header.split(' ', 1)
            if auth_type.lower() != 'basic':
                return False
            
            decoded = base64.b64decode(credentials).decode('utf-8')
            username, password = decoded.split(':', 1)
            
            # Check against valid credentials
            return username == valid_username and password == valid_password
            
        except Exception:
            return False
    
    def check_rate_limit(self):
        """Check if IP is rate limited."""
        client_ip = self.client_address[0]
        current_time = datetime.now().timestamp()
        
        if client_ip in failed_attempts:
            attempts, block_time = failed_attempts[client_ip]
            
            # Check if still blocked
            if current_time < block_time:
                remaining = int(block_time - current_time)
                self.send_error(429, f"Too many attempts. Try again in {remaining} seconds")
                return False
                
            # Reset if block expired
            if current_time >= block_time:
                del failed_attempts[client_ip]
        
        return True
    
    def record_failed_attempt(self):
        """Record a failed authentication attempt."""
        client_ip = self.client_address[0]
        current_time = datetime.now().timestamp()
        
        if client_ip in failed_attempts:
            attempts, _ = failed_attempts[client_ip]
            attempts += 1
        else:
            attempts = 1
        
        if attempts >= MAX_FAILED_ATTEMPTS:
            block_until = current_time + BLOCK_DURATION
            failed_attempts[client_ip] = (attempts, block_until)
            logging.warning(f"Blocked IP {client_ip} after {attempts} failed attempts")
        else:
            failed_attempts[client_ip] = (attempts, current_time)
    
    def do_GET(self):
        """Handle GET requests with authentication."""
        if not self.check_rate_limit():
            return
            
        if not self.check_auth():
            self.record_failed_attempt()
            self.do_AUTHHEAD()
            logging.warning(f"Failed auth from {self.client_address[0]} for {self.path}")
            return
        
        # Log successful access
        logging.info(f"Access from {self.client_address[0]} to {self.path}")
        
        # Handle request
        if self.path.startswith('/api/'):
            self.proxy_request()
        else:
            super().do_GET()
    
    def do_POST(self):
        """Handle POST requests with authentication."""
        if not self.check_rate_limit():
            return
            
        if not self.check_auth():
            self.record_failed_attempt()
            self.do_AUTHHEAD()
            return
        
        if self.path.startswith('/api/'):
            self.proxy_request()
        else:
            self.send_error(404, "Not Found")
    
    def proxy_request(self):
        """Proxy API requests to backend."""
        backend_path = self.path[4:]  # Remove '/api'
        backend_url = f"http://localhost:8000{backend_path}"
        
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            
            headers = {}
            for key, value in self.headers.items():
                if key.lower() not in ['host', 'connection', 'authorization']:
                    headers[key] = value
            
            if self.command == 'GET':
                response = requests.get(backend_url, headers=headers)
            elif self.command == 'POST':
                response = requests.post(backend_url, data=body, headers=headers)
            
            self.send_response(response.status_code)
            for key, value in response.headers.items():
                if key.lower() not in ['connection', 'transfer-encoding']:
                    self.send_header(key, value)
            self.end_headers()
            self.wfile.write(response.content)
            
        except Exception as e:
            logging.error(f"Proxy error: {e}")
            self.send_error(502, "Bad Gateway")
    
    def log_message(self, format, *args):
        """Override to prevent console spam."""
        pass  # Logging handled above

def run_secure_proxy():
    """Run the secure proxy server."""
    print(f"🔐 Secure proxy server starting on port {PROXY_PORT}")
    print(f"🔑 Username: {os.getenv('APP_USERNAME', 'admin')}")
    print(f"📝 Logs: access.log")
    print("\nPress Ctrl+C to stop...")
    
    server = HTTPServer(('0.0.0.0', PROXY_PORT), SecureProxyHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Stopping secure proxy...")
        server.shutdown()

if __name__ == '__main__':
    run_secure_proxy()
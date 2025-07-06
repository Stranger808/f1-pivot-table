#!/usr/bin/env python3
"""
Simple proxy server that serves static files and proxies API requests.
This allows exposing only one port to the network.
"""

import os
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import requests

class ProxyHTTPRequestHandler(SimpleHTTPRequestHandler):
    """HTTP request handler with proxy capabilities for API requests."""
    
    def do_GET(self):
        """Handle GET requests - proxy API calls or serve static files."""
        if self.path.startswith('/api/'):
            self.proxy_request()
        else:
            # Serve static files normally
            super().do_GET()
    
    def do_POST(self):
        """Handle POST requests - proxy to backend."""
        if self.path.startswith('/api/'):
            self.proxy_request()
        else:
            self.send_error(404, "Not Found")
    
    def proxy_request(self):
        """Proxy API requests to the backend server."""
        # Remove /api prefix and forward to backend
        backend_path = self.path[4:]  # Remove '/api'
        backend_url = f"http://localhost:8000{backend_path}"
        
        try:
            # Get request body if present
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            
            # Forward headers (excluding some)
            headers = {}
            for key, value in self.headers.items():
                if key.lower() not in ['host', 'connection']:
                    headers[key] = value
            
            # Make request to backend
            if self.command == 'GET':
                response = requests.get(backend_url, headers=headers)
            elif self.command == 'POST':
                response = requests.post(backend_url, data=body, headers=headers)
            else:
                self.send_error(405, "Method Not Allowed")
                return
            
            # Send response back to client
            self.send_response(response.status_code)
            
            # Forward response headers
            for key, value in response.headers.items():
                if key.lower() not in ['connection', 'transfer-encoding']:
                    self.send_header(key, value)
            self.end_headers()
            
            # Send response body
            self.wfile.write(response.content)
            
        except requests.exceptions.ConnectionError:
            print(f"Backend server not reachable at {backend_url}")
            self.send_error(503, "Backend server not available")
        except Exception as e:
            print(f"Proxy error: {e}")
            self.send_error(502, "Bad Gateway")
    
    def log_message(self, format, *args):
        """Override to provide cleaner logging."""
        print(f"{self.address_string()} - {format % args}")

def run_proxy_server(port=8899, bind_address='0.0.0.0'):
    """Run the proxy server."""
    server_address = (bind_address, port)
    httpd = HTTPServer(server_address, ProxyHTTPRequestHandler)
    
    print(f"🚀 Proxy server running on {bind_address}:{port}")
    print(f"📁 Serving static files from: {os.getcwd()}")
    print(f"🔀 Proxying /api/* requests to: http://localhost:8000")
    print(f"")
    print(f"📌 Make sure the backend server is running:")
    print(f"   cd ../backend && python main.py")
    print("\nPress Ctrl+C to stop...")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Stopping proxy server...")
        httpd.shutdown()

if __name__ == '__main__':
    run_proxy_server()
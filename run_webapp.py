"""
MIRROR & LENS LAB — Explore How Light Forms Images
Interactive Optics Physics Web Server Launcher.
Runs the complete laboratory web app locally and opens it in your default web browser.
Uses only Python's standard library (no pip install required).
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/index.html"
        print("=" * 70)
        print("🔬 MIRROR & LENS LAB — SERVER RUNNING")
        print(f"🌐 Access the interactive simulation at: {url}")
        print("=" * 70)
        print("Press Ctrl+C in this terminal to stop the server.")
        try:
            webbrowser.open(url)
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)

if __name__ == "__main__":
    start_server()

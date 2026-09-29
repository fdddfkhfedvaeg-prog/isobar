#!/usr/bin/env python3
"""Serve the lexicon locally and open it in the default browser.

    python3 serve.py            # http://127.0.0.1:8765 (next free port if busy)
    python3 serve.py --no-open  # don't launch a browser
"""
import functools
import http.server
import socket
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
START_PORT = 8765


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".json": "application/json; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # keep the console quiet


def free_port(start):
    for port in range(start, start + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise SystemExit("No free port found near %d" % start)


def main():
    port = free_port(START_PORT)
    handler = functools.partial(Handler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    url = "http://127.0.0.1:%d/" % port
    print("Lexicon NL running at %s  (Ctrl+C to stop)" % url)
    if "--no-open" not in sys.argv:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

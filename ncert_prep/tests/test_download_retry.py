"""A server that drops the connection mid-download (like 'Connection reset by peer'):
the downloader must retry and resume with a Range request.  Run: python tests/test_download_retry.py"""
import socket
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ncert  # noqa: E402

ncert.time.sleep = lambda s: None          # no waiting in the test
BODY = b"%PDF-1.4\n" + bytes(range(256)) * 4000   # ~1 MB
calls = []


class Flaky(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        rng = self.headers.get("Range")
        start = int(rng.split("=")[1].rstrip("-")) if rng else 0
        calls.append(start)
        self.send_response(206 if start else 200)
        self.send_header("Content-Length", str(len(BODY) - start))
        if start:
            self.send_header("Content-Range", f"bytes {start}-{len(BODY) - 1}/{len(BODY)}")
        self.end_headers()
        if len(calls) <= 2:                  # first two attempts: send 300 KB, then reset
            self.wfile.write(BODY[start:start + 300_000])
            self.wfile.flush()
            self.connection.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, b"\x01\x00\x00\x00\x00\x00\x00\x00")
            self.connection.close()
            return
        self.wfile.write(BODY[start:])


srv = ThreadingHTTPServer(("127.0.0.1", 0), Flaky)
threading.Thread(target=srv.serve_forever, daemon=True).start()
dest = Path(tempfile.mkdtemp()) / "x.pdf"
logs = []
ncert._download_file(f"http://127.0.0.1:{srv.server_port}/x.pdf", dest, log=logs.append)
assert dest.read_bytes() == BODY, "file corrupted"
assert calls[0] == 0 and calls[1] > 0 and calls[2] > calls[1], f"did not resume: {calls}"
print("\n".join(logs))
print(f"OK - recovered after {len(calls) - 1} dropped connections, resuming at bytes {calls[1:]}")

# A connection that never works ends with a clear, helpful message.
srv2 = ThreadingHTTPServer(("127.0.0.1", 0), Flaky)
port = srv2.server_port
srv2.server_close()                          # nothing listening
try:
    ncert._download_file(f"http://127.0.0.1:{port}/y.pdf", dest.with_name("y.pdf"), attempts=2)
    raise AssertionError("should have failed")
except ncert.DownloadError as e:
    assert "save the file" in str(e)
    print("OK - clear message when it keeps failing:", str(e)[:110], "…")

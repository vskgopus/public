"""Launcher: reuse a running copy of the same version, restart an older one.

Real launcher processes, no browser (NCERT_NO_BROWSER), temporary settings/data folders.
1. Same version already running: the second start just exits; the first keeps running.
2. A newer version starts: it asks the older copy to quit (with the token from
   running.json) and takes over.
3. A copy too old to be asked (running.json without token, as written by versions before
   2026-11-12): it is ended by its process number, after checking it is the launcher.
4. An older copy that is busy preparing a PDF is left running.
Run:  python tests/test_launcher.py
"""
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TMP = Path(tempfile.mkdtemp(prefix="ncert-launcher-test-"))
ENV = dict(os.environ, XDG_CONFIG_HOME=str(TMP / "config"), XDG_DATA_HOME=str(TMP / "data"),
           APPDATA=str(TMP / "config"), LOCALAPPDATA=str(TMP / "data"), NCERT_NO_BROWSER="1")
STATE = TMP / "data" / "ncert-prep" / "running.json"
sys.path.insert(0, str(ROOT))


def start(version: str) -> subprocess.Popen:
    return subprocess.Popen([sys.executable, str(ROOT / "launcher.py")], cwd=ROOT,
                            env=ENV | {"NCERT_CODE_VERSION": version},
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)


def wait_state(pid: int, timeout: float = 30) -> dict:
    end = time.time() + timeout
    while time.time() < end:
        try:
            st = json.loads(STATE.read_text())
            if st.get("pid") == pid:
                return st
        except (OSError, ValueError):
            pass
        time.sleep(0.2)
    raise TimeoutError(f"launcher {pid} did not start")


def exited(p: subprocess.Popen, timeout: float = 20) -> bool:
    try:
        p.wait(timeout)
        return True
    except subprocess.TimeoutExpired:
        return False


procs = []
try:
    # 1. same version: second start opens a window on the first and exits
    a = start("v1")
    procs.append(a)
    st = wait_state(a.pid)
    assert st["version"] == "v1" and st["token"], st
    if os.name != "nt":
        assert oct(STATE.stat().st_mode & 0o777) == "0o600", "running.json holds a token; keep it private"
    b = start("v1")
    procs.append(b)
    assert exited(b), "a second start of the same version should just open a window and exit"
    assert a.poll() is None, "the running copy must keep running"
    print("OK - same version: the running copy is reused")

    # 2. newer version: the older copy quits, the new one takes over
    c = start("v2")
    procs.append(c)
    st = wait_state(c.pid)
    assert exited(a), "the older copy should have quit"
    assert "stopping it to start the updated version" in c.stdout.readline()
    print("OK - newer version: older copy stopped, new one running at", st["url"])

    # 3. a copy too old to be asked: running.json has no token (as before this change)
    STATE.write_text(json.dumps({"url": st["url"], "pid": c.pid}))
    d = start("v3")
    procs.append(d)
    wait_state(d.pid)
    assert exited(c), "the old copy without a token should be ended by its process number"
    print("OK - copy without token: ended by process number")

    # 4. busy older copy is left alone
    import launcher  # noqa: E402
    opened, stopped = [], []
    launcher.running_instance = lambda: {"url": "http://127.0.0.1:1/", "version": "old", "busy": True,
                                         "token": "t", "pid": 1}
    launcher.open_window = opened.append
    launcher.stop_instance = lambda inst, wait=15: stopped.append(inst) or True
    launcher.main()
    assert opened == ["http://127.0.0.1:1/"] and not stopped, (opened, stopped)
    print("OK - busy older copy left running")
finally:
    for p in procs:
        if p.poll() is None:
            p.terminate()
            exited(p, 10)

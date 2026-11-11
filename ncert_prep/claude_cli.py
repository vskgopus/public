"""Use the person's own Claude Pro/Max subscription through the Claude Code CLI.

Claude Code is Anthropic's command-line tool. After `claude auth login` it runs on the
signed-in Claude account, so no API key is needed. This module finds the CLI, reports
login status, starts the browser login, and runs one non-interactive request.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

INSTALL_HELP = {
    "linux": "curl -fsSL https://claude.ai/install.sh | bash",
    "windows": "irm https://claude.ai/install.ps1 | iex   (in PowerShell)",
}

_login = {"proc": None, "output": ""}


def find() -> str | None:
    """Path of the `claude` executable, or None if Claude Code is not installed."""
    found = shutil.which("claude")
    if found:
        return found
    home = Path.home()
    for cand in [home / ".local" / "bin" / "claude", home / ".claude" / "local" / "claude",
                 home / ".local" / "bin" / "claude.exe", home / "AppData" / "Roaming" / "npm" / "claude.cmd"]:
        if cand.exists():
            return str(cand)
    return None


def _env() -> dict:
    env = dict(os.environ)
    # Make sure the subscription login is used, not an API key from the environment.
    for var in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"):
        env.pop(var, None)
    return env


def _run(args: list[str], timeout: int = 30, **kw) -> subprocess.CompletedProcess:
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace",
                          timeout=timeout, env=_env(), creationflags=flags, **kw)


def status() -> dict:
    exe = find()
    if not exe:
        return {"installed": False, "logged_in": False,
                "install_command": INSTALL_HELP["windows" if os.name == "nt" else "linux"]}
    info = {"installed": True, "logged_in": False, "path": exe}
    try:
        info["version"] = _run([exe, "--version"]).stdout.strip().split(" ")[0]
        data = json.loads(_run([exe, "auth", "status", "--json"]).stdout or "{}")
        info["logged_in"] = bool(data.get("loggedIn"))
        info["method"] = data.get("authMethod", "")
    except (OSError, ValueError, subprocess.TimeoutExpired) as e:
        info["error"] = str(e)
    proc = _login["proc"]
    info["login_running"] = bool(proc and proc.poll() is None)
    urls = re.findall(r"https://\S+", _login["output"])
    info["login_url"] = urls[-1] if urls else ""
    return info


def start_login() -> dict:
    """Start `claude auth login --claudeai`; it opens the browser for sign-in."""
    exe = find()
    if not exe:
        raise RuntimeError("Claude Code is not installed.")
    if _login["proc"] and _login["proc"].poll() is None:
        return status()
    _login["output"] = ""
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    proc = subprocess.Popen([exe, "auth", "login", "--claudeai"], stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, stdin=subprocess.PIPE, text=True,
                            encoding="utf-8", errors="replace", env=_env(), creationflags=flags)
    _login["proc"] = proc

    def pump():
        for line in proc.stdout:
            _login["output"] += line
    threading.Thread(target=pump, daemon=True).start()
    return status()


def send_login_code(code: str) -> None:
    """Some systems cannot open a browser callback; the CLI then asks for a pasted code."""
    proc = _login["proc"]
    if proc and proc.poll() is None and proc.stdin:
        proc.stdin.write(code.strip() + "\n")
        proc.stdin.flush()


def logout() -> None:
    exe = find()
    if exe:
        _run([exe, "auth", "logout"])


class UsageLimit(RuntimeError):
    """The Claude subscription's usage limit was reached."""


def run_structured(pdf_bytes: bytes, prompt: str, system: str, schema: dict,
                   timeout: int = 2400) -> dict:
    """Have Claude read the PDF and return JSON matching `schema`."""
    exe = find()
    if not exe:
        raise RuntimeError("Claude Code is not installed. Open Settings to see how to install it.")
    with tempfile.TemporaryDirectory(prefix="ncert-prep-") as work:
        Path(work, "chapter.pdf").write_bytes(pdf_bytes)
        args = [exe, "-p", f"Read every page of chapter.pdf in the current folder, then:\n\n{prompt}",
                "--output-format", "json", "--json-schema", json.dumps(schema),
                "--system-prompt", system, "--tools", "Read", "--allowedTools", "Read",
                "--permission-mode", "dontAsk", "--no-session-persistence", "--effort", "high"]
        try:
            proc = _run(args, timeout=timeout, cwd=work)
        except subprocess.TimeoutExpired:
            raise RuntimeError("Claude took too long. Try a smaller page range or split the chapter in Settings.")
    try:
        out = json.loads(proc.stdout)
    except ValueError:
        msg = (proc.stderr or proc.stdout or "").strip()[-500:]
        if re.search(r"log ?in|auth|credential", msg, re.I):
            raise RuntimeError("Claude Code is not logged in. Open Settings and click 'Log in with Claude'.")
        raise RuntimeError(f"Claude Code failed: {msg or 'no output'}")
    if out.get("is_error") or out.get("subtype") != "success":
        msg = str(out.get("result") or out.get("subtype") or "unknown error")
        if re.search(r"usage limit|rate limit|limit reached|resets?", msg, re.I):
            raise UsageLimit(msg)
        if re.search(r"log ?in|authenticat|credential|401", msg, re.I):
            raise RuntimeError("Claude Code is not logged in. Open Settings and click 'Log in with Claude'.")
        raise RuntimeError(f"Claude Code error: {msg[:400]}")
    data = out.get("structured_output")
    if data is None:
        data = json.loads(out.get("result") or "{}")
    return data

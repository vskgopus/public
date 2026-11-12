"""User settings, kept outside the app folder.

Linux:   ~/.config/ncert-prep/settings.json
Windows: %APPDATA%\\ncert-prep\\settings.json
The file is readable only by the current user because it may hold an API key.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

DEFAULTS = {
    "engine": "claude_login",   # "claude_login" (Claude Pro/Max via Claude Code), "api_key" (Anthropic) or "gemini"
    "api_key": "",              # Anthropic API key
    "gemini_api_key": "",       # Google Gemini API key (free from Google AI Studio)
    "gemini_model": "",         # e.g. "gemini-2.5-flash"; chosen from the models the key can use
    "gemini_output_limit": 0,   # the model's output token limit, as reported by Google
    "split_pages": 0,           # 0 = send whole chapters; N = split chapters into parts of N pages
    # Sections ticked on the main page (keys of generator.ALL_OPTIONS); remembered between runs.
    "sections": ["summary", "key_points", "one_mark", "short_answer", "long_answer"],
}


def config_dir() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    else:
        base = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    return base / "ncert-prep"


def data_dir() -> Path:
    """Downloaded chapters, saved results and generated PDFs."""
    if os.name == "nt":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    path = base / "ncert-prep"
    path.mkdir(parents=True, exist_ok=True)
    return path


SETTINGS_FILE = config_dir() / "settings.json"


def code_version() -> str:
    """A fingerprint of the app's code, so the launcher can tell an older running copy apart.
    NCERT_CODE_VERSION overrides it (tests)."""
    import hashlib
    if os.environ.get("NCERT_CODE_VERSION"):
        return os.environ["NCERT_CODE_VERSION"]
    here = Path(__file__).resolve().parent
    h = hashlib.sha1()
    for path in sorted([*here.glob("*.py"), *here.glob("templates/*.html")]):
        h.update(path.name.encode())
        h.update(path.read_bytes())
    return h.hexdigest()[:12]


def load() -> dict:
    try:
        data = json.loads(SETTINGS_FILE.read_text())
    except (OSError, ValueError):
        data = {}
    return {**DEFAULTS, **{k: v for k, v in data.items() if k in DEFAULTS}}


def save(changes: dict) -> dict:
    data = load()
    for key, value in changes.items():
        if key in DEFAULTS:
            data[key] = value
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = SETTINGS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=1))
    if os.name != "nt":
        os.chmod(tmp, 0o600)
    tmp.replace(SETTINGS_FILE)
    return data


def public(data: dict) -> dict:
    """Settings safe to send to the page (API key masked)."""
    key = data.get("api_key") or ""
    gkey = data.get("gemini_api_key") or ""
    return {"engine": data["engine"], "split_pages": data["split_pages"], "sections": data["sections"],
            "api_key_set": bool(key), "api_key_hint": f"…{key[-4:]}" if len(key) > 8 else "",
            "gemini_key_set": bool(gkey), "gemini_key_hint": f"…{gkey[-4:]}" if len(gkey) > 8 else "",
            "gemini_model": data["gemini_model"]}

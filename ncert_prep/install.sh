#!/usr/bin/env bash
# NCERT Exam Prep - installer for Ubuntu / Debian / other Linux desktops.
# Run from this folder:   bash install.sh
# Unattended (answers yes to every question):   ASSUME_YES=1 bash install.sh
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
APP_DIR="$(pwd)"

say()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
ask()  { if [[ "${ASSUME_YES:-}" == 1 ]]; then echo "$1 yes"; return 0; fi
         local a; read -r -p "$1 [Y/n] " a || true; [[ -z "$a" || "$a" =~ ^[Yy] ]]; }

say "Checking Python"
if ! command -v python3 >/dev/null; then
  echo "Python 3 is not installed. Install it with:  sudo apt install -y python3 python3-venv"; exit 1
fi
python3 - <<'EOF' || { echo "Python 3.10 or newer is needed."; exit 1; }
import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)
EOF

if ! python3 -m venv --help >/dev/null 2>&1 || ! python3 -c "import ensurepip" 2>/dev/null; then
  PYV=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
  echo "The Python 'venv' module is missing."
  if command -v apt-get >/dev/null && ask "Install it now with: sudo apt install -y python${PYV}-venv ?"; then
    sudo apt-get install -y "python${PYV}-venv" || sudo apt-get install -y python3-venv
  else
    echo "Install python3-venv, then run this installer again."; exit 1
  fi
fi

say "Installing the app's Python packages (into $APP_DIR/.venv)"
[[ -x .venv/bin/python ]] || python3 -m venv .venv
.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install --quiet -r requirements.txt

say "Creating the app shortcut"
chmod +x ncert-prep.sh
DESKTOP_FILE="$HOME/.local/share/applications/ncert-prep.desktop"
mkdir -p "$(dirname "$DESKTOP_FILE")"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=NCERT Exam Prep
Comment=Printable CBSE notes and question banks from NCERT textbooks
Exec="$APP_DIR/ncert-prep.sh"
Icon=$APP_DIR/assets/icon.png
Terminal=false
Categories=Education;
EOF
chmod +x "$DESKTOP_FILE"
DESK="$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")"
if [[ -d "$DESK" ]]; then
  cp "$DESKTOP_FILE" "$DESK/" && chmod +x "$DESK/ncert-prep.desktop"
  gio set "$DESK/ncert-prep.desktop" metadata::trusted true 2>/dev/null || true
  echo "Added 'NCERT Exam Prep' to the app menu and the desktop."
else
  echo "Added 'NCERT Exam Prep' to the app menu."
fi

say "Checking Claude Code (needed only for the 'Claude login' option)"
export PATH="$HOME/.local/bin:$PATH"
if command -v claude >/dev/null; then
  echo "Claude Code is installed: $(claude --version 2>/dev/null | head -1)"
elif ask "Install Claude Code now (lets the app use your Claude Pro/Max login)?"; then
  curl -fsSL https://claude.ai/install.sh | bash
else
  echo "Skipped. You can still use an API key, or install it later with:"
  echo "  curl -fsSL https://claude.ai/install.sh | bash"
fi

say "Done"
echo "Open 'NCERT Exam Prep' from the app menu or desktop (or run ./ncert-prep.sh)."
echo "On first start, the Settings panel lets you log in with Claude or enter an API key."

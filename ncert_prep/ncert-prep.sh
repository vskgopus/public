#!/usr/bin/env bash
# Start NCERT Exam Prep (Linux). Run install.sh once first.
cd "$(dirname "$(readlink -f "$0")")" || exit 1
export PATH="$HOME/.local/bin:$PATH"   # where Claude Code installs itself
if [[ ! -x .venv/bin/python ]]; then
  echo "Run 'bash install.sh' first."; exit 1
fi
exec .venv/bin/python launcher.py "$@"

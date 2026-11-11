#!/usr/bin/env bash
# Download (or update) NCERT Exam Prep from GitHub, install it, and add the desktop shortcut.
# No GitHub login needed. Run it again any time to update.
#
#   curl -fsSL https://raw.githubusercontent.com/vskgopus/public/ncert-prep/ncert_prep/setup.sh | bash
set -euo pipefail
REPO="https://github.com/vskgopus/public.git"
BRANCH="${NCERT_BRANCH:-ncert-prep}"
DIR="${NCERT_DIR:-$HOME/ncert-app}"

need=""
for pkg in git curl python3 python3-venv; do
  dpkg -s "$pkg" >/dev/null 2>&1 || need="$need $pkg"
done
if [[ -n "$need" ]]; then
  echo "Installing:$need (your Ubuntu password may be asked)"
  sudo apt-get update -qq && sudo apt-get install -y $need
fi

if [[ -d "$DIR/.git" ]]; then
  echo "Updating $DIR ..."
  git -C "$DIR" remote set-url origin "$REPO"
  git -C "$DIR" fetch -q --depth 1 origin "$BRANCH"
  git -C "$DIR" checkout -q -B "$BRANCH" FETCH_HEAD
else
  echo "Downloading to $DIR ..."
  git clone -q --depth 1 -b "$BRANCH" "$REPO" "$DIR"
fi

cd "$DIR/ncert_prep"
ASSUME_YES=1 bash install.sh </dev/null
echo
echo "Ready: open 'NCERT Exam Prep' from your desktop or app menu."

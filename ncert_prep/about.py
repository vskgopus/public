"""Name, version, author and licence of NCERT Exam Prep: the one source for the apps' footer and
the /api/status reply. web/build_data.py copies it into web/data.js. Bump VERSION for a release."""

NAME = "NCERT Exam Prep"
VERSION = "0.1.0"
AUTHOR = "Gopu Sugumar"
YEAR = "2026"
LICENSE = "GPL-3.0-or-later"
LICENSE_NAME = "GNU General Public License, version 3 or later"
LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.html"
REPO_URL = "https://github.com/vskgopus/ncert-prep"


def info() -> dict:
    return {"name": NAME, "version": VERSION, "author": AUTHOR, "year": YEAR, "license": LICENSE,
            "license_name": LICENSE_NAME, "license_url": LICENSE_URL,
            "line": f"{NAME} v{VERSION} · © {YEAR} {AUTHOR} · {LICENSE}"}

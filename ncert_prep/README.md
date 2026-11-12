# NCERT Exam Prep

A desktop app for CBSE students and teachers (Ubuntu/Linux and Windows). Choose a **class,
subject, book, chapters and (optionally) pages**. The app downloads the chapters from the
official NCERT site (ncert.nic.in), has Claude or Google Gemini write the exam preparation material, and saves a
**printable A4 PDF**. Tick what you want in it, for each chapter:

| Notes | Questions with answers |
|---|---|
| **Summary notes**: every topic explained as short points | **One-mark questions**: MCQ, fill in the blanks, true/false, very short answer, assertion-reason |
| **Explanation diagrams**: flowcharts of processes, cycles and concept maps, drawn by the app from Claude's outline | **2-mark and 3-mark questions**, including the NCERT exercise questions |
| **Key points** to remember: definitions, formulae, equations, laws | **5-mark questions** |
| **Quick revision table**: one row per topic (topic, in short, remember) | **Case-based questions**: a passage with sub-questions |
| **Differences tables**: "difference between X and Y" | **Practice test** at the end: questions picked from the ticked question sections, without answers, with the answer key on separate pages |

The first five (summary, key points, 1-, 2/3- and 5-mark questions) are ticked at first; the app
remembers your choice. Each extra section adds time and AI usage per chapter. The practice
test uses no extra AI usage: the app builds it from the questions already written.

The diagrams are simple box-and-arrow diagrams. They are not pictures of apparatus, maps or
anatomy; for those, use the figures in the NCERT book.

Sample output: [`samples/Class10_Science_Ch1_Chemical_Reactions_and_Equations.pdf`](samples/Class10_Science_Ch1_Chemical_Reactions_and_Equations.pdf)

![Launch page](docs/launch-page.png)

Settings panel (opened from the top-right corner):

![Settings](docs/settings.png)

## Three ways to run the AI (pick in Settings, top-right corner)

| | **Claude login** | **API key** (Claude) | **Google Gemini** |
|---|---|---|---|
| What you need | A Claude **Pro or Max** subscription (Free doesn't include Claude Code) | An API key from console.anthropic.com | A Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey); a **free** key works |
| Cost | Included in your plan; uses your plan's usage limits | Pay per use, about $0.30–0.60 per chapter | Free within Google's free-tier limits (per minute and per day; Google changes them) |
| How it works | Through Claude Code, Anthropic's command-line tool, signed in to your account | Direct calls to the Claude API | Direct calls to the Gemini API |
| Setup | Click **Log in with Claude** in Settings | Paste the key in Settings | Paste the key in Settings; the app lists the models your key can use and picks a Flash model |

Each person uses their own account or key; nothing is shared.

About Gemini:
- The prompts were written and checked with Claude. Gemini's notes and answers may differ in
  quality, so check a few PDFs before relying on them.
- Free keys have daily limits. If one is reached, finished parts are kept; click **Prepare** again
  later, or choose another model in Settings. Splitting chapters uses more requests per chapter.
- Google says it may use free-tier requests to improve its products.
- The key can also come from the `GEMINI_API_KEY` environment variable.

## Install on Ubuntu / Linux

One command downloads, installs and adds the desktop shortcut (no GitHub login needed):

```bash
curl -fsSL https://raw.githubusercontent.com/vskgopus/public/ncert-prep/ncert_prep/setup.sh | bash
```

Run the same command again any time to update. Your login, settings and PDFs are kept.
Or do it by hand:

```bash
git clone -b ncert-prep https://github.com/vskgopus/public.git ~/ncert-app
cd ~/ncert-app/ncert_prep && ASSUME_YES=1 bash install.sh
```

The installer:
- installs the Python packages into `ncert_prep/.venv`
- adds **NCERT Exam Prep** to the app menu and desktop
- offers to install Claude Code (needed only for Claude login)

Then open **NCERT Exam Prep** from the app menu, or run `./ncert-prep.sh`. Python 3.10+ is
needed (Ubuntu 22.04 and later have it). If the installer says the `venv` module is missing,
it offers to run `sudo apt install python3-venv` for you.

## Install on Windows 10/11

1. Download https://github.com/vskgopus/public/archive/refs/heads/ncert-prep.zip and unzip it.
2. In the `ncert_prep` folder, double-click **`install.bat`**. It checks for Python (offering
   to install it), installs the packages, creates Desktop and Start-menu shortcuts, and offers
   to install Claude Code.
3. Open **NCERT Exam Prep** from the desktop.

## First start

The Settings panel opens. Choose one:
- **Claude login**: click **Log in with Claude**. A browser tab opens; sign in and approve.
  The dot turns green.
- **API key**: paste your `sk-ant-…` key and click **Save**.

Then choose the book and chapters and click **Prepare exam material**. A chapter takes a
few minutes. Click **Open PDF to print** when it's done. PDFs are also kept in:
- Linux: `~/.local/share/ncert-prep/output`
- Windows: `%LOCALAPPDATA%\ncert-prep\output`

### Saving your Claude allowance

- **Settings → Split long chapters** sends a chapter in parts of 8, 12 or 16 pages.
- Every finished part is saved. If you hit your plan's usage limit, click **Prepare** again
  after it resets; the app reuses the saved parts and continues from where it stopped.
- Saved parts are also reused when you later ask for fewer sections. Asking for a section the
  saved parts don't have sends those chapters to Claude again.
- Leaving out sections you don't need also saves usage.

## Files

| File | Role |
|---|---|
| `launcher.py` | Starts the app on this computer only (127.0.0.1) and opens it in an app window |
| `app.py`, `templates/index.html` | The page, settings, background jobs |
| `ncert.py` | Reads NCERT's catalogue into `catalog.json`; downloads chapter PDFs; cuts page ranges |
| `generator.py` | The selectable sections (prompt and output schema for each), and the API-key engine |
| `claude_cli.py` | The Claude-login engine (Claude Code: status, login, one request per chapter) |
| `gemini.py` | The Google Gemini engine (lists the models a key can use, one request per chapter) |
| `settings.py` | Settings in `~/.config/ncert-prep/settings.json` (Windows: `%APPDATA%\ncert-prep`), readable only by you |
| `pdf_render.py`, `fonts/` | Printable PDF layout with the bundled DejaVu font (so H₂O, x², √, → print on any computer); draws the diagrams and tables and builds the practice test |
| `certs/` | Public Let's Encrypt intermediate certificates. ncert.nic.in doesn't send its own, so this lets downloads verify properly |
| `install.sh`, `ncert-prep.sh` | Linux installer and launcher |
| `install.bat`, `install.ps1`, `start.bat` | Windows installer and launcher |
| `pro/index.html` | A no-install page: NCERT links and a prompt to paste into claude.ai by hand |

Notes:
- Only English-medium books are offered for now. Hindi and Urdu need different PDF fonts and text shaping.
- Up to 6 chapters per PDF.
- To pick up new NCERT books, run `.venv/bin/python ncert.py` to refresh `catalog.json`.
- The model for the API key engine can be changed with the `NCERT_PREP_MODEL` environment variable.

## Test

```bash
.venv/bin/python tests/test_end_to_end.py
.venv/bin/python tests/test_gemini.py
```

This tests both engines without spending money. It uses real NCERT downloads, with Claude
replaced by a mock API and a stand-in `claude` command. It also covers chapter splitting,
resuming, and the selectable sections (all of them in one PDF, reuse of saved parts for a
smaller selection, and refusing an empty selection). `test_gemini.py` runs offline: it replaces
the Gemini API and the NCERT download with stand-ins and checks the Gemini engine (key check,
model choice, request format, rate limits and resume, error messages).

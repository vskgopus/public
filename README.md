# Public
For Public Data

---
Copyright (C) 2026 Gopu Sugumar. Licensed under the GNU General Public License v3.0 (see `LICENSE`).

## NCERT Exam Prep

[`ncert_prep/`](ncert_prep/README.md) is a desktop app (Ubuntu/Linux and Windows) that makes printable CBSE
exam-preparation PDFs from official NCERT textbooks. Tick what to include: summary notes, explanation
diagrams, the book's own figures with notes, key points, a formula summary, a quick revision table, differences tables, 1, 2/3 and
5-mark questions with answers, case-based questions, and a practice test paper (you choose the number of questions) with an answer key, which can also be made on its own. It uses Claude (Pro/Max login or API key) or
Google Gemini (your own Gemini API key; a free key works). Install on Ubuntu with:

```bash
curl -fsSL https://raw.githubusercontent.com/vskgopus/public/ncert-prep/ncert_prep/setup.sh | bash
```

It installs to `~/ncert-app` and adds "NCERT Exam Prep" to the app menu. Run the same command again to
update; your login, settings and PDFs are kept.

On Windows, download <https://github.com/vskgopus/public/archive/refs/heads/ncert-prep.zip>, unzip it, and in the
`ncert_prep` folder double-click `install.bat`.

A browser version with no install (works on phones; your own Claude API key or free Gemini key) is at
<https://vskgopus.github.io/public/ncert-prep/>. More detail: [`ncert_prep/README.md`](ncert_prep/README.md).

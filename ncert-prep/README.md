# NCERT Exam Prep (browser version)

Use it here: https://vskgopus.github.io/public/ncert-prep/

Printable CBSE exam-preparation material from NCERT textbook chapters, made in your browser
(phone, tablet or computer, no install): summary notes, explanation diagrams, key points, a quick
revision table, differences tables, 1/2/3/5-mark and case-based questions with answers, and a
practice test with an answer key.

1. Choose the class, subject, book and chapter.
2. Press **Download chapter N from NCERT** and save the official PDF, then **Next: use the
   downloaded file** and pick it. (Browsers don't let a web page fetch NCERT's PDF or read your
   Downloads folder by itself, so this one tap is needed.)
3. Tick what to include and press **Prepare exam material**. Then **Print / Save as PDF**.

The AI is your own: a Claude API key (pay per use, from console.anthropic.com) or a free Gemini key
(from aistudio.google.com/apikey). Keys stay in your browser; the chapter goes only to the AI you
choose. The page may only talk to `api.anthropic.com` and `generativelanguage.googleapis.com`.
A Claude Pro/Max login can't be used from a web page: for that, and for figures from the book, use
the desktop app (Ubuntu/Linux and Windows):

```bash
curl -fsSL https://raw.githubusercontent.com/vskgopus/public/ncert-prep/ncert_prep/setup.sh | bash
```

Chapters are © NCERT and downloaded by each user from ncert.nic.in; nothing is re-hosted here.
For personal study.

Copyright (C) 2026 Gopu Sugumar. GPL-3.0-or-later (see the repository's `LICENSE`). Third-party
code in `vendor/` keeps its own licence (`vendor/LICENSES.md`).

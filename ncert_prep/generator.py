"""Generate CBSE exam-preparation material from an NCERT chapter PDF using Claude."""
from __future__ import annotations

import base64
import json
import os

import anthropic

MODEL = os.environ.get("NCERT_PREP_MODEL", "claude-opus-5-5")

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["chapter_title", "summary", "key_points", "one_mark", "short_answer", "long_answer"],
    "properties": {
        "chapter_title": {"type": "string", "description": "Official chapter title as printed in the book"},
        "summary": {
            "type": "array",
            "description": "Topic-wise notes covering every topic/sub-topic in the selected pages, in book order",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["topic", "points"],
                "properties": {
                    "topic": {"type": "string"},
                    "points": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "key_points": {
            "type": "array",
            "description": "Must-remember facts, definitions, formulae, equations, dates, laws",
            "items": {"type": "string"},
        },
        "one_mark": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["kind", "question", "options", "answer"],
                "properties": {
                    "kind": {"type": "string", "enum": ["MCQ", "Fill in the blank", "True/False",
                                                         "Very short answer", "Assertion-Reason"]},
                    "question": {"type": "string"},
                    "options": {"type": "array", "items": {"type": "string"},
                                "description": "Four options for MCQ/Assertion-Reason, else empty"},
                    "answer": {"type": "string"},
                },
            },
        },
        "short_answer": {
            "type": "array",
            "description": "2-mark and 3-mark questions",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["marks", "question", "answer"],
                "properties": {
                    "marks": {"type": "integer", "enum": [2, 3]},
                    "question": {"type": "string"},
                    "answer": {"type": "string"},
                },
            },
        },
        "long_answer": {
            "type": "array",
            "description": "5-mark questions",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["question", "answer"],
                "properties": {"question": {"type": "string"}, "answer": {"type": "string"}},
            },
        },
    },
}

SYSTEM = """You are an experienced CBSE teacher and paper-setter who writes printed revision \
material for students. You work strictly from the NCERT textbook pages you are given: \
everything you write must be supported by those pages and match NCERT wording, terms, \
examples and conventions. Write in clear, simple English suitable for the class level.

Formatting rules (the output is printed, not rendered as Markdown):
- Plain text only. No Markdown, no LaTeX, no asterisks or hashes.
- Write formulae and equations with Unicode: H₂O, x², √2, π, ≤, ≥, →, ⇌, Δ, θ, ½, a/b.
- Inside an answer, put each step or point on its own line, starting the line with "- ".
- Never reference figures by number; describe them in words if needed."""

INSTRUCTIONS = """Prepare complete exam preparation material for CBSE Class {cls}, {subject}, \
book "{book}", Chapter {chapter}{pages_note}. The NCERT pages are attached. If they are only \
part of the chapter, cover just these pages.

Produce, in this order:
1. summary - topic-wise notes that explain every topic and sub-topic in the pages, in book \
order, as short clear points (definitions, explanations, examples, processes, reasons). A \
student who reads only these notes should understand the whole chapter.
2. key_points - the must-remember facts: definitions, laws, formulae, chemical equations, \
dates, names, differences, units.
3. one_mark - every 1-mark question that could reasonably be asked: MCQs (4 options, answer \
gives the correct option letter and text), fill in the blanks, true/false (with the \
correction when false), very short answers, and assertion-reason (use the standard CBSE \
four options). Aim for wide coverage: roughly 30-50 for a full chapter, fewer for a short \
page range.
4. short_answer - 2-mark and 3-mark questions with model answers at the right length \
(2 marks ≈ 2-3 points / 30-50 words, 3 marks ≈ 3-4 points / 50-80 words). Include all \
relevant NCERT in-text and end-of-chapter exercise questions plus other likely questions, \
including numericals with full working where the subject has them. Roughly 15-30.
5. long_answer - 5-mark questions with complete model answers (5+ points / 120-200 words, \
with derivations, worked steps, diagram descriptions or case-based reasoning as the \
subject needs). Include the long NCERT exercise questions. Roughly 6-12.

Only include questions answerable from these pages. Answers must be correct and complete \
enough to score full marks in a CBSE board-style evaluation."""


def _client(api_key: str | None = None) -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=api_key or None, max_retries=4, timeout=1800)


def _via_api(pdf_bytes: bytes, prompt: str, title: str, api_key: str) -> tuple[dict, str]:
    content = [
        {"type": "document",
         "source": {"type": "base64", "media_type": "application/pdf",
                    "data": base64.standard_b64encode(pdf_bytes).decode()},
         "title": title},
        {"type": "text", "text": prompt},
    ]
    try:
        with _client(api_key).beta.messages.stream(
            model=MODEL,
            max_tokens=64000,
            system=SYSTEM,
            thinking={"type": "adaptive"},
            output_config={"effort": "high",
                           "format": {"type": "json_schema", "schema": SCHEMA}},
            # If a safety classifier declines, let the API retry on a suitable model.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=[{"role": "user", "content": content}],
        ) as stream:
            message = stream.get_final_message()
    except anthropic.AuthenticationError:
        raise RuntimeError("The API key was rejected. Check it in Settings.")
    except anthropic.RateLimitError:
        raise RuntimeError("The API rate limit was reached. Wait a minute and try again.")
    except anthropic.APIConnectionError:
        raise RuntimeError("Could not reach the Claude API. Check your internet connection.")

    if message.stop_reason == "refusal":
        raise RuntimeError(f"Claude declined this request: {message.stop_details}")
    if message.stop_reason == "max_tokens":
        raise RuntimeError("The output was too long; split the chapter into smaller parts in Settings.")
    text = next(b.text for b in message.content if b.type == "text")
    usage = f"{message.usage.input_tokens} in / {message.usage.output_tokens} out tokens"
    return json.loads(text), usage


def generate_chapter(pdf_bytes: bytes, *, cls: str, subject: str, book: str, chapter: int,
                     page_note: str = "", engine: str = "api_key", api_key: str = "",
                     log=print) -> dict:
    """Return the study material (dict matching SCHEMA) for one chapter PDF.

    engine="claude_login": the signed-in Claude Pro/Max account via Claude Code.
    engine="api_key":      the Anthropic API with the given key (or ANTHROPIC_API_KEY).
    """
    prompt = INSTRUCTIONS.format(cls=cls, subject=subject, book=book, chapter=chapter,
                                 pages_note=page_note)
    if engine == "claude_login":
        import claude_cli
        data, usage = claude_cli.run_structured(pdf_bytes, prompt, SYSTEM, SCHEMA), "Claude login"
    else:
        data, usage = _via_api(pdf_bytes, prompt, f"{book} - Chapter {chapter}", api_key)
    for key in ("summary", "key_points", "one_mark", "short_answer", "long_answer"):
        data.setdefault(key, [])
    data.setdefault("chapter_title", f"Chapter {chapter}")
    log(f"Chapter {chapter}{page_note}: {len(data['one_mark'])} one-mark, "
        f"{len(data['short_answer'])} 2/3-mark, {len(data['long_answer'])} five-mark questions ({usage})")
    return data


def merge_parts(parts: list[dict]) -> dict:
    """Join the results of a chapter that was split into page ranges."""
    merged = {"chapter_title": parts[0]["chapter_title"]}
    for key in ("summary", "key_points", "one_mark", "short_answer", "long_answer"):
        seen, items = set(), []
        for part in parts:
            for item in part[key]:
                sig = json.dumps(item, sort_keys=True, ensure_ascii=False).lower()
                if sig not in seen:
                    seen.add(sig)
                    items.append(item)
        merged[key] = items
    return merged

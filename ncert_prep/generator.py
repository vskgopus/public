"""Generate CBSE exam-preparation material from an NCERT chapter PDF using Claude."""
from __future__ import annotations

import base64
import json
import os

import anthropic

MODEL = os.environ.get("NCERT_PREP_MODEL", "claude-opus-5-5")

# ------------------------------------------------------------------ sections
# Each section the person can tick: its output schema and its instruction to Claude.
# The order here is the order in the prompt and in the PDF.

_STR = {"type": "string"}
_STRS = {"type": "array", "items": _STR}

SECTIONS = {
    "summary": {
        "label": "Summary notes",
        "schema": {
            "type": "array",
            "description": "Topic-wise notes covering every topic/sub-topic in the selected pages, in book order",
            "items": {"type": "object", "additionalProperties": False, "required": ["topic", "points"],
                      "properties": {"topic": _STR, "points": _STRS}},
        },
        "prompt": "summary - topic-wise notes that explain every topic and sub-topic in the pages, in book "
                  "order, as short clear points (definitions, explanations, examples, processes, reasons). A "
                  "student who reads only these notes should understand the whole chapter.",
    },
    "diagrams": {
        "label": "Explanation diagrams",
        "schema": {
            "type": "array",
            "description": "Diagrams the app draws: process flows, cycles and concept maps",
            "items": {
                "type": "object", "additionalProperties": False,
                "required": ["title", "kind", "caption", "nodes"],
                "properties": {
                    "title": _STR,
                    "kind": {"type": "string", "enum": ["flow", "cycle", "concept_map"]},
                    "caption": _STR,
                    "nodes": {"type": "array", "items": {
                        "type": "object", "additionalProperties": False, "required": ["label", "details"],
                        "properties": {"label": _STR, "details": _STRS}}},
                },
            },
        },
        "prompt": "diagrams - 2 to 6 diagrams that make the chapter easier to understand, which the app "
                  "draws as labelled boxes and arrows. kind \"flow\": the steps of a process or a sequence "
                  "of events in order (3-8 nodes). kind \"cycle\": a repeating cycle, nodes in order, the "
                  "last leading back to the first (3-8 nodes). kind \"concept_map\": the title is the central "
                  "idea and each node is a branch (2-5 nodes, e.g. types or classes) whose details are its "
                  "sub-points or examples. Labels at most 6 words; details short (up to 4 per node). caption: "
                  "one sentence saying what the diagram shows. Only make diagrams the pages support; do not "
                  "attempt pictures such as apparatus, maps or anatomy.",
    },
    "key_points": {
        "label": "Key points to remember",
        "schema": {"type": "array", "items": _STR,
                   "description": "Must-remember facts, definitions, formulae, equations, dates, laws"},
        "prompt": "key_points - the must-remember facts: definitions, laws, formulae, chemical equations, "
                  "dates, names, differences, units.",
    },
    "revision_table": {
        "label": "Revision table",
        "schema": {
            "type": "array",
            "description": "One row per topic for last-minute revision",
            "items": {"type": "object", "additionalProperties": False,
                      "required": ["topic", "in_short", "remember"],
                      "properties": {"topic": _STR, "in_short": _STR, "remember": _STR}},
        },
        "prompt": "revision_table - a quick revision table with one row per topic in book order: topic, "
                  "in_short (the idea in one or two sentences), remember (the fact, formula, example or "
                  "keyword most likely to be asked). Keep each cell brief.",
    },
    "differences": {
        "label": "Differences tables",
        "schema": {
            "type": "array",
            "description": "'Difference between X and Y' tables",
            "items": {
                "type": "object", "additionalProperties": False, "required": ["a", "b", "rows"],
                "properties": {
                    "a": _STR, "b": _STR,
                    "rows": {"type": "array", "items": {
                        "type": "object", "additionalProperties": False, "required": ["basis", "a", "b"],
                        "properties": {"basis": _STR, "a": _STR, "b": _STR}}},
                },
            },
        },
        "prompt": "differences - \"difference between\" tables for the pairs of terms, processes or things "
                  "in the pages that students are asked to distinguish (as many as the pages support, "
                  "usually 2-6). a and b name the two things; each row gives the basis of comparison and "
                  "how a and b differ on it (3-6 rows).",
    },
    "one_mark": {
        "label": "One-mark questions",
        "schema": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False,
                "required": ["kind", "question", "options", "answer"],
                "properties": {
                    "kind": {"type": "string", "enum": ["MCQ", "Fill in the blank", "True/False",
                                                         "Very short answer", "Assertion-Reason"]},
                    "question": _STR,
                    "options": {"type": "array", "items": _STR,
                                "description": "Four options for MCQ/Assertion-Reason, else empty"},
                    "answer": _STR,
                },
            },
        },
        "prompt": "one_mark - every 1-mark question that could reasonably be asked: MCQs (4 options, answer "
                  "gives the correct option letter and text), fill in the blanks, true/false (with the "
                  "correction when false), very short answers, and assertion-reason (use the standard CBSE "
                  "four options). Aim for wide coverage: roughly 30-50 for a full chapter, fewer for a short "
                  "page range.",
    },
    "short_answer": {
        "label": "2- and 3-mark questions",
        "schema": {
            "type": "array",
            "description": "2-mark and 3-mark questions",
            "items": {"type": "object", "additionalProperties": False, "required": ["marks", "question", "answer"],
                      "properties": {"marks": {"type": "integer", "enum": [2, 3]}, "question": _STR,
                                     "answer": _STR}},
        },
        "prompt": "short_answer - 2-mark and 3-mark questions with model answers at the right length "
                  "(2 marks ≈ 2-3 points / 30-50 words, 3 marks ≈ 3-4 points / 50-80 words). Include all "
                  "relevant NCERT in-text and end-of-chapter exercise questions plus other likely questions, "
                  "including numericals with full working where the subject has them. Roughly 15-30.",
    },
    "long_answer": {
        "label": "5-mark questions",
        "schema": {
            "type": "array",
            "description": "5-mark questions",
            "items": {"type": "object", "additionalProperties": False, "required": ["question", "answer"],
                      "properties": {"question": _STR, "answer": _STR}},
        },
        "prompt": "long_answer - 5-mark questions with complete model answers (5+ points / 120-200 words, "
                  "with derivations, worked steps, diagram descriptions or case-based reasoning as the "
                  "subject needs). Include the long NCERT exercise questions. Roughly 6-12.",
    },
    "case_based": {
        "label": "Case-based questions",
        "schema": {
            "type": "array",
            "description": "Case/source-based questions: a passage followed by sub-questions",
            "items": {
                "type": "object", "additionalProperties": False, "required": ["passage", "questions"],
                "properties": {
                    "passage": _STR,
                    "questions": {"type": "array", "items": {
                        "type": "object", "additionalProperties": False,
                        "required": ["marks", "question", "options", "answer"],
                        "properties": {"marks": {"type": "integer", "enum": [1, 2, 3, 4]}, "question": _STR,
                                       "options": {"type": "array", "items": _STR,
                                                   "description": "Four options for an MCQ, else empty"},
                                       "answer": _STR}}},
                },
            },
        },
        "prompt": "case_based - case-based (source-based) questions in the style of recent CBSE papers for "
                  "this subject: a short passage, situation, data or experiment description based on the "
                  "pages (80-150 words), followed by 3-4 sub-questions with marks and full answers, "
                  "usually totalling 4 marks. Roughly 3-5 cases for a full chapter.",
    },
}

COUNT_WORDS = {"summary": "topics", "diagrams": "diagrams", "key_points": "key points",
               "revision_table": "revision-table rows", "differences": "difference tables",
               "one_mark": "one-mark", "short_answer": "2/3-mark", "long_answer": "five-mark questions",
               "case_based": "case-based sets"}

# Built from the generated questions by the app, not by Claude (no extra Claude use).
PRACTICE_TEST = "practice_test"
QUESTION_SECTIONS = ("one_mark", "short_answer", "long_answer", "case_based")
DEFAULT_SECTIONS = ["summary", "key_points", "one_mark", "short_answer", "long_answer"]
ALL_OPTIONS = list(SECTIONS) + [PRACTICE_TEST]


def claude_sections(selected) -> list[str]:
    """The sections Claude has to write, in the standard order."""
    chosen = set(selected)
    return [k for k in SECTIONS if k in chosen]


def build_schema(sections: list[str]) -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["chapter_title", *sections],
        "properties": {"chapter_title": {"type": "string",
                                         "description": "Official chapter title as printed in the book"}}
                      | {k: SECTIONS[k]["schema"] for k in sections},
    }


SCHEMA = build_schema(list(SECTIONS))  # everything; kept for reference

SYSTEM = """You are an experienced CBSE teacher and paper-setter who writes printed revision \
material for students. You work strictly from the NCERT textbook pages you are given: \
everything you write must be supported by those pages and match NCERT wording, terms, \
examples and conventions. Write in clear, simple English suitable for the class level.

Formatting rules (the output is printed, not rendered as Markdown):
- Plain text only. No Markdown, no LaTeX, no asterisks or hashes.
- Write formulae and equations with Unicode: H₂O, x², √2, π, ≤, ≥, →, ⇌, Δ, θ, ½, a/b.
- Inside an answer, put each step or point on its own line, starting the line with "- ".
- Never reference figures by number; describe them in words if needed."""

INTRO = """Prepare exam preparation material for CBSE Class {cls}, {subject}, \
book "{book}", Chapter {chapter}{pages_note}. The NCERT pages are attached. If they are only \
part of the chapter, cover just these pages.

Produce, in this order:
"""

OUTRO = """

Only include questions answerable from these pages. Answers must be correct and complete \
enough to score full marks in a CBSE board-style evaluation."""


def build_prompt(sections: list[str], **fmt) -> str:
    items = "\n".join(f"{i}. {SECTIONS[k]['prompt']}" for i, k in enumerate(sections, 1))
    outro = OUTRO if any(k in QUESTION_SECTIONS for k in sections) else ""
    return INTRO.format(**fmt) + items + outro


def _client(api_key: str | None = None) -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=api_key or None, max_retries=4, timeout=1800)


def _via_api(pdf_bytes: bytes, prompt: str, title: str, api_key: str, schema: dict) -> tuple[dict, str]:
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
                           "format": {"type": "json_schema", "schema": schema}},
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
                     sections=None, log=print) -> dict:
    """Return the study material (dict matching build_schema(sections)) for one chapter PDF.

    engine="claude_login": the signed-in Claude Pro/Max account via Claude Code.
    engine="api_key":      the Anthropic API with the given key (or ANTHROPIC_API_KEY).
    sections: keys of SECTIONS to write (default DEFAULT_SECTIONS).
    """
    sections = claude_sections(DEFAULT_SECTIONS if sections is None else sections)
    if not sections:
        raise RuntimeError("Choose at least one section to prepare.")
    schema = build_schema(sections)
    prompt = build_prompt(sections, cls=cls, subject=subject, book=book, chapter=chapter,
                          pages_note=page_note)
    if engine == "claude_login":
        import claude_cli
        data, usage = claude_cli.run_structured(pdf_bytes, prompt, SYSTEM, schema), "Claude login"
    else:
        data, usage = _via_api(pdf_bytes, prompt, f"{book} - Chapter {chapter}", api_key, schema)
    for key in sections:
        data.setdefault(key, [])
    data.setdefault("chapter_title", f"Chapter {chapter}")
    counts = ", ".join(f"{len(data[k])} {COUNT_WORDS[k]}" for k in sections)
    log(f"Chapter {chapter}{page_note}: {counts} ({usage})")
    return data


def merge_parts(parts: list[dict]) -> dict:
    """Join the results of a chapter that was split into page ranges."""
    merged = {"chapter_title": parts[0]["chapter_title"]}
    for key in SECTIONS:
        if not any(key in part for part in parts):
            continue
        seen, items = set(), []
        for part in parts:
            for item in part.get(key, []):
                sig = json.dumps(item, sort_keys=True, ensure_ascii=False).lower()
                if sig not in seen:
                    seen.add(sig)
                    items.append(item)
        merged[key] = items
    return merged

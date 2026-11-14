"""
Language Hint Resolution for Sunai.
Disambiguates Devanagari ASR transcripts when Prisma (indic-auto) returns "hi-IN"
for Marathi utterances, and applies user-selected language hints.
"""

import logging
import re
from typing import Optional
from Backend import config

logger = logging.getLogger(__name__)

# Precompile regex for word tokenization discarding punctuation (including । and ?) and whitespace
TOKEN_PATTERN = re.compile(r"[\u0900-\u0963\u0970-\u097F\u0966-\u096Fa-zA-Z]+")


def is_mostly_devanagari(text: str) -> bool:
    """Returns True if text contains Devanagari and is not dominated by Latin script."""
    if not text or not text.strip():
        return False
    devanagari_count = sum(1 for ch in text if "\u0900" <= ch <= "\u097F")
    latin_count = sum(1 for ch in text if ("a" <= ch <= "z" or "A" <= ch <= "Z"))

    if devanagari_count == 0:
        return False

    total_letters = devanagari_count + latin_count
    return (devanagari_count / total_letters) > 0.5


def tokenize_words(text: str) -> list[str]:
    """Tokenizes text into whole words, discarding whitespace and punctuation (like । and ?)."""
    return TOKEN_PATTERN.findall(text)


def resolve_language(
    text: str,
    prisma_lang: Optional[str],
    previous_lang: Optional[str] = None,
) -> str:
    """
    Resolves the effective language for a transcript under 'auto' mode.

    Rules:
    1. Never change "en-IN" or "mr-IN" tags.
    2. Never change empty text or Latin-script text (e.g. English, Hinglish).
    3. Act only when prisma_lang is "hi-IN" and the text is mostly Devanagari:
       - If text has >=1 Marathi-only marker word and no Hindi-only marker word: return "mr-IN".
       - If text has no markers of either kind and previous_lang is "mr-IN": return "mr-IN".
       - Otherwise: return "hi-IN".
    4. Log one line when changed: "[LangHint] hi-IN -> mr-IN (marker: <word>)". Log nothing when unchanged.
    """
    if not prisma_lang:
        return previous_lang or "hi-IN"

    # Rule 3: Never change "en-IN" or "mr-IN" tags
    if prisma_lang in ("en-IN", "mr-IN"):
        return prisma_lang

    # Rule 2 & 3: Act ONLY when prisma_lang is "hi-IN" and text is mostly Devanagari
    if prisma_lang != "hi-IN":
        return prisma_lang

    if not text or not is_mostly_devanagari(text):
        return prisma_lang

    tokens = tokenize_words(text)
    if not tokens:
        return prisma_lang

    marathi_markers = getattr(config, "MARATHI_MARKER_WORDS", ())
    hindi_markers = getattr(config, "HINDI_MARKER_WORDS", ())

    marathi_found = [tok for tok in tokens if tok in marathi_markers]
    hindi_found = [tok for tok in tokens if tok in hindi_markers]

    has_marathi = len(marathi_found) > 0
    has_hindi = len(hindi_found) > 0

    if has_marathi and not has_hindi:
        marker = marathi_found[0]
        logger.info(f"[LangHint] hi-IN -> mr-IN (marker: {marker})")
        return "mr-IN"

    if not has_marathi and not has_hindi and previous_lang == "mr-IN":
        logger.info("[LangHint] hi-IN -> mr-IN (marker: previous_lang)")
        return "mr-IN"

    return "hi-IN"


def apply_language_hint(
    text: str,
    prisma_lang: Optional[str],
    hint: Optional[str] = "auto",
    previous_lang: Optional[str] = None,
) -> str:
    """
    Applies user-selected language hint ('auto', 'hi-IN', 'mr-IN') to determine turn language.

    Rules:
    - If the hint is "auto" (or invalid / None): use existing resolve_language logic.
    - If the Prisma tag is "en-IN", or the text is Latin script (English, Hinglish): do not change anything.
    - If the hint is "hi-IN" or "mr-IN" AND the Prisma tag is "hi-IN" or "mr-IN" AND the text is not Latin script: use the hint.
    - Log one line only when the hint changes the language: "[LangHint] <prisma_lang> -> <hint> (user setting)".
    """
    if not hint or hint not in ("hi-IN", "mr-IN"):
        return resolve_language(text, prisma_lang, previous_lang)

    raw_lang = prisma_lang or previous_lang or "hi-IN"

    # If the Prisma tag is "en-IN" or not in ("hi-IN", "mr-IN"): do not change anything
    if raw_lang not in ("hi-IN", "mr-IN"):
        return raw_lang

    # If the text is Latin script (English, Hinglish) or empty: do not change anything
    if not text or not is_mostly_devanagari(text):
        return raw_lang

    # If the hint is "hi-IN" or "mr-IN" AND Prisma tag is "hi-IN" or "mr-IN" AND text is not Latin script: use the hint
    if raw_lang != hint:
        logger.info(f"[LangHint] {raw_lang} -> {hint} (user setting)")

    return hint

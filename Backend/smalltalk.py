"""
Small Talk Detector and Handler for Sunai Voice Assistant.
Intercepts common conversational intents (greetings, how-are-you, thanks, goodbye, who-are-you)
before RAG retrieval and responds with pre-cached natural Timbre speech.
Strict false-positive prevention ensures knowledge questions always route to RAG.
"""

from dataclasses import dataclass
import logging
import re
import string
from typing import Dict, List, Optional, Set, Tuple

from Backend import config
from Backend.smalltalk_phrases import (
    FILLERS_AND_ADDRESSES,
    DOMAIN_AND_QUESTION_WORDS,
    GREETING_PHRASES,
    HOW_ARE_YOU_PHRASES,
    THANKS_PHRASES,
    GOODBYE_PHRASES,
    WHO_ARE_YOU_PHRASES,
    SMALLTALK_REPLIES,
)

logger = logging.getLogger(__name__)

# Punctuation set including ASCII, quotes, and Indic danda
ALL_PUNCTUATION = string.punctuation + "।॥’‘“”–—…"
PUNCT_REGEX = re.compile(f"[{re.escape(ALL_PUNCTUATION)}]")


@dataclass
class SmallTalkMatch:
    intent: str               # 'greeting', 'how_are_you', 'greeting_how_are_you', etc.
    matched_phrase: str       # Trigger phrase that matched
    reply_text: str           # The natural language reply
    cache_key: str            # Unique phrase key for audio cache lookup
    variant_idx: int          # Rotating variant index (0 or 1)
    target_lang: str          # 'en-IN', 'hi-IN', 'mr-IN', 'hinglish'


# Global rotating index tracker per (intent, lang)
_variant_rotation: Dict[Tuple[str, str], int] = {}


def normalize_for_smalltalk(text: str) -> str:
    """Normalizes text by lowercasing Roman chars, stripping punctuation and danda, collapsing spaces."""
    if not text:
        return ""
    cleaned = text.lower()
    cleaned = PUNCT_REGEX.sub(" ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def is_devanagari(text: str) -> bool:
    """Returns True if the text contains Devanagari Unicode characters."""
    return any("\u0900" <= c <= "\u097f" for c in text)


def detect_target_lang(normalized_text: str, detected_lang: str) -> str:
    """Resolves target language category: 'en-IN', 'hi-IN', 'mr-IN', or 'hinglish'."""
    low_lang = (detected_lang or "hi-IN").lower()
    if low_lang.startswith("en"):
        return "en-IN"

    has_devanagari = is_devanagari(normalized_text)
    if not has_devanagari:
        # Roman script for Indic utterance -> Hinglish
        return "hinglish"

    if low_lang.startswith("mr"):
        return "mr-IN"

    return "hi-IN"


def _phrase_in_utterance(phrase: str, words: List[str]) -> Tuple[bool, List[str]]:
    """
    Checks if a multi-word phrase exists as a sub-sequence in words.
    Returns (matched, remaining_words).
    """
    p_words = phrase.split()
    p_len = len(p_words)
    w_len = len(words)

    if p_len > w_len:
        return False, words

    for i in range(w_len - p_len + 1):
        if words[i : i + p_len] == p_words:
            remaining = words[:i] + words[i + p_len :]
            return True, remaining

    return False, words


def _words_only_fillers(remaining_words: List[str]) -> bool:
    """Returns True if all remaining words are benign fillers, addresses, or pronouns."""
    # Extended permissive pronouns and fillers
    extra_benign = {
        "i", "am", "is", "are", "you", "me", "my", "to", "too", "also",
        "tu", "tum", "aap", "main", "hum", "toh", "bhi", "ho", "hai", "hain",
        "आहे", "आहात", "तुम्ही", "तू", "मी", "पण", "आहेस", "का", "हो",
    }
    allowed = FILLERS_AND_ADDRESSES | extra_benign
    return all(w in allowed for w in remaining_words)


def detect_smalltalk(text: str, lang: str = "hi-IN") -> Optional[SmallTalkMatch]:
    """
    Detects if an utterance is pure small talk.
    Returns SmallTalkMatch if matched, or None if it should be processed by RAG.
    """
    norm = normalize_for_smalltalk(text)
    if not norm:
        return None

    words = norm.split()
    word_count = len(words)

    # Rule 1: Length check — small talk utterances must be short (<= 6 words)
    if word_count > config.SMALLTALK_MAX_WORDS:
        return None

    # Rule 2: Explicit domain / technical / question word check
    # If the user asks about documents, pricing, features, etc., it MUST go to RAG!
    for w in words:
        if w in DOMAIN_AND_QUESTION_WORDS:
            return None

    target_lang = detect_target_lang(norm, lang)

    # Collect phrase dictionaries for matching
    # Map each intent to its phrase list across languages
    intent_phrase_groups = [
        ("who_are_you", WHO_ARE_YOU_PHRASES),
        ("how_are_you", HOW_ARE_YOU_PHRASES),
        ("thanks", THANKS_PHRASES),
        ("goodbye", GOODBYE_PHRASES),
        ("greeting", GREETING_PHRASES),
    ]

    # Helper to check an intent against utterance
    def find_intent_match(intent_key: str, phrase_dict: dict, current_words: List[str]) -> Tuple[Optional[str], List[str]]:
        # Sort phrases longest first to match greedy phrases ("how are you doing" before "how are you")
        all_phrases = []
        for p_list in phrase_dict.values():
            all_phrases.extend(p_list)
        all_phrases = sorted(set(all_phrases), key=lambda x: len(x.split()), reverse=True)

        for phrase in all_phrases:
            matched, rem = _phrase_in_utterance(phrase, current_words)
            if matched:
                return phrase, rem
        return None, current_words

    # 1. Check for combined intent: greeting + how_are_you (e.g. "hi how are you", "namaste kaise ho")
    greet_phrase, after_greet = find_intent_match("greeting", GREETING_PHRASES, words)
    if greet_phrase:
        how_phrase, after_both = find_intent_match("how_are_you", HOW_ARE_YOU_PHRASES, after_greet)
        if how_phrase and _words_only_fillers(after_both):
            combined_phrase = f"{greet_phrase} {how_phrase}"
            return _build_match("greeting_how_are_you", combined_phrase, target_lang)

    # 2. Check individual intents in priority order
    for intent_name, p_dict in intent_phrase_groups:
        matched_p, rem_words = find_intent_match(intent_name, p_dict, words)
        if matched_p and _words_only_fillers(rem_words):
            return _build_match(intent_name, matched_p, target_lang)

    return None


def _build_match(intent: str, matched_phrase: str, target_lang: str) -> SmallTalkMatch:
    """Builds a SmallTalkMatch object with rotating reply variants."""
    rot_key = (intent, target_lang)
    current_rot = _variant_rotation.get(rot_key, 0)

    # Check available variants (default to 2 variants: 0 and 1)
    v0_text = SMALLTALK_REPLIES.get((intent, target_lang, 0))
    v1_text = SMALLTALK_REPLIES.get((intent, target_lang, 1))

    # Fallback to en-IN or hi-IN if specific target_lang missing
    if not v0_text:
        v0_text = SMALLTALK_REPLIES.get((intent, "hi-IN", 0)) or SMALLTALK_REPLIES.get((intent, "en-IN", 0), "Hello!")
        v1_text = SMALLTALK_REPLIES.get((intent, "hi-IN", 1)) or v0_text

    chosen_variant = current_rot % 2
    chosen_text = v0_text if chosen_variant == 0 else (v1_text or v0_text)

    # Rotate for next invocation
    _variant_rotation[rot_key] = (current_rot + 1) % 2

    # Audio cache lookup key: smalltalk_<intent>_<variant>
    cache_key = f"smalltalk_{intent}_{chosen_variant}"

    return SmallTalkMatch(
        intent=intent,
        matched_phrase=matched_phrase,
        reply_text=chosen_text,
        cache_key=cache_key,
        variant_idx=chosen_variant,
        target_lang=target_lang,
    )


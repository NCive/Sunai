"""
Interruption Classifier for Sunai Voice Assistant.
Classifies user speech heard during PAUSED state into 5 distinct categories:
- noise: acoustic energy low, non-speech click/tap, or no real words.
- small_sound: backchannels ("haan", "hmm", "ok", "accha", "ji", "theek hai", etc.).
- go_on: continuation commands ("go on", "continue", "aage bolo", "pudhe sanga", etc.).
- interruption: real interruption (question starter, stop word, or >= 3 words).
- unclear: human voice detected but text is empty or weak.
"""

import logging
import re
import string
from typing import Optional, Tuple
from Backend import config

logger = logging.getLogger(__name__)

# Punctuation set including English and Indic punctuation (purna viram U+0964, double purna viram U+0965)
INDIC_PUNCTUATION = "।॥"
ALL_PUNCTUATION = string.punctuation + INDIC_PUNCTUATION + "’‘“”–—…"
PUNCT_REGEX = re.compile(f"[{re.escape(ALL_PUNCTUATION)}]")


def normalize_text(text: str) -> str:
    """
    Normalizes input text:
    - Strips leading and trailing whitespace.
    - Converts Roman characters to lowercase.
    - Removes punctuation (ASCII & Indic).
    - Collapses multiple whitespace into single space.
    """
    if not text:
        return ""
    # Lowercase Roman characters
    cleaned = text.lower()
    # Remove punctuation
    cleaned = PUNCT_REGEX.sub(" ", cleaned)
    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def classify_utterance(
    text: str,
    has_voice: bool = True,
    rms_energy: float = 0.05,
    duration_sec: float = 0.5,
) -> Tuple[str, str]:
    """
    Classifies utterance heard during PAUSED check window into one of:
    - 'noise'
    - 'small_sound'
    - 'go_on'
    - 'interruption'
    - 'unclear'

    :param text: Raw text from STT (Prisma or mock)
    :param has_voice: True if browser VAD triggered voice onset
    :param rms_energy: RMS audio energy of the captured audio chunk
    :param duration_sec: Duration of captured audio in seconds
    :return: (decision, reason)
    """
    norm = normalize_text(text)
    words = norm.split() if norm else []
    word_count = len(words)

    # 1. NOISE CHECK
    # If no voice detected, or energy below noise threshold, or empty text with very short duration
    if not has_voice or (rms_energy > 0 and rms_energy < config.NOISE_RMS_ENERGY_THRESHOLD):
        return "noise", "energy_below_threshold"

    if word_count == 0:
        if duration_sec > 0 and duration_sec < config.NOISE_MAX_DURATION_SEC:
            return "noise", "sub_minimum_duration_empty_text"
        if not has_voice:
            return "noise", "no_voice_detected"
        # Voice was detected above energy threshold, but STT produced no words -> UNCLEAR
        return "unclear", "voice_detected_without_text"

    # Check for exact matches first
    # 2. GO-ON COMMANDS
    if norm in config.GO_ON_WORDS:
        return "go_on", f"matched_go_on_phrase: '{norm}'"

    for go_on_phrase in config.GO_ON_WORDS:
        if norm.startswith(go_on_phrase) or go_on_phrase in norm:
            # If it's a short command (less than interruption word threshold)
            if word_count <= config.INTERRUPTION_WORD_COUNT_THRESHOLD:
                return "go_on", f"contains_go_on_phrase: '{go_on_phrase}'"

    # 3. SMALL SOUNDS / BACKCHANNELS
    if norm in config.SMALL_SOUND_WORDS:
        return "small_sound", f"matched_backchannel: '{norm}'"

    # Multi-token backchannel check (e.g. "haan ji", "theek hai")
    if word_count <= 2 and all(w in config.SMALL_SOUND_WORDS for w in words):
        return "small_sound", f"all_tokens_backchannel: '{norm}'"

    # 4. REAL INTERRUPTION
    # A. Check Stop Words (ruko, stop, wait, thamba, etc.)
    for w in words:
        if w in config.STOP_WORDS:
            return "interruption", f"matched_stop_word: '{w}'"

    # B. Check Question Starters (kya, what, why, kay, etc.)
    if words and words[0] in config.QUESTION_STARTERS:
        return "interruption", f"starts_with_question_word: '{words[0]}'"
    if len(words) >= 2 and words[1] in config.QUESTION_STARTERS:
        return "interruption", f"question_word_in_prefix: '{words[1]}'"

    # C. Word count threshold (3 or more words constitute a question / instruction)
    if word_count >= config.INTERRUPTION_WORD_COUNT_THRESHOLD:
        return "interruption", f"word_count_exceeded: {word_count} words"

    # 5. WEAK / UNCLEAR TEXT
    # If 1-2 words that are neither backchannels nor stop words nor go-on (e.g. single garbled syllable)
    # E.g. "ah", "brr", or unrecognized whisper
    if word_count == 1 and len(norm) <= 2 and norm not in config.SMALL_SOUND_WORDS:
        return "unclear", f"weak_unrecognized_syllable: '{norm}'"

    # Default fallback: If user spoke 1-2 real unrecognized words that aren't backchannels,
    # treat as interruption to be safe and avoid talking over them.
    return "interruption", f"unrecognized_spoken_words: '{norm}'"


class InterruptionHandler:
    """
    Stateful handler for interruptions and retry escalation on unclear input.
    """

    def __init__(self):
        self.unclear_failures_count: int = 0

    def reset_failures(self) -> None:
        """Resets the unclear retry counter."""
        self.unclear_failures_count = 0

    def evaluate(
        self,
        text: str,
        has_voice: bool = True,
        rms_energy: float = 0.05,
        duration_sec: float = 0.5,
    ) -> Tuple[str, str]:
        """
        Classifies utterance and manages failure counter.
        """
        decision, reason = classify_utterance(
            text=text,
            has_voice=has_voice,
            rms_energy=rms_energy,
            duration_sec=duration_sec,
        )

        if decision == "unclear":
            self.unclear_failures_count += 1
            logger.info(
                f"[InterruptionHandler] Unclear utterance detected (failure #{self.unclear_failures_count})."
            )
        else:
            # Non-unclear classification resets retry counter
            self.unclear_failures_count = 0

        return decision, reason

    def get_unclear_response(self, language: str = "hi-IN") -> dict:
        """
        Determines the appropriate prompt for unclear speech based on retry count.
        - Failures 1 & 2: play 'ji' or 'kya_kaha'
        - Failure 3+: play 'repeat_slowly' and reset counter
        """
        lang = language if language in ("hi-IN", "mr-IN", "en-IN") else "hi-IN"

        if self.unclear_failures_count <= config.UNCLEAR_MAX_RETRIES:
            phrase_key = "ji" if self.unclear_failures_count == 1 else "kya_kaha"
            text = config.CACHE_PHRASES.get(phrase_key, {}).get(lang, "जी?")
            return {
                "phrase_key": phrase_key,
                "text": text,
                "escalated": False,
            }
        else:
            # Exceeded retries: play ask-to-repeat-slowly line and reset
            phrase_key = "repeat_slowly"
            text = config.CACHE_PHRASES.get("repeat_slowly", {}).get(
                lang, config.UNCLEAR_REPEAT_SLOWLY.get(lang, "कृपया धीरे-धीरे और साफ़ बोलें।")
            )
            self.reset_failures()
            return {
                "phrase_key": phrase_key,
                "text": text,
                "escalated": True,
            }


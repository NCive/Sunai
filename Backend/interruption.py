"""
Deterministic Keyword-Based Interruption Classifier for Sunai Voice Assistant.
Implements deterministic rules (Rules A through F) with zero LLM or embedding calls.
Classifies user speech heard during the PAUSED check window into:
- noise (resume)
- interruption (hard stop / new question)
- go_on (resume / play saved rest)
- small_sound (backchannel -> resume)
- unclear ("ji?" prompt)
"""

import logging
import re
import string
from difflib import SequenceMatcher
from typing import Optional, Tuple, List, Set, Dict

from Backend import config
from Backend.interruption_words import (
    NON_LEXICAL_SOUNDS,
    BACKCHANNEL_WORDS,
    GO_ON_PHRASES,
    STOP_WORDS,
    QUESTION_WORDS,
    EXPLICIT_VARIANTS,
)

logger = logging.getLogger(__name__)

# Punctuation set including English and Indic punctuation (danda U+0964, double danda U+0965)
INDIC_PUNCTUATION = "।॥"
ALL_PUNCTUATION = string.punctuation + INDIC_PUNCTUATION + "’‘“”–—…"
PUNCT_REGEX = re.compile(f"[{re.escape(ALL_PUNCTUATION)}]")


def normalize_interruption_text(text: str) -> str:
    """
    Normalizes text for deterministic classification:
    - Lowercase Roman characters.
    - Strips punctuation and Devanagari dandas.
    - Collapses repeated characters (e.g. 'hmmmm' -> 'hmm', 'waitt' -> 'wait').
    - Maps known typos/variants from EXPLICIT_VARIANTS.
    """
    if not text:
        return ""

    cleaned = text.lower()
    # Strip punctuation and dandas
    cleaned = PUNCT_REGEX.sub(" ", cleaned)

    # Collapse repeated letters (3 or more of same char -> 2 or 1)
    # Special cases: 'hmm+' -> 'hmm'
    cleaned = re.sub(r"h+m{2,}", "hmm", cleaned)
    cleaned = re.sub(r"([a-z])\1{2,}", r"\1\1", cleaned)

    # Collapse whitespace
    tokens = [t.strip() for t in cleaned.split() if t.strip()]

    # Map explicit variants
    mapped_tokens: List[str] = []
    for t in tokens:
        if t in EXPLICIT_VARIANTS:
            mapped_tokens.extend(EXPLICIT_VARIANTS[t].split())
        else:
            mapped_tokens.append(t)

    return " ".join(mapped_tokens)


normalize_text = normalize_interruption_text


def token_fuzzy_matches(token: str, target: str, min_ratio: float = 0.85) -> bool:
    """
    Checks if a token fuzzy matches target keyword:
    - ONLY applies to tokens with 4 or more letters.
    - Short tokens (3 letters or fewer) MUST match exactly.
    """
    if len(token) < 4 or len(target) < 4:
        return token == target
    ratio = SequenceMatcher(None, token, target).ratio()
    return ratio >= min_ratio


def match_keyword_set(tokens: List[str], keyword_set: Set[str], min_ratio: float = 0.85) -> Optional[str]:
    """Checks if any token or multi-word phrase in tokens matches keyword_set."""
    joined = " ".join(tokens)

    # 1. Multi-word phrase check first
    for kw in keyword_set:
        if " " in kw and kw in joined:
            return kw

    # 2. Token-level check (exact then fuzzy for len >= 4)
    for token in tokens:
        if token in keyword_set:
            return token
        for kw in keyword_set:
            if " " not in kw and token_fuzzy_matches(token, kw, min_ratio=min_ratio):
                return kw

    return None


def match_phrase_list(norm_text: str, tokens: List[str], phrase_list: List[str]) -> Optional[str]:
    """Checks if normalized text matches any phrase in phrase_list."""
    # Check exact phrase or prefix/substring match
    for phrase in phrase_list:
        if phrase == norm_text or phrase in norm_text:
            return phrase

    # Check token-level match if phrase is single word
    for token in tokens:
        for phrase in phrase_list:
            if " " not in phrase and token_fuzzy_matches(token, phrase, min_ratio=0.85):
                return phrase

    return None


def is_backchannel_token(token: str) -> bool:
    """Checks if a single token is recognized as a backchannel word."""
    if token in BACKCHANNEL_WORDS:
        return True
    # Devanagari and Roman check
    for kw in BACKCHANNEL_WORDS:
        if " " not in kw and token_fuzzy_matches(token, kw, min_ratio=0.85):
            return True
    return False


def has_extra_content_words(norm: str, tokens: List[str]) -> bool:
    """
    Checks if there are any words in tokens that are NOT part of
    GO_ON_PHRASES, BACKCHANNEL_WORDS, or NON_LEXICAL_SOUNDS.
    """
    text_rem = f" {norm} "
    all_multi_phrases = [p for p in GO_ON_PHRASES if " " in p] + [p for p in BACKCHANNEL_WORDS if " " in p]
    all_multi_phrases.sort(key=lambda x: len(x.split()), reverse=True)
    for phrase in all_multi_phrases:
        target = f" {phrase} "
        if target in text_rem:
            text_rem = text_rem.replace(target, " ")
    rem_tokens = text_rem.split()
    polite_markers = {"please", "kripya", "कृपया", "krupaya", "zara"}
    for t in rem_tokens:
        if t in GO_ON_PHRASES:
            continue
        if t in BACKCHANNEL_WORDS or is_backchannel_token(t):
            continue
        if t in NON_LEXICAL_SOUNDS or t in polite_markers:
            continue
        return True
    return False


def is_reaction_utterance(text: str) -> bool:
    """
    Checks if final utterance is a short reaction/backchannel (<= 4 words, no '?',
    no question words, no stop words, ALL tokens in BACKCHANNEL_WORDS or NON_LEXICAL_SOUNDS).
    """
    if not text:
        return False
    if "?" in text:
        return False
    norm = normalize_text(text)
    if not norm:
        return False
    tokens = norm.split()
    word_count = len(tokens)
    max_words = getattr(config, "REACTION_MAX_WORDS", 4)
    if word_count == 0 or word_count > max_words:
        return False
    if match_keyword_set(tokens, STOP_WORDS, min_ratio=0.85):
        return False
    if match_keyword_set(tokens, QUESTION_WORDS, min_ratio=0.85):
        return False
    if norm in BACKCHANNEL_WORDS or norm in NON_LEXICAL_SOUNDS:
        return True
    multi_words = [w for w in (BACKCHANNEL_WORDS | NON_LEXICAL_SOUNDS) if " " in w]
    multi_words.sort(key=lambda x: len(x.split()), reverse=True)
    norm_cleaned = f" {norm} "
    for mw in multi_words:
        norm_cleaned = norm_cleaned.replace(f" {mw} ", " ")
    remaining_tokens = norm_cleaned.split()
    for t in remaining_tokens:
        if t in BACKCHANNEL_WORDS or is_backchannel_token(t) or t in NON_LEXICAL_SOUNDS:
            continue
        return False
    return True


def is_go_on_utterance(text: str) -> bool:
    """
    Checks if utterance is a clean go-on phrase without question words or extra content words.
    """
    if not text:
        return False
    norm = normalize_text(text)
    if not norm:
        return False
    if norm in GO_ON_PHRASES:
        return True
    decision, _ = classify_utterance(text)
    return decision == "go_on"


def classify_utterance(
    text: str,
    has_voice: bool = True,
    rms_energy: float = 0.05,
    duration_sec: float = 0.5,
    confidence: float = 1.0,
    speech_probability: float = 1.0,
) -> Tuple[str, str]:
    """
    Deterministic rule-based interruption classification.
    Decision order:
    Rule a. No text, or only non-lexical sounds, or low confidence with <= 2 words -> noise -> resume.
    Rule b. Contains any STOP word or QUESTION word, or ends in '?' -> interruption -> hard stop.
    Rule c. Matches GO_ON phrase -> go_on -> resume / play saved rest.
    Rule d. Every token belongs to BACKCHANNEL (<= 4 tokens, repeats allowed) -> small_sound -> resume.
    Rule e. 3 or more words, or any content word outside lists -> interruption -> hard stop / new question.
    Rule f. Otherwise -> unclear -> 'ji?' prompt.

    :return: (decision, reason_str)
    """
    raw_text = text.strip() if text else ""
    ends_with_qmark = raw_text.endswith("?")

    norm = normalize_interruption_text(raw_text)
    tokens = norm.split() if norm else []
    word_count = len(tokens)

    # -------------------------------------------------------------
    # RULE A: NOISE (No text, non-lexical, or low confidence with <= 2 words)
    # -------------------------------------------------------------
    if not has_voice:
        logger.info(f"[Interruption] Rule A fired: no voice detected -> noise")
        return "noise", "rule_a_no_voice"

    if word_count == 0:
        logger.info(f"[Interruption] Rule A fired: empty text (duration={duration_sec:.2f}s) -> noise")
        return "noise", "rule_a_empty_text"

    # Check if utterance contains ONLY non-lexical acoustic filler sounds
    if (all(t in NON_LEXICAL_SOUNDS for t in tokens) or norm in NON_LEXICAL_SOUNDS) and norm not in BACKCHANNEL_WORDS:
        logger.info(f"[Interruption] Rule A fired: non-lexical sound '{norm}' -> noise")
        return "noise", f"rule_a_non_lexical:{norm}"

    # -------------------------------------------------------------
    # RULE B: STOP WORDS or '?' (Immediate Interruption)
    # -------------------------------------------------------------
    matched_stop = match_keyword_set(tokens, STOP_WORDS, min_ratio=0.85)
    if matched_stop:
        logger.info(f"[Interruption] Rule B fired: matched STOP keyword '{matched_stop}' in '{norm}' -> interruption")
        return "interruption", f"rule_b_stop:{matched_stop}"

    if ends_with_qmark:
        logger.info(f"[Interruption] Rule B fired: question mark detected in '{raw_text}' -> interruption")
        return "interruption", "rule_b_question_mark"

    # -------------------------------------------------------------
    # RULE C: GO_ON (Continuation command -> resume / play saved rest)
    # -------------------------------------------------------------
    # Evaluated before general QUESTION words so phrases like 'tell me more' or 'aur batao' continue
    matched_go_on = match_phrase_list(norm, tokens, GO_ON_PHRASES)
    if matched_go_on:
        go_on_max_words = getattr(config, "GO_ON_MAX_WORDS", 4)
        has_question = False
        if ends_with_qmark or "?" in raw_text:
            has_question = True
        elif match_keyword_set(tokens, QUESTION_WORDS, min_ratio=0.85):
            if matched_go_on in QUESTION_WORDS or norm in QUESTION_WORDS:
                has_question = True
            else:
                tokens_without_go_on = f" {norm} ".replace(f" {matched_go_on} ", " ").split()
                if match_keyword_set(tokens_without_go_on, QUESTION_WORDS, min_ratio=0.85):
                    has_question = True

        is_clean_go_on = (
            word_count <= go_on_max_words
            and not has_question
            and not has_extra_content_words(norm, tokens)
        )
        if is_clean_go_on:
            logger.info(f"[Interruption] Rule C fired: matched GO_ON phrase '{matched_go_on}' in '{norm}' -> go_on")
            return "go_on", f"rule_c_go_on:{matched_go_on}"
        else:
            logger.info(
                f"[Interruption] Rule C skipped: phrase '{matched_go_on}' matched in '{norm}' but has extra words/question "
                f"(words={word_count}, max={go_on_max_words}, has_question={has_question}) -> falling through"
            )

    # -------------------------------------------------------------
    # RULE B (cont): QUESTION WORDS (Interruption -> hard stop)
    # -------------------------------------------------------------
    matched_question = match_keyword_set(tokens, QUESTION_WORDS, min_ratio=0.85)
    if matched_question:
        logger.info(f"[Interruption] Rule B fired: matched QUESTION keyword '{matched_question}' in '{norm}' -> interruption")
        return "interruption", f"rule_b_question:{matched_question}"

    # -------------------------------------------------------------
    # RULE D: SMALL_SOUND (Every token belongs to BACKCHANNEL, <= 4 tokens)
    # -------------------------------------------------------------
    if word_count <= 4:
        # Check exact multi-word backchannel (e.g. 'theek hai', 'samajh gaya', 'theek aahe')
        if norm in BACKCHANNEL_WORDS:
            logger.info(f"[Interruption] Rule D fired: exact multi-word backchannel '{norm}' -> small_sound")
            return "small_sound", f"rule_d_backchannel_phrase:{norm}"

        # Collapse multi-word backchannels into single compound tokens (e.g. 'got it' -> 'got_it')
        norm_for_bc = norm
        for mw in sorted(BACKCHANNEL_WORDS, key=len, reverse=True):
            if " " in mw and mw in norm_for_bc:
                norm_for_bc = norm_for_bc.replace(mw, mw.replace(" ", "_"))
        bc_tokens = norm_for_bc.split()

        if len(bc_tokens) <= 4:
            all_backchannel = True
            for t in bc_tokens:
                clean_t = t.replace("_", " ")
                if not (clean_t in BACKCHANNEL_WORDS or is_backchannel_token(clean_t)):
                    all_backchannel = False
                    break

            if all_backchannel:
                logger.info(f"[Interruption] Rule D fired: all tokens are backchannels '{norm}' -> small_sound")
                return "small_sound", f"rule_d_all_backchannels:{norm}"

    # -------------------------------------------------------------
    # RULE E: INTERRUPTION (3 or more words, or content word outside lists)
    # -------------------------------------------------------------
    if word_count >= 3:
        logger.info(f"[Interruption] Rule E fired: {word_count} words in '{norm}' -> interruption")
        return "interruption", f"rule_e_length:{word_count}_words"

    # If 1-2 words and contains any word not in BACKCHANNEL, NON_LEXICAL, GO_ON, STOP, QUESTION
    # e.g., 'price', 'laptop', 'weather', 'batao'
    # Unclear markers (e.g. 'zz', 'unclear', 'inaudible') fall through to Rule F
    unclear_markers = {"zz", "zzz", "unclear", "inaudible", "garbled", "mumble"}
    has_unknown_content_word = False
    for t in tokens:
        if not is_backchannel_token(t) and t not in NON_LEXICAL_SOUNDS and t not in unclear_markers:
            has_unknown_content_word = True
            break

    if has_unknown_content_word:
        logger.info(f"[Interruption] Rule E fired: content word outside lists in '{norm}' -> interruption")
        return "interruption", f"rule_e_content_word:{norm}"

    # -------------------------------------------------------------
    # RULE F: UNCLEAR (High probability voice with unusable/unclear text)
    # -------------------------------------------------------------
    min_speech_prob = getattr(config, "VAD_SPEECH_PROB_UNCLEAR_THRESHOLD", 0.70)
    if speech_probability >= min_speech_prob:
        logger.info(f"[Interruption] Rule F fired: high-probability voice ({speech_probability:.2f}) unclear text '{norm}' -> unclear")
        return "unclear", f"rule_f_unclear:{norm}"

    # If speech probability is low, classify as noise
    logger.info(f"[Interruption] Rule F fallback: low speech probability ({speech_probability:.2f}) -> noise")
    return "noise", "rule_f_low_speech_prob_noise"


class InterruptionHandler:
    """Wrapper class used by TurnManager to evaluate audio/text during PAUSED window."""

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
        confidence: float = 1.0,
        speech_probability: float = 1.0,
    ) -> Tuple[str, str]:
        decision, reason = classify_utterance(
            text=text,
            has_voice=has_voice,
            rms_energy=rms_energy,
            duration_sec=duration_sec,
            confidence=confidence,
            speech_probability=speech_probability,
        )
        if decision == "unclear":
            self.unclear_failures_count += 1
            logger.info(
                f"[InterruptionHandler] Unclear utterance detected (failure #{self.unclear_failures_count})."
            )
        else:
            self.unclear_failures_count = 0
        return decision, reason

    def get_unclear_response(self, language: str = "hi-IN") -> dict:
        """
        Determines the appropriate prompt for unclear speech based on retry count.
        - Failures 1 & 2: play 'ji' or 'kya_kaha'
        - Failure 3+: play 'repeat_slowly' and reset counter
        """
        lang = language if language in ("hi-IN", "mr-IN", "en-IN") else "hi-IN"

        if self.unclear_failures_count <= getattr(config, "UNCLEAR_MAX_RETRIES", 2):
            phrase_key = "ji" if self.unclear_failures_count <= 1 else "kya_kaha"
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
                lang, getattr(config, "UNCLEAR_REPEAT_SLOWLY", {}).get(lang, "कृपया धीरे-धीरे और साफ़ बोलें।")
            )
            self.reset_failures()
            return {
                "phrase_key": phrase_key,
                "text": text,
                "escalated": True,
            }

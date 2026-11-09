"""
Streaming Sentence Splitter for Sunai Voice Assistant.
Splits streaming LLM tokens into complete sentences on [. ? ! ।]
while avoiding splits on:
- Decimal numbers (e.g. 3.5, 99.9)
- Common honorifics and abbreviations (e.g. Dr., Mr., Mrs., Ms., Prof., vs., etc.)
- Multi-dot ellipsis (...) or combined punctuation (?!, !!)
- Very short fragments under MIN_SENTENCE_CHAR_LEN
Plan Section 11 & Module 6 compliant.
"""

import re
from typing import Optional
from Backend import config

# Abbreviations that should NOT trigger a sentence split when followed by a dot
ABBREVIATIONS = {
    "dr", "mr", "mrs", "ms", "prof", "sr", "jr", "vs", "etc",
    "eg", "ie", "al", "fig", "jan", "feb", "mar", "apr", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec", "approx", "dept",
    "univ", "corp", "inc", "ltd", "co", "st", "rd", "ave",
}

# Regex to detect potential sentence delimiters followed by whitespace
# Matches: . or ? or ! or Devanagari danda । (or multiple like ... or ?!)
SPLIT_PATTERN = re.compile(r'([.?!।]+)(\s+)')


def is_valid_sentence_end(text_before_delim: str, delim: str, text_after_delim: str) -> bool:
    """
    Evaluates whether a matched delimiter is a true sentence boundary.
    Rejects decimals, abbreviations, and trailing dots in acronyms.
    """
    # 1. Check for decimal numbers: digit before and digit after (e.g. 3.5)
    if delim == "." and text_before_delim and text_after_delim:
        last_char = text_before_delim[-1]
        first_after = text_after_delim[0]
        if last_char.isdigit() and first_after.isdigit():
            return False

    # 2. Check for abbreviations (e.g. Dr., Mr., etc.)
    # Get the last word before the delimiter
    words = re.findall(r'[a-zA-Z]+', text_before_delim)
    if words:
        last_word = words[-1].lower()
        if last_word in ABBREVIATIONS:
            return False

    # 3. Check for single-letter initials (e.g. "Ananth N. speaks")
    if words and len(words[-1]) == 1:
        return False

    return True


class StreamingSentenceSplitter:
    """
    Stateful streaming sentence accumulator.
    Consumes incoming tokens from LLM and yields complete sentences as soon as ready.
    """

    def __init__(self, min_char_len: int = config.MIN_SENTENCE_CHAR_LEN):
        self.min_char_len = min_char_len
        self.buffer = ""

    def feed(self, token: str) -> list[str]:
        """
        Appends incoming token to buffer and returns any completed sentences.
        """
        self.buffer += token
        ready_sentences: list[str] = []
        search_pos = 0

        while True:
            match = SPLIT_PATTERN.search(self.buffer, pos=search_pos)
            if not match:
                break

            delim_start = match.start(1)
            delim_end = match.end(1)
            full_match_end = match.end()

            text_before = self.buffer[:delim_start]
            delim = match.group(1)
            text_after = self.buffer[full_match_end:]

            if is_valid_sentence_end(text_before, delim, text_after):
                # Valid sentence boundary
                candidate = (text_before + delim).strip()
                self.buffer = text_after
                search_pos = 0  # Buffer has been modified, restart search from beginning

                if len(candidate) >= self.min_char_len:
                    ready_sentences.append(candidate)
            else:
                # Delimiter is inside number/abbreviation; advance past this match
                search_pos = full_match_end

        return ready_sentences

    def flush(self) -> list[str]:
        """
        Emits any remaining text in the buffer when the LLM stream finishes.
        """
        remaining = self.buffer.strip()
        self.buffer = ""
        if remaining and len(remaining) >= 2:
            return [remaining]
        return []


def split_sentences(text: str, min_char_len: int = config.MIN_SENTENCE_CHAR_LEN) -> list[str]:
    """
    Non-streaming helper function to split full text into clean sentences.
    """
    splitter = StreamingSentenceSplitter(min_char_len=min_char_len)
    sentences = splitter.feed(text)
    sentences.extend(splitter.flush())
    return sentences

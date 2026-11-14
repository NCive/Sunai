"""
Unit tests for Marathi/Hindi Language Hint Resolution.
Ensures reliable detection of Marathi turns when Prisma ASR incorrectly outputs 'hi-IN'.
"""

import logging
import pytest
from Backend import config
from Backend.language_hint import (
    resolve_language,
    apply_language_hint,
    is_mostly_devanagari,
    tokenize_words,
)


def test_marker_words_disjoint():
    """Assert that MARATHI_MARKER_WORDS and HINDI_MARKER_WORDS have no intersection."""
    marathi_set = set(config.MARATHI_MARKER_WORDS)
    hindi_set = set(config.HINDI_MARKER_WORDS)
    assert marathi_set.isdisjoint(hindi_set), f"Overlap found: {marathi_set & hindi_set}"


def test_marathi_marker_flips_hi_to_mr(caplog):
    """'तुम्ही ऐकत आहात का?' with prisma_lang='hi-IN' -> 'mr-IN'."""
    with caplog.at_level(logging.INFO):
        res = resolve_language("तुम्ही ऐकत आहात का?", prisma_lang="hi-IN", previous_lang="hi-IN")
    assert res == "mr-IN"
    # Verify logging format
    assert any("[LangHint] hi-IN -> mr-IN (marker: तुम्ही)" in record.message for record in caplog.records)


def test_hindi_marker_preserves_hi(caplog):
    """'आप कैसे हैं?' with prisma_lang='hi-IN' -> 'hi-IN' and logs nothing."""
    with caplog.at_level(logging.INFO):
        res = resolve_language("आप कैसे हैं?", prisma_lang="hi-IN", previous_lang="hi-IN")
    assert res == "hi-IN"
    # Ensure nothing logged when unchanged
    assert not any("[LangHint]" in record.message for record in caplog.records)


def test_neutral_word_with_previous_mr(caplog):
    """'ठीक' with prisma_lang='hi-IN' and previous_lang='mr-IN' -> 'mr-IN'."""
    with caplog.at_level(logging.INFO):
        res = resolve_language("ठीक", prisma_lang="hi-IN", previous_lang="mr-IN")
    assert res == "mr-IN"
    assert any("[LangHint] hi-IN -> mr-IN" in record.message for record in caplog.records)


def test_neutral_word_with_previous_hi(caplog):
    """'ठीक' with prisma_lang='hi-IN' and previous_lang='hi-IN' -> 'hi-IN'."""
    with caplog.at_level(logging.INFO):
        res = resolve_language("ठीक", prisma_lang="hi-IN", previous_lang="hi-IN")
    assert res == "hi-IN"
    assert not any("[LangHint]" in record.message for record in caplog.records)


def test_both_marathi_and_hindi_markers():
    """Text with both a Marathi and a Hindi marker -> 'hi-IN'."""
    # 'तुम्ही' (Marathi) and 'कैसे' (Hindi)
    res = resolve_language("तुम्ही कैसे हो", prisma_lang="hi-IN", previous_lang="mr-IN")
    assert res == "hi-IN"


def test_latin_script_unchanged(caplog):
    """'okay' or 'haan kaise ho' -> unchanged."""
    with caplog.at_level(logging.INFO):
        res1 = resolve_language("okay", prisma_lang="hi-IN", previous_lang="mr-IN")
        res2 = resolve_language("haan kaise ho", prisma_lang="hi-IN", previous_lang="mr-IN")
    assert res1 == "hi-IN"
    assert res2 == "hi-IN"
    assert not any("[LangHint]" in record.message for record in caplog.records)


def test_en_in_and_mr_in_never_changed(caplog):
    """prisma_lang='en-IN' or 'mr-IN' -> never changed."""
    with caplog.at_level(logging.INFO):
        # Even with Marathi markers, en-IN is never changed
        res_en = resolve_language("तुम्ही ऐकत आहात का?", prisma_lang="en-IN", previous_lang="mr-IN")
        # Even with Hindi markers, mr-IN is never changed
        res_mr = resolve_language("आप कैसे हैं?", prisma_lang="mr-IN", previous_lang="hi-IN")
    assert res_en == "en-IN"
    assert res_mr == "mr-IN"
    assert not any("[LangHint]" in record.message for record in caplog.records)


def test_empty_or_whitespace_text_unchanged():
    """Empty or whitespace text -> unchanged."""
    assert resolve_language("", prisma_lang="hi-IN", previous_lang="mr-IN") == "hi-IN"
    assert resolve_language("   ", prisma_lang="hi-IN", previous_lang="mr-IN") == "hi-IN"


def test_whole_word_matching_no_substring_false_positive():
    """Substrings inside other words must not trigger markers."""
    # 'आहे' is in MARATHI_MARKER_WORDS, but 'त्यांच्यामध्ये' should not match 'आहे'
    res = resolve_language("त्यांच्यामध्ये काय", prisma_lang="hi-IN", previous_lang="hi-IN")
    # 'काय' is a Marathi marker, so that matches, but let's test a neutral word that only contains 'आहे' as substring
    tokens = tokenize_words("त्यांच्यामध्ये")
    assert "आहे" not in tokens
    assert tokens == ["त्यांच्यामध्ये"]


def test_punctuation_handling():
    """Punctuation including । and ? should be cleanly stripped from tokens."""
    tokens = tokenize_words("तुम्ही ऐकत आहात का? आणि ठीक आहे।")
    assert "का?" not in tokens
    assert "का" in tokens
    assert "आहे।" not in tokens
    assert "आहे" in tokens


# =====================================================================
# apply_language_hint Tests
# =====================================================================

def test_apply_hint_mr_with_tag_hi_and_devanagari(caplog):
    """hint mr-IN with tag hi-IN and Devanagari text gives mr-IN."""
    with caplog.at_level(logging.INFO):
        # Even text with neutral or Hindi words like "आप कैसे हैं?" will be forced to mr-IN by the hint
        res = apply_language_hint("आप कैसे हैं?", prisma_lang="hi-IN", hint="mr-IN")
    assert res == "mr-IN"
    assert any("[LangHint] hi-IN -> mr-IN (user setting)" in record.message for record in caplog.records)


def test_apply_hint_hi_with_tag_mr(caplog):
    """hint hi-IN with tag mr-IN gives hi-IN."""
    with caplog.at_level(logging.INFO):
        # Even text with Marathi words like "तुम्ही ऐकत आहात का?" will be forced to hi-IN by the hint
        res = apply_language_hint("तुम्ही ऐकत आहात का?", prisma_lang="mr-IN", hint="hi-IN")
    assert res == "hi-IN"
    assert any("[LangHint] mr-IN -> hi-IN (user setting)" in record.message for record in caplog.records)


def test_apply_hint_mr_with_tag_en():
    """hint mr-IN with tag en-IN stays en-IN."""
    res = apply_language_hint("What is the time?", prisma_lang="en-IN", hint="mr-IN")
    assert res == "en-IN"


def test_apply_hint_mr_with_latin_text_unchanged(caplog):
    """hint mr-IN with Latin text is unchanged."""
    with caplog.at_level(logging.INFO):
        res1 = apply_language_hint("okay", prisma_lang="hi-IN", hint="mr-IN")
        res2 = apply_language_hint("haan kaise ho", prisma_lang="hi-IN", hint="mr-IN")
    assert res1 == "hi-IN"
    assert res2 == "hi-IN"
    assert not any("(user setting)" in record.message for record in caplog.records)


def test_apply_hint_auto_gives_same_as_resolve_language():
    """hint auto gives the same result as resolve_language."""
    test_cases = [
        ("तुम्ही ऐकत आहात का?", "hi-IN", "hi-IN"),
        ("आप कैसे हैं?", "hi-IN", "hi-IN"),
        ("ठीक", "hi-IN", "mr-IN"),
        ("ठीक", "hi-IN", "hi-IN"),
        ("okay", "hi-IN", "mr-IN"),
    ]
    for text, tag, prev in test_cases:
        expected = resolve_language(text, tag, prev)
        actual = apply_language_hint(text, tag, hint="auto", previous_lang=prev)
        assert actual == expected, f"Mismatch for text='{text}', tag='{tag}', prev='{prev}'"


def test_apply_invalid_hint_is_ignored():
    """an invalid hint is ignored (falls back to auto/resolve_language)."""
    # "तुम्ही ऐकत आहात का?" with hi-IN under auto resolves to mr-IN
    res = apply_language_hint("तुम्ही ऐकत आहात का?", prisma_lang="hi-IN", hint="invalid_hint")
    assert res == "mr-IN"


def test_apply_hint_default_is_auto():
    """the default is auto when hint is omitted or None."""
    res_omitted = apply_language_hint("तुम्ही ऐकत आहात का?", prisma_lang="hi-IN")
    res_none = apply_language_hint("तुम्ही ऐकत आहात का?", prisma_lang="hi-IN", hint=None)
    assert res_omitted == "mr-IN"
    assert res_none == "mr-IN"


def test_apply_hint_matching_tag_no_log(caplog):
    """When hint matches prisma tag, no user setting log is produced."""
    with caplog.at_level(logging.INFO):
        res = apply_language_hint("आप कैसे हैं?", prisma_lang="hi-IN", hint="hi-IN")
    assert res == "hi-IN"
    assert not any("(user setting)" in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_ws_server_handle_language_hint(caplog):
    """ws_server handle_json_message accepts valid hints, rejects invalid hints, and defaults to auto."""
    from unittest.mock import AsyncMock, patch, MagicMock
    from Backend.ws_server import SunaiConnectionManager

    mock_ws = AsyncMock()
    sent_json = []

    async def mock_send(msg):
        sent_json.append(msg)

    mock_ws.send_text = mock_send

    with patch("Backend.ws_server.get_global_retriever", return_value=MagicMock()):
        mgr = SunaiConnectionManager(websocket=mock_ws)

    # 1. Assert default is "auto"
    assert mgr.language_hint == "auto"

    # 2. Set valid hint "mr-IN"
    await mgr.handle_json_message({"type": "set_language_hint", "hint": "mr-IN"})
    assert mgr.language_hint == "mr-IN"

    # 3. Invalid hint is ignored with warning
    with caplog.at_level(logging.WARNING):
        await mgr.handle_json_message({"type": "set_language_hint", "hint": "fr-FR"})
    assert mgr.language_hint == "mr-IN", "Invalid hint must be ignored"
    assert any("Invalid language hint ignored: fr-FR" in record.message for record in caplog.records)



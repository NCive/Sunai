"""
Unit tests for Reaction Suppression & Go-On Part B enhancements:
1. Short reactions ("okay", "hmm", "haan", "theek hai") ignored in LISTENING -> returns to IDLE.
2. Go-on phrases with nothing to continue -> returns to IDLE.
3. Go-on phrases with unplayed sentences -> proceeds to continuation playback.
4. "haan" in IDLE_CHECK / WAKE / SLEEP -> NOT ignored, proceeds as normal turn.
5. Mixed utterances ("ok, aur Prisma ke baare mein batao") -> NOT ignored, proceeds as normal turn.
6. Part B: Go-on only wins when <= 4 words, no question, no extra content words.
"""

import asyncio
import pytest
from Backend.interruption import (
    classify_utterance,
    is_reaction_utterance,
    is_go_on_utterance,
)
from Backend.state_machine import SunaiStateMachine
from Backend.turn_manager import TurnManager


def test_is_reaction_utterance():
    # Pure short reactions (<= 4 words, backchannel/non-lexical only)
    assert is_reaction_utterance("okay") is True
    assert is_reaction_utterance("hmm") is True
    assert is_reaction_utterance("haan") is True
    assert is_reaction_utterance("theek hai") is True
    assert is_reaction_utterance("acha ji") is True
    assert is_reaction_utterance("haan theek hai") is True
    assert is_reaction_utterance("haan ji") is True
    assert is_reaction_utterance("ok got it") is True
    assert is_reaction_utterance("uh huh") is True
    assert is_reaction_utterance("accha") is True
    assert is_reaction_utterance("हाँ") is True
    assert is_reaction_utterance("ठीक है") is True

    # Mixed questions or statements must NOT be treated as pure reactions
    assert is_reaction_utterance("ok, aur Prisma ke baare mein batao") is False
    assert is_reaction_utterance("haan, kya hai?") is False
    assert is_reaction_utterance("haan kya") is False
    assert is_reaction_utterance("theek hai batao") is False
    assert is_reaction_utterance("ruko") is False
    assert is_reaction_utterance("wait") is False
    assert is_reaction_utterance("go on") is False
    assert is_reaction_utterance("aage bolo") is False
    assert is_reaction_utterance("kya") is False

    # Utterances longer than 4 words must NOT be treated as reactions
    assert is_reaction_utterance("haan ji theek hai accha okay") is False


def test_part_b_go_on_classifier_rules():
    # Full questions containing go-on words like 'बताओ' or 'batao' must fall through to interruption
    dec1, reason1 = classify_utterance("OK, और मुझे Prisma के बारे में बताओ")
    assert dec1 == "interruption", f"Expected interruption, got {dec1} ({reason1})"

    dec2, reason2 = classify_utterance("ha batao kya karte ho")
    assert dec2 == "interruption", f"Expected interruption, got {dec2} ({reason2})"

    dec3, reason3 = classify_utterance("continue with prisma")
    assert dec3 == "interruption", f"Expected interruption, got {dec3} ({reason3})"

    # Clean go-on phrases must still classify as go_on
    assert classify_utterance("aage bolo")[0] == "go_on"
    assert classify_utterance("batao")[0] == "go_on"
    assert classify_utterance("बताओ")[0] == "go_on"
    assert classify_utterance("aur batao")[0] == "go_on"
    assert classify_utterance("go on")[0] == "go_on"
    assert classify_utterance("continue")[0] == "go_on"
    assert classify_utterance("please continue")[0] == "go_on"
    assert classify_utterance("haan aage bolo")[0] == "go_on"
    assert classify_utterance("ok continue")[0] == "go_on"


@pytest.mark.asyncio
async def test_turn_manager_reaction_ignored():
    events_sent = []
    async def mock_send(ev, payload):
        events_sent.append((ev, payload))

    turn_completed_called = []
    async def on_turn_complete(text=None):
        turn_completed_called.append(text)

    sm = SunaiStateMachine("LISTENING")
    tm = TurnManager(sm, mock_send)

    # 1. User says "okay" in LISTENING state
    tm.current_user_text = "okay"
    await tm._finalize_turn(on_turn_complete)

    # Must NOT call on_turn_complete
    assert len(turn_completed_called) == 0, "RAG/LLM must not be called on reaction"
    # State must return to IDLE resting state
    assert sm.get_state() == "IDLE", f"Expected state IDLE, got {sm.get_state()}"
    # Idle timer must be active
    assert tm.idle_timer_task is not None and not tm.idle_timer_task.done()

    # 2. User says "theek hai"
    sm.transition_to("LISTENING", reason="test")
    tm.current_user_text = "theek hai"
    await tm._finalize_turn(on_turn_complete)

    assert len(turn_completed_called) == 0
    assert sm.get_state() == "IDLE"


@pytest.mark.asyncio
async def test_turn_manager_empty_go_on_ignored():
    events_sent = []
    async def mock_send(ev, payload):
        events_sent.append((ev, payload))

    turn_completed_called = []
    async def on_turn_complete(text=None):
        turn_completed_called.append(text)

    # Nothing to continue
    has_continuation = False
    sm = SunaiStateMachine("LISTENING")
    tm = TurnManager(sm, mock_send, has_unplayed_continuation=lambda: has_continuation)

    tm.current_user_text = "go on"
    await tm._finalize_turn(on_turn_complete)

    # Must NOT call on_turn_complete
    assert len(turn_completed_called) == 0, "Must not call LLM on empty go-on"
    assert sm.get_state() == "IDLE"
    assert tm.idle_timer_task is not None and not tm.idle_timer_task.done()

    # Now simulate unplayed continuation available
    has_continuation = True
    sm.transition_to("LISTENING", reason="test")
    tm.current_user_text = "aage bolo"
    await tm._finalize_turn(on_turn_complete)

    # With sentences to continue, on_turn_complete MUST be invoked
    assert len(turn_completed_called) == 1
    assert turn_completed_called[0] == "aage bolo"
    assert sm.get_state() == "THINKING"


@pytest.mark.asyncio
async def test_idle_check_reaction_not_ignored():
    """A 'haan' responding to 'Are you there?' in IDLE_CHECK must still proceed to turn finalization."""
    events_sent = []
    async def mock_send(ev, payload):
        events_sent.append((ev, payload))

    turn_completed_called = []
    async def on_turn_complete(text=None):
        turn_completed_called.append(text)

    sm = SunaiStateMachine("IDLE_CHECK")
    tm = TurnManager(sm, mock_send)

    # User speaks while bot is in IDLE_CHECK
    await tm.on_user_voice_start()
    assert sm.get_state() == "LISTENING"
    assert tm.speech_onset_state == "IDLE_CHECK"

    tm.current_user_text = "haan"
    await tm._finalize_turn(on_turn_complete)

    # Must NOT be ignored because onset was IDLE_CHECK!
    assert len(turn_completed_called) == 1
    assert turn_completed_called[0] == "haan"
    assert sm.get_state() == "THINKING"


@pytest.mark.asyncio
async def test_mixed_utterance_reaches_turn_complete():
    """Mixed utterances like 'ok, aur Prisma ke baare mein batao' must reach turn completion."""
    events_sent = []
    async def mock_send(ev, payload):
        events_sent.append((ev, payload))

    turn_completed_called = []
    async def on_turn_complete(text=None):
        turn_completed_called.append(text)

    sm = SunaiStateMachine("IDLE")
    tm = TurnManager(sm, mock_send)

    await tm.on_user_voice_start()
    assert sm.get_state() == "LISTENING"

    tm.current_user_text = "ok, aur Prisma ke baare mein batao"
    await tm._finalize_turn(on_turn_complete)

    assert len(turn_completed_called) == 1
    assert turn_completed_called[0] == "ok, aur Prisma ke baare mein batao"
    assert sm.get_state() == "THINKING"

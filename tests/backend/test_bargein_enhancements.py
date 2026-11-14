"""
Unit Tests for Sunai Barge-In Enhancements:
(a) The window stays open while voice is active (no vad_end received).
(b) No text after vad_end resumes as noise at about 1 s (PAUSE_POST_VOICE_TEXT_WAIT_SEC).
(c) Text arriving after 500 ms but before 1 s after vad_end is classified correctly ("ruko" -> stop).
(d) The 5 s hard cap (PAUSE_WINDOW_MAX_SEC).
(e) A second vad_start while PAUSED does not create a second window.
(f) Baseline mode behaves exactly as before (immediate hard stop).
(g) Stutter check: safety net does not re-pause on already-evaluated text.
"""

import asyncio
import sys
import time
from pathlib import Path

# Add Sunai root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from Backend import config
from Backend.state_machine import SunaiStateMachine
from Backend.turn_manager import TurnManager


def test_window_stays_open_while_voice_active():
    """(a) Window stays open while voice is active even after 500ms."""
    async def run():
        events = []
        async def mock_send(ev, payload):
            events.append((ev, payload))

        sm = SunaiStateMachine("SPEAKING")
        tm = TurnManager(sm, mock_send, mode="pause_first")

        await tm.on_user_voice_start(duration_ms=150.0, rms=0.08)
        assert sm.get_state() == "PAUSED"
        assert tm.is_voice_active is True

        # Wait 1.2s without vad_end: window must NOT give up at old 500ms
        await asyncio.sleep(1.2)
        assert sm.get_state() == "PAUSED", "Window must remain PAUSED while voice is active"

        # Now send vad_end
        await tm.on_user_voice_end(None)
        assert tm.is_voice_active is False
        assert tm.last_vad_end_monotonic is not None

        # After 1.05s post-voice wait with no text, resumes as noise
        await asyncio.sleep(1.05)
        assert sm.get_state() == "SPEAKING", "Must resume to SPEAKING after post-voice timeout"
        assert any(ev == "decision" and p.get("decision") == "noise" for ev, p in events)
        assert any(ev == "resume" for ev, _ in events)

    asyncio.run(run())


def test_no_text_after_vad_end_resumes_noise_at_1s():
    """(b) No text after vad_end resumes as noise at about 1 s."""
    async def run():
        events = []
        async def mock_send(ev, payload):
            events.append((ev, payload))

        sm = SunaiStateMachine("SPEAKING")
        tm = TurnManager(sm, mock_send, mode="pause_first")

        await tm.on_user_voice_start(duration_ms=100.0, rms=0.05)
        assert sm.get_state() == "PAUSED"

        # Voice ends quickly (e.g. 50ms later)
        await tm.on_user_voice_end(None)
        assert tm.is_voice_active is False

        # At 0.5s after vad_end: must still be PAUSED (waiting up to 1.0s)
        await asyncio.sleep(0.5)
        assert sm.get_state() == "PAUSED", "Must stay PAUSED at 0.5s after vad_end"

        # At 1.1s total after vad_end: post-voice wait expired -> resumes as noise
        await asyncio.sleep(0.6)
        assert sm.get_state() == "SPEAKING", "Must resume to SPEAKING after 1.0s post-voice wait"
        dec_events = [p for ev, p in events if ev == "decision"]
        assert len(dec_events) > 0
        assert dec_events[-1].get("decision") == "noise"
        assert dec_events[-1].get("reason") == "no_text_after_voice_end"

    asyncio.run(run())


def test_text_arriving_after_500ms_before_1s_classified_correctly():
    """(c) Text arriving after 500 ms but before 1 s after vad_end is classified correctly."""
    async def run():
        events = []
        async def mock_send(ev, payload):
            events.append((ev, payload))

        sm = SunaiStateMachine("SPEAKING")
        tm = TurnManager(sm, mock_send, mode="pause_first")

        await tm.on_user_voice_start(duration_ms=120.0, rms=0.08)
        assert sm.get_state() == "PAUSED"

        # Voice ends at 50ms
        await tm.on_user_voice_end(None)

        # Wait 600ms (> 500ms, but < 1.0s after vad_end)
        await asyncio.sleep(0.6)
        assert sm.get_state() == "PAUSED", "Should still be PAUSED waiting for text"

        # Late text arrives from STT: 'ruko'
        tm.current_user_text = "ruko"

        # Allow evaluation tick
        await asyncio.sleep(0.08)
        assert sm.get_state() == "LISTENING", "Should stop playback and transition to LISTENING on 'ruko'"
        dec_events = [p for ev, p in events if ev == "decision"]
        assert len(dec_events) > 0
        assert dec_events[-1].get("decision") == "interruption"
        assert dec_events[-1].get("reason", "").startswith("rule_b_stop")
        assert any(ev == "clear_queue" for ev, _ in events)

    asyncio.run(run())


def test_5s_hard_cap():
    """(d) The 5 s hard cap terminates long paused states."""
    async def run():
        events = []
        async def mock_send(ev, payload):
            events.append((ev, payload))

        sm = SunaiStateMachine("SPEAKING")
        tm = TurnManager(sm, mock_send, mode="pause_first")

        await tm.on_user_voice_start(duration_ms=200.0, rms=0.06)
        assert sm.get_state() == "PAUSED"
        # Voice stays active (e.g. background hum kept VAD open, no vad_end, no text)
        assert tm.is_voice_active is True

        # Wait 5.15s (past the 5.0s hard cap)
        await asyncio.sleep(5.15)
        assert sm.get_state() == "SPEAKING", "Must resume to SPEAKING after 5.0s hard cap"
        dec_events = [p for ev, p in events if ev == "decision"]
        assert len(dec_events) > 0
        assert dec_events[-1].get("decision") == "noise"
        # Since voice lasted > 1.5s, reason is 'long_voice_no_text'
        assert dec_events[-1].get("reason") == "long_voice_no_text"

    asyncio.run(run())


def test_second_vad_start_does_not_create_second_window():
    """(e) A second vad_start while PAUSED keeps the same window and marks voice active."""
    async def run():
        events = []
        async def mock_send(ev, payload):
            events.append((ev, payload))

        sm = SunaiStateMachine("SPEAKING")
        tm = TurnManager(sm, mock_send, mode="pause_first")

        await tm.on_user_voice_start(duration_ms=100.0, rms=0.06)
        assert sm.get_state() == "PAUSED"
        initial_task = tm.pause_eval_task
        assert initial_task is not None

        # Voice ends briefly
        await tm.on_user_voice_end(None)
        assert tm.is_voice_active is False
        assert tm.last_vad_end_monotonic is not None

        # Second vad_start arrives while still PAUSED
        await tm.on_user_voice_start(duration_ms=120.0, rms=0.07)
        assert sm.get_state() == "PAUSED"
        assert tm.is_voice_active is True
        assert tm.last_vad_end_monotonic is None
        # Must retain the exact same running task
        assert tm.pause_eval_task is initial_task
        assert not initial_task.done()

        # Clean up
        initial_task.cancel()

    asyncio.run(run())


def test_baseline_mode_behaves_as_before():
    """(f) Baseline mode behaves exactly as before (immediate hard stop)."""
    async def run():
        events = []
        async def mock_send(ev, payload):
            events.append((ev, payload))

        sm = SunaiStateMachine("SPEAKING")
        tm = TurnManager(sm, mock_send, mode="baseline")

        await tm.on_user_voice_start(duration_ms=100.0, rms=0.05)
        # Immediately transitions to LISTENING, clears queue, never enters PAUSED
        assert sm.get_state() == "LISTENING"
        assert any(ev == "clear_queue" for ev, _ in events)
        assert any(ev == "decision" and p.get("decision") == "interruption" for ev, p in events)
        assert tm.pause_eval_task is None

    asyncio.run(run())


def test_safety_net_does_not_stutter_on_already_evaluated_text():
    """(g) Stutter check: safety net does not re-trigger pause on text already evaluated."""
    async def run():
        events = []
        async def mock_send(ev, payload):
            events.append((ev, payload))

        sm = SunaiStateMachine("SPEAKING")
        tm = TurnManager(sm, mock_send, mode="pause_first")

        # Simulate user saying 'haan' during speech
        tm.current_user_text = "haan"
        await tm.on_user_voice_start(duration_ms=150.0, rms=0.06)
        assert sm.get_state() == "PAUSED"

        # Wait for evaluation (min check time ~350ms)
        await asyncio.sleep(0.40)
        assert sm.get_state() == "SPEAKING", "Must resume on 'haan' (small_sound)"
        assert tm.is_text_evaluated("haan") is True

        # Now simulate late STT final text arriving with 'haan' while SPEAKING
        # is_text_evaluated must report True so safety net ignores it
        assert tm.is_text_evaluated("haan") is True
        assert tm.is_text_evaluated("  haan  ") is True

        # But a fresh real interruption ('ruko') is NOT in evaluated texts
        assert tm.is_text_evaluated("ruko") is False

    asyncio.run(run())

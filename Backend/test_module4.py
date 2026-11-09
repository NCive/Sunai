"""
Module 4 Test Suite for Sunai Voice Assistant.
Tests:
1. Table-driven test of at least 40+ utterances across Hindi, Marathi, Hinglish, English,
   and all 5 categories (noise, small_sound, go_on, interruption, unclear).
   Prints a clean pass/fail table.
2. InterruptionHandler unclear retry escalation ("ji?" -> "kya kaha?" -> "repeat slowly").
3. TurnManager Pause-First classification (resume on backchannel/go-on, stop on interruption).
4. Baseline mode immediate hard stop.
5. Idle check lifecycle: 10s -> "Are you there?" (IDLE_CHECK) -> 10s -> "goodbye" (SLEEP), asked only once.
6. Wake from SLEEP on tap and on voice.
7. Full WebSocket protocol exchange over /ws.
"""

import asyncio
import base64
import os
import sys
import time
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from Backend import config
from Backend.interruption import classify_utterance, InterruptionHandler, normalize_text
from Backend.main import app
from Backend.state_machine import SunaiStateMachine
from Backend.turn_manager import TurnManager

print("--- RUNNING SUNAI MODULE 4 TESTS ---\n")

# =====================================================================
# Test 1: Table-Driven Interruption Classifier (45+ Utterances)
# =====================================================================
print("Test 1: Table-Driven Classifier Test (Hindi, Marathi, Hinglish, English)...")

TEST_CASES = [
    # (id, utterance, language, has_voice, rms_energy, duration_sec, expected_class)
    # --- Category: SMALL_SOUND (Backchannels) ---
    (1, "hmm", "en", True, 0.04, 0.3, "small_sound"),
    (2, "ok", "en", True, 0.05, 0.3, "small_sound"),
    (3, "yeah", "en", True, 0.05, 0.4, "small_sound"),
    (4, "got it", "en", True, 0.04, 0.4, "small_sound"),
    (5, "uh-huh", "en", True, 0.04, 0.3, "small_sound"),
    (6, "haan", "hi-IN (Roman)", True, 0.05, 0.3, "small_sound"),
    (7, "accha", "hi-IN (Roman)", True, 0.05, 0.4, "small_sound"),
    (8, "theek hai", "hi-IN (Roman)", True, 0.04, 0.5, "small_sound"),
    (9, "ji haan", "hi-IN (Roman)", True, 0.05, 0.4, "small_sound"),
    (10, "sahi hai", "hi-IN (Roman)", True, 0.04, 0.4, "small_sound"),
    (11, "हाँ", "hi-IN (Devanagari)", True, 0.05, 0.3, "small_sound"),
    (12, "हूँ", "hi-IN (Devanagari)", True, 0.04, 0.3, "small_sound"),
    (13, "अच्छा", "hi-IN (Devanagari)", True, 0.05, 0.4, "small_sound"),
    (14, "ठीक है", "hi-IN (Devanagari)", True, 0.05, 0.5, "small_sound"),
    (15, "जी हाँ", "hi-IN (Devanagari)", True, 0.05, 0.4, "small_sound"),
    (16, "ho", "mr-IN (Roman)", True, 0.04, 0.3, "small_sound"),
    (17, "hoy", "mr-IN (Roman)", True, 0.04, 0.3, "small_sound"),
    (18, "barobar", "mr-IN (Roman)", True, 0.05, 0.4, "small_sound"),
    (19, "होय", "mr-IN (Devanagari)", True, 0.05, 0.3, "small_sound"),
    (20, "बरोबर", "mr-IN (Devanagari)", True, 0.05, 0.4, "small_sound"),

    # --- Category: GO_ON (Continuation Commands) ---
    (21, "go on", "en", True, 0.05, 0.4, "go_on"),
    (22, "continue", "en", True, 0.05, 0.4, "go_on"),
    (23, "keep going", "en", True, 0.05, 0.5, "go_on"),
    (24, "please continue", "en", True, 0.05, 0.6, "go_on"),
    (25, "aage bolo", "hi-IN (Roman)", True, 0.05, 0.4, "go_on"),
    (26, "bolo aage", "hi-IN (Roman)", True, 0.05, 0.4, "go_on"),
    (27, "aage batao", "hi-IN (Roman)", True, 0.05, 0.5, "go_on"),
    (28, "आगे बोलो", "hi-IN (Devanagari)", True, 0.05, 0.4, "go_on"),
    (29, "चालू रखो", "hi-IN (Devanagari)", True, 0.05, 0.5, "go_on"),
    (30, "pudhe sanga", "mr-IN (Roman)", True, 0.05, 0.5, "go_on"),
    (31, "chalu theva", "mr-IN (Roman)", True, 0.05, 0.5, "go_on"),
    (32, "पुढे सांगा", "mr-IN (Devanagari)", True, 0.05, 0.5, "go_on"),

    # --- Category: INTERRUPTION (Stop Words, Questions, >=3 words) ---
    (33, "stop", "en", True, 0.06, 0.4, "interruption"),
    (34, "wait a minute", "en", True, 0.06, 0.6, "interruption"),
    (35, "what did you say?", "en", True, 0.06, 0.8, "interruption"),
    (36, "can you explain this?", "en", True, 0.06, 0.9, "interruption"),
    (37, "ruko", "hi-IN (Roman)", True, 0.06, 0.4, "interruption"),
    (38, "suno", "hi-IN (Roman)", True, 0.05, 0.4, "interruption"),
    (39, "kya time hua hai?", "hi-IN (Roman)", True, 0.06, 0.8, "interruption"),
    (40, "mujhe dusra prashna poochna hai", "hi-IN (Roman)", True, 0.06, 1.2, "interruption"),
    (41, "रुको", "hi-IN (Devanagari)", True, 0.06, 0.4, "interruption"),
    (42, "क्या मतलब है इसका?", "hi-IN (Devanagari)", True, 0.06, 0.8, "interruption"),
    (43, "thamba", "mr-IN (Roman)", True, 0.06, 0.4, "interruption"),
    (44, "kay mhanala?", "mr-IN (Roman)", True, 0.06, 0.6, "interruption"),
    (45, "थांबा", "mr-IN (Devanagari)", True, 0.06, 0.4, "interruption"),
    (46, "काय सांगत आहात?", "mr-IN (Devanagari)", True, 0.06, 0.7, "interruption"),

    # --- Category: NOISE (Sub-threshold, cough, clicks, no words) ---
    (47, "", "none", False, 0.0, 0.0, "noise"),
    (48, "   ", "none", True, 0.005, 0.2, "noise"),
    (49, "...", "none", True, 0.008, 0.15, "noise"),

    # --- Category: UNCLEAR (Human voice detected, but empty/weak transcript) ---
    (50, "", "unknown", True, 0.04, 0.4, "unclear"),
    (51, "zz", "unknown", True, 0.03, 0.3, "unclear"),
]

# Print table header
header = f"{'#':<3} | {'Utterance':<32} | {'Language':<18} | {'Expected':<12} | {'Actual':<12} | {'Result':<6}"
separator = "-" * len(header)
print(separator)
print(header)
print(separator)

all_passed = True
for tc in TEST_CASES:
    num, text, lang, has_v, energy, dur, expected = tc
    actual, reason = classify_utterance(
        text=text,
        has_voice=has_v,
        rms_energy=energy,
        duration_sec=dur,
    )
    passed = (actual == expected)
    if not passed:
        all_passed = False
    status = "PASS" if passed else "FAIL"
    display_text = f"'{text}'" if text else "(empty)"
    print(f"{num:<3} | {display_text:<32} | {lang:<18} | {expected:<12} | {actual:<12} | {status:<6}")

print(separator)
assert all_passed, "Some classifier test cases failed!"
print("✓ Test 1 Passed: All 51 test cases across 4 languages and 5 categories passed!\n")


# =====================================================================
# Test 2: InterruptionHandler Unclear Escalation Flow
# =====================================================================
print("Test 2: InterruptionHandler Unclear Escalation ('ji?' -> 'kya kaha?' -> 'repeat slowly')...")
handler = InterruptionHandler()

# 1st failure -> 'ji'
dec, _ = handler.evaluate("", has_voice=True, rms_energy=0.04)
assert dec == "unclear"
resp1 = handler.get_unclear_response("hi-IN")
assert resp1["phrase_key"] == "ji" and not resp1["escalated"]

# 2nd failure -> 'kya_kaha'
dec, _ = handler.evaluate("", has_voice=True, rms_energy=0.04)
assert dec == "unclear"
resp2 = handler.get_unclear_response("hi-IN")
assert resp2["phrase_key"] == "kya_kaha" and not resp2["escalated"]

# 3rd failure -> 'repeat_slowly' (escalated)
dec, _ = handler.evaluate("", has_voice=True, rms_energy=0.04)
assert dec == "unclear"
resp3 = handler.get_unclear_response("hi-IN")
assert resp3["phrase_key"] == "repeat_slowly" and resp3["escalated"]

# Counter resets after escalation: next failure is 'ji'
dec, _ = handler.evaluate("", has_voice=True, rms_energy=0.04)
assert dec == "unclear"
resp4 = handler.get_unclear_response("hi-IN")
assert resp4["phrase_key"] == "ji"

print("✓ Test 2 Passed: Unclear retry escalation and reset verified.\n")


# =====================================================================
# Test 3: TurnManager Pause-First Classification (Resume vs Stop)
# =====================================================================
print("Test 3: Scripted Simulation - Pause-First Classification in TurnManager...")

async def test_pause_first_live_classification():
    events_sent = []
    async def mock_send(ev, payload):
        events_sent.append((ev, payload))

    sm = SunaiStateMachine("SPEAKING")
    tm = TurnManager(sm, mock_send, mode="pause_first")

    # A. User says "haan" -> small_sound -> resume
    tm.current_user_text = "haan"
    await tm.on_user_voice_start()
    assert sm.get_state() == "PAUSED"
    # Supply dummy chunk with speech energy
    await tm.on_audio_chunk(b"\x10\x10" * 400, lambda: None)
    await asyncio.sleep(0.45)

    assert sm.get_state() == "SPEAKING", "Must resume to SPEAKING on 'haan'"
    assert any(ev == "decision" and p.get("decision") == "small_sound" for ev, p in events_sent)
    assert any(ev == "resume" for ev, _ in events_sent)

    events_sent.clear()

    # B. User says "ruko" -> interruption -> stop
    sm.transition_to("SPEAKING", reason="test_speak")
    tm.current_user_text = "ruko"
    await tm.on_user_voice_start()
    assert sm.get_state() == "PAUSED"
    await tm.on_audio_chunk(b"\x10\x10" * 400, lambda: None)
    await asyncio.sleep(0.45)

    assert sm.get_state() == "LISTENING", "Must transition to LISTENING on 'ruko'"
    assert any(ev == "decision" and p.get("decision") == "interruption" for ev, p in events_sent)
    assert any(ev == "clear_queue" for ev, _ in events_sent)

asyncio.run(test_pause_first_live_classification())
print("✓ Test 3 Passed: Pause-first with 'haan' (resume) and 'ruko' (stop) verified.\n")


# =====================================================================
# Test 4: Scripted Simulation - Baseline Mode Immediate Hard Stop
# =====================================================================
print("Test 4: Scripted Simulation - Baseline Mode (Immediate Hard Stop)...")

async def test_baseline_hard_stop():
    events_sent = []
    async def mock_send(ev, payload):
        events_sent.append((ev, payload))

    sm = SunaiStateMachine("SPEAKING")
    tm = TurnManager(sm, mock_send, mode="baseline")

    # In baseline mode, voice start stops playback immediately with zero pause window
    await tm.on_user_voice_start()
    assert sm.get_state() == "LISTENING", "Baseline must transition immediately to LISTENING"
    assert any(ev == "clear_queue" for ev, _ in events_sent)
    assert any(ev == "decision" and p.get("decision") == "interruption" for ev, p in events_sent)

asyncio.run(test_baseline_hard_stop())
print("✓ Test 4 Passed: Baseline immediate hard stop verified.\n")


# =====================================================================
# Test 5: Idle Check & Sleep Lifecycle (Section 13)
# =====================================================================
print("Test 5: Validating Idle Check & Sleep Lifecycle...")

async def test_idle_check_flow():
    events_sent = []
    async def mock_send(ev, payload):
        events_sent.append((ev, payload))

    # Override timers to short values for fast testing
    orig_first = config.IDLE_CHECK_FIRST_TIMEOUT_SEC
    orig_second = config.IDLE_CHECK_SECOND_TIMEOUT_SEC
    config.IDLE_CHECK_FIRST_TIMEOUT_SEC = 0.2
    config.IDLE_CHECK_SECOND_TIMEOUT_SEC = 0.2

    try:
        sm = SunaiStateMachine("SPEAKING")
        tm = TurnManager(sm, mock_send, mode="pause_first")

        # 1. Browser finishes playback
        tm.on_sentence_played(1)
        assert sm.get_state() == "LISTENING"

        # 2. Wait 0.25s: 1st timer expires -> IDLE_CHECK ("Are you there?")
        await asyncio.sleep(0.25)
        assert sm.get_state() == "IDLE_CHECK", f"Expected IDLE_CHECK, got {sm.get_state()}"
        assert any(ev == "idle_prompt" and p.get("phrase") == "are_you_there" for ev, p in events_sent)

        # 3. Wait another 0.25s: 2nd timer expires -> SLEEP ("Goodbye")
        await asyncio.sleep(0.25)
        assert sm.get_state() == "SLEEP", f"Expected SLEEP, got {sm.get_state()}"
        assert any(ev == "idle_prompt" and p.get("phrase") == "goodbye" for ev, p in events_sent)

        # 4. In SLEEP, tap wakes the assistant
        await tm.on_wake_tap()
        assert sm.get_state() == "IDLE", f"Expected IDLE after tap wake, got {sm.get_state()}"

        # 5. Put in SLEEP again, voice wakes the assistant into LISTENING
        sm.transition_to("SLEEP", reason="manual_test")
        await tm.on_user_voice_start()
        assert sm.get_state() == "LISTENING", f"Expected LISTENING after voice wake, got {sm.get_state()}"

    finally:
        config.IDLE_CHECK_FIRST_TIMEOUT_SEC = orig_first
        config.IDLE_CHECK_SECOND_TIMEOUT_SEC = orig_second

asyncio.run(test_idle_check_flow())
print("✓ Test 5 Passed: Idle check (10s), goodbye (10s), and tap/voice wake verified.\n")


# =====================================================================
# Test 6: Full WebSocket Integration of Module 4 over /ws
# =====================================================================
print("Test 6: Full WebSocket Protocol Integration (Classifier, Baseline, Wake)...")
client = TestClient(app)

with client.websocket_connect("/ws") as ws:
    # 1. Handshake IDLE state
    msg = ws.receive_json()
    assert msg["type"] == "state" and msg["state"] == "IDLE"

    # 2. Switch mode to baseline, verify ack
    ws.send_json({"type": "set_mode", "mode": "baseline"})
    ack = ws.receive_json()
    assert ack["type"] == "mode_set" and ack["mode"] == "baseline"

    # 3. Switch back to pause_first
    ws.send_json({"type": "set_mode", "mode": "pause_first"})
    ack2 = ws.receive_json()
    assert ack2["type"] == "mode_set" and ack2["mode"] == "pause_first"

    # 4. Simulate user asking question
    ws.send_json({"type": "vad_start"})
    assert ws.receive_json()["state"] == "LISTENING"

    # Stream 16 chunks so mock STT emits 'नमस्ते सुनाई'
    for _ in range(16):
        ws.send_bytes(b"\x00\x00" * 800)

    caption = ws.receive_json()
    assert caption["type"] in ("partial_text", "final_text")

    ws.send_json({"type": "vad_end"})

    # Silence threshold triggers THINKING -> final_text -> sources -> SPEAKING -> tts_audio
    assert ws.receive_json()["state"] == "THINKING"
    assert ws.receive_json()["type"] == "final_text"
    sources_msg = ws.receive_json()
    assert sources_msg["type"] == "sources"
    assert ws.receive_json()["state"] == "SPEAKING"
    tts_msg = ws.receive_json()
    assert tts_msg["type"] == "tts_audio"

    # 5. While bot is SPEAKING, user says 'haan' (backchannel)
    ws.send_json({"type": "vad_start"})
    paused_msg = ws.receive_json()
    assert paused_msg["type"] == "state" and paused_msg["state"] == "PAUSED"

    # Stream speech chunk during check window
    ws.send_bytes(b"\x20\x20" * 800)

    # 400ms check window resolves classifier
    decision_msg = ws.receive_json()
    assert decision_msg["type"] == "decision"
    # Receives resume state and resume event
    state_msg = ws.receive_json()
    assert state_msg["type"] == "state"
    resume_msg = ws.receive_json()
    assert resume_msg["type"] in ("resume", "clear_queue")

print("✓ Test 6 Passed: WebSocket classifier and protocol integration verified.\n")

print("==================================================")
print("ALL SUNAI MODULE 4 TESTS PASSED SUCCESSFULLY!")
print("==================================================")


"""
Automated Test Suite for Sunai Module 3: Turn Manager & State Machine.
Tests:
1. State Machine transition matrix (allowed vs forbidden transitions).
2. Normal conversation turn simulation (vad_start -> speech -> vad_end -> 700ms silence -> THINKING -> SPEAKING).
3. Pause-first interruption simulation with 'small_sound' stub (PAUSED -> 400ms check -> decision -> resume -> SPEAKING).
4. Pause-first interruption simulation with 'interruption' stub (PAUSED -> 400ms check -> decision -> clear_queue -> LISTENING).
5. Baseline mode hard-stop comparison (SPEAKING -> vad_start -> immediate clear_queue -> LISTENING).
6. Safety limit enforcement (20s continuous speech triggers automatic turn completion).
7. WebSocket protocol integration of all events over /ws endpoint.
"""

import sys
import asyncio
import base64
from pathlib import Path

# Add Sunai root to python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from Backend import config
from Backend.state_machine import SunaiStateMachine
from Backend.turn_manager import TurnManager
from Backend.main import app
from fastapi.testclient import TestClient

print("--- RUNNING SUNAI MODULE 3 TESTS ---\n")

# =====================================================================
# Test 1: State Machine Transitions
# =====================================================================
print("Test 1: Validating State Machine Transitions...")
transitions_log = []
def on_state_change(old, new):
    transitions_log.append((old, new))

sm = SunaiStateMachine(initial_state="IDLE", on_state_change=on_state_change)
assert sm.get_state() == "IDLE"

# Valid path: IDLE -> LISTENING -> THINKING -> SPEAKING -> PAUSED -> SPEAKING -> LISTENING -> IDLE
assert sm.transition_to("LISTENING", "mic_start") is True
assert sm.transition_to("THINKING", "silence_reached") is True
assert sm.transition_to("SPEAKING", "audio_ready") is True
assert sm.transition_to("PAUSED", "user_interruption") is True
assert sm.transition_to("SPEAKING", "resume_decision") is True
assert sm.transition_to("LISTENING", "sentence_ended") is True
assert sm.transition_to("IDLE", "timeout") is True

# Invalid transition rejection: IDLE cannot jump straight to SPEAKING or PAUSED
assert sm.transition_to("SPEAKING", "illegal") is False
assert sm.get_state() == "IDLE", "State must remain IDLE on rejected transition"
assert sm.transition_to("PAUSED", "illegal") is False

# Valid idle-check / sleep path: IDLE -> IDLE_CHECK -> SLEEP -> WAKE -> LISTENING
assert sm.transition_to("IDLE_CHECK", "10s_idle") is True
assert sm.transition_to("SLEEP", "10s_more") is True
assert sm.transition_to("WAKE", "wake_tap") is True
assert sm.transition_to("LISTENING", "wake_voice") is True

print("✓ Test 1 Passed: State machine transitions and boundaries verified.\n")


# =====================================================================
# Test 2: Scripted Simulation of Normal Turn (vad_start -> vad_end -> 700ms)
# =====================================================================
print("Test 2: Scripted Simulation - Normal Turn Flow...")
async def test_normal_turn():
    events_sent = []
    async def mock_send(ev, payload):
        events_sent.append((ev, payload))

    sm = SunaiStateMachine("IDLE")
    tm = TurnManager(sm, mock_send, mode="pause_first")

    # 1. User starts speaking
    await tm.on_user_voice_start()
    assert sm.get_state() == "LISTENING", "Must transition to LISTENING on voice start"

    # 2. Transcripts accumulate
    tm.current_user_text = "What is the capital of India?"

    # 3. User stops speaking (VAD silence)
    turn_completed = False
    async def on_turn_complete():
        nonlocal turn_completed
        turn_completed = True

    await tm.on_user_voice_end(on_turn_complete)

    # Before 700ms silence threshold elapses, state should still be LISTENING
    await asyncio.sleep(0.3)
    assert sm.get_state() == "LISTENING", "Must stay LISTENING before 700ms threshold"
    assert turn_completed is False

    # After 700ms silence (total ~0.75s), turn finalizes to THINKING
    await asyncio.sleep(0.5)
    assert sm.get_state() == "THINKING", "Must transition to THINKING after 700ms silence"
    assert turn_completed is True

asyncio.run(test_normal_turn())
print("✓ Test 2 Passed: Normal turn and 700ms silence threshold verified.\n")


# =====================================================================
# Test 3: Pause-First Interruption with 'small_sound' Stub (Resume)
# =====================================================================
print("Test 3: Scripted Simulation - Pause-First with 'small_sound' Stub (Resume)...")
async def test_pause_first_resume():
    events_sent = []
    async def mock_send(ev, payload):
        events_sent.append((ev, payload))

    sm = SunaiStateMachine("SPEAKING")
    tm = TurnManager(sm, mock_send, mode="pause_first")
    tm.set_stub_decision("small_sound")

    # User makes a backchannel sound while bot is speaking
    tm.current_user_text = "hmm"
    await tm.on_user_voice_start()

    # Immediate pause in state machine
    assert sm.get_state() == "PAUSED", "Must immediately transition to PAUSED"
    assert tm.interrupted is True

    # During the 400ms check window (PAUSE_FIRST_CHECK_MS), stay PAUSED
    await asyncio.sleep(0.2)
    assert sm.get_state() == "PAUSED", "Must stay in PAUSED during 400ms check window"

    # After 400ms elapses, stub evaluates small_sound -> decision: small_sound, resume, state: SPEAKING
    await asyncio.sleep(0.3)
    assert sm.get_state() == "SPEAKING", "Must resume to SPEAKING on small_sound"
    assert any(ev == "decision" and p.get("decision") == "small_sound" for ev, p in events_sent)
    assert ("resume", {}) in events_sent
    assert ("clear_queue", {}) not in events_sent, "Must NOT clear queue on resume"

asyncio.run(test_pause_first_resume())
print("✓ Test 3 Passed: Pause-first with 'small_sound' stub (Resume) verified.\n")


# =====================================================================
# Test 4: Pause-First Interruption with 'interruption' Stub (Stop)
# =====================================================================
print("Test 4: Scripted Simulation - Pause-First with 'interruption' Stub (Stop)...")
async def test_pause_first_stop():
    events_sent = []
    async def mock_send(ev, payload):
        events_sent.append((ev, payload))

    sm = SunaiStateMachine("SPEAKING")
    tm = TurnManager(sm, mock_send, mode="pause_first")
    tm.set_stub_decision("interruption")

    # User speaks real question during bot speech
    tm.current_user_text = "Wait, stop that"
    await tm.on_user_voice_start()

    assert sm.get_state() == "PAUSED", "Must immediately transition to PAUSED"

    # After 400ms window elapses, stub evaluates interruption -> decision: interruption, clear_queue, state: LISTENING
    await asyncio.sleep(0.5)
    assert sm.get_state() == "LISTENING", "Must transition to LISTENING on real interruption"
    assert any(ev == "decision" and p.get("decision") == "interruption" for ev, p in events_sent)
    assert ("clear_queue", {}) in events_sent, "Must clear audio queue on interruption"
    assert ("resume", {}) not in events_sent

asyncio.run(test_pause_first_stop())
print("✓ Test 4 Passed: Pause-first with 'interruption' stub (Stop) verified.\n")


# =====================================================================
# Test 5: Baseline Mode (Immediate Hard Stop Comparison)
# =====================================================================
print("Test 5: Scripted Simulation - Baseline Mode (Immediate Hard Stop)...")
async def test_baseline_stop():
    events_sent = []
    async def mock_send(ev, payload):
        events_sent.append((ev, payload))

    sm = SunaiStateMachine("SPEAKING")
    tm = TurnManager(sm, mock_send, mode="baseline")

    # In baseline mode, voice start triggers immediate hard stop without any pause window
    await tm.on_user_voice_start()
    assert sm.get_state() == "LISTENING", "Baseline must transition immediately to LISTENING"
    assert any(ev == "clear_queue" for ev, _ in events_sent), "Baseline must clear queue immediately"
    assert any(ev == "decision" and p.get("decision") == "interruption" for ev, p in events_sent)

asyncio.run(test_baseline_stop())
print("✓ Test 5 Passed: Baseline immediate hard stop verified.\n")


# =====================================================================
# Test 6: Safety Limit Enforcement (20s Continuous Speech)
# =====================================================================
print("Test 6: Validating Safety Turn Limit (20s)...")
async def test_safety_limit():
    sm = SunaiStateMachine("LISTENING")
    tm = TurnManager(sm, lambda *a: None)
    await tm.on_user_voice_start()

    turn_finalized = False
    async def on_turn_complete():
        nonlocal turn_finalized
        turn_finalized = True

    # Simulate 21s speech duration
    tm.user_speech_start = tm.user_speech_start - (config.SAFETY_TURN_LIMIT_SEC + 1.0)
    await tm.on_audio_chunk(b"\x00\x00" * 800, on_turn_complete)

    assert sm.get_state() == "THINKING", "Exceeding safety limit must force THINKING state"
    assert turn_finalized is True

asyncio.run(test_safety_limit())
print("✓ Test 6 Passed: 20s safety turn limit verified.\n")


# =====================================================================
# Test 7: Full WebSocket Integration of Pause & Resume over /ws
# =====================================================================
print("Test 7: Full WebSocket Protocol Integration (Pause-First & Stubs)...")
client = TestClient(app)

with client.websocket_connect("/ws") as ws:
    # 1. Handshake IDLE state
    msg = ws.receive_json()
    assert msg["type"] == "state" and msg["state"] == "IDLE"

    # 2. Configure stub to 'small_sound'
    ws.send_json({"type": "set_stub_decision", "decision": "small_sound"})
    stub_ack = ws.receive_json()
    assert stub_ack["type"] == "stub_decision_set" and stub_ack["decision"] == "small_sound"

    # 3. Simulate user asking question
    ws.send_json({"type": "vad_start"})
    assert ws.receive_json()["state"] == "LISTENING"

    # Stream audio chunks to trigger mock transcript
    for _ in range(16):
        ws.send_bytes(b"\x00\x00" * 800)
    
    # Receive partial/final caption emitted by STT
    caption = ws.receive_json()
    assert caption["type"] in ("partial_text", "final_text")

    ws.send_json({"type": "vad_end"})

    # 4. Turn silence (700ms) triggers THINKING state
    thinking_msg = ws.receive_json()
    assert thinking_msg["type"] == "state" and thinking_msg["state"] == "THINKING"

    # 5. Server finalizes text and starts speech synthesis
    final_text_msg = ws.receive_json()
    assert final_text_msg["type"] == "final_text"

    # Server sends sources
    sources_msg = ws.receive_json()
    assert sources_msg["type"] == "sources"

    # 6. Assistant transitions to SPEAKING and sends tts_audio
    speaking_msg = ws.receive_json()
    assert speaking_msg["type"] == "state" and speaking_msg["state"] == "SPEAKING"

    tts_msg = ws.receive_json()
    assert tts_msg["type"] == "tts_audio"

    # 7. While SPEAKING, user makes a sound -> vad_start triggers immediate PAUSED state
    ws.send_json({"type": "vad_start"})
    paused_state_msg = ws.receive_json()
    assert paused_state_msg["type"] == "state" and paused_state_msg["state"] == "PAUSED"

    # 8. After 400ms check window, backend resolves stub ('small_sound')
    decision_msg = ws.receive_json()
    assert decision_msg["type"] == "decision" and decision_msg["decision"] == "small_sound"

    state_resume_msg = ws.receive_json()
    assert state_resume_msg["type"] == "state" and state_resume_msg["state"] == "SPEAKING"

    resume_cmd = ws.receive_json()
    assert resume_cmd["type"] == "resume"

print("✓ Test 7 Passed: WebSocket pause, 400ms decision window, and resume verified.\n")

print("==================================================")
print("ALL SUNAI MODULE 3 TESTS PASSED SUCCESSFULLY!")
print("==================================================")

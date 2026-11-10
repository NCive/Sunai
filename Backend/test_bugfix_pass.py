"""
Automated Test Suite for Sunai Bug-Fix Pass.
Validates fixes for all 6 scenarios:
1. Loop prevention (no repeat finalize after turn completion)
2. Interruption during speech (SPEAKING -> PAUSED -> classified -> answers new question)
3. Backchannel handling (SPEAKING -> PAUSED -> backchannel -> resumes SPEAKING)
4. Filler playback tracking (filler does not prematurely end turn; real sentence advances)
5. Safety timer lifecycle (starts on voice onset, cancels on finalize, never fires on idle audio)
6. Audio cache & manifest verification (manifest exists, valid SHA256, timbre_api source, no synthetic fallbacks)
"""

import asyncio
import hashlib
import json
from pathlib import Path
import struct
import sys
import time

# Ensure Sunai root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from Backend import config
from Backend.state_machine import SunaiStateMachine
from Backend.turn_manager import TurnManager
from Backend.audio_cache_manager import ensure_audio_cache, get_cached_audio


def make_dummy_pcm(duration_sec: float = 0.1, sample_rate: int = 16000, amplitude: int = 1500) -> bytes:
    """Generates dummy 16-bit linear PCM audio chunk."""
    samples = int(duration_sec * sample_rate)
    return struct.pack(f"<{samples}h", *([amplitude] * samples))


async def test_scenario_1_loop_prevention():
    print("\n--- [SCENARIO 1] Testing Loop Prevention ---")
    events = []

    async def mock_send_event(event_type: str, payload: dict):
        events.append((event_type, payload))

    sm = SunaiStateMachine(initial_state="IDLE")
    tm = TurnManager(state_machine=sm, send_event=mock_send_event)

    finalize_calls = []

    async def on_turn_complete(text=None):
        finalize_calls.append(text)

    # 1. Start user turn
    await tm.on_user_voice_start()
    assert sm.get_state() == "LISTENING"
    assert tm.has_new_speech is True

    # 2. Feed user question
    tm.current_user_text = "Give me details about GNIAI."
    tm.has_final_transcript = True

    # 3. User finishes speaking -> silence wait
    await tm.on_user_voice_end(on_turn_complete)
    # Wait for 700ms silence timer
    await asyncio.sleep(0.8)

    # Must be finalized once
    assert len(finalize_calls) == 1, f"Expected 1 finalize call, got {len(finalize_calls)}"
    assert finalize_calls[0] == "Give me details about GNIAI."
    assert sm.get_state() == "THINKING"
    assert tm.current_user_text == "", "Buffer must be empty after finalize"
    assert tm.has_new_speech is False, "has_new_speech must be reset"
    assert tm.user_speech_start is None, "user_speech_start must be None"
    print("✓ Initial turn finalized cleanly into THINKING")

    # 4. Assistant transitions to SPEAKING and finishes playback -> LISTENING
    sm.transition_to("SPEAKING", reason="tts_ready")
    tm.on_turn_started(1)
    tm.set_turn_last_sentence(1, 1)
    tm.on_sentence_played(1, turn_id=1, kind="sentence")
    assert sm.get_state() == "LISTENING", "State should return to LISTENING after answer"
    print("✓ Assistant returned to LISTENING")

    # 5. Continuous audio chunks arrive in LISTENING while user is SILENT
    dummy_audio = make_dummy_pcm(0.1)
    for _ in range(30):  # Simulate 3 seconds of silent chunks
        await tm.on_audio_chunk(dummy_audio, on_turn_complete)
        await asyncio.sleep(0.01)

    # Verify no loop occurred
    assert len(finalize_calls) == 1, f"Loop detected! Finalize called {len(finalize_calls)} times"
    assert tm.current_user_text == ""
    tm.reset_user_turn()
    await asyncio.sleep(0)
    print("✓ Scenario 1 PASSED: Audio chunks in LISTENING did NOT trigger repeat turn finalize.")


async def test_scenario_2_interruption():
    print("\n--- [SCENARIO 2] Testing Interruption During Speech ---")
    events = []
    interrupted_called = False

    async def mock_send_event(event_type: str, payload: dict):
        events.append((event_type, payload))

    def on_interruption():
        nonlocal interrupted_called
        interrupted_called = True

    sm = SunaiStateMachine(initial_state="SPEAKING")
    tm = TurnManager(state_machine=sm, send_event=mock_send_event, on_interruption=on_interruption)

    new_turn_calls = []

    async def on_turn_complete(text=None):
        new_turn_calls.append(text)

    tm.on_turn_complete_cb = on_turn_complete

    # 1. Bot is speaking, user interrupts with a question
    await tm.on_user_voice_start()
    assert sm.get_state() == "PAUSED", f"Expected PAUSED, got {sm.get_state()}"
    print("✓ SPEAKING transitioned immediately to PAUSED on user voice start")

    # Feed speech text during paused classification window
    tm.current_user_text = "Ruko, ek sawal hai"
    # Feed energy samples (speech level RMS ~0.06 > 0.015 threshold)
    for _ in range(5):
        await tm.on_audio_chunk(make_dummy_pcm(0.05, amplitude=2000), on_turn_complete)

    # Wait for pause evaluation window (400ms)
    await asyncio.sleep(0.5)

    assert interrupted_called is True, "on_interruption hook must be called"
    clear_events = [e for e in events if e[0] == "clear_queue"]
    assert len(clear_events) > 0, "clear_queue event must be emitted"
    dec_events = [e for e in events if e[0] == "decision" and e[1].get("decision") == "interruption"]
    assert len(dec_events) > 0, "interruption decision event must be emitted"

    # Because "Ruko, ek sawal hai" looks finished, turn should finalize into THINKING
    assert sm.get_state() == "THINKING", f"Expected THINKING for new question, got {sm.get_state()}"
    assert len(new_turn_calls) == 1, "New question must be dispatched for processing"
    tm.reset_user_turn()
    await asyncio.sleep(0)
    print("✓ Scenario 2 PASSED: Interrupted cleanly, cleared queue, and moved to THINKING for new question.")


async def test_scenario_3_backchannel():
    print("\n--- [SCENARIO 3] Testing Backchannel Resumption ---")
    events = []

    async def mock_send_event(event_type: str, payload: dict):
        events.append((event_type, payload))

    sm = SunaiStateMachine(initial_state="SPEAKING")
    tm = TurnManager(state_machine=sm, send_event=mock_send_event)

    # 1. Bot is speaking, user says "hmm"
    await tm.on_user_voice_start()
    assert sm.get_state() == "PAUSED"

    tm.current_user_text = "hmm"
    for _ in range(5):
        await tm.on_audio_chunk(make_dummy_pcm(0.05, amplitude=2000), lambda *a: None)
    # Wait for pause evaluation window
    await asyncio.sleep(0.5)

    resume_events = [e for e in events if e[0] == "resume"]
    assert len(resume_events) > 0, "resume event must be emitted for backchannel"
    assert sm.get_state() == "SPEAKING", f"Expected SPEAKING after resume, got {sm.get_state()}"
    tm.reset_user_turn()
    await asyncio.sleep(0)
    print("✓ Scenario 3 PASSED: 'hmm' classified as backchannel and resumed SPEAKING without stopping bot.")


async def test_scenario_4_filler_playback():
    print("\n--- [SCENARIO 4] Testing Filler Playback Tracking ---")
    events = []

    async def mock_send_event(event_type: str, payload: dict):
        events.append((event_type, payload))

    sm = SunaiStateMachine(initial_state="THINKING")
    tm = TurnManager(state_machine=sm, send_event=mock_send_event)

    turn_id = 1
    tm.on_turn_started(turn_id)

    # 1. "please wait" filler clip plays during THINKING
    sm.transition_to("SPEAKING", reason="interim_please_wait")
    assert sm.get_state() == "SPEAKING"

    # Browser finishes playing filler clip (sentence_id=0, kind="filler")
    tm.on_sentence_played(0, turn_id=turn_id, kind="filler")
    # State MUST NOT drop to LISTENING!
    assert sm.get_state() == "SPEAKING", f"Filler prematurely transitioned state to {sm.get_state()}"
    print("✓ Filler clip did NOT transition state to LISTENING")

    # 2. Real sentence 1 arrives and plays
    tm.on_sentence_started(1)
    tm.on_sentence_played(1, turn_id=turn_id, kind="sentence")
    # LLM is still generating sentence 2, so state must still remain SPEAKING
    assert sm.get_state() == "SPEAKING", "Sentence 1 finished, but sentence 2 still generating"

    # 3. Real sentence 2 arrives and generation completes
    tm.on_sentence_started(2)
    tm.set_turn_last_sentence(turn_id, 2)
    # Sentence 2 finishes playing
    tm.on_sentence_played(2, turn_id=turn_id, kind="sentence")

    # Now all sentences are played, state transitions to LISTENING
    assert sm.get_state() == "LISTENING", f"Expected LISTENING after all sentences, got {sm.get_state()}"
    tm.reset_user_turn()
    await asyncio.sleep(0)
    print("✓ Scenario 4 PASSED: Filler ignored for turn end; proper last-sentence tracking completed turn.")


async def test_scenario_5_safety_timer():
    print("\n--- [SCENARIO 5] Testing Safety Timer Lifecycle ---")
    events = []

    async def mock_send_event(event_type: str, payload: dict):
        events.append((event_type, payload))

    sm = SunaiStateMachine(initial_state="LISTENING")
    tm = TurnManager(state_machine=sm, send_event=mock_send_event)

    finalized = []

    async def on_turn_complete(text=None):
        finalized.append(text)

    # 1. Idle audio chunks arrive while user is NOT speaking
    # Safety timer must NEVER trigger
    dummy_chunk = make_dummy_pcm(0.1, amplitude=0)
    tm.user_speech_start = time.time() - 30.0  # Old stale timestamp if any
    tm.has_new_speech = False  # User hasn't spoken

    await tm.on_audio_chunk(dummy_chunk, on_turn_complete)
    assert len(finalized) == 0, "Safety timer must never fire on idle audio without voice onset"
    print("✓ Idle audio does not trigger safety timer")

    # 2. User voice onset occurs
    await tm.on_user_voice_start()
    assert tm.has_new_speech is True
    assert tm.user_speech_start is not None
    tm.current_user_text = "Hello Sunai, this is a very long speech question..."

    # Simulate 21s passing during active speech
    tm.user_speech_start = time.time() - (config.SAFETY_TURN_LIMIT_SEC + 1.0)
    await tm.on_audio_chunk(make_dummy_pcm(0.1, amplitude=2000), on_turn_complete)

    assert len(finalized) == 1, "Safety timer should force finalize on active speech > 20s"
    assert sm.get_state() == "THINKING"
    assert tm.user_speech_start is None
    assert tm.has_new_speech is False
    tm.reset_user_turn()
    await asyncio.sleep(0)
    print("✓ Scenario 5 PASSED: Safety timer enforces 20s limit only on active voice, resets on finalize.")


def test_scenario_6_cache_manifest():
    print("\n--- [SCENARIO 6] Testing Audio Cache & Manifest ---")
    cache_dir = config.AUDIO_CACHE_DIR
    manifest_path = cache_dir / "manifest.json"

    assert manifest_path.exists(), f"Manifest file missing at {manifest_path}"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    # Must contain 7 phrases x 3 languages = 21 clips
    assert len(manifest) == 21, f"Expected 21 manifest entries, got {len(manifest)}"

    for key, entry in manifest.items():
        assert entry.get("source") == "timbre_api", f"Entry {key} source is not timbre_api"
        assert entry.get("model") == "timbre-v2.5"
        rel_path = entry.get("file_path")
        wav_file = cache_dir / rel_path
        assert wav_file.exists(), f"WAV file {wav_file} does not exist"

        data = wav_file.read_bytes()
        assert len(data) > 1000, f"WAV file {key} is unexpectedly small ({len(data)} bytes)"
        digest = hashlib.sha256(data).hexdigest()
        assert digest == entry.get("sha256"), f"SHA256 mismatch for {key}"

        # Confirm not synthetic fallback (synthetic ji.wav was exactly 48044 bytes, timbre ji is ~20524 bytes)
        duration = entry.get("duration_seconds", 0)
        assert 0.1 <= duration <= 15.0, f"Invalid duration {duration}s for {key}"

    # Verify ensure_audio_cache validation passes
    ensure_audio_cache()
    print("✓ Scenario 6 PASSED: All 21 cache files verified via manifest with valid SHA256 and timbre_api source.")


async def main_async():
    print("==================================================")
    print("     SUNAI BUG-FIX PASS VERIFICATION SUITE       ")
    print("==================================================")

    await test_scenario_1_loop_prevention()
    await test_scenario_2_interruption()
    await test_scenario_3_backchannel()
    await test_scenario_4_filler_playback()
    await test_scenario_5_safety_timer()
    test_scenario_6_cache_manifest()

    print("\n==================================================")
    print("     ALL 6 SCENARIOS PASSED WITH ZERO ERRORS!     ")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(main_async())

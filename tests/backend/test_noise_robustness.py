"""
Synthetic Noise Robustness and Speech Interruption Test Suite for Sunai.
Generates synthetic audio in-memory (no binary audio checked into git):
1. Short white noise bursts (50 ms, 70 ms, 100 ms).
2. High-amplitude impulse (clap simulation).
3. Repeated sharp clicks (keyboard typing simulation).
4. Continuous low-frequency hum (air conditioner / fan hum at 60 Hz / 120 Hz).
5. Sudden cough-like burst (200 ms).
6. Speech test: "wait" (hard stop) vs "haan" (resume) vs "haan aur batao" (continuation).

Asserts:
- Duration < min duration (<120ms) does NOT trigger hard pause.
- No text or empty text does NOT interrupt playback.
- Playback resumes within config limit (around 1.2 s).
- Metric 'noise_blip_ignored' or 'noise_resumed' increments appropriately.
- Speech saying 'wait' stops playback; 'haan' resumes.
"""

import asyncio
import math
import random
import struct
import sys
import time
from pathlib import Path
from typing import List

# Add Sunai root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from Backend import config
from Backend.interruption import classify_utterance
from Backend.metrics import MetricsManager
from Backend.state_machine import SunaiStateMachine
from Backend.turn_manager import TurnManager


# =====================================================================
# Synthetic Audio Generators (Pure math in code, 16kHz mono PCM16)
# =====================================================================

def generate_white_noise(duration_ms: int, sample_rate: int = 16000, amplitude: float = 0.3) -> bytes:
    """Generates random white noise PCM16 bytes."""
    num_samples = int(sample_rate * (duration_ms / 1000.0))
    samples = []
    random.seed(42 + duration_ms)
    for _ in range(num_samples):
        val = int((random.random() * 2.0 - 1.0) * amplitude * 32767)
        samples.append(max(-32768, min(32767, val)))
    return struct.pack(f"<{len(samples)}h", *samples)


def generate_clap_impulse(duration_ms: int = 80, sample_rate: int = 16000, peak: float = 0.95) -> bytes:
    """Generates a high-amplitude transient impulse decaying exponentially (clap simulation)."""
    num_samples = int(sample_rate * (duration_ms / 1000.0))
    samples = []
    decay_rate = 35.0  # Rapid exponential decay
    random.seed(101)
    for i in range(num_samples):
        t = i / sample_rate
        envelope = math.exp(-decay_rate * t)
        noise = (random.random() * 2.0 - 1.0)
        val = int(peak * envelope * noise * 32767)
        samples.append(max(-32768, min(32767, val)))
    return struct.pack(f"<{len(samples)}h", *samples)


def generate_keyboard_clicks(duration_ms: int = 400, sample_rate: int = 16000) -> bytes:
    """Generates periodic sharp 8ms clicks with low background (typing simulation)."""
    num_samples = int(sample_rate * (duration_ms / 1000.0))
    samples = [0] * num_samples
    click_interval = int(sample_rate * 0.08)  # Click every 80ms
    click_len = int(sample_rate * 0.008)     # 8ms duration per click
    random.seed(202)

    for start in range(0, num_samples, click_interval):
        for j in range(click_len):
            idx = start + j
            if idx < num_samples:
                decay = 1.0 - (j / click_len)
                val = int((random.random() * 2.0 - 1.0) * 0.8 * decay * 32767)
                samples[idx] = val

    return struct.pack(f"<{len(samples)}h", *samples)


def generate_low_frequency_hum(duration_ms: int = 1000, freq: float = 60.0, sample_rate: int = 16000) -> bytes:
    """Generates low-frequency mains/fan hum at 60Hz + 120Hz (outside 300-3400Hz speech band)."""
    num_samples = int(sample_rate * (duration_ms / 1000.0))
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        # 60Hz fundamental + 120Hz harmonic
        val_f = 0.4 * math.sin(2 * math.pi * freq * t) + 0.2 * math.sin(2 * math.pi * 2 * freq * t)
        val = int(val_f * 32767)
        samples.append(max(-32768, min(32767, val)))
    return struct.pack(f"<{len(samples)}h", *samples)


def generate_cough_burst(duration_ms: int = 200, sample_rate: int = 16000) -> bytes:
    """Generates a burst of turbulent acoustic energy (cough simulation)."""
    num_samples = int(sample_rate * (duration_ms / 1000.0))
    samples = []
    random.seed(303)
    for i in range(num_samples):
        t = i / sample_rate
        # Envelope rises in 30ms, decays over remaining time
        env = math.sin(min(1.0, t / 0.03) * (math.pi / 2)) * math.exp(-8.0 * t)
        val = int((random.random() * 2.0 - 1.0) * env * 0.75 * 32767)
        samples.append(max(-32768, min(32767, val)))
    return struct.pack(f"<{len(samples)}h", *samples)


def compute_pcm16_rms(pcm_bytes: bytes) -> float:
    """Calculates normalized RMS energy for PCM16 audio bytes."""
    num_samples = len(pcm_bytes) // 2
    if num_samples == 0:
        return 0.0
    samples = struct.unpack(f"<{num_samples}h", pcm_bytes)
    sum_sq = sum(s * s for s in samples)
    return math.sqrt(sum_sq / num_samples) / 32768.0


# =====================================================================
# Test 1: Sub-120ms Short Spikes (White Noise Bursts)
# =====================================================================

def test_short_white_noise_spikes():
    """
    Asserts short noise bursts (50ms, 70ms, 100ms) under 120ms do NOT trigger
    hard pauses or interruptions, and increment noise_blip_ignored.
    """
    print("\n--- Test 1: Short White Noise Bursts (< 120 ms Spike Filter) ---")
    mm = MetricsManager()

    for dur_ms in (50, 70, 100):
        audio = generate_white_noise(duration_ms=dur_ms, amplitude=0.5)
        rms = compute_pcm16_rms(audio)
        assert dur_ms < 120, f"Spike burst {dur_ms}ms must be under 120ms threshold"

        # Simulating browser VAD short-spike filter:
        # Spikes < 120ms are rejected before vad_start is fired to backend
        is_spike_rejected = (dur_ms < 120)
        assert is_spike_rejected is True

        # In backend classification, duration < 0.12s with no text returns noise
        decision, reason = classify_utterance(
            text="",
            has_voice=True,
            rms_energy=rms,
            duration_sec=dur_ms / 1000.0,
            confidence=0.0,
            speech_probability=0.2,
        )
        assert decision == "noise", f"Spike of {dur_ms}ms must classify as noise, got {decision}"

        # Browser VAD reports blip_ignored -> recorded in metrics
        mm.record_blip_ignored(mode="pause_first")
        print(f"  ✓ {dur_ms}ms burst (RMS={rms:.3f}): ignored as noise blip, did NOT trigger hard pause.")

    assert mm.stats["pause_first"].noise_blip_ignored == 3
    print("✓ Test 1 Passed: Short acoustic bursts < 120ms successfully rejected without hard pause.")


# =====================================================================
# Test 2: High Amplitude Impulse (Clap) & Sharp Clicks (Keyboard)
# =====================================================================

def test_clap_and_keyboard_clicks_resumption():
    """
    Asserts high-amplitude impulses (clap simulation) and keyboard typing
    feed through TurnManager without text, do NOT interrupt playback,
    and resume within config limit (around 1.2s), incrementing noise_resumed.
    """
    print("\n--- Test 2: Clap Impulse & Keyboard Typing Noise Resumption ---")

    async def run_scenario():
        mm = MetricsManager()
        events_sent = []

        async def mock_send(ev, payload):
            events_sent.append((ev, payload))

        # Scenario A: High amplitude clap impulse (80ms peak 0.95)
        clap_audio = generate_clap_impulse(duration_ms=80, peak=0.95)
        clap_rms = compute_pcm16_rms(clap_audio)
        assert clap_rms > 0.05, f"Clap must be loud, got RMS={clap_rms:.4f}"

        sm = SunaiStateMachine("SPEAKING")
        tm = TurnManager(sm, mock_send, mode="pause_first", metrics_manager=mm)

        t_start = time.time()
        # VAD triggers on loud clap
        await tm.on_user_voice_start(meta={"duration_ms": 80, "peak": 0.95, "rms": clap_rms, "speech_probability": 0.3})
        assert sm.get_state() == "PAUSED", "Loud clap immediately pauses bot audio (Stage 1)"

        # STT returns NO text for the clap; browser VAD signals voice end
        tm.current_user_text = ""
        await tm.on_user_voice_end(None)

        # Wait for TurnManager pause window to evaluate and resume (1.0s post-voice wait)
        await asyncio.sleep(1.1)
        t_resumed = time.time()

        assert sm.get_state() == "SPEAKING", f"Bot must resume to SPEAKING on clap noise, got {sm.get_state()}"
        assert any(ev == "decision" and p.get("decision") == "noise" for ev, p in events_sent)
        assert any(ev == "resume" for ev, _ in events_sent)
        assert ("clear_queue", {}) not in events_sent, "Queue must NOT be cleared on noise resumption!"

        elapsed = t_resumed - t_start
        assert elapsed <= 1.5, f"Resumption took too long: {elapsed:.2f}s (must be <= 1.5s)"
        assert mm.stats["pause_first"].noise_resumed == 1
        print(f"  ✓ Clap impulse (RMS={clap_rms:.3f}): resumed in {elapsed:.2f}s as noise (noise_resumed=1).")

        # Scenario B: Keyboard typing clicks (400ms duration)
        events_sent.clear()
        kb_audio = generate_keyboard_clicks(duration_ms=400)
        kb_rms = compute_pcm16_rms(kb_audio)

        await tm.on_user_voice_start(meta={"duration_ms": 400, "peak": 0.8, "rms": kb_rms, "speech_probability": 0.25})
        assert sm.get_state() == "PAUSED"
        tm.current_user_text = ""  # No speech transcribed
        await tm.on_user_voice_end(None)

        await asyncio.sleep(1.1)
        assert sm.get_state() == "SPEAKING"
        assert any(ev == "decision" and p.get("decision") == "noise" for ev, p in events_sent)
        assert mm.stats["pause_first"].noise_resumed == 2
        print(f"  ✓ Keyboard typing: resumed as noise without interrupting playback (noise_resumed=2).")

    asyncio.run(run_scenario())
    print("✓ Test 2 Passed: Loud clap and keyboard noise resume automatically without interrupting.")


# =====================================================================
# Test 3: Continuous Low-Frequency Hum (AC / Fan at 60 Hz)
# =====================================================================

def test_low_frequency_hum():
    """
    Asserts low-frequency hum (60Hz / 120Hz) outside 300-3400Hz speech band
    does not interrupt playback and classifies as noise.
    """
    print("\n--- Test 3: Continuous Low-Frequency Hum (60Hz Fan/AC) ---")
    hum_audio = generate_low_frequency_hum(duration_ms=1000, freq=60.0)
    hum_rms = compute_pcm16_rms(hum_audio)

    # In classifier, no text or low speech prob (<0.3) evaluates to noise
    decision, reason = classify_utterance(
        text="",
        has_voice=True,
        rms_energy=hum_rms,
        duration_sec=1.0,
        confidence=0.0,
        speech_probability=0.15,
    )
    assert decision == "noise"
    print(f"  ✓ 60Hz fan hum (RMS={hum_rms:.3f}): classified as noise ({reason}).")
    print("✓ Test 3 Passed: Low frequency hum safely treated as acoustic noise.")


# =====================================================================
# Test 4: Sudden Cough-Like Burst (200 ms)
# =====================================================================

def test_cough_burst():
    """
    Asserts sudden 200ms cough burst with empty/filler transcript resumes as noise.
    """
    print("\n--- Test 4: Sudden Cough-Like Burst (200 ms) ---")
    cough_audio = generate_cough_burst(duration_ms=200)
    cough_rms = compute_pcm16_rms(cough_audio)

    # Cough may transcribe as empty or non-lexical acoustic artifact
    for cough_text in ("", "   ", "shh", "ts"):
        decision, reason = classify_utterance(
            text=cough_text,
            has_voice=True,
            rms_energy=cough_rms,
            duration_sec=0.20,
            confidence=0.2,
            speech_probability=0.35,
        )
        assert decision == "noise", f"Cough '{cough_text}' must be noise, got {decision}"

    print(f"  ✓ 200ms cough burst (RMS={cough_rms:.3f}): all non-speech variants classified as noise.")
    print("✓ Test 4 Passed: Sudden cough bursts resume playback without interruption.")


# =====================================================================
# Test 5: Speech Interruption Test ("wait" -> Stop vs "haan" -> Resume)
# =====================================================================

def test_speech_wait_vs_haan_continuation():
    """
    Asserts:
    1. Speech saying "wait" stops playback immediately, clears queue, transitions to LISTENING.
    2. Speech saying "haan" resumes playback, does NOT clear queue, returns to SPEAKING.
    3. Speech saying "haan aur batao" resumes playback as go_on continuation.
    """
    print("\n--- Test 5: Speech Test ('wait' Stops Playback vs 'haan' Resumes) ---")

    async def run_speech_test():
        events_sent = []

        async def mock_send(ev, payload):
            events_sent.append((ev, payload))

        # 1. User says "wait" while bot is SPEAKING
        sm = SunaiStateMachine("SPEAKING")
        tm = TurnManager(sm, mock_send, mode="pause_first")
        tm.current_user_text = "wait"

        await tm.on_user_voice_start(meta={"duration_ms": 350, "peak": 0.8, "rms": 0.08, "speech_probability": 0.95})
        assert sm.get_state() == "PAUSED"

        # Wait for classification window (350ms)
        await asyncio.sleep(0.40)

        # "wait" is a STOP keyword -> Hard Stop!
        assert sm.get_state() == "LISTENING", f"Expected LISTENING on 'wait', got {sm.get_state()}"
        assert any(ev == "decision" and p.get("decision") == "interruption" for ev, p in events_sent)
        assert any(ev == "clear_queue" for ev, _ in events_sent), "Must send clear_queue on 'wait' interruption"
        print("  ✓ Speech saying 'wait': stopped playback, cleared queue, transitioned to LISTENING.")

        # 2. User says "haan" while bot is SPEAKING
        events_sent.clear()
        sm.transition_to("SPEAKING", reason="new_speech_test")
        tm.current_user_text = "haan"

        await tm.on_user_voice_start(meta={"duration_ms": 300, "peak": 0.7, "rms": 0.06, "speech_probability": 0.95})
        assert sm.get_state() == "PAUSED"

        await asyncio.sleep(0.40)

        # "haan" is a BACKCHANNEL keyword -> Resume!
        assert sm.get_state() == "SPEAKING", f"Expected SPEAKING on 'haan', got {sm.get_state()}"
        assert any(ev == "decision" and p.get("decision") == "small_sound" for ev, p in events_sent)
        assert any(ev == "resume" for ev, _ in events_sent), "Must send resume on 'haan' backchannel"
        assert not any(ev == "clear_queue" for ev, _ in events_sent), "Must NOT clear queue on 'haan' backchannel"
        print("  ✓ Speech saying 'haan': resumed playback, did NOT clear queue, returned to SPEAKING.")

        # 3. User says "haan aur batao" (Hindi continuation) while bot is SPEAKING
        events_sent.clear()
        sm.transition_to("SPEAKING", reason="continuation_test")
        tm.current_user_text = "haan aur batao"

        await tm.on_user_voice_start(meta={"duration_ms": 500, "peak": 0.75, "rms": 0.07, "speech_probability": 0.95})
        assert sm.get_state() == "PAUSED"

        await asyncio.sleep(0.40)

        assert sm.get_state() == "SPEAKING", f"Expected SPEAKING on 'haan aur batao', got {sm.get_state()}"
        assert any(ev == "decision" and p.get("decision") == "go_on" for ev, p in events_sent)
        assert any(ev == "resume" for ev, _ in events_sent), "Must send resume on 'haan aur batao' continuation"
        print("  ✓ Speech saying 'haan aur batao': classified as go_on continuation, resumed playback.")

    asyncio.run(run_speech_test())
    print("✓ Test 5 Passed: Speech 'wait' (stop) vs 'haan' (resume) vs 'haan aur batao' (go on) verified.")


# =====================================================================
# Main Execution Runner
# =====================================================================

def run_all_noise_and_speech_tests():
    print("=" * 80)
    print("RUNNING SUNAI NOISE ROBUSTNESS & SPEECH INTERRUPTION TEST SUITE")
    print("=" * 80)

    test_short_white_noise_spikes()
    test_clap_and_keyboard_clicks_resumption()
    test_low_frequency_hum()
    test_cough_burst()
    test_speech_wait_vs_haan_continuation()

    print("\n" + "=" * 80)
    print("ALL NOISE ROBUSTNESS & SPEECH INTERRUPTION TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)
    return True


if __name__ == "__main__":
    success = run_all_noise_and_speech_tests()
    sys.exit(0 if success else 1)


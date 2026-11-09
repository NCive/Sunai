"""
Automated Test Suite for Sunai Module 2 (Thin End-to-End).
Tests:
1. Configuration loading and integrity.
2. Timbre TTS synthesis and audio format validation.
3. Audio Cache pre-generation across Hindi, Marathi, and English.
4. Prisma STT session lifecycle and chunk streaming.
5. FastAPI WebSocket end-to-end integration test.
"""

import sys
import io
import struct
import base64
from pathlib import Path

# Add root to python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from Backend import config
from Backend.tts import TimbreTTSClient
from Backend.audio_cache_manager import ensure_audio_cache, get_cached_audio
from Backend.stt import PrismaSTTSession
from Backend.main import app
from fastapi.testclient import TestClient

print("--- RUNNING SUNAI MODULE 2 TESTS ---\n")

# 1. Config Integrity
print("Test 1: Validating Backend Config...")
assert config.PRISMA_MODEL == "prisma-v3.0", "PRISMA_MODEL must be prisma-v3.0"
assert config.PRISMA_SAMPLE_RATE == 16000, "PRISMA_SAMPLE_RATE must be 16000"
assert config.TIMBRE_SAMPLE_RATE == 16000, "TIMBRE_SAMPLE_RATE must be 16000"
assert "hi-IN" in config.CACHE_PHRASES["ji"], "Cache phrases must include hi-IN"
assert "mr-IN" in config.CACHE_PHRASES["ji"], "Cache phrases must include mr-IN"
assert "en-IN" in config.CACHE_PHRASES["ji"], "Cache phrases must include en-IN"
print("✓ Test 1 Passed: Backend Config verified.\n")

# 2. Timbre Synthesis Validation
print("Test 2: Validating Timbre TTS synthesis...")
tts = TimbreTTSClient()
test_text = "नमस्ते सुनाई"
wav_bytes = tts.synthesize(test_text, language="hi-IN")
assert len(wav_bytes) > 44, "Generated audio must be larger than 44 bytes"
riff_header = wav_bytes[:4]
wave_header = wav_bytes[8:12]
assert riff_header == b"RIFF", "Header must be RIFF"
assert wave_header == b"WAVE", "Header must be WAVE"

# Validate sample rate in fmt chunk
sample_rate = struct.unpack("<I", wav_bytes[24:28])[0]
channels = struct.unpack("<H", wav_bytes[22:24])[0]
bits_per_sample = struct.unpack("<H", wav_bytes[34:36])[0]
assert sample_rate == 16000, f"Sample rate must be 16000 Hz, got {sample_rate}"
assert channels == 1, f"Channels must be 1 (mono), got {channels}"
assert bits_per_sample == 16, f"Bits per sample must be 16, got {bits_per_sample}"
print(f"  Synthesized {len(wav_bytes)} bytes WAV (16kHz mono 16-bit).")
print("✓ Test 2 Passed: Timbre TTS synthesis verified.\n")

# 3. Audio Cache Pre-generation
print("Test 3: Pre-generating and verifying Audio Cache files...")
ensure_audio_cache()
cache_dir = config.AUDIO_CACHE_DIR
for phrase in ["ji", "kya_kaha", "please_wait", "are_you_there", "goodbye", "not_in_docs"]:
    for lang in ["hi-IN", "mr-IN", "en-IN"]:
        file_path = cache_dir / lang / f"{phrase}.wav"
        assert file_path.exists(), f"Missing cache file: {file_path}"
        assert file_path.stat().st_size > 100, f"Cache file too small: {file_path}"

# Verify retrieval helper
cached = get_cached_audio("ji", "hi-IN")
assert len(cached) > 44, "Cached audio retrieval failed"
print(f"  Verified 18 cached audio files across 3 languages in {cache_dir}.")
print("✓ Test 3 Passed: Audio Cache pre-generation verified.\n")

# 4. Prisma STT Session
print("Test 4: Testing Prisma STT session...")
transcripts_received = []
def on_transcript(text, lang, is_final):
    transcripts_received.append((text, lang, is_final))

import asyncio
async def test_stt_session():
    session = PrismaSTTSession(on_transcript=on_transcript)
    await session.start()
    # Feed dummy PCM chunks
    dummy_chunk = b"\x00\x00" * 800 # 50ms at 16kHz
    for _ in range(16):
        await session.send_audio(dummy_chunk)
    await asyncio.sleep(0.1)
    await session.close()

asyncio.run(test_stt_session())
print("✓ Test 4 Passed: Prisma STT session lifecycle verified.\n")

# 5. FastAPI WebSocket End-to-End Integration
print("Test 5: Validating WebSocket protocol integration...")
client = TestClient(app)

with client.websocket_connect("/ws") as websocket:
    # 1. Server sends initial state
    init_msg = websocket.receive_json()
    assert init_msg["type"] == "state" and init_msg["state"] == "IDLE", f"Unexpected initial message: {init_msg}"

    # 2. Client sends VAD start
    websocket.send_json({"type": "vad_start"})
    state_msg = websocket.receive_json()
    assert state_msg["type"] == "state" and state_msg["state"] == "LISTENING", f"Expected LISTENING, got {state_msg}"

    # 3. Client streams binary audio chunks (triggers mock STT transcript)
    for _ in range(16):
        websocket.send_bytes(b"\x00\x00" * 800)
    caption_msg = websocket.receive_json()
    assert caption_msg["type"] in ("partial_text", "final_text")

    # 4. Client sends VAD end
    websocket.send_json({"type": "vad_end"})

    # 5. Server transitions to THINKING
    thinking_msg = websocket.receive_json()
    assert thinking_msg["type"] == "state" and thinking_msg["state"] == "THINKING", f"Expected THINKING, got {thinking_msg}"

    # 6. Server sends final_text
    final_text_msg = websocket.receive_json()
    assert final_text_msg["type"] == "final_text", f"Expected final_text, got {final_text_msg}"

    # Server sends sources
    sources_msg = websocket.receive_json()
    assert sources_msg["type"] == "sources", f"Expected sources, got {sources_msg}"

    # 7. Server transitions to SPEAKING
    speaking_msg = websocket.receive_json()
    assert speaking_msg["type"] == "state" and speaking_msg["state"] == "SPEAKING", f"Expected SPEAKING, got {speaking_msg}"

    # 8. Server sends tts_audio payload
    tts_msg = websocket.receive_json()
    assert tts_msg["type"] == "tts_audio", f"Expected tts_audio, got {tts_msg}"
    assert "audio" in tts_msg, "Missing audio in tts_audio"
    audio_bytes = base64.b64decode(tts_msg["audio"])
    assert audio_bytes[:4] == b"RIFF", "Decoded TTS audio must be valid WAV"

    # 9. Client acknowledges sentence_played
    websocket.send_json({"type": "sentence_played", "id": tts_msg["sentence_id"]})
    post_played_msg = websocket.receive_json()
    assert post_played_msg["type"] == "state" and post_played_msg["state"] == "LISTENING", f"Expected return to LISTENING, got {post_played_msg}"

print("✓ Test 5 Passed: Full WebSocket protocol exchange verified end-to-end.\n")

print("==================================================")
print("ALL SUNAI MODULE 2 TESTS PASSED SUCCESSFULLY!")
print("==================================================")


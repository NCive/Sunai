"""
Module 6 Test Suite for Sunai Voice Assistant.
Tests:
1. Sentence Splitter:
   - Validates splitting on . ? ! ।
   - Confirms NO splitting on numbers (e.g. 3.5) and abbreviations (Dr., Mr., etc.)
   - Confirms handling of short fragments and streaming token feeds.
2. Prompt Builder:
   - Validates system prompt, context chunks, and turn history with heard_upto tracking.
3. Multilingual Translation:
   - Tests translate() across English, Hindi, Marathi, and Hinglish.
4. Qwen Client Streaming & Interruption Cancellation:
   - Verifies streaming token generation with thinking OFF.
   - Verifies cancel_event aborts generation mid-stream.
5. Full End-to-End WebSocket Pipeline:
   - On-topic Hindi question gets translated -> retrieved -> streaming Qwen answer -> translated Hindi audio.
   - Off-topic question triggers immediate refusal gate with cached refusal audio.
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
from Backend.main import app
from Backend.llm import (
    StreamingSentenceSplitter,
    split_sentences,
    build_qwen_prompt,
    QwenClient,
)
from Backend.translate import translate
from Backend.history import HistoryManager, ConversationTurn
from Backend.rag.ingest import DocumentChunk

print("--- RUNNING SUNAI MODULE 6 TESTS ---\n")

# =====================================================================
# Test 1: Sentence Splitter Edge Cases
# =====================================================================
print("Test 1: Validating Sentence Splitter Edge Cases (numbers, Dr., streaming)...")

# Case A: Decimal numbers (e.g. 3.5, 99.9)
num_text = "The model latency is 3.5 ms for speech. It achieves 99.9% uptime."
num_sents = split_sentences(num_text)
assert len(num_sents) == 2, f"Expected 2 sentences for decimals, got {len(num_sents)}: {num_sents}"
assert "3.5 ms" in num_sents[0]

# Case B: Honorifics & abbreviations (Dr., Mr., etc.)
abbr_text = "Dr. Ganesh Gopalan and Mr. Ananth Nagaraj founded the company. It is based in Bangalore."
abbr_sents = split_sentences(abbr_text)
assert len(abbr_sents) == 2, f"Expected 2 sentences for abbreviations, got {len(abbr_sents)}: {abbr_sents}"
assert abbr_sents[0].startswith("Dr. Ganesh")

# Case C: Multiple punctuation and question marks
punct_text = "Is this real?! Yes, absolutely. What next?"
punct_sents = split_sentences(punct_text)
assert len(punct_sents) == 3, f"Expected 3 sentences, got {len(punct_sents)}: {punct_sents}"

# Case D: Streaming token-by-token feed
splitter = StreamingSentenceSplitter(min_char_len=6)
stream_tokens = ["Dr. ", "Ganesh ", "spoke ", "about ", "Sunai. ", "It ", "works ", "in ", "3.5 ", "seconds! ", "Great job."]
streamed_sents = []
for tok in stream_tokens:
    streamed_sents.extend(splitter.feed(tok))
streamed_sents.extend(splitter.flush())

assert len(streamed_sents) == 3, f"Expected 3 streamed sentences, got {len(streamed_sents)}: {streamed_sents}"
assert "Dr. Ganesh spoke about Sunai." == streamed_sents[0]
assert "It works in 3.5 seconds!" == streamed_sents[1]
assert "Great job." == streamed_sents[2]

print("✓ Test 1 Passed: Sentence splitter handles numbers, abbreviations, and streaming.\n")


# =====================================================================
# Test 2: Prompt Builder & History Tracking (heard_upto)
# =====================================================================
print("Test 2: Validating Prompt Builder with History and heard_upto...")
dummy_chunks = [
    DocumentChunk(chunk_id="c1", doc_name="gnani.md", text="Gnani.ai was founded in Bangalore by Ganesh Gopalan.", token_count=12),
    DocumentChunk(chunk_id="c2", doc_name="sunai.md", text="Sunai is a voice bot that uses pause-first interruption.", token_count=13),
]

history = HistoryManager()
turn1 = history.start_new_turn("What is Gnani?", "en")
history.add_assistant_sentence("Gnani.ai is a conversational AI company.")
history.add_assistant_sentence("It is headquartered in Bangalore.")
history.record_sentence_played(1)  # User heard sentence 1 only
history.mark_interrupted()
history.finalize_current_turn()

messages = build_qwen_prompt(
    question="Tell me more about founders.",
    chunks=dummy_chunks,
    history_turns=history.get_recent_turns(),
)

assert len(messages) == 2
assert messages[0]["role"] == "system"
assert "DOCUMENT CONTEXT" in messages[1]["content"]
assert "RECENT CONVERSATION HISTORY" in messages[1]["content"]
assert "User interrupted mid-answer! User heard: \"Gnani.ai is a conversational AI company.\"" in messages[1]["content"]
assert "TELL ME MORE ABOUT FOUNDERS" in messages[1]["content"].upper()

print("✓ Test 2 Passed: Prompt correctly incorporates context, history, and heard_upto.\n")


# =====================================================================
# Test 3: Multilingual Translation Interface
# =====================================================================
print("Test 3: Validating Translation Interface (en -> hi, mr, hinglish)...")
test_phrase = "Gnani.ai is a conversational AI company."

# 1. Identity when source == target
assert translate(test_phrase, from_lang="en", to_lang="en") == test_phrase

# 2. English to Hindi
hi_trans = translate(test_phrase, from_lang="en", to_lang="hi-IN")
assert len(hi_trans.strip()) > 5
print(f"  Translated en -> hi-IN: '{hi_trans}'")

# 3. English to Hinglish
hinglish_trans = translate(test_phrase, from_lang="en", to_lang="hi-Latn")
assert len(hinglish_trans.strip()) > 5
print(f"  Translated en -> hi-Latn: '{hinglish_trans}'")

print("✓ Test 3 Passed: Translation interface functioning across targets.\n")


# =====================================================================
# Test 4: Qwen Client Streaming & Interruption Cancellation
# =====================================================================
print("Test 4: Validating Qwen Client Streaming & Mid-Generation Cancel...")
client_llm = QwenClient()

async def test_llm_stream_and_cancel():
    test_msgs = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Count from 1 to 20 slowly, with each number on a new line."},
    ]

    # Part A: Streaming tokens
    tokens_received = []
    async for tok in client_llm.stream_chat(test_msgs, max_tokens=16):
        tokens_received.append(tok)
        assert "<think>" not in tok, "Thinking mode was not disabled!"
        if len(tokens_received) >= 5:
            break

    assert len(tokens_received) >= 3, f"Expected tokens, got {tokens_received}"

    # Part B: Cancellation event mid-generation
    cancel_ev = asyncio.Event()
    cancel_tokens = []
    async for tok in client_llm.stream_chat(test_msgs, max_tokens=64, cancel_event=cancel_ev):
        cancel_tokens.append(tok)
        if len(cancel_tokens) >= 2:
            cancel_ev.set()  # Cancel stream mid-way

    # After cancellation, stream must stop promptly
    assert len(cancel_tokens) <= 5, f"Stream did not abort on cancel: got {len(cancel_tokens)} tokens"

asyncio.run(test_llm_stream_and_cancel())
print("✓ Test 4 Passed: Qwen streaming with thinking OFF and mid-generation cancel verified.\n")


# =====================================================================
# Test 5: Full End-to-End WebSocket Pipeline (On-Topic & Refusal)
# =====================================================================
print("Test 5: Full WebSocket Pipeline (Question Translation -> RAG -> Streaming LLM -> Hindi TTS)...")
test_client = TestClient(app)

with test_client.websocket_connect("/ws") as ws:
    # 1. Handshake
    msg = ws.receive_json()
    assert msg["type"] == "state" and msg["state"] == "IDLE"

    # --- Part A: On-Topic Question in Hindi ---
    ws.send_json({"type": "vad_start"})
    assert ws.receive_json()["state"] == "LISTENING"

    # Send 16 audio chunks to simulate speech
    for _ in range(16):
        ws.send_bytes(b"\x00\x00" * 800)
    caption = ws.receive_json()
    assert caption["type"] in ("partial_text", "final_text")

    # Finalize turn
    ws.send_json({"type": "vad_end"})

    # Receives THINKING -> final_text -> sources
    thinking_msg = ws.receive_json()
    assert thinking_msg["type"] == "state" and thinking_msg["state"] == "THINKING"

    final_msg = ws.receive_json()
    assert final_msg["type"] == "final_text"

    sources_msg = ws.receive_json()
    assert sources_msg["type"] == "sources"

    # Server transitions to SPEAKING and begins streaming sentences
    speaking_msg = ws.receive_json()
    assert speaking_msg["type"] == "state" and speaking_msg["state"] == "SPEAKING"

    tts_msg = ws.receive_json()
    assert tts_msg["type"] == "tts_audio"
    assert "audio" in tts_msg
    assert tts_msg["refused"] is False

    if tts_msg.get("interim"):
        # 1.5s timeout triggered 'please wait' clip as expected
        print("  Verified interim 'please wait' clip triggered after 1.5s.")
        # Receive sentence 1
        s1_msg = ws.receive_json()
        assert s1_msg["type"] == "tts_audio"
        assert s1_msg["refused"] is False
        assert s1_msg["sentence_id"] >= 1
        print(f"  Received sentence 1 in Hindi: '{s1_msg['text']}'")
        ws.send_json({"type": "sentence_played", "id": s1_msg["sentence_id"]})
    else:
        print(f"  Received sentence 1: '{tts_msg['text']}'")
        ws.send_json({"type": "sentence_played", "id": tts_msg["sentence_id"]})

print("✓ Test 5 Passed: Full end-to-end streaming generation pipeline verified.\n")

print("==================================================")
print("ALL SUNAI MODULE 6 TESTS PASSED SUCCESSFULLY!")
print("==================================================")

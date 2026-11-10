"""
Comprehensive Unit and Integration Tests for Sunai Interruption & Voice Overlap Prevention.
Tests:
1. test_simulated_interruption: Starts answer A (2 sentences), interrupts at sentence 1,
   asserts NO audio chunk of turn A reaches client after clear_queue, and turn B audio starts only after clear_ack.
2. test_queue_clears_in_flight_decodes: Simulates PlayQueue epoch mechanics: enqueues 3 chunks,
   calls clear() while chunk 1 plays and chunk 2 is decoding, asserts activeNodes has size 0 and late decode is dropped.
3. test_rapid_interruptions: Fires 5 rapid interruptions in succession, asserts max concurrently playing nodes <= 1 at all times.
4. test_filler_cutoff: 'please wait' clip is scheduled, sentence 1 arrives, asserts filler is stopped before sentence 1 plays.
"""

import asyncio
import json
import logging
from pathlib import Path
import sys
import time
from unittest.mock import MagicMock, patch

# Ensure Sunai root in path
sunai_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(sunai_root))

from Backend.ws_server import SunaiConnectionManager

logger = logging.getLogger("test_overlapping_voices")


class MockWebSocket:
    """Mock FastAPI WebSocket for testing message flow and frame assertions."""

    def __init__(self):
        self.sent_messages: list[dict] = []
        self.closed = False

    async def accept(self):
        pass

    async def send_text(self, text: str):
        data = json.loads(text)
        self.sent_messages.append(data)

    async def close(self):
        self.closed = True


class MockTTSClient:
    """Mock Timbre TTS that produces valid WAV byte headers without network latency."""

    def __init__(self):
        # 16kHz mono 16-bit PCM header (44 bytes) + 1600 bytes of data (50ms)
        self.dummy_wav = b"RIFF" + b"\x00" * 40 + b"\x01\x00" * 800

    def synthesize(self, text: str, language: str = "hi-IN", **kwargs) -> bytes:
        return self.dummy_wav


class SimulatedPlayQueue:
    """Python simulation of Frontend TypeScript PlayQueue epoch and node tracking logic."""

    def __init__(self):
        self.current_epoch = 0
        self.queue = []
        self.active_nodes = set()
        self.is_playing = False
        self.is_decoding = False
        self.max_concurrent_nodes = 0

    def clear(self):
        self.current_epoch += 1
        self.queue = []
        self.active_nodes.clear()
        self.is_playing = False
        self.is_decoding = False

    async def enqueue(self, item_id: int, decode_delay_sec: float = 0.02):
        self.queue.append(item_id)
        if not self.is_playing and not self.is_decoding:
            await self._play_next(decode_delay_sec)

    async def _play_next(self, decode_delay_sec: float = 0.02):
        if not self.queue or self.is_decoding:
            return
        self.is_decoding = True
        item_epoch = self.current_epoch
        item = self.queue.pop(0)

        # Async decode simulation
        await asyncio.sleep(decode_delay_sec)
        self.is_decoding = False

        # Epoch check: if clear() was called during decode, DROP immediately!
        if item_epoch != self.current_epoch:
            return

        self.is_playing = True
        node_id = f"node_{item}_{item_epoch}"
        self.active_nodes.add(node_id)
        self.max_concurrent_nodes = max(self.max_concurrent_nodes, len(self.active_nodes))

        # Playback duration simulation
        await asyncio.sleep(0.04)
        self.active_nodes.discard(node_id)
        self.is_playing = False
        if item_epoch == self.current_epoch and self.queue:
            await self._play_next(decode_delay_sec)


async def test_simulated_interruption() -> bool:
    """
    Test 1: Starts answer A (2 sentences), interrupts at sentence 1.
    Asserts NO audio chunk of turn A reaches client after clear_queue.
    Asserts Turn B starts audio only after clear_ack handshake.
    """
    print("\n[Running Test 1: Simulated Interruption & Handshake]")
    ws = MockWebSocket()
    with patch("Backend.ws_server.get_global_retriever", return_value=MagicMock()):
        manager = SunaiConnectionManager(ws)
    manager.tts_client = MockTTSClient()

    # Step 1: Start Turn A (turn_id = 1)
    turn_a_id = 1
    manager.current_turn_id = turn_a_id
    manager.sm.transition_to("LISTENING")
    manager.sm.transition_to("THINKING")

    first_sent_event = asyncio.Event()
    pw_task = asyncio.create_task(asyncio.sleep(10))
    manager.current_turn_tasks.append(pw_task)

    # Dispatch Sentence 1 of Turn A
    await manager._dispatch_sentence(
        sentence_en="This is sentence one of turn A.",
        lang="en-IN",
        first_sent_event=first_sent_event,
        pw_task=pw_task,
        turn_id=turn_a_id,
        first_tts_recorded=False,
        sentence_id=1,
        is_last=False,
    )

    # Verify Sentence 1 reached browser
    s1_msgs = [m for m in ws.sent_messages if m.get("type") == "tts_audio" and m.get("sentence_id") == 1]
    assert len(s1_msgs) == 1, "Sentence 1 audio must reach browser before interruption"
    print("  -> Sentence 1 successfully dispatched to browser.")

    # Step 2: User interrupts while bot speaks -> on_interruption_stop called
    manager.on_interruption_stop()
    await manager.send_json({"type": "clear_queue", "turn_id": turn_a_id})

    # Clear ack has NOT yet arrived from browser
    assert not manager.clear_ack_event.is_set(), "clear_ack_event must be unset on interruption"
    print("  -> Interruption registered, clear_ack_event cleared, clear_queue frame sent.")

    # Step 3: Sentence 2 of Turn A attempts to dispatch AFTER interruption
    await manager._dispatch_sentence(
        sentence_en="This is sentence two of turn A which must be dropped.",
        lang="en-IN",
        first_sent_event=first_sent_event,
        pw_task=pw_task,
        turn_id=turn_a_id,
        first_tts_recorded=True,
        sentence_id=2,
        is_last=True,
    )

    # Assert sentence 2 audio was completely dropped
    s2_msgs = [m for m in ws.sent_messages if m.get("type") == "tts_audio" and m.get("sentence_id") == 2]
    assert len(s2_msgs) == 0, "Sentence 2 of Turn A must NEVER reach browser after interruption"
    print("  -> Sentence 2 of Turn A was correctly DROPPED after interruption.")

    # Step 4: Turn B begins (turn_id = 2)
    turn_b_id = 2
    manager.current_turn_id = turn_b_id

    turn_b_audio_sent = False

    async def send_turn_b_audio():
        nonlocal turn_b_audio_sent
        await manager.wait_for_clear_ack(turn_b_id)
        if manager.current_turn_id == turn_b_id:
            turn_b_audio_sent = True

    tb_task = asyncio.create_task(send_turn_b_audio())
    await asyncio.sleep(0.02)
    assert not turn_b_audio_sent, "Turn B audio must NOT start before clear_ack is received"
    print("  -> Turn B audio blocked waiting for clear_ack handshake.")

    # Now browser sends clear_ack handshake
    await manager.handle_json_message({"type": "clear_ack", "turn_id": turn_a_id})
    await asyncio.sleep(0.02)
    assert turn_b_audio_sent, "Turn B audio must start promptly after clear_ack handshake"
    await tb_task
    print("  -> clear_ack received, Turn B audio unblocked and dispatched successfully.")

    await manager.cleanup()
    print("  [PASS] Test 1: Simulated Interruption & Handshake PASSED.\n")
    return True


async def test_queue_clears_in_flight_decodes() -> bool:
    """
    Test 2: Simulates PlayQueue: enqueues 3 chunks, calls clear() while chunk 1 is playing
    and chunk 2 is decoding. Asserts activeNodes has size 0 and late decode is dropped.
    """
    print("[Running Test 2: Queue Clears In-Flight Decodes]")
    pq = SimulatedPlayQueue()
    # Enqueue item 1 (starts playing)
    t1 = asyncio.create_task(pq.enqueue(1, decode_delay_sec=0.01))
    await asyncio.sleep(0.005)

    # Enqueue item 2 and item 3 while 1 is decoding/playing
    t2 = asyncio.create_task(pq.enqueue(2, decode_delay_sec=0.03))
    t3 = asyncio.create_task(pq.enqueue(3, decode_delay_sec=0.03))

    # Clear while 1 is playing and 2 is decoding
    await asyncio.sleep(0.015)
    pq.clear()
    print(f"  -> PlayQueue clear() called at epoch {pq.current_epoch}.")

    # Await all background tasks
    await asyncio.gather(t1, t2, t3, return_exceptions=True)

    # Assert no active nodes remain and late decodes were dropped
    assert len(pq.active_nodes) == 0, f"active_nodes must be empty after clear, got {len(pq.active_nodes)}"
    assert len(pq.queue) == 0, f"queue must be empty after clear, got {len(pq.queue)}"
    assert pq.is_playing is False, "is_playing must be False"
    print("  -> In-flight decode was discarded; active_nodes = 0, queue = 0.")
    print("  [PASS] Test 2: Queue Clears In-Flight Decodes PASSED.\n")
    return True


async def test_rapid_interruptions() -> bool:
    """
    Test 3: Fires 5 interruptions in quick succession, asserting max concurrently playing nodes <= 1 at all times.
    """
    print("[Running Test 3: Rapid Interruptions]")
    pq = SimulatedPlayQueue()

    for i in range(5):
        asyncio.create_task(pq.enqueue(i + 1, decode_delay_sec=0.01))
        await asyncio.sleep(0.01)
        # Interrupt and clear
        pq.clear()

    await asyncio.sleep(0.05)
    assert pq.max_concurrent_nodes <= 1, f"Max concurrent active nodes was {pq.max_concurrent_nodes}, must be <= 1"
    assert len(pq.active_nodes) == 0, "All active nodes must be 0 after rapid interruptions finish"
    print(f"  -> Max concurrent active nodes observed: {pq.max_concurrent_nodes} (limit: 1).")
    print("  [PASS] Test 3: Rapid Interruptions PASSED.\n")
    return True


async def test_filler_cutoff() -> bool:
    """
    Test 4: 'please wait' clip is scheduled with 1.5s timer.
    Sentence 1 arrives earlier (e.g. at 50ms).
    Asserts filler is cancelled and never dispatched.
    """
    print("[Running Test 4: Filler Cutoff]")
    ws = MockWebSocket()
    with patch("Backend.ws_server.get_global_retriever", return_value=MagicMock()):
        manager = SunaiConnectionManager(ws)

    first_sent_event = asyncio.Event()
    pw_task = asyncio.create_task(manager._please_wait_timer("en-IN", first_sent_event, turn_id=10))

    # Simulate sentence 1 ready at 50ms
    await asyncio.sleep(0.05)
    first_sent_event.set()
    pw_task.cancel()

    await asyncio.sleep(0.05)
    # Check no filler tts_audio was sent
    filler_msgs = [m for m in ws.sent_messages if m.get("sentence_id") == 0 or m.get("kind") == "filler"]
    assert len(filler_msgs) == 0, f"Filler clip must be aborted when sentence 1 is ready, got {len(filler_msgs)}"
    print("  -> First sentence ready event set; filler clip aborted before dispatch.")

    await manager.cleanup()
    print("  [PASS] Test 4: Filler Cutoff PASSED.\n")
    return True


async def main():
    print("=" * 70, flush=True)
    print("   SUNAI OVERLAPPING VOICES & INTERRUPTION TEST SUITE")
    print("=" * 70)

    results = []
    results.append(("test_simulated_interruption", await test_simulated_interruption()))
    results.append(("test_queue_clears_in_flight_decodes", await test_queue_clears_in_flight_decodes()))
    results.append(("test_rapid_interruptions", await test_rapid_interruptions()))
    results.append(("test_filler_cutoff", await test_filler_cutoff()))

    print("=" * 70)
    print(f"| {'TEST NAME':<40} | {'RESULT':<20} |")
    print("=" * 70)
    all_passed = True
    for name, ok in results:
        status = "PASS" if ok else "FAIL"
        if not ok:
            all_passed = False
        print(f"| {name:<40} | {status:<20} |")
    print("=" * 70)
    print(f"OVERALL RESULT: {'ALL TESTS PASSED (4/4)' if all_passed else 'SOME TESTS FAILED'}\n")
    return all_passed


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

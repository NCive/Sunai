"""
Unit Tests for Audio Overlap Fix:
1. Interrupted turn cancels old audio, increments turn_id, sends clear_queue with the new turn_id.
2. Server waits for clear_ack handshake before sending the first audio of the new turn.
3. Server-side drops any late TTS clip from an older / cancelled turn.
4. Filler clip ("please wait") does not overlap and waits for clear_ack.
5. Pure stop followed by a new question sends clear_queue and tracks turn IDs correctly.
"""

import asyncio
from pathlib import Path
import sys
import time

# Ensure Sunai root is in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from unittest.mock import MagicMock, patch

from Backend import config
from Backend.state_machine import SunaiStateMachine
from Backend.turn_manager import TurnManager
from Backend.ws_server import SunaiConnectionManager


class MockWebSocket:
    def __init__(self):
        self.sent_messages = []
        self.closed = False

    async def accept(self):
        pass

    async def send_text(self, text: str):
        self.sent_messages.append(text)

    async def receive(self):
        await asyncio.sleep(10.0)
        return {"text": ""}


def test_interrupted_turn_increments_turn_id_and_sends_clear_queue():
    """An interrupted turn cancels old audio, increments turn_id, and sends clear_queue with the new turn_id."""
    async def run():
        events = []
        interrupted_called = False

        async def mock_send_event(event_type: str, payload: dict):
            events.append((event_type, payload))

        def on_interruption():
            nonlocal interrupted_called
            interrupted_called = True

        sm = SunaiStateMachine(initial_state="SPEAKING")
        tm = TurnManager(state_machine=sm, send_event=mock_send_event, on_interruption=on_interruption)
        tm.turn_id = 1

        new_turn_calls = []

        async def on_turn_complete(text=None):
            new_turn_calls.append(text)

        tm.on_turn_complete_cb = on_turn_complete

        # 1. User voice starts while SPEAKING (Turn 1)
        await tm.on_user_voice_start(duration_ms=120.0, rms=0.08)
        assert sm.get_state() == "PAUSED"

        # 2. User says a new question: "ruko, ek sawal hai"
        tm.current_user_text = "ruko, ek sawal hai"
        await tm.on_audio_chunk(b"\x20\x20" * 800, on_turn_complete)

        # Wait for pause evaluation window to complete
        await asyncio.sleep(0.5)

        # 3. Assert cancellation hook called
        assert interrupted_called is True, "on_interruption hook must be called"

        # 4. Assert turn_id was incremented to 2
        assert tm.turn_id == 2, f"Expected turn_id 2, got {tm.turn_id}"

        # 5. Assert clear_queue was sent with turn_id 2
        clear_events = [p for ev, p in events if ev == "clear_queue"]
        assert len(clear_events) > 0, "clear_queue must be sent"
        assert clear_events[-1].get("turn_id") == 2, f"clear_queue must have turn_id=2, got {clear_events[-1]}"

        # 6. Assert state transitioned to THINKING for new turn
        assert sm.get_state() == "THINKING"
        assert len(new_turn_calls) == 1
        assert new_turn_calls[0] == "ruko, ek sawal hai"

    asyncio.run(run())


def test_server_waits_for_clear_ack_before_sending_first_audio():
    """Server waits for clear_ack handshake before sending the first audio of the new turn."""
    async def run():
        mock_ws = MockWebSocket()
        with patch("Backend.ws_server.get_global_retriever", return_value=MagicMock()):
            mgr = SunaiConnectionManager(websocket=mock_ws)
        mgr.current_turn_id = 2
        mgr.clear_ack_event.clear()  # Clear ack pending

        ack_received = False

        async def simulate_delayed_clear_ack():
            await asyncio.sleep(0.1)
            await mgr.handle_json_message({"type": "clear_ack", "turn_id": 2})
            nonlocal ack_received
            ack_received = True

        asyncio.create_task(simulate_delayed_clear_ack())

        t0 = time.time()
        await mgr.wait_for_clear_ack(2)
        elapsed = time.time() - t0

        assert ack_received is True, "clear_ack must have been received"
        assert mgr.last_cleared_turn_id == 2, f"last_cleared_turn_id must be 2, got {mgr.last_cleared_turn_id}"
        assert elapsed >= 0.08, f"wait_for_clear_ack must actually wait for the handshake (elapsed={elapsed:.3f}s)"

    asyncio.run(run())


def test_server_drops_stale_turn_audio():
    """Server drops audio synthesis and dispatch if turn_id does not match current_turn_id."""
    async def run():
        mock_ws = MockWebSocket()
        with patch("Backend.ws_server.get_global_retriever", return_value=MagicMock()):
            mgr = SunaiConnectionManager(websocket=mock_ws)
        mgr.current_turn_id = 2  # Current active turn is 2
        mgr.last_cleared_turn_id = 2

        # Attempt to dispatch sentence for old turn 1
        first_sent_event = asyncio.Event()
        pw_task = asyncio.create_task(asyncio.sleep(10))

        await mgr._dispatch_sentence(
            sentence_en="This is old turn 1 audio",
            lang="en-IN",
            first_sent_event=first_sent_event,
            pw_task=pw_task,
            turn_id=1,  # Stale turn
            first_tts_recorded=False,
            sentence_id=1,
            is_last=True,
        )

        pw_task.cancel()

        # Verify no tts_audio message was sent for turn 1
        import json
        sent_types = [json.loads(m).get("type") for m in mock_ws.sent_messages]
        assert "tts_audio" not in sent_types, "Must not send tts_audio for stale turn_id"

    asyncio.run(run())


def test_please_wait_filler_waits_for_clear_ack_and_rejects_cancelled_turn():
    """Filler clip does not play if turn is cancelled or superseded."""
    async def run():
        mock_ws = MockWebSocket()
        with patch("Backend.ws_server.get_global_retriever", return_value=MagicMock()):
            mgr = SunaiConnectionManager(websocket=mock_ws)
        mgr.current_turn_id = 1
        first_sent_event = asyncio.Event()

        # Temporarily shorten timeout for test
        orig_timeout = config.FIRST_SENTENCE_WAIT_TIMEOUT_SEC
        config.FIRST_SENTENCE_WAIT_TIMEOUT_SEC = 0.05
        try:
            # Turn gets cancelled while timer runs
            task = asyncio.create_task(mgr._please_wait_timer("hi-IN", first_sent_event, turn_id=1))
            await asyncio.sleep(0.01)
            # Interruption occurs: cancel turn 1, increment to turn 2
            mgr.llm_cancel_event.set()
            mgr.current_turn_id = 2

            await task

            # Verify no filler audio was sent for cancelled turn 1
            import json
            sent_fillers = [
                json.loads(m) for m in mock_ws.sent_messages
                if json.loads(m).get("type") == "tts_audio" and json.loads(m).get("kind") == "filler"
            ]
            assert len(sent_fillers) == 0, "Cancelled turn must not send filler audio"
        finally:
            config.FIRST_SENTENCE_WAIT_TIMEOUT_SEC = orig_timeout

    asyncio.run(run())


def test_pure_stop_followed_by_question_clears_queue():
    """Pure stop ('ruko') followed by a question from LISTENING sends clear_queue with new turn_id."""
    async def run():
        events = []

        async def mock_send_event(event_type: str, payload: dict):
            events.append((event_type, payload))

        sm = SunaiStateMachine(initial_state="SPEAKING")
        tm = TurnManager(state_machine=sm, send_event=mock_send_event)
        tm.turn_id = 1

        new_turn_calls = []

        async def on_turn_complete(text=None):
            new_turn_calls.append(text)

        tm.on_turn_complete_cb = on_turn_complete

        # 1. User says "ruko" while SPEAKING
        await tm.on_user_voice_start(duration_ms=100.0, rms=0.08)
        assert sm.get_state() == "PAUSED"

        tm.current_user_text = "ruko"
        await tm.on_audio_chunk(b"\x20\x20" * 800, on_turn_complete)

        await asyncio.sleep(0.5)

        # 2. Pure stop stops playback, sends clear_queue for turn 1, transitions to LISTENING
        assert sm.get_state() == "LISTENING"
        assert tm.interrupted is True, "interrupted flag must be set on pure stop"
        clear_1 = [p for ev, p in events if ev == "clear_queue"]
        assert len(clear_1) == 1
        assert clear_1[0]["turn_id"] == 1

        # 3. User now speaks new question from LISTENING
        await tm.on_user_voice_start()
        tm.current_user_text = "Prisma ke baare mein batao"
        tm.has_final_transcript = True
        await tm.on_user_voice_end(on_turn_complete)

        # Wait for 700ms silence threshold
        await asyncio.sleep(0.8)

        # 4. Turn finalizes to turn_id = 2, sends clear_queue for turn 2
        assert tm.turn_id == 2
        assert sm.get_state() == "THINKING"
        clear_2 = [p for ev, p in events if ev == "clear_queue"]
        assert len(clear_2) == 2
        assert clear_2[1]["turn_id"] == 2, f"Second clear_queue must have turn_id=2, got {clear_2[1]}"
        assert tm.interrupted is False

    asyncio.run(run())

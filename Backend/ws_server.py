"""
WebSocket Server for Sunai Voice Assistant.
Integrates SunaiStateMachine, TurnManager, Prisma STT, Timbre TTS,
RAG Hybrid Retrieval, Qwen Streaming LLM, and Multilingual Translation.
Plan Sections 6, 7, 8, 9, 10, 11, 12, 14, and 16 compliant.
"""

import asyncio
import base64
import json
import logging
import time
from typing import Optional
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect, WebSocketDisconnected
from Backend import config
from Backend.stt import PrismaSTTSession
from Backend.tts import TimbreTTSClient
from Backend.state_machine import SunaiStateMachine
from Backend.turn_manager import TurnManager
from Backend.audio_cache_manager import get_cached_audio, get_smalltalk_audio
from Backend.smalltalk import detect_smalltalk
from Backend.rag import HybridRetriever
from Backend.rag.aliases import apply_aliases
from Backend.history import HistoryManager
from Backend.llm import QwenClient, build_qwen_prompt, StreamingSentenceSplitter
from Backend.translate import translate
from Backend.interruption import (
    classify_utterance,
    normalize_text,
    is_reaction_utterance,
    is_go_on_utterance,
)
from Backend.metrics import get_metrics_manager

logger = logging.getLogger(__name__)

_global_retriever: Optional[HybridRetriever] = None


def get_global_retriever() -> HybridRetriever:
    """Singleton getter for HybridRetriever to load embeddings and BM25 once at startup."""
    global _global_retriever
    if _global_retriever is None:
        _global_retriever = HybridRetriever()
    return _global_retriever


class SunaiConnectionManager:
    """Manages active WebSocket client connection, turn logic, state machine, and streaming generation."""

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.tts_client = TimbreTTSClient()
        self.llm_client = QwenClient()
        self.history = HistoryManager()
        self.metrics_manager = get_metrics_manager()
        self.stt_session: Optional[PrismaSTTSession] = None
        self.retriever = get_global_retriever()
        self.current_language = "hi-IN"
        self.current_turn_id = 0
        self.turn_sentence_counter = 0
        self.last_vad_end_time = time.time()

        # Task tracking & cancellation across turns
        self.llm_task: Optional[asyncio.Task] = None
        self.llm_cancel_event = asyncio.Event()
        self.current_turn_tasks: list[asyncio.Task] = []
        self.clear_ack_event = asyncio.Event()
        self.clear_ack_event.set()  # Initial turn does not wait
        self.last_cleared_turn_id: int = 0

        # State machine with client notification callback
        self.sm = SunaiStateMachine(
            initial_state="IDLE",
            on_state_change=self._on_state_changed,
        )

        # Turn manager with cancellation hook on interruption and metrics logging
        self.turn_manager = TurnManager(
            state_machine=self.sm,
            send_event=self._send_turn_event,
            mode="pause_first",
            on_interruption=self.on_interruption_stop,
            metrics_manager=self.metrics_manager,
            has_unplayed_continuation=self.history.has_unplayed_continuation,
        )

    def _on_state_changed(self, old_state: str, new_state: str) -> None:
        """Callback from state machine; notifies browser of new state."""
        asyncio.create_task(self.send_json({"type": "state", "state": new_state}))

    async def _send_turn_event(self, event_type: str, payload: dict) -> None:
        """Dispatches turn events (resume, clear_queue, decision) to client."""
        data = {"type": event_type, **payload}
        await self.send_json(data)

    async def send_json(self, data: dict) -> None:
        """Helper to send structured JSON messages to client."""
        try:
            await self.websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.warning(f"[WS] Failed to send JSON message: {e}")

    async def cancel_active_turn_tasks(self) -> None:
        """Cancels all active tasks for the current turn and awaits termination."""
        self.llm_cancel_event.set()
        self.history.mark_interrupted()
        tasks_to_cancel = [t for t in self.current_turn_tasks if not t.done()]
        for t in tasks_to_cancel:
            t.cancel()
        if tasks_to_cancel:
            logger.info(f"[WS] Awaiting cancellation of {len(tasks_to_cancel)} active turn tasks...")
            await asyncio.gather(*tasks_to_cancel, return_exceptions=True)
        self.current_turn_tasks.clear()
        self.llm_task = None

    def on_interruption_stop(self) -> None:
        """Called when a real interruption is confirmed: cancels LLM immediately."""
        logger.info("[WS] Real interruption detected: triggering immediate turn task cancellation.")
        self.clear_ack_event.clear()
        self.llm_cancel_event.set()
        self.history.mark_interrupted()
        asyncio.create_task(self.cancel_active_turn_tasks())

    def cancel_llm(self) -> None:
        """Cancels active LLM generation task (sync trigger)."""
        self.llm_cancel_event.set()
        if self.llm_task and not self.llm_task.done():
            self.llm_task.cancel()
            self.llm_task = None
        self.history.mark_interrupted()

    async def wait_for_clear_ack(self, turn_id: int) -> None:
        """Waits up to CLEAR_ACK_TIMEOUT_SEC for browser's clear_ack handshake."""
        if not self.clear_ack_event.is_set():
            try:
                logger.info(
                    f"[WS] Waiting up to {config.CLEAR_ACK_TIMEOUT_SEC}s for browser clear_ack before turn {turn_id}..."
                )
                await asyncio.wait_for(self.clear_ack_event.wait(), timeout=config.CLEAR_ACK_TIMEOUT_SEC)
                logger.info(f"[WS] clear_ack received successfully for turn {turn_id}")
            except asyncio.TimeoutError:
                logger.warning(
                    f"[WS] clear_ack wait timed out ({config.CLEAR_ACK_TIMEOUT_SEC}s) for turn {turn_id}; proceeding."
                )

    async def start(self) -> None:
        """Initializes connection and session listeners."""
        await self.websocket.accept()
        logger.info("[WS] Client connected.")

        # Callback for Prisma transcripts
        def on_stt_transcript(text: str, lang: Optional[str], is_final: bool) -> None:
            if lang:
                self.current_language = lang
                self.turn_manager.current_language = lang
            self.turn_manager.current_user_text = text
            if is_final:
                self.turn_manager.has_final_transcript = True

            msg = {
                "type": "final_text" if is_final else "partial_text",
                "text": text,
                "language": self.current_language,
            }
            asyncio.create_task(self.send_json(msg))

            # SAFETY NET (Item 5):
            # If state is SPEAKING and Prisma returns real words (not only backchannel words),
            # pause immediately and classify, even if browser VAD did not fire.
            if getattr(config, "SAFETY_NET_SPEAKING_INTERRUPT", True):
                if self.sm.get_state() == "SPEAKING" and text.strip():
                    if self.turn_manager.is_text_evaluated(text.strip()):
                        logger.debug(
                            f"[Safety Net] Ignoring already-evaluated barge-in text '{text.strip()}'"
                        )
                    else:
                        decision, _ = self.turn_manager.interruption_handler.evaluate(
                            text=text.strip(),
                            has_voice=True,
                            rms_energy=0.05,
                            duration_sec=0.3,
                        )
                        if decision in ("interruption", "go_on"):
                            logger.info(
                                f"[Safety Net] Prisma STT returned real words '{text.strip()}' while SPEAKING "
                                f"(decision={decision}) -> triggering immediate pause"
                            )
                            asyncio.create_task(
                                self.turn_manager.on_user_voice_start(
                                    duration_ms=250.0,
                                    peak=0.5,
                                    rms=0.05,
                                    on_turn_complete=self.on_turn_complete,
                                )
                            )

        # Start STT session
        self.stt_session = PrismaSTTSession(on_transcript=on_stt_transcript)
        await self.stt_session.start()

        # Initial state broadcast
        await self.send_json({"type": "state", "state": self.sm.get_state()})

        try:
            while True:
                message = await self.websocket.receive()
                if "bytes" in message and message["bytes"]:
                    # Binary frame: Mic PCM audio chunk
                    raw_chunk = message["bytes"]
                    await self.turn_manager.on_audio_chunk(raw_chunk, on_turn_complete=self.on_turn_complete)
                    if self.stt_session:
                        await self.stt_session.send_audio(raw_chunk)

                elif "text" in message and message["text"]:
                    # JSON control frame
                    try:
                        data = json.loads(message["text"])
                        await self.handle_json_message(data)
                    except json.JSONDecodeError:
                        logger.warning(f"[WS] Invalid JSON received: {message['text']}")

        except (WebSocketDisconnect, WebSocketDisconnected):
            logger.info("[WS] Client disconnected.")
        except Exception as e:
            logger.error(f"[WS] Connection error: {e}")
        finally:
            await self.cleanup()

    async def handle_json_message(self, data: dict) -> None:
        """Processes client control messages with Step 0 Diagnostic logging."""
        msg_type = data.get("type")

        if msg_type == "vad_start":
            dur = data.get("duration_ms", 0.0)
            pk = data.get("peak", 0.0)
            rms = data.get("rms", 0.0)
            sp = data.get("speech_probability", 1.0)
            logger.info(
                f"[WS Diagnostic] vad_start received in state={self.sm.get_state()} | "
                f"duration={dur:.1f}ms, peak={pk:.3f}, RMS={rms:.4f}, speech_prob={sp:.2f}"
            )
            await self.turn_manager.on_user_voice_start(
                duration_ms=dur,
                peak=pk,
                rms=rms,
                speech_probability=sp,
            )

        elif msg_type == "blip_ignored":
            logger.info(f"[WS] Noise blip ignored reported by browser VAD in mode={self.turn_manager.mode}.")
            self.metrics_manager.record_blip_ignored(self.turn_manager.mode)
            await self.send_json(self.metrics_manager.get_browser_payload(self.current_turn_id, self.turn_manager.mode))

        elif msg_type == "set_language":
            requested_lang = data.get("language", "indic-auto")
            logger.info(f"[WS] Language override set to: {requested_lang}")
            self.current_language = requested_lang
            if self.stt_session:
                await self.stt_session.set_language_override(requested_lang)
            await self.send_json({"type": "language_set", "language": requested_lang})

        elif msg_type == "vad_end":
            logger.info(f"[WS] vad_end received in state={self.sm.get_state()}")
            self.last_vad_end_time = time.time()
            await self.turn_manager.on_user_voice_end(on_turn_complete=self.on_turn_complete)

        elif msg_type == "sentence_played":
            sentence_id = data.get("id")
            turn_id = data.get("turn_id", self.current_turn_id)
            kind = data.get("kind", "sentence")
            logger.info(
                f"[WS] sentence_played received: id={sentence_id}, turn_id={turn_id}, kind={kind}, state={self.sm.get_state()}"
            )
            if sentence_id is not None:
                if kind != "filler" and sentence_id != 0:
                    self.history.record_sentence_played(sentence_id)
                self.turn_manager.on_sentence_played(sentence_id, turn_id=turn_id, kind=kind)

        elif msg_type == "playback_finished":
            logger.info(f"[WS] playback_finished received in state={self.sm.get_state()}")
            self.turn_manager.on_playback_finished()

        elif msg_type == "wake":
            logger.info("[WS] wake message received.")
            await self.turn_manager.on_wake_tap()

        elif msg_type == "set_mode":
            mode = data.get("mode", "pause_first")
            self.turn_manager.set_mode(mode)
            await self.send_json({"type": "mode_set", "mode": mode})
            await self.send_json(self.metrics_manager.get_browser_payload(self.current_turn_id, mode))

        elif msg_type == "clear_ack":
            ack_turn_id = data.get("turn_id")
            if ack_turn_id is not None:
                self.last_cleared_turn_id = max(self.last_cleared_turn_id, int(ack_turn_id))
            logger.info(f"[WS] clear_ack received: turn_id={ack_turn_id}")
            self.clear_ack_event.set()

        elif msg_type == "set_stub_decision":
            dec = data.get("decision", "small_sound")
            self.turn_manager.set_stub_decision(dec)
            await self.send_json({"type": "stub_decision_set", "decision": dec})

    async def on_turn_complete(self, finalized_text: Optional[str] = None) -> None:
        """Executes when user turn is finalized."""
        # Ensure any active tasks from previous turn are cleanly cancelled and awaited
        await self.cancel_active_turn_tasks()

        user_text = (
            finalized_text
            or self.turn_manager.last_finalized_text
            or self.turn_manager.current_user_text
        ).strip()
        user_text = apply_aliases(user_text)

        # Reset STT transcript buffer so old text is not reused
        if self.stt_session:
            self.stt_session.reset_transcript()

        lang = self.current_language
        t_final_text = time.time()
        logger.info(f"[WS] Finalized user question: '{user_text}' (lang={lang})")

        # Module 7: Check if user utterance is a 'go on' continuation command
        norm_text = normalize_text(user_text)
        is_go_on = (norm_text in config.GO_ON_WORDS) or is_go_on_utterance(user_text) or (classify_utterance(user_text)[0] == "go_on")

        # Check reaction suppression (Reaction & Empty Go-On Suppression)
        onset_state = getattr(self.turn_manager, "speech_onset_state", None)
        if onset_state not in ("IDLE_CHECK", "WAKE", "SLEEP"):
            if is_reaction_utterance(user_text):
                logger.info(f"[WS] Reaction ignored: '{user_text}' (reason='reaction_ignored')")
                self.sm.transition_to("IDLE", reason="reaction_ignored")
                self.turn_manager.start_idle_timer()
                return

            if is_go_on and not self.history.has_unplayed_continuation():
                logger.info(f"[WS] Go-on ignored: nothing to continue for '{user_text}' (reason='go_on_nothing_to_continue')")
                self.sm.transition_to("IDLE", reason="go_on_nothing_to_continue")
                self.turn_manager.start_idle_timer()
                return

        if is_go_on and self.history.has_unplayed_continuation():
            logger.info("[WS] 'Go on' continuation detected! Playing saved unplayed sentences WITHOUT calling LLM.")
            cont_turn = self.history.apply_go_on_continuation(user_text, lang)
            turn_id = cont_turn.turn_id if cont_turn else self.turn_manager.turn_id
            self.current_turn_id = turn_id
            self.turn_manager.on_turn_started(turn_id)

            self.metrics_manager.start_turn(turn_id, self.turn_manager.mode, user_text, lang)
            self.metrics_manager.record_timestamp(turn_id, "voice_end", self.last_vad_end_time)
            self.metrics_manager.record_timestamp(turn_id, "final_text", t_final_text)
            self.metrics_manager.set_turn_attribute(turn_id, "is_continuation", True)

            await self.send_json({
                "type": "final_text",
                "text": user_text,
                "language": lang,
            })
            await self.send_json({
                "type": "sources",
                "sources": ["(Resumed remaining sentences without calling LLM)"],
                "refused": False,
            })

            target_turn, unplayed_sents, unplayed_recs = self.history.get_unplayed_for_continuation()
            if target_turn and unplayed_recs:
                await self.wait_for_clear_ack(turn_id)
                if turn_id != self.current_turn_id:
                    logger.warning(f"[WS] Dropping continuation audio: turn {turn_id} != current {self.current_turn_id}")
                    return

                if self.sm.get_state() != "SPEAKING":
                    self.sm.transition_to("SPEAKING", reason="go_on_continuation")
                    await asyncio.sleep(0)

                total_recs = len(unplayed_recs)
                self.turn_manager.set_turn_last_sentence(turn_id, total_recs)

                t_first_audio_recorded = False
                for idx, rec in enumerate(unplayed_recs, start=1):
                    sent_id = idx
                    sent_text = rec["translated_text"] or rec["text"]
                    audio_b64 = rec.get("audio_b64")
                    source = "cache_turn"
                    if not audio_b64:
                        wav_bytes = self.tts_client.synthesize(sent_text, language=lang)
                        audio_b64 = base64.b64encode(wav_bytes).decode("ascii")
                        rec["audio_b64"] = audio_b64
                        source = "timbre_live"

                    if not t_first_audio_recorded:
                        now_ts = time.time()
                        self.metrics_manager.record_timestamp(turn_id, "first_sentence_ready", now_ts)
                        self.metrics_manager.record_timestamp(turn_id, "first_tts_audio", now_ts)
                        self.metrics_manager.record_timestamp(turn_id, "playback_start", now_ts)
                        t_first_audio_recorded = True

                    self.turn_manager.on_sentence_started(sent_id)
                    is_last = (idx == total_recs)
                    logger.info(
                        f"[WS Audio] Sent clip sentence_id={sent_id}, turn_id={turn_id}, source={source}, is_last={is_last}, text='{sent_text[:40]}...'"
                    )
                    logger.info(f"[WS] tts_audio sent: turn_id={turn_id}, sentence_id={sent_id}, kind=sentence")
                    await self.send_json({
                        "type": "tts_audio",
                        "turn_id": turn_id,
                        "sentence_id": sent_id,
                        "audio": audio_b64,
                        "text": sent_text,
                        "refused": False,
                        "kind": "sentence",
                        "is_last": is_last,
                        "source": source,
                    })

                metric_rec = self.metrics_manager.finalize_turn(turn_id)
                if metric_rec:
                    await self.send_json(
                        self.metrics_manager.get_browser_payload(turn_id, self.turn_manager.mode, metric_rec.latencies_ms)
                    )
            return

        # Normal Turn: Record new turn in history and initialize metrics
        turn = self.history.start_new_turn(user_text, lang)
        turn_id = turn.turn_id
        self.current_turn_id = turn_id
        self.turn_sentence_counter = 0
        self.turn_manager.on_turn_started(turn_id)

        self.metrics_manager.start_turn(turn_id, self.turn_manager.mode, user_text, lang)
        self.metrics_manager.record_timestamp(turn_id, "voice_end", self.last_vad_end_time)
        self.metrics_manager.record_timestamp(turn_id, "final_text", t_final_text)

        await self.send_json({
            "type": "final_text",
            "text": user_text,
            "language": lang,
        })

        # Part A: Small Talk Check (Runs right after final text, BEFORE translation and retrieval)
        st_match = detect_smalltalk(user_text, lang)
        if st_match is not None:
            logger.info(
                f"[WS] Small talk detected: intent='{st_match.intent}', matched='{st_match.matched_phrase}', "
                f"lang='{st_match.target_lang}', variant={st_match.variant_idx}, reply='{st_match.reply_text}'"
            )
            self.metrics_manager.set_turn_attribute(turn_id, "intent", "smalltalk")
            self.metrics_manager.set_turn_attribute(turn_id, "smalltalk_intent", st_match.intent)
            self.metrics_manager.set_turn_attribute(turn_id, "smalltalk_phrase", st_match.matched_phrase)

            self.history.add_assistant_sentence(st_match.reply_text, translated_text=st_match.reply_text)
            self.history.finalize_current_turn()

            # Empty sources for small talk
            await self.send_json({"type": "sources", "sources": [], "refused": False, "smalltalk": True})

            # Handshake: wait for clear_ack before sending audio
            await self.wait_for_clear_ack(turn_id)
            if turn_id != self.current_turn_id:
                logger.warning(f"[WS] Dropping smalltalk audio: turn {turn_id} != current {self.current_turn_id}")
                return

            wav_bytes = get_smalltalk_audio(st_match, self.tts_client)
            b64_audio = base64.b64encode(wav_bytes).decode("ascii")

            sentence_id = 1
            self.turn_manager.set_turn_last_sentence(turn_id, sentence_id)

            self.sm.transition_to("SPEAKING", reason=f"smalltalk_{st_match.intent}")
            await asyncio.sleep(0)
            self.turn_manager.on_sentence_started(sentence_id)

            now_ts = time.time()
            self.metrics_manager.record_timestamp(turn_id, "first_sentence_ready", now_ts)
            self.metrics_manager.record_timestamp(turn_id, "first_tts_audio", now_ts)
            self.metrics_manager.record_timestamp(turn_id, "playback_start", now_ts)

            logger.info(
                f"[WS Audio] Sent clip sentence_id={sentence_id}, turn_id={turn_id}, "
                f"source=cache_file:{st_match.cache_key}, is_last=True"
            )
            logger.info(f"[WS] tts_audio sent: turn_id={turn_id}, sentence_id={sentence_id}, kind=sentence")
            await self.send_json({
                "type": "tts_audio",
                "turn_id": turn_id,
                "sentence_id": sentence_id,
                "audio": b64_audio,
                "text": st_match.reply_text,
                "refused": False,
                "kind": "sentence",
                "is_last": True,
                "source": f"cache_file:{st_match.cache_key}",
            })

            metric_rec = self.metrics_manager.finalize_turn(turn_id)
            if metric_rec:
                await self.send_json(
                    self.metrics_manager.get_browser_payload(turn_id, self.turn_manager.mode, metric_rec.latencies_ms)
                )
            return

        # 1. Translate question to English if needed (Step 4 of Plan)
        if not lang.lower().startswith("en"):
            logger.info(f"[WS] Translating user question to English from {lang}...")
            query_en = translate(user_text, from_lang=lang, to_lang="en")
            logger.info(f"[WS] Translated question: '{query_en}'")
            self.metrics_manager.record_timestamp(turn_id, "translation_done", time.time())
        else:
            query_en = user_text
            self.metrics_manager.record_timestamp(turn_id, "translation_done", t_final_text)

        # 2. RAG Hybrid Retrieval & Refusal Gate Check (Step 5 of Plan)
        query_en = apply_aliases(query_en)
        retrieval = self.retriever.retrieve(query_en, top_k=config.RAG_TOP_K)
        self.metrics_manager.record_timestamp(turn_id, "retrieval_done", time.time())

        # 3. Refusal Gate: If refused, speak fixed 'not_in_docs' and skip LLM
        if retrieval.refused:
            logger.info(
                f"[WS] RAG Refusal Gate: Question refused (raw_v={retrieval.top_vector_score:.4f}, raw_bm25={retrieval.top_bm25_score:.4f})"
            )
            self.history.mark_refused()
            self.history.finalize_current_turn()
            self.metrics_manager.set_turn_attribute(turn_id, "refused", True)

            # Send empty sources
            await self.send_json({"type": "sources", "sources": [], "refused": True})

            # Wait for clear_ack handshake before sending refusal audio
            await self.wait_for_clear_ack(turn_id)
            if turn_id != self.current_turn_id:
                logger.warning(f"[WS] Dropping refusal audio: turn {turn_id} != current {self.current_turn_id}")
                return

            refusal_text = config.CACHE_PHRASES.get("not_in_docs", {}).get(
                lang, config.CACHE_PHRASES["not_in_docs"]["hi-IN"]
            )
            wav_bytes = get_cached_audio("not_in_docs", language=lang)
            b64_audio = base64.b64encode(wav_bytes).decode("ascii")

            sentence_id = 1
            self.turn_manager.set_turn_last_sentence(turn_id, sentence_id)

            self.sm.transition_to("SPEAKING", reason="refusal_not_in_docs")
            await asyncio.sleep(0)
            self.turn_manager.on_sentence_started(sentence_id)

            now_ts = time.time()
            self.metrics_manager.record_timestamp(turn_id, "first_sentence_ready", now_ts)
            self.metrics_manager.record_timestamp(turn_id, "first_tts_audio", now_ts)
            self.metrics_manager.record_timestamp(turn_id, "playback_start", now_ts)

            logger.info(
                f"[WS Audio] Sent clip sentence_id={sentence_id}, turn_id={turn_id}, source=cache_file:not_in_docs, is_last=True"
            )
            logger.info(f"[WS] tts_audio sent: turn_id={turn_id}, sentence_id={sentence_id}, kind=sentence")
            await self.send_json({
                "type": "tts_audio",
                "turn_id": turn_id,
                "sentence_id": sentence_id,
                "audio": b64_audio,
                "text": refusal_text,
                "refused": True,
                "kind": "sentence",
                "is_last": True,
                "source": "cache_file:not_in_docs",
            })

            metric_rec = self.metrics_manager.finalize_turn(turn_id)
            if metric_rec:
                await self.send_json(
                    self.metrics_manager.get_browser_payload(turn_id, self.turn_manager.mode, metric_rec.latencies_ms)
                )
            return

        # 4. Accepted: Send sources to client
        await self.send_json({
            "type": "sources",
            "sources": retrieval.sources,
            "titles": retrieval.titles,
            "source_details": retrieval.source_details,
            "refused": False,
        })

        # 5. Launch streaming generation pipeline as tracked task
        await self.cancel_active_turn_tasks()
        self.llm_cancel_event = asyncio.Event()
        self.llm_task = asyncio.create_task(
            self._generate_and_stream_response(query_en, retrieval.top_chunks, lang, turn_id)
        )
        self.current_turn_tasks.append(self.llm_task)

    async def _please_wait_timer(self, lang: str, first_sent_event: asyncio.Event, turn_id: int) -> None:
        """Plays 'please wait' filler clip if first sentence takes longer than 1.5s."""
        try:
            await asyncio.sleep(config.FIRST_SENTENCE_WAIT_TIMEOUT_SEC)
            if not first_sent_event.is_set() and not self.llm_cancel_event.is_set() and turn_id == self.current_turn_id:
                # Handshake: wait for clear_ack before sending filler
                await self.wait_for_clear_ack(turn_id)
                if first_sent_event.is_set() or self.llm_cancel_event.is_set() or turn_id != self.current_turn_id:
                    return

                logger.info("[WS] First sentence latency exceeded 1.5s. Playing 'please wait' clip.")
                pw_text = config.CACHE_PHRASES.get("please_wait", {}).get(
                    lang, config.CACHE_PHRASES["please_wait"]["hi-IN"]
                )
                wav_bytes = get_cached_audio("please_wait", language=lang)
                b64_audio = base64.b64encode(wav_bytes).decode("ascii")

                if self.sm.get_state() == "THINKING":
                    self.sm.transition_to("SPEAKING", reason="interim_please_wait")
                    await asyncio.sleep(0)

                logger.info(
                    f"[WS Audio] Sent filler clip sentence_id=0, turn_id={turn_id}, source=cache_file:please_wait"
                )
                logger.info(f"[WS] tts_audio sent: turn_id={turn_id}, sentence_id=0, kind=filler")
                await self.send_json({
                    "type": "tts_audio",
                    "turn_id": turn_id,
                    "sentence_id": 0,
                    "audio": b64_audio,
                    "text": pw_text,
                    "interim": True,
                    "refused": False,
                    "kind": "filler",
                    "is_last": False,
                    "source": "cache_file:please_wait",
                })
        except asyncio.CancelledError:
            pass

    async def _generate_and_stream_response(
        self,
        query_en: str,
        top_chunks: list,
        lang: str,
        turn_id: int,
    ) -> None:
        """
        Full pipeline:
        Qwen stream -> sentence splitter -> serialized TTS queue -> Timbre synthesis -> send tts_audio.
        """
        first_token_recorded = False
        first_sent_recorded = False

        first_sent_event = asyncio.Event()
        pw_task = asyncio.create_task(self._please_wait_timer(lang, first_sent_event, turn_id))
        self.current_turn_tasks.append(pw_task)

        sentence_queue: asyncio.Queue = asyncio.Queue()
        tts_worker_task = asyncio.create_task(
            self._tts_worker(turn_id, lang, sentence_queue, first_sent_event, pw_task)
        )
        self.current_turn_tasks.append(tts_worker_task)

        messages = build_qwen_prompt(
            question=query_en,
            chunks=top_chunks,
            history_turns=self.history.get_recent_turns(),
        )

        splitter = StreamingSentenceSplitter(min_char_len=config.MIN_SENTENCE_CHAR_LEN)
        dispatched_count = 0

        try:
            logger.info("[WS] Streaming response from Qwen with thinking OFF...")
            async for token in self.llm_client.stream_chat(messages, cancel_event=self.llm_cancel_event):
                if self.llm_cancel_event.is_set() or turn_id != self.current_turn_id:
                    break

                if not first_token_recorded:
                    self.metrics_manager.record_timestamp(turn_id, "first_llm_token", time.time())
                    first_token_recorded = True

                ready_sentences = splitter.feed(token)
                for sentence_en in ready_sentences:
                    if self.llm_cancel_event.is_set() or turn_id != self.current_turn_id:
                        break
                    if not first_sent_recorded:
                        self.metrics_manager.record_timestamp(turn_id, "first_sentence_ready", time.time())
                        first_sent_recorded = True

                    dispatched_count += 1
                    await sentence_queue.put((sentence_en, False, dispatched_count))

            # Flush remaining sentences in buffer
            if not self.llm_cancel_event.is_set() and turn_id == self.current_turn_id:
                remaining = splitter.flush()
                for remaining_en in remaining:
                    if self.llm_cancel_event.is_set() or turn_id != self.current_turn_id:
                        break
                    if not first_sent_recorded:
                        self.metrics_manager.record_timestamp(turn_id, "first_sentence_ready", time.time())
                        first_sent_recorded = True

                    dispatched_count += 1
                    await sentence_queue.put((remaining_en, False, dispatched_count))

                # Notify turn manager that generation is done and identify last sentence
                logger.info(
                    f"[WS] Finished LLM generation for turn {turn_id}: total {dispatched_count} sentences."
                )
                self.turn_manager.set_turn_last_sentence(turn_id, dispatched_count)

                # Send turn_last_sentence control frame so frontend knows final sentence
                await self.send_json({
                    "type": "turn_last_sentence",
                    "turn_id": turn_id,
                    "last_sentence_id": dispatched_count,
                })

            # Signal worker that generation has concluded
            await sentence_queue.put(None)
            # Await completion of serialized TTS worker
            await tts_worker_task

            self.history.finalize_current_turn()
            metric_rec = self.metrics_manager.finalize_turn(turn_id)
            if metric_rec:
                await self.send_json(
                    self.metrics_manager.get_browser_payload(turn_id, self.turn_manager.mode, metric_rec.latencies_ms)
                )

        except asyncio.CancelledError:
            logger.info("[WS] LLM stream cancelled by interruption.")
            self.metrics_manager.set_turn_attribute(turn_id, "interrupted", True)
            self.metrics_manager.finalize_turn(turn_id)
        except Exception as e:
            logger.error(f"[WS] Error during response generation: {e}")
        finally:
            if not pw_task.done():
                pw_task.cancel()
            if not tts_worker_task.done():
                tts_worker_task.cancel()

    async def _tts_worker(
        self,
        turn_id: int,
        lang: str,
        sentence_queue: asyncio.Queue,
        first_sent_event: asyncio.Event,
        pw_task: asyncio.Task,
    ) -> None:
        """Serialized worker: translates and synthesizes sentences strictly in order for turn_id."""
        first_tts_recorded = False
        try:
            while True:
                item = await sentence_queue.get()
                if item is None:
                    sentence_queue.task_done()
                    break

                sentence_en, is_last, sentence_id = item
                sentence_queue.task_done()

                # Guard: verify turn is still active
                if turn_id != self.current_turn_id or self.llm_cancel_event.is_set():
                    logger.warning(
                        f"[WS] Dropping queued sentence #{sentence_id}: turn {turn_id} != current {self.current_turn_id} or cancelled."
                    )
                    break

                # Handshake: before sending the first audio sentence, wait for clear_ack
                if sentence_id == 1:
                    await self.wait_for_clear_ack(turn_id)
                    if turn_id != self.current_turn_id or self.llm_cancel_event.is_set():
                        logger.warning(
                            f"[WS] Dropping sentence #{sentence_id} after clear_ack wait: turn {turn_id} != current {self.current_turn_id}"
                        )
                        break

                await self._dispatch_sentence(
                    sentence_en,
                    lang,
                    first_sent_event,
                    pw_task,
                    turn_id,
                    first_tts_recorded,
                    sentence_id=sentence_id,
                    is_last=is_last,
                )
                first_tts_recorded = True

        except asyncio.CancelledError:
            logger.info(f"[WS] TTS worker for turn {turn_id} cancelled.")
        except Exception as e:
            logger.error(f"[WS] TTS worker error for turn {turn_id}: {e}", exc_info=True)

    async def _dispatch_sentence(
        self,
        sentence_en: str,
        lang: str,
        first_sent_event: asyncio.Event,
        pw_task: asyncio.Task,
        turn_id: int,
        first_tts_recorded: bool,
        sentence_id: int,
        is_last: bool = False,
    ) -> None:
        """Translates, synthesizes, and dispatches a single completed sentence."""
        clean_en = sentence_en.strip()
        if not clean_en:
            return

        if turn_id != self.current_turn_id or self.llm_cancel_event.is_set():
            logger.warning(f"[WS] Dropping dispatch #{sentence_id} for turn {turn_id} != current {self.current_turn_id}")
            return

        # Mark first sentence ready to suppress 'please wait'
        first_sent_event.set()
        if not pw_task.done():
            pw_task.cancel()

        # 1. Translate sentence to user's language if needed
        if not lang.lower().startswith("en"):
            translated_text = translate(clean_en, from_lang="en", to_lang=lang)
        else:
            translated_text = clean_en

        if turn_id != self.current_turn_id or self.llm_cancel_event.is_set():
            logger.warning(
                f"[WS] Dropping sentence #{sentence_id} post-translation: turn {turn_id} != current {self.current_turn_id}"
            )
            return

        logger.info(f"[WS] Synthesizing sentence #{sentence_id}: '{translated_text}' (lang={lang})")

        # 2. Synthesize via Timbre
        wav_bytes = self.tts_client.synthesize(translated_text, language=lang)
        if turn_id != self.current_turn_id or self.llm_cancel_event.is_set():
            logger.warning(
                f"[WS] Dropping synthesized audio for #{sentence_id}: turn {turn_id} != current {self.current_turn_id}"
            )
            return

        b64_audio = base64.b64encode(wav_bytes).decode("ascii")

        now_ts = time.time()
        if not first_tts_recorded:
            self.metrics_manager.record_timestamp(turn_id, "first_tts_audio", now_ts)
            self.metrics_manager.record_timestamp(turn_id, "playback_start", now_ts)

        # 3. Transition to SPEAKING and notify TurnManager & History
        if self.sm.get_state() != "SPEAKING":
            self.sm.transition_to("SPEAKING", reason="tts_ready")
            await asyncio.sleep(0)

        self.turn_manager.on_sentence_started(sentence_id)
        self.history.add_assistant_sentence(translated_text, translated_text=translated_text, audio_b64=b64_audio)

        logger.info(
            f"[WS Audio] Sent clip sentence_id={sentence_id}, turn_id={turn_id}, source=timbre_live, is_last={is_last}, text='{translated_text[:40]}...'"
        )
        logger.info(f"[WS] tts_audio sent: turn_id={turn_id}, sentence_id={sentence_id}, kind=sentence")

        # 4. Dispatch tts_audio payload to client
        if turn_id != self.current_turn_id or self.llm_cancel_event.is_set():
            logger.warning(f"[WS] Dropping send_json for #{sentence_id}: turn {turn_id} != current {self.current_turn_id}")
            return

        await self.send_json({
            "type": "tts_audio",
            "turn_id": turn_id,
            "sentence_id": sentence_id,
            "audio": b64_audio,
            "text": translated_text,
            "refused": False,
            "kind": "sentence",
            "is_last": is_last,
            "source": "timbre_live",
        })

    async def cleanup(self) -> None:
        """Cleans up active resources on client disconnect."""
        logger.info("[WS] Cleaning up connection resources...")
        await self.cancel_active_turn_tasks()
        if self.stt_session:
            await self.stt_session.close()
            self.stt_session = None
        self.turn_manager.reset_user_turn()

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
from Backend.audio_cache_manager import get_cached_audio
from Backend.rag import HybridRetriever
from Backend.history import HistoryManager
from Backend.llm import QwenClient, build_qwen_prompt, StreamingSentenceSplitter
from Backend.translate import translate
from Backend.interruption import classify_utterance, normalize_text
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
        self.sentence_counter = 0
        self.current_turn_id = 0
        self.last_vad_end_time = time.time()

        # LLM streaming task tracking & cancellation
        self.llm_task: Optional[asyncio.Task] = None
        self.llm_cancel_event = asyncio.Event()

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

    def on_interruption_stop(self) -> None:
        """Called when a real interruption is confirmed: cancels LLM immediately."""
        logger.info("[WS] Real interruption detected: cancelling active LLM generation.")
        self.cancel_llm()

    def cancel_llm(self) -> None:
        """Cancels active LLM generation task."""
        self.llm_cancel_event.set()
        if self.llm_task and not self.llm_task.done():
            self.llm_task.cancel()
            self.llm_task = None
        self.history.mark_interrupted()

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

            msg = {
                "type": "final_text" if is_final else "partial_text",
                "text": text,
                "language": self.current_language,
            }
            asyncio.create_task(self.send_json(msg))

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
        """Processes client control messages."""
        msg_type = data.get("type")

        if msg_type == "vad_start":
            await self.turn_manager.on_user_voice_start()

        elif msg_type == "vad_end":
            self.last_vad_end_time = time.time()
            await self.turn_manager.on_user_voice_end(on_turn_complete=self.on_turn_complete)

        elif msg_type == "sentence_played":
            sentence_id = data.get("id")
            if sentence_id is not None:
                self.history.record_sentence_played(sentence_id)
                self.turn_manager.on_sentence_played(sentence_id)

        elif msg_type == "playback_finished":
            self.turn_manager.on_playback_finished()

        elif msg_type == "wake":
            await self.turn_manager.on_wake_tap()

        elif msg_type == "set_mode":
            mode = data.get("mode", "pause_first")
            self.turn_manager.set_mode(mode)
            await self.send_json({"type": "mode_set", "mode": mode})
            await self.send_json(self.metrics_manager.get_browser_payload(self.current_turn_id, mode))

        elif msg_type == "set_stub_decision":
            dec = data.get("decision", "small_sound")
            self.turn_manager.set_stub_decision(dec)
            await self.send_json({"type": "stub_decision_set", "decision": dec})

    async def on_turn_complete(self) -> None:
        """Executes when user turn is finalized after 700ms silence."""
        user_text = self.turn_manager.current_user_text
        lang = self.current_language
        t_final_text = time.time()
        logger.info(f"[WS] Finalized user question: '{user_text}' (lang={lang})")

        # Module 7: Check if user utterance is a 'go on' continuation command
        norm_text = normalize_text(user_text)
        is_go_on = (norm_text in config.GO_ON_WORDS) or (classify_utterance(user_text)[0] == "go_on")

        if is_go_on and self.history.has_unplayed_continuation():
            logger.info("[WS] 'Go on' continuation detected! Playing saved unplayed sentences WITHOUT calling LLM.")
            cont_turn = self.history.apply_go_on_continuation(user_text, lang)
            turn_id = cont_turn.turn_id if cont_turn else self.sentence_counter + 1
            self.current_turn_id = turn_id

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
                if self.sm.get_state() != "SPEAKING":
                    self.sm.transition_to("SPEAKING", reason="go_on_continuation")
                    await asyncio.sleep(0)

                t_first_audio_recorded = False
                for rec in unplayed_recs:
                    sent_id = rec["id"]
                    sent_text = rec["translated_text"] or rec["text"]
                    audio_b64 = rec.get("audio_b64")
                    if not audio_b64:
                        wav_bytes = self.tts_client.synthesize(sent_text, language=lang)
                        audio_b64 = base64.b64encode(wav_bytes).decode("ascii")
                        rec["audio_b64"] = audio_b64

                    if not t_first_audio_recorded:
                        now_ts = time.time()
                        self.metrics_manager.record_timestamp(turn_id, "first_sentence_ready", now_ts)
                        self.metrics_manager.record_timestamp(turn_id, "first_tts_audio", now_ts)
                        self.metrics_manager.record_timestamp(turn_id, "playback_start", now_ts)
                        t_first_audio_recorded = True

                    self.turn_manager.on_sentence_started(sent_id)
                    await self.send_json({
                        "type": "tts_audio",
                        "sentence_id": sent_id,
                        "audio": audio_b64,
                        "text": sent_text,
                        "refused": False,
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

        self.metrics_manager.start_turn(turn_id, self.turn_manager.mode, user_text, lang)
        self.metrics_manager.record_timestamp(turn_id, "voice_end", self.last_vad_end_time)
        self.metrics_manager.record_timestamp(turn_id, "final_text", t_final_text)

        await self.send_json({
            "type": "final_text",
            "text": user_text,
            "language": lang,
        })

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

            refusal_text = config.CACHE_PHRASES.get("not_in_docs", {}).get(
                lang, config.CACHE_PHRASES["not_in_docs"]["hi-IN"]
            )
            wav_bytes = get_cached_audio("not_in_docs", language=lang)
            b64_audio = base64.b64encode(wav_bytes).decode("ascii")

            self.sentence_counter += 1
            sentence_id = self.sentence_counter

            self.sm.transition_to("SPEAKING", reason="refusal_not_in_docs")
            await asyncio.sleep(0)
            self.turn_manager.on_sentence_started(sentence_id)

            now_ts = time.time()
            self.metrics_manager.record_timestamp(turn_id, "first_sentence_ready", now_ts)
            self.metrics_manager.record_timestamp(turn_id, "first_tts_audio", now_ts)
            self.metrics_manager.record_timestamp(turn_id, "playback_start", now_ts)

            await self.send_json({
                "type": "tts_audio",
                "sentence_id": sentence_id,
                "audio": b64_audio,
                "text": refusal_text,
                "refused": True,
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
            "refused": False,
        })

        # 5. Launch streaming generation pipeline as tracked task
        self.cancel_llm()
        self.llm_cancel_event = asyncio.Event()
        self.llm_task = asyncio.create_task(
            self._generate_and_stream_response(query_en, retrieval.top_chunks, lang, turn_id)
        )

    async def _please_wait_timer(self, lang: str, first_sent_event: asyncio.Event) -> None:
        """Plays 'please wait' clip if first sentence takes longer than 1.5s."""
        try:
            await asyncio.sleep(config.FIRST_SENTENCE_WAIT_TIMEOUT_SEC)
            if not first_sent_event.is_set() and not self.llm_cancel_event.is_set():
                logger.info("[WS] First sentence latency exceeded 1.5s. Playing 'please wait' clip.")
                pw_text = config.CACHE_PHRASES.get("please_wait", {}).get(
                    lang, config.CACHE_PHRASES["please_wait"]["hi-IN"]
                )
                wav_bytes = get_cached_audio("please_wait", language=lang)
                b64_audio = base64.b64encode(wav_bytes).decode("ascii")

                if self.sm.get_state() == "THINKING":
                    self.sm.transition_to("SPEAKING", reason="interim_please_wait")
                    await asyncio.sleep(0)

                await self.send_json({
                    "type": "tts_audio",
                    "sentence_id": 0,
                    "audio": b64_audio,
                    "text": pw_text,
                    "interim": True,
                    "refused": False,
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
        Qwen stream -> sentence splitter -> translate each sentence -> Timbre synthesis -> send tts_audio.
        """
        first_token_recorded = False
        first_sent_recorded = False
        first_tts_recorded = False

        first_sent_event = asyncio.Event()
        pw_task = asyncio.create_task(self._please_wait_timer(lang, first_sent_event))

        messages = build_qwen_prompt(
            question=query_en,
            chunks=top_chunks,
            history_turns=self.history.get_recent_turns(),
        )

        splitter = StreamingSentenceSplitter(min_char_len=config.MIN_SENTENCE_CHAR_LEN)

        try:
            logger.info("[WS] Streaming response from Qwen with thinking OFF...")
            async for token in self.llm_client.stream_chat(messages, cancel_event=self.llm_cancel_event):
                if self.llm_cancel_event.is_set():
                    break

                if not first_token_recorded:
                    self.metrics_manager.record_timestamp(turn_id, "first_llm_token", time.time())
                    first_token_recorded = True

                ready_sentences = splitter.feed(token)
                for sentence_en in ready_sentences:
                    if self.llm_cancel_event.is_set():
                        break
                    if not first_sent_recorded:
                        self.metrics_manager.record_timestamp(turn_id, "first_sentence_ready", time.time())
                        first_sent_recorded = True

                    await self._dispatch_sentence(
                        sentence_en, lang, first_sent_event, pw_task, turn_id, first_tts_recorded
                    )
                    first_tts_recorded = True

            # Flush any remaining text in buffer
            if not self.llm_cancel_event.is_set():
                for remaining_en in splitter.flush():
                    if self.llm_cancel_event.is_set():
                        break
                    if not first_sent_recorded:
                        self.metrics_manager.record_timestamp(turn_id, "first_sentence_ready", time.time())
                        first_sent_recorded = True

                    await self._dispatch_sentence(
                        remaining_en, lang, first_sent_event, pw_task, turn_id, first_tts_recorded
                    )
                    first_tts_recorded = True

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

    async def _dispatch_sentence(
        self,
        sentence_en: str,
        lang: str,
        first_sent_event: asyncio.Event,
        pw_task: asyncio.Task,
        turn_id: int,
        first_tts_recorded: bool,
    ) -> None:
        """Translates, synthesizes, and dispatches a single completed sentence."""
        clean_en = sentence_en.strip()
        if not clean_en:
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

        logger.info(f"[WS] Synthesizing sentence: '{translated_text}' (lang={lang})")

        # 2. Synthesize via Timbre
        wav_bytes = self.tts_client.synthesize(translated_text, language=lang)
        b64_audio = base64.b64encode(wav_bytes).decode("ascii")

        now_ts = time.time()
        if not first_tts_recorded:
            self.metrics_manager.record_timestamp(turn_id, "first_tts_audio", now_ts)
            self.metrics_manager.record_timestamp(turn_id, "playback_start", now_ts)

        self.sentence_counter += 1
        sentence_id = self.sentence_counter

        # 3. Transition to SPEAKING and notify TurnManager & History
        if self.sm.get_state() != "SPEAKING":
            self.sm.transition_to("SPEAKING", reason="tts_ready")
            await asyncio.sleep(0)

        self.turn_manager.on_sentence_started(sentence_id)
        self.history.add_assistant_sentence(translated_text, translated_text=translated_text, audio_b64=b64_audio)

        # 4. Dispatch tts_audio payload to client
        await self.send_json({
            "type": "tts_audio",
            "sentence_id": sentence_id,
            "audio": b64_audio,
            "text": translated_text,
            "refused": False,
        })

    async def cleanup(self) -> None:
        """Cleans up active resources."""
        self.cancel_llm()
        if self.stt_session:
            await self.stt_session.close()
            self.stt_session = None
        self.turn_manager.reset_user_turn()

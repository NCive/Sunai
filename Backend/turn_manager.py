"""
Turn Manager for Sunai Voice Assistant.
Coordinates conversational turns, 700ms silence detection, pause-first interruption
versus baseline mode, sentence playback tracking, real interruption classification,
unclear speech escalation ("ji?"), and idle check / sleep / wake transitions.
"""

import asyncio
import base64
import logging
import math
import struct
import time
from typing import Any, Callable, List, Optional, Set

from Backend import config
from Backend.audio_cache_manager import get_cached_audio
from Backend.interruption import InterruptionHandler
from Backend.state_machine import SunaiStateMachine
from Backend.metrics import get_metrics_manager

logger = logging.getLogger(__name__)

EventCallback = Callable[[str, dict], Any]


def calculate_pcm_rms(chunk: bytes) -> float:
    """Calculates normalized RMS energy (0.0 to 1.0) of 16-bit linear PCM audio."""
    if not chunk or len(chunk) < 2:
        return 0.0
    count = len(chunk) // 2
    format_str = f"<{count}h"
    try:
        samples = struct.unpack(format_str, chunk[: count * 2])
        sum_sq = sum(s * s for s in samples)
        rms = math.sqrt(sum_sq / count) / 32768.0
        return rms
    except Exception:
        return 0.0


class TurnManager:
    """
    Manages conversational turn-taking, silence timers, real interruption classification,
    and idle / sleep states.
    """

    def __init__(
        self,
        state_machine: SunaiStateMachine,
        send_event: EventCallback,
        mode: str = "pause_first",
        on_interruption: Optional[Callable[[], Any]] = None,
        metrics_manager: Optional[Any] = None,
    ):
        self.sm = state_machine
        self.send_event = send_event
        self.mode = mode  # 'pause_first' or 'baseline'
        self.on_interruption = on_interruption
        self.metrics_manager = metrics_manager or get_metrics_manager()

        # Interruption classifier & handler
        self.interruption_handler = InterruptionHandler()
        self.stub_override: Optional[str] = None  # Optional override for testing

        # User turn tracking
        self.turn_id = 0
        self.has_new_speech: bool = False
        self.has_final_transcript: bool = False
        self.last_finalized_text: str = ""
        self.user_speech_start: Optional[float] = None
        self.last_audio_time: float = time.time()
        self.silence_timer_task: Optional[asyncio.Task] = None
        self.pause_eval_task: Optional[asyncio.Task] = None
        self.on_turn_complete_cb: Optional[Callable[[Optional[str]], Any]] = None

        # Audio energy tracking during PAUSED check window
        self.paused_energy_samples: List[float] = []
        self.paused_start_time: float = 0.0

        # Bot speech and sentence tracking
        self.bot_sentences: List[str] = []
        self.heard_upto: int = 0
        self.active_sentence_id: Optional[int] = None
        self.interrupted: bool = False

        # Per-turn completion tracking (Bug 3)
        self.active_turn_id: int = 0
        self.turn_is_last_sent: bool = False
        self.turn_last_sentence_id: Optional[int] = None
        self.played_sentences: Set[int] = set()

        # Current transcript in turn
        self.current_user_text: str = ""
        self.current_language: str = "hi-IN"

        # Idle check tracking (Section 13)
        self.idle_timer_task: Optional[asyncio.Task] = None
        self.idle_asked_once: bool = False

    def set_mode(self, mode: str) -> None:
        """Sets interruption mode: 'pause_first' or 'baseline'."""
        self.mode = mode
        logger.info(f"[TurnManager] Mode updated: {self.mode}")

    def set_stub_decision(self, decision: Optional[str]) -> None:
        """Sets optional stub classifier override only if ENABLE_STUB_DECISIONS is True."""
        if not config.ENABLE_STUB_DECISIONS:
            logger.info("[TurnManager] Stub decision ignored (config.ENABLE_STUB_DECISIONS is False).")
            self.stub_override = None
            return
        self.stub_override = decision
        logger.info(f"[TurnManager] Stub override updated: {self.stub_override}")

    def text_looks_finished(self, text: str) -> bool:
        """Checks whether the transcript has minimum content to be considered finished."""
        clean = text.strip()
        return len(clean) >= config.TEXT_FINISHED_MIN_CHARS

    def on_turn_started(self, turn_id: int) -> None:
        """Initializes per-turn sentence tracking when generation begins."""
        self.active_turn_id = turn_id
        self.turn_is_last_sent = False
        self.turn_last_sentence_id = None
        self.played_sentences.clear()
        logger.info(f"[TurnManager] Started tracking answer sentences for turn_id={turn_id}")

    def set_turn_last_sentence(self, turn_id: int, last_sentence_id: int) -> None:
        """Marks that LLM generation finished for this turn and identifies the final sentence."""
        if turn_id == self.active_turn_id:
            self.turn_is_last_sent = True
            self.turn_last_sentence_id = last_sentence_id
            logger.info(
                f"[TurnManager] Turn {turn_id} final sentence identified as #{last_sentence_id} (played={self.played_sentences})"
            )
            if last_sentence_id in self.played_sentences:
                self._finish_speaking_turn()

    async def on_audio_chunk(self, chunk: bytes, on_turn_complete: Callable[[Optional[str]], Any]) -> None:
        """
        Inspects incoming mic audio:
        - During PAUSED state: collects energy samples for interruption classifier.
        - During LISTENING state: enforces 20s safety turn limit strictly during active user speech.
        """
        now = time.time()
        self.last_audio_time = now

        current_state = self.sm.get_state()

        if current_state == "PAUSED":
            rms = calculate_pcm_rms(chunk)
            self.paused_energy_samples.append(rms)

        elif current_state == "LISTENING" and self.has_new_speech and self.user_speech_start:
            duration = now - self.user_speech_start
            if duration >= config.SAFETY_TURN_LIMIT_SEC:
                logger.warning(
                    f"[TurnManager] Safety turn limit reached ({config.SAFETY_TURN_LIMIT_SEC}s) during active user speech. Forcing turn end."
                )
                if self.text_looks_finished(self.current_user_text):
                    await self._finalize_turn(on_turn_complete)
                else:
                    self.user_speech_start = None
                    self.has_new_speech = False

    async def on_user_voice_start(self) -> None:
        """Called when browser VAD detects speech onset."""
        now = time.time()
        current_state = self.sm.get_state()
        logger.info(f"[TurnManager] vad_start received in state={current_state}")

        if self.user_speech_start is None:
            self.user_speech_start = now
        self.last_audio_time = now
        self.has_new_speech = True
        self.has_final_transcript = False

        # Cancel any active idle timers
        self._cancel_idle_timers()

        # Cancel any pending silence timer
        if self.silence_timer_task and not self.silence_timer_task.done():
            self.silence_timer_task.cancel()
            self.silence_timer_task = None

        # Wake from SLEEP on voice
        if current_state == "SLEEP":
            logger.info("[TurnManager] Waking from SLEEP via voice.")
            self.sm.transition_to("WAKE", reason="wake_on_voice")
            await asyncio.sleep(0)
            self.sm.transition_to("LISTENING", reason="user_speech_onset")
            return

        elif current_state == "IDLE_CHECK":
            logger.info("[TurnManager] User spoke during IDLE_CHECK. Transitioning to LISTENING.")
            self.sm.transition_to("LISTENING", reason="user_speech_onset")
            return

        # Interruption flow: User spoke while bot is speaking
        if current_state == "SPEAKING":
            self.interrupted = True

            if self.mode == "baseline":
                # Baseline mode: Immediate hard stop
                logger.info("[TurnManager] [Baseline] Hard stop on voice. Clearing queue.")
                if self.on_interruption:
                    res = self.on_interruption()
                    if asyncio.iscoroutine(res):
                        await res
                self.sm.transition_to("LISTENING", reason="baseline_hard_stop")
                await asyncio.sleep(0)
                await self.send_event("clear_queue", {})
                await self.send_event("decision", {"decision": "interruption", "text": "[baseline]"})

                # Schedule post-speech evaluation to log baseline metrics & wrong stops
                asyncio.create_task(self._evaluate_baseline_interruption())
                return

            # Pause-First mode:
            # Pause audio immediately and start classification window (300-500 ms)
            logger.info("[TurnManager] [Pause-First] Pausing bot audio immediately.")
            self.paused_start_time = now
            self.paused_energy_samples = []
            self.sm.transition_to("PAUSED", reason="pause_first_voice_start")

            if self.pause_eval_task and not self.pause_eval_task.done():
                self.pause_eval_task.cancel()
            self.pause_eval_task = asyncio.create_task(self._evaluate_interruption_window())

        elif current_state in ("IDLE", "WAKE"):
            self.sm.transition_to("LISTENING", reason="user_speech_onset")

    async def on_user_voice_end(self, on_turn_complete: Callable[[Optional[str]], Any]) -> None:
        """
        Called when browser VAD detects silence.
        Starts the 700 ms silence timer before finalizing turn.
        """
        now = time.time()
        current_state = self.sm.get_state()
        logger.info(f"[TurnManager] vad_end received in state={current_state}")
        self.last_audio_time = now
        self.on_turn_complete_cb = on_turn_complete

        # If in PAUSED state, decision logic handles resolution
        if current_state == "PAUSED":
            return

        if self.silence_timer_task and not self.silence_timer_task.done():
            self.silence_timer_task.cancel()

        self.silence_timer_task = asyncio.create_task(
            self._silence_wait_task(on_turn_complete)
        )

    async def _silence_wait_task(self, on_turn_complete: Callable[[Optional[str]], Any]) -> None:
        """Waits for TURN_SILENCE_THRESHOLD_MS (700ms) and checks if text looks finished."""
        wait_sec = config.TURN_SILENCE_THRESHOLD_MS / 1000.0
        try:
            await asyncio.sleep(wait_sec)
            if self.sm.get_state() != "LISTENING" or not self.has_new_speech:
                return

            # If silence reached but final transcript has not arrived, wait up to FINAL_TRANSCRIPT_TIMEOUT_SEC
            if not self.has_final_transcript and not self.text_looks_finished(self.current_user_text):
                logger.info(
                    f"[TurnManager] 700ms silence reached, waiting up to {config.FINAL_TRANSCRIPT_TIMEOUT_SEC}s for final transcript..."
                )
                deadline = time.time() + config.FINAL_TRANSCRIPT_TIMEOUT_SEC
                while time.time() < deadline and not self.has_final_transcript and self.sm.get_state() == "LISTENING":
                    await asyncio.sleep(0.05)

            if self.sm.get_state() == "LISTENING" and self.has_new_speech:
                text_ready = self.text_looks_finished(self.current_user_text)
                is_duplicate = (self.current_user_text.strip() == self.last_finalized_text.strip())

                if text_ready and not is_duplicate:
                    logger.info(
                        f"[TurnManager] End of turn confirmed ({config.TURN_SILENCE_THRESHOLD_MS}ms silence, text='{self.current_user_text}')."
                    )
                    await self._finalize_turn(on_turn_complete)
                else:
                    logger.debug(
                        f"[TurnManager] Silence detected but finalize skipped (ready={text_ready}, duplicate={is_duplicate}, text='{self.current_user_text}')."
                    )
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.exception(f"[TurnManager] Error in silence wait: {e}")

    async def _finalize_turn(self, on_turn_complete: Callable[[Optional[str]], Any]) -> None:
        """Transitions state to THINKING and invokes turn complete callback."""
        current_task = asyncio.current_task()
        if self.silence_timer_task and self.silence_timer_task is not current_task and not self.silence_timer_task.done():
            self.silence_timer_task.cancel()
        self.silence_timer_task = None

        text_to_finalize = self.current_user_text.strip()
        buf_len_before = len(text_to_finalize)

        self.last_finalized_text = text_to_finalize
        self.current_user_text = ""
        self.user_speech_start = None
        self.has_new_speech = False
        self.has_final_transcript = False
        self.turn_id += 1

        logger.info(
            f"[TurnManager] Finalizing turn_id={self.turn_id}. Buffer len before={buf_len_before}, after={len(self.current_user_text)}, text='{text_to_finalize}'"
        )

        self.sm.transition_to("THINKING", reason="turn_finalized")
        await asyncio.sleep(0)  # Allow state message to dispatch
        if on_turn_complete:
            if asyncio.iscoroutinefunction(on_turn_complete):
                await on_turn_complete(text_to_finalize)
            else:
                on_turn_complete(text_to_finalize)

    async def _evaluate_interruption_window(self) -> None:
        """
        Waits PAUSE_FIRST_CHECK_MS (300-500ms) to classify user sound.
        During this window, the thin decision ring on the sphere fills.
        Uses InterruptionHandler for real classification into:
        - noise (resume)
        - small_sound (resume)
        - go_on (resume)
        - interruption (hard stop)
        - unclear ("ji?" prompt)
        """
        wait_sec = config.PAUSE_FIRST_CHECK_MS / 1000.0
        try:
            await asyncio.sleep(wait_sec)
            if self.sm.get_state() != "PAUSED":
                return

            text = self.current_user_text
            avg_energy = (
                sum(self.paused_energy_samples) / len(self.paused_energy_samples)
                if self.paused_energy_samples
                else 0.05
            )
            duration = max(0.0, time.time() - self.paused_start_time)

            if self.stub_override and config.ENABLE_STUB_DECISIONS:
                decision = self.stub_override
                reason = "stub_override"
            else:
                decision, reason = self.interruption_handler.evaluate(
                    text=text,
                    has_voice=True,
                    rms_energy=avg_energy,
                    duration_sec=duration,
                )

            logger.info(
                f"[TurnManager] [Pause-First] Classified utterance: '{text}' -> {decision} ({reason})"
            )

            action_taken = "resumed"
            if decision in ("noise", "small_sound", "go_on"):
                # Resume playback
                action_taken = "resumed"
                await self.send_event("decision", {"decision": decision, "reason": reason, "text": text})
                self.sm.transition_to("SPEAKING", reason=f"pause_first_resume_{decision}")
                await asyncio.sleep(0)
                await self.send_event("resume", {})

            elif decision == "interruption":
                # Real interruption: stop playback, clear queue
                action_taken = "stopped"
                if self.on_interruption:
                    res = self.on_interruption()
                    if asyncio.iscoroutine(res):
                        await res
                await self.send_event("decision", {"decision": "interruption", "reason": reason, "text": text})
                await self.send_event("clear_queue", {})

                # Check if user has already spoken a finished new question during PAUSED
                if self.text_looks_finished(text) and text.strip() != self.last_finalized_text.strip():
                    logger.info(
                        f"[TurnManager] User interrupted with complete question '{text}'. Finalizing immediately."
                    )
                    await self._finalize_turn(self.on_turn_complete_cb)
                else:
                    self.sm.transition_to("LISTENING", reason="real_interruption")
                    await asyncio.sleep(0)
                    if self.has_new_speech and self.on_turn_complete_cb:
                        if self.silence_timer_task and not self.silence_timer_task.done():
                            self.silence_timer_task.cancel()
                        self.silence_timer_task = asyncio.create_task(
                            self._silence_wait_task(self.on_turn_complete_cb)
                        )

            elif decision == "unclear":
                # Unclear speech: play "ji?" / "kya kaha?" or repeat slowly
                action_taken = "asked_repeat"
                await self.send_event("decision", {"decision": decision, "reason": reason, "text": text})
                unclear_info = self.interruption_handler.get_unclear_response(self.current_language)
                phrase_key = unclear_info["phrase_key"]
                prompt_text = unclear_info["text"]
                wav_bytes = get_cached_audio(phrase_key, self.current_language)
                b64_audio = base64.b64encode(wav_bytes).decode("ascii")

                await self.send_event("unclear_prompt", {
                    "phrase": phrase_key,
                    "text": prompt_text,
                    "audio": b64_audio,
                    "escalated": unclear_info["escalated"],
                })
                # Clear queue and listen again
                self.sm.transition_to("LISTENING", reason="unclear_prompt_listen")
                await asyncio.sleep(0)
                await self.send_event("clear_queue", {})

            # Log interruption event in metrics and send browser payload
            if self.metrics_manager:
                time_to_pause = duration * 1000.0 if duration > 0 else config.DEFAULT_TIME_TO_PAUSE_MS
                self.metrics_manager.record_interruption(
                    turn_id=self.turn_id,
                    mode="pause_first",
                    user_text=text,
                    classification=decision,
                    action_taken=action_taken,
                    time_to_pause_ms=time_to_pause,
                )
                await self.send_event(
                    "metrics",
                    self.metrics_manager.get_browser_payload(self.turn_id, "pause_first"),
                )

        except asyncio.CancelledError:
            pass

    async def _evaluate_baseline_interruption(self) -> None:
        """Evaluates user vocalization in baseline mode to record metrics and calculate wrong stops."""
        await asyncio.sleep(config.PAUSE_FIRST_CHECK_MS / 1000.0)
        text = self.current_user_text
        if self.stub_override and config.ENABLE_STUB_DECISIONS:
            decision = self.stub_override
            reason = "stub_override"
        else:
            decision, reason = self.interruption_handler.evaluate(
                text=text,
                has_voice=True,
                rms_energy=0.05,
                duration_sec=0.4,
            )
        if self.metrics_manager:
            self.metrics_manager.record_interruption(
                turn_id=self.turn_id,
                mode="baseline",
                user_text=text,
                classification=decision,
                action_taken="stopped",
                time_to_pause_ms=config.DEFAULT_TIME_TO_PAUSE_MS,
            )
            await self.send_event(
                "metrics",
                self.metrics_manager.get_browser_payload(self.turn_id, "baseline"),
            )

    def on_sentence_started(self, sentence_id: int) -> None:
        """Tracks currently playing sentence."""
        self.active_sentence_id = sentence_id

    def on_sentence_played(self, sentence_id: Any, turn_id: Optional[int] = None, kind: str = "sentence") -> None:
        """Marks sentence as fully heard by the user and advances turn when last sentence finishes."""
        if kind == "filler" or sentence_id == 0 or str(sentence_id).startswith(("idle_", "unclear_")):
            logger.info(f"[TurnManager] Filler/prompt sentence {sentence_id} played; not counting for turn completion.")
            return

        try:
            num_id = int(sentence_id)
        except (ValueError, TypeError):
            return

        self.heard_upto = num_id
        self.played_sentences.add(num_id)
        logger.info(f"[TurnManager] Sentence {num_id} marked heard_upto (played={self.played_sentences}).")

        # Check if all sentences for the active turn have played
        if self.turn_is_last_sent and self.turn_last_sentence_id is not None:
            if self.turn_last_sentence_id in self.played_sentences:
                self._finish_speaking_turn()

    def _finish_speaking_turn(self) -> None:
        """Called when all answer sentences for the current turn have finished playback."""
        if self.sm.get_state() == "SPEAKING":
            logger.info(
                f"[TurnManager] All sentences played for turn {self.active_turn_id}. Transitioning to LISTENING."
            )
            self.sm.transition_to("LISTENING", reason="all_sentences_played")
            self.start_idle_timer()

    def on_playback_finished(self) -> None:
        """Explicit notification from browser that queue has finished playing."""
        logger.info("[TurnManager] Browser reported playback_finished.")
        if self.sm.get_state() == "SPEAKING":
            if self.turn_is_last_sent:
                self._finish_speaking_turn()
            else:
                logger.debug("[TurnManager] Playback queue finished early, waiting for remaining LLM sentences.")

    # -------------------------------------------------------------------------
    # Idle Check and Sleep Lifecycle (Section 13)
    # -------------------------------------------------------------------------
    def start_idle_timer(self) -> None:
        """Starts idle timer 1 (10s) when playback finishes."""
        self._cancel_idle_timers()
        self.idle_asked_once = False
        self.idle_timer_task = asyncio.create_task(self._idle_first_timer())

    def _cancel_idle_timers(self) -> None:
        """Cancels active idle timers."""
        if self.idle_timer_task and not self.idle_timer_task.done():
            self.idle_timer_task.cancel()
        self.idle_timer_task = None

    async def _idle_first_timer(self) -> None:
        """Waits 10s of silence, plays 'Are you there?' and transitions to IDLE_CHECK."""
        try:
            await asyncio.sleep(config.IDLE_CHECK_FIRST_TIMEOUT_SEC)
            current_state = self.sm.get_state()
            if current_state in ("IDLE", "LISTENING") and not self.idle_asked_once:
                self.idle_asked_once = True
                logger.info("[TurnManager] 10s idle detected. Transitioning to IDLE_CHECK.")
                self.sm.transition_to("IDLE_CHECK", reason="10s_idle_timeout")
                await asyncio.sleep(0)

                # Send pre-recorded "are_you_there" audio
                wav_bytes = get_cached_audio("are_you_there", self.current_language)
                b64_audio = base64.b64encode(wav_bytes).decode("ascii")
                prompt_text = config.CACHE_PHRASES.get("are_you_there", {}).get(
                    self.current_language, "Are you there?"
                )
                await self.send_event("idle_prompt", {
                    "phrase": "are_you_there",
                    "text": prompt_text,
                    "audio": b64_audio,
                    "kind": "filler",
                    "source": "cache_file:are_you_there",
                })

                # Start idle timer 2 (another 10s)
                self.idle_timer_task = asyncio.create_task(self._idle_second_timer())
        except asyncio.CancelledError:
            pass

    async def _idle_second_timer(self) -> None:
        """Waits another 10s of silence, plays goodbye, and transitions to SLEEP."""
        try:
            await asyncio.sleep(config.IDLE_CHECK_SECOND_TIMEOUT_SEC)
            if self.sm.get_state() == "IDLE_CHECK":
                logger.info("[TurnManager] 2nd 10s idle detected. Saying goodbye and entering SLEEP.")
                # Send pre-recorded "goodbye" audio
                wav_bytes = get_cached_audio("goodbye", self.current_language)
                b64_audio = base64.b64encode(wav_bytes).decode("ascii")
                prompt_text = config.CACHE_PHRASES.get("goodbye", {}).get(
                    self.current_language, "Goodbye."
                )
                await self.send_event("idle_prompt", {
                    "phrase": "goodbye",
                    "text": prompt_text,
                    "audio": b64_audio,
                    "kind": "filler",
                    "source": "cache_file:goodbye",
                })

                self.sm.transition_to("SLEEP", reason="idle_goodbye_sleep")
        except asyncio.CancelledError:
            pass

    async def on_wake_tap(self) -> None:
        """Handles wake from SLEEP state via user tap / click on the sphere."""
        self._cancel_idle_timers()
        if self.sm.get_state() == "SLEEP":
            logger.info("[TurnManager] Waking from SLEEP via tap.")
            self.sm.transition_to("WAKE", reason="wake_on_tap")
            await asyncio.sleep(0)
            self.sm.transition_to("IDLE", reason="wake_ready")
        elif self.sm.get_state() == "IDLE_CHECK":
            self.sm.transition_to("IDLE", reason="wake_ready")

    def reset_user_turn(self) -> None:
        """Resets state for a new user question or on disconnect."""
        self.turn_id += 1
        self.current_user_text = ""
        self.user_speech_start = None
        self.has_new_speech = False
        self.has_final_transcript = False
        self.interrupted = False
        self.paused_energy_samples = []
        if self.silence_timer_task and not self.silence_timer_task.done():
            self.silence_timer_task.cancel()
        if self.pause_eval_task and not self.pause_eval_task.done():
            self.pause_eval_task.cancel()
        self._cancel_idle_timers()

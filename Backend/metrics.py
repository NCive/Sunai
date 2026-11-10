"""
Metrics and Performance Logger for Sunai Voice Assistant.
Tracks turn-taking latency timestamps, interruption classification,
and calculates comparative statistics between pause-first and baseline modes
(wrong stops, wrong non-stops, response delay, time-to-pause).
Plan Sections 10, 13, 15, and 16 compliant.
"""

from dataclasses import asdict, dataclass, field
import json
import logging
from pathlib import Path
import time
from typing import Any, Dict, List, Optional
from Backend import config

logger = logging.getLogger(__name__)


@dataclass
class TurnTimestamps:
    """Exact UNIX epoch timestamps for the 8 sequential milestones of a turn."""
    voice_end: Optional[float] = None
    final_text: Optional[float] = None
    translation_done: Optional[float] = None
    retrieval_done: Optional[float] = None
    first_llm_token: Optional[float] = None
    first_sentence_ready: Optional[float] = None
    first_tts_audio: Optional[float] = None
    playback_start: Optional[float] = None


@dataclass
class TurnMetricRecord:
    """Represents full metrics for a single completed conversational turn."""
    turn_id: int
    mode: str  # 'pause_first' or 'baseline'
    user_text: str
    language: str
    timestamps: Dict[str, Optional[float]]
    latencies_ms: Dict[str, float]
    refused: bool = False
    interrupted: bool = False
    is_continuation: bool = False


@dataclass
class InterruptionMetricRecord:
    """Represents an interruption or user vocalization event during bot speech."""
    interruption_id: int
    turn_id: int
    timestamp: float
    mode: str
    user_text: str
    classification: str  # 'noise', 'small_sound', 'go_on', 'interruption', 'unclear'
    time_to_pause_ms: float
    action_taken: str  # 'resumed', 'stopped', 'asked_repeat'
    was_wrong_stop: bool
    was_wrong_non_stop: bool


@dataclass
class ModeStats:
    """Cumulative performance statistics for one interruption mode."""
    total_turns: int = 0
    total_interruptions: int = 0
    wrong_stops: int = 0
    wrong_non_stops: int = 0
    noise_blip_ignored: int = 0
    noise_resumed: int = 0
    wrong_stop: int = 0
    response_delays: List[float] = field(default_factory=list)
    time_to_pauses: List[float] = field(default_factory=list)

    @property
    def avg_response_delay_ms(self) -> float:
        if not self.response_delays:
            return 0.0
        return sum(self.response_delays) / len(self.response_delays)

    @property
    def avg_time_to_pause_ms(self) -> float:
        if not self.time_to_pauses:
            return config.DEFAULT_TIME_TO_PAUSE_MS
        return sum(self.time_to_pauses) / len(self.time_to_pauses)

    @property
    def wrong_stop_rate(self) -> float:
        if self.total_interruptions == 0:
            return 0.0
        return (self.wrong_stops / self.total_interruptions) * 100.0

    @property
    def wrong_non_stop_rate(self) -> float:
        if self.total_interruptions == 0:
            return 0.0
        return (self.wrong_non_stops / self.total_interruptions) * 100.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_turns": self.total_turns,
            "total_interruptions": self.total_interruptions,
            "wrong_stops": self.wrong_stops,
            "wrong_non_stops": self.wrong_non_stops,
            "noise_blip_ignored": self.noise_blip_ignored,
            "noise_resumed": self.noise_resumed,
            "wrong_stop": self.wrong_stop or self.wrong_stops,
            "wrong_stop_rate_pct": round(self.wrong_stop_rate, 1),
            "wrong_non_stop_rate_pct": round(self.wrong_non_stop_rate, 1),
            "avg_response_delay_ms": round(self.avg_response_delay_ms, 1),
            "avg_time_to_pause_ms": round(self.avg_time_to_pause_ms, 1),
        }


class MetricsManager:
    """
    Central manager for recording timestamps, logging JSONL lines,
    tracking comparative mode metrics, and producing comparison summaries.
    """

    def __init__(
        self,
        metrics_file: Path = config.METRICS_LOG_FILE,
        interruptions_file: Path = config.INTERRUPTIONS_LOG_FILE,
    ):
        self.metrics_file = metrics_file
        self.interruptions_file = interruptions_file
        self._ensure_log_dirs()

        # In-flight timestamps per turn
        self._active_timestamps: Dict[int, TurnTimestamps] = {}
        self._active_metadata: Dict[int, Dict[str, Any]] = {}

        # Mode stats
        self.stats: Dict[str, ModeStats] = {
            "pause_first": ModeStats(),
            "baseline": ModeStats(),
        }

        # Interruption counter
        self._interruption_counter: int = 0

    def _ensure_log_dirs(self) -> None:
        """Ensures log directories exist."""
        try:
            self.metrics_file.parent.mkdir(parents=True, exist_ok=True)
            self.interruptions_file.parent.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"[MetricsManager] Could not create log directories: {e}")

    def start_turn(self, turn_id: int, mode: str, user_text: str, language: str) -> None:
        """Initializes timing tracker for a new turn."""
        self._active_timestamps[turn_id] = TurnTimestamps()
        self._active_metadata[turn_id] = {
            "mode": mode,
            "user_text": user_text,
            "language": language,
            "refused": False,
            "interrupted": False,
            "is_continuation": False,
        }

    def record_timestamp(self, turn_id: int, event_name: str, ts: Optional[float] = None) -> None:
        """Records a timestamp milestone for an active turn."""
        if turn_id not in self._active_timestamps:
            self._active_timestamps[turn_id] = TurnTimestamps()
            self._active_metadata[turn_id] = {
                "mode": config.DEFAULT_MODE,
                "user_text": "",
                "language": "hi-IN",
                "refused": False,
                "interrupted": False,
                "is_continuation": False,
            }

        timestamp = ts if ts is not None else time.time()
        setattr(self._active_timestamps[turn_id], event_name, timestamp)

    def set_turn_attribute(self, turn_id: int, key: str, value: Any) -> None:
        """Sets metadata attribute on active turn (e.g. refused, is_continuation)."""
        if turn_id in self._active_metadata:
            self._active_metadata[turn_id][key] = value

    def finalize_turn(self, turn_id: int) -> Optional[TurnMetricRecord]:
        """
        Calculates all latency differences, writes the JSON line to metrics.jsonl,
        updates cumulative mode statistics, and returns the record.
        """
        if turn_id not in self._active_timestamps:
            return None

        ts = self._active_timestamps.pop(turn_id)
        meta = self._active_metadata.pop(turn_id, {})
        mode = meta.get("mode", config.DEFAULT_MODE)

        # Baseline reference is voice_end
        t_base = ts.voice_end or ts.final_text or time.time()

        # Helper to compute millisecond delta
        def delta_ms(t_end: Optional[float], t_start: Optional[float]) -> float:
            if t_end is not None and t_start is not None and t_end >= t_start:
                return round((t_end - t_start) * 1000.0, 1)
            return 0.0

        latencies_ms = {
            "stt_final_text": delta_ms(ts.final_text, ts.voice_end),
            "translation": delta_ms(ts.translation_done, ts.final_text),
            "retrieval": delta_ms(ts.retrieval_done, ts.translation_done or ts.final_text),
            "first_llm_token": delta_ms(ts.first_llm_token, ts.retrieval_done),
            "first_sentence_ready": delta_ms(ts.first_sentence_ready, ts.retrieval_done),
            "first_tts_audio": delta_ms(ts.first_tts_audio, ts.first_sentence_ready or ts.retrieval_done),
            "playback_start": delta_ms(ts.playback_start, ts.first_tts_audio),
            "response_delay": delta_ms(ts.playback_start or ts.first_tts_audio, t_base),
        }

        # Build record
        record = TurnMetricRecord(
            turn_id=turn_id,
            mode=mode,
            user_text=meta.get("user_text", ""),
            language=meta.get("language", "hi-IN"),
            timestamps={
                "voice_end": ts.voice_end,
                "final_text": ts.final_text,
                "translation_done": ts.translation_done,
                "retrieval_done": ts.retrieval_done,
                "first_llm_token": ts.first_llm_token,
                "first_sentence_ready": ts.first_sentence_ready,
                "first_tts_audio": ts.first_tts_audio,
                "playback_start": ts.playback_start,
            },
            latencies_ms=latencies_ms,
            refused=meta.get("refused", False),
            interrupted=meta.get("interrupted", False),
            is_continuation=meta.get("is_continuation", False),
        )

        # Update stats
        mode_stat = self.stats.setdefault(mode, ModeStats())
        mode_stat.total_turns += 1
        if latencies_ms["response_delay"] > 0:
            mode_stat.response_delays.append(latencies_ms["response_delay"])

        # Write JSON line
        self._write_json_line(self.metrics_file, asdict(record))
        return record

    def record_interruption(
        self,
        turn_id: int,
        mode: str,
        user_text: str,
        classification: str,
        action_taken: str,
        time_to_pause_ms: Optional[float] = None,
    ) -> InterruptionMetricRecord:
        """
        Logs an interruption event and updates wrong stops and wrong non-stops.
        - Wrong stop: system stopped on noise, backchannel, or go-on.
        - Wrong non-stop: system failed to stop on real interruption.
        """
        self._interruption_counter += 1
        t_pause = time_to_pause_ms if time_to_pause_ms is not None else config.DEFAULT_TIME_TO_PAUSE_MS

        is_non_interrupting = classification in ("noise", "small_sound", "go_on")
        is_real_interruption = classification == "interruption"

        # Determine wrong stops and wrong non-stops
        if mode == "baseline":
            # Baseline stops unconditionally on any voice.
            # If the voice was a non-interrupting sound (backchannel / noise), stopping is wrong!
            was_wrong_stop = is_non_interrupting
            was_wrong_non_stop = False
        else:  # pause_first
            if is_non_interrupting:
                was_wrong_stop = (action_taken == "stopped")
                was_wrong_non_stop = False
            elif is_real_interruption:
                was_wrong_stop = False
                was_wrong_non_stop = (action_taken == "resumed")
            else:
                was_wrong_stop = False
                was_wrong_non_stop = False

        record = InterruptionMetricRecord(
            interruption_id=self._interruption_counter,
            turn_id=turn_id,
            timestamp=time.time(),
            mode=mode,
            user_text=user_text,
            classification=classification,
            time_to_pause_ms=t_pause,
            action_taken=action_taken,
            was_wrong_stop=was_wrong_stop,
            was_wrong_non_stop=was_wrong_non_stop,
        )

        # Update mode stats
        mode_stat = self.stats.setdefault(mode, ModeStats())
        mode_stat.total_interruptions += 1
        mode_stat.time_to_pauses.append(t_pause)
        if was_wrong_stop:
            mode_stat.wrong_stops += 1
        if was_wrong_non_stop:
            mode_stat.wrong_non_stops += 1

        self._write_json_line(self.interruptions_file, asdict(record))
        return record

    def record_blip_ignored(self, mode: str = "pause_first") -> None:
        """Records a momentary noise blip that was successfully ignored without pausing."""
        if mode in self.stats:
            self.stats[mode].noise_blip_ignored += 1

    def record_noise_resumed(self, mode: str = "pause_first") -> None:
        """Records a pause that was resumed after classification identified noise/non-speech."""
        if mode in self.stats:
            self.stats[mode].noise_resumed += 1

    def get_browser_payload(
        self,
        turn_id: int,
        mode: str,
        latencies_ms: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Constructs the 'metrics' WebSocket message payload sent to browser.
        Plan Section 16 compliant.
        """
        return {
            "type": "metrics",
            "turn_id": turn_id,
            "mode": mode,
            "latencies_ms": latencies_ms or {},
            "comparison": {
                "pause_first": self.stats["pause_first"].to_dict(),
                "baseline": self.stats["baseline"].to_dict(),
            },
        }

    def _write_json_line(self, file_path: Path, data: Dict[str, Any]) -> None:
        """Appends a JSON line to the target log file."""
        try:
            with open(file_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(data, ensure_ascii=False) + "\n")
        except Exception as e:
            logger.warning(f"[MetricsManager] Failed to write log line to {file_path}: {e}")

    def format_comparison_table(self) -> str:
        """Formats an ASCII comparison table from active stats."""
        pf = self.stats["pause_first"]
        bl = self.stats["baseline"]

        lines = [
            "=" * 88,
            "                      SUNAI INTERRUPTIBILITY COMPARISON METRICS",
            "=" * 88,
            f"{'Metric':<36} | {'Pause-First (Sunai)':<23} | {'Baseline (Stop-on-Voice)':<23}",
            "-" * 88,
            f"{'Total Turns Evaluated':<36} | {pf.total_turns:<23} | {bl.total_turns:<23}",
            f"{'Total Interruptions / Sounds':<36} | {pf.total_interruptions:<23} | {bl.total_interruptions:<23}",
            f"{'Wrong Stops (Backchannel/Noise)':<36} | {pf.wrong_stops} ({pf.wrong_stop_rate:.1f}%)"
            f"{'':<14} | {bl.wrong_stops} ({bl.wrong_stop_rate:.1f}%)",
            f"{'Wrong Non-Stops (Talk-Overs)':<36} | {pf.wrong_non_stops} ({pf.wrong_non_stop_rate:.1f}%)"
            f"{'':<14} | {bl.wrong_non_stops} ({bl.wrong_non_stop_rate:.1f}%)",
            f"{'Avg Time-to-Pause (ms)':<36} | {pf.avg_time_to_pause_ms:.1f} ms"
            f"{'':<15} | {bl.avg_time_to_pause_ms:.1f} ms",
            f"{'Avg Response Delay to Audio (ms)':<36} | {pf.avg_response_delay_ms:.1f} ms"
            f"{'':<15} | {bl.avg_response_delay_ms:.1f} ms",
            "-" * 88,
            "Pitch Validation: 'Most voice bots either talk over you or stop for every sound.",
            "                  Sunai fixes the timing.'",
            "=" * 88,
        ]
        return "\n".join(lines)


# Singleton instance
_global_metrics_manager: Optional[MetricsManager] = None


def get_metrics_manager() -> MetricsManager:
    """Returns the singleton MetricsManager instance."""
    global _global_metrics_manager
    if _global_metrics_manager is None:
        _global_metrics_manager = MetricsManager()
    return _global_metrics_manager


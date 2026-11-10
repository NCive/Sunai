"""
Turn History Manager for Sunai Voice Assistant.
Tracks user questions, assistant responses, sentence playback progress (heard_upto),
interruption states across conversation turns, and handles 'Go on' continuation
without calling the LLM.
Plan Sections 10, 12, 13, and 16 compliant.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from Backend import config


@dataclass
class SentenceRecord:
    """Represents a numbered assistant sentence with optional translation and audio."""
    sentence_id: int
    text: str
    translated_text: str = ""
    audio_b64: Optional[str] = None


@dataclass
class ConversationTurn:
    """Represents a single conversational exchange."""
    turn_id: int
    user_text: str
    user_language: str
    assistant_sentences: List[str] = field(default_factory=list)  # Numbered sentences
    sentence_records: List[Dict[str, Any]] = field(default_factory=list)  # Detailed records
    heard_upto: int = 0  # 1-indexed ID of last fully heard sentence
    interrupted: bool = False
    refused: bool = False
    is_continuation: bool = False  # True if resumed via 'go on'

    @property
    def full_assistant_text(self) -> str:
        """Returns the full combined text of all assistant sentences."""
        return " ".join(self.assistant_sentences).strip()

    @property
    def heard_text(self) -> str:
        """Returns the text portion the user actually heard before stopping/interrupting."""
        if self.heard_upto <= 0:
            return ""
        heard_sentences = self.assistant_sentences[: self.heard_upto]
        return " ".join(heard_sentences).strip()

    @property
    def has_unplayed_sentences(self) -> bool:
        """Checks if there are generated sentences that were not yet heard by the user."""
        return self.heard_upto < len(self.assistant_sentences)

    @property
    def unplayed_sentences(self) -> List[str]:
        """Returns list of sentences generated but not yet played."""
        if not self.has_unplayed_sentences:
            return []
        return self.assistant_sentences[self.heard_upto :]

    @property
    def unplayed_records(self) -> List[Dict[str, Any]]:
        """Returns detailed records for unplayed sentences."""
        if not self.has_unplayed_sentences:
            return []
        return self.sentence_records[self.heard_upto :]


class HistoryManager:
    """Manages the rolling conversation history and 'go on' continuation."""

    def __init__(self, max_turns: int = config.HISTORY_MAX_TURNS):
        self.max_turns = max_turns
        self.turns: List[ConversationTurn] = []
        self.current_turn: Optional[ConversationTurn] = None
        self._turn_counter: int = 0

    def start_new_turn(self, user_text: str, user_language: str) -> ConversationTurn:
        """Starts a new conversation turn."""
        self._turn_counter += 1
        turn = ConversationTurn(
            turn_id=self._turn_counter,
            user_text=user_text,
            user_language=user_language,
        )
        self.current_turn = turn
        return turn

    def add_assistant_sentence(
        self,
        sentence: str,
        translated_text: str = "",
        audio_b64: Optional[str] = None,
    ) -> int:
        """
        Adds a generated sentence to current turn and returns its 1-indexed sentence_id.
        """
        if not self.current_turn:
            self.start_new_turn("", "en")

        sentence_id = len(self.current_turn.assistant_sentences) + 1
        self.current_turn.assistant_sentences.append(sentence)
        self.current_turn.sentence_records.append({
            "id": sentence_id,
            "text": sentence,
            "translated_text": translated_text or sentence,
            "audio_b64": audio_b64,
        })
        return sentence_id

    def update_sentence_audio(self, sentence_id: int, audio_b64: str) -> None:
        """Updates cached audio for a given sentence in current turn."""
        if self.current_turn and 1 <= sentence_id <= len(self.current_turn.sentence_records):
            self.current_turn.sentence_records[sentence_id - 1]["audio_b64"] = audio_b64

    def record_sentence_played(self, sentence_id: Any) -> None:
        """Marks sentence as heard up to sentence_id (1-indexed)."""
        try:
            num_id = int(sentence_id)
        except (ValueError, TypeError):
            return  # Non-integer IDs (e.g. idle_..., unclear_...) are transient prompts
        target_turn = self.current_turn or (self.turns[-1] if self.turns else None)
        if target_turn and num_id > target_turn.heard_upto:
            target_turn.heard_upto = num_id

    def mark_interrupted(self) -> None:
        """Marks current turn as interrupted."""
        if self.current_turn:
            self.current_turn.interrupted = True
        elif self.turns:
            self.turns[-1].interrupted = True

    def mark_refused(self) -> None:
        """Marks current turn as refused by RAG."""
        if self.current_turn:
            self.current_turn.refused = True

    def finalize_current_turn(self) -> None:
        """Finalizes current turn and appends to history."""
        if self.current_turn:
            self.turns.append(self.current_turn)
            if len(self.turns) > self.max_turns:
                self.turns = self.turns[-self.max_turns :]
            self.current_turn = None

    def get_recent_turns(self, count: int = config.HISTORY_MAX_TURNS) -> List[ConversationTurn]:
        """Returns the most recent completed turns for prompt context."""
        return self.turns[-count:]

    # -------------------------------------------------------------------------
    # 'Go on' Continuation Feature (Plan Section 12 & Module 7 Requirement 1)
    # -------------------------------------------------------------------------
    def has_unplayed_continuation(self) -> bool:
        """
        Returns True if a previous turn was interrupted and has unplayed sentences
        remaining that can be resumed on a 'go on' command.
        """
        # Check active turn first if any
        if self.current_turn and self.current_turn.interrupted and self.current_turn.has_unplayed_sentences:
            return True
        # Check last completed turn
        if self.turns and self.turns[-1].interrupted and self.turns[-1].has_unplayed_sentences:
            return True
        return False

    def get_unplayed_for_continuation(self) -> Tuple[Optional[ConversationTurn], List[str], List[Dict[str, Any]]]:
        """
        Retrieves remaining unplayed sentences and records from the last interrupted turn.
        Returns: (turn, unplayed_sentences, unplayed_records)
        """
        target_turn: Optional[ConversationTurn] = None
        if self.current_turn and self.current_turn.interrupted and self.current_turn.has_unplayed_sentences:
            target_turn = self.current_turn
        elif self.turns and self.turns[-1].interrupted and self.turns[-1].has_unplayed_sentences:
            target_turn = self.turns[-1]

        if not target_turn:
            return None, [], []

        return target_turn, target_turn.unplayed_sentences, target_turn.unplayed_records

    def apply_go_on_continuation(self, user_text: str, user_language: str) -> Optional[ConversationTurn]:
        """
        Applies a 'go on' continuation turn without calling the LLM.
        Resumes playback from the last interrupted turn.
        """
        target_turn, unplayed_sents, unplayed_recs = self.get_unplayed_for_continuation()
        if not target_turn:
            return None

        # Start a continuation turn
        self._turn_counter += 1
        cont_turn = ConversationTurn(
            turn_id=self._turn_counter,
            user_text=user_text,
            user_language=user_language,
            assistant_sentences=list(target_turn.assistant_sentences),
            sentence_records=list(target_turn.sentence_records),
            heard_upto=target_turn.heard_upto,
            interrupted=False,
            is_continuation=True,
        )
        self.current_turn = cont_turn
        return cont_turn

    def clear(self) -> None:
        """Clears all conversation history."""
        self.turns.clear()
        self.current_turn = None

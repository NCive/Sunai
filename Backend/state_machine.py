"""
State Machine for Sunai Voice Assistant.
Manages states:
LISTENING -> THINKING -> SPEAKING -> PAUSED -> (SPEAKING or LISTENING)
Plus IDLE, IDLE_CHECK, SLEEP, and WAKE.
"""

import logging
from typing import Callable, Optional, Set

logger = logging.getLogger(__name__)

StateCallback = Callable[[str, str], None]


class SunaiStateMachine:
    """
    Deterministic State Machine controlling assistant state flow.
    Enforces valid transitions and triggers state change notifications.
    """

    STATES: Set[str] = {
        "IDLE",
        "LISTENING",
        "THINKING",
        "SPEAKING",
        "PAUSED",
        "IDLE_CHECK",
        "SLEEP",
        "WAKE",
    }

    # Allowed state transitions
    VALID_TRANSITIONS: dict[str, Set[str]] = {
        "IDLE": {"LISTENING", "IDLE_CHECK", "SLEEP"},
        "LISTENING": {"THINKING", "IDLE", "PAUSED", "IDLE_CHECK"},
        "THINKING": {"SPEAKING", "LISTENING", "IDLE"},
        "SPEAKING": {"PAUSED", "LISTENING", "IDLE"},
        "PAUSED": {"SPEAKING", "LISTENING", "IDLE"},
        "IDLE_CHECK": {"SLEEP", "LISTENING", "IDLE", "WAKE"},
        "SLEEP": {"WAKE", "LISTENING", "IDLE"},
        "WAKE": {"LISTENING", "IDLE"},
    }

    def __init__(self, initial_state: str = "IDLE", on_state_change: Optional[StateCallback] = None):
        self.state = initial_state
        self.previous_state = initial_state
        self.on_state_change = on_state_change

    def transition_to(self, new_state: str, reason: str = "") -> bool:
        """
        Transitions to new_state if valid.
        Returns True if transition succeeded, False if rejected.
        """
        if new_state not in self.STATES:
            logger.error(f"[StateMachine] Invalid state requested: {new_state}")
            return False

        if new_state == self.state:
            return True

        allowed = self.VALID_TRANSITIONS.get(self.state, set())
        if new_state not in allowed:
            logger.warning(
                f"[StateMachine] Invalid transition: {self.state} -> {new_state} (Reason: {reason})"
            )
            return False

        old_state = self.state
        self.previous_state = old_state
        self.state = new_state
        logger.info(
            f"[StateMachine] State transition: {old_state} -> {new_state} (Reason: {reason})"
        )

        if self.on_state_change:
            try:
                self.on_state_change(old_state, new_state)
            except Exception as e:
                logger.error(f"[StateMachine] State change callback error: {e}")

        return True

    def get_state(self) -> str:
        return self.state

    def is_in(self, *states: str) -> bool:
        return self.state in states


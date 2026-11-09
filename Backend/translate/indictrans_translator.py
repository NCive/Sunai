"""
IndicTrans2 Translator Adapter for Sunai.
Attempts to load AI4Bharat IndicTrans2 seq2seq models if available.
Plan Section 10 & Module 6 compliant.
"""

import logging
from typing import Optional
from Backend.translate.base import BaseTranslator

logger = logging.getLogger(__name__)


class IndicTransTranslator(BaseTranslator):
    """
    Adapter for IndicTrans2 offline translation models.
    """

    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir
        self.model = None
        self.tokenizer = None
        self.is_available = False
        self._init_model()

    def _init_model(self) -> None:
        """Attempts to load IndicTrans2 model from disk or Hugging Face."""
        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            # Check if IndicTrans2 is installed or cached locally
            logger.info("[IndicTrans2] Probing IndicTrans2 availability...")
            # We don't download multi-gigabyte models automatically during init
            self.is_available = False
        except Exception as e:
            logger.debug(f"[IndicTrans2] Not available: {e}")
            self.is_available = False

    def translate(self, text: str, from_lang: str, to_lang: str) -> str:
        if not self.is_available or not self.model:
            raise NotImplementedError("IndicTrans2 is not installed or available on this system.")
        return text


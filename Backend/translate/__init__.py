"""
Unified Translation Interface for Sunai.
Provides translate(text, from_lang, to_lang) behind a common interface.
Plan Section 10 & Module 6 compliant.
"""

import logging
from typing import Optional
from Backend.translate.base import BaseTranslator
from Backend.translate.qwen_translator import QwenTranslator

logger = logging.getLogger(__name__)

_GLOBAL_TRANSLATOR: Optional[BaseTranslator] = None


def get_global_translator() -> BaseTranslator:
    """Returns singleton translator instance."""
    global _GLOBAL_TRANSLATOR
    if _GLOBAL_TRANSLATOR is None:
        _GLOBAL_TRANSLATOR = QwenTranslator()
    return _GLOBAL_TRANSLATOR


def set_global_translator(translator: BaseTranslator) -> None:
    """Allows setting a different translator engine (e.g. for benchmarking)."""
    global _GLOBAL_TRANSLATOR
    _GLOBAL_TRANSLATOR = translator


def translate(text: str, from_lang: str, to_lang: str) -> str:
    """
    Translates text from from_lang to to_lang.
    :param text: Text to translate
    :param from_lang: Source language code ('en', 'hi', 'mr', 'hi-IN', 'mr-IN', etc.)
    :param to_lang: Target language code ('en', 'hi', 'mr', 'hi-IN', 'mr-IN', 'hinglish', etc.)
    :return: Translated text
    """
    clean = text.strip()
    if not clean:
        return ""

    # Normalize codes
    f_norm = from_lang.lower().split("-")[0]
    t_norm = to_lang.lower().split("-")[0]
    is_hinglish = "latn" in to_lang.lower() or "hinglish" in to_lang.lower()

    if f_norm == t_norm and not is_hinglish:
        return clean

    translator = get_global_translator()
    return translator.translate(clean, from_lang, to_lang)


__all__ = ["translate", "BaseTranslator", "QwenTranslator", "get_global_translator", "set_global_translator"]


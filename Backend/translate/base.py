"""
Base Translator Interface for Sunai.
All translation engines implement this interface.
"""

from abc import ABC, abstractmethod


class BaseTranslator(ABC):
    """Abstract base class for translation engines."""

    @abstractmethod
    def translate(self, text: str, from_lang: str, to_lang: str) -> str:
        """
        Translates text from from_lang to to_lang.
        :param text: Text to translate.
        :param from_lang: Source language code ('en', 'hi', 'mr', 'hi-IN', 'mr-IN', etc.)
        :param to_lang: Target language code ('en', 'hi', 'mr', 'hi-IN', 'mr-IN', 'hinglish', etc.)
        :return: Translated text string.
        """
        pass


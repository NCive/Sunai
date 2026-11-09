"""
Qwen-based Translator for Sunai.
Uses local Qwen3.5-4B via llama.cpp to translate sentences with thinking OFF.
"""

import json
import logging
import urllib.request
from typing import Optional
from Backend import config
from Backend.translate.base import BaseTranslator

logger = logging.getLogger(__name__)

LANG_NAMES = {
    "hi": "Hindi (in Devanagari script)",
    "hi-in": "Hindi (in Devanagari script)",
    "mr": "Marathi (in Devanagari script)",
    "mr-in": "Marathi (in Devanagari script)",
    "hinglish": "Hinglish (Hindi in Roman Latin script)",
    "hi-latn": "Hinglish (Hindi in Roman Latin script)",
    "en": "English",
    "en-in": "English",
}


class QwenTranslator(BaseTranslator):
    """Translates text using Qwen3.5 via llama-server."""

    def __init__(self, server_url: str = config.LLAMA_SERVER_URL):
        self.server_url = server_url.rstrip("/")
        self.completions_url = f"{self.server_url}/v1/chat/completions"

    def translate(self, text: str, from_lang: str, to_lang: str) -> str:
        clean_text = text.strip()
        if not clean_text:
            return ""

        f_code = from_lang.lower().split("-")[0]
        t_code = to_lang.lower().split("-")[0]
        if f_code == t_code and "latn" not in to_lang.lower() and "hinglish" not in to_lang.lower():
            return clean_text

        target_desc = LANG_NAMES.get(to_lang.lower(), LANG_NAMES.get(t_code, to_lang))

        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": f"You are a fast, accurate translator. Translate the following sentence into {target_desc}. Output ONLY the direct translation and nothing else. No commentary, no brackets, no quotes.",
                },
                {"role": "user", "content": clean_text},
            ],
            "temperature": 0.0,
            "max_tokens": 128,
            "stream": False,
            "cache_prompt": False,
            "chat_template_kwargs": {"enable_thinking": False},
        }

        try:
            req = urllib.request.Request(
                self.completions_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                choice = data["choices"][0]
                content = choice.get("message", {}).get("content", "").strip()
                return content or clean_text
        except Exception as e:
            logger.error(f"[QwenTranslator] Translation failed: {e}")
            return clean_text


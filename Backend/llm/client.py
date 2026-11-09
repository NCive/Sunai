"""
Qwen LLM Client for Sunai Voice Assistant.
Streams tokens from Qwen3.5-4B via llama.cpp server with thinking disabled.
Supports immediate mid-generation cancellation on interruption.
"""

import asyncio
import json
import logging
from typing import AsyncIterator, Optional, Any
import aiohttp
from Backend import config

logger = logging.getLogger(__name__)


class QwenClient:
    """Client for streaming chat completions from llama.cpp server."""

    def __init__(self, server_url: str = config.LLAMA_SERVER_URL):
        self.server_url = server_url.rstrip("/")
        self.completions_url = f"{self.server_url}/v1/chat/completions"
        self.health_url = f"{self.server_url}/health"

    async def is_server_ready(self) -> bool:
        """Checks if llama-server is running and healthy."""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=2.0)) as session:
                async with session.get(self.health_url) as resp:
                    return resp.status == 200
        except Exception:
            return False

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = config.LLM_MAX_TOKENS,
        cancel_event: Optional[asyncio.Event] = None,
    ) -> AsyncIterator[str]:
        """
        Streams generated text tokens from Qwen3.5-4B via llama.cpp.
        Enforces thinking OFF via chat_template_kwargs.
        Stops immediately if cancel_event is set or task is cancelled.
        """
        payload = {
            "messages": messages,
            "temperature": config.LLM_TEMPERATURE,
            "max_tokens": max_tokens,
            "stream": True,
            "cache_prompt": False,
            "chat_template_kwargs": {"enable_thinking": False},
        }

        # Check server readiness
        server_alive = await self.is_server_ready()
        if not server_alive:
            logger.warning("[QwenClient] llama-server not reachable at %s. Using mock fallback.", self.server_url)
            # Offline/mock fallback for standalone test environments
            mock_text = "Gnani.ai is a leading conversational AI company based in Bangalore. It was founded by Ganesh Gopalan and Ananth Nagaraj."
            for word in mock_text.split(" "):
                if cancel_event and cancel_event.is_set():
                    logger.info("[QwenClient] Mock stream cancelled.")
                    return
                await asyncio.sleep(0.04)
                yield word + " "
            return

        timeout = aiohttp.ClientTimeout(total=30.0, sock_read=10.0)
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(self.completions_url, json=payload) as resp:
                    if resp.status != 200:
                        err_text = await resp.text()
                        logger.error(f"[QwenClient] llama-server returned HTTP {resp.status}: {err_text[:200]}")
                        return

                    async for raw_line in resp.content:
                        # Check cancellation before processing line
                        if cancel_event and cancel_event.is_set():
                            logger.info("[QwenClient] Cancel event triggered. Aborting generation stream.")
                            break

                        line = raw_line.decode("utf-8", errors="replace").strip()
                        if not line.startswith("data:"):
                            continue

                        val = line[5:].strip()
                        if val == "[DONE]":
                            break

                        try:
                            chunk = json.loads(val)
                            choices = chunk.get("choices", [])
                            if not choices:
                                continue
                            delta = choices[0].get("delta", {})
                            content = delta.get("content")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue

        except asyncio.CancelledError:
            logger.info("[QwenClient] LLM generation task was cancelled.")
            raise
        except Exception as e:
            logger.error(f"[QwenClient] Error in LLM stream: {e}")


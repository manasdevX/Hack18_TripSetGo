"""
LLM wrapper — Groq primary, Ollama fallback.

Strictly enforces MAX_LLM_CALLS per request via a call counter
injected into each invocation context.
"""
import json
import logging
import time
from typing import Any, Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class LLMCallLimitExceeded(RuntimeError):
    """Raised when MAX_LLM_CALLS is reached for a single request."""


class LLMWrapper:
    """
    Thin async client for Groq (OpenAI-compatible) with Ollama fallback.
    Each instance tracks call count — pass a fresh instance per request.
    """

    def __init__(self) -> None:
        self._call_count: int = 0

    @property
    def call_count(self) -> int:
        return self._call_count

    async def call(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> str:
        """
        Send a chat completion request.
        Tries Groq first; falls back to Ollama on failure.
        Raises LLMCallLimitExceeded if over max calls.
        """
        if self._call_count >= settings.MAX_LLM_CALLS:
            raise LLMCallLimitExceeded(
                f"Maximum LLM calls ({settings.MAX_LLM_CALLS}) reached for this request."
            )

        self._call_count += 1
        call_index = self._call_count
        logger.info("[LLM] Call #%d starting (limit=%d)", call_index, settings.MAX_LLM_CALLS)

        start = time.perf_counter()
        result = await self._try_groq(system_prompt, user_message, temperature, max_tokens, json_mode)

        if result is None and settings.ENABLE_OLLAMA_FALLBACK:
            logger.warning("[LLM] Groq failed — trying Ollama fallback")
            result = await self._try_ollama(system_prompt, user_message, temperature, max_tokens)

        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info("[LLM] Call #%d finished in %.2fms", call_index, elapsed_ms)

        if result is None:
            raise RuntimeError("All LLM providers failed.")
        return result

    # ── Groq ─────────────────────────────────────────────────────────────────

    async def _try_groq(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> Optional[str]:
        if not settings.GROQ_API_KEY:
            logger.warning("[LLM] GROQ_API_KEY not set — skipping Groq")
            return None

        payload: dict[str, Any] = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{settings.GROQ_BASE_URL}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception as exc:
            logger.warning("[LLM] Groq error: %s", exc)
            return None

    # ── Ollama ────────────────────────────────────────────────────────────────

    async def _try_ollama(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float,
        max_tokens: int,
    ) -> Optional[str]:
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": f"System: {system_prompt}\n\nUser: {user_message}",
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/generate",
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()["response"]
        except Exception as exc:
            logger.warning("[LLM] Ollama error: %s", exc)
            return None

    # ── Convenience helpers ────────────────────────────────────────────────────

    async def call_json(
        self, system_prompt: str, user_message: str, temperature: float = 0.1
    ) -> dict[str, Any]:
        """Call LLM and parse result as JSON. Returns empty dict on parse error."""
        raw = await self.call(
            system_prompt=system_prompt,
            user_message=user_message,
            temperature=temperature,
            max_tokens=1024,
            json_mode=True,
        )
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("[LLM] JSON parse failed — raw response: %s", raw[:200])
            # Try to extract JSON block if wrapped in markdown
            import re
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError:
                    pass
            return {}

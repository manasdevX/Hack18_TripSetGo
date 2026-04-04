import logging
from typing import Any, Dict, List, Optional

import httpx
from groq import AsyncGroq

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class LLMWrapper:
    """
    Handles LLM calls for Transport Agent.
    Supports Groq as primary and Ollama as fallback.
    """

    def __init__(self) -> None:
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def call(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,  # Lower temperature for structured data
        max_tokens: int = 1000,
        use_fallback: bool = False
    ) -> str:
        """
        Execute an LLM chat completion.
        """
        if not use_fallback and settings.GROQ_API_KEY:
            try:
                chat_completion = await self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    model=settings.GROQ_MODEL,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return chat_completion.choices[0].message.content
            except Exception as exc:
                logger.error("[LLM] Groq error: %s", exc)
                if settings.ENABLE_OLLAMA_FALLBACK:
                    return await self._call_ollama(system_prompt, user_prompt)
                return "Error: LLM service unavailable."
        elif settings.ENABLE_OLLAMA_FALLBACK:
            return await self._call_ollama(system_prompt, user_prompt)
        
        return "Error: No LLM configured or available."

    async def _call_ollama(self, system_prompt: str, user_prompt: str) -> str:
        """
        Fallback call to local Ollama service.
        """
        logger.info("[LLM] Falling back to Ollama")
        url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": f"System: {system_prompt}\nUser: {user_prompt}",
            "stream": False
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                return resp.json().get("response", "No response from Ollama")
        except Exception as exc:
            logger.error("[LLM] Ollama fallback failed: %s", exc)
            return "Error: Both Groq and Ollama are unavailable."

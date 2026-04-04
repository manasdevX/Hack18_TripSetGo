"""
Agent HTTP client — handles communication with all 7 specialized agents.
"""
import asyncio
import logging
import time
from typing import Any, Optional, Dict, List

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AgentCallResult:
    """Container for an agent call outcome."""

    def __init__(
        self,
        agent: str,
        data: Optional[Any],
        latency_ms: float,
        success: bool,
        cache_hit: bool = False,
        fallback_used: bool = False,
        error: Optional[str] = None,
    ) -> None:
        self.agent = agent
        self.data = data
        self.latency_ms = latency_ms
        self.success = success
        self.cache_hit = cache_hit
        self.fallback_used = fallback_used
        self.error = error


class AgentClient:
    """
    Stateless async agent caller for the 7-agent architecture.
    """

    AGENT_URLS: Dict[str, str] = {
        "intent": settings.INTENT_AGENT_URL,
        "destination": settings.DESTINATION_AGENT_URL,
        "transport": settings.TRANSPORT_AGENT_URL,
        "stay": settings.STAY_AGENT_URL,
        "itinerary": settings.ITINERARY_AGENT_URL,
        "budget": settings.BUDGET_AGENT_URL,
        "navigation": settings.NAVIGATION_AGENT_URL,
    }

    AGENT_PATHS: Dict[str, str] = {
        "intent": "/validate",
        "destination": "/context",
        "transport": "/search",
        "stay": "/search",
        "itinerary": "/plan",
        "budget": "/optimize",
        "navigation": "/track",
    }

    async def call_agent(
        self,
        agent: str,
        payload: Dict[str, Any],
        use_fallback: bool = False,
        _retry: bool = True,
    ) -> AgentCallResult:
        """
        POST to an agent service. Supports timeout and single retry with fallback.
        """
        url = self.AGENT_URLS.get(agent)
        path = self.AGENT_PATHS.get(agent, "/search")

        if not url:
            return AgentCallResult(
                agent=agent,
                data=None,
                latency_ms=0.0,
                success=False,
                error=f"No URL configured for agent '{agent}'",
            )

        if use_fallback:
            payload = {**payload, "use_fallback": True}

        endpoint = f"{url}{path}"
        start = time.perf_counter()

        try:
            async with httpx.AsyncClient(timeout=settings.AGENT_TIMEOUT) as client:
                resp = await client.post(endpoint, json=payload)
                resp.raise_for_status()
                data = resp.json()
                latency_ms = (time.perf_counter() - start) * 1000

                # Normalizing results from different agents
                results = data if isinstance(data, (list, dict)) else {}
                
                logger.info(
                    "[AGENT] %-12s | ✓ SUCCESS | %.1fms%s",
                    agent,
                    latency_ms,
                    " [fallback]" if use_fallback else "",
                )
                return AgentCallResult(
                    agent=agent,
                    data=results,
                    latency_ms=latency_ms,
                    success=True,
                    fallback_used=use_fallback,
                )

        except httpx.TimeoutException:
            latency_ms = (time.perf_counter() - start) * 1000
            logger.warning("[AGENT] %-12s | TIMEOUT after %.1fms", agent, latency_ms)
            return AgentCallResult(
                agent=agent, data=None, latency_ms=latency_ms, success=False, error="timeout"
            )

        except Exception as exc:
            latency_ms = (time.perf_counter() - start) * 1000
            logger.warning("[AGENT] %-12s | ERROR: %s (%.1fms)", agent, exc, latency_ms)
            
            if _retry and settings.RETRY_ATTEMPTS > 0:
                logger.info("[AGENT] %-12s | Retrying with fallback=True...", agent)
                await asyncio.sleep(0.1)
                return await self.call_agent(
                    agent=agent,
                    payload=payload,
                    use_fallback=True,
                    _retry=False,
                )
            
            return AgentCallResult(
                agent=agent,
                data=None,
                latency_ms=latency_ms,
                success=False,
                error=str(exc),
            )


# Singleton
agent_client = AgentClient()

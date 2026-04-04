"""
Redis cache layer for the Orchestrator.

Responsibilities:
- Hash-based cache key generation (idempotent)
- Per-agent TTL strategy
- Async get/set with graceful degradation if Redis is down
"""
import hashlib
import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CacheManager:
    """Wraps aioredis with safe get/set and TTL-per-agent support."""

    # Per-agent TTL map (seconds)
    AGENT_TTL: dict[str, int] = {
        "transport": settings.CACHE_TTL_TRANSPORT,
        "stay": settings.CACHE_TTL_STAY,
        "destination": settings.CACHE_TTL_DESTINATION,
        "itinerary": settings.CACHE_TTL_ITINERARY,
        "full": settings.CACHE_TTL_FULL_RESPONSE,
    }

    def __init__(self) -> None:
        self._client: Optional[aioredis.Redis] = None

    async def connect(self) -> None:
        try:
            self._client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            # Quick ping to validate connection
            await self._client.ping()
            logger.info("Redis connected: %s", settings.REDIS_URL.split("@")[-1])
        except Exception as exc:
            logger.warning("Redis unavailable — caching disabled: %s", exc)
            self._client = None

    async def disconnect(self) -> None:
        if self._client:
            await self._client.aclose()

    # ── Key generation ─────────────────────────────────────────────────────

    @staticmethod
    def build_key(prefix: str, **kwargs: Any) -> str:
        """Produce a deterministic SHA-256-based cache key."""
        canonical = json.dumps(kwargs, sort_keys=True, default=str)
        digest = hashlib.sha256(canonical.encode()).hexdigest()[:16]
        return f"tripsetgo:{prefix}:{digest}"

    # ── Core operations ────────────────────────────────────────────────────

    async def get(self, key: str) -> Optional[Any]:
        """Return deserialized value or None (safe — never raises)."""
        if not settings.ENABLE_CACHE or not self._client:
            return None
        try:
            raw = await self._client.get(key)
            if raw:
                logger.debug("Cache HIT  key=%s", key)
                return json.loads(raw)
            logger.debug("Cache MISS key=%s", key)
        except Exception as exc:
            logger.warning("Cache get error (key=%s): %s", key, exc)
        return None

    async def set(self, key: str, value: Any, ttl: int) -> None:
        """Serialize and store value with TTL (safe — never raises)."""
        if not settings.ENABLE_CACHE or not self._client:
            return
        try:
            await self._client.set(key, json.dumps(value, default=str), ex=ttl)
            logger.debug("Cache SET  key=%s ttl=%ds", key, ttl)
        except Exception as exc:
            logger.warning("Cache set error (key=%s): %s", key, exc)

    async def get_agent_result(self, agent: str, **trip_kwargs: Any) -> Optional[Any]:
        key = self.build_key(agent, **trip_kwargs)
        return await self.get(key)

    async def set_agent_result(self, agent: str, value: Any, **trip_kwargs: Any) -> None:
        ttl = self.AGENT_TTL.get(agent, settings.CACHE_TTL_FULL_RESPONSE)
        key = self.build_key(agent, **trip_kwargs)
        await self.set(key, value, ttl)

    async def get_full_response(self, **trip_kwargs: Any) -> Optional[Any]:
        key = self.build_key("full", **trip_kwargs)
        return await self.get(key)

    async def set_full_response(self, value: Any, **trip_kwargs: Any) -> None:
        key = self.build_key("full", **trip_kwargs)
        await self.set(key, value, settings.CACHE_TTL_FULL_RESPONSE)


# Singleton — shared across requests
cache_manager = CacheManager()

"""
Health check endpoint.
"""
import time

import redis.asyncio as aioredis
from fastapi import APIRouter

from app.core.cache import cache_manager
from app.core.config import get_settings

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health", summary="Orchestrator health check")
async def health() -> dict:
    start = time.perf_counter()

    # Redis ping
    redis_ok = False
    try:
        if cache_manager._client:
            await cache_manager._client.ping()
            redis_ok = True
    except Exception:
        pass

    return {
        "status": "ok",
        "service": "TripSetGo Orchestrator",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "redis": "connected" if redis_ok else "unavailable",
        "latency_ms": round((time.perf_counter() - start) * 1000, 2),
    }

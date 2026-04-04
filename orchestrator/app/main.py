"""
TripSetGo Orchestrator — FastAPI application entrypoint.
"""
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.cache import cache_manager
from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()
configure_logging(debug=settings.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle hooks."""
    # Startup
    await cache_manager.connect()
    yield
    # Shutdown
    await cache_manager.disconnect()


app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description=(
        "High-performance async orchestrator for TripSetGo — coordinates "
        "Flight, Hotel, Places, Budget, and Itinerary agents with Redis caching, "
        "parallel execution, and Groq LLM integration."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(api_router)


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root() -> dict:
    return {
        "service": settings.APP_TITLE,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/v1/health",
    }

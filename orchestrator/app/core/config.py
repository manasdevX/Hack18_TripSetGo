"""
Orchestrator configuration — all values driven by .env
Supports 7-agent refined architecture.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    APP_TITLE: str = "TripSetGo Orchestrator"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    ORCHESTRATOR_PORT: int = 8004

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    # ── LLM (Groq primary) ───────────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama3-8b-8192"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    MAX_LLM_CALLS: int = 2

    # ── LLM fallback (Ollama) ────────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    ENABLE_OLLAMA_FALLBACK: bool = True

    # ── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    ENABLE_CACHE: bool = True
    CACHE_TTL_TRANSPORT: int = 1800       # 30 min
    CACHE_TTL_STAY: int = 3600            # 60 min
    CACHE_TTL_DESTINATION: int = 86400    # 24 hrs
    CACHE_TTL_ITINERARY: int = 3600       # 60 min
    CACHE_TTL_FULL_RESPONSE: int = 3600   # 1 hr (as spec'd)

    # ── 7 Agent Service URLs ─────────────────────────────────────────────────
    INTENT_AGENT_URL: str = "http://localhost:8010"
    DESTINATION_AGENT_URL: str = "http://localhost:8011"
    TRANSPORT_AGENT_URL: str = "http://localhost:8012"
    STAY_AGENT_URL: str = "http://localhost:8013"
    ITINERARY_AGENT_URL: str = "http://localhost:8014"
    BUDGET_AGENT_URL: str = "http://localhost:8015"
    NAVIGATION_AGENT_URL: str = "http://localhost:8016"

    # ── Execution ────────────────────────────────────────────────────────────
    ENABLE_PARALLEL_EXECUTION: bool = True
    AGENT_TIMEOUT: float = 5.0
    RETRY_ATTEMPTS: int = 1

    # ── Payload limits ───────────────────────────────────────────────────────
    MAX_TRANSPORT_RESULTS: int = 5
    MAX_STAY_RESULTS: int = 5

    # ── Budget allocation defaults (%) ───────────────────────────────────────
    BUDGET_SPLIT_TRANSPORT: float = 0.45
    BUDGET_SPLIT_STAY: float = 0.35
    BUDGET_SPLIT_ACTIVITIES: float = 0.20


@lru_cache
def get_settings() -> Settings:
    return Settings()

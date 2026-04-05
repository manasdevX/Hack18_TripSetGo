from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator

class Settings(BaseSettings):
    # --- General ---
    API_TITLE: str = "TripSetGo API"
    API_VERSION: str = "v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # CORS: Handles both list and comma-separated string formats
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        return ["*"]

    # --- JWT & Security ---
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_SECRET_KEY: str
    GOOGLE_PREFILL_SECRET: str

    # --- Database (Neon) ---
    DATABASE_URL: str
    SQLALCHEMY_ECHO: bool = False

    # --- Redis & Celery ---
    REDIS_URL: str = ""
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    FRONTEND_URL: str = "http://localhost:3000"

    # --- SMTP / Email ---
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SENDER_EMAIL: str = ""
    SENDER_NAME: str = "TripSetGo"

    # --- Logic Constants ---
    OTP_EXPIRE_MINUTES: int = 10
    OTP_RESEND_COOLDOWN_SECONDS: int = 60
    SIGNUP_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Agent Configuration ---
    WEATHER_AGENT_URL: str = "http://localhost:8001"
    MAPS_AGENT_URL: str = "http://localhost:8002"
    BUDGET_AGENT_URL: str = "http://localhost:8003"
    ORCHESTRATOR_URL: str = "http://localhost:8004"
    
    WEATHER_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    GOOGLE_PLACES_API_KEY: str = ""
    FOURSQUARE_API_KEY: str = ""
    RAPIDAPI_KEY: str = ""
    RAPIDAPI_RAILWAYS_HOST: str = "indian-railway-irctc.p.rapidapi.com"

    # --- Groq LLM ---
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    # --- Razorpay ---
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.auth.auth import auth_router
from app.api.v1.auth.google import router as google_router
from app.api.v1.endpoints.groups import router as groups_router
from app.api.v1.endpoints.expenses import router as expenses_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.subscription import router as subscription_router
from app.api.v1.trips.routes import router as trips_router
from app.api.v1.discover.routes import router as discover_router
from app.database.base import engine, Base
from app.routes.payments import router as payment_router


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import models AFTER Base/engine are defined to avoid circular-import crashes.
# This ensures SQLAlchemy registers tables on Base.metadata.
from app.models.user import User  # noqa: F401
from app.models.email_otp import EmailOTP  # noqa: F401
from app.models.refresh_token import RefreshToken  # noqa: F401
from app.models.password_reset import PasswordReset  # noqa: F401
from app.models.trip import Trip, TripLike, TripSave, TripComment, UserFollow  # noqa: F401

# Create tables in Neon (Note: Use Alembic for production schema changes)
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    debug=settings.DEBUG
)

# CORS middleware configuration
# settings.CORS_ORIGINS should be a list (e.g., ["http://localhost:3000"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Router Registration ---

# Auth Router: Handles Signup, Login, and OTP Verification
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])

# Google OAuth Router: Handles Google Sign-in flow
app.include_router(google_router, prefix="/api/v1/auth", tags=["Google OAuth"])

# Groups Router: Handles groups, expenses, and settlements
app.include_router(groups_router, tags=["Groups & Expenses"])
app.include_router(expenses_router, tags=["Groups & Expenses"])

# Users Router
app.include_router(users_router, tags=["Users"])

# Payments Router: Handles billing and transactions (legacy)
app.include_router(payment_router, prefix="/api/v1/payments", tags=["Payments"])

# Subscription Router: Full Razorpay subscription system
app.include_router(subscription_router, prefix="/api/v1/subscription", tags=["Subscription"])

# Trips Router: delegates trip planning to Orchestrator multi-agent pipeline
# TODO: Implement trips router when orchestrator integration is ready
# app.include_router(trips_router, prefix="/api/v1/trips", tags=["Trips"])

# Discover Router: Social travel feed, likes, saves, comments, clone
app.include_router(discover_router, prefix="/api/v1", tags=["Discover"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.API_TITLE}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
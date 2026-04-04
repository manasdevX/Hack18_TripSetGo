"""
API v1 router — aggregates all endpoint sub-routers.
"""
from fastapi import APIRouter

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.orchestrate import router as orchestrate_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router)
api_router.include_router(orchestrate_router)

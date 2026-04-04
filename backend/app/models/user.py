from sqlalchemy import Column, String, Boolean, DateTime, func, Integer, Date
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import Optional

# #region debug logging (import-order evidence)
from pathlib import Path
import json
import time

_DEBUG_LOG_PATH = Path(__file__).resolve().parents[3] / "debug-3b89e9.log"

def _dbg(hypothesisId: str, location: str, message: str, data: Optional[dict] = None, runId: str = "prefix") -> None:
    try:
        payload = {
            "sessionId": "3b89e9",
            "id": f"dbg_{int(time.time() * 1000)}_{hypothesisId}",
            "timestamp": int(time.time() * 1000),
            "location": location,
            "message": message,
            "data": data or {},
            "runId": runId,
            "hypothesisId": hypothesisId,
        }
        _DEBUG_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _DEBUG_LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, default=str) + "\n")
    except Exception:
        pass
# #endregion

from app.database.base import Base

# #region debug log: user module importing Base
_dbg(
    hypothesisId="H3",
    location="backend/app/models/user.py:after_import_uuid_before_Base",
    message="user.py executing; about to import app.database.base.Base",
    data={"module": __name__},
)
# #endregion

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True) # Matches router logic
    full_name = Column(String(255), nullable=True)
    
    google_sub = Column(String(255), unique=True, nullable=True, index=True)
    signup_source = Column(String(50), nullable=False, default="local")

    email_verified = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # --- Subscription fields ---
    subscription_type = Column(String(50), nullable=False, default="FREE")       # FREE | PRO_MONTHLY | PRO_YEARLY
    subscription_status = Column(String(50), nullable=False, default="inactive")  # inactive | active | expired
    subscription_expiry = Column(DateTime(timezone=True), nullable=True)

    daily_limit = Column(Integer, nullable=False, default=5)
    daily_usage = Column(Integer, nullable=False, default=0)
    last_usage_reset = Column(Date, nullable=True)

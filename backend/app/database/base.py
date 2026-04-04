from app.database.session import engine, SessionLocal, get_db
from app.database.base_class import Base
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
        # Never block app import due to debug logging.
        pass
# #endregion

# Import models is intentionally NOT done in this module to avoid circular imports.
_dbg(
    hypothesisId="H_fix_base_rewrite",
    location="backend/app/database/base.py:base_loaded",
    message="Base/engine initialized; model imports deferred to app startup",
    data={"Base_module": Base.__module__},
)

from typing import Literal, Optional

from pydantic import BaseModel


class IntentResponse(BaseModel):
    """
    Response from the Intent Agent.
    """
    status: Literal["success", "incomplete"]
    question: Optional[str] = None
    # Add any extra info if needed, e.g. corrected dates
    corrected_data: Optional[dict] = None

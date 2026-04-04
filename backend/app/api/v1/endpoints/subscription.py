"""
Subscription API Router
POST /api/v1/subscription/create-order   — Create Razorpay order
POST /api/v1/subscription/verify         — Verify payment & activate plan
GET  /api/v1/subscription/status         — Get current user subscription info
POST /api/v1/subscription/webhook        — Razorpay webhook (optional bonus)
"""
import hmac
import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.database.session import get_db
from app.models.user import User
from app.services.subscription_service import (
    create_razorpay_order,
    verify_and_activate,
    get_subscription_status,
)
from app.core.config import settings

router = APIRouter(tags=["Subscription"])


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────
class CreateOrderRequest(BaseModel):
    plan: str  # PRO_MONTHLY | PRO_YEARLY


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    plan: str


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.post("/create-order")
async def create_order(
    body: CreateOrderRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Create a Razorpay order for the selected plan."""
    return create_razorpay_order(body.plan)


@router.post("/verify")
async def verify_payment(
    body: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Verify Razorpay payment signature and activate subscription."""
    return verify_and_activate(
        db=db,
        user=current_user,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_order_id=body.razorpay_order_id,
        razorpay_signature=body.razorpay_signature,
        plan=body.plan,
    )


@router.get("/status")
async def subscription_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return current subscription plan, usage, and available plans."""
    return get_subscription_status(current_user)


# ─────────────────────────────────────────────
# Bonus: Razorpay Webhook
# ─────────────────────────────────────────────
@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handles Razorpay webhook events.
    Validates the X-Razorpay-Signature header before processing.
    """
    body_bytes = await request.body()
    received_sig = request.headers.get("X-Razorpay-Signature", "")

    expected_sig = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()

    if expected_sig != received_sig:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = json.loads(body_bytes)
    event_type = event.get("event")

    if event_type == "payment.captured":
        payment = event["payload"]["payment"]["entity"]
        notes = payment.get("notes", {})
        plan = notes.get("plan")
        # In a real implementation, you'd look up the user by order_id/payment_id
        # and activate their subscription here.
        # For now we return 200 to acknowledge receipt.

    return {"status": "received"}

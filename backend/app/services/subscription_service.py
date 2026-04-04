"""
Subscription Service — Razorpay integration + plan management.
"""
import hmac
import hashlib
import razorpay
from datetime import datetime, timedelta, timezone, date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.user import User
from app.models.subscription import Subscription

# ─────────────────────────────────────────────
# Plan Definitions
# ─────────────────────────────────────────────
PLANS = {
    "FREE": {
        "daily_limit": 5,
        "price_paise": 0,
        "duration_days": None,
        "label": "Free",
    },
    "PRO_MONTHLY": {
        "daily_limit": 50,
        "price_paise": 19900,   # ₹199 in paise
        "duration_days": 30,
        "label": "Pro Monthly",
    },
    "PRO_YEARLY": {
        "daily_limit": 50,
        "price_paise": 199900,  # ₹1999 in paise
        "duration_days": 365,
        "label": "Pro Yearly",
    },
}

# ─────────────────────────────────────────────
# Razorpay Client
# ─────────────────────────────────────────────
_PLACEHOLDER_KEYS = {"rzp_test_YOUR_KEY_ID_HERE", "YOUR_KEY_SECRET_HERE", "", "rzp_test_yourkey", "your_secret_here"}

def _assert_razorpay_configured() -> None:
    """Raise a 503 with a clear setup message if keys are not set."""
    if (not settings.RAZORPAY_KEY_ID or settings.RAZORPAY_KEY_ID in _PLACEHOLDER_KEYS
            or not settings.RAZORPAY_KEY_SECRET or settings.RAZORPAY_KEY_SECRET in _PLACEHOLDER_KEYS):
        raise HTTPException(
            status_code=503,
            detail=(
                "Razorpay is not configured. "
                "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env "
                "(get them from https://dashboard.razorpay.com/app/keys)."
            ),
        )

def _get_razorpay_client() -> razorpay.Client:
    _assert_razorpay_configured()
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


# ─────────────────────────────────────────────
# Create Razorpay Order
# ─────────────────────────────────────────────
def create_razorpay_order(plan: str) -> dict:
    if plan not in PLANS or plan == "FREE":
        raise HTTPException(status_code=400, detail="Invalid or free plan selected")

    plan_info = PLANS[plan]
    client = _get_razorpay_client()

    order_data = {
        "amount": plan_info["price_paise"],
        "currency": "INR",
        "receipt": f"tripsetgo_{plan}_{int(datetime.now().timestamp())}",
        "notes": {"plan": plan},
    }

    try:
        order = client.order.create(data=order_data)
    except HTTPException:
        raise
    except Exception as exc:
        err_msg = str(exc)
        if "Authentication" in err_msg or "401" in err_msg or "403" in err_msg:
            raise HTTPException(
                status_code=401,
                detail="Razorpay authentication failed. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env match your dashboard keys.",
            )
        raise HTTPException(status_code=502, detail=f"Razorpay error: {err_msg}")

    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key": settings.RAZORPAY_KEY_ID,
        "plan": plan,
    }


# ─────────────────────────────────────────────
# Verify Payment & Activate Subscription
# ─────────────────────────────────────────────
def verify_and_activate(
    db: Session,
    user: User,
    razorpay_payment_id: str,
    razorpay_order_id: str,
    razorpay_signature: str,
    plan: str,
) -> dict:
    # 1. Validate plan
    if plan not in PLANS or plan == "FREE":
        raise HTTPException(status_code=400, detail="Invalid plan")

    # 2. Idempotency — check duplicate payment
    existing = (
        db.query(Subscription)
        .filter(Subscription.razorpay_payment_id == razorpay_payment_id)
        .first()
    )
    if existing:
        return {"status": "already_processed", "message": "Payment already recorded"}

    # 3. Verify Razorpay signature
    body = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected_sig = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        body.encode(),
        hashlib.sha256,
    ).hexdigest()

    if expected_sig != razorpay_signature:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    # 4. Update user subscription
    plan_info = PLANS[plan]
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(days=plan_info["duration_days"])

    user.subscription_type = plan
    user.subscription_status = "active"
    user.subscription_expiry = expiry
    user.daily_limit = plan_info["daily_limit"]

    # 5. Insert subscription record
    sub = Subscription(
        user_id=user.id,
        plan_type=plan,
        status="active",
        razorpay_payment_id=razorpay_payment_id,
        razorpay_order_id=razorpay_order_id,
        start_date=now,
        end_date=expiry,
    )
    db.add(sub)
    db.commit()
    db.refresh(user)

    return {
        "status": "success",
        "plan": plan,
        "daily_limit": plan_info["daily_limit"],
        "expiry": expiry.isoformat(),
    }


# ─────────────────────────────────────────────
# Daily Usage Check + Reset
# ─────────────────────────────────────────────
def check_and_increment_usage(db: Session, user: User) -> None:
    """
    Called before every rate-limited endpoint.
    Resets counter daily, then increments.
    Raises 429 if limit exceeded.
    Also auto-expires subscriptions.
    """
    today = date.today()

    # Auto-expire check
    if (
        user.subscription_status == "active"
        and user.subscription_expiry
        and user.subscription_expiry.date() < today
    ):
        user.subscription_type = "FREE"
        user.subscription_status = "expired"
        user.daily_limit = PLANS["FREE"]["daily_limit"]

    # Daily reset
    if user.last_usage_reset != today:
        user.daily_usage = 0
        user.last_usage_reset = today

    # Limit check
    if user.daily_usage >= user.daily_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Daily limit reached. Upgrade your plan.",
                "daily_usage": user.daily_usage,
                "daily_limit": user.daily_limit,
                "plan": user.subscription_type,
            },
        )

    user.daily_usage += 1
    db.commit()


# ─────────────────────────────────────────────
# Get Subscription Status
# ─────────────────────────────────────────────
def get_subscription_status(user: User) -> dict:
    today = date.today()

    # Auto-expire in-memory check (no DB write here)
    is_expired = (
        user.subscription_status == "active"
        and user.subscription_expiry
        and user.subscription_expiry.date() < today
    )

    effective_status = "expired" if is_expired else user.subscription_status
    effective_plan = "FREE" if is_expired else user.subscription_type
    effective_limit = PLANS["FREE"]["daily_limit"] if is_expired else user.daily_limit

    # Reset usage counter if last reset wasn't today
    current_usage = 0 if user.last_usage_reset != today else user.daily_usage

    return {
        "subscription_type": effective_plan,
        "subscription_status": effective_status,
        "subscription_expiry": user.subscription_expiry.isoformat() if user.subscription_expiry else None,
        "daily_limit": effective_limit,
        "daily_usage": current_usage,
        "plans": {
            k: {
                "daily_limit": v["daily_limit"],
                "price_inr": v["price_paise"] // 100,
                "label": v["label"],
            }
            for k, v in PLANS.items()
        },
    }

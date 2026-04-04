import razorpay
import hmac
import hashlib
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import os

router = APIRouter(tags=["Payments"])

# Set these in your .env file
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_yourkey")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "your_secret_here")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

class OrderRequest(BaseModel):
    plan: str
    amount: int

class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.post("/create-order")
async def create_order(request: OrderRequest):
    try:
        # Amount is already in paise from frontend
        data = {
            "amount": request.amount,
            "currency": "INR",
            "receipt": f"receipt_manas_{request.plan}",
        }
        order = client.order.create(data=data)
        return order
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify")
async def verify_payment(request: VerifyRequest):
    # This ensures the payment data wasn't tampered with
    body = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
    generated_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()

    if generated_signature == request.razorpay_signature:
        # TODO: Update your Database (Zustand or DB) to set user.isPro = True
        return {"status": "success"}
    else:
        raise HTTPException(status_code=400, detail="Invalid signature")
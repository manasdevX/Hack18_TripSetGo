from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.database.session import get_db
from app.models.user import User

router = APIRouter()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/google/login")
def google_login():
    """Redirect user to Google OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID or settings.GOOGLE_CLIENT_ID == "your_google_client_id_here":
        raise HTTPException(
            status_code=500, 
            detail="Google OAuth credentials are not configured in the backend (.env file missing GOOGLE_CLIENT_ID)."
        )
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback, create/login user, and redirect to frontend with JWT."""

    # Step 1: Exchange authorization code for Google tokens
    token_response = httpx.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=20.0,
    )

    if token_response.status_code != 200:
        print("Google token exchange failed:", token_response.text)
        raise HTTPException(status_code=400, detail="Failed to exchange code with Google")

    google_tokens = token_response.json()
    google_access_token = google_tokens.get("access_token")

    if not google_access_token:
        raise HTTPException(status_code=400, detail="Google access token not received")

    # Step 2: Fetch Google user info
    userinfo_response = httpx.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {google_access_token}"},
        timeout=20.0,
    )

    if userinfo_response.status_code != 200:
        print("Google userinfo fetch failed:", userinfo_response.text)
        raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")

    google_user = userinfo_response.json()

    email = google_user.get("email")
    full_name = google_user.get("name")
    google_id = google_user.get("id")

    if not email:
        raise HTTPException(status_code=400, detail="Google account email not available")

    # Step 3: Find or create user
    user = db.query(User).filter(User.email == email).first()

    if user:
        # Link Google account if user already exists
        if not user.google_sub:
            user.google_sub = google_id
            user.signup_source = "google"
            db.commit()
            db.refresh(user)
    else:
        user = User(
            email=email,
            full_name=full_name,
            google_sub=google_id,
            signup_source="google",
            email_verified=True,
            password_hash=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Step 4: Create your app JWT
    jwt_token = create_access_token(data={"sub": user.email})

    # Step 5: Redirect frontend with token
    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth/callback?token={jwt_token}"
    )
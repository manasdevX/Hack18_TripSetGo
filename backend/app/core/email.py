import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


async def send_otp_email(to_email: str, otp_code: str, full_name: str = "") -> None:
    greeting = f"Hi {full_name}," if full_name else "Hi,"
    html_body = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <h2>Verify your email</h2>
        <p>{greeting}</p>
        <p>Your verification code (expires in {settings.OTP_EXPIRE_MINUTES} min):</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px">{otp_code}</span>
        </div>
        <p style="color:#71717a;font-size:13px">If you didn't request this, ignore this email.</p>
    </body></html>
    """
    message = MIMEMultipart("alternative")
    message["Subject"] = "Your TripSetGo Verification Code"
    message["From"] = f"{settings.SENDER_NAME} <{settings.SENDER_EMAIL}>"
    message["To"] = to_email
    message.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=True,
            timeout=10,
        )
        logger.info(f"OTP email sent to {to_email}")
    except Exception as e:
        logger.error(f"Email failed: {e}")
        raise RuntimeError(f"Email delivery failed: {e}")
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

class EmailService:
    def __init__(self):
        # Basic configuration from settings
        self.smtp_server = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.sender_email = settings.SENDER_EMAIL
        
        # Fallback to "TripSetGo" if SENDER_NAME is not in .env
        self.sender_name = getattr(settings, "SENDER_NAME", "TripSetGo")

    def send_otp(self, email: str, otp_code: str):
        """
        Sends a 6-digit OTP to the specified email address.
        Handles both Port 465 (Implicit SSL) and Port 587 (STARTTLS).
        """
        subject = "Verify your TripSetGo Account"
        
        # Standard HTML Template
        body = f"""
        <html>
            <body style="font-family: sans-serif; color: #334155;">
                <h2 style="color: #4f46e5;">Welcome to TripSetGo!</h2>
                <p>Use the code below to verify your email address and start planning your trips:</p>
                <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">
                    {otp_code}
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
                    This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes. 
                    If you didn't request this, you can safely ignore this email.
                </p>
            </body>
        </html>
        """
        
        message = MIMEMultipart()
        
        # --- THE STANDARD FORMATTING FIX ---
        # "Sender Name <email@domain.com>" format for professional Gmail display
        message["From"] = f"{self.sender_name} <{self.sender_email}>"
        message["To"] = email
        message["Subject"] = subject
        message.attach(MIMEText(body, "html"))

        try:
            # ✨ Smart SMTP Logic: Determines connection type based on Port
            if self.smtp_port == 465:
                # Port 465: Use SMTP_SSL (Implicit)
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            else:
                # Other Ports (e.g., 587): Use Standard SMTP + STARTTLS
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
            
            with server:
                server.login(self.smtp_user, self.smtp_password)
                # Raw email for envelope, message.as_string() for the UI headers
                server.sendmail(self.sender_email, email, message.as_string())
            
            return True
            
        except Exception as e:
            # Descriptive error printing for easier debugging
            print(f"SMTP Error: {e}")
            return False

    def send_reset_password_email(self, email: str, reset_link: str):
        """
        Sends a password reset link to the specified email address.
        """
        subject = "Reset Your TripSetGo Password"
        
        # Professional HTML template
        body = f"""
        <html>
            <body style="font-family: sans-serif; color: #334155;">
                <h2 style="color: #4f46e5;">Password Reset Request</h2>
                <p>We received a request to reset the password for your TripSetGo account.</p>
                <p>Click the button below to reset your password. This link will expire in <strong>15 minutes</strong>.</p>
                
                <div style="margin: 30px 0; text-align: center;">
                    <a href="{reset_link}" style="background: #4f46e5; color: white; padding: 14px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                
                <p style="font-size: 12px; color: #94a3b8;">
                    Or copy and paste this link in your browser:
                </p>
                <p style="font-size: 12px; color: #4f46e5; word-break: break-all;">
                    {reset_link}
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #94a3b8;">
                    <strong>Didn't request this?</strong> If you didn't request a password reset, you can safely ignore this email. 
                    Your password will remain unchanged.
                </p>
                <p style="font-size: 12px; color: #94a3b8;">
                    For security reasons, we'll never ask for your password via email. 
                </p>
            </body>
        </html>
        """
        
        message = MIMEMultipart()
        message["From"] = f"{self.sender_name} <{self.sender_email}>"
        message["To"] = email
        message["Subject"] = subject
        message.attach(MIMEText(body, "html"))

        try:
            if self.smtp_port == 465:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
            
            with server:
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.sender_email, email, message.as_string())
            
            print(f"✅ Reset password email sent to {email}")
            return True
            
        except Exception as e:
            print(f"❌ SMTP Error sending reset email: {e}")
            return False

    def send_password_recovery_otp(self, email: str, otp_code: str):
        """
        Sends a 6-digit OTP for password recovery.
        """
        subject = "Your TripSetGo Password Recovery Code"
        
        # Professional HTML template with OTP
        body = f"""
        <html>
            <body style="font-family: sans-serif; color: #334155;">
                <h2 style="color: #4f46e5;">Password Recovery Code</h2>
                <p>We received a request to reset your TripSetGo password. Use the code below to proceed:</p>
                
                <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a; margin: 30px 0;">
                    {otp_code}
                </div>
                
                <p style="color: #64748b; font-size: 14px;">
                    <strong>This code will expire in 5 minutes.</strong>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #94a3b8;">
                    <strong>Didn't request this?</strong> If you didn't request a password reset, you can safely ignore this email. 
                    Your password will remain unchanged.
                </p>
                <p style="font-size: 12px; color: #94a3b8;">
                    For security reasons, we'll never ask for your password via email. 
                </p>
            </body>
        </html>
        """
        
        message = MIMEMultipart()
        message["From"] = f"{self.sender_name} <{self.sender_email}>"
        message["To"] = email
        message["Subject"] = subject
        message.attach(MIMEText(body, "html"))

        try:
            if self.smtp_port == 465:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
            
            with server:
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.sender_email, email, message.as_string())
            
            print(f"✅ Password recovery OTP sent to {email}")
            return True
            
        except Exception as e:
            print(f"❌ SMTP Error sending OTP: {e}")
            return False

# --- CRITICAL: INSTANTIATE THE SERVICE ---
email_service = EmailService()
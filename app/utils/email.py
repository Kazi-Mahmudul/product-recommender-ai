import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def send_verification_email(email: str, verification_code: str) -> bool:
    """
    Send verification email with the provided code.
    
    Args:
        email: Recipient email address
        verification_code: 6-digit verification code
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = settings.EMAIL_FROM
        msg['To'] = email
        msg['Subject'] = "Verify your Peyechi account"
        
        # Email body
        body = f"""
        html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #377D5B;">Peyechi</h1>
            <h2>Welcome to Peyechi!</h2>
            <p>Thank you for registering with Peyechi. To complete your registration, please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_link}" 
                   style="background-color: #377D5B; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;
                          font-weight: bold;">
                    Verify Email Address
                </a>
            </div>
            <p>If you didn't create an account with Peyechi, please ignore this email.</p>
            <p>Best regards,<br>The Peyechi Team</p>
        </div>
    </body>
    </html>
    """
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        if settings.EMAIL_USE_TLS:
            server.starttls()
        
        if settings.EMAIL_USER and settings.EMAIL_PASS:
            server.login(settings.EMAIL_USER, settings.EMAIL_PASS)
        
        text = msg.as_string()
        server.sendmail(settings.EMAIL_FROM, email, text)
        server.quit()
        
        logger.info(f"Verification email sent successfully to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {str(e)}")
        return False

def send_password_reset_email(email: str, reset_code: str) -> bool:
    """
    Send password reset email with the provided code.
    
    Args:
        email: Recipient email address
        reset_code: 6-digit reset code
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = settings.EMAIL_FROM
        msg['To'] = email
        msg['Subject'] = "Reset your Peyechi password"
        
        # Email body
        body = f"""
        <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Please use the following code to complete the process:</p>
            <h1 style="color: #dc3545; font-size: 32px; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                {reset_code}
            </h1>
            <p>This code will expire in {settings.VERIFICATION_CODE_EXPIRE_MINUTES} minutes.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
            <br>
            <p>Best regards,<br>The Peyechi Team</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        if settings.EMAIL_USE_TLS:
            server.starttls()
        
        if settings.EMAIL_USER and settings.EMAIL_PASS:
            server.login(settings.EMAIL_USER, settings.EMAIL_PASS)
        
        text = msg.as_string()
        server.sendmail(settings.EMAIL_FROM, email, text)
        server.quit()
        
        logger.info(f"Password reset email sent successfully to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {email}: {str(e)}")
        return False 
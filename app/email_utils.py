import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ✅ Replace with your Gmail or other SMTP credentials
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_SENDER = "bsarathy303@gmail.com"
EMAIL_PASSWORD = "wmft fhup luov owee"  # Use Gmail app password, not your real password

def send_email(to_email: str, subject: str, body: str):
    msg = MIMEMultipart()
    msg["From"] = EMAIL_SENDER
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"❌ Email error: {e}")

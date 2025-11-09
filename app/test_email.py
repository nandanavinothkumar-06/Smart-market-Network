from email_utils import send_email

send_email(
    to_email="bsarathy2241@gmail.com",
    subject="Test Email",
    body="This is a test from FastAPI"
)

if (send_email):
    print("Email sent successfully")
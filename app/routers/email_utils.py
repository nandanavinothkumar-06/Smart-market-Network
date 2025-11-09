# app/email_utils.py

def send_email(to_email: str, subject: str, body: str):
    # Simulated email sending — prints to console for testing
    print("\n--- EMAIL SENT ---")
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"Body:\n{body}")
    print("------------------\n")

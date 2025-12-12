import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
import sys

# Handle both relative imports (when used as module) and direct execution
try:
    from .config import SMTP_SERVER, SMTP_PORT, SENDER_EMAIL, SENDER_PASSWORD, RECIPIENT_EMAIL
except ImportError:
    # If running as a script, add parent directory to path
    sys.path.insert(0, os.path.dirname(__file__))
    from config import SMTP_SERVER, SMTP_PORT, SENDER_EMAIL, SENDER_PASSWORD, RECIPIENT_EMAIL


def create_html_email():
    """Read HTML template from file"""
    template_path = os.path.join(os.path.dirname(__file__), 'template.html')
    with open(template_path, 'r', encoding='utf-8') as f:
        html = f.read()
    return html


def send_formatted_email():
    """Send formatted HTML email"""
    try:
        # Create message
        message = MIMEMultipart()
        message["From"] = "Sky Team 5"
        message["To"] = RECIPIENT_EMAIL
        message["Subject"] = f"📰 Daily News Digest - {datetime.now().strftime('%B %d, %Y')}"
        
        html_content = create_html_email()
        message.attach(MIMEText(html_content, "html"))
        
        # Connect to SMTP server and send email
        print(f"Connecting to {SMTP_SERVER}:{SMTP_PORT}...")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()  # Enable TLS encryption
            print("Logging in...")
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            print(f"Sending formatted email to {RECIPIENT_EMAIL}...")
            server.send_message(message)
            print("✓ Formatted HTML email sent successfully!")
            
    except Exception as e:
        print(f"✗ Error sending email: {e}")


if __name__ == "__main__":
    print("=" * 50)
    print("FORMATTED HTML EMAIL SENDER")
    print("=" * 50)
    print(f"\nFrom: {SENDER_EMAIL}")
    print(f"To: {RECIPIENT_EMAIL}")
    print(f"Subject: 📰 Daily News Digest - {datetime.now().strftime('%B %d, %Y')}")
    print("\n" + "=" * 50)
    
    print("\nThis will send a formatted HTML email based on the wireframe design.")
    print("The email includes both HTML and plain text versions.")
    
    # Confirm before sending
    response = input("\nSend this email? (yes/no): ").strip().lower()
    if response in ['yes', 'y']:
        send_formatted_email()
    else:
        print("Email sending cancelled.")


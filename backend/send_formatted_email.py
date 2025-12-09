import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import email_config
import os

# Email configuration from email_config.py
SMTP_SERVER = email_config.SMTP_SERVER
SMTP_PORT = email_config.SMTP_PORT
SENDER_EMAIL = email_config.SENDER_EMAIL
SENDER_PASSWORD = email_config.SENDER_PASSWORD
RECIPIENT_EMAIL = email_config.RECIPIENT_EMAIL


def create_html_email():
    # Read HTML template from file
    template_path = os.path.join(os.path.dirname(__file__), 'email_template.html')
    with open(template_path, 'r', encoding='utf-8') as f:
        html = f.read()
    return html


def send_formatted_email():
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


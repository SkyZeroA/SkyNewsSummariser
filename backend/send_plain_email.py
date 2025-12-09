import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import email_config

# Email configuration from email_config.py
SMTP_SERVER = email_config.SMTP_SERVER
SMTP_PORT = email_config.SMTP_PORT
SENDER_EMAIL = email_config.SENDER_EMAIL
SENDER_PASSWORD = email_config.SENDER_PASSWORD
RECIPIENT_EMAIL = email_config.RECIPIENT_EMAIL


def create_plain_text_summary():
    """Create a plain text news summary"""
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%B %d, %Y")
    
    summary = f"""
Daily News Digest - {yesterday}

YESTERDAY'S NEWS SUMMARY
========================

Major developments included significant policy changes in international trade, 
breakthrough announcements in renewable energy technology, and important updates 
in global health initiatives.

Economic markets showed mixed results with technology sectors gaining ground while 
traditional industries faced headwinds. Climate discussions continued at the 
international summit with new commitments from several nations.

In sports, championship games delivered unexpected results, and cultural events 
highlighted emerging artists and performers. Scientific research revealed new 
findings in space exploration and medical treatments.


READ THE FULL ARTICLES
======================

1. International Trade Policy Changes Announced
   Major policy shifts affecting global markets and international relations...
   Link: https://example.com/article1

2. Breakthrough in Renewable Energy Technology
   Scientists unveil new solar panel technology with 40% efficiency gains...
   Link: https://example.com/article2

3. Global Health Initiative Updates
   WHO announces new programs targeting preventable diseases in developing nations...
   Link: https://example.com/article3

4. Technology Sector Shows Strong Growth
   Market analysis reveals continued momentum in AI and cloud computing sectors...
   Link: https://example.com/article4

5. Climate Summit Yields New Commitments
   Multiple nations pledge carbon neutrality targets and increased renewable investment...
   Link: https://example.com/article5


---
You're receiving this because you subscribed to Daily News Digest.
To unsubscribe, click here: https://example.com/unsubscribe
"""
    return summary


def send_plain_email():
    """Send plain text email"""
    try:
        # Create message
        message = MIMEMultipart()
        message["From"] = f"Sky Team 5 <{SENDER_EMAIL}>"
        message["To"] = RECIPIENT_EMAIL
        message["Subject"] = f"Daily News Digest - {datetime.now().strftime('%B %d, %Y')}"
        
        # Add plain text body
        plain_text = create_plain_text_summary()
        message.attach(MIMEText(plain_text, "plain"))
        
        # Connect to SMTP server and send email
        print(f"Connecting to {SMTP_SERVER}:{SMTP_PORT}...")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()  # Enable TLS encryption
            print("Logging in...")
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            print(f"Sending email to {RECIPIENT_EMAIL}...")
            server.send_message(message)
            print("✓ Plain text email sent successfully!")
            
    except Exception as e:
        print(f"✗ Error sending email: {e}")


if __name__ == "__main__":
    print("=" * 50)
    print("PLAIN TEXT EMAIL SENDER")
    print("=" * 50)
    print(f"\nFrom: {SENDER_EMAIL}")
    print(f"To: {RECIPIENT_EMAIL}")
    print(f"Subject: Daily News Digest - {datetime.now().strftime('%B %d, %Y')}")
    print("\n" + "=" * 50)
    
    # Preview the email content
    print("\nEMAIL PREVIEW:")
    print("-" * 50)
    print(create_plain_text_summary())
    print("-" * 50)
    
    # Confirm before sending
    response = input("\nSend this email? (yes/no): ").strip().lower()
    if response in ['yes', 'y']:
        send_plain_email()
    else:
        print("Email sending cancelled.")


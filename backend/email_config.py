import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# SMTP Server Configuration
SMTP_SERVER = "smtp.gmail.com"  # For Gmail

SMTP_PORT = 587  # TLS port (recommended)
# SMTP_PORT = 465  # SSL port (alternative)

# Email Credentials (loaded from .env file)
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")  # Use app-specific password, NOT your regular password

# Recipient Email
RECIPIENT_EMAIL = os.getenv("RECIPIENT_EMAIL") 

# Common SMTP Servers:
# Gmail: smtp.gmail.com (port 587 or 465)
# Outlook/Office365: smtp.office365.com (port 587)
# Yahoo: smtp.mail.yahoo.com (port 587 or 465)
# SendGrid: smtp.sendgrid.net (port 587)
# Mailgun: smtp.mailgun.org (port 587)

# For Gmail:
# 1. Enable 2-factor authentication
# 2. Generate an app-specific password at: https://myaccount.google.com/apppasswords
# 3. Use the app password instead of your regular password


# Backend Setup

## Environment Configuration

Add a `.env` file in the backend directory with the following variables:

```env
SENDER_EMAIL=<Useful info in Slack>
SENDER_PASSWORD=<Useful info in Slack>
RECIPIENT_EMAIL=<Use your personal email address or Sky's email address>
```

## Running the Code

To send a plain text email, run:
```bash
python send_plain_email.py
```

To send a formatted HTML email, run:
```bash
python send_formatted_email.py
```
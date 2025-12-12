# Backend Setup

## Environment Configuration

Add a `.env` file in the backend directory with the following variables:

```env
SENDER_EMAIL=<Useful info in Slack>
SENDER_PASSWORD=<Useful info in Slack>
RECIPIENT_EMAIL=<Use your personal email address or Sky's email address>
NEWS_API_KEY=<Useful info in Slack>
```

To get a NewsAPI key:
1. Go to https://newsapi.org/
2. Sign up for a free account
3. Copy your API key and add it to the `.env` file

## Running the Code

### Email Scripts
To send a formatted HTML email, run:
```bash
python3 services/email/sender.py
```

### Flask API Server

To start the Flask API server:
```bash
cd backend
python3 app.py
```

The API will be available at `http://localhost:5000`

**API Endpoints:**
- `GET /` - API information

 ## Running Tests

### Install Test Dependencies

First, make sure you have pytest installed:

```bash
pip3 install pytest pytest-cov pytest-mock
```

# Run all tests
python3 -m pytest -v

# Run with coverage report
python3 -m pytest --cov=. --cov-report=term --cov-report=html

# Run specific test file
python3 -m pytest tests/test_routes.py -v

# Run specific test class
python3 -m pytest tests/test_routes.py::TestHomeEndpoint -v

# Run specific test
python3 -m pytest tests/test_routes.py::TestHomeEndpoint::test_home_returns_200 -v

## Test Coverage

### Generate Coverage Report

```bash
# Generate HTML coverage report
python3 -m pytest --cov=. --cov-report=html

# Open the report
open htmlcov/index.html  # macOS
```

### Verbose Output

```bash
# Show detailed output
python3 -m pytest -v

# Show even more details
python3 -m pytest -vv

# Show print statements
python3pytest -s
```
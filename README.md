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
- `GET /api/news/sources` - Get available news sources
  - Query params: `category`, `language`, `country`
- `GET /api/news/sky/headlines` - Get Sky News top headlines (RECOMMENDED)
  - Query params: `page_size`, `page`, `q` (search query)
- `GET /api/news/sky` - Get Sky News articles with search
  - Query params: `from_date`, `to_date`, `page_size`, `page`, `q` (search query, default: 'news')
- `GET /api/news/sky/yesterday` - Get Sky News articles from yesterday
  - Query params: `page_size`, `q` (search query, default: 'news')

**Example requests:**
```bash
# Get Sky News top headlines (RECOMMENDED - most reliable)
# curl http://localhost:5000/api/news/sky/headlines (Not working Yet)

# Get available news sources
curl http://localhost:5000/api/news/sources

# Get yesterday's Sky News articles
curl http://localhost:5000/api/news/sky/yesterday

# Search Sky News for specific topics
curl "http://localhost:5000/api/news/sky?q=politics&page_size=20"

# Get Sky News articles with custom date range
# curl "http://localhost:5000/api/news/sky?q=business&from_date=2024-12-01&to_date=2024-12-08"
```

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
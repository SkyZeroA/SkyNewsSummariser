# Sky News Summariser

A full-stack application that fetches and summarizes Sky News articles, with email notification capabilities.

## Table of Contents
- [Backend Setup](#backend-setup)
- [Running Tests](#running-tests)
- [Frontend Setup](#frontend-setup)

---

## Backend Setup

### Environment Configuration

Add a `.env` file in the backend directory with the following variables:

```env
SENDER_EMAIL=<Useful info in Slack>
SENDER_PASSWORD=<Useful info in Slack>
RECIPIENT_EMAIL=<Use your personal email address or Sky's email address>
CHARTBEAT_API_URL=<Useful info in Slack>
CHARTBEAT_API_KEY=<Useful info in Slack>
```

### Running the Code

#### Email Scripts
To send a formatted HTML email, run:
```bash
python3 services/email/sender.py
```

#### Flask API Server

To start the Flask API server:
```bash
cd backend
python3 app.py
```

The API will be available at `http://localhost:5000`

**API Endpoints:**
- `GET /` - API information
- `GET /api/news/chartbeat/top` - Get top articles from Chartbeat by real-time popularity

---

## Running Tests

### Install Test Dependencies

First, make sure you have pytest installed:

```bash
pip3 install pytest pytest-cov pytest-mock
```

### Running Tests

```bash
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
```

### Test Coverage

Generate HTML coverage report:

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
python3 -m pytest -s
```

---

## Frontend Setup

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


### Husky

Husky runs commands st given points in the git cycle, like before each commit

The `pre-commit.example` file should be copied into a file called `pre-commit` in the `.husky` folder. This will cause the format commands to be run before each commit, so the builds will not fail due to formatting.

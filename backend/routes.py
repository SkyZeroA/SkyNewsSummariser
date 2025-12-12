from flask import Blueprint, jsonify, request
import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Create Blueprint
api_bp = Blueprint('api', __name__)

# NewsAPI configuration
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
NEWS_API_BASE_URL = os.getenv("NEWS_API_BASE_URL")


@api_bp.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        "message": "Sky News Summariser API",
        "version": "1.0.0",
        "endpoints": {
            "/api/news/sky/yesterday": "Get Sky News articles from yesterday",
        }
    })

@api_bp.route('/api/news/sky/yesterday', methods=['GET'])
def get_sky_news_yesterday():
    """
    Get Sky News articles from yesterday
    Query parameters:
    - page_size: Number of articles (default: 10, max: 100)
    - q: Search query (optional, default: 'news')
    """
    if not NEWS_API_KEY:
        return jsonify({
            "error": "NEWS_API_KEY not configured. Please add it to your .env file"
        }), 500

    # Calculate yesterday's date
    # Note: Date calculations are done in the backend to ensure consistency
    # These dates will always be "yesterday" and "today" relative to when the API is called
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    today = datetime.now().strftime('%Y-%m-%d')

    # Get query parameters
    page_size = request.args.get('page_size', 10, type=int)
    query = request.args.get('q', 'news')  # Default query to avoid empty results

    # Validate page_size
    if page_size > 100:
        page_size = 100

    # Build API request parameters
    # Use q parameter with domains for /everything endpoint
    params = {
        'apiKey': NEWS_API_KEY,
        'q': query,
        'domains': 'sky.com',
        'from': yesterday,
        'to': today,
        'pageSize': page_size,
        'sortBy': 'publishedAt',
        'language': 'en'
    }

    try:
        # Make request to NewsAPI
        response = requests.get(f"{NEWS_API_BASE_URL}/everything", params=params)
        response.raise_for_status()

        data = response.json()

        return jsonify({
            "status": "success",
            "date": yesterday,
            "totalResults": data.get('totalResults', 0),
            "articles": data.get('articles', []),
            "pageSize": page_size
        })

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Failed to fetch news from NewsAPI",
            "details": str(e)
        }), 500

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

# Chartbeat API configuration
CHARTBEAT_API_KEY = os.getenv("CHARTBEAT_API_KEY")
CHARTBEAT_API_URL = os.getenv("CHARTBEAT_API_URL")


@api_bp.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        "message": "Sky News Summariser API",
        "version": "1.0.0",
        "endpoints": {
            "/api/news/chartbeat/top": "Get top articles from Chartbeat by real-time popularity",
            "/api/news/chartbeat/historical": "Get yesterday's top articles from Chartbeat (historical data)",
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

@api_bp.route('/api/news/chartbeat/top', methods=['GET'])
def get_chartbeat_top_stories():
    """
    Get top 10 popular stories from Chartbeat
    Query parameters:
    - limit: Number of stories to return (default: 10, max: 50)
    - sort_by: Sort parameter (default: concurrent readers)
              Options: engaged_time, new, returning, social, links, internal, direct, search
    """
    if not CHARTBEAT_API_KEY:
        return jsonify({
            "error": "CHARTBEAT_API_KEY not configured. Please add it to your .env file"
        }), 500

    if not CHARTBEAT_API_URL:
        return jsonify({
            "error": "CHARTBEAT_API_URL not configured. Please add it to your .env file"
        }), 500

    # Get query parameters
    limit = request.args.get('limit', 10, type=int)
    sort_by = request.args.get('sort_by', None)  # Default is concurrent readers

    # Validate limit
    if limit > 50:
        limit = 50
    if limit < 1:
        limit = 1

    # Request more items from API to account for filtering out non-story pages
    # We'll filter to stories only and then limit the results
    api_limit = limit * 3  # Request 3x to ensure we get enough stories after filtering

    # Build API request parameters
    params = {
        'host': 'news.sky.com',  # Sky News domain
        'limit': api_limit,
        'all_platforms': 1,  # Include all platforms (desktop, mobile, tablet, app)
    }

    # Add optional sort_by parameter if provided
    if sort_by:
        params['sort_by'] = sort_by

    # Set up headers with API key
    headers = {
        'X-CB-AK': CHARTBEAT_API_KEY
    }

    try:
        # Make request to Chartbeat API
        response = requests.get(CHARTBEAT_API_URL, params=params, headers=headers)
        response.raise_for_status()

        data = response.json()

        # Extract and format the top pages
        pages = data.get('pages', [])

        formatted_stories = []
        for page in pages:
            # Get the path and construct full URL
            path = page.get('path', '')

            # Only include story pages (filter out /home, /watch-live, etc.)
            # Paths can be in format: "/story/...", "news.sky.com/story/...", or "https://news.sky.com/story/..."
            if not ('/story/' in path or path.startswith('story/')):
                continue

            # Construct full URL - path already contains the domain sometimes
            if path.startswith('http'):
                full_url = path
            elif path.startswith('news.sky.com'):
                full_url = f"https://{path}"
            elif path.startswith('/'):
                full_url = f"https://news.sky.com{path}"
            else:
                full_url = f"https://news.sky.com/{path}"

            story = {
                'title': page.get('title', 'No title'),
                'url': full_url,
                'stats': {
                    'concurrent_visitors': page.get('stats', {}).get('people', 0),
                    # 'engaged_time': page.get('stats', {}).get('engaged_time', 0)
                }
            }

            formatted_stories.append(story)

        # Limit the results to the requested number after filtering
        formatted_stories = formatted_stories[:limit]

        return jsonify({
            "status": "success",
            "total_stories": len(formatted_stories),
            "stories": formatted_stories,
            "limit": limit,
            "sort_by": sort_by if sort_by else "concurrent_visitors",
        })

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Failed to fetch data from Chartbeat API",
            "details": str(e)
        }), 500
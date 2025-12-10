from flask import Blueprint, jsonify, request
import os
import requests
from datetime import datetime, timedelta

# Create Blueprint
api_bp = Blueprint('api', __name__)

# NewsAPI configuration
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
NEWS_API_BASE_URL = "https://newsapi.org/v2"


@api_bp.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        "message": "Sky News Summariser API",
        "version": "1.0.0",
        "endpoints": {
            # "/api/news/sources": "Get available news sources",
            "/api/news/sky": "Get Sky News articles",
            "/api/news/sky/yesterday": "Get Sky News articles from yesterday",
            # "/api/news/sky/headlines": "Get Sky News top headlines"
        }
    })


# @api_bp.route('/api/news/sources', methods=['GET'])
# def get_sources():
#     """
#     Get available news sources from NewsAPI
#     Query parameters:
#     - category: Filter by category (business, entertainment, general, health, science, sports, technology)
#     - language: Filter by language (en, etc.)
#     - country: Filter by country (gb for UK, us for USA, etc.)
#     """
#     if not NEWS_API_KEY:
#         return jsonify({
#             "error": "NEWS_API_KEY not configured. Please add it to your .env file"
#         }), 500

#     # Get query parameters
#     category = request.args.get('category')
#     language = request.args.get('language')
#     country = request.args.get('country')

#     # Build API request parameters
#     params = {
#         'apiKey': NEWS_API_KEY
#     }

#     if category:
#         params['category'] = category
#     if language:
#         params['language'] = language
#     if country:
#         params['country'] = country

#     try:
#         # Make request to NewsAPI
#         response = requests.get(f"{NEWS_API_BASE_URL}/top-headlines/sources", params=params)
#         response.raise_for_status()

#         data = response.json()

#         return jsonify({
#             "status": "success",
#             "sources": data.get('sources', [])
#         })

#     except requests.exceptions.RequestException as e:
#         return jsonify({
#             "error": "Failed to fetch sources from NewsAPI",
#             "details": str(e)
#         }), 500


# @api_bp.route('/api/news/sky/headlines', methods=['GET'])
# def get_sky_news_headlines():
#     """
#     Get Sky News top headlines from NewsAPI
#     Query parameters:
#     - page_size: Number of articles (default: 10, max: 100)
#     - page: Page number (default: 1)
#     - q: Search query (optional)
#     """
#     if not NEWS_API_KEY:
#         return jsonify({
#             "error": "NEWS_API_KEY not configured. Please add it to your .env file"
#         }), 500

#     # Get query parameters
#     page_size = request.args.get('page_size', 10, type=int)
#     page = request.args.get('page', 1, type=int)
#     query = request.args.get('q', '')

#     # Validate page_size
#     if page_size > 100:
#         page_size = 100

#     # Build API request parameters
#     params = {
#         'apiKey': NEWS_API_KEY,
#         'sources': 'sky-news',
#         'pageSize': page_size,
#         'page': page
#     }

#     # Add optional query parameter
#     if query:
#         params['q'] = query

#     try:
#         # Make request to NewsAPI top-headlines endpoint
#         response = requests.get(f"{NEWS_API_BASE_URL}/top-headlines", params=params)
#         response.raise_for_status()

#         data = response.json()

#         return jsonify({
#             "status": "success",
#             "totalResults": data.get('totalResults', 0),
#             "articles": data.get('articles', []),
#             "page": page,
#             "pageSize": page_size
#         })

#     except requests.exceptions.RequestException as e:
#         return jsonify({
#             "error": "Failed to fetch news from NewsAPI",
#             "details": str(e)
#         }), 500


@api_bp.route('/api/news/sky', methods=['GET'])
def get_sky_news():
    """
    Get Sky News articles from NewsAPI using /everything endpoint
    Query parameters:
    - from_date: Start date (YYYY-MM-DD format, optional)
    - to_date: End date (YYYY-MM-DD format, optional)
    - page_size: Number of articles (default: 10, max: 100)
    - page: Page number (default: 1)
    - q: Search query (REQUIRED for /everything endpoint)
    """
    if not NEWS_API_KEY:
        return jsonify({
            "error": "NEWS_API_KEY not configured. Please add it to your .env file"
        }), 500

    # Get query parameters
    from_date = request.args.get('from_date')
    to_date = request.args.get('to_date')
    page_size = request.args.get('page_size', 10, type=int)
    page = request.args.get('page', 1, type=int)
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
        'pageSize': page_size,
        'page': page,
        'sortBy': 'publishedAt',
        'language': 'en'
    }

    if from_date:
        params['from'] = from_date
    if to_date:
        params['to'] = to_date

    try:
        # Make request to NewsAPI
        response = requests.get(f"{NEWS_API_BASE_URL}/everything", params=params)
        response.raise_for_status()

        data = response.json()

        return jsonify({
            "status": "success",
            "totalResults": data.get('totalResults', 0),
            "articles": data.get('articles', []),
            "page": page,
            "pageSize": page_size
        })

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Failed to fetch news from NewsAPI",
            "details": str(e)
        }), 500


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

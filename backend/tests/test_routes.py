import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta


class TestHomeEndpoint:
    """Tests for the home endpoint"""
    
    def test_home_returns_200(self, client):
        """Test that home endpoint returns 200 status code"""
        response = client.get('/')
        assert response.status_code == 200
    
    def test_home_returns_json(self, client):
        """Test that home endpoint returns JSON"""
        response = client.get('/')
        assert response.content_type == 'application/json'
    
    def test_home_contains_message(self, client):
        """Test that home endpoint contains welcome message"""
        response = client.get('/')
        data = response.get_json()
        assert 'message' in data
        assert data['message'] == 'Sky News Summariser API'
    
    def test_home_contains_version(self, client):
        """Test that home endpoint contains version"""
        response = client.get('/')
        data = response.get_json()
        assert 'version' in data
        assert data['version'] == '1.0.0'
    
    def test_home_contains_endpoints(self, client):
        """Test that home endpoint lists available endpoints"""
        response = client.get('/')
        data = response.get_json()
        assert 'endpoints' in data
        assert isinstance(data['endpoints'], dict)


class TestSkyNewsEndpoint:
    """Tests for /api/news/sky endpoint"""
    
    @patch('routes.requests.get')
    def test_sky_news_returns_200_on_success(self, mock_get, client):
        """Test that sky news endpoint returns 200 on successful API call"""
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'ok',
            'totalResults': 10,
            'articles': []
        }
        mock_get.return_value = mock_response
        
        response = client.get('/api/news/sky')
        assert response.status_code == 200
    
    @patch('routes.requests.get')
    def test_sky_news_returns_articles(self, mock_get, client):
        """Test that sky news endpoint returns articles"""
        # Mock successful API response with articles
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'ok',
            'totalResults': 1,
            'articles': [
                {
                    'title': 'Test Article',
                    'description': 'Test Description',
                    'url': 'https://test.com'
                }
            ]
        }
        mock_get.return_value = mock_response
        
        response = client.get('/api/news/sky')
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 1
        assert data['articles'][0]['title'] == 'Test Article'
    
    @patch('routes.requests.get')
    def test_sky_news_handles_api_error(self, mock_get, client):
        """Test that sky news endpoint handles API errors gracefully"""
        import requests
        # Mock API error with RequestException
        mock_get.side_effect = requests.exceptions.RequestException('API Error')

        response = client.get('/api/news/sky')
        assert response.status_code == 500
        data = response.get_json()
        assert 'error' in data
    
    @patch('routes.requests.get')
    def test_sky_news_accepts_date_parameters(self, mock_get, client):
        """Test that sky news endpoint accepts date parameters"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'ok',
            'totalResults': 0,
            'articles': []
        }
        mock_get.return_value = mock_response
        
        response = client.get('/api/news/sky?from_date=2024-01-01&to_date=2024-01-31')
        assert response.status_code == 200
        
        # Verify the API was called with correct parameters
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert 'params' in call_args.kwargs
        params = call_args.kwargs['params']
        assert params['from'] == '2024-01-01'
        assert params['to'] == '2024-01-31'
    
    @patch('routes.requests.get')
    def test_sky_news_accepts_page_size(self, mock_get, client):
        """Test that sky news endpoint accepts page_size parameter"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'ok',
            'totalResults': 0,
            'articles': []
        }
        mock_get.return_value = mock_response
        
        response = client.get('/api/news/sky?page_size=50')
        assert response.status_code == 200
        
        # Verify the API was called with correct page size
        call_args = mock_get.call_args
        params = call_args.kwargs['params']
        assert params['pageSize'] == 50


class TestSkyNewsYesterdayEndpoint:
    """Tests for /api/news/sky/yesterday endpoint"""

    @patch('routes.requests.get')
    def test_yesterday_returns_200_on_success(self, mock_get, client):
        """Test that yesterday endpoint returns 200 on successful API call"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'ok',
            'totalResults': 5,
            'articles': []
        }
        mock_get.return_value = mock_response

        response = client.get('/api/news/sky/yesterday')
        assert response.status_code == 200

    @patch('routes.requests.get')
    def test_yesterday_uses_correct_date_range(self, mock_get, client):
        """Test that yesterday endpoint uses correct date range"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'ok',
            'totalResults': 0,
            'articles': []
        }
        mock_get.return_value = mock_response

        response = client.get('/api/news/sky/yesterday')
        assert response.status_code == 200

        # Verify the API was called with yesterday's date
        call_args = mock_get.call_args
        params = call_args.kwargs['params']

        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        today = datetime.now().strftime('%Y-%m-%d')
        assert params['from'] == yesterday
        assert params['to'] == today  # The endpoint uses today as the 'to' date

    @patch('routes.requests.get')
    def test_yesterday_returns_articles(self, mock_get, client):
        """Test that yesterday endpoint returns articles"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'ok',
            'totalResults': 2,
            'articles': [
                {'title': 'Article 1', 'url': 'https://test1.com'},
                {'title': 'Article 2', 'url': 'https://test2.com'}
            ]
        }
        mock_get.return_value = mock_response

        response = client.get('/api/news/sky/yesterday')
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 2

    @patch('routes.requests.get')
    def test_yesterday_handles_errors(self, mock_get, client):
        """Test that yesterday endpoint handles errors gracefully"""
        import requests
        mock_get.side_effect = requests.exceptions.RequestException('Network error')

        response = client.get('/api/news/sky/yesterday')
        assert response.status_code == 500
        data = response.get_json()
        assert 'error' in data


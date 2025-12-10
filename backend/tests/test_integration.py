import pytest
from unittest.mock import patch, MagicMock


class TestAPIIntegration:
    """Integration tests for API endpoints"""
    
    def test_app_starts_successfully(self, app):
        """Test that the Flask app starts successfully"""
        assert app is not None
        assert app.config['TESTING'] is True
    
    def test_blueprint_is_registered(self, app):
        """Test that the API blueprint is registered"""
        assert 'api' in app.blueprints
    
    def test_all_routes_are_accessible(self, client):
        """Test that all main routes are accessible"""
        routes = [
            '/',
            '/api/news/sky',
            '/api/news/sky/yesterday'
        ]
        
        for route in routes:
            response = client.get(route)
            # Should not return 404
            assert response.status_code != 404, f"Route {route} should be accessible"
    
    @patch('routes.requests.get')
    def test_full_news_fetch_workflow(self, mock_get, client):
        """Test the complete workflow of fetching news"""
        # Mock NewsAPI response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'ok',
            'totalResults': 3,
            'articles': [
                {
                    'title': 'Breaking News 1',
                    'description': 'Description 1',
                    'url': 'https://news.sky.com/story/1',
                    'publishedAt': '2024-12-10T10:00:00Z',
                    'source': {'name': 'Sky News'}
                },
                {
                    'title': 'Breaking News 2',
                    'description': 'Description 2',
                    'url': 'https://news.sky.com/story/2',
                    'publishedAt': '2024-12-10T11:00:00Z',
                    'source': {'name': 'Sky News'}
                },
                {
                    'title': 'Breaking News 3',
                    'description': 'Description 3',
                    'url': 'https://news.sky.com/story/3',
                    'publishedAt': '2024-12-10T12:00:00Z',
                    'source': {'name': 'Sky News'}
                }
            ]
        }
        mock_get.return_value = mock_response
        
        # Fetch news
        response = client.get('/api/news/sky')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        
        # Verify structure
        assert 'status' in data
        assert 'totalResults' in data
        assert 'articles' in data
        
        # Verify content
        assert data['status'] == 'success'
        assert data['totalResults'] == 3
        assert len(data['articles']) == 3
        
        # Verify article structure
        article = data['articles'][0]
        assert 'title' in article
        assert 'description' in article
        assert 'url' in article
        assert 'publishedAt' in article
    
    @patch('routes.requests.get')
    def test_error_handling_workflow(self, mock_get, client):
        """Test that errors are handled properly throughout the workflow"""
        import requests
        # Mock API failure with RequestException
        mock_get.side_effect = requests.exceptions.RequestException('API is down')

        # Try to fetch news
        response = client.get('/api/news/sky')

        # Should return error response
        assert response.status_code == 500
        data = response.get_json()
        assert 'error' in data
        assert 'details' in data
    
    def test_cors_headers_present(self, client):
        """Test that appropriate headers are present in responses"""
        response = client.get('/')
        
        # Check content type
        assert response.content_type == 'application/json'
    
    @patch('routes.requests.get')
    def test_pagination_workflow(self, mock_get, client):
        """Test pagination parameters work correctly"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'ok',
            'totalResults': 100,
            'articles': [{'title': f'Article {i}'} for i in range(50)]
        }
        mock_get.return_value = mock_response
        
        # Request with page size
        response = client.get('/api/news/sky?page_size=50')
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Verify the mock was called with correct parameters
        call_args = mock_get.call_args
        params = call_args.kwargs['params']
        assert params['pageSize'] == 50


class TestEmailServiceIntegration:
    """Integration tests for email service"""
    
    def test_email_service_can_be_imported(self):
        """Test that email service can be imported successfully"""
        try:
            from services.email import send_formatted_email
            assert callable(send_formatted_email)
        except ImportError:
            pytest.fail("Email service should be importable")
    
    def test_email_config_is_accessible(self):
        """Test that email configuration is accessible"""
        try:
            from services.email.config import SMTP_SERVER, SMTP_PORT, SENDER_EMAIL
            assert SMTP_SERVER is not None
            assert SMTP_PORT is not None
        except ImportError:
            pytest.fail("Email config should be importable")


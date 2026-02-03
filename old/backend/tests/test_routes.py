from unittest.mock import patch, MagicMock

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


class TestChartbeatTopStoriesFunctional:
    """Tests for Chartbeat top stories endpoint"""

    @patch('routes.requests.get')
    def test_chartbeat_returns_non_empty_stories(self, mock_get, client, monkeypatch):
        """Test that Chartbeat endpoint returns non-empty stories array"""
        # Set up environment variables
        monkeypatch.setenv('CHARTBEAT_API_KEY', 'test_api_key')
        monkeypatch.setenv('CHARTBEAT_API_URL', 'https://api.chartbeat.com/live/toppages/v3/')

        # Mock successful API response with story data
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'pages': [
                {
                    'path': '/story/uk-news-12345',
                    'title': 'Breaking News Story',
                    'stats': {'people': 1500}
                },
                {
                    'path': '/story/world-news-67890',
                    'title': 'International Update',
                    'stats': {'people': 1200}
                },
                {
                    'path': '/home',  # This should be filtered out
                    'title': 'Home Page',
                    'stats': {'people': 5000}
                }
            ]
        }
        mock_get.return_value = mock_response

        # Make request to endpoint
        response = client.get('/api/news/chartbeat/top')

        # Verify response
        assert response.status_code == 200
        data = response.get_json()

        # Check that we got stories back
        assert 'stories' in data
        assert isinstance(data['stories'], list)
        assert len(data['stories']) > 0, "Stories array should not be empty"

        # Verify stories are properly formatted
        for story in data['stories']:
            assert 'title' in story
            assert 'url' in story
            assert 'stats' in story
            assert story['title'] != '', "Story title should not be empty"
            assert story['url'] != '', "Story URL should not be empty"

    @patch('routes.requests.get')
    def test_chartbeat_filters_non_story_pages(self, mock_get, client, monkeypatch):
        """Test that non-story pages are filtered out from results"""
        # Set up environment variables
        monkeypatch.setenv('CHARTBEAT_API_KEY', 'test_api_key')
        monkeypatch.setenv('CHARTBEAT_API_URL', 'https://api.chartbeat.com/live/toppages/v3/')

        # Mock API response with mixed content
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'pages': [
                {
                    'path': '/story/test-story-1',
                    'title': 'Test Story 1',
                    'stats': {'people': 100}
                },
                {
                    'path': '/watch-live',
                    'title': 'Watch Live',
                    'stats': {'people': 500}
                },
                {
                    'path': '/story/test-story-2',
                    'title': 'Test Story 2',
                    'stats': {'people': 80}
                }
            ]
        }
        mock_get.return_value = mock_response

        response = client.get('/api/news/chartbeat/top')
        data = response.get_json()

        # Should only have 2 stories (non-story pages filtered out)
        assert len(data['stories']) == 2
        assert all('/story/' in story['url'] for story in data['stories'])





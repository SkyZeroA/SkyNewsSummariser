import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import requests

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


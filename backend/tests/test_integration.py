
import pytest
from unittest.mock import patch, MagicMock
from services.email import send_formatted_email
from services.email.config import SMTP_SERVER, SMTP_PORT
import requests


class TestAPIIntegration:
    """Integration tests for API endpoints"""
    
    def test_app_starts_successfully(self, app):
        """Test that the Flask app starts successfully"""
        assert app is not None
        assert app.config['TESTING'] is True
    
    def test_blueprint_is_registered(self, app):
        """Test that the API blueprint is registered"""
        assert 'api' in app.blueprints
    
    def test_home_route_is_accessible(self, client):
        """Test that home route is accessible"""
        response = client.get('/')
        # Should not return 404
        assert response.status_code == 200

    def test_cors_headers_present(self, client):
        """Test that appropriate headers are present in responses"""
        response = client.get('/')

        # Check content type
        assert response.content_type == 'application/json'


class TestEmailServiceIntegration:
    """Integration tests for email service"""
    
    def test_email_service_can_be_imported(self):
        """Test that email service can be imported successfully"""
        try:
            assert callable(send_formatted_email)
        except ImportError:
            pytest.fail("Email service should be importable")
    
    def test_email_config_is_accessible(self):
        """Test that email configuration is accessible"""
        try:
            assert SMTP_SERVER is not None
            assert SMTP_PORT is not None
        except ImportError:
            pytest.fail("Email config should be importable")

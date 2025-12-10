import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app as flask_app


@pytest.fixture
def app():
    """Create and configure a test Flask app instance"""
    flask_app.config.update({
        "TESTING": True,
    })
    yield flask_app


@pytest.fixture
def client(app):
    """A test client for the app"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """A test CLI runner for the app"""
    return app.test_cli_runner()


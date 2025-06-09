import pytest
from main import create_app

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app()
    app.config.update({
        "TESTING": True,
    })
    yield app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

def test_api_data_route(client):
    """Test the /api/data route."""
    response = client.get('/api/data')
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data is not None, "Response JSON should not be None"
    assert json_data.get("message") == "Hello from the server!"
    assert "items" in json_data
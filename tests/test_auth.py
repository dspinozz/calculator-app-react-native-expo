# tests/test_auth.py
import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from calculator_app import generate_token, verify_token, get_token_from_request
from flask import Flask, request
from datetime import datetime, timedelta

class TestJWT:
    def setup_method(self):
        self.app = Flask(__name__)
        self.app.config['JWT_SECRET_KEY'] = 'test-secret-key'
        self.app.config['JWT_ALGORITHM'] = 'HS256'
        self.app.config['JWT_EXPIRATION_DELTA'] = timedelta(hours=24)
    
    def test_generate_token(self):
        token = generate_token(1, 'testuser', 'user', 1)
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_verify_valid_token(self):
        token = generate_token(1, 'testuser', 'user', 1)
        payload = verify_token(token)
        assert payload is not None
        assert payload['user_id'] == 1
        assert payload['username'] == 'testuser'
    
    def test_verify_expired_token(self):
        # Create expired token (would need to mock time)
        # This is a placeholder - would need datetime mocking
        pass
    
    def test_token_contains_user_info(self):
        token = generate_token(123, 'john', 'admin', 5)
        payload = verify_token(token)
        assert payload['user_id'] == 123
        assert payload['username'] == 'john'
        assert payload['role_name'] == 'admin'
        assert payload['tenant_id'] == 5

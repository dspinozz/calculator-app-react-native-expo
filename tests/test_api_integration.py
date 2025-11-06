# tests/test_api_integration.py
import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from calculator_app import app
from database import init_db

@pytest.fixture
def client():
    import tempfile
    import os
    
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret-key'
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'
    # Keep CSRF enabled for testing - API endpoints are exempt via @csrf.exempt
    # This ensures we test the real behavior
    
    import database
    original_db = database.DATABASE
    
    # Use a temporary file instead of :memory: (which creates separate DB per connection)
    temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
    temp_db.close()
    database.DATABASE = temp_db.name
    
    # Initialize database with all tables
    init_db()
    
    # Ensure roles and permissions exist
    from database import get_db
    with get_db() as conn:
        cursor = conn.cursor()
        # Insert default roles
        cursor.execute("INSERT OR IGNORE INTO roles (name) VALUES ('user')")
        cursor.execute("INSERT OR IGNORE INTO roles (name) VALUES ('admin')")
        # Insert default permissions
        cursor.execute("INSERT OR IGNORE INTO permissions (name) VALUES ('calculate')")
        cursor.execute("INSERT OR IGNORE INTO permissions (name) VALUES ('view_history')")
        cursor.execute("INSERT OR IGNORE INTO permissions (name) VALUES ('view_audit')")
        cursor.execute("INSERT OR IGNORE INTO permissions (name) VALUES ('manage_users')")
        # Link permissions to roles
        cursor.execute("SELECT id FROM roles WHERE name = 'user'")
        user_role_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM roles WHERE name = 'admin'")
        admin_role_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM permissions WHERE name = 'calculate'")
        calc_perm_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM permissions WHERE name = 'view_history'")
        hist_perm_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM permissions WHERE name = 'view_audit'")
        audit_perm_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM permissions WHERE name = 'manage_users'")
        manage_perm_id = cursor.fetchone()[0]
        # Assign permissions to roles
        cursor.execute("INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)", 
                      (user_role_id, calc_perm_id))
        cursor.execute("INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)", 
                      (user_role_id, hist_perm_id))
        cursor.execute("INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)", 
                      (admin_role_id, audit_perm_id))
        cursor.execute("INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)", 
                      (admin_role_id, manage_perm_id))
        conn.commit()
    
    with app.test_client() as client:
        yield client
    
    # Cleanup
    database.DATABASE = original_db
    if os.path.exists(temp_db.name):
        os.unlink(temp_db.name)

@pytest.fixture
def auth_token(client):
    from database import get_db
    import hashlib
    
    password_hash = hashlib.sha256('testpass'.encode()).hexdigest()
    with get_db() as conn:
        cursor = conn.cursor()
        # Get role and tenant IDs (created in client fixture)
        cursor.execute("SELECT id FROM roles WHERE name = 'user'")
        role_id = cursor.fetchone()[0]
        cursor.execute("INSERT OR IGNORE INTO tenants (name) VALUES ('test-tenant')")
        cursor.execute("SELECT id FROM tenants WHERE name = 'test-tenant'")
        tenant_id = cursor.fetchone()[0]
        cursor.execute("INSERT OR REPLACE INTO users (username, password_hash, role_id, tenant_id) VALUES (?, ?, ?, ?)", 
                      ('testuser', password_hash, role_id, tenant_id))
        conn.commit()
    
    response = client.post('/login', 
                          json={'username': 'testuser', 'password': 'testpass'},
                          content_type='application/json')
    
    if response.status_code == 200:
        data = response.get_json()
        return data.get('token')
    return None

class TestAPIAuthentication:
    def test_login_success(self, client):
        from database import get_db
        import hashlib
        password_hash = hashlib.sha256('testpass'.encode()).hexdigest()
        with get_db() as conn:
            cursor = conn.cursor()
            # Get role and tenant IDs (created in client fixture)
            cursor.execute("SELECT id FROM roles WHERE name = 'user'")
            role_id = cursor.fetchone()[0]
            cursor.execute("INSERT OR IGNORE INTO tenants (name) VALUES ('api-tenant')")
            cursor.execute("SELECT id FROM tenants WHERE name = 'api-tenant'")
            tenant_id = cursor.fetchone()[0]
            cursor.execute("INSERT OR REPLACE INTO users (username, password_hash, role_id, tenant_id) VALUES (?, ?, ?, ?)",
                          ('apiuser', password_hash, role_id, tenant_id))
            conn.commit()
        
        response = client.post('/login', 
                              json={'username': 'apiuser', 'password': 'testpass'},
                              content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == True
        assert 'token' in data
    
    def test_calculate_with_auth(self, client, auth_token):
        if not auth_token:
            pytest.skip("Could not get auth token")
        
        response = client.post('/calculate',
                              json={'expression': '2+2'},
                              headers={'Authorization': f'Bearer {auth_token}'},
                              content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'result' in data
        assert data['result'] == '4'
    
    def test_calculate_without_auth(self, client):
        # Test without authentication token
        response = client.post('/calculate',
                              json={'expression': '2+2'},
                              content_type='application/json')
        
        # Should return 401 (authentication required) before checking expression
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.get_json()}"

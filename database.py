import sqlite3
import hashlib
import datetime
from contextlib import contextmanager

DATABASE = 'calculator.db'

@contextmanager
def get_db():
    """Context manager for database connections"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initialize database with all required tables"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Tenants table (for multitenancy)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tenants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                email TEXT UNIQUE,
                google_id TEXT UNIQUE,
                role_id INTEGER,
                tenant_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                FOREIGN KEY (role_id) REFERENCES roles(id),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )
        ''')
        
        # Add google_id column if it doesn't exist (for existing databases)
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE')
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        # Roles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT
            )
        ''')
        
        # Permissions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT
            )
        ''')
        
        # Role-Permission mapping table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INTEGER,
                permission_id INTEGER,
                PRIMARY KEY (role_id, permission_id),
                FOREIGN KEY (role_id) REFERENCES roles(id),
                FOREIGN KEY (permission_id) REFERENCES permissions(id)
            )
        ''')
        
        # User settings table (for restrictions)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER PRIMARY KEY,
                allow_parentheses INTEGER DEFAULT 1,
                allow_exponents INTEGER DEFAULT 1,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # Audit logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                username TEXT,
                tenant_id INTEGER,
                action TEXT NOT NULL,
                resource TEXT,
                expression TEXT,
                result TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )
        ''')
        
        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
        
        # Initialize default roles and permissions if they don't exist
        init_default_data(cursor)
        
        conn.commit()

def init_default_data(cursor):
    """Initialize default roles and permissions"""
    # Create default tenant
    cursor.execute('''
        INSERT OR IGNORE INTO tenants (id, name) VALUES (1, 'Default Tenant')
    ''')
    
    # Default roles
    roles = [
        ('admin', 'Administrator with full access'),
        ('user', 'Regular user with standard calculator access'),
        ('viewer', 'View-only access to calculator')
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)
    ''', roles)
    
    # Default permissions
    permissions = [
        ('calculate', 'Perform calculations'),
        ('view_history', 'View calculation history'),
        ('manage_users', 'Manage users and roles'),
        ('view_audit', 'View audit logs')
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO permissions (name, description) VALUES (?, ?)
    ''', permissions)
    
    # Assign permissions to roles
    # Admin: all permissions
    cursor.execute('SELECT id FROM roles WHERE name = ?', ('admin',))
    admin_role_id = cursor.fetchone()[0]
    
    cursor.execute('SELECT id FROM permissions')
    all_permission_ids = [row[0] for row in cursor.fetchall()]
    for perm_id in all_permission_ids:
        cursor.execute('''
            INSERT OR IGNORE INTO role_permissions (role_id, permission_id) 
            VALUES (?, ?)
        ''', (admin_role_id, perm_id))
    
    # User: calculate and view_history
    cursor.execute('SELECT id FROM roles WHERE name = ?', ('user',))
    user_role_id = cursor.fetchone()[0]
    
    for perm_name in ['calculate', 'view_history']:
        cursor.execute('SELECT id FROM permissions WHERE name = ?', (perm_name,))
        perm_id = cursor.fetchone()[0]
        cursor.execute('''
            INSERT OR IGNORE INTO role_permissions (role_id, permission_id) 
            VALUES (?, ?)
        ''', (user_role_id, perm_id))
    
    # Viewer: view_history only
    cursor.execute('SELECT id FROM roles WHERE name = ?', ('viewer',))
    viewer_role_id = cursor.fetchone()[0]
    
    cursor.execute('SELECT id FROM permissions WHERE name = ?', ('view_history',))
    perm_id = cursor.fetchone()[0]
    cursor.execute('''
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id) 
        VALUES (?, ?)
    ''', (viewer_role_id, perm_id))
    
    # Create default admin user if none exists
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        # Get default tenant
        cursor.execute('SELECT id FROM tenants WHERE id = 1')
        tenant_id = cursor.fetchone()[0]
        
        # Default admin: admin/admin123
        password_hash = hash_password('admin123')
        cursor.execute('''
            INSERT INTO users (username, password_hash, email, role_id, tenant_id)
            VALUES (?, ?, ?, ?, ?)
        ''', ('admin', password_hash, 'admin@example.com', admin_role_id, tenant_id))
        
        # Create a test user (same tenant)
        cursor.execute('''
            INSERT INTO users (username, password_hash, email, role_id, tenant_id)
            VALUES (?, ?, ?, ?, ?)
        ''', ('user', password_hash, 'user@example.com', user_role_id, tenant_id))

def hash_password(password):
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, password_hash):
    """Verify password against hash"""
    return hash_password(password) == password_hash

def authenticate_user(username, password):
    """Authenticate user and return user data if successful"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT u.id, u.username, u.password_hash, u.role_id, u.tenant_id, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.username = ?
        ''', (username,))
        
        user = cursor.fetchone()
        
        if user and verify_password(password, user['password_hash']):
            # Update last login
            cursor.execute('''
                UPDATE users SET last_login = ? WHERE id = ?
            ''', (datetime.datetime.now(), user['id']))
            
            return {
                'id': user['id'],
                'username': user['username'],
                'role_id': user['role_id'],
                'tenant_id': user['tenant_id'],
                'role_name': user['role_name']
            }
        return None

def authenticate_google_user(google_id, email, name):
    """Authenticate or create user via Google SSO"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if user exists with this google_id
        cursor.execute('''
            SELECT u.id, u.username, u.role_id, u.tenant_id, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.google_id = ?
        ''', (google_id,))
        
        user = cursor.fetchone()
        
        if user:
            # Update last login
            cursor.execute('''
                UPDATE users SET last_login = ? WHERE id = ?
            ''', (datetime.datetime.now(), user['id']))
            
            return {
                'id': user['id'],
                'username': user['username'],
                'role_id': user['role_id'],
                'tenant_id': user['tenant_id'],
                'role_name': user['role_name']
            }
        
            # Check if email already exists (link Google account to existing email)
            if email:
                cursor.execute('''
                    SELECT u.id, u.username, u.role_id, u.tenant_id, r.name as role_name
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    WHERE u.email = ? AND u.google_id IS NULL
                ''', (email,))
                existing_user = cursor.fetchone()
                
                if existing_user:
                    # Link Google account to existing email account
                    cursor.execute('''
                        UPDATE users SET google_id = ? WHERE id = ?
                    ''', (google_id, existing_user['id']))
                    
                    return {
                        'id': existing_user['id'],
                        'username': existing_user['username'],
                        'role_id': existing_user['role_id'],
                        'tenant_id': existing_user['tenant_id'],
                        'role_name': existing_user['role_name']
                    }
        else:
            # Create new user (no tenant assigned yet)
            # Get default user role
            cursor.execute('SELECT id FROM roles WHERE name = ?', ('user',))
            default_role = cursor.fetchone()
            role_id = default_role['id'] if default_role else None
            
            # Create username from email
            username = email.split('@')[0] if email else name.lower().replace(' ', '_')
            # Ensure unique username
            base_username = username
            counter = 1
            while True:
                cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
                if not cursor.fetchone():
                    break
                username = f"{base_username}_{counter}"
                counter += 1
            
            cursor.execute('''
                INSERT INTO users (username, email, google_id, role_id, tenant_id)
                VALUES (?, ?, ?, ?, ?)
            ''', (username, email, google_id, role_id, None))
            
            user_id = cursor.lastrowid
            
            # Create default user settings
            cursor.execute('''
                INSERT INTO user_settings (user_id, allow_parentheses, allow_exponents)
                VALUES (?, 1, 1)
            ''', (user_id,))
            
            return {
                'id': user_id,
                'username': username,
                'role_id': role_id,
                'tenant_id': None,
                'role_name': 'user'
            }

def get_users_without_tenant():
    """Get all users without tenant assignment"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT u.id, u.username, u.email, u.created_at
            FROM users u
            WHERE u.tenant_id IS NULL
            ORDER BY u.created_at DESC
        ''')
        return [dict(row) for row in cursor.fetchall()]

def assign_user_to_tenant(user_id, tenant_id):
    """Assign a user to a tenant - validates both user and tenant exist"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Validate user exists
        cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,))
        if not cursor.fetchone():
            return False
        
        # Validate tenant exists
        cursor.execute('SELECT id FROM tenants WHERE id = ?', (tenant_id,))
        if not cursor.fetchone():
            return False
        
        # Assign tenant
        cursor.execute('''
            UPDATE users SET tenant_id = ? WHERE id = ?
        ''', (tenant_id, user_id))
        return cursor.rowcount > 0


def remove_user_from_tenant(user_id, admin_tenant_id):
    """Remove a user from a tenant (admin can only remove from their own tenant)"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify user is in the admin's tenant
        cursor.execute('SELECT tenant_id FROM users WHERE id = ?', (user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            return False
        
        user_tenant_id = user_row[0]
        if user_tenant_id != admin_tenant_id:
            return False  # User is not in admin's tenant
        
        # Remove tenant assignment (set to NULL)
        cursor.execute('UPDATE users SET tenant_id = NULL WHERE id = ?', (user_id,))
        conn.commit()
        return cursor.rowcount > 0


def create_user_by_email(email, tenant_id, username=None):
    """Create a new user by email and assign to tenant (admin function)"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Validate email format
        if not email or '@' not in email:
            return {'success': False, 'error': 'Invalid email format'}
        
        # Check if email already exists
        cursor.execute('SELECT id, username FROM users WHERE email = ?', (email,))
        existing_user = cursor.fetchone()
        if existing_user:
            return {'success': False, 'error': f'Email already exists (username: {existing_user[1]})'}
        
        # Validate tenant exists
        cursor.execute('SELECT id FROM tenants WHERE id = ?', (tenant_id,))
        if not cursor.fetchone():
            return {'success': False, 'error': 'Tenant does not exist'}
        
        # Generate username from email if not provided
        if not username:
            username = email.split('@')[0]
        
        # Ensure unique username
        base_username = username
        counter = 1
        while True:
            cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
            if not cursor.fetchone():
                break
            username = f"{base_username}_{counter}"
            counter += 1
        
        # Get default user role
        cursor.execute('SELECT id FROM roles WHERE name = ?', ('user',))
        default_role = cursor.fetchone()
        role_id = default_role['id'] if default_role else None
        
        # No password - user must use Google SSO
        # Use empty string instead of None to satisfy NOT NULL constraint
        password_hash = ''
        
        # Create user
        # Use CURRENT_TIMESTAMP for SQLite compatibility
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, role_id, tenant_id, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (username, email, password_hash, role_id, tenant_id))
        
        user_id = cursor.lastrowid
        
        # Create default user settings
        cursor.execute('''
            INSERT INTO user_settings (user_id, allow_parentheses, allow_exponents)
            VALUES (?, 1, 1)
        ''', (user_id,))
        
        conn.commit()
        
        return {
            'success': True,
            'user_id': user_id,
            'username': username,
            'email': email,
            'tenant_id': tenant_id
        }

def get_all_tenants():
    """Get all tenants"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, name, created_at FROM tenants ORDER BY name')
        return [dict(row) for row in cursor.fetchall()]

def create_tenant(name, admin_user_id):
    """Create a new tenant (admin only)"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if tenant name already exists
        cursor.execute('SELECT id FROM tenants WHERE name = ?', (name,))
        if cursor.fetchone():
            return {'success': False, 'error': 'Tenant name already exists'}
        
        # Create tenant
        cursor.execute('''
            INSERT INTO tenants (name, created_at)
            VALUES (?, CURRENT_TIMESTAMP)
        ''', (name,))
        tenant_id = cursor.lastrowid
        
        # Assign admin to the new tenant
        cursor.execute('UPDATE users SET tenant_id = ? WHERE id = ?', (tenant_id, admin_user_id))
        
        conn.commit()
        return {'success': True, 'tenant_id': tenant_id}

def delete_tenant(tenant_id, admin_tenant_id):
    """Delete a tenant (admin can only delete their own tenant)"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify tenant exists and admin owns it
        cursor.execute('SELECT id FROM tenants WHERE id = ?', (tenant_id,))
        if not cursor.fetchone():
            return False  # Tenant doesn't exist
        
        if tenant_id != admin_tenant_id:
            return False  # Admin can only delete their own tenant
        
        # Prevent deleting the default tenant (id=1)
        if tenant_id == 1:
            return False  # Cannot delete default tenant
        
        # Remove all users from this tenant (set tenant_id to NULL)
        cursor.execute('UPDATE users SET tenant_id = NULL WHERE tenant_id = ?', (tenant_id,))
        
        # Delete audit logs for this tenant (optional cleanup)
        cursor.execute('DELETE FROM audit_logs WHERE tenant_id = ?', (tenant_id,))
        
        # Delete the tenant record
        cursor.execute('DELETE FROM tenants WHERE id = ?', (tenant_id,))
        conn.commit()
        
        return cursor.rowcount > 0

def check_duplicate_user(username=None, email=None, google_id=None):
    """Check if a user with given credentials already exists"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        conditions = []
        params = []
        
        if username:
            conditions.append('username = ?')
            params.append(username)
        
        if email:
            conditions.append('email = ?')
            params.append(email)
        
        if google_id:
            conditions.append('google_id = ?')
            params.append(google_id)
        
        if not conditions:
            return None
        
        query = 'SELECT id, username, email, google_id FROM users WHERE ' + ' OR '.join(conditions)
        cursor.execute(query, params)
        return cursor.fetchone()


def get_user_permissions(user_id):
    """Get all permissions for a user based on their role"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT p.name
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN users u ON rp.role_id = u.role_id
            WHERE u.id = ?
        ''', (user_id,))
        
        return [row[0] for row in cursor.fetchall()]

def has_permission(user_id, permission_name):
    """Check if user has a specific permission"""
    permissions = get_user_permissions(user_id)
    return permission_name in permissions

def log_audit(user_id, username, action, resource=None, expression=None, 
              result=None, ip_address=None, user_agent=None, tenant_id=None):
    """Log an audit event"""
    with get_db() as conn:
        cursor = conn.cursor()
        # Get tenant_id from user if not provided
        if tenant_id is None:
            cursor.execute('SELECT tenant_id FROM users WHERE id = ?', (user_id,))
            tenant_row = cursor.fetchone()
            tenant_id = tenant_row[0] if tenant_row else None
        
        cursor.execute('''
            INSERT INTO audit_logs 
            (user_id, username, tenant_id, action, resource, expression, result, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, username, tenant_id, action, resource, expression, result, ip_address, user_agent))

def get_audit_logs(user_id=None, tenant_id=None, limit=100):
    """Get audit logs, optionally filtered by user or tenant (multitenancy)"""
    with get_db() as conn:
        cursor = conn.cursor()
        if tenant_id:
            # Multitenancy: only show logs for users in the same tenant
            if user_id:
                cursor.execute('''
                    SELECT * FROM audit_logs 
                    WHERE tenant_id = ? AND user_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                ''', (tenant_id, user_id, limit))
            else:
                cursor.execute('''
                    SELECT * FROM audit_logs 
                    WHERE tenant_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                ''', (tenant_id, limit))
        elif user_id:
            cursor.execute('''
                SELECT * FROM audit_logs 
                WHERE user_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (user_id, limit))
        else:
            cursor.execute('''
                SELECT * FROM audit_logs 
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (limit,))
        
        return [dict(row) for row in cursor.fetchall()]

def get_user_settings(user_id):
    """Get user settings (restrictions)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT allow_parentheses, allow_exponents
            FROM user_settings
            WHERE user_id = ?
        ''', (user_id,))
        
        row = cursor.fetchone()
        if row:
            return {
                'allow_parentheses': bool(row[0]),
                'allow_exponents': bool(row[1])
            }
        # Return defaults if no settings exist
        return {
            'allow_parentheses': True,
            'allow_exponents': True
        }

def update_user_settings(user_id, allow_parentheses=None, allow_exponents=None):
    """Update user settings (admin only)"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if settings exist
        cursor.execute('SELECT user_id FROM user_settings WHERE user_id = ?', (user_id,))
        exists = cursor.fetchone()
        
        if exists:
            # Update existing
            updates = []
            params = []
            if allow_parentheses is not None:
                updates.append('allow_parentheses = ?')
                params.append(1 if allow_parentheses else 0)
            if allow_exponents is not None:
                updates.append('allow_exponents = ?')
                params.append(1 if allow_exponents else 0)
            
            if updates:
                updates.append('updated_at = CURRENT_TIMESTAMP')
                params.append(user_id)
                cursor.execute(f'''
                    UPDATE user_settings
                    SET {', '.join(updates)}
                    WHERE user_id = ?
                ''', params)
                conn.commit()
                return cursor.rowcount > 0
        else:
            # Insert new
            allow_parens = 1 if allow_parentheses is not False else 0
            allow_exps = 1 if allow_exponents is not False else 0
            cursor.execute('''
                INSERT INTO user_settings (user_id, allow_parentheses, allow_exponents)
                VALUES (?, ?, ?)
            ''', (user_id, allow_parens, allow_exps))
            conn.commit()
            return True
        
        return False  # No updates were made

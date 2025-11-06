from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import re
import os
from functools import wraps
from datetime import datetime, timedelta
import jwt
from authlib.integrations.flask_client import OAuth
from database import (
    init_db, authenticate_user, authenticate_google_user, has_permission, log_audit, 
    get_audit_logs, get_user_permissions, get_user_settings, update_user_settings,
    get_users_without_tenant, assign_user_to_tenant, get_all_tenants, create_user_by_email,
    remove_user_from_tenant
)

class Calculator:
    def __init__(self):
        self.operators = {
            '+': (lambda x, y: x + y, 1),
            '-': (lambda x, y: x - y, 1),
            '*': (lambda x, y: x * y, 2),
            '/': (lambda x, y: x / y, 2),
            '^': (lambda x, y: x ** y, 3),
        }

    def evaluate(self, expression):
        # Basic validation
        if not self.is_valid_expression(expression):
            return "Invalid expression"

        try:
            # Replace ^ with ** for exponentiation
            expression = expression.replace('^', '**')
            
            # Check for invalid characters
            allowed_chars = re.compile(r'^[0-9+\-*/().^\s]+$')
            if not allowed_chars.match(expression):
                return "Invalid characters in expression"
            
            # Evaluate the expression
            result = eval(expression, {"__builtins__": {}}, {})
            
            # Handle division by zero
            if isinstance(result, float) and result == float('inf'):
                return "Division by zero"
            
            return str(result)
        except ZeroDivisionError:
            return "Division by zero"
        except Exception:
            return "Invalid expression"

    def is_valid_expression(self, expression):
        # Check for balanced parentheses
        open_parentheses = 0
        for char in expression:
            if char == '(': open_parentheses += 1
            elif char == ')': open_parentheses -= 1
            if open_parentheses < 0: return False
        
        # Check if parentheses are balanced
        if open_parentheses != 0: return False
        
        # Check for invalid operator sequences (but allow negative numbers)
        # Allow: +, -, *, / after operators or at start
        # Allow: - after opening parenthesis or at start (for negative numbers)
        # Don't allow: ++, --, **, //, +*, -*, etc. (except for negative numbers)
        
        # Normalize spaces
        expression = expression.replace(' ', '')
        
        # Check for consecutive operators (except - for negative numbers)
        # Pattern: operator followed by another operator (except - after opening paren or at start)
        invalid_patterns = [
            r'[+\*/]{2,}',  # Multiple +, *, / not allowed
            r'\+\+', r'\*\*', r'//',  # Specific invalid sequences
            r'[+\-*/]\*[+\-*/]',  # Operator-*-operator (except ** which is exponentiation, already replaced)
            r'[+\-*/]/[+\-*/]',  # Operator-/operator
        ]
        
        for pattern in invalid_patterns:
            if re.search(pattern, expression):
                return False
        
        # Allow negative numbers: - at start, - after (, - after operators
        # But ensure it's not just a minus sign alone
        if expression.strip() == '-':
            return False
        
        return True

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY')
if not app.secret_key:
    raise ValueError('SECRET_KEY environment variable is required')

# Session configuration for security
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', app.secret_key or '')
if not JWT_SECRET_KEY:
    raise ValueError('JWT_SECRET_KEY or SECRET_KEY environment variable is required')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DELTA = timedelta(hours=24)  # Tokens expire in 24 hours

def generate_token(user_id, username, role_name, tenant_id):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'username': username,
        'role_name': role_name,
        'tenant_id': tenant_id,
        'exp': datetime.utcnow() + JWT_EXPIRATION_DELTA,
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_token(token):
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def get_token_from_request():
    """Extract token from Authorization header"""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None


# Google OAuth configuration (optional)
google = None
try:
    oauth = OAuth(app)
    google_client_id = os.environ.get('GOOGLE_CLIENT_ID', '')
    google_client_secret = os.environ.get('GOOGLE_CLIENT_SECRET', '')
    if google_client_id and google_client_secret:
        google = oauth.register(
            name='google',
            client_id=google_client_id,
            client_secret=google_client_secret,
            server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
            client_kwargs={
                'scope': 'openid email profile'
            }
        )
except Exception as e:
    print(f'Warning: Google OAuth not configured: {e}')

# CORS configuration - use environment variable or default to development
# Set CORS_ORIGINS in .env for production (comma-separated list)
# Example: CORS_ORIGINS=http://localhost:2000,https://yourdomain.com
cors_origins = os.environ.get('CORS_ORIGINS', '').split(',') if os.environ.get('CORS_ORIGINS') else ['*']
# Filter out empty strings
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

CORS(app, resources={
    r"/*": {
        "origins": cors_origins if cors_origins else ["*"],  # Default to * for development
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# CSRF Protection (for web forms)
# Note: CSRF works perfectly with Gunicorn and Docker
# Sessions use SECRET_KEY which is consistent across workers

# Rate limiting - Add Flask-Limiter for production:
# from flask_limiter import Limiter
# from flask_limiter.util import get_remote_address
# limiter = Limiter(app=app, key_func=get_remote_address)
# Then add @limiter.limit("10 per minute") to sensitive endpoints


csrf = CSRFProtect(app)

# Security Headers
@app.after_request
def set_security_headers(response):
    """Add security headers to all responses"""
    # HSTS - Force HTTPS (only in production with HTTPS)
    if os.environ.get('HTTPS_ENABLED', 'false').lower() == 'true':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    # CSP - Content Security Policy
    csp_policy = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://accounts.google.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com; "
        "frame-src 'self' https://accounts.google.com; "
        "frame-ancestors 'self';"
    )
    response.headers['Content-Security-Policy'] = csp_policy
    
    # X-Frame-Options - Prevent clickjacking
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    
    # X-Content-Type-Options - Prevent MIME sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # X-XSS-Protection (legacy, but still useful)
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Referrer Policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    return response


calculator = Calculator()

# Initialize database on startup
init_db()

def login_required(f):
    """Decorator to require login - supports both session and JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Try token-based auth first (for mobile)
        token = get_token_from_request()
        if token:
            payload = verify_token(token)
            if payload:
                # Set session from token for compatibility
                session['user_id'] = payload['user_id']
                session['username'] = payload['username']
                session['role_name'] = payload.get('role_name')
                session['tenant_id'] = payload.get('tenant_id')
                return f(*args, **kwargs)
            else:
                return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Fall back to session-based auth (for web)
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def permission_required(permission):
    """Decorator to require specific permission"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'error': 'Authentication required'}), 401
            if not has_permission(session['user_id'], permission):
                return jsonify({'error': 'Permission denied'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def get_client_info():
    """Get client IP and user agent"""
    ip_address = request.remote_addr
    if request.headers.get('X-Forwarded-For'):
        ip_address = request.headers.get('X-Forwarded-For').split(',')[0]
    user_agent = request.headers.get('User-Agent', 'Unknown')
    return ip_address, user_agent

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Check if user has tenant assignment
    if not session.get('tenant_id'):
        return render_template('no_tenant.html', 
                             username=session.get('username'))
    
    # Get user settings for restrictions
    settings = get_user_settings(session['user_id'])
    return render_template('calculator.html', 
                         username=session.get('username'),
                         allow_parentheses=settings['allow_parentheses'],
                         allow_exponents=settings['allow_exponents'],
                         is_admin=session.get('role_name') == 'admin')

@app.route('/login', methods=['GET', 'POST'])
@csrf.exempt  # Exempt from CSRF for API JSON requests
              # Note: If web forms are added later, create separate /api/login endpoint
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username', '')
        password = data.get('password', '')
        
        user = authenticate_user(username, password)
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role_name'] = user['role_name']
            session['tenant_id'] = user.get('tenant_id')
            
            ip_address, user_agent = get_client_info()
            log_audit(
                user_id=user['id'],
                username=user['username'],
                action='login',
                resource='authentication',
                ip_address=ip_address,
                user_agent=user_agent,
                tenant_id=user.get('tenant_id')
            )
            
            # Check if user has tenant assignment
            if not user.get('tenant_id'):
                return jsonify({
                    'success': False,
                    'message': 'No tenant assigned. Please contact an administrator.',
                    'no_tenant': True
                }), 403
            
            # Generate JWT token
            token = generate_token(
                user['id'],
                user['username'],
                user['role_name'],
                user.get('tenant_id')
            )
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'username': user['username'],
                'role': user['role_name'],
                'token': token,  # Include token for mobile clients
                'user_id': user['id'],
                'tenant_id': user.get('tenant_id')
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401
    
    # Check if Google OAuth is configured
    google_oauth_available = google is not None
    return render_template('login.html', google_oauth_available=google_oauth_available)


@app.route('/login/google')
def login_google():
    """Initiate Google OAuth login"""
    if not google:
        return jsonify({'error': 'Google OAuth not configured'}), 503
    
    # Use explicit redirect URI - MUST match Google Cloud Console exactly
    # Hardcode to ensure it matches what's configured
    redirect_uri = 'http://100.83.165.66:2000/auth/google'
    
    # Also try to get from request for flexibility
    try:
        if request.url_root:
            redirect_uri = request.url_root.rstrip('/') + '/auth/google'
    except:
        pass  # Use hardcoded value
    
    return google.authorize_redirect(redirect_uri)

@app.route('/auth/google')
def auth_google():
    """Handle Google OAuth callback"""
    try:
        # Check for OAuth errors from Google
        error = request.args.get('error')
        if error:
            import logging
            logging.error(f'Google OAuth error: {error}')
            error_description = request.args.get('error_description', error)
            return redirect(url_for('login') + f'?error=google_auth_failed&details={error_description}')
        
        token = google.authorize_access_token()
        if not token:
            return redirect(url_for('login') + '?error=google_auth_failed&details=no_token')
            
        user_info = token.get('userinfo')
        
        if not user_info:
            return redirect(url_for('login') + '?error=google_auth_failed&details=no_userinfo')
        
        google_id = user_info.get('sub')
        email = user_info.get('email')
        name = user_info.get('name', email.split('@')[0] if email else 'User')
        
        # Authenticate or create user
        user = authenticate_google_user(google_id, email, name)
        
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role_name'] = user['role_name']
            session['tenant_id'] = user.get('tenant_id')
            
            ip_address, user_agent = get_client_info()
            log_audit(
                user_id=user['id'],
                username=user['username'],
                action='login',
                resource='authentication',
                ip_address=ip_address,
                user_agent=user_agent,
                tenant_id=user.get('tenant_id')
            )
            
            # Check if user has tenant assignment
            if not user.get('tenant_id'):
                return redirect(url_for('no_tenant'))
            
            
            # Check if this is an API request (mobile client)
            if request.headers.get('Accept') == 'application/json' or request.args.get('format') == 'json':
                token = generate_token(
                    user['id'],
                    user['username'],
                    user['role_name'],
                    user.get('tenant_id')
                )
                return jsonify({
                    'success': True,
                    'token': token,
                    'username': user['username'],
                    'role': user['role_name'],
                    'tenant_id': user.get('tenant_id')
                })
            
            return redirect(url_for('index'))
        else:
            return redirect(url_for('login') + '?error=auth_failed')
    except Exception as e:
        import logging
        logging.error(f'Google OAuth error: {e}')
        return redirect(url_for('login') + '?error=google_auth_failed')

@app.route('/no-tenant')
def no_tenant():
    """Landing page for users without tenant assignment"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if session.get('tenant_id'):
        return redirect(url_for('index'))
    
    return render_template('no_tenant.html', username=session.get('username'))

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    user_id = session.get('user_id')
    username = session.get('username')
    
    ip_address, user_agent = get_client_info()
    log_audit(
        user_id=user_id,
        username=username,
        action='logout',
        resource='authentication',
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/calculate', methods=['POST'])
@csrf.exempt  # Exempt from CSRF when used as API (JWT token in header)
              # Note: Web forms would use a different endpoint if needed
@login_required
@permission_required('calculate')
def calculate():
    data = request.get_json()
    expression = data.get('expression', '')
    
    if not expression:
        return jsonify({'result': 'Empty expression', 'error': 'Empty expression'}), 400
    
    # Check user restrictions
    settings = get_user_settings(session['user_id'])
    
    # Check for parentheses restriction
    if not settings['allow_parentheses'] and ('(' in expression or ')' in expression):
        log_audit(
            user_id=session['user_id'],
            username=session['username'],
            action='calculate_denied',
            resource='calculator',
            expression=expression,
            result='Denied: Parentheses not allowed',
            ip_address=get_client_info()[0],
            user_agent=get_client_info()[1]
        )
        return jsonify({'result': 'Error', 'error': 'Parentheses are not allowed for your account'}), 403
    
    # Check for exponents restriction
    if not settings['allow_exponents'] and '^' in expression:
        log_audit(
            user_id=session['user_id'],
            username=session['username'],
            action='calculate_denied',
            resource='calculator',
            expression=expression,
            result='Denied: Exponents not allowed',
            ip_address=get_client_info()[0],
            user_agent=get_client_info()[1]
        )
        return jsonify({'result': 'Error', 'error': 'Exponents are not allowed for your account'}), 403
    
    result = calculator.evaluate(expression)
    
    # Log the calculation
    ip_address, user_agent = get_client_info()
    log_audit(
        user_id=session['user_id'],
        username=session['username'],
        action='calculate',
        resource='calculator',
        expression=expression,
        result=result,
        ip_address=ip_address,
        user_agent=user_agent,
        tenant_id=session.get('tenant_id')
    )
    
    return jsonify({'result': result})

@app.route('/history', methods=['GET'])
@csrf.exempt  # Exempt from CSRF - API endpoint (JWT token in header)
@login_required
@permission_required('view_history')
def history():
    """Get calculation history for the current user"""
    user_id = session['user_id']
    logs = get_audit_logs(user_id=user_id, limit=50)
    
    # Filter to only calculation actions
    calculations = [
        {
            'expression': log['expression'],
            'result': log['result'],
            'timestamp': log['timestamp']
        }
        for log in logs if log['action'] == 'calculate'
    ]
    
    return jsonify({'calculations': calculations})

@app.route('/audit', methods=['GET'])
@login_required
@permission_required('view_audit')
def audit():
    """Get audit logs (admin only) - multitenancy: only shows logs for users in admin's tenancy"""
    limit = request.args.get('limit', 100, type=int)
    user_id_filter = request.args.get('user_id', type=int)
    tenant_id = session.get('tenant_id')
    
    # Multitenancy: Admin can only see logs for users in their tenant
    if user_id_filter:
        # Filter by specific user (must be in same tenant)
        logs = get_audit_logs(user_id=user_id_filter, tenant_id=tenant_id, limit=limit)
    else:
        # Get all logs for admin's tenant only
        logs = get_audit_logs(tenant_id=tenant_id, limit=limit)
    
    return jsonify({'logs': logs})

@app.route('/audit/users', methods=['GET'])
@login_required
@permission_required('view_audit')
def audit_users():
    """Get list of users for audit log filtering (admin only) - multitenancy: only users in admin's tenant"""
    from database import get_db
    tenant_id = session.get('tenant_id')
    with get_db() as conn:
        cursor = conn.cursor()
        # Multitenancy: Only show users in the same tenant
        cursor.execute('''
            SELECT DISTINCT u.id, u.username, COUNT(al.id) as log_count
            FROM users u
            LEFT JOIN audit_logs al ON u.id = al.user_id AND al.tenant_id = ?
            WHERE u.tenant_id = ?
            GROUP BY u.id, u.username
            ORDER BY u.username
        ''', (tenant_id, tenant_id))
        users = [dict(row) for row in cursor.fetchall()]
        return jsonify({'users': users})

@app.route('/user/info', methods=['GET'])
@login_required
def user_info():
    """Get current user information"""
    permissions = get_user_permissions(session['user_id'])
    return jsonify({
        'username': session.get('username'),
        'role': session.get('role_name'),
        'permissions': permissions
    })

@app.route('/check-auth', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    if 'user_id' in session:
        settings = get_user_settings(session['user_id'])
        return jsonify({
            'authenticated': True,
            'username': session.get('username'),
            'role': session.get('role_name'),
            'settings': settings
        })
    return jsonify({'authenticated': False}), 401

@app.route('/admin/user-settings', methods=['GET'])
@login_required
@permission_required('manage_users')
def get_all_user_settings():
    """Get all user settings (admin only)"""
    from database import get_db
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT u.id, u.username, 
                   COALESCE(us.allow_parentheses, 1) as allow_parentheses,
                   COALESCE(us.allow_exponents, 1) as allow_exponents
            FROM users u
            LEFT JOIN user_settings us ON u.id = us.user_id
            ORDER BY u.username
        ''')
        users = [dict(row) for row in cursor.fetchall()]
        return jsonify({'users': users})

@app.route('/admin/user-settings/<int:target_user_id>', methods=['PUT'])
@csrf.exempt  # API endpoint
@login_required
@permission_required('manage_users')
def update_target_user_settings(target_user_id):
    """Update user settings for a specific user (admin only)"""
    data = request.get_json()
    allow_parentheses = data.get('allow_parentheses')
    allow_exponents = data.get('allow_exponents')
    
    # Validate that at least one setting is provided
    if allow_parentheses is None and allow_exponents is None:
        return jsonify({'error': 'At least one setting must be provided'}), 400
    
    try:
        result = update_user_settings(target_user_id, allow_parentheses, allow_exponents)
        if not result:
            return jsonify({'error': 'Failed to update settings - user may not exist'}), 404
    except Exception as e:
        return jsonify({'error': f'Failed to update settings: {str(e)}'}), 500
    
    # Log the change
    ip_address, user_agent = get_client_info()
    log_audit(
        user_id=session['user_id'],
        username=session['username'],
        action='update_user_settings',
        resource='admin',
        expression=f'Updated settings for user_id {target_user_id}',
        result=f'Parentheses: {allow_parentheses}, Exponents: {allow_exponents}',
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return jsonify({'success': True, 'message': 'Settings updated'})


@app.route('/admin/assign-tenant', methods=['GET', 'POST'])
@login_required
@permission_required('view_audit')
def assign_tenant():
    """Assign users to tenants (admin only)"""
    if request.method == 'POST':
        data = request.get_json()
        user_id = data.get('user_id')
        tenant_id = data.get('tenant_id')
        
        # Validate input
        if not user_id or not tenant_id:
            return jsonify({'error': 'user_id and tenant_id are required'}), 400
        
        try:
            user_id = int(user_id)
            tenant_id = int(tenant_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid user_id or tenant_id'}), 400
        
        admin_tenant_id = session.get('tenant_id')
        
        # Admin can only assign to their own tenant
        if not admin_tenant_id:
            return jsonify({'error': 'You must be assigned to a tenant'}), 403
        
        if tenant_id != admin_tenant_id:
            return jsonify({'error': 'Can only assign users to your tenant'}), 403
        
        try:
            result = assign_user_to_tenant(user_id, tenant_id)
            if result:
                ip_address, user_agent = get_client_info()
                try:
                    log_audit(
                        user_id=session['user_id'],
                        username=session['username'],
                        action='assign_tenant',
                        resource='admin',
                        expression=f'Assigned user_id {user_id} to tenant_id {tenant_id}',
                        ip_address=ip_address,
                        user_agent=user_agent,
                        tenant_id=admin_tenant_id
                    )
                except Exception as e:
                    import logging
                    logging.error(f'Error logging audit: {e}')
                    # Continue even if audit logging fails
                return jsonify({'success': True, 'message': 'User assigned successfully'})
            else:
                return jsonify({'error': 'Failed to assign tenant - user or tenant may not exist'}), 400
        except Exception as e:
            import logging
            logging.error(f'Error assigning tenant: {e}')
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Failed to assign tenant: {str(e)}'}), 500
    
    # GET: Return list of users without tenants and available tenants
    try:
        users_without_tenant = get_users_without_tenant()
        tenants = get_all_tenants()
        
        return jsonify({
            'users_without_tenant': users_without_tenant,
            'tenants': tenants
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/create-user', methods=['POST'])
@csrf.exempt  # API endpoint
@login_required
@permission_required('view_audit')
def create_user():
    """Create a new user by email and assign to admin's tenant (admin only)"""
    data = request.get_json()
    email = data.get('email', '').strip() if data.get('email') else ''
    username = data.get('username', '').strip() if data.get('username') else None
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    admin_tenant_id = session.get('tenant_id')
    if not admin_tenant_id:
        return jsonify({'error': 'You must be assigned to a tenant'}), 403
    
    try:
        result = create_user_by_email(email, admin_tenant_id, username)
    except Exception as e:
        import logging
        logging.error(f'Error creating user: {e}')
        import traceback
        traceback.print_exc()
        # Return user-friendly error message
        error_msg = str(e)
        # Don't expose internal errors, return generic message
        return jsonify({'error': 'Failed to create user. Please try again or contact administrator.'}), 500
    
    if result.get('success'):
        try:
            ip_address, user_agent = get_client_info()
            log_audit(
                user_id=session['user_id'],
                username=session['username'],
                action='create_user',
                resource='admin',
                expression=f'Created user {result.get("username", "unknown")} ({email})',
                result=f'Assigned to tenant_id {admin_tenant_id}',
                ip_address=ip_address,
                user_agent=user_agent,
                tenant_id=admin_tenant_id
            )
        except Exception as e:
            import logging
            logging.error(f'Error logging audit for user creation: {e}')
            # Continue even if audit logging fails
        
        return jsonify({
            'success': True,
            'message': f'User {result.get("username", "unknown")} created and assigned to your tenant',
            'user': {
                'id': result.get('user_id'),
                'username': result.get('username'),
                'email': result.get('email')
            }
        })
    
    return jsonify({'error': result.get('error', 'Failed to create user')}), 400

@app.route('/admin/remove-tenant', methods=['POST'])
@csrf.exempt  # API endpoint
@login_required
@permission_required('manage_users')
def remove_tenant():
    """Remove a user from tenant (admin only)"""
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid user_id'}), 400
    
    admin_tenant_id = session.get('tenant_id')
    if not admin_tenant_id:
        return jsonify({'error': 'You must be assigned to a tenant'}), 403
    
    try:
        result = remove_user_from_tenant(user_id, admin_tenant_id)
        if result:
            ip_address, user_agent = get_client_info()
            try:
                log_audit(
                    user_id=session['user_id'],
                    username=session['username'],
                    action='remove_tenant',
                    resource='admin',
                    expression=f'Removed user_id {user_id} from tenant_id {admin_tenant_id}',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    tenant_id=admin_tenant_id
                )
            except Exception as e:
                import logging
                logging.error(f'Error logging audit: {e}')
            return jsonify({'success': True, 'message': 'User removed from tenant successfully'})
        else:
            return jsonify({'error': 'Failed to remove user - user may not be in your tenant'}), 400
    except Exception as e:
        import logging
        logging.error(f'Error removing user from tenant: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to remove user: {str(e)}'}), 500

@app.route('/api/auth/refresh', methods=['POST'])
@csrf.exempt  # Exempt from CSRF - uses JWT token in Authorization header (not vulnerable to CSRF)
def refresh_token():
    """Refresh JWT token"""
    token = get_token_from_request()
    if not token:
        return jsonify({'error': 'Token required'}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid token'}), 401
    
    # Generate new token
    new_token = generate_token(
        payload['user_id'],
        payload['username'],
        payload.get('role_name', 'user'),
        payload.get('tenant_id')
    )
    
    return jsonify({
        'success': True,
        'token': new_token
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=2000, debug=False)
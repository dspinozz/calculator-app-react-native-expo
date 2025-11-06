# Calculator Application - Authentication, RBAC, and Audit Logging

## Overview
The calculator application now includes comprehensive authentication, role-based access control (RBAC), and audit logging using SQLite database.

## Features

### 1. Authentication
- User login/logout functionality
- Session management
- Password hashing (SHA-256)
- Default accounts created on first run

### 2. Role-Based Access Control (RBAC)
- **Roles:**
  - `admin`: Full access to all features
  - `user`: Standard calculator access
  - `viewer`: View-only access (can view history)
  
- **Permissions:**
  - `calculate`: Perform calculations
  - `view_history`: View calculation history
  - `manage_users`: Manage users and roles (admin only)
  - `view_audit`: View audit logs (admin only)

### 3. Audit Logging
All actions are logged to the database:
- User login/logout
- Calculator operations (expression, result)
- IP address and user agent tracking
- Timestamp for all events

## Database Schema

### Tables
- `users`: User accounts with passwords and roles
- `roles`: Role definitions
- `permissions`: Permission definitions
- `role_permissions`: Mapping between roles and permissions
- `audit_logs`: Audit trail of all actions

## Default Accounts

Created automatically on first run:
- **Admin**: `admin` / `admin123`
- **User**: `user` / `admin123`

⚠️ **Change default passwords in production!**

## API Endpoints

- `GET /` - Calculator interface (requires login)
- `GET /login` - Login page
- `POST /login` - Authenticate user
- `POST /logout` - Logout user
- `POST /calculate` - Perform calculation (requires `calculate` permission)
- `GET /history` - View calculation history (requires `view_history` permission)
- `GET /audit` - View audit logs (requires `view_audit` permission, admin only)
- `GET /user/info` - Get current user info
- `GET /check-auth` - Check authentication status

## Security Features

1. **Password Hashing**: SHA-256 hashing for password storage
2. **Session Management**: Flask sessions with secure secret key
3. **Permission Checking**: Decorator-based permission enforcement
4. **Audit Trail**: Complete logging of all user actions
5. **Input Validation**: Expression validation before evaluation

## Usage

1. Navigate to `http://100.83.165.66:2000`
2. You'll be redirected to the login page
3. Login with default credentials
4. Use the calculator (all operations are logged)
5. Logout when done

## Database File

The SQLite database is stored as `calculator.db` in the application directory.

To view audit logs:
```bash
sqlite3 calculator.db "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;"
```

## Production Considerations

1. Change the Flask secret key in `calculator_app.py`
2. Change default user passwords
3. Use HTTPS in production
4. Consider using stronger password hashing (bcrypt)
5. Implement password complexity requirements
6. Add rate limiting for login attempts
7. Regular database backups

# New Features Implementation Summary

## Features Added

### 1. Google SSO Authentication
- Added Google OAuth 2.0 integration using Authlib
- Users can sign in with their Google account
- New users are automatically created when they sign in with Google
- Google ID is stored in the database for future authentication

### 2. Tenant Assignment from Admin Panel
- Added "Assign Users to Tenant" button in admin panel
- Admins can view all users without tenant assignment
- Admins can assign users to their own tenant with one click
- All tenant assignments are logged in audit logs

### 3. Landing Page for Unassigned Users
- Created `/no-tenant` route and `no_tenant.html` template
- Users without tenant assignment see a friendly landing page
- Page explains they need admin approval
- Users cannot access calculator until assigned to a tenant

## Database Changes

### Updated Users Table
- Added `google_id TEXT UNIQUE` column for Google SSO
- Made `password_hash` optional (can be NULL for Google-only users)
- Existing databases automatically get the new column via ALTER TABLE

### New Database Functions
- `authenticate_google_user()` - Authenticate or create Google users
- `get_users_without_tenant()` - Get users needing tenant assignment
- `assign_user_to_tenant()` - Assign user to tenant
- `get_all_tenants()` - List all tenants

## API Endpoints Added

### `/login/google`
- Initiates Google OAuth flow
- Redirects to Google for authentication

### `/auth/google`
- Handles Google OAuth callback
- Creates user if doesn't exist
- Redirects based on tenant assignment status

### `/no-tenant`
- Landing page for users without tenant

### `/admin/assign-tenant` (GET)
- Returns list of users without tenants
- Returns list of all tenants

### `/admin/assign-tenant` (POST)
- Assigns a user to a tenant
- Requires admin permission
- Admins can only assign to their own tenant

## Setup Instructions

### 1. Install Dependencies
```bash
cd /root/calculator
pip install -r requirements.txt
```

### 2. Configure Google OAuth (Optional)
Set these environment variables:
```bash
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

To get Google OAuth credentials:
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URI to: `http://your-domain/auth/google`
6. Copy Client ID and Client Secret

### 3. Update Database Schema
The schema will auto-update on next run. The `google_id` column will be added automatically.

### 4. Restart the Application
```bash
# Restart Flask app to load new code
```

## Usage

### For Admins
1. Log in to the calculator
2. Click "Assign Users to Tenant" in admin panel
3. See list of users without tenant assignment
4. Click "Assign to My Tenant" for each user

### For New Users (Google SSO)
1. Click "Sign in with Google" on login page
2. Authenticate with Google
3. If not assigned to tenant, see landing page
4. Contact admin for access

### For Regular Users
- If assigned to tenant: Normal calculator access
- If not assigned: See landing page with instructions

## Security Notes

- Users without tenant assignment cannot access calculator
- Admins can only assign users to their own tenant
- All tenant assignments are logged in audit logs
- Google OAuth is optional - app works without it

## Files Modified

1. `database.py` - Added Google SSO functions and tenant management
2. `calculator_app.py` - Added OAuth routes and tenant assignment endpoints
3. `templates/login.html` - Added Google SSO button
4. `templates/calculator.html` - Added tenant assignment to admin panel
5. `templates/no_tenant.html` - New landing page template
6. `requirements.txt` - Added authlib and requests

## Testing

1. Test Google SSO login (if configured)
2. Test creating new user via Google SSO
3. Test landing page for unassigned users
4. Test tenant assignment from admin panel
5. Test that assigned users can access calculator

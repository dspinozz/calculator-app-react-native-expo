# API Documentation

## Authentication

All endpoints (except `/login`) require authentication via:
- **Web**: Session cookie
- **Mobile**: `Authorization: Bearer <token>` header

## Endpoints

### POST /login
Login and receive authentication token.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "username": "string",
  "role": "string",
  "token": "jwt-token-string",
  "user_id": 1,
  "tenant_id": 1
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

### POST /calculate
Calculate a mathematical expression.

**Request:**
```json
{
  "expression": "2+2*3"
}
```

**Response (Success):**
```json
{
  "result": "8"
}
```

**Response (Error):**
```json
{
  "error": "Invalid expression"
}
```

### POST /api/auth/refresh
Refresh an expired JWT token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "token": "new-jwt-token"
}
```

### GET /admin/assign-tenant
Get list of users without tenant assignment (Admin only).

**Response:**
```json
{
  "users_without_tenant": [
    {
      "id": 1,
      "username": "string",
      "email": "string",
      "created_at": "timestamp"
    }
  ],
  "tenants": [
    {
      "id": 1,
      "name": "string"
    }
  ]
}
```

### POST /admin/assign-tenant
Assign a user to a tenant (Admin only).

**Request:**
```json
{
  "user_id": 1,
  "tenant_id": 1
}
```

**Response:**
```json
{
  "success": true
}
```

## Error Responses

All endpoints may return:

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Permission denied"
}
```

**400 Bad Request:**
```json
{
  "error": "Invalid request"
}
```

## Rate Limiting

Currently not implemented. Recommended:
- Login: 5 requests per minute
- Calculate: 60 requests per minute
- Admin endpoints: 10 requests per minute

# Calculator Application - Full Stack Portfolio Project

A full-stack calculator application with web and mobile support, featuring authentication, multi-tenancy, and audit logging.

## 🚀 Features

- **Web Application**: React-like calculator with Flask backend
- **Mobile Application**: React Native Expo app (iOS/Android/Web)
- **Authentication**: JWT tokens for mobile, sessions for web
- **Multi-Tenancy**: Tenant-based user isolation
- **Admin Panel**: User management and audit logs
- **Google SSO**: Optional Google OAuth integration
- **Security**: Rate limiting ready, CORS configured, secure token storage

## 📁 Project Structure

```
calculator/
├── calculator_app.py      # Flask backend application
├── database.py            # Database models and operations
├── templates/             # Web UI templates
│   ├── calculator.html
│   ├── login.html
│   └── no_tenant.html
├── mobile-app/            # React Native Expo app
│   ├── src/
│   │   ├── screens/      # App screens
│   │   ├── services/     # API service
│   │   └── utils/        # Utilities
│   └── App.js
├── tests/                 # Test suite
└── requirements.txt       # Python dependencies
```

## 🛠️ Tech Stack

### Backend
- **Flask**: Web framework
- **SQLite**: Database
- **JWT**: Token-based authentication
- **Authlib**: Google OAuth integration
- **Flask-CORS**: Cross-origin resource sharing

### Mobile
- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform
- **React Navigation**: Navigation library
- **AsyncStorage**: Secure token storage

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- Expo CLI (for mobile development)

## 🔧 Installation

### Backend Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd calculator
```

2. Create virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
export SECRET_KEY="your-secret-key"
export JWT_SECRET_KEY="your-jwt-secret"
```

5. Initialize database:
```bash
python calculator_app.py  # Database auto-initializes on first run
```

6. Run the server:
```bash
python calculator_app.py
# Server runs on http://localhost:2000
```

### Mobile App Setup

1. Navigate to mobile app directory:
```bash
cd mobile-app
```

2. Install dependencies:
```bash
npm install
```

3. Configure API URL:
   - Edit `src/services/api.js`
   - Set `API_BASE_URL` to your backend URL
   - For mobile device testing, use your computer's IP address

4. Start Expo:
```bash
npm start
```

5. Run on device:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web
   - Scan QR code with Expo Go app

## 🧪 Testing

Run the test suite:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=. --cov-report=html
```

## 📡 API Endpoints

### Authentication
- `POST /login` - Login (returns JWT token for mobile)
- `POST /logout` - Logout
- `GET /check-auth` - Verify authentication
- `POST /api/auth/refresh` - Refresh JWT token

### Calculator
- `POST /calculate` - Calculate expression (requires auth)

### Admin
- `GET /admin/user-settings` - Get user settings
- `PUT /admin/user-settings/<user_id>` - Update user settings
- `GET /admin/assign-tenant` - Get users without tenant
- `POST /admin/assign-tenant` - Assign user to tenant
- `GET /audit` - Get audit logs

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth for mobile
- **Session Management**: Secure sessions for web
- **Password Hashing**: Secure password storage
- **CORS Configuration**: Configurable cross-origin access
- **Rate Limiting**: Ready for Flask-Limiter integration
- **Input Validation**: Expression validation and sanitization
- **Audit Logging**: All actions logged for security

## 📱 Mobile App Features

- Cross-platform support (iOS/Android/Web)
- Token-based authentication
- Secure token storage
- Offline-ready architecture
- Beautiful UI matching web version

## 🏗️ Architecture

### Backend
- RESTful API design
- Database abstraction layer
- Authentication middleware
- Permission-based access control
- Multi-tenant architecture

### Mobile
- Component-based architecture
- Context API for state management
- Service layer for API calls
- Secure token storage

## 🚀 Deployment

### Backend
1. Set production environment variables
2. Configure CORS allowed origins
3. Use production WSGI server (gunicorn)
4. Set up HTTPS
5. Configure rate limiting

### Mobile
1. Build production bundle:
```bash
expo build:ios
expo build:android
```

2. Configure production API URL
3. Submit to app stores

## 📝 Environment Variables

See `.env.example` for all required environment variables.

## 🤝 Contributing

This is a portfolio project. Feel free to fork and enhance!

## 📄 License

MIT License - feel free to use this as a portfolio example.

## 👤 Author

Your Name - Portfolio Project

## 🙏 Acknowledgments

- Flask community
- React Native community
- Expo team

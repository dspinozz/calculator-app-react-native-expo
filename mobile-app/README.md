# Calculator Mobile App - React Native Expo

A cross-platform calculator application built with React Native and Expo that works on iOS, Android, and Web.

## Features

- ✅ **Cross-Platform**: Works on iOS, Android, and Web
- ✅ **Token-Based Authentication**: JWT tokens for secure authentication
- ✅ **Offline-Ready**: AsyncStorage for token persistence
- ✅ **Modern UI**: Beautiful gradient design matching web version
- ✅ **Full Calculator**: Supports all operations including parentheses and exponents

## Architecture

### Authentication
- **Token-Based**: Uses JWT tokens stored in AsyncStorage
- **Auto-Refresh**: Tokens are validated on each request
- **Secure Storage**: Tokens stored securely on device

### Backend Integration
- **REST API**: Communicates with Flask backend
- **Bearer Tokens**: Authorization header with Bearer token
- **Error Handling**: Graceful error handling and user feedback

## Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (for iOS) or Android Studio (for Android)

### Installation

1. Install dependencies:
```bash
cd mobile-app
npm install
```

2. Configure API URL:
   - Edit `src/services/api.js`
   - Update `API_BASE_URL` to your Flask backend URL
   - Development: `http://localhost:2000` (use your computer's IP for mobile devices)
   - Production: `https://your-production-url.com`

3. Start the development server:
```bash
npm start
```

4. Run on device:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web
   - Scan QR code with Expo Go app on your phone

## Project Structure

```
mobile-app/
├── App.js                 # Main app entry point
├── src/
│   ├── screens/          # Screen components
│   │   ├── LoginScreen.js
│   │   ├── CalculatorScreen.js
│   │   └── NoTenantScreen.js
│   ├── services/         # API services
│   │   └── api.js       # API client with token management
│   ├── utils/           # Utilities
│   │   └── AuthContext.js  # Authentication context
│   └── components/      # Reusable components
└── package.json
```

## Authentication Flow

1. **Login**: User enters credentials → API returns JWT token
2. **Token Storage**: Token saved to AsyncStorage
3. **API Requests**: Token included in Authorization header
4. **Auto-Refresh**: Token validated on each request
5. **Logout**: Token removed from storage

## API Endpoints Used

- `POST /login` - User login, returns JWT token
- `POST /calculate` - Calculate expression
- `GET /check-auth` - Verify token validity
- `POST /logout` - Logout (optional, token removed client-side)

## Token-Based Authentication

### Why Tokens?
- ✅ Sessions/cookies don't work on mobile
- ✅ Tokens work consistently across platforms
- ✅ Can be stored securely on device
- ✅ Stateless - no server-side session needed

### Implementation
- Token sent in header: `Authorization: Bearer <token>`
- Token stored in AsyncStorage (secure)
- Token expires after 24 hours
- Backend validates token on each request

## Database Verification

### Deduplication
- ✅ Username: UNIQUE constraint
- ✅ Email: UNIQUE constraint  
- ✅ Google ID: UNIQUE constraint
- ✅ Duplicate prevention logic in `authenticate_google_user()`

### SQLite
- ✅ Using SQLite for database
- ✅ Foreign key constraints enforced
- ✅ Indexes for performance
- ✅ Transaction safety

## Development

### Running on Different Platforms

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

**Web:**
```bash
npm run web
```

### Building for Production

**iOS:**
```bash
expo build:ios
```

**Android:**
```bash
expo build:android
```

**Web:**
```bash
expo export:web
```

## Troubleshooting

### Token Issues
- Clear AsyncStorage: Settings → Clear Storage
- Check API_BASE_URL is correct
- Verify backend is running and accessible

### Network Issues
- For mobile devices, use your computer's IP address, not localhost
- Check firewall settings
- Verify backend CORS settings allow mobile origin

### Build Issues
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Environment Variables

For production, set:
- `API_BASE_URL` in `src/services/api.js`
- Backend `JWT_SECRET_KEY` must match Flask backend

## License

Same as main project.

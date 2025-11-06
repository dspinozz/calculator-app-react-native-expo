# Calculator Mobile App - React Native Expo

A cross-platform calculator application built with React Native, Expo, and TypeScript. Works seamlessly on iOS, Android, and Web with unified Drizzle ORM database support.

## 🚀 Features

- ✅ **Cross-Platform**: Works on iOS, Android, and Web
- ✅ **TypeScript**: Full type safety with strict mode
- ✅ **Token-Based Authentication**: JWT tokens for secure authentication
- ✅ **Google SSO**: Single Sign-On with Google OAuth 2.0
- ✅ **Unified Database**: Drizzle ORM with sql.js (web) and expo-sqlite (mobile)
- ✅ **Offline-Ready**: AsyncStorage for token persistence
- ✅ **Role-Based Access Control (RBAC)**: Admin panel for user management
- ✅ **Multi-Tenant Support**: Tenant isolation and management
- ✅ **Audit Logging**: Complete audit trail for all operations
- ✅ **Modern UI**: Beautiful gradient design matching web version
- ✅ **Full Calculator**: Supports all operations including parentheses and exponents
- ✅ **Code Quality**: ESLint configured for consistent code style

## 🛠 Tech Stack

### Frontend
- **Framework**: React Native with Expo
- **Language**: TypeScript (strict mode)
- **Database**: Drizzle ORM
  - Web: sql.js (WebAssembly SQLite)
  - Mobile: expo-sqlite (native SQLite)
- **Navigation**: React Navigation
- **State Management**: React Context API
- **Code Quality**: ESLint, TypeScript
- **Build**: Expo CLI, EAS Build

### Backend
- **Framework**: Flask (Python)
- **Database**: SQLite
- **Authentication**: JWT tokens, Google OAuth 2.0
- **Features**: Multi-tenancy, RBAC, Audit Logging

## 📋 Prerequisites

- Node.js 16+
- npm or yarn
- Expo CLI: `npm install -g expo-cli` (or use `npx expo`)
- iOS Simulator (for iOS) or Android Studio (for Android)

## 🚀 Quick Start

### Installation

1. Install dependencies:
```bash
cd mobile-app
npm install
```

2. Configure API URL:
   - Edit `src/services/api.ts`
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

## 📁 Project Structure

```
mobile-app/
├── App.tsx                 # Main app entry point
├── src/
│   ├── screens/           # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── CalculatorScreen.tsx
│   │   └── NoTenantScreen.tsx
│   ├── services/          # API services
│   │   └── api.ts        # API client with token management
│   ├── utils/            # Utilities
│   │   └── AuthContext.tsx  # Authentication context
│   ├── components/       # Reusable components
│   │   └── DatabaseComponent.tsx
│   └── db/               # Database layer
│       ├── schema.ts     # Drizzle schema definitions
│       └── db.ts         # Database initialization (web/mobile)
├── tsconfig.json         # TypeScript configuration
├── .eslintrc.js          # ESLint configuration
└── package.json
```

## 🔐 Authentication Flow

1. **Login**: User enters credentials → API returns JWT token
2. **Token Storage**: Token saved to AsyncStorage
3. **API Requests**: Token included in Authorization header
4. **Auto-Refresh**: Token validated on each request
5. **Logout**: Token removed from storage

## 💾 Database Architecture

### Unified Drizzle ORM

The app uses Drizzle ORM with platform-specific implementations:

- **Web**: sql.js (SQLite compiled to WebAssembly)
  - Persisted in localStorage
  - Auto-saves every 5 seconds
  
- **Mobile**: expo-sqlite (native SQLite)
  - Native database storage
  - Automatic persistence

### Schema

See `DRIZZLE_IMPLEMENTATION.md` for detailed implementation.

## 🧪 Testing

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

See `TESTING.md` for comprehensive testing guide.

## 📦 Deployment

See `DEPLOYMENT.md` for detailed deployment instructions:
- Web deployment (Vercel, Netlify, GitHub Pages)
- iOS App Store deployment
- Android Play Store deployment
- Expo Go distribution

## 🔧 Development

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
eas build --platform ios
```

**Android:**
```bash
eas build --platform android
```

**Web:**
```bash
npx expo export:web
```

## 📚 Documentation

- `README.md` - This file
- `ARCHITECTURE.md` - System architecture and design decisions
- `TESTING.md` - Testing guide and checklist
- `DEPLOYMENT.md` - Deployment instructions
- `DRIZZLE_IMPLEMENTATION.md` - Database implementation details

## 🐛 Troubleshooting
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

### TypeScript Errors
- Run type checking: `npx tsc --noEmit`
- Check for missing type definitions
- Verify tsconfig.json settings

## 📝 License

MIT License - see `LICENSE` file for details.

## 🤝 Contributing

This is a portfolio project. For questions or suggestions, please open an issue.

## 🔗 API Endpoints

## 🎯 Key Features Explained

### TypeScript
- Full type safety with strict mode
- Type inference for Drizzle ORM
- Typed navigation props
- Typed API responses

### Database
- Unified interface for web and mobile
- Automatic platform detection
- Persistent storage on both platforms
- Drizzle ORM for type-safe queries

### Authentication
- JWT token-based authentication
- Secure token storage
- Automatic token validation
- Graceful error handling

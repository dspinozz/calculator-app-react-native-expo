# Deployment Guide

## Overview

This React Native Expo application can be deployed to:
- **Web**: Static hosting (Vercel, Netlify, GitHub Pages)
- **iOS**: Apple App Store
- **Android**: Google Play Store
- **Expo**: Expo Go app or standalone builds

## Prerequisites

- Node.js 16+ installed
- Expo CLI: `npm install -g expo-cli` or `npx expo`
- EAS CLI for production builds: `npm install -g eas-cli`
- Expo account (free): https://expo.dev

## Environment Setup

### 1. Environment Variables

Create `.env` file (optional, or use Expo config):

```env
EXPO_PUBLIC_API_URL=https://your-api-url.com
```

Or configure in `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": process.env.EXPO_PUBLIC_API_URL
    }
  }
}
```

### 2. Update API Configuration

Edit `src/services/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:2000')
  : (process.env.EXPO_PUBLIC_API_URL || 'https://your-production-url.com');
```

## Web Deployment

### Option 1: Expo Web Build

```bash
# Build for web
npx expo export:web

# Output in web-build/ directory
# Deploy web-build/ to any static host
```

### Option 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Option 3: Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npx expo export:web
netlify deploy --prod --dir=web-build
```

### Option 4: GitHub Pages

1. Build: `npx expo export:web`
2. Push `web-build/` to `gh-pages` branch
3. Enable GitHub Pages in repository settings

## iOS Deployment

### Development Build

```bash
# Run on iOS Simulator
npm run ios

# Or scan QR code with Expo Go app
npm start
```

### Production Build (App Store)

#### Using EAS Build (Recommended)

1. **Install EAS CLI**:
```bash
npm install -g eas-cli
eas login
```

2. **Configure EAS**:
```bash
eas build:configure
```

3. **Build for iOS**:
```bash
eas build --platform ios
```

4. **Submit to App Store**:
```bash
eas submit --platform ios
```

#### Requirements
- Apple Developer account ($99/year)
- App Store Connect access
- Certificates and provisioning profiles (handled by EAS)

### Standalone Build (Legacy)

```bash
expo build:ios
```

## Android Deployment

### Development Build

```bash
# Run on Android Emulator
npm run android

# Or scan QR code with Expo Go app
npm start
```

### Production Build (Play Store)

#### Using EAS Build (Recommended)

1. **Build APK/AAB**:
```bash
eas build --platform android
```

2. **Submit to Play Store**:
```bash
eas submit --platform android
```

#### Requirements
- Google Play Developer account ($25 one-time)
- Play Console access
- Signing key (handled by EAS)

### Standalone Build (Legacy)

```bash
expo build:android
```

## Expo Go App

### Development

Users can test your app using Expo Go:

1. Start development server:
```bash
npm start
```

2. Share QR code with users
3. Users scan with Expo Go app

**Limitations**:
- Requires Expo Go app
- Some native modules not supported
- Not suitable for production

## Production Checklist

### Before Deployment

- [ ] Update API URLs to production endpoints
- [ ] Set environment variables
- [ ] Test on all target platforms
- [ ] Run type checking: `npx tsc --noEmit`
- [ ] Run linting: `npm run lint`
- [ ] Update version in `app.json` and `package.json`
- [ ] Update app icons and splash screens
- [ ] Test authentication flow
- [ ] Test database operations
- [ ] Verify error handling

### App Store Submission

- [ ] App Store screenshots (various sizes)
- [ ] App description and keywords
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] App icon (1024x1024)
- [ ] Age rating information

### Play Store Submission

- [ ] Play Store screenshots
- [ ] App description
- [ ] Privacy policy URL
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Content rating

## Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npx expo export:web
      - run: # Deploy to hosting service
```

## Troubleshooting

### Build Failures

- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Expo SDK version compatibility

### Web Build Issues

- Ensure webpack config is correct
- Check for Node.js polyfills
- Verify sql.js configuration

### App Store Issues

- Verify certificates and provisioning profiles
- Check bundle identifier uniqueness
- Ensure all required app information provided

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)

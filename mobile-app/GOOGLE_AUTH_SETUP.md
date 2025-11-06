# Google OAuth 2.0 Setup Guide

This guide will help you configure Google Single Sign-On (SSO) for the calculator application.

## Prerequisites

- A Google Cloud Platform (GCP) account
- Access to Google Cloud Console

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in required fields (App name, User support email, Developer contact)
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if in testing mode

## Step 2: Create OAuth Client IDs

You need to create **three separate OAuth client IDs** for different platforms:

### Web Client ID
1. Application type: **Web application**
2. Name: `Calculator Web Client`
3. Authorized redirect URIs:
   - `http://localhost:5002/auth/google` (development)
   - `http://100.83.165.66:5002/auth/google` (your server)
   - `https://yourdomain.com/auth/google` (production)
4. Copy the **Client ID** and **Client Secret**

### iOS Client ID
1. Application type: **iOS**
2. Name: `Calculator iOS Client`
3. Bundle ID: Your iOS app bundle ID (e.g., `com.yourcompany.calculator`)
4. Copy the **Client ID** (no secret for iOS)

### Android Client ID
1. Application type: **Android**
2. Name: `Calculator Android Client`
3. Package name: Your Android package name (e.g., `com.yourcompany.calculator`)
4. SHA-1 certificate fingerprint: Get from your keystore
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
5. Copy the **Client ID** (no secret for Android)

## Step 3: Configure Backend (.env file)

Add to `/root/calculator/.env`:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-web-client-id-here
GOOGLE_CLIENT_SECRET=your-web-client-secret-here
```

## Step 4: Configure Frontend (app.json or .env)

### Option A: Using app.json (Recommended for Expo)

Add to `/root/calculator/mobile-app/app.json`:

```json
{
  "expo": {
    "extra": {
      "googleClientId": {
        "ios": "your-ios-client-id-here",
        "android": "your-android-client-id-here",
        "web": "your-web-client-id-here"
      }
    }
  }
}
```

### Option B: Using Environment Variables

Create `/root/calculator/mobile-app/.env`:

```bash
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id-here
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id-here
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id-here
```

## Step 5: Update LoginScreen.tsx

The LoginScreen already uses these environment variables. Make sure they're set correctly:

```typescript
const [request, response, promptAsync] = Google.useAuthRequest({
  expoClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  redirectUri: `${ApiService.getBaseUrl()}/auth/google/callback`,
});
```

## Step 6: Test the Configuration

1. **Backend**: Restart Flask server after updating `.env`
2. **Frontend**: Restart Expo after updating environment variables
3. **Test**: Click "Sign in with Google" button on login screen

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch"**
   - Ensure redirect URI in Google Console matches exactly
   - Check for trailing slashes
   - Verify protocol (http vs https)

2. **"invalid_client"**
   - Verify Client ID and Secret are correct
   - Check if credentials are for the right project
   - Ensure credentials haven't been deleted

3. **iOS/Android not working**
   - Verify bundle/package names match
   - Check SHA-1 fingerprint for Android
   - Ensure OAuth consent screen is published (if not in testing)

### Getting SHA-1 Fingerprint

For Android debug keystore:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

For production keystore:
```bash
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

## Security Notes

- ⚠️ **Never commit** `.env` files to version control
- ⚠️ **Rotate credentials** if they're exposed
- ⚠️ **Use different credentials** for development and production
- ⚠️ **Restrict redirect URIs** to your actual domains

## Support

For more information, see:
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Expo AuthSession Documentation](https://docs.expo.dev/guides/authentication/#google)

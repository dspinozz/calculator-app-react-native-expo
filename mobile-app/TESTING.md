# Testing Guide

## Overview

This project uses TypeScript for type safety and ESLint for code quality. While automated unit tests are not yet implemented, the project follows best practices for manual testing and type checking.

## Type Checking

The project uses TypeScript with strict mode enabled. Run type checking:

```bash
npx tsc --noEmit
```

This validates all TypeScript files without generating output files.

## Linting

ESLint is configured for code quality. Run linting:

```bash
npm run lint
```

This checks:
- Code style consistency
- React best practices
- React Hooks rules
- Unused variables
- Console statements (warnings)

## Manual Testing Checklist

### Authentication Flow
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error handling)
- [ ] Token persistence after app restart
- [ ] Logout functionality
- [ ] No tenant screen appears for users without tenant

### Calculator Functionality
- [ ] Basic arithmetic operations (+, -, *, /)
- [ ] Parentheses support
- [ ] Exponent operations (^)
- [ ] Decimal number handling
- [ ] Clear (C) button
- [ ] Backspace (⌫) button
- [ ] Error handling for invalid expressions
- [ ] API integration for calculations

### Database Operations
- [ ] Database initialization (web and mobile)
- [ ] History record insertion
- [ ] History record retrieval
- [ ] User preferences storage
- [ ] Data persistence (web: localStorage, mobile: native storage)

### Cross-Platform Testing
- [ ] **Web**: Test in Chrome, Firefox, Safari
- [ ] **iOS**: Test on iOS Simulator and physical device
- [ ] **Android**: Test on Android Emulator and physical device
- [ ] Responsive design on different screen sizes
- [ ] Platform-specific features work correctly

### Error Handling
- [ ] Network errors (offline mode)
- [ ] API errors (invalid responses)
- [ ] Database errors
- [ ] User-friendly error messages

## Testing on Different Platforms

### Web
```bash
npm run web
# Access at http://localhost:19006
```

### iOS Simulator
```bash
npm run ios
```

### Android Emulator
```bash
npm run android
```

### Physical Device
1. Start Expo: `npm start`
2. Scan QR code with Expo Go app
3. Test on actual device

## Database Testing

The `DatabaseComponent` automatically runs tests on mount:
- Inserts test history record
- Retrieves history records
- Tests user preferences
- Displays test results

Check the component output for:
- ✅ Database initialization success
- ✅ Insert operations
- ✅ Select operations
- ✅ Update operations

## Future Testing Improvements

### Recommended Additions
1. **Unit Tests** (Jest + React Native Testing Library)
   - Component rendering
   - Utility functions
   - API service methods

2. **Integration Tests**
   - Authentication flow
   - Calculator operations
   - Database operations

3. **E2E Tests** (Detox or Appium)
   - Full user workflows
   - Cross-platform scenarios

4. **Type Tests** (TypeScript)
   - Type safety validation
   - Interface compliance

## Running All Checks

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Manual testing
# Follow the checklist above
```

## Test Coverage Goals

- Type safety: 100% (TypeScript)
- Code quality: ESLint warnings addressed
- Manual testing: All checklist items verified
- Future: 80%+ unit test coverage

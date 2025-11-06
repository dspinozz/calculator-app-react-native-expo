# React Native Expo Migration Guide

## Current Architecture

### Backend (Flask)
- REST API with JSON endpoints
- Session-based authentication
- SQLite database
- Role-based access control (RBAC)
- Audit logging

### Frontend (Web)
- HTML/CSS/JavaScript
- Vanilla JS (no framework)
- ~1,400 lines of code
- Responsive design

## Migration Difficulty Assessment: **MODERATE** (6/10)

### Why This is Relatively Easy:

1. ✅ **REST API Already Exists**
   - Backend is already API-first
   - All endpoints return JSON
   - No major backend changes needed

2. ✅ **Stateless Authentication Possible**
   - Current session-based auth can convert to JWT tokens
   - Or use session cookies (works with React Native)

3. ✅ **Simple UI Components**
   - Calculator is mostly buttons and display
   - React Native has excellent component support

4. ✅ **No Complex Dependencies**
   - No heavy frontend libraries to port
   - Business logic is mostly in backend

### Challenges:

1. ⚠️ **Session Management**
   - Mobile apps prefer token-based auth
   - Need to handle token refresh

2. ⚠️ **UI/UX Differences**
   - Mobile touch interactions
   - Different screen sizes
   - Navigation patterns

3. ⚠️ **State Management**
   - Need React state management
   - AsyncStorage for local persistence

4. ⚠️ **Admin Panel**
   - Modal UI needs React Native components
   - Different styling approach

## Step-by-Step Migration Plan

### Phase 1: Backend Modifications (Easy - 1-2 days)

#### Option A: Keep Session-Based Auth (Easier)
- Keep current Flask sessions
- Use `react-native-cookies` or `@react-native-async-storage/async-storage` for cookies
- No backend changes needed

#### Option B: Add JWT Auth (Recommended for Mobile)
```python
# Add JWT endpoint
@app.route('/api/login', methods=['POST'])
def api_login():
    # ... existing auth logic ...
    if user:
        token = jwt.encode({
            'user_id': user['id'],
            'username': user['username'],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.secret_key, algorithm='HS256')
        return jsonify({'token': token, 'user': user})
```

**Difficulty**: Easy - Add JWT library, create token endpoint

### Phase 2: React Native Setup (Easy - 1 day)

```bash
npx create-expo-app CalculatorApp
cd CalculatorApp
npm install @react-navigation/native @react-navigation/stack
npm install @react-native-async-storage/async-storage
npm install axios
# For JWT (if using Option B)
npm install @react-native-async-storage/async-storage jwt-decode
```

**Difficulty**: Easy - Standard Expo setup

### Phase 3: API Service Layer (Easy - 1 day)

Create API service that matches current endpoints:

```typescript
// services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://100.83.165.66:2000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (username: string, password: string) => 
  api.post('/login', { username, password });

export const calculate = (expression: string) => 
  api.post('/calculate', { expression });

export const getHistory = () => 
  api.get('/history');

export const getUserSettings = () => 
  api.get('/check-auth');

export const updateUserSettings = (userId: number, settings: any) => 
  api.put(`/admin/user-settings/${userId}`, settings);
```

**Difficulty**: Easy - Direct mapping of existing endpoints

### Phase 4: Authentication Screens (Easy - 2 days)

```typescript
// screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { login } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const response = await login(username, password);
      if (response.data.success) {
        // Store session or token
        await AsyncStorage.setItem('user', JSON.stringify(response.data));
        navigation.replace('Calculator');
      }
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <View style={styles.container}>
      <Text>Login</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
```

**Difficulty**: Easy - Standard React Native form

### Phase 5: Calculator Screen (Moderate - 3-4 days)

Convert calculator UI to React Native:

```typescript
// screens/CalculatorScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { calculate } from '../services/api';

export default function CalculatorScreen() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [settings, setSettings] = useState({ allow_parentheses: true, allow_exponents: true });

  const handleCalculate = async () => {
    try {
      const response = await calculate(expression);
      setResult(response.data.result);
      setExpression('');
    } catch (error) {
      setResult('Error');
    }
  };

  const appendToExpression = (value: string) => {
    // Same logic as web version
    if ((value === '(' || value === ')') && !settings.allow_parentheses) return;
    if (value === '^' && !settings.allow_exponents) return;
    setExpression(prev => prev + value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.display}>
        <Text style={styles.expression}>{expression || '0'}</Text>
        <Text style={styles.result}>{result}</Text>
      </View>
      <View style={styles.buttons}>
        {/* Button grid - same as web */}
        {[1,2,3,4,5,6,7,8,9,0].map(num => (
          <TouchableOpacity
            key={num}
            style={styles.button}
            onPress={() => appendToExpression(num.toString())}
          >
            <Text>{num}</Text>
          </TouchableOpacity>
        ))}
        {/* Operators, parentheses, etc. */}
      </View>
    </View>
  );
}
```

**Difficulty**: Moderate - UI layout and styling, but logic is reusable

### Phase 6: Admin Panel (Easy - 2 days)

```typescript
// screens/AdminPanel.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal } from 'react-native';
import { getAdminUserSettings, updateUserSettings } from '../services/api';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const toggleRestriction = async (userId: number, type: string, enable: boolean) => {
    await updateUserSettings(userId, { [type]: enable });
    loadUsers();
  };

  return (
    <View>
      <FlatList
        data={users}
        renderItem={({ item }) => (
          <View>
            <Text>{item.username}</Text>
            <TouchableOpacity onPress={() => toggleRestriction(item.id, 'allow_parentheses', !item.allow_parentheses)}>
              <Text>{item.allow_parentheses ? 'Disable' : 'Enable'} Parentheses</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
```

**Difficulty**: Easy - Standard React Native list/modal

### Phase 7: Navigation (Easy - 1 day)

```typescript
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import CalculatorScreen from './screens/CalculatorScreen';
import AdminPanel from './screens/AdminPanel';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Calculator" component={CalculatorScreen} />
        <Stack.Screen name="Admin" component={AdminPanel} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Difficulty**: Easy - Standard React Navigation

## Code Reusability

### Can Reuse (90%):
- ✅ **Backend API** - No changes needed
- ✅ **Business Logic** - Calculator evaluation logic
- ✅ **Database** - No changes
- ✅ **Authentication** - Same endpoints
- ✅ **RBAC** - Same permission checks

### Needs Rewriting (10%):
- ❌ **UI Components** - HTML → React Native
- ❌ **Styling** - CSS → StyleSheet
- ❌ **State Management** - Vanilla JS → React hooks
- ❌ **Navigation** - Page navigation → Stack navigation

## Estimated Timeline

| Phase | Task | Time | Difficulty |
|-------|------|------|------------|
| 1 | Backend JWT (optional) | 1-2 days | Easy |
| 2 | Expo Setup | 1 day | Easy |
| 3 | API Service Layer | 1 day | Easy |
| 4 | Login Screen | 2 days | Easy |
| 5 | Calculator Screen | 3-4 days | Moderate |
| 6 | Admin Panel | 2 days | Easy |
| 7 | Navigation & Polish | 2-3 days | Easy |
| **Total** | | **12-15 days** | **Moderate** |

## Key Considerations

### 1. Network Configuration
- Mobile app needs to connect to `http://100.83.165.66:2000`
- For production, use HTTPS
- Consider API base URL configuration

### 2. Authentication Strategy
- **Option A**: Keep sessions (easier, works with cookies)
- **Option B**: JWT tokens (better for mobile, more secure)

### 3. Offline Capability
- Calculator can work offline for basic calculations
- History/audit requires network
- Use AsyncStorage for local caching

### 4. Platform Differences
- iOS: Follows human interface guidelines
- Android: Material Design patterns
- Expo handles most platform differences

### 5. Testing
- Test on iOS Simulator
- Test on Android Emulator
- Test on physical devices (Expo Go app)

## Advantages of React Native Expo

1. ✅ **Single Codebase** - iOS and Android
2. ✅ **Hot Reload** - Fast development
3. ✅ **Expo Go** - Test without building
4. ✅ **Native Performance** - Near-native speed
5. ✅ **Rich Ecosystem** - Many packages available

## Potential Issues & Solutions

### Issue: Session Management
**Solution**: Use JWT tokens or AsyncStorage for cookies

### Issue: Styling Differences
**Solution**: Use React Native StyleSheet, similar syntax to CSS

### Issue: Button Layout
**Solution**: Use Flexbox (same as web CSS Grid alternative)

### Issue: Admin Modal
**Solution**: Use React Native Modal component

## Recommended Approach

1. **Start with Session Auth** (faster, less changes)
2. **Build Calculator Screen First** (core functionality)
3. **Add Authentication** (login/logout)
4. **Add Admin Features** (if needed)
5. **Polish & Test** (UI/UX improvements)

## Conclusion

**Overall Difficulty: MODERATE (6/10)**

The migration is **relatively straightforward** because:
- Backend is already API-ready
- No complex frontend dependencies
- Simple UI components
- Business logic is backend-based

**Main effort** is in:
- Converting HTML/CSS to React Native components
- Adapting styling to mobile patterns
- Setting up navigation

**Estimated Effort**: 2-3 weeks for a developer familiar with React Native

**Recommendation**: This is a **good candidate** for React Native migration due to the clean API architecture and simple UI requirements.


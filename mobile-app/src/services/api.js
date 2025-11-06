// src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
// For development on mobile device, use your computer's IP address instead of localhost
// Example: 'http://192.168.1.100:2000'
const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:2000')  // Development - can override with env var
  : (process.env.EXPO_PUBLIC_API_URL || 'https://your-production-url.com');  // Production

class ApiService {
  async getToken() {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async setToken(token) {
    try {
      await AsyncStorage.setItem('auth_token', token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  async removeToken() {
    try {
      await AsyncStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  async request(endpoint, options = {}) {
    const token = await this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          await this.removeToken();
          throw new Error('Authentication required');
        }
        throw new Error(data.error || data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(username, password) {
    const response = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.success && response.token) {
      await this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.removeToken();
    }
  }

  async checkAuth() {
    try {
      return await this.request('/check-auth');
    } catch (error) {
      return { authenticated: false };
    }
  }

  // Calculator endpoints
  async calculate(expression) {
    return await this.request('/calculate', {
      method: 'POST',
      body: JSON.stringify({ expression }),
    });
  }

  // Admin endpoints
  async getUsersWithoutTenant() {
    const data = await this.request('/admin/assign-tenant');
    return data.users_without_tenant || [];
  }

  async assignUserToTenant(userId, tenantId) {
    return await this.request('/admin/assign-tenant', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, tenant_id: tenantId }),
    });
  }
}

export default new ApiService();

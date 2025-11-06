// API Service Layer for React Native
// This replaces the fetch calls in the web version

import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://100.83.165.66:2000';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - Add auth token if available
api.interceptors.request.use(
  async (config) => {
    // For session-based auth, cookies are handled automatically
    // For JWT auth, you would do:
    // const token = await AsyncStorage.getItem('auth_token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Session expired or not authenticated
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('auth_token');
      // Navigate to login (you'd use navigation here)
    }
    return Promise.reject(error);
  }
);

// Authentication
export const login = async (username: string, password: string) => {
  const response = await api.post('/login', { username, password });
  if (response.data.success) {
    // Store user info
    await AsyncStorage.setItem('user', JSON.stringify({
      id: response.data.user_id,
      username: response.data.username,
      role: response.data.role,
    }));
  }
  return response;
};

export const logout = async () => {
  try {
    await api.post('/logout');
  } finally {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('auth_token');
  }
};

export const checkAuth = async () => {
  return api.get('/check-auth');
};

// Calculator
export const calculate = async (expression: string) => {
  return api.post('/calculate', { expression });
};

// History
export const getHistory = async () => {
  return api.get('/history');
};

// User Info
export const getUserInfo = async () => {
  return api.get('/user/info');
};

// Admin Functions
export const getAdminUserSettings = async () => {
  return api.get('/admin/user-settings');
};

export const updateUserSettings = async (userId: number, settings: {
  allow_parentheses?: boolean;
  allow_exponents?: boolean;
}) => {
  return api.put(`/admin/user-settings/${userId}`, settings);
};

export const getAuditLogs = async (limit: number = 100) => {
  return api.get(`/audit?limit=${limit}`);
};

export default api;


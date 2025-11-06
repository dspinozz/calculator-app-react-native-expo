// src/services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
// Try port 8000 first (seems to be the Flask backend), fallback to 5000
const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://100.83.165.66:5002')
  : (process.env.EXPO_PUBLIC_API_URL || 'https://your-production-url.com');

interface LoginResponse {
  success: boolean;
  token?: string;
  username?: string;
  role?: string;
  tenant_id?: string | null;
  message?: string;
}

interface AuthCheckResponse {
  authenticated: boolean;
  username?: string;
  role?: string;
  tenant_id?: string | null;
  settings?: {
    allow_parentheses: boolean;
    allow_exponents: boolean;
  };
}

interface CalculateResponse {
  success: boolean;
  result?: string;
  error?: string;
}

interface UsersWithoutTenantResponse {
  users_without_tenant?: {
    id: number;
    username: string;
  }[];
}

interface AssignTenantResponse {
  success: boolean;
  message?: string;
}

class ApiService {
  getBaseUrl(): string {
    return API_BASE_URL;
  }

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting token:', error);
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_token', token);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving token:', error);
    }
  }

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error removing token:', error);
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // Add credentials for CORS
        credentials: 'include',
      });

      // Handle CORS preflight errors
      if (!response.ok && response.status === 0) {
        throw new Error('CORS error: Backend not allowing requests from this origin');
      }

      const data = await response.json() as T & { error?: string; message?: string };

      if (!response.ok) {
        if (response.status === 401) {
          await this.removeToken();
          throw new Error('Authentication required');
        }
        throw new Error(data.error || data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('API Error:', error);
      // Provide more helpful error messages
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to backend server. Please check if the server is running and CORS is configured.');
      }
      throw error;
    }
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.success && response.token) {
      await this.setToken(response.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/logout', { method: 'POST' });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout error:', error);
    } finally {
      await this.removeToken();
    }
  }

  async checkAuth(): Promise<AuthCheckResponse> {
    try {
      return await this.request<AuthCheckResponse>('/check-auth');
    } catch (error) {
      return { authenticated: false };
    }
  }

  async calculate(expression: string): Promise<CalculateResponse> {
    return await this.request<CalculateResponse>('/calculate', {
      method: 'POST',
      body: JSON.stringify({ expression }),
    });
  }

  async getUsersWithoutTenant(): Promise<{ id: number; username: string }[]> {
    const data = await this.request<UsersWithoutTenantResponse>('/admin/assign-tenant');
    return data.users_without_tenant || [];
  }

  async assignUserToTenant(userId: number, tenantId: number): Promise<AssignTenantResponse> {
    return await this.request<AssignTenantResponse>('/admin/assign-tenant', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, tenant_id: tenantId }),
    });
  }

  // Audit logging endpoints
  async getAuditLogs(limit?: number, userId?: number): Promise<{
    id: number;
    username: string;
    action: string;
    resource?: string;
    expression?: string;
    result?: string;
    timestamp: string;
  }[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (userId) params.append('user_id', userId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await this.request<{ logs: any[] }>(`/audit${query}`);
    return data.logs || [];
  }

  async getAuditUsers(): Promise<{ id: number; username: string; log_count: number }[]> {
    const data = await this.request<{ users: any[] }>('/audit/users');
    return data.users || [];
  }

  // Tenant and user management endpoints
  async getAllTenants(): Promise<{ id: number; name: string; created_at: string }[]> {
    const data = await this.request<{ tenants: any[] }>('/admin/assign-tenant');
    return data.tenants || [];
  }

  async getAllUserSettings(): Promise<{
    id: number;
    username: string;
    allow_parentheses: boolean;
    allow_exponents: boolean;
  }[]> {
    const data = await this.request<{ users: any[] }>('/admin/user-settings');
    return data.users || [];
  }

  async updateUserSettings(userId: number, allowParentheses?: boolean, allowExponents?: boolean): Promise<{ success: boolean }> {
    return await this.request<{ success: boolean }>(`/admin/user-settings/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        allow_parentheses: allowParentheses,
        allow_exponents: allowExponents,
      }),
    });
  }

  async createUserByEmail(email: string, username?: string): Promise<{ success: boolean; message?: string }> {
    return await this.request<{ success: boolean; message?: string }>('/admin/create-user', {
      method: 'POST',
      body: JSON.stringify({ email, username }),
    });
  }

  async removeUserFromTenant(userId: number): Promise<{ success: boolean; message?: string }> {
    return await this.request<{ success: boolean; message?: string }>('/admin/remove-tenant', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async deleteTenant(tenantId: number): Promise<{ success: boolean; message?: string }> {
    return await this.request<{ success: boolean; message?: string }>('/admin/delete-tenant', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: tenantId }),
    });
  }

  async createTenant(name: string): Promise<{ success: boolean; message?: string; tenant_id?: number }> {
    return await this.request<{ success: boolean; message?: string; tenant_id?: number }>('/admin/create-tenant', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }
}

export default new ApiService();

/**
 * Admin API service functions
 */

import { apiConfig } from './apiConfig';
import { httpClient } from './httpClient';
import {
  AdminLoginRequest,
  AdminTokenResponse,
  AdminUser,
  DashboardStats,
  PhoneManagement,
  UserManagement,
  ScraperStatus,
  ActivityLog,
  ApiResponse,
  PaginatedResponse,
  PhoneUpdateForm,
  UserBlockForm,
  ScraperTriggerForm,
  AdminCreateForm
} from '../types/admin';

const API_BASE = apiConfig.getConfig().baseURL;

// Admin authentication token management
class AdminAuthManager {
  private static TOKEN_KEY = 'admin_access_token';
  private static ROLE_KEY = 'admin_role';

  static setToken(token: string, role: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.ROLE_KEY, role);
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static getRole(): string | null {
    return localStorage.getItem(this.ROLE_KEY);
  }

  static clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.ROLE_KEY);
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

// HTTP client with admin auth
const adminHttpClient = {
  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const token = AdminAuthManager.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await fetch(`${API_BASE}${url}${queryString}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        AdminAuthManager.clearToken();
        window.location.href = '/admin/login';
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async post<T>(url: string, data?: any): Promise<T> {
    const token = AdminAuthManager.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        AdminAuthManager.clearToken();
        window.location.href = '/admin/login';
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async put<T>(url: string, data?: any): Promise<T> {
    const token = AdminAuthManager.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        AdminAuthManager.clearToken();
        window.location.href = '/admin/login';
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async delete<T>(url: string): Promise<T> {
    const token = AdminAuthManager.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        AdminAuthManager.clearToken();
        window.location.href = '/admin/login';
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
};

// Admin API functions
export const adminApi = {
  // Authentication
  async login(credentials: AdminLoginRequest): Promise<AdminTokenResponse> {
    const response = await fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const result = await response.json();
    AdminAuthManager.setToken(result.access_token, result.admin_role);
    return result;
  },

  async logout(): Promise<void> {
    try {
      await adminHttpClient.post('/admin/auth/logout');
    } finally {
      AdminAuthManager.clearToken();
    }
  },

  async getCurrentAdmin(): Promise<AdminUser> {
    return adminHttpClient.get<AdminUser>('/admin/auth/me');
  },

  async createAdmin(adminData: AdminCreateForm): Promise<AdminUser> {
    return adminHttpClient.post<AdminUser>('/admin/auth/create', adminData);
  },

  async listAdmins(skip = 0, limit = 100): Promise<AdminUser[]> {
    return adminHttpClient.get<AdminUser[]>('/admin/auth/list', { skip, limit });
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return adminHttpClient.get<DashboardStats>('/admin/dashboard/stats');
  },

  async getPhoneStats(): Promise<any> {
    return adminHttpClient.get('/admin/dashboard/phone-stats');
  },

  async getUserStats(): Promise<any> {
    return adminHttpClient.get('/admin/dashboard/user-stats');
  },

  async getActivitySummary(hours = 24): Promise<any> {
    return adminHttpClient.get('/admin/dashboard/activity-summary', { hours });
  },

  async getSystemHealth(): Promise<any> {
    return adminHttpClient.get('/admin/dashboard/system-health');
  },

  // Phone Management
  async listPhones(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    brand?: string;
    min_price?: number;
    max_price?: number;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: string;
  }): Promise<{ phones: PhoneManagement[]; total_count: number; skip: number; limit: number; has_more: boolean }> {
    return adminHttpClient.get('/admin/phones/list', params);
  },

  async getPhoneDetails(phoneId: number): Promise<PhoneManagement> {
    return adminHttpClient.get<PhoneManagement>(`/admin/phones/${phoneId}`);
  },

  async updatePhone(phoneId: number, updates: PhoneUpdateForm): Promise<ApiResponse<PhoneManagement>> {
    return adminHttpClient.put(`/admin/phones/${phoneId}`, updates);
  },

  async deletePhone(phoneId: number): Promise<ApiResponse<void>> {
    return adminHttpClient.delete(`/admin/phones/${phoneId}`);
  },

  async bulkUpdatePhones(phoneIds: number[], updates: PhoneUpdateForm): Promise<ApiResponse<void>> {
    return adminHttpClient.post('/admin/phones/bulk-update', { phone_ids: phoneIds, updates });
  },

  async uploadPhonesCsv(file: File): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);

    const token = AdminAuthManager.getToken();
    const response = await fetch(`${API_BASE}/admin/phones/upload-csv`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  },

  async exportPhonesCsv(params?: { brand?: string; min_price?: number; max_price?: number }): Promise<Blob> {
    const token = AdminAuthManager.getToken();
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    
    const response = await fetch(`${API_BASE}/admin/phones/export/csv${queryString}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  },

  // User Management
  async listUsers(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_verified?: boolean;
  }): Promise<UserManagement[]> {
    return adminHttpClient.get('/admin/users', params);
  },

  async getUserDetails(userId: number): Promise<any> {
    return adminHttpClient.get(`/admin/users/${userId}`);
  },

  async blockUser(blockData: UserBlockForm): Promise<ApiResponse<void>> {
    return adminHttpClient.post(`/admin/users/${blockData.user_id}/block`, blockData);
  },

  async unblockUser(userId: number): Promise<ApiResponse<void>> {
    return adminHttpClient.post(`/admin/users/${userId}/unblock`);
  },

  // Scraper Management
  async getScraperStatuses(limit = 20): Promise<ScraperStatus[]> {
    return adminHttpClient.get('/admin/scrapers/status', { limit });
  },

  async getActiveScrapers(): Promise<any> {
    return adminHttpClient.get('/admin/scrapers/active');
  },

  async triggerScraper(scraperName: string, force = false): Promise<ApiResponse<any>> {
    return adminHttpClient.post(`/admin/scrapers/trigger/${scraperName}`, { force });
  },

  async stopScraper(scraperId: number): Promise<ApiResponse<void>> {
    return adminHttpClient.post(`/admin/scrapers/stop/${scraperId}`);
  },

  async getScraperLogs(scraperId: number): Promise<any> {
    return adminHttpClient.get(`/admin/scrapers/logs/${scraperId}`);
  },

  async getScraperSchedule(): Promise<any> {
    return adminHttpClient.get('/admin/scrapers/schedule');
  },

  // Analytics
  async getAnalyticsOverview(days = 30): Promise<any> {
    return adminHttpClient.get('/admin/analytics/overview', { days });
  },

  async getComparisonAnalytics(): Promise<any> {
    return adminHttpClient.get('/admin/analytics/comparisons');
  },

  // System Monitoring
  async getSystemLogs(params?: {
    level?: string;
    hours?: number;
    limit?: number;
  }): Promise<any> {
    return adminHttpClient.get('/admin/system/logs', params);
  },

  async getPerformanceMetrics(): Promise<any> {
    return adminHttpClient.get('/admin/system/performance');
  },

  async getActivityLogs(params?: {
    skip?: number;
    limit?: number;
    admin_id?: number;
    action?: string;
  }): Promise<ActivityLog[]> {
    return adminHttpClient.get('/admin/system/activity', params);
  }
};

export { AdminAuthManager };
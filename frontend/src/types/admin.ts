/**
 * TypeScript types for admin panel functionality
 */

export interface AdminUser {
  id: number;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  first_name?: string;
  last_name?: string;
}

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  MODERATOR = 'moderator',
  ANALYST = 'analyst'
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  admin_role: AdminRole;
}

export interface DashboardStats {
  total_phones: number;
  total_users: number;
  active_sessions: number;
  most_compared_phones: Array<{
    name: string;
    brand: string;
    comparison_count: number;
  }>;
  trending_searches: Array<{
    query: string;
    count: number;
  }>;
  api_health: {
    status: string;
    response_time: string;
    success_rate: string;
    last_check: string;
  };
  scraper_status: Array<{
    name: string;
    status: string;
    last_run?: string;
    records_processed: number;
  }>;
}

export interface PhoneManagement {
  id: number;
  name: string;
  brand: string;
  model?: string;
  price_taka: number;
  created_at: string;
  is_active?: boolean;
}

export interface UserManagement {
  id: number;
  email: string;
  is_verified: boolean;
  created_at: string;
  first_name?: string;
  last_name?: string;
  session_count: number;
  last_activity?: string;
}

export interface ScraperStatus {
  id: number;
  scraper_name: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  records_processed: number;
  records_updated: number;
  records_failed: number;
  error_message?: string;
  triggered_by_email?: string;
}

export interface ActivityLog {
  id: number;
  admin_user_id: number;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
  admin_email: string;
}

export interface SystemMetrics {
  metric_name: string;
  metric_value: string;
  metric_type: string;
  recorded_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total_count: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

// Form types
export interface PhoneUpdateForm {
  name?: string;
  brand?: string;
  price_taka?: number;
  is_active?: boolean;
  specifications?: Record<string, any>;
}

export interface UserBlockForm {
  user_id: number;
  reason: string;
  duration_hours?: number;
}

export interface ScraperTriggerForm {
  scraper_name: string;
  force: boolean;
}

export interface AdminCreateForm {
  email: string;
  password: string;
  confirm_password: string;
  role: AdminRole;
  first_name?: string;
  last_name?: string;
}

// Chart and analytics types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface AnalyticsData {
  registration_trend: ChartDataPoint[];
  phone_popularity: Array<{
    name: string;
    searches: number;
    comparisons: number;
  }>;
  brand_distribution: Array<{
    brand: string;
    count: number;
  }>;
}
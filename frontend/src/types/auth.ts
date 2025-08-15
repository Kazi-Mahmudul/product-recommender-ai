// Enhanced authentication types for the user authentication system

export interface GoogleProfile {
  picture: string;
  given_name: string;
  family_name: string;
  email_verified: boolean;
}

export interface UserUsageStats {
  total_searches?: number;
  total_comparisons?: number;
  favorite_phones?: string[];
  last_activity?: string;
}

export interface EnhancedUser {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  is_verified: boolean;
  created_at: string;
  last_login?: string;
  auth_provider: 'email' | 'google';
  google_profile?: GoogleProfile;
  usage_stats?: UserUsageStats;
}

export interface UserContainerProps {
  user: EnhancedUser;
  onLogout: () => void;
  darkMode: boolean;
  className?: string;
}

export interface AuthAlertConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  showConfirmButton?: boolean;
  timer?: number;
  customClass?: {
    container?: string;
    popup?: string;
    title?: string;
    content?: string;
    confirmButton?: string;
    cancelButton?: string;
  };
}

export interface AlertTheme {
  brandColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
  customClass: {
    container: string;
    popup: string;
    title: string;
    content: string;
    confirmButton: string;
    cancelButton: string;
  };
}

export interface ErrorHandlingStrategy {
  authenticationFailed: () => void;
  networkError: () => void;
  tokenExpired: () => void;
  profileLoadError: () => void;
  googleOAuthError: (error: any) => void;
}
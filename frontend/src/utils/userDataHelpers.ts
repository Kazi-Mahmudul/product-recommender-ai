import { EnhancedUser } from '../types/auth';

/**
 * Validates and ensures user data conforms to EnhancedUser interface
 */
export const validateUserData = (userData: any): EnhancedUser | null => {
  if (!userData || typeof userData !== 'object') {
    return null;
  }

  // Required fields
  if (!userData.id || !userData.email || !userData.created_at) {
    return null;
  }

  // Ensure proper typing
  const enhancedUser: EnhancedUser = {
    id: Number(userData.id),
    email: String(userData.email),
    first_name: userData.first_name ? String(userData.first_name) : undefined,
    last_name: userData.last_name ? String(userData.last_name) : undefined,
    profile_picture: userData.profile_picture ? String(userData.profile_picture) : undefined,
    is_verified: Boolean(userData.is_verified),
    created_at: String(userData.created_at),
    last_login: userData.last_login ? String(userData.last_login) : undefined,
    auth_provider: userData.auth_provider === 'google' ? 'google' : 'email',
    google_profile: userData.google_profile ? {
      picture: String(userData.google_profile.picture || ''),
      given_name: String(userData.google_profile.given_name || ''),
      family_name: String(userData.google_profile.family_name || ''),
      email_verified: Boolean(userData.google_profile.email_verified)
    } : undefined,
    usage_stats: userData.usage_stats ? {
      total_searches: userData.usage_stats.total_searches ? Number(userData.usage_stats.total_searches) : undefined,
      total_comparisons: userData.usage_stats.total_comparisons ? Number(userData.usage_stats.total_comparisons) : undefined,
      favorite_phones: Array.isArray(userData.usage_stats.favorite_phones) ? userData.usage_stats.favorite_phones.map(String) : undefined,
      last_activity: userData.usage_stats.last_activity ? String(userData.usage_stats.last_activity) : undefined
    } : undefined
  };

  return enhancedUser;
};

/**
 * Gets the display name for a user
 */
export const getUserDisplayName = (user: EnhancedUser): string => {
  if (user.google_profile?.given_name) {
    return user.google_profile.given_name;
  }
  if (user.first_name) {
    return user.first_name;
  }
  if (user.email) {
    const emailName = user.email.split('@')[0];
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }
  return 'User';
};

/**
 * Gets the full name for a user
 */
export const getUserFullName = (user: EnhancedUser): string => {
  if (user.google_profile?.given_name && user.google_profile?.family_name) {
    return `${user.google_profile.given_name} ${user.google_profile.family_name}`;
  }
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  if (user.first_name) {
    return user.first_name;
  }
  return getUserDisplayName(user);
};

/**
 * Gets the best available profile picture URL
 */
export const getUserProfilePicture = (user: EnhancedUser): string | null => {
  // Prefer Google profile picture
  if (user.google_profile?.picture) {
    return user.google_profile.picture;
  }
  
  // Fall back to general profile picture
  if (user.profile_picture) {
    return user.profile_picture;
  }
  
  return null;
};

/**
 * Checks if user can edit their profile information
 */
export const canEditProfile = (user: EnhancedUser): boolean => {
  // Google OAuth users cannot edit their name fields
  return user.auth_provider !== 'google';
};
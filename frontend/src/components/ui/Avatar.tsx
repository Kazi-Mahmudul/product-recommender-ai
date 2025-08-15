import React, { useState, useCallback } from 'react';
import { User } from 'lucide-react';
import { EnhancedUser } from '../../types/auth';

interface AvatarProps {
  user?: EnhancedUser;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  responsiveSize?: {
    mobile?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    desktop?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  };
  className?: string;
  showOnlineStatus?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  tabIndex?: number;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};



const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32
};

export const Avatar: React.FC<AvatarProps> = React.memo(({
  user,
  size = 'md',
  responsiveSize,
  className = '',
  showOnlineStatus = false,
  onClick,
  ariaLabel,
  tabIndex
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);

  // Get the best available profile picture URL
  const getProfilePictureUrl = useCallback((): string | null => {
    if (!user) return null;
    
    // Prefer Google profile picture
    if (user.google_profile?.picture && !imageError) {
      return user.google_profile.picture;
    }
    
    // Fall back to general profile picture
    if (user.profile_picture && !imageError) {
      return user.profile_picture;
    }
    
    return null;
  }, [user, imageError]);

  // Generate initials from user name
  const getInitials = useCallback((): string => {
    if (!user) return '?';
    
    // Try Google profile name first
    if (user.google_profile?.given_name && user.google_profile?.family_name) {
      return `${user.google_profile.given_name[0]}${user.google_profile.family_name[0]}`.toUpperCase();
    }
    
    // Try first and last name
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    
    // Try first name only
    if (user.first_name) {
      return user.first_name[0].toUpperCase();
    }
    
    // Fall back to email
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return '?';
  }, [user]);

  const profilePictureUrl = getProfilePictureUrl();
  const initials = getInitials();
  
  // Determine size classes based on responsive settings
  const getSizeClass = () => {
    if (responsiveSize) {
      const mobileSize = responsiveSize.mobile || size;
      const desktopSize = responsiveSize.desktop || size;
      return `${sizeClasses[mobileSize]} md:${sizeClasses[desktopSize].split(' ').map(cls => cls.replace('w-', 'md:w-').replace('h-', 'md:h-')).join(' ')}`;
    }
    return sizeClasses[size];
  };
  
  const sizeClass = getSizeClass();
  const iconSize = iconSizes[size];

  // Generate accessible label
  const getAriaLabel = () => {
    if (ariaLabel) return ariaLabel;
    
    const userName = user?.google_profile?.given_name || user?.first_name || user?.email?.split('@')[0] || 'User';
    return onClick ? `${userName}'s profile menu` : `${userName}'s profile picture`;
  };

  const baseClasses = `
    ${sizeClass}
    rounded-full
    flex
    items-center
    justify-center
    overflow-hidden
    transition-all
    duration-200
    relative
    focus:outline-none
    ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-brand/30 hover:scale-105 focus:ring-2 focus:ring-brand/50 focus:scale-105' : ''}
    ${className}
  `;

  return (
    <div 
      className={baseClasses} 
      onClick={onClick} 
      role={onClick ? 'button' : 'img'}
      aria-label={getAriaLabel()}
      tabIndex={onClick ? (tabIndex ?? 0) : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {profilePictureUrl && !imageError ? (
        <>
          {imageLoading && (
            <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-full" />
          )}
          <img
            src={profilePictureUrl}
            alt={`${user?.first_name || user?.email || 'User'}'s profile`}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-brand/20 to-brand/40 dark:from-brand/30 dark:to-brand/50 flex items-center justify-center">
          {user ? (
            <span 
              className={`font-semibold text-brand dark:text-brand-light ${
                size === 'xs' ? 'text-xs' :
                size === 'sm' ? 'text-sm' :
                size === 'md' ? 'text-base' :
                size === 'lg' ? 'text-lg' :
                'text-xl'
              }`}
            >
              {initials}
            </span>
          ) : (
            <User 
              size={iconSize} 
              className="text-brand dark:text-brand-light" 
            />
          )}
        </div>
      )}
      
      {/* Online status indicator */}
      {showOnlineStatus && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-neutral-800 rounded-full" />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
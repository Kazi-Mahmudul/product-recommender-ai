import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import Avatar from '../ui/Avatar';
import UserProfileModal from './UserProfileModal';
import { UserContainerProps } from '../../types/auth';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { useAuth } from '../../context/AuthContext';

interface UserContainerState {
  dropdownOpen: boolean;
  profileModalOpen: boolean;
}

export const UserContainer: React.FC<UserContainerProps> = ({
  user,
  onLogout,
  darkMode,
  className = ''
}) => {
  const [state, setState] = useState<UserContainerState>({
    dropdownOpen: false,
    profileModalOpen: false
  });

  const { isMobile } = useResponsiveLayout();
  const { updateProfile } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevIsMobile = useRef(isMobile);

  // Handle layout transitions
  useEffect(() => {
    if (prevIsMobile.current !== isMobile) {
      // Close dropdown when switching between mobile and desktop
      setState(prev => ({ ...prev, dropdownOpen: false }));
      prevIsMobile.current = isMobile;
    }
  }, [isMobile]);

  // Close dropdown when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setState(prev => ({ ...prev, dropdownOpen: false }));
    }
  }, []);

  useEffect(() => {
    if (state.dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [state.dropdownOpen, handleClickOutside]);

  // Get user display name (memoized for performance)
  const displayName = React.useMemo((): string => {
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
  }, [user.google_profile?.given_name, user.first_name, user.email]);

  const handleDropdownToggle = useCallback(() => {
    setState(prev => ({ ...prev, dropdownOpen: !prev.dropdownOpen }));
  }, []);

  const handleProfileClick = useCallback(() => {
    setState(prev => ({
      ...prev,
      dropdownOpen: false,
      profileModalOpen: true
    }));
  }, []);

  const handleLogoutClick = useCallback(() => {
    setState(prev => ({ ...prev, dropdownOpen: false }));
    onLogout();
  }, [onLogout]);

  const handleProfileModalClose = useCallback(() => {
    setState(prev => ({ ...prev, profileModalOpen: false }));
  }, []);

  const handleProfileUpdate = useCallback(async (updatedData: { first_name?: string; last_name?: string }) => {
    try {
      await updateProfile(updatedData);
      // Success - the user state will be updated automatically by the AuthContext
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error; // Re-throw so the UserProfile component can handle the error
    }
  }, [updateProfile]);



  // Mobile layout (compact for sidebar)
  if (isMobile) {
    return (
      <div className={`relative w-full ${className}`}>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 transition-all duration-300 min-w-0">
          <Avatar
            user={user}
            size="md"
            onClick={handleProfileClick}
            ariaLabel={`${displayName}'s profile`}
          />
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
              {displayName}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 break-all">
              {user.email}
            </p>
            {user.auth_provider === 'google' && (
              <div className="flex items-center gap-1 mt-1">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-red-500"></div>
                <span className="text-xs text-neutral-400">Google</span>
              </div>
            )}
          </div>
          <button
            onClick={handleDropdownToggle}
            className="p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors duration-200 flex-shrink-0"
            aria-label="User menu"
          >
            <ChevronDown
              size={16}
              className={`text-neutral-500 dark:text-neutral-400 transition-transform duration-200 ${state.dropdownOpen ? 'rotate-180' : ''
                }`}
            />
          </button>
        </div>

        {/* Mobile dropdown menu with animation */}
        {state.dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 z-50 animate-in slide-in-from-top-2 duration-200">
            <div className="py-2">
              <button
                onClick={handleProfileClick}
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors duration-200"
              >
                <UserIcon size={16} />
                View Profile
              </button>
              {user.is_admin && (
                <a
                  href="/admin/status"
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
                >
                  <UserIcon size={16} />
                  Admin Panel
                </a>
              )}
              <button
                onClick={handleLogoutClick}
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Profile Modal */}
        <UserProfileModal
          user={user}
          isOpen={state.profileModalOpen}
          onClose={handleProfileModalClose}
          darkMode={darkMode}
          onProfileUpdate={handleProfileUpdate}
        />
      </div>
    );
  }

  // Desktop layout (for navbar)
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={handleDropdownToggle}
        className="flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
        aria-label={`${displayName}'s profile menu`}
      >
        <Avatar
          user={user}
          size="md"
          ariaLabel={`${displayName}'s profile picture`}
        />
        <div className="hidden lg:block text-left">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {displayName}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {user.auth_provider === 'google' ? 'Google Account' : 'Peyechi Account'}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`text-neutral-500 dark:text-neutral-400 transition-transform duration-200 ${state.dropdownOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {/* Desktop dropdown menu with animation */}
      {state.dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 z-50 animate-in slide-in-from-top-2 duration-200">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <Avatar
                user={user}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 break-all">
                  {user.email}
                </p>
                {user.auth_provider === 'google' && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-red-500"></div>
                    <span className="text-xs text-neutral-400">Google Account</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-2">
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors duration-200"
            >
              <UserIcon size={16} />
              View Profile
            </button>
            <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
            {user.is_admin && (
              <Link
                to="/admin"
                className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
                onClick={() => setState(prev => ({ ...prev, dropdownOpen: false }))}
              >
                <UserIcon size={16} />
                Admin Panel
              </Link>
            )}
            <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
            <button
              onClick={handleLogoutClick}
              className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <UserProfileModal
        user={user}
        isOpen={state.profileModalOpen}
        onClose={handleProfileModalClose}
        darkMode={darkMode}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
};

export default UserContainer;
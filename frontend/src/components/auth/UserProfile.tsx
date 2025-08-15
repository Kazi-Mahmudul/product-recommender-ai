import React, { useState } from 'react';
import { Calendar, Mail, Shield, Clock, Globe, Edit2, Save, X } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { EnhancedUser } from '../../types/auth';

interface UserProfileProps {
  user: EnhancedUser;
  darkMode?: boolean;
  className?: string;
  onProfileUpdate?: (updatedData: Partial<EnhancedUser>) => Promise<void>;
}

interface EditableFields {
  first_name: string;
  last_name: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  darkMode = false,
  className = '',
  onProfileUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<EditableFields>({
    first_name: user.first_name || '',
    last_name: user.last_name || ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
      if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
      return `${Math.floor(diffInDays / 365)} years ago`;
    } catch {
      return 'Unknown';
    }
  };

  // Get full name
  const getFullName = (): string => {
    if (user.google_profile?.given_name && user.google_profile?.family_name) {
      return `${user.google_profile.given_name} ${user.google_profile.family_name}`;
    }
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) {
      return user.first_name;
    }
    return user.email.split('@')[0];
  };

  // Get authentication provider display
  const getAuthProviderDisplay = (): { name: string; icon: React.ReactNode } => {
    if (user.auth_provider === 'google') {
      return {
        name: 'Google Account',
        icon: <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-red-500"></div>
      };
    }
    return {
      name: 'ePick Account',
      icon: <Shield size={16} className="text-brand" />
    };
  };

  // Handle edit mode
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset data
      setEditData({
        first_name: user.first_name || '',
        last_name: user.last_name || ''
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!onProfileUpdate) return;
    
    setIsUpdating(true);
    try {
      await onProfileUpdate(editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      // Handle error (could show an alert here)
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (field: keyof EditableFields, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // Check if user can edit (not Google OAuth users for name fields)
  const canEditName = user.auth_provider !== 'google';

  const fullName = getFullName();
  const authProvider = getAuthProviderDisplay();

  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden ${className}`}>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-brand/10 to-brand/5 dark:from-brand/20 dark:to-brand/10 px-6 py-8">
        <div className="flex flex-col items-center text-center relative">
          {/* Edit button */}
          {canEditName && onProfileUpdate && (
            <div className="absolute top-0 right-0">
              {!isEditing ? (
                <button
                  onClick={handleEditToggle}
                  className="p-2 rounded-lg bg-white/50 dark:bg-neutral-800/50 hover:bg-white/70 dark:hover:bg-neutral-800/70 transition-colors duration-200"
                  aria-label="Edit profile"
                >
                  <Edit2 size={16} className="text-neutral-600 dark:text-neutral-400" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="p-2 rounded-lg bg-brand/20 hover:bg-brand/30 transition-colors duration-200 disabled:opacity-50"
                    aria-label="Save changes"
                  >
                    <Save size={16} className="text-brand" />
                  </button>
                  <button
                    onClick={handleEditToggle}
                    disabled={isUpdating}
                    className="p-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors duration-200 disabled:opacity-50"
                    aria-label="Cancel editing"
                  >
                    <X size={16} className="text-red-600 dark:text-red-400" />
                  </button>
                </div>
              )}
            </div>
          )}

          <Avatar 
            user={user}
            size="xl"
            className="mb-4"
          />
          
          {/* Editable name section */}
          {isEditing && canEditName ? (
            <div className="space-y-3 mb-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="First name"
                  className="px-3 py-2 text-center bg-white/70 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <input
                  type="text"
                  value={editData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Last name"
                  className="px-3 py-2 text-center bg-white/70 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
            </div>
          ) : (
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              {fullName}
            </h2>
          )}
          
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            {user.email}
          </p>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-neutral-800/50 rounded-full">
            {authProvider.icon}
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {authProvider.name}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="px-6 py-6 space-y-6">
        {/* Account Information */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <Shield size={16} className="text-brand" />
            Account Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Email</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {user.email}
                </span>
                {user.is_verified && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Verified" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Member Since</span>
              </div>
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {formatDate(user.created_at)}
              </span>
            </div>

            {user.last_login && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-neutral-500 dark:text-neutral-400" />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Last Login</span>
                </div>
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {formatRelativeTime(user.last_login)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Globe size={16} className="text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Authentication</span>
              </div>
              <div className="flex items-center gap-2">
                {authProvider.icon}
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {authProvider.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
            Usage Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-brand">
                {user.usage_stats?.total_searches || 0}
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                Searches
              </div>
            </div>
            
            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-brand">
                {user.usage_stats?.total_comparisons || 0}
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                Comparisons
              </div>
            </div>
          </div>
          
          {user.usage_stats?.favorite_phones && user.usage_stats.favorite_phones.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Favorite Phones
              </h4>
              <div className="flex flex-wrap gap-2">
                {user.usage_stats.favorite_phones.slice(0, 3).map((phone, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-brand/10 text-brand text-xs rounded-full"
                  >
                    {phone}
                  </span>
                ))}
                {user.usage_stats.favorite_phones.length > 3 && (
                  <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs rounded-full">
                    +{user.usage_stats.favorite_phones.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {user.usage_stats?.last_activity && (
            <div className="mt-4 text-center">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Last activity: {formatRelativeTime(user.usage_stats.last_activity)}
              </span>
            </div>
          )}
        </div>

        {/* Account Status */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Account Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${user.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {user.is_verified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
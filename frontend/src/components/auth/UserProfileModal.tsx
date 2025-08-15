import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import UserProfile from './UserProfile';
import { EnhancedUser } from '../../types/auth';

interface UserProfileModalProps {
  user: EnhancedUser;
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
  onProfileUpdate?: (updatedData: Partial<EnhancedUser>) => Promise<void>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  darkMode = false,
  onProfileUpdate
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 dark:bg-neutral-800/90 hover:bg-white dark:hover:bg-neutral-800 transition-colors duration-200 shadow-lg"
            aria-label="Close profile"
          >
            <X size={20} className="text-neutral-600 dark:text-neutral-400" />
          </button>
          
          {/* Profile Component */}
          <UserProfile
            user={user}
            darkMode={darkMode}
            onProfileUpdate={onProfileUpdate}
            className="animate-in slide-in-from-bottom-4 duration-300"
          />
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
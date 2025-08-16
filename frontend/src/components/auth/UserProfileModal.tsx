import React, { useEffect } from "react";
import { X } from "lucide-react";
import UserProfile from "./UserProfile";
import { EnhancedUser } from "../../types/auth";

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
  onProfileUpdate,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 md:pt-16 p-2 md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content - Responsive positioning */}
      <div className="relative w-full max-w-2xl max-h-[calc(100vh-2rem)] md:max-h-[calc(90vh-4rem)] overflow-y-auto">
        <div className="relative bg-white dark:bg-neutral-800 rounded-xl md:rounded-2xl shadow-2xl">
          {/* Close Button - Fixed position */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 z-20 p-2 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors duration-200 shadow-lg"
            aria-label="Close profile"
          >
            <X
              size={18}
              className="md:w-5 md:h-5 text-red-600 dark:text-red-400"
            />
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

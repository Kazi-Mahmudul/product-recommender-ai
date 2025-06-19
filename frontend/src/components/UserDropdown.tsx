import React from 'react';

interface UserDropdownProps {
  user: {    
    id: number;
    email: string;
    is_verified: boolean;
    created_at: string; };
  onLogout: () => void;
  darkMode: boolean;
}

export default function UserDropdown({ user, onLogout, darkMode }: UserDropdownProps) {
  return (
    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#232323] rounded-lg shadow-lg z-50 py-2">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <img src="https://i.ibb.co/JRrdjsrv/profile-circle.png" alt="Profile" className="w-8 h-8 rounded-full" />
        <div>
          <div className="font-semibold">{user.email}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
        </div>
      </div>
      <button
        className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-100 hover:bg-brand/10"
        onClick={() => alert('Settings coming soon!')}
      >
        Settings
      </button>
      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
      <button
        className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
        onClick={onLogout}
      >
        Logout
      </button>
    </div>
  );
}

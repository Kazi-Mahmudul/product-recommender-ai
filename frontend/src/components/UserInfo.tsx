import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserInfo() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-4 p-2 bg-gray-100 rounded-lg">
      <span className="font-semibold">{user.email}</span>
      <button onClick={logout} className="text-sm text-red-600 hover:underline">Logout</button>
    </div>
  );
} 
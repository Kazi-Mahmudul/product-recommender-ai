import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [adminData, setAdminData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.is_admin) {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/v1/admin/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin data');
      }
      
      const data = await response.json();
      setAdminData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!user.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Access Denied! </strong>
          <span className="block sm:inline">You need admin privileges to access this page.</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Admin Dashboard</h1>
        
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Admin Status</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Welcome, {user.email}! You have admin access.
          </p>
        </div>

        {adminData && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">Admin API Response</h2>
            <pre className="text-gray-700 dark:text-gray-300 text-sm mt-2 overflow-x-auto">
              {JSON.stringify(adminData, null, 2)}
            </pre>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <h3 className="font-medium text-gray-800 dark:text-gray-200">User Management</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Manage user accounts and permissions
            </p>
            <button 
              className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
              onClick={() => alert('User management would open here')}
            >
              Manage Users
            </button>
          </div>
          
          <div className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <h3 className="font-medium text-gray-800 dark:text-gray-200">Content Management</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Update phone listings and content
            </p>
            <button 
              className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
              onClick={() => alert('Content management would open here')}
            >
              Manage Content
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
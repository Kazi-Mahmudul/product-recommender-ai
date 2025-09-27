/**
 * Admin panel routing configuration
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminAuthManager } from '../services/adminApi';

// Placeholder components for other admin pages
const PhoneManagementPage: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Phone Management</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-gray-600">Phone management features will be implemented here.</p>
      <p className="text-sm text-gray-500 mt-2">
        Features: List phones, edit details, bulk updates, CSV import/export
      </p>
    </div>
  </div>
);

const UserManagementPage: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">User Management</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-gray-600">User management features will be implemented here.</p>
      <p className="text-sm text-gray-500 mt-2">
        Features: List users, view profiles, block/unblock users, session management
      </p>
    </div>
  </div>
);

const ScraperManagementPage: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Scraper Management</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-gray-600">Scraper monitoring and control features will be implemented here.</p>
      <p className="text-sm text-gray-500 mt-2">
        Features: View scraper status, trigger manual runs, view logs, manage schedules
      </p>
    </div>
  </div>
);

const AnalyticsPage: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-gray-600">Analytics and reporting features will be implemented here.</p>
      <p className="text-sm text-gray-500 mt-2">
        Features: User growth charts, popular phones, search trends, comparison analytics
      </p>
    </div>
  </div>
);

const MonitoringPage: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">System Monitoring</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-gray-600">System monitoring features will be implemented here.</p>
      <p className="text-sm text-gray-500 mt-2">
        Features: API performance, database health, error logs, system metrics
      </p>
    </div>
  </div>
);

const ActivityLogsPage: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Activity Logs</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-gray-600">Admin activity logs will be displayed here.</p>
      <p className="text-sm text-gray-500 mt-2">
        Features: Filter by admin, action type, date range; export logs
      </p>
    </div>
  </div>
);

const SettingsPage: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-gray-600">Admin settings and configuration will be available here.</p>
      <p className="text-sm text-gray-500 mt-2">
        Features: Create/manage admin accounts, system configuration, content management
      </p>
    </div>
  </div>
);

// Protected route wrapper
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = AdminAuthManager.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin routes component
export const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Login route (public) */}
      <Route path="/login" element={<AdminLogin />} />
      
      {/* Protected admin routes */}
      <Route path="/" element={
        <ProtectedAdminRoute>
          <AdminLayout />
        </ProtectedAdminRoute>
      }>
        {/* Dashboard (default) */}
        <Route index element={<AdminDashboard />} />
        
        {/* Other admin pages */}
        <Route path="phones" element={<PhoneManagementPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="scrapers" element={<ScraperManagementPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="activity" element={<ActivityLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};
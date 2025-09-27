/**
 * Admin panel layout component with sidebar navigation
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  FiHome, 
  FiDatabase, 
  FiUsers, 
  FiActivity, 
  FiSettings, 
  FiLogOut,
  FiMenu,
  FiX,
  FiMonitor,
  FiBarChart,
  FiTool
} from 'react-icons/fi';
import { adminApi, AdminAuthManager } from '../../services/adminApi';
import { AdminUser, AdminRole } from '../../types/admin';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  requiredRoles?: AdminRole[];
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <FiHome className="w-5 h-5" />,
    path: '/admin'
  },
  {
    id: 'phones',
    label: 'Phone Management',
    icon: <FiDatabase className="w-5 h-5" />,
    path: '/admin/phones'
  },
  {
    id: 'users',
    label: 'User Management',
    icon: <FiUsers className="w-5 h-5" />,
    path: '/admin/users'
  },
  {
    id: 'scrapers',
    label: 'Scrapers',
    icon: <FiTool className="w-5 h-5" />,
    path: '/admin/scrapers'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <FiBarChart className="w-5 h-5" />,
    path: '/admin/analytics'
  },
  {
    id: 'monitoring',
    label: 'System Monitor',
    icon: <FiMonitor className="w-5 h-5" />,
    path: '/admin/monitoring'
  },
  {
    id: 'activity',
    label: 'Activity Logs',
    icon: <FiActivity className="w-5 h-5" />,
    path: '/admin/activity'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <FiSettings className="w-5 h-5" />,
    path: '/admin/settings',
    requiredRoles: [AdminRole.SUPER_ADMIN]
  }
];

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrentAdmin = async () => {
      try {
        if (!AdminAuthManager.isAuthenticated()) {
          navigate('/admin/login');
          return;
        }

        const admin = await adminApi.getCurrentAdmin();
        setCurrentAdmin(admin);
      } catch (error) {
        console.error('Failed to load admin info:', error);
        AdminAuthManager.clearToken();
        navigate('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    loadCurrentAdmin();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigate('/admin/login');
    }
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const canAccessItem = (item: SidebarItem) => {
    if (!item.requiredRoles || !currentAdmin) return true;
    return item.requiredRoles.includes(currentAdmin.role);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg text-gray-600">Loading admin panel...</div>
      </div>
    );
  }

  if (!currentAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 bg-blue-600 text-white">
          <h1 className="text-xl font-bold">Peyechi Admin</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Admin Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {currentAdmin.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {currentAdmin.first_name} {currentAdmin.last_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {currentAdmin.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          {sidebarItems
            .filter(canAccessItem)
            .map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors duration-200 ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <FiLogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <FiMenu className="w-6 h-6 text-gray-600" />
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Last login: {currentAdmin.last_login ? 
                new Date(currentAdmin.last_login).toLocaleString() : 
                'First login'
              }
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Outlet />
        </main>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
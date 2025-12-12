import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Smartphone,
    Settings,
    LogOut,
    ChevronLeft,
    GitCompare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Check authentication and admin status
    useEffect(() => {
        // If not logged in, redirect to login
        if (!user) {
            navigate('/login', { replace: true });
            return;
        }

        // If logged in but not admin, redirect to home with error
        if (!user.is_admin) {
            alert('Access Denied: Admin privileges required');
            navigate('/', { replace: true });
            return;
        }
    }, [user, navigate]);

    // Show loading or nothing while checking auth
    if (!user || !user.is_admin) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-gray-600 dark:text-gray-400">Verifying access...</div>
            </div>
        );
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { path: '/admin/users', icon: Users, label: 'Users' },
        { path: '/admin/phones', icon: Smartphone, label: 'Phones' },
        { path: '/admin/comparisons', icon: GitCompare, label: 'Comparisons' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-xl">
                        P
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white text-lg">Admin Panel</span>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive
                                    ? 'bg-brand text-white shadow-md'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                }
              `}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <NavLink
                        to="/"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200"
                    >
                        <ChevronLeft size={20} />
                        <span className="font-medium">Back to Site</span>
                    </NavLink>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;

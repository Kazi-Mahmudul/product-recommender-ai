import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Home, MessageCircle, Smartphone, LogIn, UserPlus } from 'lucide-react';
import UserContainer from './auth/UserContainer';
import AuthErrorBoundary from './auth/AuthErrorBoundary';
import { EnhancedUser } from '../types/auth';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user?: EnhancedUser | null;
  darkMode?: boolean;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  user,
  darkMode = false,
  onLogout
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/', label: 'Home', icon: <Home size={20} /> },
    { path: '/chat', label: 'AI-Chat', icon: <MessageCircle size={20} /> },
    { path: '/phones', label: 'Phones', icon: <Smartphone size={20} /> },
    { path: '/compare', label: 'Compare', icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  ];

  const authItems = [
    { path: '/login', label: 'Login', icon: <LogIn size={20} /> },
    { path: '/signup', label: 'Signup', icon: <UserPlus size={20} /> },
  ];

  return (
    <div className={`fixed inset-0 z-40 transition-all duration-300 md:hidden ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>

      <aside className={`relative h-full max-w-[280px] w-[75vw] bg-white dark:bg-card shadow-soft-xl p-0 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
            <span className="font-bold text-xl bg-gradient-to-r from-brand to-brand-darkGreen bg-clip-text text-transparent">Peyechi</span>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* User Container for Mobile */}
          {user && onLogout && (
            <div className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <AuthErrorBoundary>
                <UserContainer
                  user={user}
                  onLogout={onLogout}
                  darkMode={darkMode}
                  className="w-full"
                />
              </AuthErrorBoundary>
            </div>
          )}

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-2 px-4">
              {menuItems.map(item => (
                <li key={item.path}>
                  <button
                    className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl transition-all duration-200 ${isActive(item.path)
                        ? 'bg-brand text-white font-medium shadow-md'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    onClick={() => { onClose(); navigate(item.path); }}
                  >
                    <span className={isActive(item.path) ? 'text-white' : 'text-brand'}>{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}

              {!user && (
                <>
                  <li className="pt-4 pb-2">
                    <div className="h-px bg-neutral-200 dark:bg-neutral-800"></div>
                  </li>

                  {authItems.map(item => (
                    <li key={item.path}>
                      <button
                        className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl transition-all duration-200 ${isActive(item.path)
                            ? 'bg-brand text-white font-medium shadow-md'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                        onClick={() => { onClose(); navigate(item.path); }}
                      >
                        <span className={isActive(item.path) ? 'text-white' : 'text-brand'}>{item.icon}</span>
                        {item.label}
                      </button>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              © 2025 Peyechi. All rights reserved.
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;

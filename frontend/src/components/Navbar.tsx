import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import UserDropdown from './UserDropdown';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onMenuClick?: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick, darkMode, setDarkMode }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Click outside to close dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Helper to determine if a route is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="w-full flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-[#232323]/80 backdrop-blur-md shadow-sm fixed top-0 left-0 z-30">
      <div className="flex items-center space-x-2">
        <button className="md:hidden mr-2" onClick={onMenuClick} aria-label="Open menu">
          <span className="block w-6 h-0.5 bg-gray-800 dark:bg-gray-200 mb-1"></span>
          <span className="block w-6 h-0.5 bg-gray-800 dark:bg-gray-200 mb-1"></span>
          <span className="block w-6 h-0.5 bg-gray-800 dark:bg-gray-200"></span>
        </button>
        <span className="font-bold text-lg tracking-tight">ePick</span>
      </div>
      <ul className="hidden md:flex space-x-8 font-medium text-gray-700 dark:text-gray-100">
        <li>
          <Link
            to="/"
            className={
              isActive('/')
                ? 'text-brand font-bold border-b-2 border-brand pb-1'
                : 'hover:text-brand transition-colors'
            }
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/chat"
            className={
              isActive('/chat')
                ? 'text-brand font-bold border-b-2 border-brand pb-1'
                : 'hover:text-brand transition-colors'
            }
          >
            Chat
          </Link>
        </li>
      </ul>
      <div className="flex items-center space-x-4 relative">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'} transition-colors`}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(v => !v)} className="focus:outline-none">
              <img src="https://i.ibb.co/JRrdjsrv/profile-circle.png" alt="Profile" className="w-9 h-9 rounded-full border-2 border-brand" />
            </button>
            {dropdownOpen && (
              <UserDropdown user={user} onLogout={logout} darkMode={darkMode} />
            )}
          </div>
        ) : (
          <div className="hidden md:block relative">
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className={`rounded-lg px-4 py-2 font-semibold text-white text-sm ${['/login','/signup'].includes(location.pathname) ? 'bg-brand' : ''}`}
              style={{ background: ['/', '/login', '/signup'].includes(location.pathname) ? '#d4a88d' : undefined }}
            >
              Login / Signup
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#232323] rounded-lg shadow-lg z-50">
                <button
                  className={`block w-full text-left px-4 py-2 hover:bg-brand/10 ${location.pathname === '/login' ? 'font-bold text-brand' : ''}`}
                  onClick={() => { setDropdownOpen(false); navigate('/login'); }}
                >
                  Login
                </button>
                <button
                  className={`block w-full text-left px-4 py-2 hover:bg-brand/10 ${location.pathname === '/signup' ? 'font-bold text-brand' : ''}`}
                  onClick={() => { setDropdownOpen(false); navigate('/signup'); }}
                >
                  Signup
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

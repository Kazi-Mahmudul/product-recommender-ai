import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  return (
    <div className={`fixed inset-0 z-40 transition-transform duration-300 md:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose}></div>
      <aside className="relative bg-white dark:bg-[#232323] w-40 m-2 rounded-lg h-fit shadow-lg p-6 flex flex-col">
        <button className="self-end mb-8" onClick={onClose} aria-label="Close menu">
          <span className="block w-6 h-0.5 bg-gray-800 dark:bg-gray-200 mb-1"></span>
          <span className="block w-6 h-0.5 bg-gray-800 dark:bg-gray-200 mb-1"></span>
        </button>
        <ul className="space-y-6 font-medium text-lg text-gray-900 dark:text-gray-100">
          <li>
            <button
              className={`w-full text-left px-2 py-2 rounded ${isActive('/') ? 'text-brand font-bold border-l-4 border-brand bg-brand/10 dark:bg-[#2d2320]' : ''}`}
              onClick={() => { onClose(); navigate('/'); }}
            >
              Home
            </button>
          </li>
          <li>
            <button
              className={`w-full text-left px-2 py-2 rounded ${isActive('/chat') ? 'text-brand font-bold border-l-4 border-brand bg-brand/10 dark:bg-[#2d2320]' : ''}`}
              onClick={() => { onClose(); navigate('/chat'); }}
            >
              Chat
            </button>
          </li>
          {!user && (
            <>
              <li>
                <button
                  className={`w-full text-left px-2 py-2 rounded ${isActive('/login') ? 'text-brand font-bold border-l-4 border-brand bg-brand/10 dark:bg-[#2d2320]' : ''}`}
                  onClick={() => { onClose(); navigate('/login'); }}
                >
                  Login
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-2 py-2 rounded ${isActive('/signup') ? 'text-brand font-bold border-l-4 border-brand bg-brand/10 dark:bg-[#2d2320]' : ''}`}
                  onClick={() => { onClose(); navigate('/signup'); }}
                >
                  Signup
                </button>
              </li>
            </>
          )}
        </ul>
      </aside>
    </div>
  );
};

export default Sidebar;

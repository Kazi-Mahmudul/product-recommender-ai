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
  return (
    <div className={`fixed inset-0 z-40 transition-transform duration-300 md:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose}></div>
      <aside className="relative bg-white w-64 h-full shadow-lg p-6 flex flex-col">
        <button className="self-end mb-8" onClick={onClose} aria-label="Close menu">
          <span className="block w-6 h-0.5 bg-gray-800 mb-1"></span>
          <span className="block w-6 h-0.5 bg-gray-800 mb-1"></span>
        </button>
        <ul className="space-y-6 font-medium text-lg">
          <li><a href="#home" onClick={onClose}>Home</a></li>
          <li><a href="#smartphones" onClick={onClose}>Smartphones</a></li>
          <li><a href="#about" onClick={onClose}>About</a></li>
          <li><a href="#coming-soon" onClick={onClose}>Coming Soon</a></li>
          {!user && (
            <>
              <li>
                <button
                  className={`w-full text-left px-2 py-2 rounded ${location.pathname === '/login' ? 'bg-brand text-white' : ''}`}
                  onClick={() => { onClose(); navigate('/login'); }}
                >
                  Login
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-2 py-2 rounded ${location.pathname === '/signup' ? 'bg-brand text-white' : ''}`}
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

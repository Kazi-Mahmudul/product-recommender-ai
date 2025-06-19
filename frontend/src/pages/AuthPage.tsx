import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/AuthModal';

export default function AuthPage({ darkMode }: { darkMode?: boolean }) {
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const navigate = useNavigate();
  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center ${darkMode ? 'bg-[#121212]' : 'bg-[#fdfbf9]'}`}>
      <div className="w-full max-w-md mx-auto">
        <AuthModal mode={mode} onClose={() => navigate('/')} onSwitch={setMode} />
      </div>
    </div>
  );
}

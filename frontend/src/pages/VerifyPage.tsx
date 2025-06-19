import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface VerifyPageProps { darkMode: boolean; }
export default function VerifyPage({ darkMode }: VerifyPageProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { verify } = useAuth();
  const email = new URLSearchParams(location.search).get('email') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await verify(email, code);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfbf9] dark:bg-[#121212]">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-8 bg-white dark:bg-[#232323] rounded-xl shadow-xl flex flex-col gap-4">
        <h2 className="text-2xl font-bold mb-2 text-center text-brand">Verify Your Email</h2>
        <div className="text-center text-sm mb-2">Verification code sent to <span className="font-semibold">{email}</span></div>
        <input type="text" name="code" placeholder="6-digit code" value={code} onChange={e => setCode(e.target.value)} className="rounded-lg border px-4 py-2 bg-transparent text-center tracking-widest" maxLength={6} />
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        <button type="submit" className="rounded-lg py-2 font-semibold text-white" style={{background: '#d4a88d'}} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify'}
        </button>
        {success && <div className="text-green-600 text-center mt-2">Email verified! Redirecting to login...</div>}
      </form>
    </div>
  );
}

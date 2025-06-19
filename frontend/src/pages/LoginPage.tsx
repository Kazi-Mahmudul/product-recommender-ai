import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FcGoogle } from 'react-icons/fc';

interface LoginPageProps { darkMode: boolean; }
export default function LoginPage({ darkMode }: LoginPageProps) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfbf9] dark:bg-[#121212]">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-8 bg-white dark:bg-[#232323] rounded-xl shadow-xl flex flex-col gap-4">
        <h2 className="text-2xl font-bold mb-2 text-center text-brand">Login to ePick</h2>
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="rounded-lg border px-4 py-2 bg-transparent" autoFocus />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="rounded-lg border px-4 py-2 bg-transparent" />
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        <button
          type="button"
          className="rounded-lg py-2 font-semibold flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#232323] text-gray-800 dark:text-white"
          style={{ marginBottom: '0.5rem' }}
          disabled={loading}
        >
          {/* Workaround for react-icons v5+ and TS: use as function, not JSX component */}
          {require('react-icons/fc').FcGoogle({ className: 'text-xl' })} Continue with Google
        </button>
        <button type="submit" className="rounded-lg py-2 font-semibold text-white" style={{background: '#d4a88d'}} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <div className="text-center text-sm mt-2">
          Don't have an account?{' '}
          <button type="button" className="text-brand hover:underline" style={{color: '#d4a88d'}} onClick={() => navigate('/signup')}>
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FcGoogle } from 'react-icons/fc';

interface SignupPageProps { darkMode: boolean; }
export default function SignupPage({ darkMode }: SignupPageProps) {
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signup(form.email, form.password, form.confirm);
      navigate(`/verify?email=${encodeURIComponent(form.email)}`);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfbf9] dark:bg-[#121212]">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-8 bg-white dark:bg-[#232323] rounded-xl shadow-xl flex flex-col gap-4">
        <h2 className="text-2xl font-bold mb-2 text-center text-brand">Sign Up for ePick</h2>
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="rounded-lg border px-4 py-2 bg-transparent" autoFocus />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="rounded-lg border px-4 py-2 bg-transparent" />
        <input type="password" name="confirm" placeholder="Confirm Password" value={form.confirm} onChange={handleChange} className="rounded-lg border px-4 py-2 bg-transparent" />
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        <button type="submit" className="rounded-lg py-2 font-semibold text-white" style={{background: '#d4a88d'}} disabled={loading}>
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
        <div className="text-center text-sm mt-2">
          Already have an account?{' '}
          <button type="button" className="text-brand hover:underline" style={{color: '#d4a88d'}} onClick={() => navigate('/login')}>
            Login
          </button>
        </div>
      </form>
    </div>
  );
}

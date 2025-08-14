import React, { useState } from 'react';
// You can swap these for your own icon components or SVGs
import { FcGoogle } from 'react-icons/fc';
import { GoogleLogin } from '@react-oauth/google';
import { handleOAuthSuccess, handleOAuthError } from '../utils/oauthErrorHandler';

interface AuthModalProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  onSwitch: (mode: 'login' | 'signup') => void;
}

const brandColor = '#d4a88d';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;

export default function AuthModal({ mode, onClose, onSwitch }: AuthModalProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    code: '',
  });
  const [step, setStep] = useState<'form'|'verify'>('form');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  // Simulate API calls for demo
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (mode === 'login') {
      if (!emailRegex.test(form.email)) {
        setError('Enter a valid email.'); setLoading(false); return;
      }
      if (!passwordRegex.test(form.password)) {
        setError('Password must be 6+ chars, 1 special char.'); setLoading(false); return;
      }
      // TODO: Call backend login API
      setTimeout(() => {
        setLoading(false);
        setSuccessMsg('Login successful!');
        onClose();
      }, 1200);
    } else {
      // Signup validation
      if (!form.name.trim()) { setError('Name required.'); setLoading(false); return; }
      if (!emailRegex.test(form.email)) { setError('Email invalid.'); setLoading(false); return; }
      if (!passwordRegex.test(form.password)) { setError('Password must be 6+ chars, 1 special char.'); setLoading(false); return; }
      if (form.password !== form.confirm) { setError('Passwords do not match.'); setLoading(false); return; }
      // TODO: Call backend signup API and send verification code
      setTimeout(() => {
        setLoading(false);
        setStep('verify');
      }, 1200);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Call backend verify API
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg('Email verified! You can now log in.');
      onClose();
    }, 1200);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    const success = await handleOAuthSuccess(
      credentialResponse,
      setLoading,
      setError,
      undefined,
      () => {
        setSuccessMsg('Google authentication successful!');
        onClose();
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white dark:bg-[#232323] rounded-xl shadow-xl w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-gray-700 dark:hover:text-white">&times;</button>
        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold mb-2 text-center" style={{color: brandColor}}>{mode === 'login' ? 'Login to ePick' : 'Sign Up for ePick'}</h2>
            {mode === 'signup' && (
              <input type="text" name="name" placeholder="Name" value={form.name} onChange={handleChange} className="rounded-lg border px-4 py-2 bg-transparent" autoFocus />
            )}
            <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="rounded-lg border px-4 py-2 bg-transparent" autoFocus={mode==='login'} />
            <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="rounded-lg border px-4 py-2 bg-transparent" />
            {mode === 'signup' && (
              <input type="password" name="confirm" placeholder="Confirm Password" value={form.confirm} onChange={handleChange} className="rounded-lg border px-4 py-2 bg-transparent" />
            )}
            {mode === 'login' && (
              <div className="flex justify-end text-xs">
                <a href="#" className="text-brand hover:underline" style={{color: brandColor}}>Forgot Password?</a>
              </div>
            )}
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            <button type="submit" className="rounded-lg py-2 font-semibold text-white" style={{background: brandColor}} disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign Up'}
            </button>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => handleOAuthError("Google authentication failed", setError)}
              useOneTap={false}
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
            />
            <div className="text-center text-sm mt-2">
              {mode === 'login' ? (
                <>Don't have an account? <button type="button" className="text-brand hover:underline" style={{color: brandColor}} onClick={() => onSwitch('signup')}>Sign Up</button></>
              ) : (
                <>Already have an account? <button type="button" className="text-brand hover:underline" style={{color: brandColor}} onClick={() => onSwitch('login')}>Login</button></>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold mb-2 text-center" style={{color: brandColor}}>Verify Your Email</h2>
            <input type="text" name="code" placeholder="Verification Code" value={form.code} onChange={handleChange} className="rounded-lg border px-4 py-2 bg-transparent" />
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            <button type="submit" className="rounded-lg py-2 font-semibold text-white" style={{background: brandColor}} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        )}
        {successMsg && <div className="text-green-600 text-center mt-2">{successMsg}</div>}
      </div>
    </div>
  );
}

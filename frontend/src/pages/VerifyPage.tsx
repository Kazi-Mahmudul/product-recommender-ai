import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthAlerts } from '../hooks/useAuthAlerts';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

interface VerifyPageProps { darkMode: boolean; }
export default function VerifyPage({ darkMode }: VerifyPageProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { verify } = useAuth();
  const authAlerts = useAuthAlerts(darkMode);
  const email = new URLSearchParams(location.search).get('email') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await verify(email, code);
      setSuccess(true);
      await authAlerts.showVerificationSuccess();
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      await authAlerts.showAuthError(err.message || 'Verification failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand/5 via-white to-brand-darkGreen/10 dark:from-brand/20 dark:via-gray-900 dark:to-brand-darkGreen/20 px-4">
      {/* Decorative elements */}
      <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-brand/10 filter blur-3xl -z-10 animate-float"></div>
      <div className="absolute bottom-20 right-1/4 w-64 h-64 rounded-full bg-brand-darkGreen/10 filter blur-3xl -z-10 animate-float" style={{ animationDelay: '2s' }}></div>
      
      <div className="w-full max-w-md relative">
        <Link to="/" className="absolute -top-12 left-0 flex items-center gap-1 text-brand hover:text-brand-darkGreen transition-colors duration-200">
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </Link>
        
        <form onSubmit={handleSubmit} className="w-full p-8 bg-white dark:bg-neutral-900 rounded-3xl shadow-soft-lg flex flex-col gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand/5 rounded-full filter blur-3xl -z-10"></div>
          
          <div className="flex flex-col items-center justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
              <Mail size={28} className="text-brand" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-white">Verify Your Email</h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
              We've sent a verification code to <span className="font-medium">{email}</span>
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Verification Code</label>
              <input 
                type="text" 
                id="code" 
                name="code" 
                placeholder="Enter 6-digit code" 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30 text-center tracking-widest" 
                maxLength={6}
                autoFocus 
              />
            </div>
          </div>
          
          {error && <div className="text-semantic-danger text-sm text-center bg-semantic-danger/10 py-2 px-3 rounded-lg">{error}</div>}
          
          {success ? (
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <div className="w-12 h-12 rounded-full bg-semantic-success/10 flex items-center justify-center">
                <CheckCircle size={24} className="text-semantic-success" />
              </div>
              <p className="text-semantic-success font-medium">Email verified! Redirecting to login...</p>
            </div>
          ) : (
            <button 
              type="submit" 
              className="rounded-xl py-3 font-medium text-white bg-brand hover:bg-brand-darkGreen hover:text-hover-light transition-colors duration-200 shadow-sm" 
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          )}
          
          <div className="text-center text-sm mt-2">
            Didn't receive a code?{' '}
            <button type="button" className="text-brand hover:text-brand-darkGreen transition-colors duration-200 font-medium">
              Resend Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

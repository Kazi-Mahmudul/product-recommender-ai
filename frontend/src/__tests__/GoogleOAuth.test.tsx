import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import AuthModal from '../components/AuthModal';
import { AuthProvider } from '../context/AuthContext';
import '@testing-library/jest-dom';

// Mock environment variables
const mockEnv = {
  REACT_APP_GOOGLE_CLIENT_ID: 'test-client-id',
  REACT_APP_API_BASE: 'http://localhost:8000'
};

Object.defineProperty(process, 'env', {
  value: mockEnv
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <GoogleOAuthProvider clientId="test-client-id">
    <AuthProvider>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </AuthProvider>
  </GoogleOAuthProvider>
);

describe('Google OAuth Integration', () => {
  test('LoginPage renders without errors', () => {
    render(
      <TestWrapper>
        <LoginPage darkMode={false} />
      </TestWrapper>
    );
    
    // Check that the page renders the expected heading
    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
  });

  test('SignupPage renders without errors', () => {
    render(
      <TestWrapper>
        <SignupPage darkMode={false} />
      </TestWrapper>
    );
    
    // Check that the page renders the expected heading
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
  });

  test('AuthModal renders without errors', () => {
    const mockOnClose = jest.fn();
    const mockOnSwitch = jest.fn();
    
    render(
      <TestWrapper>
        <AuthModal mode="login" onClose={mockOnClose} onSwitch={mockOnSwitch} />
      </TestWrapper>
    );
    
    // Check that the modal renders the expected heading
    expect(screen.getByRole('heading', { name: 'Login to Peyechi' })).toBeInTheDocument();
  });

  test('OAuth error handler provides user-friendly messages', () => {
    const { getOAuthErrorMessage } = require('../utils/oauthErrorHandler');
    
    expect(getOAuthErrorMessage({ error: 'popup_closed_by_user' }))
      .toBe('Sign-in was cancelled. Please try again.');
    
    expect(getOAuthErrorMessage({ error: 'access_denied' }))
      .toBe('Access was denied. Please try again.');
    
    expect(getOAuthErrorMessage({ status: 401 }))
      .toBe('Authentication failed. Please try again.');
    
    expect(getOAuthErrorMessage('Custom error message'))
      .toBe('Custom error message');
  });

  test('OAuth availability check works', () => {
    const { isGoogleOAuthAvailable } = require('../utils/oauthErrorHandler');
    
    // Mock window.google
    (window as any).google = { accounts: {} };
    
    expect(isGoogleOAuthAvailable()).toBe(true);
    
    // Clean up
    delete (window as any).google;
  });
});
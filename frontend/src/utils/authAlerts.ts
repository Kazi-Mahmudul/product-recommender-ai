import Swal from 'sweetalert2';
import { AuthAlertConfig, AlertTheme } from '../types/auth';

// Brand colors matching the product theme
const BRAND_COLOR = '#377D5B'; // PeyechiGreen - matches Tailwind config
const BRAND_DARK = '#2d6249'; // Darker shade of PeyechiGreen

// SweetAlert2 theme configuration matching product branding
export const alertTheme: AlertTheme = {
  brandColor: BRAND_COLOR,
  backgroundColor: '#ffffff',
  textColor: '#374151',
  borderRadius: '12px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  customClass: {
    container: 'peyechi-alert-container',
    popup: 'peyechi-alert-popup',
    title: 'peyechi-alert-title',
    content: 'peyechi-alert-content',
    confirmButton: 'peyechi-alert-confirm',
    cancelButton: 'peyechi-alert-cancel'
  }
};

// Dark mode theme configuration
export const darkAlertTheme: AlertTheme = {
  ...alertTheme,
  backgroundColor: '#1f2937',
  textColor: '#f9fafb'
};

// Base SweetAlert2 configuration
export const baseAlertConfig = {
  customClass: alertTheme.customClass,
  buttonsStyling: false,
  showClass: {
    popup: 'animate__animated animate__fadeInDown animate__faster'
  },
  hideClass: {
    popup: 'animate__animated animate__fadeOutUp animate__faster'
  }
};

// Create themed SweetAlert2 instance
export const createThemedAlert = (darkMode: boolean = false) => {
  const theme = darkMode ? darkAlertTheme : alertTheme;
  
  return Swal.mixin({
    ...baseAlertConfig,
    background: theme.backgroundColor,
    color: theme.textColor,
    customClass: {
      ...theme.customClass,
      confirmButton: `${theme.customClass.confirmButton} bg-[${theme.brandColor}] hover:bg-[${BRAND_DARK}] text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200`,
      cancelButton: `${theme.customClass.cancelButton} bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 mr-2`
    }
  });
};

// Utility function to show themed alerts
export const showAlert = (config: AuthAlertConfig, darkMode: boolean = false) => {
  const ThemedSwal = createThemedAlert(darkMode);
  
  return ThemedSwal.fire({
    icon: config.type,
    title: config.title,
    text: config.message,
    showConfirmButton: config.showConfirmButton ?? true,
    timer: config.timer,
    customClass: config.customClass ? { ...baseAlertConfig.customClass, ...config.customClass } : baseAlertConfig.customClass
  });
};

// Predefined alert templates for common authentication scenarios
export const alertTemplates = {
  loginSuccess: (userName?: string): AuthAlertConfig => ({
    type: 'success',
    title: 'Welcome back!',
    message: userName ? `Hello ${userName}, you're successfully logged in.` : 'You have successfully logged in to Peyechi.',
    timer: 3000,
    showConfirmButton: false
  }),

  signupSuccess: (userName?: string): AuthAlertConfig => ({
    type: 'success',
    title: 'Account Created!',
    message: userName ? `Welcome to Peyechi, ${userName}! Your account has been created successfully.` : 'Your account has been created successfully. Welcome to Peyechi!',
    timer: 4000,
    showConfirmButton: false
  }),

  googleLoginSuccess: (userName?: string): AuthAlertConfig => ({
    type: 'success',
    title: 'Google Sign-in Successful!',
    message: userName ? `Welcome ${userName}! You're now signed in with Google.` : 'You have successfully signed in with Google.',
    timer: 3000,
    showConfirmButton: false
  }),

  logoutConfirmation: (): AuthAlertConfig => ({
    type: 'warning',
    title: 'Sign Out',
    message: 'Are you sure you want to sign out of your account?',
    showConfirmButton: true
  }),

  logoutSuccess: (): AuthAlertConfig => ({
    type: 'success',
    title: 'Signed Out',
    message: 'You have been successfully signed out. See you next time!',
    timer: 2500,
    showConfirmButton: false
  }),

  authenticationError: (message?: string): AuthAlertConfig => ({
    type: 'error',
    title: 'Authentication Failed',
    message: message || 'Unable to authenticate. Please check your credentials and try again.',
    showConfirmButton: true
  }),

  networkError: (): AuthAlertConfig => ({
    type: 'error',
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    showConfirmButton: true
  }),

  tokenExpired: (): AuthAlertConfig => ({
    type: 'warning',
    title: 'Session Expired',
    message: 'Your session has expired. Please sign in again to continue.',
    showConfirmButton: true
  }),

  profileUpdateSuccess: (): AuthAlertConfig => ({
    type: 'success',
    title: 'Profile Updated',
    message: 'Your profile has been updated successfully.',
    timer: 2500,
    showConfirmButton: false
  }),

  verificationSuccess: (): AuthAlertConfig => ({
    type: 'success',
    title: 'Email Verified!',
    message: 'Your email has been verified successfully. You can now access all features.',
    timer: 3000,
    showConfirmButton: false
  })
};

// Enhanced alert functions with confirmation support
export const showConfirmationAlert = async (
  config: AuthAlertConfig,
  darkMode: boolean = false
): Promise<boolean> => {
  const ThemedSwal = createThemedAlert(darkMode);
  
  const result = await ThemedSwal.fire({
    icon: config.type,
    title: config.title,
    text: config.message,
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'Cancel',
    customClass: config.customClass ? { ...baseAlertConfig.customClass, ...config.customClass } : baseAlertConfig.customClass
  });
  
  return result.isConfirmed;
};

// Quick access functions for common alerts
export const authAlerts = {
  showLoginSuccess: (userName?: string, darkMode: boolean = false) => 
    showAlert(alertTemplates.loginSuccess(userName), darkMode),
    
  showSignupSuccess: (userName?: string, darkMode: boolean = false) => 
    showAlert(alertTemplates.signupSuccess(userName), darkMode),
    
  showGoogleLoginSuccess: (userName?: string, darkMode: boolean = false) => 
    showAlert(alertTemplates.googleLoginSuccess(userName), darkMode),
    
  showLogoutSuccess: (darkMode: boolean = false) => 
    showAlert(alertTemplates.logoutSuccess(), darkMode),
    
  showAuthError: (message?: string, darkMode: boolean = false) => 
    showAlert(alertTemplates.authenticationError(message), darkMode),
    
  showNetworkError: (darkMode: boolean = false) => 
    showAlert(alertTemplates.networkError(), darkMode),
    
  showTokenExpired: (darkMode: boolean = false) => 
    showAlert(alertTemplates.tokenExpired(), darkMode),
    
  showProfileUpdateSuccess: (darkMode: boolean = false) => 
    showAlert(alertTemplates.profileUpdateSuccess(), darkMode),
    
  showVerificationSuccess: (darkMode: boolean = false) => 
    showAlert(alertTemplates.verificationSuccess(), darkMode),
    
  confirmLogout: (darkMode: boolean = false) => 
    showConfirmationAlert(alertTemplates.logoutConfirmation(), darkMode)
};
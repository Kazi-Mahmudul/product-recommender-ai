/**
 * Utility to validate Google Client ID
 */

export const validateGoogleClientId = async (clientId: string): Promise<{
  isValid: boolean;
  error?: string;
  details?: any;
}> => {
  try {
    // Make a request to Google's OAuth2 discovery document
    const response = await fetch(`https://accounts.google.com/.well-known/openid_configuration`);
    
    if (!response.ok) {
      return {
        isValid: false,
        error: 'Unable to reach Google OAuth service'
      };
    }

    // Basic client ID format validation
    const clientIdPattern = /^\d+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/;
    
    if (!clientIdPattern.test(clientId)) {
      return {
        isValid: false,
        error: 'Client ID format is invalid'
      };
    }

    // Try to validate the client ID by making a request to Google's tokeninfo endpoint
    // Note: This is a basic check and might not catch all issues
    try {
      const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?client_id=${clientId}`);
      
      if (tokenInfoResponse.status === 400) {
        const errorData = await tokenInfoResponse.json();
        if (errorData.error === 'invalid_client') {
          return {
            isValid: false,
            error: 'Client ID is invalid or deleted',
            details: errorData
          };
        }
      }
    } catch (e) {
      // This endpoint might not be available for validation, so we'll continue
    }

    return {
      isValid: true
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Validation failed: ${error}`,
      details: error
    };
  }
};

export const testCurrentClientId = async (): Promise<void> => {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  
  console.log('🔍 Testing Google Client ID...');
  console.log(`Client ID: ${clientId}`);
  
  if (!clientId) {
    console.error('❌ No client ID found in environment variables');
    return;
  }

  const result = await validateGoogleClientId(clientId);
  
  if (result.isValid) {
    console.log('✅ Client ID appears to be valid');
  } else {
    console.error('❌ Client ID validation failed:', result.error);
    if (result.details) {
      console.error('Details:', result.details);
    }
  }
};
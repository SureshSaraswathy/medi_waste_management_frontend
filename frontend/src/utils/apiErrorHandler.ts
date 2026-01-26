/**
 * Global API error handler
 * Handles authentication errors and redirects to login
 */

export const handleApiError = (error: any, redirectToLogin: () => void): string => {
  const errorMessage = error?.message || 'An error occurred';
  const status = error?.status;

  // Check for authentication errors
  if (
    errorMessage.includes('not authenticated') ||
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('401') ||
    errorMessage.includes('403') ||
    status === 401 ||
    status === 403
  ) {
    // Clear invalid auth data
    localStorage.removeItem('mw-auth-user');
    // Redirect to login
    redirectToLogin();
    return 'Session expired. Please login again.';
  }

  return errorMessage;
};

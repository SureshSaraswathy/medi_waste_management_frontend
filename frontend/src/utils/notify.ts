import toast, { Toast } from 'react-hot-toast';

/**
 * Global notification utility for the application
 * Uses react-hot-toast with custom styling to match admin dashboard design
 */

/**
 * Show a success notification
 * @param message - Success message to display
 * @returns Toast ID for programmatic control
 */
export const notifySuccess = (message: string): string => {
  return toast.success(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      borderRadius: '8px',
      background: '#ffffff',
      color: '#1e293b',
      padding: '12px 16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid #d1fae5',
      borderLeft: '4px solid #10b981',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '400px',
    },
    iconTheme: {
      primary: '#10b981',
      secondary: '#ffffff',
    },
  });
};

/**
 * Show an error notification
 * @param message - Error message to display
 * @returns Toast ID for programmatic control
 */
export const notifyError = (message: string): string => {
  return toast.error(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      borderRadius: '8px',
      background: '#ffffff',
      color: '#1e293b',
      padding: '12px 16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid #fee2e2',
      borderLeft: '4px solid #ef4444',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '400px',
    },
    iconTheme: {
      primary: '#ef4444',
      secondary: '#ffffff',
    },
  });
};

/**
 * Show a warning notification
 * @param message - Warning message to display
 * @returns Toast ID for programmatic control
 */
export const notifyWarning = (message: string): string => {
  return toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: '⚠️',
    style: {
      borderRadius: '8px',
      background: '#ffffff',
      color: '#1e293b',
      padding: '12px 16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid #fed7aa',
      borderLeft: '4px solid #f97316',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '400px',
    },
  });
};

/**
 * Show an info notification
 * @param message - Info message to display
 * @returns Toast ID for programmatic control
 */
export const notifyInfo = (message: string): string => {
  return toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      borderRadius: '8px',
      background: '#ffffff',
      color: '#1e293b',
      padding: '12px 16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid #dbeafe',
      borderLeft: '4px solid #3b82f6',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '400px',
    },
  });
};

/**
 * Show a loading notification
 * @param message - Loading message to display
 * @returns Toast ID for programmatic control (use this to update/dismiss)
 */
export const notifyLoading = (message: string): string => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      borderRadius: '8px',
      background: '#ffffff',
      color: '#1e293b',
      padding: '12px 16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid #e2e8f0',
      borderLeft: '4px solid #64748b',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '400px',
    },
  });
};

/**
 * Update an existing toast (useful for loading -> success/error transitions)
 * @param toastId - The toast ID returned from notifyLoading or other functions
 * @param message - New message
 * @param type - New toast type ('success', 'error', 'warning', 'info')
 */
export const notifyUpdate = (
  toastId: string,
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'success'
): void => {
  const config = {
    duration: 4000,
    style: {
      borderRadius: '8px',
      background: '#ffffff',
      color: '#1e293b',
      padding: '12px 16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '400px',
    } as React.CSSProperties,
  };

  switch (type) {
    case 'success':
      toast.success(message, {
        ...config,
        id: toastId,
        style: {
          ...config.style,
          border: '1px solid #d1fae5',
          borderLeft: '4px solid #10b981',
        },
        iconTheme: {
          primary: '#10b981',
          secondary: '#ffffff',
        },
      });
      break;
    case 'error':
      toast.error(message, {
        ...config,
        id: toastId,
        style: {
          ...config.style,
          border: '1px solid #fee2e2',
          borderLeft: '4px solid #ef4444',
        },
        iconTheme: {
          primary: '#ef4444',
          secondary: '#ffffff',
        },
      });
      break;
    case 'warning':
      toast(message, {
        ...config,
        id: toastId,
        icon: '⚠️',
        style: {
          ...config.style,
          border: '1px solid #fed7aa',
          borderLeft: '4px solid #f97316',
        },
      });
      break;
    case 'info':
      toast(message, {
        ...config,
        id: toastId,
        icon: 'ℹ️',
        style: {
          ...config.style,
          border: '1px solid #dbeafe',
          borderLeft: '4px solid #3b82f6',
        },
      });
      break;
  }
};

/**
 * Dismiss a specific toast
 * @param toastId - The toast ID to dismiss
 */
export const notifyDismiss = (toastId: string): void => {
  toast.dismiss(toastId);
};

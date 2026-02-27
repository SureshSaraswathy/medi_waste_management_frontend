const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  APPROVAL = 'APPROVAL',
  ALERT = 'ALERT',
}

export interface NotificationReceiver {
  id: string;
  notificationId: string;
  userId: string | null;
  roleId: string | null;
  isRead: boolean;
  readAt: string | null;
  priority: NotificationPriority;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  module: string;
  referenceId: string | null;
  createdBy: string | null;
  createdAt: string;
  receivers: NotificationReceiver[];
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  const authData = localStorage.getItem('mw-auth-user');
  if (authData) {
    try {
      const user = JSON.parse(authData);
      return user.token || null;
    } catch {
      return null;
    }
  }
  return null;
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message;
      }
    } catch {
      // If response is not JSON, use default message
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

export const notificationService = {
  getMyNotifications: async (): Promise<Notification[]> => {
    return apiRequest<Notification[]>('/notifications/my');
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiRequest<{ count: number }>('/notifications/unread-count');
    return response.count;
  },

  markAsRead: async (receiverId: string): Promise<void> => {
    await apiRequest(`/notifications/read/${receiverId}`, {
      method: 'POST',
    });
  },

  markAllAsRead: async (): Promise<void> => {
    await apiRequest('/notifications/read-all', {
      method: 'POST',
    });
  },
};

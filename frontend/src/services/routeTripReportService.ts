import { API_BASE_URL } from './apiBaseUrl';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface RouteTripReportFilter {
  date?: string;
  routeId?: string;
  companyId?: string;
}

export interface RouteTripReportItem {
  hcfCode: string;
  hcfShortName: string;
  area: string;
  yellow: number;
  red: number;
  blue: number;
  white: number;
  total: number;
  nameSign: string;
  timeIn: string;
  timeOut: string;
}

export interface RouteTripReportResponse {
  data: RouteTripReportItem[];
  meta: {
    totalRecords: number;
    routeOptions: Array<{ routeId: string; routeName: string }>;
  };
}

const getAuthToken = (): string | null => {
  const authData = localStorage.getItem('mw-auth-user');
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      return parsed?.token || null;
    } catch {
      return null;
    }
  }
  return localStorage.getItem('authToken') || localStorage.getItem('token');
};

const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  const result: ApiResponse<T> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'API request failed');
  }
  return result.data;
};

export const getRouteTripReport = async (
  filters: RouteTripReportFilter = {},
): Promise<RouteTripReportResponse> => {
  const body: Record<string, string> = {};
  if (filters.date) body.date = filters.date;
  if (filters.routeId && filters.routeId !== 'All') body.routeId = filters.routeId;
  if (filters.companyId) body.companyId = filters.companyId;

  return apiRequest<RouteTripReportResponse>('/reports/route-trip', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

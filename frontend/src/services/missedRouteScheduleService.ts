import { API_BASE_URL } from './apiBaseUrl';

export interface MissedRouteScheduleFilter {
  date?: string;
  routeId?: string;
  area?: string;
}

export interface MissedRouteScheduleItem {
  date: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  hcfCode: string;
  hcfName: string;
  area: string;
  status: 'Missed';
  remarks: string;
}

export interface MissedRouteScheduleResponse {
  data: MissedRouteScheduleItem[];
  meta: {
    totalRecords: number;
    routeOptions: Array<{ routeId: string; routeName: string }>;
    areaOptions: string[];
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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

export const getMissedRouteSchedule = async (
  filters: MissedRouteScheduleFilter = {},
): Promise<MissedRouteScheduleResponse> => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reports/missed-route-schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      date: filters.date,
      routeId: filters.routeId && filters.routeId !== 'All' ? filters.routeId : undefined,
      area: filters.area && filters.area !== 'All' ? filters.area : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  const result = (await response.json()) as ApiResponse<MissedRouteScheduleResponse>;
  if (!result.success) {
    throw new Error(result.message || 'Failed to load missed route schedule');
  }
  return result.data;
};


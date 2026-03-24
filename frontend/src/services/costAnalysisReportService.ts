import { API_BASE_URL } from './apiBaseUrl';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CostAnalysisFilter {
  option?: 'All' | 'Manpower Only' | 'Fuel Only';
  routeId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CostAnalysisItem {
  date: string;
  driverPerDay: number;
  supervisorPerDay: number;
  pickerPerDay: number;
  totalKms: number;
  mileage: number;
  fuelCostPerDay: number;
  totalPerDay: number;
}

export interface CostAnalysisResponse {
  data: CostAnalysisItem[];
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

export const getCostAnalysisReport = async (
  filters: CostAnalysisFilter = {},
): Promise<CostAnalysisResponse> => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reports/cost-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      option: filters.option || 'All',
      routeId: filters.routeId && filters.routeId !== 'All' ? filters.routeId : undefined,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  const result = (await response.json()) as ApiResponse<CostAnalysisResponse>;
  if (!result.success) {
    throw new Error(result.message || 'Failed to load cost analysis report');
  }
  return result.data;
};


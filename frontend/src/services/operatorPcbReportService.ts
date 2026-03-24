import { API_BASE_URL } from './apiBaseUrl';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface OperatorPcbReportFilter {
  option?: string;
  fromDate?: string;
  toDate?: string;
}

export interface OperatorPcbReportRow {
  date: string;
  noOfHce: number;
  collectedYellowKg: number;
  collectedRwbKg: number;
  treatedYellowKg: number;
  treatedRwbKg: number;
}

export interface OperatorPcbReportResponse {
  header: {
    fromDate: string;
    toDate: string;
    option: string;
  };
  data: OperatorPcbReportRow[];
  totals: {
    totalHce: number;
    totalCollectedYellowKg: number;
    totalCollectedRwbKg: number;
    totalTreatedYellowKg: number;
    totalTreatedRwbKg: number;
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

export const getOperatorPcbReport = async (
  filters: OperatorPcbReportFilter = {},
): Promise<OperatorPcbReportResponse> => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reports/operator-pcb-collection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      option: filters.option || 'Operator PCB Report',
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  const result = (await response.json()) as ApiResponse<OperatorPcbReportResponse>;
  if (!result.success) {
    throw new Error(result.message || 'Failed to load Operator PCB report');
  }
  return result.data;
};


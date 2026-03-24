import { API_BASE_URL } from './apiBaseUrl';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PcbComplianceReportFilter {
  fromDate?: string;
  toDate?: string;
}

export interface PcbComplianceRow {
  serialNo: number;
  hcfName: string;
  area: string;
  hcfType: string;
  generatedDate: string;
  generatedTime: string;
  generatedYellowCount: number;
  generatedYellowQtyKg: number;
  generatedRedCount: number;
  generatedRedQtyKg: number;
  generatedBlueCount: number;
  generatedBlueQtyKg: number;
  generatedWhiteCount: number;
  generatedWhiteQtyKg: number;
  receivedDate: string;
  receivedTime: string;
  receivedYellowCount: number;
  receivedYellowQtyKg: number;
  receivedRedCount: number;
  receivedRedQtyKg: number;
  receivedBlueCount: number;
  receivedBlueQtyKg: number;
  receivedWhiteCount: number;
  receivedWhiteQtyKg: number;
  diffYellowQtyKg: number;
  diffRedQtyKg: number;
  diffBlueQtyKg: number;
  diffWhiteQtyKg: number;
}

export interface PcbComplianceResponse {
  header: { fromDate: string; toDate: string };
  data: PcbComplianceRow[];
  totals: {
    totalGeneratedYellowQtyKg: number;
    totalGeneratedRedQtyKg: number;
    totalGeneratedBlueQtyKg: number;
    totalGeneratedWhiteQtyKg: number;
    totalReceivedYellowQtyKg: number;
    totalReceivedRedQtyKg: number;
    totalReceivedBlueQtyKg: number;
    totalReceivedWhiteQtyKg: number;
    totalDiffYellowQtyKg: number;
    totalDiffRedQtyKg: number;
    totalDiffBlueQtyKg: number;
    totalDiffWhiteQtyKg: number;
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

export const getPcbComplianceReport = async (
  filters: PcbComplianceReportFilter = {},
): Promise<PcbComplianceResponse> => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reports/pcb-compliance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  const result = (await response.json()) as ApiResponse<PcbComplianceResponse>;
  if (!result.success) {
    throw new Error(result.message || 'Failed to load PCB compliance report');
  }
  return result.data;
};


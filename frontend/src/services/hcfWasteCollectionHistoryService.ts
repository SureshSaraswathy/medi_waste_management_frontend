import { API_BASE_URL } from './apiBaseUrl';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface HcfWasteCollectionHistoryFilter {
  hcfId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface HcfWasteCollectionHistoryItem {
  serialNo: number;
  date: string;
  latLong: string;
  inTime: string;
  outTime: string;
  yellowBagCount: number;
  yellowWeight: number;
  redBagCount: number;
  redWeight: number;
  blueBagCount: number;
  blueWeight: number;
  whiteBagCount: number;
  whiteWeight: number;
  totalWeight: number;
  remarks: string;
}

export interface HcfWasteCollectionHistoryResponse {
  data: HcfWasteCollectionHistoryItem[];
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

export const getHcfWasteCollectionHistory = async (
  filters: HcfWasteCollectionHistoryFilter = {},
): Promise<HcfWasteCollectionHistoryResponse> => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reports/hcf-waste-collection-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      hcfId: filters.hcfId,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  const result = (await response.json()) as ApiResponse<HcfWasteCollectionHistoryResponse>;
  if (!result.success) {
    throw new Error(result.message || 'Failed to load HCF waste collection history');
  }
  return result.data;
};


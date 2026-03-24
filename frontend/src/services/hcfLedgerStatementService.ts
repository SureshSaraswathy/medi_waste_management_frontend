import { API_BASE_URL } from './apiBaseUrl';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface HcfLedgerStatementFilter {
  hcfId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface HcfLedgerStatementRow {
  date: string;
  particulars: string;
  invoiceAmountDr: number | null;
  receiptAmountCr: number | null;
  rowType: 'opening' | 'invoice' | 'receipt' | 'total' | 'balance';
}

export interface HcfLedgerStatementResponse {
  header: {
    hcfId: string;
    hcfName: string;
    fromDate: string;
    toDate: string;
  };
  rows: HcfLedgerStatementRow[];
  totals: {
    totalDr: number;
    totalCr: number;
    balanceReceivable: number;
  };
  meta: {
    totalRecords: number;
    hcfOptions: Array<{ hcfId: string; hcfName: string }>;
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

export const getHcfLedgerStatement = async (
  filters: HcfLedgerStatementFilter = {},
): Promise<HcfLedgerStatementResponse> => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reports/hcf-ledger-statement`, {
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

  const result = (await response.json()) as ApiResponse<HcfLedgerStatementResponse>;
  if (!result.success) {
    throw new Error(result.message || 'Failed to load HCF ledger statement');
  }
  return result.data;
};


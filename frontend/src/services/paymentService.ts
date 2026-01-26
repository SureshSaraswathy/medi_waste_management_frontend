const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Log request body for debugging payment issues
  if (options.body && endpoint.includes('/payments')) {
    try {
      const bodyObj = JSON.parse(options.body as string);
      console.log('=== API Request Debug ===');
      console.log('Endpoint:', endpoint);
      console.log('Request Body:', JSON.stringify(bodyObj, null, 2));
      console.log('Payment Amount in request:', bodyObj.paymentAmount, typeof bodyObj.paymentAmount);
    } catch (e) {
      console.log('Could not parse request body for logging');
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      // Handle nested error messages
      if (errorData.message && typeof errorData.message === 'object') {
        errorMessage = JSON.stringify(errorData.message);
      }
    } catch {
      // If JSON parsing fails, use status-based message
      if (response.status === 500) {
        errorMessage = 'Internal server error';
      } else if (response.status === 401) {
        errorMessage = 'Unauthorized. Please login again.';
      } else if (response.status === 403) {
        errorMessage = 'Forbidden. You do not have permission.';
      } else if (response.status === 404) {
        errorMessage = 'Resource not found';
      }
    }
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).response = { status: response.status };
    throw error;
  }

  const data: ApiResponse<T> = await response.json();
  return data.data as T;
};

export enum PaymentMode {
  CASH = 'Cash',
  CHEQUE = 'Cheque',
  BANK_TRANSFER = 'Bank Transfer',
  UPI = 'UPI',
  NEFT = 'NEFT',
  RTGS = 'RTGS',
  OTHER = 'Other',
}

export enum PaymentStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export interface InvoiceAllocation {
  invoiceId: string;
  allocatedAmount: number;
}

export interface CreatePaymentRequest {
  companyId: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  bankName?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  notes?: string | null;
  invoiceAllocations: InvoiceAllocation[]; // Empty array for FIFO, or provide manual allocations
}

export interface PaymentAllocationResponse {
  allocationId: string;
  invoiceId: string;
  invoiceNumber: string;
  allocatedAmount: number;
  allocationDate: string;
}

export interface PaymentResponse {
  paymentId: string;
  companyId: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMode: PaymentMode;
  referenceNumber: string | null;
  bankName: string | null;
  chequeNumber: string | null;
  chequeDate: string | null;
  status: PaymentStatus;
  notes: string | null;
  receiptId: string | null;
  receiptNumber: string | null;
  allocations: PaymentAllocationResponse[];
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string;
}

export interface RecordPaymentRequest {
  invoiceId: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  bankName?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  notes?: string | null;
}

export interface ProcessPaymentResponse {
  payment: PaymentResponse;
  receipt: {
    receiptId: string;
    receiptNumber: string;
    receiptDate: string;
    totalAmount: number;
  };
  invoiceUpdates: Array<{
    invoiceId: string;
    invoiceNumber: string;
    status: string;
    totalPaidAmount: number;
    balanceAmount: number;
  }>;
}

export interface RecordPaymentResponse {
  success: boolean;
  data: {
    payment: PaymentResponse;
    receipt: {
      receiptId: string;
      receiptNumber: string;
      receiptDate: string;
      totalAmount: number;
    };
    invoice: {
      invoiceId: string;
      invoiceNumber: string;
      totalPaidAmount: number;
      balanceAmount: number;
      status: string;
    };
  };
}

export interface PaymentHistoryResponse {
  success: boolean;
  data: {
    invoiceId: string;
    invoiceNumber: string;
    invoiceValue: number;
    totalPaidAmount: number;
    balanceAmount: number;
    status: string;
    paymentHistory: Array<PaymentResponse & { allocatedAmount: number }>;
  };
}

// Record payment for a single invoice (simplified flow for offline payments)
export const recordPayment = async (
  request: RecordPaymentRequest
): Promise<RecordPaymentResponse> => {
  return apiRequest<RecordPaymentResponse>('/payments/record', {
    method: 'POST',
    body: JSON.stringify(request),
  });
};

// Process payment (create payment with FIFO or manual allocation)
export const processPayment = async (
  request: CreatePaymentRequest
): Promise<ProcessPaymentResponse> => {
  return apiRequest<ProcessPaymentResponse>('/payments', {
    method: 'POST',
    body: JSON.stringify(request),
  });
};

// Get payment by ID
export const getPayment = async (paymentId: string): Promise<{ success: boolean; data: PaymentResponse }> => {
  return apiRequest<{ success: boolean; data: PaymentResponse }>(`/payments/${paymentId}`, {
    method: 'GET',
  });
};

// Get all payments with filters
export const getAllPayments = async (filters?: {
  companyId?: string;
  status?: string;
  paymentDateFrom?: string;
  paymentDateTo?: string;
}): Promise<{ success: boolean; data: PaymentResponse[] }> => {
  const queryParams = new URLSearchParams();
  if (filters?.companyId) queryParams.append('companyId', filters.companyId);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.paymentDateFrom) queryParams.append('paymentDateFrom', filters.paymentDateFrom);
  if (filters?.paymentDateTo) queryParams.append('paymentDateTo', filters.paymentDateTo);

  const url = `/payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiRequest<{ success: boolean; data: PaymentResponse[] }>(url, {
    method: 'GET',
  });
};

// Get payment history for a specific invoice
export const getPaymentsByInvoice = async (invoiceId: string): Promise<PaymentHistoryResponse> => {
  return apiRequest<PaymentHistoryResponse>(`/payments/invoice/${invoiceId}`, {
    method: 'GET',
  });
};

// Get receipt by ID
export const getReceipt = async (receiptId: string): Promise<{
  success: boolean;
  data: {
    receiptId: string;
    receiptNumber: string;
    receiptDate: string;
    totalAmount: number;
    payment: {
      paymentId: string;
      paymentDate: string;
      paymentAmount: number;
      paymentMode: PaymentMode;
    } | null;
    invoices: Array<{
      invoiceId: string;
      invoiceNumber: string;
      allocatedAmount: number;
    }>;
  };
}> => {
  return apiRequest(`/payments/receipts/${receiptId}`, {
    method: 'GET',
  });
};

// Get payments without receipts (for manual receipt creation)
export const getPaymentsWithoutReceipt = async (companyId?: string): Promise<PaymentResponse[]> => {
  const queryParams = new URLSearchParams();
  if (companyId) queryParams.append('companyId', companyId);
  const url = `/payments/without-receipt${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  // apiRequest extracts the data property, so we get PaymentResponse[] directly
  return apiRequest<PaymentResponse[]>(url, {
    method: 'GET',
  });
};

// Create manual receipt
export interface CreateManualReceiptRequest {
  paymentId: string;
  receiptDate?: string;
  notes?: string | null;
}

export interface CreateManualReceiptResponse {
  success: boolean;
  data: {
    receipt: {
      receiptId: string;
      receiptNumber: string;
      receiptDate: string;
      totalAmount: number;
    };
    payment: {
      paymentId: string;
      paymentDate: string;
      paymentAmount: number;
      paymentMode: PaymentMode;
    };
  };
}

export const createManualReceipt = async (request: CreateManualReceiptRequest): Promise<CreateManualReceiptResponse> => {
  return apiRequest<CreateManualReceiptResponse>('/payments/receipts/manual', {
    method: 'POST',
    body: JSON.stringify(request),
  });
};

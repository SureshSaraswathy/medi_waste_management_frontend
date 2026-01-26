const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface ContractResponse {
  id: string;
  contractID: string;
  contractNum: string;
  companyId: string;
  hcfId: string;
  startDate: string;
  endDate: string;
  billingType: 'Bed' | 'Kg' | 'Lumpsum';
  status: 'Draft' | 'Active' | 'Expired';
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string;
}

export interface CreateContractRequest {
  contractNum: string;
  companyId: string;
  hcfId: string;
  startDate: string;
  endDate: string;
  billingType: 'Bed' | 'Kg' | 'Lumpsum';
  status?: 'Draft' | 'Active' | 'Expired';
}

export interface UpdateContractRequest {
  contractNum?: string;
  startDate?: string;
  endDate?: string;
  billingType?: 'Bed' | 'Kg' | 'Lumpsum';
  status?: 'Draft' | 'Active' | 'Expired';
}

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
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message.join(', ');
      } else if (typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = typeof errorData.error === 'string'
          ? errorData.error
          : JSON.stringify(errorData.error);
      } else if (errorData.message) {
        errorMessage = String(errorData.message);
      }
    } catch {
      // If response is not JSON, use default message
    }
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    throw error;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

export const contractService = {
  getAllContracts: async (
    companyId?: string,
    status?: string
  ): Promise<ContractResponse[]> => {
    let url = '/contracts';
    const params = new URLSearchParams();
    if (companyId) {
      params.append('companyId', companyId);
    }
    if (status) {
      params.append('status', status);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<ContractResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  getContractById: async (contractId: string): Promise<ContractResponse> => {
    const response = await apiRequest<ApiResponse<ContractResponse>>(`/contracts/${contractId}`, {
      method: 'GET',
    });
    return response.data;
  },

  createContract: async (data: CreateContractRequest): Promise<ContractResponse> => {
    const response = await apiRequest<ApiResponse<ContractResponse>>('/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  updateContract: async (
    contractId: string,
    data: UpdateContractRequest
  ): Promise<ContractResponse> => {
    const response = await apiRequest<ApiResponse<ContractResponse>>(`/contracts/${contractId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteContract: async (contractId: string): Promise<void> => {
    await apiRequest(`/contracts/${contractId}`, {
      method: 'DELETE',
    });
  },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateDowntimeRegisterRequest {
  companyId: string;
  breakdownDate: string;
  equipmentId: string;
  breakdownType: string;
  startTime: string;
  endTime: string;
  downtimeHours: number;
  cause: string;
  actionTaken: string;
  sparesUsed: string;
  complianceStatus: string;
  status: 'Active' | 'Inactive';
}

export interface UpdateDowntimeRegisterRequest {
  breakdownDate?: string;
  equipmentId?: string;
  breakdownType?: string;
  startTime?: string;
  endTime?: string;
  downtimeHours?: number;
  cause?: string;
  actionTaken?: string;
  sparesUsed?: string;
  complianceStatus?: string;
  status?: 'Active' | 'Inactive';
}

export interface DowntimeRegisterResponse {
  id: string;
  downtimeId?: string;
  dtRegNum: string;
  companyId: string;
  breakdownDate: string;
  equipmentId: string;
  breakdownType: string;
  startTime: string;
  endTime: string;
  downtimeHours: number;
  cause: string;
  actionTaken: string;
  sparesUsed: string;
  complianceStatus: string;
  status: 'Active' | 'Inactive';
  createdBy?: string | null;
  createdOn: string;
  modifiedBy?: string | null;
  modifiedOn: string;
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
      
      // Handle NestJS exception format
      if (errorData.message) {
        if (Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ');
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        } else {
          errorMessage = String(errorData.message);
        }
      } else if (errorData.error) {
        // Handle error object
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error.message) {
          errorMessage = typeof errorData.error.message === 'string'
            ? errorData.error.message
            : String(errorData.error.message);
        } else {
          errorMessage = JSON.stringify(errorData.error);
        }
      }
      
      // Store original error data for better parsing
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).errorData = errorData;
      throw error;
    } catch (parseError) {
      // If response is not JSON or parsing failed, use default message
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      throw error;
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

const normalizeDowntimeRegister = (payload: any): DowntimeRegisterResponse => ({
  id: payload?.id || payload?.downtimeId || '',
  downtimeId: payload?.downtimeId,
  dtRegNum: payload?.dtRegNum || '',
  companyId: payload?.companyId || '',
  breakdownDate: payload?.breakdownDate || '',
  equipmentId: payload?.equipmentId || '',
  breakdownType: payload?.breakdownType || '',
  startTime: payload?.startTime || '',
  endTime: payload?.endTime || '',
  downtimeHours: payload?.downtimeHours ?? 0,
  cause: payload?.cause || '',
  actionTaken: payload?.actionTaken || '',
  sparesUsed: payload?.sparesUsed || '',
  complianceStatus: payload?.complianceStatus || '',
  status: payload?.status || 'Active',
  createdBy: payload?.createdBy,
  createdOn: payload?.createdOn || '',
  modifiedBy: payload?.modifiedBy,
  modifiedOn: payload?.modifiedOn || '',
});

const extractResponseData = <T>(response: T | ApiResponse<T>): T => {
  if (
    response &&
    typeof response === 'object' &&
    'data' in (response as Record<string, unknown>)
  ) {
    return (response as ApiResponse<T>).data;
  }

  return response as T;
};

// Downtime Register API functions
export const downtimeRegisterService = {
  createDowntimeRegister: async (data: CreateDowntimeRegisterRequest): Promise<DowntimeRegisterResponse> => {
    const response = await apiRequest<DowntimeRegisterResponse | ApiResponse<DowntimeRegisterResponse>>('/downtime-registers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeDowntimeRegister(extractResponseData(response));
  },

  getDowntimeRegisterById: async (downtimeId: string): Promise<DowntimeRegisterResponse> => {
    const response = await apiRequest<DowntimeRegisterResponse | ApiResponse<DowntimeRegisterResponse>>(`/downtime-registers/${downtimeId}`, {
      method: 'GET',
    });
    return normalizeDowntimeRegister(extractResponseData(response));
  },

  getAllDowntimeRegisters: async (
    companyId?: string,
    status?: string
  ): Promise<DowntimeRegisterResponse[]> => {
    let url = '/downtime-registers';
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
    
    const response = await apiRequest<DowntimeRegisterResponse[] | ApiResponse<DowntimeRegisterResponse[]>>(url, {
      method: 'GET',
    });
    const data = extractResponseData(response);
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.map(normalizeDowntimeRegister);
  },

  updateDowntimeRegister: async (
    downtimeId: string,
    data: UpdateDowntimeRegisterRequest
  ): Promise<DowntimeRegisterResponse> => {
    const response = await apiRequest<DowntimeRegisterResponse | ApiResponse<DowntimeRegisterResponse>>(`/downtime-registers/${downtimeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return normalizeDowntimeRegister(extractResponseData(response));
  },

  deleteDowntimeRegister: async (downtimeId: string): Promise<void> => {
    await apiRequest(`/downtime-registers/${downtimeId}`, {
      method: 'DELETE',
    });
  },
};

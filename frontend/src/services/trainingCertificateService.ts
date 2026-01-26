const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateTrainingCertificateRequest {
  certificateNo: string;
  staffName: string;
  staffCode: string;
  designation?: string;
  hcfId: string;
  trainingDate: string;
  companyId: string;
  trainedBy: string;
}

export interface UpdateTrainingCertificateRequest {
  staffName?: string;
  staffCode?: string;
  designation?: string;
  hcfId?: string;
  trainingDate?: string;
  trainedBy?: string;
  status?: 'Active' | 'Inactive';
}

export interface TrainingCertificateResponse {
  id: string;
  certificateNo: string;
  staffName: string;
  staffCode: string;
  designation: string;
  hcfId: string;
  trainingDate: string;
  companyId: string;
  trainedBy: string;
  status: 'Active' | 'Inactive';
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string;
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

export const trainingCertificateService = {
  createCertificate: async (data: CreateTrainingCertificateRequest): Promise<TrainingCertificateResponse> => {
    const response = await apiRequest<ApiResponse<TrainingCertificateResponse>>('/training-certificates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getCertificateById: async (certificateId: string): Promise<TrainingCertificateResponse> => {
    const response = await apiRequest<ApiResponse<TrainingCertificateResponse>>(`/training-certificates/${certificateId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllCertificates: async (
    companyId?: string,
    activeOnly?: boolean,
    filters?: {
      hcfId?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    }
  ): Promise<TrainingCertificateResponse[]> => {
    let url = '/training-certificates';
    const params = new URLSearchParams();
    if (companyId) {
      params.append('companyId', companyId);
    }
    if (activeOnly) {
      params.append('activeOnly', 'true');
    }
    if (filters?.hcfId) {
      params.append('hcfId', filters.hcfId);
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    if (filters?.dateTo) {
      params.append('dateTo', filters.dateTo);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<TrainingCertificateResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateCertificate: async (
    certificateId: string,
    data: UpdateTrainingCertificateRequest
  ): Promise<TrainingCertificateResponse> => {
    const response = await apiRequest<ApiResponse<TrainingCertificateResponse>>(`/training-certificates/${certificateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteCertificate: async (certificateId: string): Promise<void> => {
    await apiRequest(`/training-certificates/${certificateId}`, {
      method: 'DELETE',
    });
  },
};

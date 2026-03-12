const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface AgreementTemplateResponse {
  id: string;
  templateCode: string;
  templateName: string;
  agreementCategory: string | null;
  templateDescription: string | null;
  status: 'Active' | 'Inactive';
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string;
}

export interface CreateAgreementTemplateRequest {
  templateName: string;
  agreementCategory?: string;
  templateDescription?: string;
  status?: 'Active' | 'Inactive';
}

export interface UpdateAgreementTemplateRequest {
  templateName?: string;
  agreementCategory?: string;
  templateDescription?: string;
  status?: 'Active' | 'Inactive';
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

export const agreementTemplateService = {
  getAllAgreementTemplates: async (): Promise<AgreementTemplateResponse[]> => {
    const response = await apiRequest<ApiResponse<AgreementTemplateResponse[]>>('/agreement-templates', {
      method: 'GET',
    });
    return response.data;
  },

  getAgreementTemplateById: async (templateId: string): Promise<AgreementTemplateResponse> => {
    const response = await apiRequest<ApiResponse<AgreementTemplateResponse>>(`/agreement-templates/${templateId}`, {
      method: 'GET',
    });
    return response.data;
  },

  createAgreementTemplate: async (data: CreateAgreementTemplateRequest): Promise<AgreementTemplateResponse> => {
    const response = await apiRequest<ApiResponse<AgreementTemplateResponse>>('/agreement-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  updateAgreementTemplate: async (
    templateId: string,
    data: UpdateAgreementTemplateRequest
  ): Promise<AgreementTemplateResponse> => {
    const response = await apiRequest<ApiResponse<AgreementTemplateResponse>>(`/agreement-templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteAgreementTemplate: async (templateId: string): Promise<void> => {
    await apiRequest(`/agreement-templates/${templateId}`, {
      method: 'DELETE',
    });
  },
};

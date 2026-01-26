const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface AgreementClauseResponse {
  id: string;
  agreementClauseID: string;
  agreementId: string;
  pointNum: string;
  pointTitle: string;
  pointText: string;
  sequenceNo: number;
  status: 'Active' | 'Inactive';
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string;
}

export interface CreateAgreementClauseRequest {
  agreementId: string;
  pointNum: string;
  pointTitle: string;
  pointText: string;
  sequenceNo: number;
}

export interface UpdateAgreementClauseRequest {
  pointNum?: string;
  pointTitle?: string;
  pointText?: string;
  sequenceNo?: number;
  status?: 'Active' | 'Inactive';
}

export interface ReorderClauseRequest {
  clauseId: string;
  newSequenceNo: number;
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

export const agreementClauseService = {
  getAllClauses: async (
    agreementId?: string,
    status?: string
  ): Promise<AgreementClauseResponse[]> => {
    let url = '/agreement-clauses';
    const params = new URLSearchParams();
    if (agreementId) {
      params.append('agreementId', agreementId);
    }
    if (status) {
      params.append('status', status);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<AgreementClauseResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  getClauseById: async (clauseId: string): Promise<AgreementClauseResponse> => {
    const response = await apiRequest<ApiResponse<AgreementClauseResponse>>(`/agreement-clauses/${clauseId}`, {
      method: 'GET',
    });
    return response.data;
  },

  createClause: async (data: CreateAgreementClauseRequest): Promise<AgreementClauseResponse> => {
    const response = await apiRequest<ApiResponse<AgreementClauseResponse>>('/agreement-clauses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  updateClause: async (
    clauseId: string,
    data: UpdateAgreementClauseRequest
  ): Promise<AgreementClauseResponse> => {
    const response = await apiRequest<ApiResponse<AgreementClauseResponse>>(`/agreement-clauses/${clauseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  reorderClause: async (clauseId: string, newSequenceNo: number): Promise<AgreementClauseResponse> => {
    const response = await apiRequest<ApiResponse<AgreementClauseResponse>>(`/agreement-clauses/${clauseId}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ newSequenceNo }),
    });
    return response.data;
  },
};

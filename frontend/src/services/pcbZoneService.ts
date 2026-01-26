const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreatePcbZoneRequest {
  pcbZoneName: string;
  pcbZoneAddress?: string;
  contactNum?: string;
  contactEmail?: string;
  alertEmail?: string;
}

export interface UpdatePcbZoneRequest {
  pcbZoneAddress?: string;
  contactNum?: string;
  contactEmail?: string;
  alertEmail?: string;
  status?: 'Active' | 'Inactive';
}

export interface PcbZoneResponse {
  id: string;
  pcbZoneName: string;
  pcbZoneAddress?: string;
  contactNum?: string;
  contactEmail?: string;
  alertEmail?: string;
  status: 'Active' | 'Inactive';
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
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

// PCB Zone API functions
export const pcbZoneService = {
  createPcbZone: async (data: CreatePcbZoneRequest): Promise<PcbZoneResponse> => {
    const response = await apiRequest<ApiResponse<PcbZoneResponse>>('/pcb-zones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getPcbZoneById: async (pcbZoneId: string): Promise<PcbZoneResponse> => {
    const response = await apiRequest<ApiResponse<PcbZoneResponse>>(`/pcb-zones/${pcbZoneId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllPcbZones: async (activeOnly: boolean = false): Promise<PcbZoneResponse[]> => {
    const url = activeOnly ? '/pcb-zones?activeOnly=true' : '/pcb-zones';
    const response = await apiRequest<ApiResponse<PcbZoneResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updatePcbZone: async (pcbZoneId: string, data: UpdatePcbZoneRequest): Promise<PcbZoneResponse> => {
    const response = await apiRequest<ApiResponse<PcbZoneResponse>>(`/pcb-zones/${pcbZoneId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deletePcbZone: async (pcbZoneId: string): Promise<void> => {
    await apiRequest(`/pcb-zones/${pcbZoneId}`, {
      method: 'DELETE',
    });
  },
};

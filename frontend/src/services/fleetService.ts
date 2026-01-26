const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateFleetRequest {
  companyId: string;
  vehicleNum: string;
  capacity?: string;
  vehMake?: string;
  vehModel?: string;
  mfgYear?: string;
  nextFCDate?: string;
  pucDateValidUpto?: string;
  insuranceValidUpto?: string;
  ownerName?: string;
  ownerContact?: string;
  ownerEmail?: string;
  ownerPAN?: string;
  ownerAadhaar?: string;
  pymtToName?: string;
  pymtBankName?: string;
  pymtAccNum?: string;
  pymtIFSCode?: string;
  pymtBranch?: string;
  contractAmount?: string;
  tdsExemption?: boolean;
}

export interface UpdateFleetRequest {
  capacity?: string;
  vehMake?: string;
  vehModel?: string;
  mfgYear?: string;
  nextFCDate?: string;
  pucDateValidUpto?: string;
  insuranceValidUpto?: string;
  ownerName?: string;
  ownerContact?: string;
  ownerEmail?: string;
  ownerPAN?: string;
  ownerAadhaar?: string;
  pymtToName?: string;
  pymtBankName?: string;
  pymtAccNum?: string;
  pymtIFSCode?: string;
  pymtBranch?: string;
  contractAmount?: string;
  tdsExemption?: boolean;
  status?: 'Active' | 'Inactive';
}

export interface FleetResponse {
  id: string;
  companyId: string;
  vehicleNum: string;
  capacity?: string;
  vehMake?: string;
  vehModel?: string;
  mfgYear?: string;
  nextFCDate?: string;
  pucDateValidUpto?: string;
  insuranceValidUpto?: string;
  ownerName?: string;
  ownerContact?: string;
  ownerEmail?: string;
  ownerPAN?: string;
  ownerAadhaar?: string;
  pymtToName?: string;
  pymtBankName?: string;
  pymtAccNum?: string;
  pymtIFSCode?: string;
  pymtBranch?: string;
  contractAmount?: string;
  tdsExemption?: boolean;
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

// Fleet API functions
// NOTE: Backend API needs to be created. This service is ready for integration.
export const fleetService = {
  createFleet: async (data: CreateFleetRequest): Promise<FleetResponse> => {
    const response = await apiRequest<ApiResponse<FleetResponse>>('/fleets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getFleetById: async (fleetId: string): Promise<FleetResponse> => {
    const response = await apiRequest<ApiResponse<FleetResponse>>(`/fleets/${fleetId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllFleets: async (companyId?: string, activeOnly: boolean = false): Promise<FleetResponse[]> => {
    let url = '/fleets';
    const params = new URLSearchParams();
    if (companyId) {
      params.append('companyId', companyId);
    }
    if (activeOnly) {
      params.append('activeOnly', 'true');
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<FleetResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateFleet: async (fleetId: string, data: UpdateFleetRequest): Promise<FleetResponse> => {
    const response = await apiRequest<ApiResponse<FleetResponse>>(`/fleets/${fleetId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteFleet: async (fleetId: string): Promise<void> => {
    await apiRequest(`/fleets/${fleetId}`, {
      method: 'DELETE',
    });
  },
};

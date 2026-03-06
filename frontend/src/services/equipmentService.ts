const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateEquipmentRequest {
  companyId: string;
  equipmentCode: string;
  equipmentName: string;
  equipmentType: string;
  make?: string | null;
  capacity?: string | null;
}

export interface UpdateEquipmentRequest {
  companyId?: string;
  equipmentType?: string | null;
  make?: string | null;
  capacity?: string | null;
  status?: 'Active' | 'Inactive';
}

export interface EquipmentResponse {
  id: string;
  companyId: string;
  equipmentCode: string;
  equipmentName: string;
  equipmentType?: string | null;
  make?: string | null;
  capacity?: string | null;
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
    // Handle 404 specifically (endpoint not found)
    if (response.status === 404) {
      const error = new Error('Equipment API endpoint not found. Please ensure the backend API is running and the /api/v1/equipment endpoint is implemented.');
      (error as any).status = 404;
      (error as any).statusText = 'Not Found';
      (error as any).isEndpointMissing = true;
      throw error;
    }

    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      
      // Handle different error response formats
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

  // Handle 204 No Content (for DELETE)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

// Equipment API functions
export const equipmentService = {
  // Create equipment
  createEquipment: async (data: CreateEquipmentRequest): Promise<EquipmentResponse> => {
    const response = await apiRequest<ApiResponse<EquipmentResponse>>('/equipment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Get equipment by ID
  getEquipmentById: async (equipmentId: string): Promise<EquipmentResponse> => {
    const response = await apiRequest<ApiResponse<EquipmentResponse>>(`/equipment/${equipmentId}`, {
      method: 'GET',
    });
    return response.data;
  },

  // Get all equipment
  getAllEquipment: async (activeOnly: boolean = false, companyId?: string): Promise<EquipmentResponse[]> => {
    let url = '/equipment';
    const params = new URLSearchParams();
    if (activeOnly) {
      params.append('activeOnly', 'true');
    }
    if (companyId) {
      params.append('companyId', companyId);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    const response = await apiRequest<ApiResponse<EquipmentResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  // Update equipment
  updateEquipment: async (equipmentId: string, data: UpdateEquipmentRequest): Promise<EquipmentResponse> => {
    const response = await apiRequest<ApiResponse<EquipmentResponse>>(`/equipment/${equipmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Delete equipment
  deleteEquipment: async (equipmentId: string): Promise<void> => {
    await apiRequest(`/equipment/${equipmentId}`, {
      method: 'DELETE',
    });
  },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateVehicleWasteCollectionRequest {
  vehicleId: string;
  collectionDate: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  incinerationWeightKg: number;
  autoclaveWeightKg: number;
  vehicleKm?: number | null;
  fuelUsageLiters?: number | null;
  notes?: string | null;
}

export interface UpdateVehicleWasteCollectionRequest {
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  incinerationWeightKg?: number;
  autoclaveWeightKg?: number;
  vehicleKm?: number | null;
  fuelUsageLiters?: number | null;
  notes?: string | null;
}

export interface VehicleWasteCollectionResponse {
  id: string;
  vehicleId: string;
  collectionDate: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  incinerationWeightKg: number;
  autoclaveWeightKg: number;
  vehicleKm?: number | null;
  fuelUsageLiters?: number | null;
  status: 'Draft' | 'Submitted' | 'Verified';
  notes?: string | null;
  createdBy?: string | null;
  createdOn: string;
  modifiedBy?: string | null;
  modifiedOn?: string | null;
  verifiedBy?: string | null;
  verifiedOn?: string | null;
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
      if (errorData.message) {
        if (Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ');
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        }
      } else if (errorData.error) {
        errorMessage = typeof errorData.error === 'string'
          ? errorData.error
          : errorData.error.message || JSON.stringify(errorData.error);
      }
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).errorData = errorData;
      throw error;
    } catch (parseError) {
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

// Vehicle Waste Collection API functions
export const vehicleWasteCollectionService = {
  createCollection: async (data: CreateVehicleWasteCollectionRequest): Promise<VehicleWasteCollectionResponse> => {
    const response = await apiRequest<ApiResponse<VehicleWasteCollectionResponse>>('/vehicle-waste-collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getCollectionById: async (collectionId: string): Promise<VehicleWasteCollectionResponse> => {
    const response = await apiRequest<ApiResponse<VehicleWasteCollectionResponse>>(`/vehicle-waste-collections/${collectionId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllCollections: async (
    vehicleId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
  ): Promise<VehicleWasteCollectionResponse[]> => {
    let url = '/vehicle-waste-collections';
    const params = new URLSearchParams();
    if (vehicleId) params.append('vehicleId', vehicleId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<VehicleWasteCollectionResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateCollection: async (
    collectionId: string,
    data: UpdateVehicleWasteCollectionRequest
  ): Promise<VehicleWasteCollectionResponse> => {
    const response = await apiRequest<ApiResponse<VehicleWasteCollectionResponse>>(`/vehicle-waste-collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  submitCollection: async (collectionId: string): Promise<VehicleWasteCollectionResponse> => {
    const response = await apiRequest<ApiResponse<VehicleWasteCollectionResponse>>(`/vehicle-waste-collections/${collectionId}/submit`, {
      method: 'PUT',
    });
    return response.data;
  },

  verifyCollection: async (collectionId: string): Promise<VehicleWasteCollectionResponse> => {
    const response = await apiRequest<ApiResponse<VehicleWasteCollectionResponse>>(`/vehicle-waste-collections/${collectionId}/verify`, {
      method: 'PUT',
    });
    return response.data;
  },

  deleteCollection: async (collectionId: string): Promise<void> => {
    await apiRequest(`/vehicle-waste-collections/${collectionId}`, {
      method: 'DELETE',
    });
  },
};

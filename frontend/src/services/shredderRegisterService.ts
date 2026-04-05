const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateShredderRegisterRequest {
  companyId: string;
  shredderDate: string;
  equipmentId: string;
  batchNo: string;
  wasteCategory: string;
  wasteQtyKg?: number | null;
  startTime: string;
  endTime: string;
  temperatureC?: number | null;
  pressureBar?: number | null;
  cycleTimeMin: number;
  indicatorResult: string;
  complianceStatus: string;
  status: 'Active' | 'Inactive';
  inputSourceType?: string;
  inputSourceRef?: string;
  inputQtyKg?: number;
  outputQtyKg?: number;
  bladeCondition?: string;
  outputDispatchedTo?: string;
}

export interface UpdateShredderRegisterRequest {
  shredderDate?: string;
  equipmentId?: string;
  batchNo?: string;
  wasteCategory?: string;
  wasteQtyKg?: number | null;
  startTime?: string;
  endTime?: string;
  temperatureC?: number | null;
  pressureBar?: number | null;
  cycleTimeMin?: number;
  indicatorResult?: string;
  complianceStatus?: string;
  status?: 'Active' | 'Inactive';
  inputSourceType?: string;
  inputSourceRef?: string;
  inputQtyKg?: number;
  outputQtyKg?: number;
  bladeCondition?: string;
  outputDispatchedTo?: string;
}

export interface ShredderRegisterResponse {
  id: string;
  shredderId?: string;
  shredRegNum: string;
  companyId: string;
  shredderDate: string;
  equipmentId: string;
  batchNo: string;
  wasteCategory: string;
  wasteQtyKg: number | null;
  startTime: string;
  endTime: string;
  temperatureC: number | null;
  pressureBar: number | null;
  cycleTimeMin: number;
  indicatorResult: string;
  complianceStatus: string;
  status: 'Active' | 'Inactive';
  inputSourceType?: string;
  inputSourceRef?: string;
  inputQtyKg?: number;
  outputQtyKg?: number;
  bladeCondition?: string;
  outputDispatchedTo?: string;
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

const normalizeNullableDecimal = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeShredderRegister = (payload: any): ShredderRegisterResponse => ({
  id: payload?.id || payload?.shredderId || '',
  shredderId: payload?.shredderId,
  shredRegNum: payload?.shredRegNum || '',
  companyId: payload?.companyId || '',
  shredderDate: payload?.shredderDate || '',
  equipmentId: payload?.equipmentId || '',
  batchNo: payload?.batchNo || '',
  wasteCategory: payload?.wasteCategory || '',
  wasteQtyKg: normalizeNullableDecimal(payload?.wasteQtyKg),
  startTime: payload?.startTime || '',
  endTime: payload?.endTime || '',
  temperatureC: normalizeNullableDecimal(payload?.temperatureC),
  pressureBar: normalizeNullableDecimal(payload?.pressureBar),
  cycleTimeMin: payload?.cycleTimeMin ?? 0,
  indicatorResult: payload?.indicatorResult || '',
  complianceStatus: payload?.complianceStatus || '',
  status: payload?.status || 'Active',
  inputSourceType: payload?.inputSourceType,
  inputSourceRef: payload?.inputSourceRef,
  inputQtyKg: payload?.inputQtyKg,
  outputQtyKg: payload?.outputQtyKg,
  bladeCondition: payload?.bladeCondition,
  outputDispatchedTo: payload?.outputDispatchedTo,
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

// Shredder Register API functions
export const shredderRegisterService = {
  createShredderRegister: async (data: CreateShredderRegisterRequest): Promise<ShredderRegisterResponse> => {
    const response = await apiRequest<ShredderRegisterResponse | ApiResponse<ShredderRegisterResponse>>('/shredder-registers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeShredderRegister(extractResponseData(response));
  },

  getShredderRegisterById: async (shredderId: string): Promise<ShredderRegisterResponse> => {
    const response = await apiRequest<ShredderRegisterResponse | ApiResponse<ShredderRegisterResponse>>(`/shredder-registers/${shredderId}`, {
      method: 'GET',
    });
    return normalizeShredderRegister(extractResponseData(response));
  },

  getAllShredderRegisters: async (
    companyId?: string,
    status?: string
  ): Promise<ShredderRegisterResponse[]> => {
    let url = '/shredder-registers';
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
    
    const response = await apiRequest<ShredderRegisterResponse[] | ApiResponse<ShredderRegisterResponse[]>>(url, {
      method: 'GET',
    });
    const data = extractResponseData(response);
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.map(normalizeShredderRegister);
  },

  updateShredderRegister: async (
    shredderId: string,
    data: UpdateShredderRegisterRequest
  ): Promise<ShredderRegisterResponse> => {
    const response = await apiRequest<ShredderRegisterResponse | ApiResponse<ShredderRegisterResponse>>(`/shredder-registers/${shredderId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return normalizeShredderRegister(extractResponseData(response));
  },

  deleteShredderRegister: async (shredderId: string): Promise<void> => {
    await apiRequest(`/shredder-registers/${shredderId}`, {
      method: 'DELETE',
    });
  },
};

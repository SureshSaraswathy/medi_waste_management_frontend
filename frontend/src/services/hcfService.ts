import { API_BASE_URL } from './apiBaseUrl';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateHcfRequest {
  companyId: string;
  hcfCode: string;
  password?: string;
  hcfTypeCode?: string;
  hcfName: string;
  hcfShortName?: string;
  areaId?: string;
  pincode?: string;
  district?: string;
  stateCode?: string;
  groupCode?: string;
  pcbZone?: string;
  billingName?: string;
  billingAddress?: string;
  serviceAddress?: string;
  gstin?: string;
  regnNum?: string;
  hospRegnDate?: string;
  billingType?: string;
  advAmount?: string;
  billingOption?: string;
  bedCount?: string;
  bedRate?: string;
  kgRate?: string;
  lumpsum?: string;
  accountsLandline?: string;
  accountsMobile?: string;
  accountsEmail?: string;
  contactName?: string;
  contactDesignation?: string;
  contactMobile?: string;
  contactEmail?: string;
  agrSignAuthName?: string;
  agrSignAuthDesignation?: string;
  drName?: string;
  drPhNo?: string;
  drEmail?: string;
  serviceStartDate?: string;
  serviceEndDate?: string;
  category?: string;
  route?: string;
  executive_Assigned?: string;
  submitBy?: string;
  agrID?: string;
  sortOrder?: string;
  isGovt?: boolean;
  isGSTExempt?: boolean;
  autoGen?: boolean;
}

export interface UpdateHcfRequest {
  hcfName?: string;
  hcfShortName?: string;
  areaId?: string;
  pincode?: string;
  district?: string;
  stateCode?: string;
  groupCode?: string;
  pcbZone?: string;
  billingName?: string;
  billingAddress?: string;
  serviceAddress?: string;
  gstin?: string;
  regnNum?: string;
  hospRegnDate?: string;
  billingType?: string;
  advAmount?: string;
  billingOption?: string;
  bedCount?: string;
  bedRate?: string;
  kgRate?: string;
  lumpsum?: string;
  accountsLandline?: string;
  accountsMobile?: string;
  accountsEmail?: string;
  contactName?: string;
  contactDesignation?: string;
  contactMobile?: string;
  contactEmail?: string;
  agrSignAuthName?: string;
  agrSignAuthDesignation?: string;
  drName?: string;
  drPhNo?: string;
  drEmail?: string;
  serviceStartDate?: string;
  serviceEndDate?: string;
  category?: string;
  route?: string;
  executive_Assigned?: string;
  submitBy?: string;
  agrID?: string;
  sortOrder?: string;
  isGovt?: boolean;
  isGSTExempt?: boolean;
  autoGen?: boolean;
  status?: 'Active' | 'Inactive';
}

export interface HcfResponse {
  id: string;
  companyId: string;
  hcfCode: string;
  password?: string;
  hcfTypeCode?: string;
  hcfName: string;
  hcfShortName?: string;
  areaId?: string;
  pincode?: string;
  district?: string;
  stateCode?: string;
  groupCode?: string;
  pcbZone?: string;
  billingName?: string;
  billingAddress?: string;
  serviceAddress?: string;
  gstin?: string;
  regnNum?: string;
  hospRegnDate?: string;
  billingType?: string;
  advAmount?: string;
  billingOption?: string;
  bedCount?: string;
  bedRate?: string;
  kgRate?: string;
  lumpsum?: string;
  accountsLandline?: string;
  accountsMobile?: string;
  accountsEmail?: string;
  contactName?: string;
  contactDesignation?: string;
  contactMobile?: string;
  contactEmail?: string;
  agrSignAuthName?: string;
  agrSignAuthDesignation?: string;
  drName?: string;
  drPhNo?: string;
  drEmail?: string;
  serviceStartDate?: string;
  serviceEndDate?: string;
  category?: string;
  route?: string;
  executive_Assigned?: string;
  submitBy?: string;
  agrID?: string;
  sortOrder?: string;
  isGovt?: boolean;
  isGSTExempt?: boolean;
  autoGen?: boolean;
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

// HCF API functions
// NOTE: Backend API needs to be created. This service is ready for integration.
export const hcfService = {
  createHcf: async (data: CreateHcfRequest): Promise<HcfResponse> => {
    const response = await apiRequest<ApiResponse<HcfResponse>>('/hcfs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getHcfById: async (hcfId: string): Promise<HcfResponse> => {
    const response = await apiRequest<ApiResponse<HcfResponse>>(`/hcfs/${hcfId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllHcfs: async (companyId?: string, activeOnly: boolean = false): Promise<HcfResponse[]> => {
    let url = '/hcfs';
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
    
    const response = await apiRequest<ApiResponse<HcfResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateHcf: async (hcfId: string, data: UpdateHcfRequest): Promise<HcfResponse> => {
    const response = await apiRequest<ApiResponse<HcfResponse>>(`/hcfs/${hcfId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteHcf: async (hcfId: string): Promise<void> => {
    await apiRequest(`/hcfs/${hcfId}`, {
      method: 'DELETE',
    });
  },
};

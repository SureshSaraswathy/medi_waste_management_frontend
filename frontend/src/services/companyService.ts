import { API_BASE_URL } from './apiBaseUrl';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateCompanyRequest {
  companyCode: string;
  companyName: string;
  gstin?: string;
  pincode?: string;
  state?: string;
  prefix?: string;
  // Address Information
  regdOfficeAddress?: string;
  adminOfficeAddress?: string;
  factoryAddress?: string;
  // Authorized Person Information
  authPersonName?: string;
  authPersonDesignation?: string;
  authPersonDOB?: string;
  // PCB & Compliance
  pcbauthNum?: string;
  hazardousWasteNum?: string;
  // CTO (Consent To Operate) - Water
  ctoWaterNum?: string;
  ctoWaterDate?: string;
  ctoWaterValidUpto?: string;
  // CTO (Consent To Operate) - Air
  ctoAirNum?: string;
  ctoAirDate?: string;
  ctoAirValidUpto?: string;
  // CTE (Consent To Establish) - Water
  cteWaterNum?: string;
  cteWaterDate?: string;
  cteWaterValidUpto?: string;
  // CTE (Consent To Establish) - Air
  cteAirNum?: string;
  cteAirDate?: string;
  cteAirValidUpto?: string;
  // GST Details
  pcbZoneID?: string;
  gstValidFrom?: string;
  gstRate?: string;
  // Contact Information
  contactNum?: string;
  webAddress?: string;
  companyEmail?: string;
  // Bank & Payment Information
  bankAccountName?: string;
  bankName?: string;
  bankAccountNum?: string;
  bankIFSCode?: string;
  bankBranch?: string;
  upiId?: string;
  qrCode?: string;
}

export interface UpdateCompanyRequest {
  companyCode?: string;
  companyName?: string;
  gstin?: string;
  pincode?: string;
  state?: string;
  prefix?: string;
  // Address Information
  regdOfficeAddress?: string;
  adminOfficeAddress?: string;
  factoryAddress?: string;
  // Authorized Person Information
  authPersonName?: string;
  authPersonDesignation?: string;
  authPersonDOB?: string;
  // PCB & Compliance
  pcbauthNum?: string;
  hazardousWasteNum?: string;
  // CTO (Consent To Operate) - Water
  ctoWaterNum?: string;
  ctoWaterDate?: string;
  ctoWaterValidUpto?: string;
  // CTO (Consent To Operate) - Air
  ctoAirNum?: string;
  ctoAirDate?: string;
  ctoAirValidUpto?: string;
  // CTE (Consent To Establish) - Water
  cteWaterNum?: string;
  cteWaterDate?: string;
  cteWaterValidUpto?: string;
  // CTE (Consent To Establish) - Air
  cteAirNum?: string;
  cteAirDate?: string;
  cteAirValidUpto?: string;
  // GST Details
  pcbZoneID?: string;
  gstValidFrom?: string;
  gstRate?: string;
  status?: 'Active' | 'Inactive';
  // Contact Information
  contactNum?: string;
  webAddress?: string;
  companyEmail?: string;
  // Bank & Payment Information
  bankAccountName?: string;
  bankName?: string;
  bankAccountNum?: string;
  bankIFSCode?: string;
  bankBranch?: string;
  upiId?: string;
  qrCode?: string;
}

export interface CompanyResponse {
  id: string;
  companyCode: string;
  companyName: string;
  gstin?: string | null;
  pincode?: string | null;
  state?: string | null;
  prefix?: string | null;
  // Address Information
  regdOfficeAddress?: string | null;
  adminOfficeAddress?: string | null;
  factoryAddress?: string | null;
  // Authorized Person Information
  authPersonName?: string | null;
  authPersonDesignation?: string | null;
  authPersonDOB?: string | null;
  // PCB & Compliance
  pcbauthNum?: string | null;
  hazardousWasteNum?: string | null;
  // CTO (Consent To Operate) - Water
  ctoWaterNum?: string | null;
  ctoWaterDate?: string | null;
  ctoWaterValidUpto?: string | null;
  // CTO (Consent To Operate) - Air
  ctoAirNum?: string | null;
  ctoAirDate?: string | null;
  ctoAirValidUpto?: string | null;
  // CTE (Consent To Establish) - Water
  cteWaterNum?: string | null;
  cteWaterDate?: string | null;
  cteWaterValidUpto?: string | null;
  // CTE (Consent To Establish) - Air
  cteAirNum?: string | null;
  cteAirDate?: string | null;
  cteAirValidUpto?: string | null;
  // GST Details
  pcbZoneID?: string | null;
  gstValidFrom?: string | null;
  gstRate?: string | null;
  status: 'Active' | 'Inactive';
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string;
  // Contact Information
  contactNum?: string | null;
  webAddress?: string | null;
  companyEmail?: string | null;
  // Bank & Payment Information
  bankAccountName?: string | null;
  bankName?: string | null;
  bankAccountNum?: string | null;
  bankIFSCode?: string | null;
  bankBranch?: string | null;
  upiId?: string | null;
  qrCode?: string | null;
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
      
      // Handle different error response formats
      if (Array.isArray(errorData.message)) {
        // Validation errors come as an array
        errorMessage = errorData.message.join(', ');
      } else if (typeof errorData.message === 'string') {
        // Single error message
        errorMessage = errorData.message;
      } else if (errorData.error) {
        // Error object with error field
        errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : JSON.stringify(errorData.error);
      } else if (errorData.message) {
        // Any other message format
        errorMessage = String(errorData.message);
      }
    } catch {
      // If response is not JSON, use default message
      // For 401/403, provide a clearer message
      if (response.status === 401) {
        errorMessage = 'User not authenticated';
      } else if (response.status === 403) {
        errorMessage = 'Access forbidden';
      }
    }
    
    // Create error object with more details
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

// Company API functions
export const companyService = {
  // Create company
  createCompany: async (data: CreateCompanyRequest): Promise<CompanyResponse> => {
    const response = await apiRequest<ApiResponse<CompanyResponse>>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Get company by ID
  getCompanyById: async (companyId: string): Promise<CompanyResponse> => {
    const response = await apiRequest<ApiResponse<CompanyResponse>>(`/companies/${companyId}`, {
      method: 'GET',
    });
    return response.data;
  },

  // Get all companies
  getAllCompanies: async (activeOnly: boolean = false): Promise<CompanyResponse[]> => {
    const url = activeOnly ? '/companies?activeOnly=true' : '/companies';
    const response = await apiRequest<ApiResponse<CompanyResponse[]>>(url, {
      method: 'GET',
    });
    return response.data || [];
  },

  // Update company
  updateCompany: async (companyId: string, data: UpdateCompanyRequest): Promise<CompanyResponse> => {
    const response = await apiRequest<ApiResponse<CompanyResponse>>(`/companies/${companyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Delete company
  deleteCompany: async (companyId: string): Promise<void> => {
    await apiRequest(`/companies/${companyId}`, {
      method: 'DELETE',
    });
  },
};

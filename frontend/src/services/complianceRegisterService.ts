import { API_BASE_URL } from './apiBaseUrl';

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
      }
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    } catch (parseError) {
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  const jsonResponse = await response.json();
  return jsonResponse.data || jsonResponse;
};

export interface ComplianceRegisterResponse {
  id: string;
  complianceName: string;
  complianceType: string;
  authority: string;
  referenceNumber?: string | null;
  issueDate: string;
  expiryDate?: string | null;
  reminderDays?: number | null;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Draft';
  documentUrl?: string | null;
  remarks?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplianceRegisterRequest {
  complianceName: string;
  complianceType: string;
  authority: string;
  referenceNumber?: string;
  issueDate: string;
  expiryDate?: string;
  reminderDays?: number;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Draft';
  documentUrl?: string;
  remarks?: string;
}

export interface UpdateComplianceRegisterRequest {
  complianceName?: string;
  complianceType?: string;
  authority?: string;
  referenceNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  reminderDays?: number;
  status?: 'Active' | 'Expiring Soon' | 'Expired' | 'Draft';
  documentUrl?: string;
  remarks?: string;
}

export interface ComplianceRegisterFilters {
  status?: string;
  authority?: string;
  complianceType?: string;
  dateFrom?: string;
  dateTo?: string;
  showExpired?: boolean;
  search?: string;
}

class ComplianceRegisterService {
  private baseUrl = '/compliance';

  /**
   * Get all compliance registers
   */
  async getAllComplianceRegisters(
    filters?: ComplianceRegisterFilters
  ): Promise<ComplianceRegisterResponse[]> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.authority) params.append('authority', filters.authority);
    if (filters?.complianceType) params.append('complianceType', filters.complianceType);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.showExpired !== undefined) params.append('showExpired', String(filters.showExpired));
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

    return await apiRequest<ComplianceRegisterResponse[]>(url, {
      method: 'GET',
    });
  }

  /**
   * Get a single compliance register by ID
   */
  async getComplianceRegisterById(id: string): Promise<ComplianceRegisterResponse> {
    return await apiRequest<ComplianceRegisterResponse>(`${this.baseUrl}/${id}`, {
      method: 'GET',
    });
  }

  /**
   * Create a new compliance register
   */
  async createComplianceRegister(
    data: CreateComplianceRegisterRequest
  ): Promise<ComplianceRegisterResponse> {
    return await apiRequest<ComplianceRegisterResponse>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an existing compliance register
   */
  async updateComplianceRegister(
    id: string,
    data: UpdateComplianceRegisterRequest
  ): Promise<ComplianceRegisterResponse> {
    return await apiRequest<ComplianceRegisterResponse>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a compliance register
   */
  async deleteComplianceRegister(id: string): Promise<void> {
    await apiRequest(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Download compliance document
   */
  async downloadDocument(documentUrl: string): Promise<Blob> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(`${API_BASE_URL}${documentUrl}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    return response.blob();
  }
}

export const complianceRegisterService = new ComplianceRegisterService();

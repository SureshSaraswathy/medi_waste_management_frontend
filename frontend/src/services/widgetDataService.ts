/**
 * Widget Data Service
 * 
 * Fetches data from backend dashboard APIs for widgets.
 * Maps backend API responses to widget data format.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * Get auth token from localStorage
 */
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

/**
 * API request helper
 */
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  // Check if endpoint already includes full URL or /api/v1
  let url: string;
  if (endpoint.startsWith('http')) {
    url = endpoint;
  } else if (endpoint.startsWith('/api/v1')) {
    // Endpoint already has /api/v1 prefix, use it directly with base URL
    // Extract base URL without /api/v1
    const baseUrl = API_BASE_URL.endsWith('/api/v1') 
      ? API_BASE_URL.replace('/api/v1', '')
      : API_BASE_URL.split('/api/v1')[0] || 'http://localhost:3000';
    url = `${baseUrl}${endpoint}`;
  } else {
    // Add /api/v1 prefix if not already present
    url = `${API_BASE_URL}${endpoint}`;
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const responseText = await response.text();
        if (responseText) {
          const errorData = JSON.parse(responseText);
          if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message.join(', ');
          } else if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
        }
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('[widgetDataService] Request failed:', error);
    throw error;
  }
};

/**
 * Fetch KPI data from backend
 */
export const fetchKpiData = async (endpoint: string): Promise<{
  value: number | string;
  unit?: string;
  label?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
}> => {
  try {
    console.log('[widgetDataService] Fetching KPI from endpoint:', endpoint);
    const response = await apiRequest<any>(endpoint);
    
    console.log('[widgetDataService] Raw API response:', response);
    
    // Handle different response formats
    let kpiData: any;
    if (response && typeof response === 'object') {
      if (response.success !== undefined && response.data) {
        // Format: { success: true, data: { ... } }
        kpiData = response.data;
      } else if (response.value !== undefined || response.label !== undefined) {
        // Format: { label: "...", value: ... } (direct response)
        kpiData = response;
      } else if (response.data && (response.data.value !== undefined || response.data.label !== undefined)) {
        // Format: { data: { ... } } (nested data)
        kpiData = response.data;
      } else {
        // Fallback: use response as-is
        kpiData = response;
      }
    } else {
      console.warn('[widgetDataService] Unexpected response format:', response);
      kpiData = {};
    }

    console.log('[widgetDataService] Extracted KPI data:', kpiData);

    // Map backend KPI response to widget format
    // Backend returns: { label: string, value: number, format: string, trend?: number }
    const value = typeof kpiData.value === 'number' 
      ? kpiData.value 
      : (kpiData.value !== undefined && kpiData.value !== null && kpiData.value !== '')
        ? parseFloat(String(kpiData.value)) || 0
        : 0;
    
    const trend = kpiData.trend !== undefined && kpiData.trend !== null ? {
      value: Math.abs(Number(kpiData.trend)),
      isPositive: Number(kpiData.trend) >= 0,
      period: 'vs previous period',
    } : undefined;

    const result = {
      value,
      unit: kpiData.unit || (kpiData.format === 'currency' ? 'INR' : ''),
      label: kpiData.label || '',
      trend,
    };

    console.log('[widgetDataService] Final mapped KPI result:', result);
    return result;
  } catch (error: any) {
    console.error('[widgetDataService] Failed to fetch KPI data:', error);
    console.error('[widgetDataService] Endpoint:', endpoint);
    console.error('[widgetDataService] Error details:', {
      message: error?.message,
      stack: error?.stack,
    });
    // Return default values instead of throwing to prevent widget breaking
    return {
      value: 0,
      unit: '',
      label: '',
    };
  }
};

/**
 * Fetch chart data from backend
 */
export const fetchChartData = async (endpoint: string): Promise<{
  data: Array<{ [key: string]: any }>;
  labels?: string[];
}> => {
  try {
    const response = await apiRequest<{ success: boolean; data: any }>(endpoint);
    const chartData = response.data;

    // Map backend chart response to widget format
    if (chartData.labels && chartData.data) {
      // Format: { labels: [...], data: [...] }
      return {
        labels: chartData.labels,
        data: chartData.labels.map((label: string, index: number) => ({
          label,
          value: chartData.data[index] || 0,
        })),
      };
    } else if (Array.isArray(chartData)) {
      // Format: array of data points
      return { data: chartData };
    } else {
      // Fallback: return as-is
      return { data: [chartData] };
    }
  } catch (error) {
    console.error('[widgetDataService] Failed to fetch chart data:', error);
    throw error;
  }
};

/**
 * Fetch table data from backend
 */
export const fetchTableData = async (endpoint: string): Promise<{
  columns: Array<{ key: string; label: string }>;
  data: Array<Record<string, any>>;
}> => {
  try {
    const response = await apiRequest<{ success: boolean; data: any }>(endpoint);
    const tableData = response.data;

    // Map backend table response to widget format
    if (tableData.columns && tableData.rows) {
      return {
        columns: tableData.columns.map((col: string) => ({
          key: col,
          label: col,
        })),
        data: tableData.rows.map((row: Record<string, any>) => {
          // Map row data using column names as keys
          const mappedRow: Record<string, any> = {};
          tableData.columns.forEach((col: string) => {
            mappedRow[col] = row[col] || '';
          });
          return mappedRow;
        }),
      };
    } else {
      // Fallback: empty table
      return {
        columns: [],
        data: [],
      };
    }
  } catch (error) {
    console.error('[widgetDataService] Failed to fetch table data:', error);
    throw error;
  }
};

/**
 * Fetch task/alert data from backend
 */
export const fetchTaskData = async (endpoint: string): Promise<{
  tasks?: Array<any>;
  alerts?: Array<any>;
  items?: Array<any>;
  activities?: Array<any>;
}> => {
  try {
    const response = await apiRequest<{ success: boolean; data: any[] }>(endpoint);
    const taskData = response.data;

    // Map backend task/alert response to widget format
    if (Array.isArray(taskData)) {
      // Determine type based on endpoint or data structure
      if (endpoint.includes('task') || endpoint.includes('approval')) {
        return { tasks: taskData, items: taskData };
      } else if (endpoint.includes('alert')) {
        return { alerts: taskData };
      } else if (endpoint.includes('activity') || endpoint.includes('timeline')) {
        return { activities: taskData };
      } else {
        return { tasks: taskData };
      }
    } else {
      return {};
    }
  } catch (error) {
    console.error('[widgetDataService] Failed to fetch task data:', error);
    throw error;
  }
};

/**
 * Fetch widget data based on widget configuration
 */
export const fetchWidgetData = async (widget: {
  type: string;
  dataSource?: {
    endpoint: string;
    method?: 'GET' | 'POST';
    params?: Record<string, any>;
  };
}): Promise<any> => {
  if (!widget.dataSource?.endpoint) {
    return null;
  }

  try {
    switch (widget.type) {
      case 'metric':
        return await fetchKpiData(widget.dataSource.endpoint);

      case 'chart':
        return await fetchChartData(widget.dataSource.endpoint);

      case 'table':
        return await fetchTableData(widget.dataSource.endpoint);

      case 'task-list':
      case 'approval-queue':
      case 'activity-timeline':
      case 'alert':
        return await fetchTaskData(widget.dataSource.endpoint);

      default:
        console.warn(`Unknown widget type: ${widget.type}`);
        return null;
    }
  } catch (error) {
    console.error(`[widgetDataService] Failed to fetch data for widget type ${widget.type}:`, error);
    throw error;
  }
};

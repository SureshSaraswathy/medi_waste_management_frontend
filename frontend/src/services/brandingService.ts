import { API_BASE_URL } from './apiBaseUrl';

export interface AppLogoMeta {
  hasLogo: boolean;
  version: number;
  /** API-relative url, e.g. /branding/app-logo?v=123 */
  url: string | null;
}

export const EMPTY_APP_LOGO: AppLogoMeta = { hasLogo: false, version: 0, url: null };

/** Turn an API-relative path (as returned by the backend) into an absolute URL. */
export const resolveApiUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
};

const getAuthToken = (): string | null => {
  try {
    const raw = localStorage.getItem('mw-auth-user');
    if (raw) return JSON.parse(raw).token || null;
  } catch {
    /* ignore */
  }
  return null;
};

const readError = async (response: Response): Promise<string> => {
  try {
    const body = await response.json();
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string') return body.message;
  } catch {
    /* ignore */
  }
  if (response.status === 403) return 'You do not have permission to do this.';
  return `HTTP ${response.status}: ${response.statusText}`;
};

export const brandingService = {
  /** Public endpoint (no token needed): used by the login page and loading screen. */
  getAppLogoMeta: async (): Promise<AppLogoMeta> => {
    try {
      const response = await fetch(`${API_BASE_URL}/branding/app-logo/meta`);
      if (!response.ok) return EMPTY_APP_LOGO;
      const body = await response.json();
      const d = body?.data;
      return d ? { hasLogo: !!d.hasLogo, version: Number(d.version) || 0, url: d.url ?? null } : EMPTY_APP_LOGO;
    } catch {
      return EMPTY_APP_LOGO;
    }
  },

  /**
   * Is the signed-in user the designated SuperAdmin? Answered by the SAME rule the API applies to the write endpoints
   * (identity, not the wildcard permission). Fails closed: any error, 401/403 or malformed answer means "no".
   */
  canManageBranding: async (): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/branding/access`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return false;
      return (await response.json())?.data?.canManageBranding === true;
    } catch {
      return false;
    }
  },

  /** SuperAdmin only. */
  uploadAppLogo: async (file: File): Promise<AppLogoMeta> => {
    const token = getAuthToken();
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_BASE_URL}/branding/app-logo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined, // no Content-Type: browser sets the multipart boundary
      body: form,
    });
    if (!response.ok) throw new Error(await readError(response));
    return (await response.json()).data as AppLogoMeta;
  },

  /** SuperAdmin only. */
  removeAppLogo: async (): Promise<void> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/branding/app-logo`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) throw new Error(await readError(response));
  },
};

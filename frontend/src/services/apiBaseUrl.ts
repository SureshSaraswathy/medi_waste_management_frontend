/**
 * API Base URL helper
 *
 * Why:
 * - On real mobile devices, `localhost` refers to the phone itself (NOT your dev PC),
 *   which causes `TypeError: Failed to fetch`.
 *
 * Behavior:
 * - Prefer `VITE_API_BASE_URL` when provided.
 * - Otherwise, use the current browser hostname with backend port 3000.
 */

export const getApiBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    // Keep same host, assume backend runs on port 3000.
    return `http://${host}:3000/api/v1`;
  }

  // Fallback for non-browser contexts
  return 'http://localhost:3000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();


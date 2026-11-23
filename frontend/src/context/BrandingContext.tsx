import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppLogoMeta, brandingService, EMPTY_APP_LOGO, resolveApiUrl } from '../services/brandingService';

/**
 * Application Branding (Application Logo).
 *
 * - Loads the public logo meta once and exposes it to React components (login, loading screen).
 * - Publishes the logo to CSS (`html[data-app-logo]` + `--app-logo-url`) so the existing sidebar
 *   brand tile on every screen picks it up WITHOUT editing each page (see styles/branding.css).
 * - Keeps the browser favicon in sync.
 * - When no logo is configured nothing is applied and the existing branding is untouched.
 */

interface BrandingContextValue {
  hasLogo: boolean;
  /** Absolute, cache-busted image url (null when no logo is configured) */
  logoUrl: string | null;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  hasLogo: false,
  logoUrl: null,
  refresh: async () => {},
});

const CACHE_KEY = 'mw-app-logo-meta';

const readCache = (): AppLogoMeta => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.hasLogo && parsed.url) return parsed as AppLogoMeta;
    }
  } catch {
    /* storage unavailable */
  }
  return EMPTY_APP_LOGO;
};

const writeCache = (meta: AppLogoMeta) => {
  try {
    if (meta.hasLogo) localStorage.setItem(CACHE_KEY, JSON.stringify(meta));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* storage unavailable */
  }
};

const applyToDocument = (absoluteUrl: string | null) => {
  const root = document.documentElement;
  const existing = document.querySelector<HTMLLinkElement>('link[data-app-branding="favicon"]');

  if (absoluteUrl) {
    root.setAttribute('data-app-logo', 'true');
    root.style.setProperty('--app-logo-url', `url("${absoluteUrl}")`);
    const link = existing ?? document.createElement('link');
    link.rel = 'icon';
    link.setAttribute('data-app-branding', 'favicon');
    link.href = absoluteUrl;
    if (!existing) document.head.appendChild(link);
  } else {
    root.removeAttribute('data-app-logo');
    root.style.removeProperty('--app-logo-url');
    existing?.remove();
  }
};

export const BrandingProvider = ({ children }: PropsWithChildren) => {
  // Start from the last known logo so the page does not flash the default mark on reload
  const [meta, setMeta] = useState<AppLogoMeta>(() => readCache());

  const refresh = useCallback(async () => {
    const fresh = await brandingService.getAppLogoMeta();
    writeCache(fresh);
    setMeta(fresh);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const candidateUrl = meta.hasLogo ? resolveApiUrl(meta.url) : null;

  // Safe fallback: a configured logo whose file cannot be loaded (missing file, server error, offline) is NOT applied,
  // otherwise the sidebar would hide the default mark and show an empty tile. A URL that failed once is remembered
  // until the version changes (an upload gives a new URL).
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!candidateUrl) return undefined;
    let cancelled = false;
    const probe = new Image();
    probe.onerror = () => { if (!cancelled) setFailedUrl(candidateUrl); };
    probe.onload = () => { if (!cancelled) setFailedUrl((f) => (f === candidateUrl ? null : f)); };
    probe.src = candidateUrl;
    return () => { cancelled = true; };
  }, [candidateUrl]);
  const logoUrl = candidateUrl && candidateUrl !== failedUrl ? candidateUrl : null;

  useEffect(() => {
    applyToDocument(logoUrl);
  }, [logoUrl]);

  const value = useMemo<BrandingContextValue>(
    () => ({ hasLogo: !!logoUrl, logoUrl, refresh }),
    [logoUrl, refresh],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = () => useContext(BrandingContext);

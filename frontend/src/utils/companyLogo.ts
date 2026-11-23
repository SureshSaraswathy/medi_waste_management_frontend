import { companyService } from '../services/companyService';

/**
 * Company logo for documents (PDF, print, downloadable HTML).
 *
 * - Always resolved from the DOCUMENT's companyId (never from "the logged-in user").
 * - Returns null when the company has no logo, so callers keep their existing layout.
 * - Never throws: a logo problem must not break document generation.
 * - SVG logos are rasterised to PNG, because jsPDF / html2canvas handle raster images reliably.
 */

export interface CompanyLogoAsset {
  /** data: URL (PNG or JPEG) usable in <img src> and jsPDF.addImage */
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  width: number;
  height: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
/** A logo that cannot be fetched and decoded within this time is treated as "no logo": the document is produced without it. */
const LOGO_TIMEOUT_MS = 8000;
/** Raster logos larger than this (longest side, px) are scaled down once; a header logo is at most ~200 px wide, so 800 px stays sharp at print resolution. */
const MAX_RASTER_PX = 800;
const cache = new Map<string, { at: number; value: Promise<CompanyLogoAsset | null> }>();

const withTimeout = <T,>(work: Promise<T>, ms: number, fallback: T): Promise<T> =>
  new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    work.then(
      (v) => { clearTimeout(timer); resolve(v); },
      () => { clearTimeout(timer); resolve(fallback); },
    );
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Logo image could not be decoded'));
    img.src = src;
  });

const build = async (companyId: string): Promise<CompanyLogoAsset | null> => {
  try {
    const blob = await companyService.fetchLogoBlob(companyId);
    if (!blob || blob.size === 0) return null;

    const sourceUrl = await blobToDataUrl(blob);
    const img = await loadImage(sourceUrl);

    if (blob.type === 'image/svg+xml') {
      // SVG without width/height reports 0: fall back to a sensible box
      const w = img.naturalWidth || 300;
      const h = img.naturalHeight || 150;
      const scale = Math.min(2, 1200 / Math.max(w, h)); // crisp but bounded
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return { dataUrl: canvas.toDataURL('image/png'), format: 'PNG', width: canvas.width, height: canvas.height };
    }

    const format: 'PNG' | 'JPEG' = blob.type === 'image/jpeg' ? 'JPEG' : 'PNG';
    const original: CompanyLogoAsset = { dataUrl: sourceUrl, format, width: img.naturalWidth, height: img.naturalHeight };

    // Downscale oversized rasters (an upload may be up to 4000 px / 2 MB) so every PDF does not embed the full-size file.
    // Aspect ratio is kept, nothing is ever enlarged, PNG stays PNG (transparency kept) and JPEG stays JPEG at high quality.
    // If anything goes wrong, or the result is not actually smaller, the original is used unchanged.
    const longest = Math.max(original.width, original.height);
    if (longest > MAX_RASTER_PX) {
      try {
        const scale = MAX_RASTER_PX / longest;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(original.width * scale));
        canvas.height = Math.max(1, Math.round(original.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const scaled = canvas.toDataURL(format === 'JPEG' ? 'image/jpeg' : 'image/png', 0.92);
          if (scaled.length < sourceUrl.length) {
            return { dataUrl: scaled, format, width: canvas.width, height: canvas.height };
          }
        }
      } catch {
        // keep the original
      }
    }
    return original;
  } catch {
    return null;
  }
};

/**
 * Logo of the given company for use in a document, or null. Never throws and never waits longer than the timeout.
 * Only a logo that was actually loaded is cached (briefly); a failure, a timeout or "no logo" is NOT cached, so a transient
 * error cannot hide the logo from later documents.
 */
export const getCompanyLogo = (
  companyId?: string | null,
  options?: { timeoutMs?: number },
): Promise<CompanyLogoAsset | null> => {
  if (!companyId) return Promise.resolve(null);
  const hit = cache.get(companyId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const value: Promise<CompanyLogoAsset | null> = withTimeout(build(companyId), options?.timeoutMs ?? LOGO_TIMEOUT_MS, null).then((logo) => {
    if (!logo && cache.get(companyId)?.value === value) cache.delete(companyId);
    return logo;
  });
  cache.set(companyId, { at: Date.now(), value });
  return value;
};

/** Forget cached logos (e.g. after a logo is changed). */
export const clearCompanyLogoCache = (companyId?: string) => {
  if (companyId) cache.delete(companyId);
  else cache.clear();
};

/** Fit an image into a max box without stretching (keeps aspect ratio). */
export const fitLogo = (logo: CompanyLogoAsset, maxWidth: number, maxHeight: number) => {
  const ratio = Math.min(maxWidth / logo.width, maxHeight / logo.height);
  return { width: Math.round(logo.width * ratio), height: Math.round(logo.height * ratio) };
};

/** Company id of the logged-in user (used as a default for reports that have no company filter). */
export const getLoggedInCompanyId = (): string | null => {
  try {
    const raw = localStorage.getItem('mw-auth-user');
    const id = raw ? JSON.parse(raw)?.companyId : null;
    // The SuperAdmin "system company" is not a real company and has no logo
    return id && id !== '00000000-0000-0000-0000-000000000000' ? String(id) : null;
  } catch {
    return null;
  }
};

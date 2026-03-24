const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type WasteCollectionSummaryOption = 'Route' | 'HCF' | 'Period' | 'PCB Zone';

export type WasteCollectionSummaryFilter = {
  option: WasteCollectionSummaryOption;
  routeId?: string;
  hcfId?: string;
  pcbZoneId?: string;
  fromDate: string;
  toDate: string;
};

export type WasteCollectionSummaryWeightRow = {
  serialNo: number;
  yellowWeight: number;
  redWeight: number;
  blueWeight: number;
  whiteWeight: number;
  totalWeight: number;
};

export type RouteWiseWasteCollectionRow = WasteCollectionSummaryWeightRow & {
  hcfCode: string;
  hcfShortName: string;
  area: string;
};

export type HcfWiseDailyCollectionRow = WasteCollectionSummaryWeightRow & {
  date: string;
  yellowCount: number;
  redCount: number;
  blueCount: number;
  whiteCount: number;
};

export type PcbZoneSummaryRow = WasteCollectionSummaryWeightRow & {
  hcfCode: string;
  hcfName: string;
  serviceAddress: string;
};

export type MissingCollectionRow = {
  serialNo: number;
  date: string;
  hcfCode: string;
  hcfName: string;
  area: string;
  route: string;
  reason?: string;
};

export type WasteCollectionSummaryResponse = {
  option: WasteCollectionSummaryOption;
  headerTitle: string;
  routeWiseRows: RouteWiseWasteCollectionRow[];
  hcfWiseRows: HcfWiseDailyCollectionRow[];
  periodWiseRows: RouteWiseWasteCollectionRow[];
  pcbZoneRows: PcbZoneSummaryRow[];
  missingRows: MissingCollectionRow[];
  meta: {
    routeOptions: Array<{ routeId: string; routeName: string }>;
    hcfOptions: Array<{ hcfId: string; hcfName: string }>;
    pcbZoneOptions: Array<{ pcbZoneId: string; pcbZoneName: string }>;
  };
};

const getToken = (): string | null => {
  const raw = localStorage.getItem('mw-auth-user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
};

export const getWasteCollectionSummaryReport = async (
  filter: WasteCollectionSummaryFilter,
): Promise<WasteCollectionSummaryResponse> => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/reports/waste-collection-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(filter),
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') message = json.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const json = (await response.json()) as ApiResponse<WasteCollectionSummaryResponse>;
  return json.data;
};


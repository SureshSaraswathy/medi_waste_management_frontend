/**
 * Client-side preview of manual invoice GST (mirrors backend invoice-gst-calculation.util + invoice-calculation flow).
 */

export const DEFAULT_GST_RATE_PERCENT = 18;

export function parseCompanyGstRatePercent(raw: string | null | undefined): number {
  if (raw == null || String(raw).trim() === '') {
    return DEFAULT_GST_RATE_PERCENT;
  }
  const n = parseFloat(String(raw).replace(/%/g, '').trim());
  if (Number.isNaN(n) || n < 0) {
    return DEFAULT_GST_RATE_PERCENT;
  }
  return n;
}

export function normalizeStateToken(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value).trim().toUpperCase();
}

export function extractStateCodeFromGstin(gstin: string | null | undefined): string | null {
  if (!gstin || typeof gstin !== 'string') return null;
  const g = gstin.trim().toUpperCase();
  if (g.length < 2) return null;
  const a = g[0];
  const b = g[1];
  if (a >= '0' && a <= '9' && b >= '0' && b <= '9') {
    return `${a}${b}`;
  }
  return null;
}

export function resolveCompanyStateCodeForSupply(
  gstin: string | null | undefined,
  stateLabel: string | null | undefined,
): string | null {
  const fromGstin = extractStateCodeFromGstin(gstin);
  if (fromGstin) return fromGstin;
  const s = normalizeStateToken(stateLabel);
  return s.length > 0 ? s : null;
}

export function isInterStateSupply(
  companyGstin: string | null | undefined,
  companyState: string | null | undefined,
  hcfStateCode: string | null | undefined,
): boolean {
  const companyCode = resolveCompanyStateCodeForSupply(companyGstin, companyState);
  const hcfCode = normalizeStateToken(hcfStateCode);
  if (!companyCode || !hcfCode) {
    return false;
  }
  return companyCode !== hcfCode;
}

export function splitGstTaxAmount(
  totalGstAmount: number,
  interState: boolean,
): { igst: number; cgst: number; sgst: number } {
  if (totalGstAmount <= 0) {
    return { igst: 0, cgst: 0, sgst: 0 };
  }
  if (interState) {
    return { igst: totalGstAmount, cgst: 0, sgst: 0 };
  }
  const half = totalGstAmount / 2;
  return { igst: 0, cgst: half, sgst: half };
}

export interface ManualInvoiceTaxPreviewInput {
  billingOption: string;
  bedCount?: number;
  bedRate?: number;
  billingDays?: number;
  weightInKg?: number;
  kgRate?: number;
  lumpsumAmount?: number;
  companyGstRate?: string | null;
  companyGstin?: string | null;
  companyState?: string | null;
  hcfStateCode?: string | null;
  isGstExempt?: boolean;
}

export function computeManualInvoiceTaxPreview(input: ManualInvoiceTaxPreviewInput): {
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  invoiceValue: number;
} {
  let taxableValue = 0;
  const opt = input.billingOption;

  if (opt === 'Bed-wise') {
    const days = input.billingDays != null && input.billingDays > 0 ? input.billingDays : 30;
    const bc = input.bedCount ?? 0;
    const br = input.bedRate ?? 0;
    taxableValue = days * bc * br;
  } else if (opt === 'Weight-wise') {
    taxableValue = (input.weightInKg ?? 0) * (input.kgRate ?? 0);
  } else if (opt === 'Lumpsum') {
    taxableValue = input.lumpsumAmount ?? 0;
  }

  const gstRate = parseCompanyGstRatePercent(input.companyGstRate);
  const inter = isInterStateSupply(input.companyGstin, input.companyState, input.hcfStateCode);

  let igst = 0;
  let cgst = 0;
  let sgst = 0;

  if (!input.isGstExempt && taxableValue > 0) {
    const taxAmount = (taxableValue * gstRate) / 100;
    const split = splitGstTaxAmount(taxAmount, inter);
    igst = split.igst;
    cgst = split.cgst;
    sgst = split.sgst;
  }

  const totalBeforeRoundOff = taxableValue + igst + cgst + sgst;
  const invoiceValue = Math.round(totalBeforeRoundOff);
  const roundOff = invoiceValue - totalBeforeRoundOff;

  return {
    taxableValue: Math.round(taxableValue * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    roundOff: Math.round(roundOff * 100) / 100,
    invoiceValue,
  };
}

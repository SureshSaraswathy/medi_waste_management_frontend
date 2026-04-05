import jsPDF from 'jspdf';
import { getReceipt, getPayment } from '../services/paymentService';
import { companyService } from '../services/companyService';

export interface DownloadReceiptPdfOptions {
  companyId?: string;
  fallbackCompanyName?: string;
}

type CompanyPdfFields = {
  id: string;
  companyCode: string;
  companyName: string;
  status: string;
  regdOfficeAddress: string | null;
  adminOfficeAddress: string | null;
  factoryAddress: string | null;
  contactNum: string | null;
  companyEmail: string | null;
};

/**
 * Same Receipt Voucher PDF layout as Invoice Management (payment modal + receipt modal download).
 */
export async function downloadReceiptPdf(
  receiptId: string,
  options: DownloadReceiptPdfOptions = {},
): Promise<void> {
  const { companyId, fallbackCompanyName } = options;
  const response = await getReceipt(receiptId);
  const receiptDataAny = (response as { data?: unknown })?.data ?? response;
  const clean = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    return s.length > 0 ? s : null;
  };

  let company: CompanyPdfFields | null = null;

  if (receiptDataAny?.payment?.paymentId) {
    try {
      const paymentData = await getPayment(receiptDataAny.payment.paymentId);
      const paymentObj = (paymentData as { data?: unknown })?.data ?? paymentData;
      const paymentCompanyId = (paymentObj as { companyId?: string })?.companyId;
      if (paymentCompanyId) {
        const companyById = await companyService.getCompanyById(paymentCompanyId);
        company = {
          id: companyById.id,
          companyCode: companyById.companyCode,
          companyName: companyById.companyName,
          status: companyById.status,
          regdOfficeAddress: companyById.regdOfficeAddress || null,
          adminOfficeAddress: companyById.adminOfficeAddress || null,
          factoryAddress: companyById.factoryAddress || null,
          contactNum: companyById.contactNum || null,
          companyEmail: companyById.companyEmail || null,
        };
      }
    } catch {
      // ignore
    }
  }

  if (!company) {
    try {
      const allCompanies = await companyService.getAllCompanies(false);
      const fromAll =
        allCompanies.find((c) => c.id === companyId) ||
        allCompanies.find(
          (c) =>
            (fallbackCompanyName || '').trim().toLowerCase() !== '' &&
            c.companyName.trim().toLowerCase() === (fallbackCompanyName || '').trim().toLowerCase(),
        ) ||
        null;
      if (fromAll) {
        company = {
          id: fromAll.id,
          companyCode: fromAll.companyCode,
          companyName: fromAll.companyName,
          status: fromAll.status,
          regdOfficeAddress: fromAll.regdOfficeAddress || null,
          adminOfficeAddress: fromAll.adminOfficeAddress || null,
          factoryAddress: fromAll.factoryAddress || null,
          contactNum: fromAll.contactNum || null,
          companyEmail: fromAll.companyEmail || null,
        };
      }
    } catch {
      // ignore
    }
  }

  const address =
    clean(company?.regdOfficeAddress) ||
    clean(company?.adminOfficeAddress) ||
    clean(company?.factoryAddress) ||
    '-';
  const totalAmount = Number((receiptDataAny as { totalAmount?: number }).totalAmount || 0);
  const formatAmount = (n: number) => `Rs. ${Number(n || 0).toFixed(2)}`;
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 36;
  const right = pageWidth - 36;
  const width = right - left;
  let y = 40;

  const drawCellRow = (leftText: string, rightText: string, height = 24, fill = false) => {
    if (fill) {
      doc.setFillColor(219, 234, 254);
      doc.rect(left, y, width, height, 'F');
    }
    doc.rect(left, y, width, height);
    doc.line(left + width * 0.65, y, left + width * 0.65, y + height);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(leftText, left + 8, y + 16);
    doc.text(rightText, right - 8, y + 16, { align: 'right' });
    y += height;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(company?.companyName || 'Company Name', pageWidth / 2, y, { align: 'center' });
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Address: ${address}`, pageWidth / 2, y, { align: 'center' });
  y += 14;
  doc.text(`Ph: ${company?.contactNum || '-'}`, pageWidth / 2, y, { align: 'center' });
  y += 14;
  doc.text(`Email: ${company?.companyEmail || '-'}`, pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Receipt Voucher', pageWidth / 2, y, { align: 'center' });
  y += 12;

  const r = receiptDataAny as {
    receiptNumber?: string;
    receiptDate?: string;
    payment?: { paymentMode?: string };
    invoices?: Array<{ invoiceNumber?: string; allocatedAmount?: number }>;
  };

  drawCellRow(`No: ${r.receiptNumber || '-'}`, `Date: ${r.receiptDate || '-'}`);
  drawCellRow('Particulars', 'Amount', 24, true);
  drawCellRow(`Account: ${company?.companyName || '-'}`, formatAmount(totalAmount));
  drawCellRow(`Through: ${r.payment?.paymentMode || '-'}`, '');

  doc.rect(left, y, width, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Against Invoice', left + 8, y + 16);
  y += 24;

  const invoicesBody = (r.invoices || []).map((inv) => [
    inv.invoiceNumber || '-',
    formatAmount(Number(inv.allocatedAmount || 0)),
  ]);
  try {
    const autotableModule = await import('jspdf-autotable');
    const autoTableFn = (autotableModule as { default?: unknown }).default;
    if (typeof autoTableFn === 'function') {
      (autoTableFn as (d: typeof doc, o: Record<string, unknown>) => void)(doc, {
        startY: y,
        head: [['Inv-Num', 'Amount']],
        body: invoicesBody,
        margin: { left, right: pageWidth - right },
        styles: { fontSize: 10, cellPadding: 4, lineColor: [203, 213, 225], lineWidth: 0.5 },
        headStyles: { fillColor: [219, 234, 254], textColor: [15, 23, 42], fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } },
      });
      const d = doc as { lastAutoTable?: { finalY: number } };
      y = d.lastAutoTable ? d.lastAutoTable.finalY : y + 24;
    }
  } catch {
    drawCellRow('Inv-Num', 'Amount', 22, true);
    invoicesBody.forEach((row: string[]) => {
      drawCellRow(row[0], row[1], 20, false);
    });
  }

  drawCellRow('Total', formatAmount(totalAmount));
  y += 28;
  doc.setFont('helvetica', 'bold');
  doc.text('Authorised Signatory', right, y, { align: 'right' });
  doc.save(`${r.receiptNumber || 'receipt'}.pdf`);
}

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export type ExportColumn<T = Record<string, any>> = {
  key: keyof T | string;
  header: string;
  type?: 'text' | 'number' | 'date';
  formatter?: (value: any, row: T) => string;
};

type BackendExportRequest = {
  reportType: 'invoice' | 'route-trip' | 'missed-route-schedule' | 'hcf-waste-collection-history' | 'cost-analysis' | 'hcf-ledger-statement' | 'operator-pcb-collection' | 'pcb-compliance' | 'waste-collection-summary';
  format: ExportFormat;
  filters?: Record<string, any>;
};

type BackendExportResponse = {
  success: boolean;
  data?: {
    reportType: string;
    format: ExportFormat;
    payload: any;
  };
  message?: string;
};

const formatDate = (value: any): string => {
  if (value == null || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
};

const escapeCsv = (value: string): string => {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const normalizeFileName = (reportName: string): string => {
  const safe = reportName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const d = new Date();
  const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  return `${safe || 'report'}_${yyyymmdd}`;
};

const getCellValue = <T>(row: T, col: ExportColumn<T>): any => {
  const raw = (row as any)[col.key as string];
  if (col.formatter) return col.formatter(raw, row);
  if (col.type === 'date') return formatDate(raw);
  if (col.type === 'number') {
    const num = Number(raw);
    return Number.isFinite(num) ? num.toString() : raw == null ? '' : String(raw);
  }
  return raw == null ? '' : String(raw);
};

const toHeader = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const getAuthToken = (): string | null => {
  const authData = localStorage.getItem('mw-auth-user');
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      return parsed?.token || null;
    } catch {
      return null;
    }
  }
  return localStorage.getItem('authToken') || localStorage.getItem('token');
};

const downloadBlob = (blob: Blob, fileNameWithExt: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileNameWithExt;
  link.click();
  URL.revokeObjectURL(url);
};

class ReportExportService {
  private readonly apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

  private async fetchBackendExportPayload(
    body: BackendExportRequest,
  ): Promise<any> {
    const token = getAuthToken();
    const response = await fetch(`${this.apiBaseUrl}/reports/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Export API failed (${response.status})`);
    }

    const json = (await response.json()) as BackendExportResponse;
    if (!json.success || !json.data) {
      throw new Error(json.message || 'Invalid export response');
    }
    return json.data.payload;
  }

  async exportReport<T>(params: {
    reportType: 'invoice' | 'route-trip' | 'missed-route-schedule' | 'hcf-waste-collection-history' | 'cost-analysis' | 'hcf-ledger-statement' | 'operator-pcb-collection' | 'pcb-compliance' | 'waste-collection-summary';
    format: ExportFormat;
    filters?: Record<string, any>;
    columns: ExportColumn<T>[];
    fileName: string;
    fallbackData: T[];
    mapPayloadToRows?: (payload: any) => T[];
  }): Promise<void> {
    let rows: T[] = [];
    try {
      const payload = await this.fetchBackendExportPayload({
        reportType: params.reportType,
        format: params.format,
        filters: params.filters,
      });
      rows = params.mapPayloadToRows
        ? params.mapPayloadToRows(payload)
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
    } catch {
      rows = params.fallbackData;
    }

    if (!rows.length) {
      throw new Error('No records available to export');
    }

    if (params.format === 'pdf') {
      this.exportToPDF(rows, params.columns, params.fileName);
      return;
    }
    if (params.format === 'excel') {
      this.exportToExcel(rows, params.columns, params.fileName);
      return;
    }
    this.exportToCSV(rows, params.columns, params.fileName);
  }

  exportAuto<T extends Record<string, any>>(
    data: T[],
    format: ExportFormat,
    fileName: string,
  ): void {
    if (!data.length) {
      throw new Error('No records available to export');
    }
    const sample = data[0];
    const columns: ExportColumn<T>[] = Object.keys(sample).map((key) => {
      const value = sample[key];
      const isLikelyDate =
        value instanceof Date ||
        (typeof value === 'string' && !Number.isNaN(new Date(value).getTime()) && value.length >= 8);
      const isLikelyNumber = typeof value === 'number';
      return {
        key,
        header: toHeader(key),
        type: isLikelyNumber ? 'number' : isLikelyDate ? 'date' : 'text',
      };
    });

    if (format === 'pdf') {
      this.exportToPDF(data, columns, fileName);
      return;
    }
    if (format === 'excel') {
      this.exportToExcel(data, columns, fileName);
      return;
    }
    this.exportToCSV(data, columns, fileName);
  }

  exportToCSV<T>(data: T[], columns: ExportColumn<T>[], fileName: string): void {
    if (!data.length) {
      throw new Error('No records available to export');
    }
    const headers = columns.map((c) => escapeCsv(c.header)).join(',');
    const rows = data
      .map((row) => columns.map((c) => escapeCsv(String(getCellValue(row, c) ?? ''))).join(','))
      .join('\n');
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${normalizeFileName(fileName)}.csv`);
  }

  exportToExcel<T>(data: T[], columns: ExportColumn<T>[], fileName: string): void {
    if (!data.length) {
      throw new Error('No records available to export');
    }

    const headerHtml = columns.map((c) => `<th>${c.header}</th>`).join('');
    const bodyHtml = data
      .map((row) => {
        const cells = columns
          .map((c) => {
            const value = String(getCellValue(row, c) ?? '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            const align = c.type === 'number' ? ' style="text-align:right;"' : '';
            return `<td${align}>${value}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 6px 8px; }
            th { background: #f8fafc; text-align: left; }
          </style>
        </head>
        <body>
          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    downloadBlob(blob, `${normalizeFileName(fileName)}.xls`);
  }

  exportToPDF<T>(data: T[], columns: ExportColumn<T>[], fileName: string): void {
    if (!data.length) {
      throw new Error('No records available to export');
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      throw new Error('Popup blocked. Please allow popups to export PDF.');
    }

    const headerHtml = columns.map((c) => `<th>${c.header}</th>`).join('');
    const bodyHtml = data
      .map((row) => {
        const cells = columns
          .map((c) => {
            const value = String(getCellValue(row, c) ?? '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            const align = c.type === 'number' ? ' style="text-align:right;"' : '';
            return `<td${align}>${value}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${normalizeFileName(fileName)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #0f172a; }
            h1 { margin: 0 0 12px; font-size: 18px; }
            table { border-collapse: collapse; width: 100%; font-size: 11px; }
            th, td { border: 1px solid #d1d5db; padding: 6px 8px; }
            th { background: #f8fafc; text-align: left; }
          </style>
        </head>
        <body>
          <h1>${fileName}</h1>
          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
}

export const reportExportService = new ReportExportService();


import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import PageHeader from '../../../components/layout/PageHeader';
import type { BreadcrumbItem } from '../../../components/common/BreadcrumbNavigation';
import ReportExportDropdown from '../../../components/reports/ReportExportDropdown';
import { reportExportService, ExportColumn } from '../../../services/reportExportService';
import { getHcfLedgerStatement, HcfLedgerStatementRow } from '../../../services/hcfLedgerStatementService';
import { hcfService } from '../../../services/hcfService';
import './routeTripReportPage.css';

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const toDateInput = (d: Date): string => d.toISOString().slice(0, 10);

const HcfLedgerStatementReportPage = () => {
  const [rows, setRows] = useState<HcfLedgerStatementRow[]>([]);
  const [hcfOptions, setHcfOptions] = useState<Array<{ hcfId: string; hcfName: string }>>([]);
  const [header, setHeader] = useState<{ hcfId: string; hcfName: string; fromDate: string; toDate: string } | null>(null);
  const [filters, setFilters] = useState<{ hcfId: string; fromDate: string; toDate: string }>({
    hcfId: '',
    fromDate: toDateInput(monthStart),
    toDate: toDateInput(today),
  });
  const [pendingFilters, setPendingFilters] = useState(filters);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [filterModalPosition, setFilterModalPosition] = useState<{ top: number; left: number } | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHcfs = async () => {
      try {
        const hcfs = await hcfService.getAllHcfs(undefined, false);
        const options = (hcfs || []).map((h) => ({ hcfId: h.id, hcfName: h.hcfShortName || h.hcfName }));
        setHcfOptions(options);
        if (!filters.hcfId && options.length > 0) {
          setFilters((prev) => ({ ...prev, hcfId: options[0].hcfId }));
          setPendingFilters((prev) => ({ ...prev, hcfId: options[0].hcfId }));
        }
      } catch {
        // no-op; API call will still show backend error if master load also fails
      }
    };
    void loadHcfs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!filters.hcfId) {
        setRows([]);
        setHeader(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await getHcfLedgerStatement({
          hcfId: filters.hcfId || undefined,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        });
        setRows(response.rows || []);
        setHeader(response.header || null);
        setHcfOptions(response.meta?.hcfOptions || []);
      } catch (err: any) {
        setRows([]);
        setHeader(null);
        setError(err?.message || 'Failed to load HCF ledger statement');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [filters.hcfId, filters.fromDate, filters.toDate]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.date, row.particulars, row.invoiceAmountDr, row.receiptAmountCr].join(' ').toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (filteredRows.length === 0) {
      setError('No records available to export');
      return;
    }
    const columns: ExportColumn<HcfLedgerStatementRow>[] = [
      { key: 'date', header: 'Date', type: 'date' },
      { key: 'particulars', header: 'Particulars' },
      { key: 'invoiceAmountDr', header: 'Invoice Amount (Dr)', type: 'number', formatter: (v) => formatCurrency(v as number) },
      { key: 'receiptAmountCr', header: 'Receipt Amount (Cr)', type: 'number', formatter: (v) => formatCurrency(v as number) },
    ];

    try {
      await reportExportService.exportReport<HcfLedgerStatementRow>({
        reportType: 'hcf-ledger-statement',
        format,
        filters: {
          hcfId: filters.hcfId,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        },
        columns,
        fileName: 'HCF_Ledger_Statement',
        fallbackData: filteredRows,
        mapPayloadToRows: (payload) => (Array.isArray(payload?.rows) ? payload.rows : []),
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to export report');
    }
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', path: '/dashboard' },
    { label: 'Reports', path: '/report' },
    { label: 'HCF Ledger Statement', isCurrent: true },
  ];

  const dynamicTitle = header
    ? `Ledger Statement for ${header.hcfName} Period ${header.fromDate} to ${header.toDate}`
    : 'Ledger Statement';

  return (
    <AppLayout>
      <PageHeader
        title="HCF Ledger Statement"
        subtitle={dynamicTitle}
        breadcrumbItems={breadcrumbItems}
        className="invoice-report-header"
      />

      <div className="route-trip-report-page">
        <div className="search-actions-row">
          <div className={`search-container ${loading ? 'loading' : ''}`}>
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className="global-search-input"
              placeholder="Search by particulars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            ref={filterButtonRef}
            className={`btn-filters-toggle ${showAdvancedFilters ? 'active' : ''}`}
            onClick={() => {
              if (!showAdvancedFilters && filterButtonRef.current) {
                const rect = filterButtonRef.current.getBoundingClientRect();
                setFilterModalPosition({
                  top: rect.bottom + 8,
                  left: Math.max(8, Math.min(rect.left, window.innerWidth - 360)),
                });
              }
              setShowAdvancedFilters(!showAdvancedFilters);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filter
            <span className="filter-count">2</span>
          </button>

          <div className="route-trip-actions">
            <ReportExportDropdown disabled={filteredRows.length === 0} onExport={handleExport} />
          </div>
        </div>

        {showAdvancedFilters &&
          createPortal(
            <div className="filter-modal-overlay" onClick={() => setShowAdvancedFilters(false)}>
              <div
                className="filter-modal-content"
                onClick={(e) => e.stopPropagation()}
                style={
                  filterModalPosition
                    ? { position: 'fixed', top: `${filterModalPosition.top}px`, left: `${filterModalPosition.left}px`, margin: 0 }
                    : {}
                }
              >
                <div className="filter-modal-header">
                  <h3 className="filter-modal-title">Advanced Filters</h3>
                  <button className="filter-modal-close-btn" onClick={() => setShowAdvancedFilters(false)}>×</button>
                </div>
                <div className="filter-modal-body">
                  <div className="filter-modal-grid">
                    <div className="filter-modal-group">
                      <label className="filter-modal-label">Select HCF</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.hcfId}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, hcfId: e.target.value }))}
                      >
                        <option value="">Select HCF</option>
                        {hcfOptions.map((h) => (
                          <option key={h.hcfId} value={h.hcfId}>{h.hcfName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-modal-group">
                      <label className="filter-modal-label">From Date</label>
                      <input
                        type="date"
                        className="filter-modal-input"
                        value={pendingFilters.fromDate}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, fromDate: e.target.value }))}
                      />
                    </div>
                    <div className="filter-modal-group">
                      <label className="filter-modal-label">To Date</label>
                      <input
                        type="date"
                        className="filter-modal-input"
                        value={pendingFilters.toDate}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, toDate: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="filter-modal-footer">
                  <button
                    type="button"
                    className="route-trip-btn"
                    onClick={() => {
                      const reset = { hcfId: '', fromDate: toDateInput(monthStart), toDate: toDateInput(today) };
                      setPendingFilters(reset);
                      setFilters(reset);
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="route-trip-btn route-trip-btn--primary"
                    onClick={() => {
                      setFilters(pendingFilters);
                      setShowAdvancedFilters(false);
                    }}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        <div className="route-trip-table-wrap">
          {error ? <div className="route-trip-error">{error}</div> : null}
          <table className="route-trip-table">
            <thead className="table-header">
              <tr>
                <th>Date</th>
                <th>Particulars</th>
                <th className="num-col">Invoice Amount (Dr)</th>
                <th className="num-col">Receipt Amount (Cr)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="empty-cell" colSpan={4}>Loading...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td className="empty-cell" colSpan={4}>No data available</td></tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr
                    key={`${row.rowType}-${row.date}-${idx}`}
                    style={row.rowType === 'total' || row.rowType === 'balance' ? { background: '#f8fafc', fontWeight: 700 } : undefined}
                  >
                    <td>{row.date || '-'}</td>
                    <td>{row.particulars || '-'}</td>
                    <td className="num-col">{formatCurrency(row.invoiceAmountDr)}</td>
                    <td className="num-col">{formatCurrency(row.receiptAmountCr)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default HcfLedgerStatementReportPage;


import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import PageHeader from '../../../components/layout/PageHeader';
import type { BreadcrumbItem } from '../../../components/common/BreadcrumbNavigation';
import ReportExportDropdown from '../../../components/reports/ReportExportDropdown';
import { reportExportService, ExportColumn } from '../../../services/reportExportService';
import { getOperatorPcbReport, OperatorPcbReportRow } from '../../../services/operatorPcbReportService';
import './routeTripReportPage.css';

const formatKg = (value: number | null | undefined): string =>
  value == null ? '-' : Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toDateInput = (d: Date): string => d.toISOString().slice(0, 10);

const OperatorPcbReportPage = () => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [rows, setRows] = useState<OperatorPcbReportRow[]>([]);
  const [headerText, setHeaderText] = useState<string>('');
  const [totals, setTotals] = useState({
    totalHce: 0,
    totalCollectedYellowKg: 0,
    totalCollectedRwbKg: 0,
    totalTreatedYellowKg: 0,
    totalTreatedRwbKg: 0,
  });
  const [filters, setFilters] = useState<{ option: string; fromDate: string; toDate: string }>({
    option: 'Operator PCB Report',
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
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getOperatorPcbReport({
          option: filters.option,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        });
        setRows(response.data || []);
        setTotals(response.totals || totals);
        setHeaderText(`Operator PCB Report - Period ${response.header.fromDate} to ${response.header.toDate}`);
      } catch (err: any) {
        setRows([]);
        setError(err?.message || 'Failed to load Operator PCB report');
      } finally {
        setLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.option, filters.fromDate, filters.toDate]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.date, row.noOfHce, row.collectedYellowKg, row.collectedRwbKg, row.treatedYellowKg, row.treatedRwbKg]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [rows, searchQuery]);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (filteredRows.length === 0) {
      setError('No records available to export');
      return;
    }
    const columns: ExportColumn<OperatorPcbReportRow>[] = [
      { key: 'date', header: 'Date', type: 'date' },
      { key: 'noOfHce', header: 'No of HCE', type: 'number' },
      { key: 'collectedYellowKg', header: 'Collected Yellow (Kg)', type: 'number' },
      { key: 'collectedRwbKg', header: 'Collected Red/White/Blue (Kg)', type: 'number' },
      { key: 'treatedYellowKg', header: 'Treated Yellow (Kg)', type: 'number' },
      { key: 'treatedRwbKg', header: 'Treated Red/White/Blue (Kg)', type: 'number' },
    ];

    try {
      await reportExportService.exportReport<OperatorPcbReportRow>({
        reportType: 'operator-pcb-collection',
        format,
        filters: {
          option: filters.option,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        },
        columns,
        fileName: 'Operator_PCB_Collection_Report',
        fallbackData: filteredRows,
        mapPayloadToRows: (payload) => (Array.isArray(payload?.data) ? payload.data : []),
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to export report');
    }
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', path: '/dashboard' },
    { label: 'Reports', path: '/report' },
    { label: 'PCB Collection Report', isCurrent: true },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Operator PCB Report"
        subtitle={headerText || `Operator PCB Report - Period ${filters.fromDate} to ${filters.toDate}`}
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
              placeholder="Search rows..."
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
            <div className="filter-modal-overlay" onClick={() => { setShowAdvancedFilters(false); setFilterModalPosition(null); }}>
              <div
                className="filter-modal-content"
                onClick={(e) => e.stopPropagation()}
                style={filterModalPosition ? { position: 'fixed', top: `${filterModalPosition.top}px`, left: `${filterModalPosition.left}px`, margin: 0 } : {}}
              >
                <div className="filter-modal-header">
                  <h3 className="filter-modal-title">Advanced Filters</h3>
                  <button className="filter-modal-close-btn" onClick={() => setShowAdvancedFilters(false)}>×</button>
                </div>
                <div className="filter-modal-body">
                  <div className="filter-modal-grid">
                    <div className="filter-modal-group">
                      <label className="filter-modal-label">Option</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.option}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, option: e.target.value }))}
                      >
                        <option value="Operator PCB Report">Operator PCB Report</option>
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
                      const reset = { option: 'Operator PCB Report', fromDate: toDateInput(monthStart), toDate: toDateInput(today) };
                      setPendingFilters(reset);
                      setFilters(reset);
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="route-trip-btn route-trip-btn--primary"
                    onClick={() => { setFilters(pendingFilters); setShowAdvancedFilters(false); }}
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
                <th rowSpan={2}>Date</th>
                <th rowSpan={2} className="num-col">No of HCE</th>
                <th colSpan={2}>Collected</th>
                <th colSpan={2}>Treated</th>
              </tr>
              <tr>
                <th className="num-col">Yellow (Kg)</th>
                <th className="num-col">Red/White/Blue (Kg)</th>
                <th className="num-col">Yellow (Kg)</th>
                <th className="num-col">Red/White/Blue (Kg)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="empty-cell" colSpan={6}>Loading...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td className="empty-cell" colSpan={6}>No data available</td></tr>
              ) : (
                <>
                  {filteredRows.map((row, idx) => (
                    <tr key={`${row.date}-${idx}`}>
                      <td>{row.date || '-'}</td>
                      <td className="num-col">{row.noOfHce ?? 0}</td>
                      <td className="num-col">{formatKg(row.collectedYellowKg)}</td>
                      <td className="num-col">{formatKg(row.collectedRwbKg)}</td>
                      <td className="num-col">{formatKg(row.treatedYellowKg)}</td>
                      <td className="num-col">{formatKg(row.treatedRwbKg)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <td>Total</td>
                    <td className="num-col">{totals.totalHce}</td>
                    <td className="num-col">{formatKg(totals.totalCollectedYellowKg)}</td>
                    <td className="num-col">{formatKg(totals.totalCollectedRwbKg)}</td>
                    <td className="num-col">{formatKg(totals.totalTreatedYellowKg)}</td>
                    <td className="num-col">{formatKg(totals.totalTreatedRwbKg)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default OperatorPcbReportPage;


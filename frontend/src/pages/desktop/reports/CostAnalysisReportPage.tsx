import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import PageHeader from '../../../components/layout/PageHeader';
import type { BreadcrumbItem } from '../../../components/common/BreadcrumbNavigation';
import ReportExportDropdown from '../../../components/reports/ReportExportDropdown';
import { reportExportService, ExportColumn } from '../../../services/reportExportService';
import { getCostAnalysisReport } from '../../../services/costAnalysisReportService';
import './routeTripReportPage.css';

type CostOption = 'All' | 'Manpower Only' | 'Fuel Only';

type CostAnalysisRow = {
  date: string;
  driverPerDay: number;
  supervisorPerDay: number;
  pickerPerDay: number;
  totalKms: number;
  mileage: number;
  fuelCostPerDay: number;
  totalPerDay: number;
};

const formatCurrency = (value: number): string => `₹${value.toFixed(2)}`;

const toDateInput = (d: Date): string => d.toISOString().slice(0, 10);

const CostAnalysisReportPage = () => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [rows, setRows] = useState<CostAnalysisRow[]>([]);
  const [routeOptions, setRouteOptions] = useState<Array<{ routeId: string; routeName: string }>>([]);
  const [filters, setFilters] = useState<{ option: CostOption; routeId: string; fromDate: string; toDate: string }>({
    option: 'All',
    routeId: 'All',
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
      setLoading(true);
      setError(null);
      try {
        if (filters.fromDate > filters.toDate) {
          setRows([]);
          setError('From date cannot be later than To date');
          return;
        }
        const response = await getCostAnalysisReport({
          option: filters.option,
          routeId: filters.routeId,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        });
        setRows(response.data || []);
        setRouteOptions(response.meta?.routeOptions || []);
      } catch (err: any) {
        setRows([]);
        setError(err?.message || 'Failed to load cost analysis report');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [filters]);

  const routeFilterOptions = useMemo(
    () => [{ routeId: 'All', routeName: 'All Routes' }, ...routeOptions],
    [routeOptions],
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.date,
        row.driverPerDay,
        row.supervisorPerDay,
        row.pickerPerDay,
        row.totalKms,
        row.mileage,
        row.fuelCostPerDay,
        row.totalPerDay,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [rows, searchQuery]);

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    if (filteredRows.length === 0) {
      setError('No records available to export');
      return;
    }
    const columns: ExportColumn<CostAnalysisRow>[] = [
      { key: 'date', header: 'Date', type: 'date' },
      { key: 'driverPerDay', header: 'Driver/Day', type: 'number', formatter: (v) => formatCurrency(Number(v || 0)) },
      { key: 'supervisorPerDay', header: 'Supervisor/Day', type: 'number', formatter: (v) => formatCurrency(Number(v || 0)) },
      { key: 'pickerPerDay', header: 'Picker/Day', type: 'number', formatter: (v) => formatCurrency(Number(v || 0)) },
      { key: 'totalKms', header: 'Total Kms', type: 'number' },
      { key: 'mileage', header: 'Mileage', type: 'number' },
      { key: 'fuelCostPerDay', header: 'Fuel Cost/Day', type: 'number', formatter: (v) => formatCurrency(Number(v || 0)) },
      { key: 'totalPerDay', header: 'Total/Day', type: 'number', formatter: (v) => formatCurrency(Number(v || 0)) },
    ];

    try {
      if (format === 'pdf') reportExportService.exportToPDF(filteredRows, columns, 'Cost_Analysis_Report');
      else if (format === 'excel') reportExportService.exportToExcel(filteredRows, columns, 'Cost_Analysis_Report');
      else reportExportService.exportToCSV(filteredRows, columns, 'Cost_Analysis_Report');
    } catch (err: any) {
      setError(err?.message || 'Failed to export report');
    }
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', path: '/dashboard' },
    { label: 'Reports', path: '/report' },
    { label: 'Cost Analysis', isCurrent: true },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Cost Analysis Report"
        subtitle="Daily direct cost analysis by route and period"
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
              placeholder="Search by date or values..."
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
            <span className="filter-count">3</span>
          </button>

          <div className="route-trip-actions">
            <ReportExportDropdown
              disabled={filteredRows.length === 0}
              onExport={handleExport}
            />
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
                      <label className="filter-modal-label">Option</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.option}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, option: e.target.value as CostOption }))}
                      >
                        <option value="All">All Costs</option>
                        <option value="Manpower Only">Manpower Only</option>
                        <option value="Fuel Only">Fuel Only</option>
                      </select>
                    </div>
                    <div className="filter-modal-group">
                      <label className="filter-modal-label">Select Route</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.routeId}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, routeId: e.target.value }))}
                      >
                        {routeFilterOptions.map((r) => (
                          <option key={r.routeId} value={r.routeId}>{r.routeName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-modal-group">
                      <label className="filter-modal-label">From</label>
                      <input
                        type="date"
                        className="filter-modal-input"
                        value={pendingFilters.fromDate}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, fromDate: e.target.value }))}
                      />
                    </div>
                    <div className="filter-modal-group">
                      <label className="filter-modal-label">To</label>
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
                      const reset = {
                        option: 'All' as CostOption,
                        routeId: 'All',
                        fromDate: toDateInput(monthStart),
                        toDate: toDateInput(today),
                      };
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
                <th className="num-col">Driver/Day</th>
                <th className="num-col">Supervisor/Day</th>
                <th className="num-col">Picker/Day</th>
                <th className="num-col">Total Kms</th>
                <th className="num-col">Mileage</th>
                <th className="num-col">Fuel Cost/Day</th>
                <th className="num-col">Total/Day</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="empty-cell" colSpan={8}>Loading...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td className="empty-cell" colSpan={8}>No data available</td></tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={`${row.date}-${idx}`}>
                    <td>{row.date}</td>
                    <td className="num-col">{formatCurrency(row.driverPerDay)}</td>
                    <td className="num-col">{formatCurrency(row.supervisorPerDay)}</td>
                    <td className="num-col">{formatCurrency(row.pickerPerDay)}</td>
                    <td className="num-col">{row.totalKms.toFixed(2)}</td>
                    <td className="num-col">{row.mileage.toFixed(2)}</td>
                    <td className="num-col">{formatCurrency(row.fuelCostPerDay)}</td>
                    <td className="num-col" style={{ fontWeight: 700 }}>{formatCurrency(row.totalPerDay)}</td>
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

export default CostAnalysisReportPage;


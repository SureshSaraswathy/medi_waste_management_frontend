import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import PageHeader from '../../../components/layout/PageHeader';
import type { BreadcrumbItem } from '../../../components/common/BreadcrumbNavigation';
import ReportExportDropdown from '../../../components/reports/ReportExportDropdown';
import { reportExportService, ExportColumn } from '../../../services/reportExportService';
import {
  getRouteTripReport,
  RouteTripReportItem,
} from '../../../services/routeTripReportService';
import './routeTripReportPage.css';

const RouteTripReportPage = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<RouteTripReportItem[]>([]);
  const [routeOptions, setRouteOptions] = useState<Array<{ routeId: string; routeName: string }>>([]);
  const [filters, setFilters] = useState<{ date: string; routeId: string }>({
    date: today,
    routeId: 'All',
  });
  const [pendingFilters, setPendingFilters] = useState<{ date: string; routeId: string }>({
    date: today,
    routeId: 'All',
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [filterModalPosition, setFilterModalPosition] = useState<{ top: number; left: number } | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeFilterOptions = useMemo(
    () => [{ routeId: 'All', routeName: 'All' }, ...routeOptions],
    [routeOptions],
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getRouteTripReport({
          date: filters.date,
          routeId: filters.routeId !== 'All' ? filters.routeId : undefined,
        });
        setRows(response.data || []);
        setRouteOptions(response.meta?.routeOptions || []);
      } catch (err: any) {
        setRows([]);
        setError(err?.message || 'Failed to load route trip report');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters.date, filters.routeId]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.hcfCode,
        row.hcfShortName,
        row.area,
        row.nameSign,
        row.timeIn,
        row.timeOut,
        String(row.yellow),
        String(row.red),
        String(row.blue),
        String(row.white),
        String(row.total),
      ]
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
    const columns: ExportColumn<RouteTripReportItem>[] = [
      { key: 'hcfCode', header: 'HCF Code' },
      { key: 'hcfShortName', header: 'HCF Short Name' },
      { key: 'area', header: 'Area' },
      { key: 'yellow', header: 'Yellow', type: 'number' },
      { key: 'red', header: 'Red', type: 'number' },
      { key: 'blue', header: 'Blue', type: 'number' },
      { key: 'white', header: 'White', type: 'number' },
      { key: 'total', header: 'Total', type: 'number' },
      { key: 'nameSign', header: 'Name / Sign' },
      { key: 'timeIn', header: 'Time In' },
      { key: 'timeOut', header: 'Time Out' },
    ];

    try {
      await reportExportService.exportReport<RouteTripReportItem>({
        reportType: 'route-trip',
        format,
        filters: {
          date: filters.date,
          routeId: filters.routeId !== 'All' ? filters.routeId : undefined,
        },
        columns,
        fileName: 'Route_Trip_Report',
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
    { label: 'Route Trip Report', isCurrent: true },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Route Trip Report"
        subtitle="Trip-level route collection details"
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
              placeholder="Search by HCF Code, HCF Name, Area, Sign, Time..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')} title="Clear search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>

          <button
            type="button"
            ref={filterButtonRef}
            className={`btn-filters-toggle ${showAdvancedFilters ? 'active' : ''}`}
            onClick={() => {
              if (!showAdvancedFilters && filterButtonRef.current) {
                const rect = filterButtonRef.current.getBoundingClientRect();
                setFilterModalPosition({ top: rect.bottom + 8, left: Math.max(8, Math.min(rect.left, window.innerWidth - 360)) });
              }
              setShowAdvancedFilters(!showAdvancedFilters);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filter
            {(filters.date ? 1 : 0) + (filters.routeId !== 'All' ? 1 : 0) > 0 ? (
              <span className="filter-count">{(filters.date ? 1 : 0) + (filters.routeId !== 'All' ? 1 : 0)}</span>
            ) : null}
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
            <div
              className="filter-modal-overlay"
              onClick={() => {
                setShowAdvancedFilters(false);
                setFilterModalPosition(null);
              }}
            >
              <div
                className="filter-modal-content"
                onClick={(e) => e.stopPropagation()}
                style={
                  filterModalPosition
                    ? {
                        position: 'fixed',
                        top: `${filterModalPosition.top}px`,
                        left: `${filterModalPosition.left}px`,
                        margin: 0,
                      }
                    : {}
                }
              >
                <div className="filter-modal-header">
                  <h3 className="filter-modal-title">Advanced Filters</h3>
                  <button className="filter-modal-close-btn" onClick={() => setShowAdvancedFilters(false)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div className="filter-modal-body">
                  <div className="filter-modal-grid">
                    <div className="filter-modal-group">
                      <label className="filter-modal-label" htmlFor="route-trip-date">Date</label>
                      <input
                        id="route-trip-date"
                        type="date"
                        className="filter-modal-input"
                        value={pendingFilters.date}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, date: e.target.value }))}
                      />
                    </div>
                    <div className="filter-modal-group">
                      <label className="filter-modal-label" htmlFor="route-trip-route">Route</label>
                      <select
                        id="route-trip-route"
                        className="filter-modal-select"
                        value={pendingFilters.routeId}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, routeId: e.target.value }))}
                      >
                        {routeFilterOptions.map((option) => (
                          <option key={option.routeId} value={option.routeId}>
                            {option.routeName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="filter-modal-footer">
                  <button
                    type="button"
                    className="route-trip-btn"
                    onClick={() => {
                      const reset = { date: today, routeId: 'All' };
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
                <th>HCF Code</th>
                <th>HCF Short Name</th>
                <th>Area</th>
                <th className="num-col">Yellow</th>
                <th className="num-col">Red</th>
                <th className="num-col">Blue</th>
                <th className="num-col">White</th>
                <th className="num-col">Total</th>
                <th>Name / Sign</th>
                <th>Time In</th>
                <th>Time Out</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={11}>
                    {loading ? 'Loading route trip records...' : 'No route trip records found.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={`${row.hcfCode}-${row.timeIn}-${idx}`}>
                    <td>{row.hcfCode}</td>
                    <td>{row.hcfShortName}</td>
                    <td>{row.area}</td>
                    <td className="num-col">{row.yellow}</td>
                    <td className="num-col">{row.red}</td>
                    <td className="num-col">{row.blue}</td>
                    <td className="num-col">{row.white}</td>
                    <td className="num-col">{row.total}</td>
                    <td>{row.nameSign}</td>
                    <td>{row.timeIn}</td>
                    <td>{row.timeOut}</td>
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

export default RouteTripReportPage;

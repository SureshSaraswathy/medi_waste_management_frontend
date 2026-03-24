import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import PageHeader from '../../../components/layout/PageHeader';
import type { BreadcrumbItem } from '../../../components/common/BreadcrumbNavigation';
import ReportExportDropdown from '../../../components/reports/ReportExportDropdown';
import { reportExportService, ExportColumn } from '../../../services/reportExportService';
import {
  getMissedRouteSchedule,
  MissedRouteScheduleItem,
} from '../../../services/missedRouteScheduleService';
import './routeTripReportPage.css';

const MissedRouteScheduleReportPage = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<MissedRouteScheduleItem[]>([]);
  const [routeOptions, setRouteOptions] = useState<Array<{ routeId: string; routeName: string }>>([]);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState<{ date: string; routeId: string; area: string }>({
    date: today,
    routeId: 'All',
    area: 'All',
  });
  const [pendingFilters, setPendingFilters] = useState<{ date: string; routeId: string; area: string }>({
    date: today,
    routeId: 'All',
    area: 'All',
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
  const areaFilterOptions = useMemo(() => ['All', ...areaOptions], [areaOptions]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getMissedRouteSchedule({
          date: filters.date,
          routeId: filters.routeId !== 'All' ? filters.routeId : undefined,
          area: filters.area !== 'All' ? filters.area : undefined,
        });
        setRows(response.data || []);
        setRouteOptions(response.meta?.routeOptions || []);
        setAreaOptions(response.meta?.areaOptions || []);
      } catch (err: any) {
        setRows([]);
        setError(err?.message || 'Failed to load missed route schedule report');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [filters.date, filters.routeId, filters.area]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.date,
        row.routeCode,
        row.routeName,
        row.hcfCode,
        row.hcfName,
        row.area,
        row.status,
        row.remarks,
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
    const columns: ExportColumn<MissedRouteScheduleItem>[] = [
      { key: 'date', header: 'Date', type: 'date' },
      { key: 'routeCode', header: 'Route Code' },
      { key: 'routeName', header: 'Route Name' },
      { key: 'hcfCode', header: 'HCF Code' },
      { key: 'hcfName', header: 'HCF Name' },
      { key: 'area', header: 'Area' },
      { key: 'status', header: 'Status' },
      { key: 'remarks', header: 'Remarks' },
    ];

    try {
      await reportExportService.exportReport<MissedRouteScheduleItem>({
        reportType: 'missed-route-schedule',
        format,
        filters: {
          date: filters.date,
          routeId: filters.routeId !== 'All' ? filters.routeId : undefined,
          area: filters.area !== 'All' ? filters.area : undefined,
        },
        columns,
        fileName: 'Missed_Route_Schedule',
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
    { label: 'Missed Route Schedule', isCurrent: true },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Missed Route Schedule"
        subtitle="Routes where pickup entry is missing or schedule was missed"
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
              placeholder="Search by route, HCF, area, status, remarks..."
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
            {(filters.date ? 1 : 0) + (filters.routeId !== 'All' ? 1 : 0) + (filters.area !== 'All' ? 1 : 0) > 0 ? (
              <span className="filter-count">
                {(filters.date ? 1 : 0) + (filters.routeId !== 'All' ? 1 : 0) + (filters.area !== 'All' ? 1 : 0)}
              </span>
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
                      <label className="filter-modal-label" htmlFor="missed-route-date">Date</label>
                      <input
                        id="missed-route-date"
                        type="date"
                        className="filter-modal-input"
                        value={pendingFilters.date}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, date: e.target.value }))}
                      />
                    </div>
                    <div className="filter-modal-group">
                      <label className="filter-modal-label" htmlFor="missed-route-route">Route</label>
                      <select
                        id="missed-route-route"
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
                    <div className="filter-modal-group">
                      <label className="filter-modal-label" htmlFor="missed-route-area">Area</label>
                      <select
                        id="missed-route-area"
                        className="filter-modal-select"
                        value={pendingFilters.area}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, area: e.target.value }))}
                      >
                        {areaFilterOptions.map((area) => (
                          <option key={area} value={area}>
                            {area}
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
                      const reset = { date: today, routeId: 'All', area: 'All' };
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
                <th>Route Code</th>
                <th>Route Name</th>
                <th>HCF Code</th>
                <th>HCF Name</th>
                <th>Area</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={8}>
                    {loading ? 'Loading missed route records...' : 'No missed route records found.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={`${row.date}-${row.routeId}-${row.hcfCode}-${idx}`}>
                    <td>{row.date}</td>
                    <td>{row.routeCode}</td>
                    <td>{row.routeName}</td>
                    <td>{row.hcfCode}</td>
                    <td>{row.hcfName}</td>
                    <td>{row.area}</td>
                    <td>{row.status}</td>
                    <td>{row.remarks}</td>
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

export default MissedRouteScheduleReportPage;


import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import PageHeader from '../../../components/layout/PageHeader';
import type { BreadcrumbItem } from '../../../components/common/BreadcrumbNavigation';
import ReportExportDropdown from '../../../components/reports/ReportExportDropdown';
import { reportExportService, ExportColumn } from '../../../services/reportExportService';
import {
  getHcfWasteCollectionHistory,
  HcfWasteCollectionHistoryItem,
} from '../../../services/hcfWasteCollectionHistoryService';
import { hcfService, HcfResponse } from '../../../services/hcfService';
import './routeTripReportPage.css';

const HcfWasteCollectionHistoryReportPage = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<HcfWasteCollectionHistoryItem[]>([]);
  const [hcfOptions, setHcfOptions] = useState<HcfResponse[]>([]);
  const [filters, setFilters] = useState<{ hcfId: string; fromDate: string; toDate: string }>({
    hcfId: '',
    fromDate: today,
    toDate: today,
  });
  const [pendingFilters, setPendingFilters] = useState<{ hcfId: string; fromDate: string; toDate: string }>({
    hcfId: '',
    fromDate: today,
    toDate: today,
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [filterModalPosition, setFilterModalPosition] = useState<{ top: number; left: number } | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMaster = async () => {
      try {
        const hcfs = await hcfService.getAllHcfs(undefined, true);
        setHcfOptions(hcfs || []);
      } catch {
        setHcfOptions([]);
      }
    };
    void loadMaster();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getHcfWasteCollectionHistory({
          hcfId: filters.hcfId || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
        });
        setRows(response.data || []);
      } catch (err: any) {
        setRows([]);
        setError(err?.message || 'Failed to load HCF waste collection history report');
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
      [
        String(row.serialNo),
        row.date,
        row.latLong,
        row.inTime,
        row.outTime,
        String(row.yellowBagCount),
        String(row.yellowWeight),
        String(row.redBagCount),
        String(row.redWeight),
        String(row.blueBagCount),
        String(row.blueWeight),
        String(row.whiteBagCount),
        String(row.whiteWeight),
        String(row.totalWeight),
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
    const columns: ExportColumn<HcfWasteCollectionHistoryItem>[] = [
      { key: 'serialNo', header: 'S.No', type: 'number' },
      { key: 'date', header: 'Date', type: 'date' },
      { key: 'latLong', header: 'Lat/Long' },
      { key: 'inTime', header: 'In Time' },
      { key: 'outTime', header: 'Out Time' },
      { key: 'yellowBagCount', header: 'Yellow Bag Count', type: 'number' },
      { key: 'yellowWeight', header: 'Yellow Weight', type: 'number' },
      { key: 'redBagCount', header: 'Red Bag Count', type: 'number' },
      { key: 'redWeight', header: 'Red Weight', type: 'number' },
      { key: 'blueBagCount', header: 'Blue Bag Count', type: 'number' },
      { key: 'blueWeight', header: 'Blue Weight', type: 'number' },
      { key: 'whiteBagCount', header: 'White Bag Count', type: 'number' },
      { key: 'whiteWeight', header: 'White Weight', type: 'number' },
      { key: 'totalWeight', header: 'Total Weight', type: 'number' },
      { key: 'remarks', header: 'Remarks' },
    ];

    try {
      await reportExportService.exportReport<HcfWasteCollectionHistoryItem>({
        reportType: 'hcf-waste-collection-history',
        format,
        filters: {
          hcfId: filters.hcfId || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
        },
        columns,
        fileName: 'HCF_Waste_Collection_History',
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
    { label: 'HCF Waste Collection History', isCurrent: true },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="HCF Waste Collection History Report"
        subtitle="History of color-wise bag counts and weights"
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
                      <label className="filter-modal-label" htmlFor="hcf-history-hcf">HCF</label>
                      <select
                        id="hcf-history-hcf"
                        className="filter-modal-select"
                        value={pendingFilters.hcfId}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, hcfId: e.target.value }))}
                      >
                        <option value="">All HCFs</option>
                        {hcfOptions.map((hcf) => (
                          <option key={hcf.id} value={hcf.id}>
                            {hcf.hcfCode} - {hcf.hcfName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-modal-group">
                      <label className="filter-modal-label" htmlFor="hcf-history-from">From Date</label>
                      <input
                        id="hcf-history-from"
                        type="date"
                        className="filter-modal-input"
                        value={pendingFilters.fromDate}
                        onChange={(e) => setPendingFilters((p) => ({ ...p, fromDate: e.target.value }))}
                      />
                    </div>
                    <div className="filter-modal-group">
                      <label className="filter-modal-label" htmlFor="hcf-history-to">To Date</label>
                      <input
                        id="hcf-history-to"
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
                      const reset = { hcfId: '', fromDate: today, toDate: today };
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
                <th>S.No</th>
                <th>Date</th>
                <th>Lat/Long</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th className="num-col">Yellow Bag Count</th>
                <th className="num-col">Yellow Weight</th>
                <th className="num-col">Red Bag Count</th>
                <th className="num-col">Red Weight</th>
                <th className="num-col">Blue Bag Count</th>
                <th className="num-col">Blue Weight</th>
                <th className="num-col">White Bag Count</th>
                <th className="num-col">White Weight</th>
                <th className="num-col">Total Weight</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={15}>
                    {loading ? 'Loading collection history...' : 'No collection history found.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={`${row.serialNo}-${row.date}-${idx}`}>
                    <td>{row.serialNo}</td>
                    <td>{row.date}</td>
                    <td>{row.latLong}</td>
                    <td>{row.inTime}</td>
                    <td>{row.outTime}</td>
                    <td className="num-col">{row.yellowBagCount}</td>
                    <td className="num-col">{row.yellowWeight}</td>
                    <td className="num-col">{row.redBagCount}</td>
                    <td className="num-col">{row.redWeight}</td>
                    <td className="num-col">{row.blueBagCount}</td>
                    <td className="num-col">{row.blueWeight}</td>
                    <td className="num-col">{row.whiteBagCount}</td>
                    <td className="num-col">{row.whiteWeight}</td>
                    <td className="num-col">{row.totalWeight}</td>
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

export default HcfWasteCollectionHistoryReportPage;


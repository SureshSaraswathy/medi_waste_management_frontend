import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import PageHeader from '../../../components/layout/PageHeader';
import type { BreadcrumbItem } from '../../../components/common/BreadcrumbNavigation';
import ReportExportDropdown from '../../../components/reports/ReportExportDropdown';
import { reportExportService, ExportColumn } from '../../../services/reportExportService';
import toast from 'react-hot-toast';
import {
  BulkDownloadHistoryItem,
  getBulkDownloadHistory,
} from '../../../services/invoiceService';
import './bulkZipDownloadReportPage.css';

type StatusFilter = 'All' | 'ACTIVE' | 'EXPIRED' | 'MISSING_FILE';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const BulkZipDownloadReportPage = () => {
  const [rows, setRows] = useState<BulkDownloadHistoryItem[]>([]);
  const [filteredRows, setFilteredRows] = useState<BulkDownloadHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterModalPosition, setFilterModalPosition] = useState<{ top: number; left: number } | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [filters, setFilters] = useState<{
    status: StatusFilter;
    fromDate: string;
    toDate: string;
    minDownloads: string;
    maxDownloads: string;
  }>({
    status: 'All',
    fromDate: '',
    toDate: '',
    minDownloads: '',
    maxDownloads: '',
  });
  const [pendingFilters, setPendingFilters] = useState<{
    status: StatusFilter;
    fromDate: string;
    toDate: string;
    minDownloads: string;
    maxDownloads: string;
  }>({
    status: 'All',
    fromDate: '',
    toDate: '',
    minDownloads: '',
    maxDownloads: '',
  });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);

  const bulkZipExportColumns: ExportColumn<BulkDownloadHistoryItem>[] = [
    { key: 'jobId', header: 'Job ID' },
    { key: 'status', header: 'Status' },
    { key: 'downloadCount', header: 'Downloads', type: 'number' },
    { key: 'createdAt', header: 'Created At', type: 'date' },
    { key: 'expireAt', header: 'Expires At', type: 'date' },
    { key: 'filePath', header: 'File Path' },
  ];

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const loadData = async (nextPage: number, nextStatus: StatusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getBulkDownloadHistory({
        page: nextPage,
        pageSize,
        status: nextStatus === 'All' ? undefined : nextStatus,
      });
      setRows(response.items || []);
      setTotal(response.total || 0);
      setPage(response.page || nextPage);
    } catch (err: any) {
      setError(err?.message || 'Failed to load bulk ZIP download history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(page, filters.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.status]);

  useEffect(() => {
    const search = searchQuery.trim().toLowerCase();
    const minDownloads = filters.minDownloads !== '' ? Number(filters.minDownloads) : null;
    const maxDownloads = filters.maxDownloads !== '' ? Number(filters.maxDownloads) : null;
    const fromTs = filters.fromDate ? new Date(filters.fromDate).getTime() : null;
    const toTs = filters.toDate ? new Date(`${filters.toDate}T23:59:59`).getTime() : null;

    const next = rows.filter((row) => {
      const createdAtTs = new Date(row.createdAt).getTime();
      const haystack = `${row.jobId} ${row.status} ${row.filePath}`.toLowerCase();

      if (search && !haystack.includes(search)) return false;
      if (filters.status !== 'All' && row.status !== filters.status) return false;
      if (fromTs && createdAtTs < fromTs) return false;
      if (toTs && createdAtTs > toTs) return false;
      if (minDownloads !== null && !Number.isNaN(minDownloads) && row.downloadCount < minDownloads) return false;
      if (maxDownloads !== null && !Number.isNaN(maxDownloads) && row.downloadCount > maxDownloads) return false;

      return true;
    });

    setFilteredRows(next);
  }, [rows, searchQuery, filters]);

  const copyDownloadLink = async (token: string) => {
    const link = `${API_BASE_URL}/download/bulk/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setSuccessMessage('Download link copied to clipboard');
      window.setTimeout(() => setSuccessMessage(null), 2500);
    } catch {
      setError('Unable to copy link. Please copy manually from browser.');
    }
  };

  const openDownloadLink = (token: string) => {
    const link = `${API_BASE_URL}/download/bulk/${token}`;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'All') count++;
    if (filters.fromDate) count++;
    if (filters.toDate) count++;
    if (filters.minDownloads !== '') count++;
    if (filters.maxDownloads !== '') count++;
    return count;
  }, [filters]);

  const applyFilters = () => {
    setFilters({ ...pendingFilters });
    setShowAdvancedFilters(false);
  };

  const clearFilters = () => {
    const reset = {
      status: 'All' as StatusFilter,
      fromDate: '',
      toDate: '',
      minDownloads: '',
      maxDownloads: '',
    };
    setFilters(reset);
    setPendingFilters(reset);
    setShowAdvancedFilters(false);
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', path: '/dashboard' },
    { label: 'Reports', path: '/report' },
    { label: 'Bulk ZIP Downloads', isCurrent: true },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Bulk ZIP Download Report"
        subtitle="Track queued ZIP files, expiry, and downloads"
        breadcrumbItems={breadcrumbItems}
      />

      <div className="bulk-zip-report-page">
        <div className="bulk-zip-toolbar">
          <div className="bulk-zip-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search by Job ID, status, file path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="bulk-zip-toolbar-actions">
            <button
              type="button"
              ref={filterButtonRef}
              className="bulk-zip-filter-btn"
              onClick={() => {
                if (!showAdvancedFilters && filterButtonRef.current) {
                  const rect = filterButtonRef.current.getBoundingClientRect();
                  setFilterModalPosition({ top: rect.bottom + 8, left: Math.max(8, Math.min(rect.left, window.innerWidth - 360)) });
                }
                setShowAdvancedFilters(!showAdvancedFilters);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              Advanced Filter
              {activeFilterCount > 0 ? <span className="bulk-zip-filter-count">{activeFilterCount}</span> : null}
            </button>
            <button
              className="bulk-zip-refresh-btn"
              type="button"
              disabled={loading}
              onClick={() => void loadData(page, filters.status)}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <ReportExportDropdown
              disabled={loading || filteredRows.length === 0}
              onExport={(format) => {
                try {
                  if (format === 'pdf') {
                    reportExportService.exportToPDF(filteredRows, bulkZipExportColumns, 'Bulk_ZIP_Download_Report');
                  } else if (format === 'excel') {
                    reportExportService.exportToExcel(filteredRows, bulkZipExportColumns, 'Bulk_ZIP_Download_Report');
                  } else {
                    reportExportService.exportToCSV(filteredRows, bulkZipExportColumns, 'Bulk_ZIP_Download_Report');
                  }
                  toast.success('Export downloaded successfully');
                } catch (err: any) {
                  toast.error(err?.message || 'Failed to export report');
                }
              }}
            />
          </div>
        </div>

        {error && <div className="bulk-zip-alert bulk-zip-alert--error">{error}</div>}
        {successMessage && <div className="bulk-zip-alert bulk-zip-alert--success">{successMessage}</div>}

        {showAdvancedFilters &&
          createPortal(
            <div className="bulk-zip-filter-overlay" onClick={() => setShowAdvancedFilters(false)}>
              <div
                className="bulk-zip-filter-modal"
                onClick={(e) => e.stopPropagation()}
                style={
                  filterModalPosition
                    ? {
                        position: 'fixed',
                        top: `${filterModalPosition.top}px`,
                        left: `${filterModalPosition.left}px`,
                      }
                    : undefined
                }
              >
                <div className="bulk-zip-filter-header">
                  <h3>Advanced Filters</h3>
                </div>
                <div className="bulk-zip-filter-grid">
                  <div>
                    <label>Status</label>
                    <select
                      value={pendingFilters.status}
                      onChange={(e) => setPendingFilters((prev) => ({ ...prev, status: e.target.value as StatusFilter }))}
                    >
                      <option value="All">All</option>
                      <option value="ACTIVE">Active</option>
                      <option value="EXPIRED">Expired</option>
                      <option value="MISSING_FILE">Missing file</option>
                    </select>
                  </div>
                  <div>
                    <label>Created From</label>
                    <input
                      type="date"
                      value={pendingFilters.fromDate}
                      onChange={(e) => setPendingFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Created To</label>
                    <input
                      type="date"
                      value={pendingFilters.toDate}
                      onChange={(e) => setPendingFilters((prev) => ({ ...prev, toDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Min Downloads</label>
                    <input
                      type="number"
                      min="0"
                      value={pendingFilters.minDownloads}
                      onChange={(e) => setPendingFilters((prev) => ({ ...prev, minDownloads: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Max Downloads</label>
                    <input
                      type="number"
                      min="0"
                      value={pendingFilters.maxDownloads}
                      onChange={(e) => setPendingFilters((prev) => ({ ...prev, maxDownloads: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="bulk-zip-filter-actions">
                  <button type="button" onClick={clearFilters}>Clear</button>
                  <button type="button" onClick={applyFilters}>Apply</button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        <div className="bulk-zip-table-wrap">
          <table className="bulk-zip-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Status</th>
                <th>Downloads</th>
                <th>Created At</th>
                <th>Expires At</th>
                <th>File Path</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="bulk-zip-empty">Loading records...</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="bulk-zip-empty">No records found</td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.jobId}</td>
                    <td>
                      <span className={`bulk-zip-status bulk-zip-status--${row.status.toLowerCase()}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{row.downloadCount}</td>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                    <td>{new Date(row.expireAt).toLocaleString()}</td>
                    <td className="bulk-zip-path" title={row.filePath}>{row.filePath}</td>
                    <td>
                      <div className="bulk-zip-action-row">
                        <button
                          type="button"
                          className="bulk-zip-copy-btn"
                          onClick={() => void copyDownloadLink(row.token)}
                        >
                          Copy Link
                        </button>
                        <button
                          type="button"
                          className="bulk-zip-open-btn"
                          onClick={() => openDownloadLink(row.token)}
                        >
                          Open Link
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bulk-zip-pagination">
          <span>
            Showing {filteredRows.length} of {total} records
          </span>
          <div className="bulk-zip-pagination-actions">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default BulkZipDownloadReportPage;


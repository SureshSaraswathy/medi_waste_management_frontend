import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import PageHeader from '../../../components/layout/PageHeader';
import type { BreadcrumbItem } from '../../../components/common/BreadcrumbNavigation';
import ReportExportDropdown from '../../../components/reports/ReportExportDropdown';
import { ExportColumn, reportExportService } from '../../../services/reportExportService';
import {
  getWasteCollectionSummaryReport,
  MissingCollectionRow,
  WasteCollectionSummaryFilter,
  WasteCollectionSummaryOption,
  WasteCollectionSummaryResponse,
} from '../../../services/wasteCollectionSummaryReportService';
import './routeTripReportPage.css';

type ExportRow = {
  section: string;
  col1?: string | number;
  col2?: string | number;
  col3?: string | number;
  col4?: string | number;
  col5?: string | number;
  col6?: string | number;
  col7?: string | number;
  col8?: string | number;
  col9?: string | number;
  col10?: string | number;
  col11?: string | number;
};

const WasteCollectionSummaryReportPage = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [report, setReport] = useState<WasteCollectionSummaryResponse | null>(null);
  const [filters, setFilters] = useState<WasteCollectionSummaryFilter>({
    option: 'Period',
    fromDate: today,
    toDate: today,
  });
  const [pendingFilters, setPendingFilters] = useState<WasteCollectionSummaryFilter>({
    option: 'Period',
    fromDate: today,
    toDate: today,
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterModalPosition, setFilterModalPosition] = useState<{ top: number; left: number } | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'missing'>('summary');

  const routeOptions = report?.meta?.routeOptions || [];
  const hcfOptions = report?.meta?.hcfOptions || [];
  const pcbZoneOptions = report?.meta?.pcbZoneOptions || [];

  useEffect(() => {
    if (filters.option === 'HCF' && !filters.hcfId) {
      setReport(null);
      setLoading(false);
      setError('Please select HCF');
      return;
    }
    if (filters.option === 'Route' && !filters.routeId) {
      setReport(null);
      setLoading(false);
      setError('Please select Route');
      return;
    }
    if (filters.option === 'PCB Zone' && !filters.pcbZoneId) {
      setReport(null);
      setLoading(false);
      setError('Please select PCB Zone');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getWasteCollectionSummaryReport(filters);
        setReport(data);
      } catch (err: any) {
        setReport(null);
        setError(err?.message || 'Failed to load waste collection summary');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [filters]);

  const option: WasteCollectionSummaryOption = filters.option;

  const visibleSectionRows = useMemo(() => {
    if (!report) return [] as ExportRow[];
    const rows: ExportRow[] = [];
    if (option === 'Route') {
      report.routeWiseRows.forEach((r) =>
        rows.push({ section: 'Route-wise Waste Collection', col1: r.serialNo, col2: r.hcfCode, col3: r.hcfShortName, col4: r.area, col5: r.yellowWeight, col6: r.redWeight, col7: r.blueWeight, col8: r.whiteWeight, col9: r.totalWeight }),
      );
    } else if (option === 'HCF') {
      report.hcfWiseRows.forEach((r) =>
        rows.push({ section: 'HCF-wise Daily Collection', col1: r.serialNo, col2: r.date, col3: r.yellowCount, col4: r.yellowWeight, col5: r.redCount, col6: r.redWeight, col7: r.blueCount, col8: r.blueWeight, col9: r.whiteCount, col10: r.whiteWeight, col11: r.totalWeight }),
      );
    } else if (option === 'Period') {
      report.periodWiseRows.forEach((r) =>
        rows.push({ section: 'Period-wise Summary', col1: r.serialNo, col2: r.hcfCode, col3: r.hcfShortName, col4: r.area, col5: r.yellowWeight, col6: r.redWeight, col7: r.blueWeight, col8: r.whiteWeight, col9: r.totalWeight }),
      );
    } else {
      report.pcbZoneRows.forEach((r) =>
        rows.push({ section: 'PCB Zone Summary', col1: r.serialNo, col2: r.hcfCode, col3: r.hcfName, col4: r.serviceAddress, col5: r.yellowWeight, col6: r.redWeight, col7: r.blueWeight, col8: r.whiteWeight, col9: r.totalWeight }),
      );
    }
    report.missingRows.forEach((m) =>
      rows.push({ section: 'Missing Collection Report', col1: m.serialNo, col2: m.date, col3: m.hcfCode, col4: m.hcfName, col5: m.area, col6: m.route, col7: m.reason || '-' }),
    );
    return rows;
  }, [report, option]);

  const filteredExportRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleSectionRows;
    return visibleSectionRows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(q));
  }, [visibleSectionRows, searchQuery]);

  const exportColumns: ExportColumn<ExportRow>[] = [
    { key: 'section', header: 'Section' },
    { key: 'col1', header: 'Col 1' },
    { key: 'col2', header: 'Col 2' },
    { key: 'col3', header: 'Col 3' },
    { key: 'col4', header: 'Col 4' },
    { key: 'col5', header: 'Col 5', type: 'number' },
    { key: 'col6', header: 'Col 6', type: 'number' },
    { key: 'col7', header: 'Col 7', type: 'number' },
    { key: 'col8', header: 'Col 8', type: 'number' },
    { key: 'col9', header: 'Col 9', type: 'number' },
    { key: 'col10', header: 'Col 10', type: 'number' },
    { key: 'col11', header: 'Col 11', type: 'number' },
  ];

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!filteredExportRows.length) {
      setError('No records available to export');
      return;
    }
    try {
      await reportExportService.exportReport<ExportRow>({
        reportType: 'waste-collection-summary',
        format,
        filters,
        columns: exportColumns,
        fileName: 'Waste_Collection_Summary',
        fallbackData: filteredExportRows,
        mapPayloadToRows: () => filteredExportRows,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to export report');
    }
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', path: '/dashboard' },
    { label: 'Reports', path: '/report' },
    { label: 'Waste Collection Summary', isCurrent: true },
  ];

  const fmt = (n: number | null | undefined) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '-');

  const renderMissingRows = (rows: MissingCollectionRow[]) =>
    rows.length === 0 ? (
      <tr><td className="empty-cell" colSpan={7}>{loading ? 'Loading...' : 'No missing collection records.'}</td></tr>
    ) : (
      rows.map((r) => (
        <tr key={`${r.date}-${r.hcfCode}-${r.serialNo}`} style={{ backgroundColor: '#fff1f2' }}>
          <td>{r.serialNo}</td><td>{r.date}</td><td>{r.hcfCode}</td><td>{r.hcfName}</td><td>{r.area}</td><td>{r.route}</td><td>{r.reason || '-'}</td>
        </tr>
      ))
    );

  const summaryRowsCount =
    option === 'Route'
      ? report?.routeWiseRows?.length || 0
      : option === 'HCF'
        ? report?.hcfWiseRows?.length || 0
        : option === 'Period'
          ? report?.periodWiseRows?.length || 0
          : report?.pcbZoneRows?.length || 0;

  const renderSummaryTable = () => {
    if (summaryRowsCount === 0) {
      return (
        <div className="route-trip-table-wrap" style={{ marginTop: 12, padding: 16 }}>
          {loading ? 'Loading collection summary...' : 'No data available'}
        </div>
      );
    }

    if (option === 'Route') {
      return (
        <div className="route-trip-table-wrap" style={{ marginTop: 12 }}>
          <table className="route-trip-table">
            <thead className="table-header">
              <tr><th>S.No</th><th>HCF Code</th><th>HCF Short Name</th><th>Area</th><th className="num-col">Yellow Weight</th><th className="num-col">Red Weight</th><th className="num-col">Blue Weight</th><th className="num-col">White Weight</th><th className="num-col">Total Weight</th></tr>
            </thead>
            <tbody>{report!.routeWiseRows.map((r) => <tr key={`${r.hcfCode}-${r.serialNo}`}><td>{r.serialNo}</td><td>{r.hcfCode}</td><td>{r.hcfShortName}</td><td>{r.area}</td><td className="num-col">{fmt(r.yellowWeight)}</td><td className="num-col">{fmt(r.redWeight)}</td><td className="num-col">{fmt(r.blueWeight)}</td><td className="num-col">{fmt(r.whiteWeight)}</td><td className="num-col">{fmt(r.totalWeight)}</td></tr>)}</tbody>
          </table>
        </div>
      );
    }

    if (option === 'HCF') {
      return (
        <div className="route-trip-table-wrap" style={{ marginTop: 12 }}>
          <table className="route-trip-table">
            <thead className="table-header">
              <tr><th>S.No</th><th>Date</th><th className="num-col">Yellow Count</th><th className="num-col">Yellow Weight</th><th className="num-col">Red Count</th><th className="num-col">Red Weight</th><th className="num-col">Blue Count</th><th className="num-col">Blue Weight</th><th className="num-col">White Count</th><th className="num-col">White Weight</th><th className="num-col">Total Weight</th></tr>
            </thead>
            <tbody>{report!.hcfWiseRows.map((r) => <tr key={`${r.date}-${r.serialNo}`}><td>{r.serialNo}</td><td>{r.date}</td><td className="num-col">{r.yellowCount}</td><td className="num-col">{fmt(r.yellowWeight)}</td><td className="num-col">{r.redCount}</td><td className="num-col">{fmt(r.redWeight)}</td><td className="num-col">{r.blueCount}</td><td className="num-col">{fmt(r.blueWeight)}</td><td className="num-col">{r.whiteCount}</td><td className="num-col">{fmt(r.whiteWeight)}</td><td className="num-col">{fmt(r.totalWeight)}</td></tr>)}</tbody>
          </table>
        </div>
      );
    }

    if (option === 'Period') {
      return (
        <div className="route-trip-table-wrap" style={{ marginTop: 12 }}>
          <table className="route-trip-table">
            <thead className="table-header">
              <tr><th>S.No</th><th>HCF Code</th><th>HCF Short Name</th><th>Area</th><th className="num-col">Yellow Weight</th><th className="num-col">Red Weight</th><th className="num-col">Blue Weight</th><th className="num-col">White Weight</th><th className="num-col">Total Weight</th></tr>
            </thead>
            <tbody>{report!.periodWiseRows.map((r) => <tr key={`${r.hcfCode}-${r.serialNo}`}><td>{r.serialNo}</td><td>{r.hcfCode}</td><td>{r.hcfShortName}</td><td>{r.area}</td><td className="num-col">{fmt(r.yellowWeight)}</td><td className="num-col">{fmt(r.redWeight)}</td><td className="num-col">{fmt(r.blueWeight)}</td><td className="num-col">{fmt(r.whiteWeight)}</td><td className="num-col">{fmt(r.totalWeight)}</td></tr>)}</tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="route-trip-table-wrap" style={{ marginTop: 12 }}>
        <table className="route-trip-table">
          <thead className="table-header">
            <tr><th>S.No</th><th>HCF Code</th><th>HCF Name</th><th>Service Address</th><th className="num-col">Yellow Weight</th><th className="num-col">Red Weight</th><th className="num-col">Blue Weight</th><th className="num-col">White Weight</th><th className="num-col">Total Weight</th></tr>
          </thead>
          <tbody>{report!.pcbZoneRows.map((r) => <tr key={`${r.hcfCode}-${r.serialNo}`}><td>{r.serialNo}</td><td>{r.hcfCode}</td><td>{r.hcfName}</td><td>{r.serviceAddress || '-'}</td><td className="num-col">{fmt(r.yellowWeight)}</td><td className="num-col">{fmt(r.redWeight)}</td><td className="num-col">{fmt(r.blueWeight)}</td><td className="num-col">{fmt(r.whiteWeight)}</td><td className="num-col">{fmt(r.totalWeight)}</td></tr>)}</tbody>
        </table>
      </div>
    );
  };

  return (
    <AppLayout>
      <PageHeader title="Waste Collection Summary" subtitle="Route/HCF/Period/PCB Zone summary with missing collection report" breadcrumbItems={breadcrumbItems} className="invoice-report-header" />
      <div className="route-trip-report-page">
        <div className="search-actions-row">
          <div className={`search-container ${loading ? 'loading' : ''}`}>
            <input type="text" className="global-search-input" placeholder="Search visible report rows..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
          >Filter</button>
          <div className="route-trip-actions"><ReportExportDropdown disabled={!filteredExportRows.length} onExport={handleExport} /></div>
        </div>

        {showAdvancedFilters && createPortal(
          <div className="filter-modal-overlay" onClick={() => setShowAdvancedFilters(false)}>
            <div className="filter-modal-content" onClick={(e) => e.stopPropagation()} style={filterModalPosition ? { position: 'fixed', top: `${filterModalPosition.top}px`, left: `${filterModalPosition.left}px`, margin: 0 } : {}}>
              <div className="filter-modal-header"><h3 className="filter-modal-title">Advanced Filters</h3></div>
              <div className="filter-modal-body">
                <div className="filter-modal-grid">
                  <div className="filter-modal-group">
                    <label className="filter-modal-label">Option</label>
                    <select className="filter-modal-select" value={pendingFilters.option} onChange={(e) => setPendingFilters((p) => ({ ...p, option: e.target.value as WasteCollectionSummaryOption }))}>
                      <option value="Route">Route</option><option value="HCF">HCF</option><option value="Period">Period</option><option value="PCB Zone">PCB Zone</option>
                    </select>
                  </div>
                  {pendingFilters.option === 'Route' && <div className="filter-modal-group"><label className="filter-modal-label">Select Route</label><select className="filter-modal-select" value={pendingFilters.routeId || ''} onChange={(e) => setPendingFilters((p) => ({ ...p, routeId: e.target.value }))}><option value="">Select Route</option>{routeOptions.map((r) => <option key={r.routeId} value={r.routeId}>{r.routeName}</option>)}</select></div>}
                  {pendingFilters.option === 'HCF' && <div className="filter-modal-group"><label className="filter-modal-label">Select HCF</label><select className="filter-modal-select" value={pendingFilters.hcfId || ''} onChange={(e) => setPendingFilters((p) => ({ ...p, hcfId: e.target.value }))}><option value="">Select HCF</option>{hcfOptions.map((h) => <option key={h.hcfId} value={h.hcfId}>{h.hcfName}</option>)}</select></div>}
                  {pendingFilters.option === 'PCB Zone' && <div className="filter-modal-group"><label className="filter-modal-label">Select PCB Zone</label><select className="filter-modal-select" value={pendingFilters.pcbZoneId || ''} onChange={(e) => setPendingFilters((p) => ({ ...p, pcbZoneId: e.target.value }))}><option value="">Select PCB Zone</option>{pcbZoneOptions.map((z) => <option key={z.pcbZoneId} value={z.pcbZoneId}>{z.pcbZoneName}</option>)}</select></div>}
                  <div className="filter-modal-group"><label className="filter-modal-label">From Date</label><input type="date" className="filter-modal-input" value={pendingFilters.fromDate} onChange={(e) => setPendingFilters((p) => ({ ...p, fromDate: e.target.value }))} /></div>
                  <div className="filter-modal-group"><label className="filter-modal-label">To Date</label><input type="date" className="filter-modal-input" value={pendingFilters.toDate} onChange={(e) => setPendingFilters((p) => ({ ...p, toDate: e.target.value }))} /></div>
                </div>
              </div>
              <div className="filter-modal-footer">
                <button type="button" className="route-trip-btn" onClick={() => { const reset: WasteCollectionSummaryFilter = { option: 'Period', fromDate: today, toDate: today }; setPendingFilters(reset); setFilters(reset); }}>Reset</button>
                <button
                  type="button"
                  className="route-trip-btn route-trip-btn--primary"
                  onClick={() => {
                    if (pendingFilters.option === 'HCF' && !pendingFilters.hcfId) {
                      setError('Please select HCF');
                      return;
                    }
                    if (pendingFilters.option === 'Route' && !pendingFilters.routeId) {
                      setError('Please select Route');
                      return;
                    }
                    if (pendingFilters.option === 'PCB Zone' && !pendingFilters.pcbZoneId) {
                      setError('Please select PCB Zone');
                      return;
                    }
                    setError(null);
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

        {error ? <div className="route-trip-error">{error}</div> : null}
        {report ? <div className="route-trip-report-subtitle">{report.headerTitle}</div> : null}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="route-trip-btn"
            style={{
              background: activeTab === 'summary' ? '#0ea5e9' : '#f8fafc',
              color: activeTab === 'summary' ? '#fff' : '#0f172a',
              borderColor: activeTab === 'summary' ? '#0ea5e9' : '#d1d5db',
            }}
            onClick={() => setActiveTab('summary')}
          >
            Collection Summary
          </button>
          <button
            type="button"
            className="route-trip-btn"
            style={{
              background: activeTab === 'missing' ? '#ef4444' : '#f8fafc',
              color: activeTab === 'missing' ? '#fff' : '#0f172a',
              borderColor: activeTab === 'missing' ? '#ef4444' : '#d1d5db',
            }}
            onClick={() => setActiveTab('missing')}
          >
            Missing Collection
          </button>
        </div>

        {activeTab === 'summary' ? (
          <div style={{ marginTop: 8 }}>{renderSummaryTable()}</div>
        ) : (
          <>
            {(report?.missingRows || []).length === 0 ? (
              <div className="route-trip-table-wrap" style={{ marginTop: 12, padding: 16 }}>
                {loading ? 'Loading missing collection...' : 'No data available'}
              </div>
            ) : (
              <div className="route-trip-table-wrap" style={{ marginTop: 12, border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(239, 68, 68, 0.12)' }}>
                <table className="route-trip-table">
                  <thead className="table-header">
                    <tr><th>S.No</th><th>Date</th><th>HCF Code</th><th>HCF Name</th><th>Area</th><th>Route</th><th>Reason</th></tr>
                  </thead>
                  <tbody>{renderMissingRows(report?.missingRows || [])}</tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default WasteCollectionSummaryReportPage;


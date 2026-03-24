import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import PageHeader from '../../../components/layout/PageHeader';
import type { BreadcrumbItem } from '../../../components/common/BreadcrumbNavigation';
import ReportExportDropdown from '../../../components/reports/ReportExportDropdown';
import { reportExportService, ExportColumn } from '../../../services/reportExportService';
import { getPcbComplianceReport, PcbComplianceRow } from '../../../services/pcbComplianceReportService';
import './routeTripReportPage.css';

const toDateInput = (d: Date): string => d.toISOString().slice(0, 10);
const fmt = (v: number | null | undefined) =>
  v == null ? '-' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PcbComplianceReportPage = () => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [rows, setRows] = useState<PcbComplianceRow[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [subtitle, setSubtitle] = useState('');
  const [filters, setFilters] = useState({ fromDate: toDateInput(monthStart), toDate: toDateInput(today) });
  const [pendingFilters, setPendingFilters] = useState(filters);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterModalPosition, setFilterModalPosition] = useState<{ top: number; left: number } | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getPcbComplianceReport(filters);
        setRows(response.data || []);
        setTotals(response.totals || null);
        setSubtitle(`PCB Compliance Report - Period ${response.header.fromDate} to ${response.header.toDate}`);
      } catch (err: any) {
        setRows([]);
        setError(err?.message || 'Failed to load PCB compliance report');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [filters.fromDate, filters.toDate]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.hcfName, r.area, r.hcfType, r.generatedDate, r.receivedDate].join(' ').toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!filteredRows.length) return setError('No records available to export');
    const columns: ExportColumn<PcbComplianceRow>[] = [
      { key: 'serialNo', header: 'S.No', type: 'number' },
      { key: 'hcfName', header: 'HCF Name' },
      { key: 'area', header: 'Area' },
      { key: 'hcfType', header: 'HCF Type' },
      { key: 'generatedDate', header: 'Generated Date', type: 'date' },
      { key: 'generatedTime', header: 'Generated Time' },
      { key: 'generatedYellowCount', header: 'Gen Yellow Count', type: 'number' },
      { key: 'generatedYellowQtyKg', header: 'Gen Yellow Kg', type: 'number' },
      { key: 'generatedRedCount', header: 'Gen Red Count', type: 'number' },
      { key: 'generatedRedQtyKg', header: 'Gen Red Kg', type: 'number' },
      { key: 'generatedBlueCount', header: 'Gen Blue Count', type: 'number' },
      { key: 'generatedBlueQtyKg', header: 'Gen Blue Kg', type: 'number' },
      { key: 'generatedWhiteCount', header: 'Gen White Count', type: 'number' },
      { key: 'generatedWhiteQtyKg', header: 'Gen White Kg', type: 'number' },
      { key: 'receivedDate', header: 'Received Date', type: 'date' },
      { key: 'receivedTime', header: 'Received Time' },
      { key: 'receivedYellowCount', header: 'Rec Yellow Count', type: 'number' },
      { key: 'receivedYellowQtyKg', header: 'Rec Yellow Kg', type: 'number' },
      { key: 'receivedRedCount', header: 'Rec Red Count', type: 'number' },
      { key: 'receivedRedQtyKg', header: 'Rec Red Kg', type: 'number' },
      { key: 'receivedBlueCount', header: 'Rec Blue Count', type: 'number' },
      { key: 'receivedBlueQtyKg', header: 'Rec Blue Kg', type: 'number' },
      { key: 'receivedWhiteCount', header: 'Rec White Count', type: 'number' },
      { key: 'receivedWhiteQtyKg', header: 'Rec White Kg', type: 'number' },
      { key: 'diffYellowQtyKg', header: 'Diff Yellow Kg', type: 'number' },
      { key: 'diffRedQtyKg', header: 'Diff Red Kg', type: 'number' },
      { key: 'diffBlueQtyKg', header: 'Diff Blue Kg', type: 'number' },
      { key: 'diffWhiteQtyKg', header: 'Diff White Kg', type: 'number' },
    ];
    try {
      await reportExportService.exportReport<PcbComplianceRow>({
        reportType: 'pcb-compliance',
        format,
        filters,
        columns,
        fileName: 'PCB_Compliance_Report',
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
    { label: 'PCB Compliance', isCurrent: true },
  ];

  const diffStyle = (v: number) => (Math.abs(v) > 0.001 ? { color: '#b91c1c', fontWeight: 700 } : undefined);

  return (
    <AppLayout>
      <PageHeader title="PCB Compliance Report" subtitle={subtitle || `PCB Compliance Report - Period ${filters.fromDate} to ${filters.toDate}`} breadcrumbItems={breadcrumbItems} className="invoice-report-header" />
      <div className="route-trip-report-page">
        <div className="search-actions-row">
          <div className={`search-container ${loading ? 'loading' : ''}`}>
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
            <input type="text" className="global-search-input" placeholder="Search HCF, area, type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <button type="button" ref={filterButtonRef} className={`btn-filters-toggle ${showAdvancedFilters ? 'active' : ''}`} onClick={() => { if (!showAdvancedFilters && filterButtonRef.current) { const rect = filterButtonRef.current.getBoundingClientRect(); setFilterModalPosition({ top: rect.bottom + 8, left: Math.max(8, Math.min(rect.left, window.innerWidth - 360)) }); } setShowAdvancedFilters(!showAdvancedFilters); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>Filter
          </button>
          <div className="route-trip-actions"><ReportExportDropdown disabled={filteredRows.length === 0} onExport={handleExport} /></div>
        </div>

        {showAdvancedFilters && createPortal(
          <div className="filter-modal-overlay" onClick={() => { setShowAdvancedFilters(false); setFilterModalPosition(null); }}>
            <div className="filter-modal-content" onClick={(e) => e.stopPropagation()} style={filterModalPosition ? { position: 'fixed', top: `${filterModalPosition.top}px`, left: `${filterModalPosition.left}px`, margin: 0 } : {}}>
              <div className="filter-modal-header"><h3 className="filter-modal-title">Advanced Filters</h3><button className="filter-modal-close-btn" onClick={() => setShowAdvancedFilters(false)}>×</button></div>
              <div className="filter-modal-body"><div className="filter-modal-grid">
                <div className="filter-modal-group"><label className="filter-modal-label">From Date</label><input type="date" className="filter-modal-input" value={pendingFilters.fromDate} onChange={(e) => setPendingFilters((p) => ({ ...p, fromDate: e.target.value }))} /></div>
                <div className="filter-modal-group"><label className="filter-modal-label">To Date</label><input type="date" className="filter-modal-input" value={pendingFilters.toDate} onChange={(e) => setPendingFilters((p) => ({ ...p, toDate: e.target.value }))} /></div>
              </div></div>
              <div className="filter-modal-footer">
                <button type="button" className="route-trip-btn" onClick={() => { const reset = { fromDate: toDateInput(monthStart), toDate: toDateInput(today) }; setPendingFilters(reset); setFilters(reset); }}>Reset</button>
                <button type="button" className="route-trip-btn route-trip-btn--primary" onClick={() => { setFilters(pendingFilters); setShowAdvancedFilters(false); }}>Apply Filters</button>
              </div>
            </div>
          </div>, document.body)}

        <div className="route-trip-table-wrap">
          {error ? <div className="route-trip-error">{error}</div> : null}
          <table className="route-trip-table" style={{ minWidth: 2500 }}>
            <thead className="table-header">
              <tr>
                <th rowSpan={3}>S.No</th><th rowSpan={3}>HCF Name</th><th rowSpan={3}>Area</th><th rowSpan={3}>HCF Type</th>
                <th colSpan={10}>Details of BMW Generated by HCF</th>
                <th colSpan={10}>Details of BMW Received by HCF</th>
                <th colSpan={4}>Difference in Waste Collected Vs Received (Kg)</th>
              </tr>
              <tr>
                <th rowSpan={2}>Date</th><th rowSpan={2}>Time</th>
                <th colSpan={2}>Yellow</th><th colSpan={2}>Red</th><th colSpan={2}>Blue</th><th colSpan={2}>White</th>
                <th rowSpan={2}>Date</th><th rowSpan={2}>Time</th>
                <th colSpan={2}>Yellow</th><th colSpan={2}>Red</th><th colSpan={2}>Blue</th><th colSpan={2}>White</th>
                <th rowSpan={2}>Yellow</th><th rowSpan={2}>Red</th><th rowSpan={2}>Blue</th><th rowSpan={2}>White</th>
              </tr>
              <tr>
                <th className="num-col">Count</th><th className="num-col">Qty Kg</th><th className="num-col">Count</th><th className="num-col">Qty Kg</th>
                <th className="num-col">Count</th><th className="num-col">Qty Kg</th><th className="num-col">Count</th><th className="num-col">Qty Kg</th>
                <th className="num-col">Count</th><th className="num-col">Qty Kg</th><th className="num-col">Count</th><th className="num-col">Qty Kg</th>
                <th className="num-col">Count</th><th className="num-col">Qty Kg</th><th className="num-col">Count</th><th className="num-col">Qty Kg</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td className="empty-cell" colSpan={28}>Loading...</td></tr> : filteredRows.length === 0 ? <tr><td className="empty-cell" colSpan={28}>No data available</td></tr> : (
                <>
                  {filteredRows.map((r) => (
                    <tr key={`${r.hcfName}-${r.serialNo}`}>
                      <td>{r.serialNo}</td><td>{r.hcfName || '-'}</td><td>{r.area || '-'}</td><td>{r.hcfType || '-'}</td>
                      <td>{r.generatedDate || '-'}</td><td>{r.generatedTime || '-'}</td>
                      <td className="num-col">{r.generatedYellowCount ?? 0}</td><td className="num-col">{fmt(r.generatedYellowQtyKg)}</td>
                      <td className="num-col">{r.generatedRedCount ?? 0}</td><td className="num-col">{fmt(r.generatedRedQtyKg)}</td>
                      <td className="num-col">{r.generatedBlueCount ?? 0}</td><td className="num-col">{fmt(r.generatedBlueQtyKg)}</td>
                      <td className="num-col">{r.generatedWhiteCount ?? 0}</td><td className="num-col">{fmt(r.generatedWhiteQtyKg)}</td>
                      <td>{r.receivedDate || '-'}</td><td>{r.receivedTime || '-'}</td>
                      <td className="num-col">{r.receivedYellowCount ?? 0}</td><td className="num-col">{fmt(r.receivedYellowQtyKg)}</td>
                      <td className="num-col">{r.receivedRedCount ?? 0}</td><td className="num-col">{fmt(r.receivedRedQtyKg)}</td>
                      <td className="num-col">{r.receivedBlueCount ?? 0}</td><td className="num-col">{fmt(r.receivedBlueQtyKg)}</td>
                      <td className="num-col">{r.receivedWhiteCount ?? 0}</td><td className="num-col">{fmt(r.receivedWhiteQtyKg)}</td>
                      <td className="num-col" style={diffStyle(r.diffYellowQtyKg)}>{fmt(r.diffYellowQtyKg)}</td>
                      <td className="num-col" style={diffStyle(r.diffRedQtyKg)}>{fmt(r.diffRedQtyKg)}</td>
                      <td className="num-col" style={diffStyle(r.diffBlueQtyKg)}>{fmt(r.diffBlueQtyKg)}</td>
                      <td className="num-col" style={diffStyle(r.diffWhiteQtyKg)}>{fmt(r.diffWhiteQtyKg)}</td>
                    </tr>
                  ))}
                  {totals ? (
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td colSpan={7}>Totals</td>
                      <td className="num-col">{fmt(totals.totalGeneratedYellowQtyKg)}</td>
                      <td></td><td className="num-col">{fmt(totals.totalGeneratedRedQtyKg)}</td>
                      <td></td><td className="num-col">{fmt(totals.totalGeneratedBlueQtyKg)}</td>
                      <td></td><td className="num-col">{fmt(totals.totalGeneratedWhiteQtyKg)}</td>
                      <td colSpan={3}></td>
                      <td className="num-col">{fmt(totals.totalReceivedYellowQtyKg)}</td>
                      <td></td><td className="num-col">{fmt(totals.totalReceivedRedQtyKg)}</td>
                      <td></td><td className="num-col">{fmt(totals.totalReceivedBlueQtyKg)}</td>
                      <td></td><td className="num-col">{fmt(totals.totalReceivedWhiteQtyKg)}</td>
                      <td className="num-col" style={diffStyle(totals.totalDiffYellowQtyKg)}>{fmt(totals.totalDiffYellowQtyKg)}</td>
                      <td className="num-col" style={diffStyle(totals.totalDiffRedQtyKg)}>{fmt(totals.totalDiffRedQtyKg)}</td>
                      <td className="num-col" style={diffStyle(totals.totalDiffBlueQtyKg)}>{fmt(totals.totalDiffBlueQtyKg)}</td>
                      <td className="num-col" style={diffStyle(totals.totalDiffWhiteQtyKg)}>{fmt(totals.totalDiffWhiteQtyKg)}</td>
                    </tr>
                  ) : null}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default PcbComplianceReportPage;


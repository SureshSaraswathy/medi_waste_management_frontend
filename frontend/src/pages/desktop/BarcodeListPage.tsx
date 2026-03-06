import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { hcfService, HcfResponse } from '../../services/hcfService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { barcodeLabelService, BarcodeLabelResponse, BarcodeListParams, UpdateBarcodeLabelRequest } from '../../services/barcodeLabelService';
import NotificationBell from '../../components/NotificationBell';
import PageHeader from '../../components/layout/PageHeader';
import toast from 'react-hot-toast';
// @ts-ignore - jsbarcode doesn't have TypeScript definitions
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import './barcodeGenerationPage.css';
import '../desktop/dashboardPage.css';

interface BarcodeLabelWithDetails extends BarcodeLabelResponse {
  hcfName?: string;
  companyName?: string;
  hcfUniqueId?: string;
}

const BarcodeListPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<BarcodeLabelWithDetails | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState<BarcodeListParams>({
    page: 1,
    limit: 25,
    search: '',
    colorBlock: '',
    barcodeType: '',
    status: '',
    startDate: '',
    endDate: '',
    includeDeleted: false,
  });
  
  // Master data
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [hcfs, setHcfs] = useState<HcfResponse[]>([]);
  const [labels, setLabels] = useState<BarcodeLabelWithDetails[]>([]);
  const [summary, setSummary] = useState({ total: 0, barcodes: 0, qrCodes: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const data = await companyService.getAllCompanies(undefined, true);
      setCompanies(data);
    } catch (err: any) {
      console.error('Failed to load companies:', err);
    }
  }, []);

  // Load HCFs
  const loadHcfs = useCallback(async () => {
    try {
      const data = await hcfService.getAllHcfs(undefined, true);
      setHcfs(data);
    } catch (err: any) {
      console.error('Failed to load HCFs:', err);
    }
  }, []);

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      const data = await barcodeLabelService.getSummary();
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load summary:', err);
    }
  }, []);

  // Load labels with pagination
  const loadLabels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: BarcodeListParams = {
        page: currentPage,
        limit: pageSize,
        search: searchQuery || filters.search,
        colorBlock: filters.colorBlock,
        barcodeType: filters.barcodeType,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        includeDeleted: filters.includeDeleted,
      };

      const result = await barcodeLabelService.getBarcodeList(params);
      
      // Generate HCFUniqueID helper function
      const generateHCFUniqueID = (hcf: HcfResponse): string => {
        if (!hcf) return '';
        const hcfCode = hcf.hcfCode || '';
        const pincode = hcf.pincode || '';
        const stateCode = hcf.stateCode || '';
        const hcfType = hcf.hcfTypeCode || '';
        const first5Chars = hcfCode.substring(0, 5).padEnd(5, '0');
        const last5Chars = hcfCode.length >= 5 
          ? hcfCode.substring(hcfCode.length - 5)
          : hcfCode.padStart(5, '0');
        return `${first5Chars}${pincode}${stateCode}${hcfType}${last5Chars}`;
      };

      // Enrich with HCF and Company names, and generate HCFUniqueID
      const enrichedLabels = await Promise.all(
        result.data.map(async (label) => {
          let hcfName = '';
          let companyName = '';
          let hcfUniqueId = '';
          try {
            const hcf = await hcfService.getHcfById(label.hcfId);
            hcfName = hcf.hcfName;
            // Generate HCFUniqueID for display
            hcfUniqueId = generateHCFUniqueID(hcf);
            const company = companies.find(c => c.id === label.companyId);
            companyName = company?.companyName || 'Unknown';
          } catch (err) {
            console.error('Error loading details:', err);
          }
          return { ...label, hcfName, companyName, hcfUniqueId };
        })
      );
      
      setLabels(enrichedLabels);
      setTotalRecords(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load labels';
      setError(errorMessage);
      console.error('Failed to load labels:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, filters, companies]);

  // Load data on mount
  useEffect(() => {
    loadCompanies();
    loadHcfs();
    loadSummary();
  }, [loadCompanies, loadHcfs, loadSummary]);

  // Load labels when filters change
  useEffect(() => {
    if (companies.length > 0) {
      loadLabels();
    }
  }, [loadLabels]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadLabels();
      } else {
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle view
  const handleView = (label: BarcodeLabelWithDetails) => {
    setSelectedLabel(label);
    setShowViewModal(true);
  };

  // Handle modify
  const handleModify = (label: BarcodeLabelWithDetails) => {
    setSelectedLabel(label);
    setShowModifyModal(true);
  };

  // Handle delete (soft delete) - set status to Inactive/Deleted
  const handleDelete = async (labelId: string) => {
    if (!window.confirm('Are you sure you want to delete this barcode label? This will mark it as inactive.')) {
      return;
    }
    try {
      setLoading(true);
      // Soft delete by updating status to Inactive
      await barcodeLabelService.updateBarcodeLabel(labelId, { status: 'Inactive' });
      toast.success('Barcode label deleted successfully', {
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        ),
        style: {
          background: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
        },
      });
      await loadLabels();
      await loadSummary();
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete label';
      toast.error(`Error: ${errorMessage}`);
      console.error('Error deleting label:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle update - only status can be updated
  const handleUpdate = async (updateData: UpdateBarcodeLabelRequest) => {
    if (!selectedLabel) return;
    
    try {
      setLoading(true);
      // Only allow status update
      await barcodeLabelService.updateBarcodeLabel(selectedLabel.id, { status: updateData.status });
      toast.success('Barcode label status updated successfully', {
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        ),
        style: {
          background: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
        },
      });
      setShowModifyModal(false);
      setSelectedLabel(null);
      await loadLabels();
      await loadSummary();
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update label';
      toast.error(`Error: ${errorMessage}`);
      console.error('Error updating label:', err);
    } finally {
      setLoading(false);
    }
  };

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  return (
    <div className="dashboard-page">
      <aside className={`dashboard-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="logo-container">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <div className="brand-text">
                <span className="brand-title">MEDI-WASTE</span>
                <span className="brand-subtitle">Enterprise Platform</span>
              </div>
            )}
          </div>

          <button
            className="toggle-button"
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              {isSidebarCollapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <NotificationBell variant="sidebar" isSidebarCollapsed={isSidebarCollapsed} />
          <Link
            to="/profile"
            className={`sidebar-profile-btn ${location.pathname === '/profile' ? 'sidebar-profile-btn--active' : ''}`}
            title="My Profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {!isSidebarCollapsed && <span>Profile</span>}
          </Link>
          <button onClick={logout} className="sidebar-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <PageHeader 
          title="Barcode List"
          subtitle="View and manage generated barcode labels"
        />

        <div className="barcode-generation-page">
          <div className="barcode-generation-header">
            <div className="barcode-generation-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                <line x1="7" y1="8" x2="7" y2="16"></line>
                <line x1="11" y1="8" x2="11" y2="16"></line>
                <line x1="15" y1="8" x2="15" y2="16"></line>
                <line x1="19" y1="8" x2="19" y2="16"></line>
              </svg>
            </div>
            <div className="barcode-generation-header-text">
              <h1 className="barcode-generation-title">Barcode & QR Code Labels</h1>
              <p className="barcode-generation-subtitle">View and manage all generated labels</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="barcode-summary-container">
            <div className="barcode-summary-card">
              <div className="barcode-summary-stats">
                <div className="barcode-summary-stat">
                  <span className="barcode-summary-stat-value">{summary.total}</span>
                  <span className="barcode-summary-stat-label">Total Labels</span>
                </div>
                <div className="barcode-summary-stat">
                  <span className="barcode-summary-stat-value">{summary.barcodes}</span>
                  <span className="barcode-summary-stat-label">Barcodes</span>
                </div>
                <div className="barcode-summary-stat">
                  <span className="barcode-summary-stat-value">{summary.qrCodes}</span>
                  <span className="barcode-summary-stat-label">QR Codes</span>
                </div>
              </div>
            </div>
          </div>

          <div className="barcode-generation-actions">
            <div className="barcode-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="barcode-search-input"
                placeholder="Search by Barcode Number, HCF Code, or HCF Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="barcode-action-buttons-group">
              <button className="barcode-filter-btn" onClick={() => setShowFiltersModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Filters
              </button>
            </div>
          </div>

          {error && (
            <div className="barcode-error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}

          {/* Table */}
          <div className="barcode-table-container">
            <table className="barcode-table">
              <thead>
                <tr>
                  <th>BARCODE NUMBER</th>
                  <th>HCF CODE</th>
                  <th>HCF NAME</th>
                  <th>WASTE COLOR</th>
                  <th>LABEL TYPE</th>
                  <th>GENERATED DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="empty-message">
                      Loading...
                    </td>
                  </tr>
                ) : labels.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-message">
                      No barcode labels found.
                    </td>
                  </tr>
                ) : (
                  labels.map((label) => (
                    <tr key={label.id}>
                      <td className="barcode-value-cell">
                        {label.barcodeType === 'QR Code' && label.hcfUniqueId 
                          ? label.hcfUniqueId 
                          : label.barcodeValue}
                      </td>
                      <td className="hcf-code-cell">{label.hcfCode}</td>
                      <td>{label.hcfName || '-'}</td>
                      <td>
                        <div className="color-block-swatch-wrapper">
                          <div 
                            className={`color-block-swatch color-block-swatch--${label.colorBlock.toLowerCase()}`}
                            style={{
                              backgroundColor: label.colorBlock === 'Yellow' ? '#FFFF00' : 
                                              label.colorBlock === 'Red' ? '#FF0000' :
                                              label.colorBlock === 'Blue' ? '#0000FF' : '#FFFFFF',
                              border: label.colorBlock === 'White' ? '1px solid #e2e8f0' : 'none'
                            }}
                          ></div>
                          <span className="color-block-hex">
                            {label.colorBlock === 'Yellow' ? '#FFFF00' : 
                             label.colorBlock === 'Red' ? '#FF0000' :
                             label.colorBlock === 'Blue' ? '#0000FF' : '#FFFFFF'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="barcode-type-icon-wrapper">
                          {label.barcodeType === 'QR Code' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="5" height="5"></rect>
                              <rect x="16" y="3" width="5" height="5"></rect>
                              <rect x="3" y="16" width="5" height="5"></rect>
                              <rect x="7" y="7" width="2" height="2"></rect>
                              <rect x="15" y="7" width="2" height="2"></rect>
                              <rect x="7" y="15" width="2" height="2"></rect>
                              <rect x="11" y="11" width="2" height="2"></rect>
                              <rect x="16" y="16" width="5" height="5"></rect>
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="4" y1="8" x2="4" y2="16"></line>
                              <line x1="6" y1="8" x2="6" y2="16"></line>
                              <line x1="8" y1="8" x2="8" y2="16"></line>
                              <line x1="10" y1="8" x2="10" y2="16"></line>
                              <line x1="12" y1="8" x2="12" y2="16"></line>
                              <line x1="14" y1="8" x2="14" y2="16"></line>
                              <line x1="16" y1="8" x2="16" y2="16"></line>
                              <line x1="18" y1="8" x2="18" y2="16"></line>
                              <line x1="20" y1="8" x2="20" y2="16"></line>
                            </svg>
                          )}
                        </div>
                      </td>
                      <td>{new Date(label.createdOn).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge status-badge--${label.status?.toLowerCase() || 'active'}`}>
                          {label.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="barcode-table-action-buttons">
                          <button
                            className="barcode-action-btn barcode-action-btn--view"
                            onClick={() => handleView(label)}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="barcode-action-btn barcode-action-btn--edit"
                            onClick={() => handleModify(label)}
                            title="Modify"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="barcode-action-btn barcode-action-btn--delete"
                            onClick={() => handleDelete(label.id)}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="barcode-pagination">
              <button
                className="barcode-pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="barcode-pagination-info">
                Page {currentPage} of {totalPages} ({totalRecords} total)
              </span>
              <button
                className="barcode-pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>

      {/* View Modal */}
      {showViewModal && selectedLabel && (
        <ViewBarcodeModal
          label={selectedLabel}
          onClose={() => {
            setShowViewModal(false);
            setSelectedLabel(null);
          }}
        />
      )}

      {/* Modify Modal */}
      {showModifyModal && selectedLabel && (
        <ModifyBarcodeModal
          label={selectedLabel}
          onClose={() => {
            setShowModifyModal(false);
            setSelectedLabel(null);
          }}
          onSave={handleUpdate}
        />
      )}

      {/* Filters Modal */}
      {showFiltersModal && (
        <BarcodeFiltersModal
          filters={filters}
          setFilters={setFilters}
          onClose={() => setShowFiltersModal(false)}
          onApply={() => {
            setCurrentPage(1);
            setShowFiltersModal(false);
          }}
        />
      )}
    </div>
  );
};

// View Modal Component - Label Preview
interface ViewBarcodeModalProps {
  label: BarcodeLabelWithDetails;
  onClose: () => void;
}

const ViewBarcodeModal = ({ label, onClose }: ViewBarcodeModalProps) => {
  const previewBarcodeRef = useRef<SVGSVGElement>(null);
  const previewQrRef = useRef<HTMLCanvasElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Generate barcode/QR code for preview
  useEffect(() => {
    const displayValue = label.barcodeType === 'QR Code' && label.hcfUniqueId 
      ? label.hcfUniqueId 
      : label.barcodeValue;

    if (label.barcodeType === 'Barcode' && previewBarcodeRef.current) {
      try {
        previewBarcodeRef.current.innerHTML = '';
        JsBarcode(previewBarcodeRef.current, displayValue, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: false,
          margin: 5,
        });
      } catch (err) {
        console.error('Failed to generate preview barcode:', err);
      }
    } else if (label.barcodeType === 'QR Code' && previewQrRef.current) {
      QRCode.toCanvas(previewQrRef.current, displayValue, {
        width: 150,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).catch((err) => {
        console.error('Failed to generate preview QR code:', err);
      });
    }
  }, [label]);

  // Print label only
  const handlePrint = () => {
    if (!printContainerRef.current) return;
    
    // Generate barcode/QR code for print
    setTimeout(() => {
      const displayValue = label.barcodeType === 'QR Code' && label.hcfUniqueId 
        ? label.hcfUniqueId 
        : label.barcodeValue;

      if (label.barcodeType === 'Barcode') {
        const svg = printContainerRef.current?.querySelector<SVGElement>('.print-barcode-svg');
        if (svg) {
          svg.innerHTML = '';
          JsBarcode(svg, displayValue, {
            format: 'CODE128',
            width: 2,
            height: 50,
            displayValue: false,
            margin: 5,
          });
        }
      } else {
        const canvas = printContainerRef.current?.querySelector<HTMLCanvasElement>('.print-qr-canvas');
        if (canvas) {
          QRCode.toCanvas(canvas, displayValue, {
            width: 150,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          }).catch((err) => {
            console.error('Failed to generate QR code:', err);
          });
        }
      }

      // Trigger print after generation
      setTimeout(() => {
        window.print();
      }, 200);
    }, 100);
  };

  const displayValue = label.barcodeType === 'QR Code' && label.hcfUniqueId 
    ? label.hcfUniqueId 
    : label.barcodeValue;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content barcode-label-preview-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Barcode Label Preview</h2>
            <button className="modal-close-btn" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="modal-body barcode-label-preview-body">
            {/* Label Preview */}
            <div className="barcode-label-preview-container">
              {/* Top: HCF Name */}
              <div className="barcode-label-preview-top">
                <div className="barcode-label-preview-hcf-name">{label.hcfName || '-'}</div>
              </div>

              {/* Main Content: Left (QR/Barcode) and Right (Color Block + Info) */}
              <div className="barcode-label-preview-main">
                {/* Left: QR Code / Barcode */}
                <div className="barcode-label-preview-left">
                  <div className="barcode-label-preview-code-container">
                    {label.barcodeType === 'QR Code' ? (
                      <canvas ref={previewQrRef} className="barcode-label-preview-qr"></canvas>
                    ) : (
                      <svg ref={previewBarcodeRef} className="barcode-label-preview-barcode"></svg>
                    )}
                  </div>
                </div>

                {/* Right: Waste Color Block + Barcode Number + HCF Unique ID */}
                <div className="barcode-label-preview-right">
                  {/* Waste Color Block */}
                  <div 
                    className={`barcode-label-preview-color-block barcode-label-preview-color-block--${label.colorBlock.toLowerCase()}`}
                    style={{
                      backgroundColor: label.colorBlock === 'Yellow' ? '#FFFF00' : 
                                      label.colorBlock === 'Red' ? '#FF0000' :
                                      label.colorBlock === 'Blue' ? '#0000FF' : '#FFFFFF',
                      border: label.colorBlock === 'White' ? '2px solid #000000' : 'none'
                    }}
                  >
                    {label.colorBlock.toUpperCase()}
                  </div>

                  {/* Barcode Number */}
                  <div className="barcode-label-preview-barcode-number">{label.barcodeValue}</div>

                  {/* HCF Unique ID */}
                  {label.hcfUniqueId && (
                    <div className="barcode-label-preview-hcf-unique-id">{label.hcfUniqueId}</div>
                  )}
                </div>
              </div>

              {/* Bottom: Hospital Name */}
              <div className="barcode-label-preview-bottom">
                <div className="barcode-label-preview-hospital-name">{label.hcfName || '-'}</div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn--primary" onClick={handlePrint}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print Label
            </button>
          </div>
        </div>
      </div>

      {/* Hidden print container */}
      <div className="print-container" ref={printContainerRef}>
        <div className="print-label-single">
          {/* Top: HCF Name */}
          <div className="print-label-top">
            <div className="print-label-hcf-name">{label.hcfName || '-'}</div>
          </div>

          {/* Main Content */}
          <div className="print-label-main">
            {/* Left: QR Code / Barcode */}
            <div className="print-label-left">
              <div className="print-label-code-container">
                {label.barcodeType === 'QR Code' ? (
                  <canvas className="print-qr-canvas" width="150" height="150"></canvas>
                ) : (
                  <svg className="print-barcode-svg"></svg>
                )}
              </div>
            </div>

            {/* Right: Waste Color Block + Barcode Number + HCF Unique ID */}
            <div className="print-label-right">
              {/* Waste Color Block */}
              <div 
                className={`print-label-color-block print-label-color-block--${label.colorBlock.toLowerCase()}`}
                style={{
                  backgroundColor: label.colorBlock === 'Yellow' ? '#FFFF00' : 
                                  label.colorBlock === 'Red' ? '#FF0000' :
                                  label.colorBlock === 'Blue' ? '#0000FF' : '#FFFFFF',
                  border: label.colorBlock === 'White' ? '2px solid #000000' : 'none'
                }}
              >
                {label.colorBlock.toUpperCase()}
              </div>

              {/* Barcode Number */}
              <div className="print-label-barcode-number">{label.barcodeValue}</div>

              {/* HCF Unique ID */}
              {label.hcfUniqueId && (
                <div className="print-label-hcf-unique-id">{label.hcfUniqueId}</div>
              )}
            </div>
          </div>

          {/* Bottom: Hospital Name */}
          <div className="print-label-bottom">
            <div className="print-label-hospital-name">{label.hcfName || '-'}</div>
          </div>
        </div>
      </div>
    </>
  );
};

// Modify Modal Component
interface ModifyBarcodeModalProps {
  label: BarcodeLabelWithDetails;
  onClose: () => void;
  onSave: (data: UpdateBarcodeLabelRequest) => void;
}

const ModifyBarcodeModal = ({ label, onClose, onSave }: ModifyBarcodeModalProps) => {
  const [status, setStatus] = useState<'Active' | 'Inactive'>(label.status === 'Active' ? 'Active' : 'Inactive');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ status });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Barcode Label Status</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Barcode Number</label>
            <input 
              type="text" 
              value={label.barcodeType === 'QR Code' && label.hcfUniqueId 
                ? label.hcfUniqueId 
                : label.barcodeValue} 
              disabled 
              className="form-input" 
            />
          </div>
          <div className="form-field">
            <label>HCF Code</label>
            <input 
              type="text" 
              value={label.hcfCode} 
              disabled 
              className="form-input" 
            />
          </div>
          <div className="form-field">
            <label>HCF Name</label>
            <input 
              type="text" 
              value={label.hcfName || '-'} 
              disabled 
              className="form-input" 
            />
          </div>
          <div className="form-field">
            <label>Status <span className="required">*</span></label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
              className="form-select"
              required
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Filters Modal Component
interface BarcodeFiltersModalProps {
  filters: BarcodeListParams;
  setFilters: React.Dispatch<React.SetStateAction<BarcodeListParams>>;
  onClose: () => void;
  onApply: () => void;
}

const BarcodeFiltersModal = ({ filters, setFilters, onClose, onApply }: BarcodeFiltersModalProps) => {
  return (
    <div className="modal-overlay bg-filter-modal-overlay" onClick={onClose}>
      <div className="modal-content bg-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bg-filter-modal-header">
          <div className="bg-filter-modal-titlewrap">
            <div className="bg-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </div>
            <div>
              <h2 className="bg-filter-modal-title">Filters</h2>
              <p className="bg-filter-modal-subtitle">Filter barcode labels</p>
            </div>
          </div>
          <button className="bg-filter-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="bg-filter-modal-body">
          <div className="bg-filter-form-group">
            <label htmlFor="filter-color">Waste Color</label>
            <select
              id="filter-color"
              value={filters.colorBlock || ''}
              onChange={(e) => setFilters({ ...filters, colorBlock: e.target.value || undefined })}
              className="bg-filter-select"
            >
              <option value="">All Colors</option>
              <option value="Yellow">Yellow</option>
              <option value="Red">Red</option>
              <option value="White">White</option>
              <option value="Blue">Blue</option>
            </select>
          </div>

          <div className="bg-filter-form-group">
            <label htmlFor="filter-type">Label Type</label>
            <select
              id="filter-type"
              value={filters.barcodeType || ''}
              onChange={(e) => setFilters({ ...filters, barcodeType: e.target.value || undefined })}
              className="bg-filter-select"
            >
              <option value="">All Types</option>
              <option value="Barcode">Barcode</option>
              <option value="QR Code">QR Code</option>
            </select>
          </div>

          <div className="bg-filter-form-group">
            <label htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="bg-filter-select"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Deleted">Deleted</option>
            </select>
          </div>

          <div className="bg-filter-form-group">
            <label htmlFor="filter-start-date">Start Date</label>
            <input
              id="filter-start-date"
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
              className="bg-filter-select"
            />
          </div>

          <div className="bg-filter-form-group">
            <label htmlFor="filter-end-date">End Date</label>
            <input
              id="filter-end-date"
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
              className="bg-filter-select"
            />
          </div>

          <div className="bg-filter-form-group">
            <label>
              <input
                type="checkbox"
                checked={filters.includeDeleted || false}
                onChange={(e) => setFilters({ ...filters, includeDeleted: e.target.checked })}
              />
              Show Deleted Records
            </label>
          </div>
        </div>

        <div className="bg-filter-modal-footer">
          <button type="button" className="bg-link-btn" onClick={() => {
            setFilters({
              page: 1,
              limit: 25,
              search: '',
              colorBlock: '',
              barcodeType: '',
              status: '',
              startDate: '',
              endDate: '',
              includeDeleted: false,
            });
          }}>
            Clear Filters
          </button>
          <button type="button" className="bg-filter-btn-primary" onClick={onApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeListPage;

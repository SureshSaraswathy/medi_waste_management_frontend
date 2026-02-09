import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { hcfService, HcfResponse } from '../../services/hcfService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { barcodeLabelService, BarcodeLabelResponse } from '../../services/barcodeLabelService';
// @ts-ignore - jsbarcode doesn't have TypeScript definitions
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import './barcodeGenerationPage.css';
import '../desktop/dashboardPage.css';

interface BarcodeLabel {
  id: string;
  hcfCode: string;
  hcfName: string;
  companyId: string;
  companyName: string;
  sequenceNumber: number;
  barcodeType: 'Barcode' | 'QR Code';
  colorBlock: 'Yellow' | 'Red' | 'White';
  barcodeValue: string;
  createdAt: string;
}

type ColorBlock = 'Yellow' | 'Red' | 'White';
type BarcodeType = 'Barcode' | 'QR Code';

const BarcodeGenerationPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [previewLabels, setPreviewLabels] = useState<BarcodeLabel[]>([]);
  const printContainerRef = useRef<HTMLDivElement>(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    companyId: '',
    hcfId: '',
    barcodeType: '',
    colorBlock: '',
  });
  
  // Master data
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [hcfs, setHcfs] = useState<HcfResponse[]>([]);
  const [filteredHcfs, setFilteredHcfs] = useState<HcfResponse[]>([]);
  const [labels, setLabels] = useState<BarcodeLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Form state
  const [formData, setFormData] = useState({
    companyId: '',
    hcfId: '',
    hcfCode: '',
    prefix: 'HCF',
    startSequence: 1,
    endSequence: 10,
    barcodeType: 'Barcode' as BarcodeType,
    colorBlock: 'White' as ColorBlock,
    count: 1,
  });

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const data = await companyService.getAllCompanies(undefined, true);
      setCompanies(data);
    } catch (err: any) {
      console.error('Failed to load companies:', err);
      setError('Failed to load companies');
    }
  }, []);

  // Load HCFs
  const loadHcfs = useCallback(async () => {
    try {
      const data = await hcfService.getAllHcfs(undefined, true);
      setHcfs(data);
    } catch (err: any) {
      console.error('Failed to load HCFs:', err);
      setError('Failed to load HCFs');
    }
  }, []);

  // Filter HCFs by company
  useEffect(() => {
    if (formData.companyId) {
      const filtered = hcfs.filter(hcf => hcf.companyId === formData.companyId);
      setFilteredHcfs(filtered);
      if (formData.hcfId && !filtered.find(h => h.id === formData.hcfId)) {
        setFormData(prev => ({ ...prev, hcfId: '' }));
      }
    } else {
      setFilteredHcfs([]);
      setFormData(prev => ({ ...prev, hcfId: '' }));
    }
  }, [formData.companyId, hcfs]);

  // Load labels from backend API
  const loadLabels = useCallback(async () => {
    try {
      setLoading(true);
      const apiLabels = await barcodeLabelService.getAllBarcodeLabels();
      
      // Map backend response to frontend format with names
      const mappedLabels: BarcodeLabel[] = await Promise.all(
        apiLabels.map(async (apiLabel: BarcodeLabelResponse) => {
          const company = companies.find(c => c.id === apiLabel.companyId);
          let hcfName = '';
          try {
            const hcf = await hcfService.getHcfById(apiLabel.hcfId);
            hcfName = hcf.hcfName;
          } catch (err) {
            console.error('Error loading HCF:', err);
          }

          return {
            id: apiLabel.id,
            hcfCode: apiLabel.hcfCode,
            hcfName,
            companyId: apiLabel.companyId,
            companyName: company?.companyName || 'Unknown',
            sequenceNumber: apiLabel.sequenceNumber,
            barcodeType: apiLabel.barcodeType,
            colorBlock: apiLabel.colorBlock,
            barcodeValue: apiLabel.barcodeValue,
            createdAt: apiLabel.createdOn,
          };
        })
      );
      setLabels(mappedLabels);
    } catch (err) {
      console.error('Failed to load labels:', err);
      setError('Failed to load labels');
    } finally {
      setLoading(false);
    }
  }, [companies]);

  // Load data on mount
  useEffect(() => {
    loadCompanies();
    loadHcfs();
  }, [loadCompanies, loadHcfs]);

  // Load labels when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadLabels();
    }
  }, [companies, loadLabels]);

  // Get last sequence number from backend API
  const getLastSequence = useCallback(async (hcfCode: string, barcodeType: BarcodeType): Promise<number> => {
    try {
      return await barcodeLabelService.getLastSequence(hcfCode, barcodeType);
    } catch (err) {
      console.error('Failed to get last sequence:', err);
      return 0;
    }
  }, []);

  // Generate barcode value - Format: HCFCode + Sequence (padded to 15 digits total)
  const generateBarcodeValue = (hcfCode: string, sequence: number): string => {
    const sequenceStr = sequence.toString().padStart(15 - hcfCode.length, '0');
    return `${hcfCode}${sequenceStr}`;
  };

  // Generate labels using backend API
  const handleGenerate = async () => {
    // Calculate count from start and end sequence
    const count = formData.endSequence - formData.startSequence + 1;
    
    if (!formData.companyId || !formData.hcfId || count < 1) {
      setError('Please select company, HCF, and enter valid sequence range');
      return;
    }

    const selectedHcf = filteredHcfs.find(h => h.id === formData.hcfId);
    const selectedCompany = companies.find(c => c.id === formData.companyId);

    if (!selectedHcf || !selectedCompany) {
      setError('Invalid selection');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call backend API to generate labels (backend expects count, not sequence range)
      const apiLabels = await barcodeLabelService.generateLabels({
        hcfId: formData.hcfId,
        companyId: formData.companyId,
        barcodeType: formData.barcodeType,
        colorBlock: formData.colorBlock,
        count: count, // Calculate count from start/end sequence
      });

      // Map backend response to frontend format
      const newLabels: BarcodeLabel[] = apiLabels.map((apiLabel: BarcodeLabelResponse) => ({
        id: apiLabel.id,
        hcfCode: apiLabel.hcfCode,
        hcfName: selectedHcf.hcfName,
        companyId: apiLabel.companyId,
        companyName: selectedCompany.companyName,
        sequenceNumber: apiLabel.sequenceNumber,
        barcodeType: apiLabel.barcodeType,
        colorBlock: apiLabel.colorBlock,
        barcodeValue: apiLabel.barcodeValue,
        createdAt: apiLabel.createdOn,
      }));

      // Update labels list
      await loadLabels();

      // Show preview
      setPreviewLabels(newLabels);
      setShowPreviewModal(true);
      setShowGenerateModal(false);

      // Reset form
      setFormData(prev => ({
        ...prev,
        companyId: '',
        hcfId: '',
        hcfCode: '',
        prefix: 'HCF',
        startSequence: 1,
        endSequence: 10,
        barcodeType: 'Barcode',
        colorBlock: 'White',
        count: 1,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate labels';
      setError(errorMessage);
      console.error('Error generating labels:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate barcode/QR code images when preview modal opens
  useEffect(() => {
    if (showPreviewModal && printContainerRef.current && previewLabels.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const container = printContainerRef.current;
        if (!container) return;

        const svgElements = container.querySelectorAll<SVGElement>('.barcode-svg');
        const canvasElements = container.querySelectorAll<HTMLCanvasElement>('.qr-canvas');

        // Generate barcodes
        svgElements.forEach((svg, index) => {
          const label = previewLabels[index];
          if (label && label.barcodeType === 'Barcode') {
            try {
              // Clear previous content
              svg.innerHTML = '';
              JsBarcode(svg, label.barcodeValue, {
                format: 'CODE128',
                width: 2,
                height: 50,
                displayValue: false,
                margin: 5,
              });
            } catch (err) {
              console.error('Failed to generate barcode:', err);
            }
          }
        });

        // Generate QR codes
        canvasElements.forEach((canvas, index) => {
          const label = previewLabels[index];
          if (label && label.barcodeType === 'QR Code') {
            QRCode.toCanvas(canvas, label.barcodeValue, {
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
        });
      }, 100);
    }
  }, [previewLabels, showPreviewModal]);

  // Print labels using window.print
  const handlePrint = () => {
    if (!printContainerRef.current || previewLabels.length === 0) return;
    
    // Regenerate barcodes/QR codes before printing
    setTimeout(() => {
      const container = printContainerRef.current;
      if (!container) return;

      const svgElements = container.querySelectorAll<SVGElement>('.barcode-svg');
      const canvasElements = container.querySelectorAll<HTMLCanvasElement>('.qr-canvas');

      // Generate barcodes
      svgElements.forEach((svg, index) => {
        const label = previewLabels[index];
        if (label && label.barcodeType === 'Barcode') {
          try {
            svg.innerHTML = '';
            JsBarcode(svg, label.barcodeValue, {
              format: 'CODE128',
              width: 2,
              height: 50,
              displayValue: false,
              margin: 5,
            });
          } catch (err) {
            console.error('Failed to generate barcode:', err);
          }
        }
      });

      // Generate QR codes
      canvasElements.forEach((canvas, index) => {
        const label = previewLabels[index];
        if (label && label.barcodeType === 'QR Code') {
          QRCode.toCanvas(canvas, label.barcodeValue, {
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
      });

      // Trigger print after generation
      setTimeout(() => {
        window.print();
      }, 200);
    }, 100);
  };


  // Filter labels - client-side filtering
  const filteredLabels = labels.filter(label => {
    // Search filter
    const matchesSearch = 
      label.hcfCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      label.hcfName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      label.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      label.barcodeValue.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Advanced filters
    const matchesCompany = !filters.companyId || label.companyId === filters.companyId;
    const matchesHcf = !filters.hcfId || label.hcfCode === filters.hcfId;
    const matchesType = !filters.barcodeType || label.barcodeType === filters.barcodeType;
    const matchesColor = !filters.colorBlock || label.colorBlock === filters.colorBlock;
    
    return matchesSearch && matchesCompany && matchesHcf && matchesType && matchesColor;
  });

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  return (
    <div className="dashboard-page">
      <aside className={`dashboard-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          {!isSidebarCollapsed && <span className="brand-name">MEDI-WASTE</span>}
        </div>

        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isSidebarCollapsed ? (
              <polyline points="9 18 15 12 9 6"></polyline>
            ) : (
              <polyline points="15 18 9 12 15 6"></polyline>
            )}
          </svg>
        </button>

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
          <button className="sidebar-notification-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="notification-badge">3</span>
          </button>
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
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Transaction / Barcode Generation</span>
          </div>
        </header>

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
              <h1 className="barcode-generation-title">Barcode & QR Code Label Generation</h1>
              <p className="barcode-generation-subtitle">Generate and print labels with sequence numbers</p>
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
                placeholder="Search by HCF Code, Name, Company, or Barcode..."
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
              <button className="generate-btn" onClick={() => setShowGenerateModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Generate Labels
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

          <div className="barcode-table-container">
            <table className="barcode-table">
              <thead>
                <tr>
                  <th>SEQUENCE</th>
                  <th>HCF CODE</th>
                  <th>HCF NAME</th>
                  <th>COMPANY</th>
                  <th>TYPE</th>
                  <th>COLOR BLOCK</th>
                  <th>BARCODE VALUE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLabels.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-message">
                      No labels found. Click "Generate Labels" to create barcode/QR labels.
                    </td>
                  </tr>
                ) : (
                  filteredLabels.map((label) => (
                    <tr key={label.id}>
                      <td className="sequence-cell">{label.sequenceNumber.toString().padStart(6, '0')}</td>
                      <td className="hcf-code-cell">{label.hcfCode}</td>
                      <td>{label.hcfName}</td>
                      <td>{label.companyName}</td>
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
                      <td>
                        <div className="color-block-swatch-wrapper">
                          <div 
                            className={`color-block-swatch color-block-swatch--${label.colorBlock.toLowerCase()}`}
                            style={{
                              backgroundColor: label.colorBlock === 'Yellow' ? '#FFFF00' : 
                                              label.colorBlock === 'Red' ? '#FF0000' : '#FFFFFF',
                              border: label.colorBlock === 'White' ? '1px solid #e2e8f0' : 'none'
                            }}
                          ></div>
                          <span className="color-block-hex">
                            {label.colorBlock === 'Yellow' ? '#FFFF00' : 
                             label.colorBlock === 'Red' ? '#FF0000' : '#FFFFFF'}
                          </span>
                        </div>
                      </td>
                      <td className="barcode-value-cell">{label.barcodeValue}</td>
                      <td>
                        <div className="barcode-table-action-buttons">
                          <button
                            className="barcode-action-btn barcode-action-btn--view"
                            onClick={() => {
                              setPreviewLabels([label]);
                              setShowPreviewModal(true);
                            }}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="barcode-action-btn barcode-action-btn--download"
                            onClick={() => {
                              setPreviewLabels([label]);
                              setShowPreviewModal(true);
                              setTimeout(() => handlePrint(), 200);
                            }}
                            title="Download"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                          </button>
                          <button
                            className="barcode-action-btn barcode-action-btn--delete"
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this label?')) {
                                try {
                                  await barcodeLabelService.deleteBarcodeLabel(label.id);
                                  await loadLabels();
                                } catch (err) {
                                  setError('Failed to delete label');
                                }
                              }
                            }}
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
          <div className="barcode-pagination-info">
            Showing {filteredLabels.length} of {labels.length} Labels
          </div>
        </div>
      </main>

      {/* Generate Modal */}
      {showGenerateModal && (
        <GenerateLabelModal
          companies={companies}
          hcfs={filteredHcfs}
          formData={formData}
          setFormData={setFormData}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerate}
        />
      )}

      {/* Filters Modal */}
      {showFiltersModal && (
        <FiltersModal
          companies={companies}
          hcfs={hcfs}
          filters={filters}
          setFilters={setFilters}
          onClose={() => setShowFiltersModal(false)}
          onClear={() => setFilters({ companyId: '', hcfId: '', barcodeType: '', colorBlock: '' })}
        />
      )}

      {/* Preview & Print Modal */}
      {showPreviewModal && previewLabels.length > 0 && (
        <PreviewLabelModal
          labels={previewLabels}
          printContainerRef={printContainerRef}
          onClose={() => setShowPreviewModal(false)}
          onPrint={handlePrint}
        />
      )}

      {/* Hidden print container */}
      <div className="print-container" ref={printContainerRef}>
        {previewLabels.map((label) => (
          <div key={label.id} className="print-label">
            <div className="print-label-header">
              <div className={`print-color-block-square print-color-block-square--${label.colorBlock.toLowerCase()}`}>
                {label.colorBlock.toUpperCase()}
              </div>
              <div className="print-sequence-text">Seq. No. {label.sequenceNumber.toString().padStart(15, '0')}</div>
            </div>
            <div className="print-barcode-container">
              {label.barcodeType === 'QR Code' ? (
                <canvas className="qr-canvas" width="150" height="150"></canvas>
              ) : (
                <svg className="barcode-svg"></svg>
              )}
              <div className="print-barcode-value">{label.barcodeValue}</div>
            </div>
            <div className="print-label-footer">
              <div className="print-type-label">{label.barcodeType === 'QR Code' ? 'QR Code' : 'Bar Code'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Generate Label Modal
interface GenerateLabelModalProps {
  companies: CompanyResponse[];
  hcfs: HcfResponse[];
  formData: {
    companyId: string;
    hcfId: string;
    hcfCode: string;
    prefix: string;
    startSequence: number;
    endSequence: number;
    barcodeType: BarcodeType;
    colorBlock: ColorBlock;
    count: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    companyId: string;
    hcfId: string;
    hcfCode: string;
    prefix: string;
    startSequence: number;
    endSequence: number;
    barcodeType: BarcodeType;
    colorBlock: ColorBlock;
    count: number;
  }>>;
  onClose: () => void;
  onGenerate: () => void;
}

const GenerateLabelModal = ({ companies, hcfs, formData, setFormData, onClose, onGenerate }: GenerateLabelModalProps) => {
  const selectedHcf = hcfs.find(h => h.id === formData.hcfId);
  const filteredHcfs = formData.companyId 
    ? hcfs.filter(hcf => hcf.companyId === formData.companyId)
    : hcfs;
  
  // Calculate label count from sequence range
  const labelCount = formData.endSequence >= formData.startSequence 
    ? formData.endSequence - formData.startSequence + 1 
    : 0;
  
  // Generate preview barcode value
  const previewBarcodeValue = formData.hcfCode && formData.startSequence 
    ? `${formData.prefix}-${formData.hcfCode}-${formData.startSequence.toString().padStart(6, '0')}`
    : '';

  // Handle HCF code input - find matching HCF
  const handleHcfCodeChange = (code: string) => {
    setFormData({ ...formData, hcfCode: code });
    const matchingHcf = filteredHcfs.find(h => h.hcfCode.toUpperCase() === code.toUpperCase());
    if (matchingHcf) {
      setFormData(prev => ({ ...prev, hcfCode: code, hcfId: matchingHcf.id }));
    } else {
      setFormData(prev => ({ ...prev, hcfCode: code, hcfId: '' }));
    }
  };

  // Handle HCF name selection
  const handleHcfNameChange = (hcfId: string) => {
    const selectedHcf = hcfs.find(h => h.id === hcfId);
    if (selectedHcf) {
      setFormData({ ...formData, hcfId, hcfCode: selectedHcf.hcfCode });
    }
  };

  return (
    <div className="modal-overlay bg-generate-modal-overlay" onClick={onClose}>
      <div className="modal-content bg-generate-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header - match template */}
        <div className="bg-generate-modal-header">
          <div className="bg-generate-modal-titlewrap">
            <div className="bg-generate-icon" aria-hidden="true">
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
            </div>
            <div>
              <h2 className="bg-generate-modal-title">Generate Labels</h2>
              <p className="bg-generate-modal-subtitle">Create barcode or QR code labels</p>
            </div>
          </div>
          <button className="bg-generate-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="bg-generate-form" onSubmit={(e) => { e.preventDefault(); onGenerate(); }}>
          {/* LABEL TYPE Section */}
          <div className="bg-generate-form-section">
            <label className="bg-generate-form-label">
              LABEL TYPE <span className="bg-required">*</span>
            </label>
            <div className="bg-label-type-options">
              <button
                type="button"
                className={`bg-label-type-btn ${formData.barcodeType === 'Barcode' ? 'bg-label-type-btn--active' : ''}`}
                onClick={() => setFormData({ ...formData, barcodeType: 'Barcode' })}
              >
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
                Barcode
              </button>
              <button
                type="button"
                className={`bg-label-type-btn ${formData.barcodeType === 'QR Code' ? 'bg-label-type-btn--active' : ''}`}
                onClick={() => setFormData({ ...formData, barcodeType: 'QR Code' })}
              >
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
                QR Code
              </button>
            </div>
          </div>

          {/* COMPANY and PREFIX Section */}
          <div className="bg-generate-form-section">
            <div className="bg-generate-form-grid">
              <div className="bg-generate-form-group">
                <label className="bg-generate-form-label">
                  COMPANY <span className="bg-required">*</span>
                </label>
                <select
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value, hcfId: '', hcfCode: '' })}
                  required
                  className="bg-generate-select"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-generate-form-group">
                <label className="bg-generate-form-label">
                  PREFIX <span className="bg-required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                  required
                  className="bg-generate-input"
                />
              </div>
            </div>
          </div>

          {/* SEQUENCE Section */}
          <div className="bg-generate-form-section">
            <div className="bg-generate-form-grid">
              <div className="bg-generate-form-group">
                <label className="bg-generate-form-label">
                  START SEQUENCE <span className="bg-required">*</span>
                </label>
                <input
                  type="number"
                  value={formData.startSequence}
                  onChange={(e) => setFormData({ ...formData, startSequence: parseInt(e.target.value) || 1 })}
                  required
                  min={1}
                  className="bg-generate-input"
                />
              </div>
              <div className="bg-generate-form-group">
                <label className="bg-generate-form-label">
                  END SEQUENCE <span className="bg-required">*</span>
                </label>
                <input
                  type="number"
                  value={formData.endSequence}
                  onChange={(e) => setFormData({ ...formData, endSequence: parseInt(e.target.value) || 1 })}
                  required
                  min={formData.startSequence}
                  className="bg-generate-input"
                />
              </div>
            </div>
          </div>

          {/* HCF CODE and NAME Section */}
          <div className="bg-generate-form-section">
            <div className="bg-generate-form-grid">
              <div className="bg-generate-form-group">
                <label className="bg-generate-form-label">
                  HCF CODE <span className="bg-required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.hcfCode}
                  onChange={(e) => handleHcfCodeChange(e.target.value)}
                  required
                  placeholder="e.g., MH01"
                  className="bg-generate-input"
                />
              </div>
              <div className="bg-generate-form-group">
                <label className="bg-generate-form-label">
                  HCF NAME <span className="bg-required">*</span>
                </label>
                <select
                  value={formData.hcfId}
                  onChange={(e) => handleHcfNameChange(e.target.value)}
                  required
                  disabled={!formData.companyId}
                  className="bg-generate-select"
                >
                  <option value="">Select HCF</option>
                  {filteredHcfs.map((hcf) => (
                    <option key={hcf.id} value={hcf.id}>
                      {hcf.hcfName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* COLOR BLOCK Section */}
          <div className="bg-generate-form-section">
            <label className="bg-generate-form-label">
              COLOR BLOCK <span className="bg-required">*</span>
            </label>
            <div className="bg-color-block-options">
              <button
                type="button"
                className={`bg-color-block-btn ${formData.colorBlock === 'White' ? 'bg-color-block-btn--active' : ''}`}
                onClick={() => setFormData({ ...formData, colorBlock: 'White' })}
              >
                <div className="bg-color-block-swatch" style={{ backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0' }}></div>
                <span>WHITE</span>
                <span className="bg-color-block-hex">#FFFFFF</span>
              </button>
              <button
                type="button"
                className={`bg-color-block-btn ${formData.colorBlock === 'Red' ? 'bg-color-block-btn--active' : ''}`}
                onClick={() => setFormData({ ...formData, colorBlock: 'Red' })}
              >
                <div className="bg-color-block-swatch" style={{ backgroundColor: '#FF0000' }}></div>
                <span>RED</span>
                <span className="bg-color-block-hex">#FF0000</span>
              </button>
              <button
                type="button"
                className={`bg-color-block-btn ${formData.colorBlock === 'Yellow' ? 'bg-color-block-btn--active' : ''}`}
                onClick={() => setFormData({ ...formData, colorBlock: 'Yellow' })}
              >
                <div className="bg-color-block-swatch" style={{ backgroundColor: '#FFFF00' }}></div>
                <span>YELLOW</span>
                <span className="bg-color-block-hex">#FFFF00</span>
              </button>
            </div>
          </div>

          {/* PREVIEW Section */}
          <div className="bg-generate-form-section">
            <label className="bg-generate-form-label">PREVIEW</label>
            <div className="bg-preview-box">
              <div className="bg-preview-content">
                <div 
                  className="bg-preview-color-swatch" 
                  style={{ 
                    backgroundColor: formData.colorBlock === 'Yellow' ? '#FFFF00' : 
                                    formData.colorBlock === 'Red' ? '#FF0000' : '#FFFFFF',
                    border: formData.colorBlock === 'White' ? '1px solid #e2e8f0' : 'none'
                  }}
                ></div>
                <div className="bg-preview-barcode-value">
                  {previewBarcodeValue || `${formData.prefix}-CODE-000001`}
                </div>
              </div>
              <div className="bg-preview-count">
                {labelCount > 0 ? `${labelCount} label(s) will be generated` : 'Enter sequence range'}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-generate-modal-footer">
            <button type="button" className="bg-generate-btn bg-generate-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="bg-generate-btn bg-generate-btn--primary">
              Generate Labels
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Preview Label Modal
interface PreviewLabelModalProps {
  labels: BarcodeLabel[];
  printContainerRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onPrint: () => void;
}

const PreviewLabelModal = ({ labels, printContainerRef, onClose, onPrint }: PreviewLabelModalProps) => {
  const previewBarcodeRef = useRef<SVGSVGElement>(null);
  const previewQrRef = useRef<HTMLCanvasElement>(null);
  const firstLabel = labels[0];

  // Generate barcode/QR code for preview
  useEffect(() => {
    if (!firstLabel) return;

    if (firstLabel.barcodeType === 'Barcode' && previewBarcodeRef.current) {
      try {
        previewBarcodeRef.current.innerHTML = '';
        JsBarcode(previewBarcodeRef.current, firstLabel.barcodeValue, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: false,
          margin: 5,
        });
      } catch (err) {
        console.error('Failed to generate preview barcode:', err);
      }
    } else if (firstLabel.barcodeType === 'QR Code' && previewQrRef.current) {
      QRCode.toCanvas(previewQrRef.current, firstLabel.barcodeValue, {
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
  }, [firstLabel]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--preview" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Preview Label ({labels.length})</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="preview-content">
          <div className="preview-info">
            <p><strong>HCF:</strong> {firstLabel?.hcfCode} - {firstLabel?.hcfName}</p>
            <p><strong>Company:</strong> <span className="preview-company-link">{firstLabel?.companyName}</span></p>
            <p><strong>Type:</strong> {firstLabel?.barcodeType}</p>
            <p><strong>Color Block:</strong> {firstLabel?.colorBlock}</p>
            <p><strong>Sequence Range:</strong> {firstLabel?.sequenceNumber} - {labels[labels.length - 1]?.sequenceNumber}</p>
          </div>
          
          {firstLabel && (
            <div className="preview-label-single">
              <div className="preview-label-single-header">
                <div className="preview-label-seq-label">Seq. No:</div>
                <div className="preview-label-seq-number">{firstLabel.sequenceNumber.toString().padStart(15, '0')}</div>
              </div>
              <div className="preview-label-single-body">
                <div className="preview-label-single-color-text">{firstLabel.colorBlock.toUpperCase()}</div>
                <div className="preview-label-single-barcode-container">
                  {firstLabel.barcodeType === 'Barcode' ? (
                    <svg ref={previewBarcodeRef} className="preview-barcode-svg"></svg>
                  ) : (
                    <canvas ref={previewQrRef} className="preview-qr-canvas"></canvas>
                  )}
                </div>
                <div className="preview-label-single-barcode-value">{firstLabel.barcodeValue}</div>
                <div className="preview-label-single-type-badge">{firstLabel.barcodeType}</div>
              </div>
              <div className="preview-label-single-footer">
                <div className="preview-label-single-footer-text">BAR CODE</div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Close
          </button>
          <button 
            type="button" 
            className="btn btn--print-label" 
            onClick={onPrint}
          >
            Print Label
          </button>
        </div>
      </div>
    </div>
  );
};

// Filters Modal Component
interface FiltersModalProps {
  companies: CompanyResponse[];
  hcfs: HcfResponse[];
  filters: {
    companyId: string;
    hcfId: string;
    barcodeType: string;
    colorBlock: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    companyId: string;
    hcfId: string;
    barcodeType: string;
    colorBlock: string;
  }>>;
  onClose: () => void;
  onClear: () => void;
}

const FiltersModal = ({ companies, hcfs, filters, setFilters, onClose, onClear }: FiltersModalProps) => {
  // Filter HCFs by company if company is selected, otherwise show all
  const filteredHcfs = filters.companyId 
    ? hcfs.filter(hcf => hcf.companyId === filters.companyId)
    : hcfs;

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
              <h2 className="bg-filter-modal-title">Advanced Filters</h2>
              <p className="bg-filter-modal-subtitle">Refine results by multiple criteria</p>
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
            <label htmlFor="filter-hcf">HCF CODE</label>
            <select
              id="filter-hcf"
              value={filters.hcfId}
              onChange={(e) => setFilters({ ...filters, hcfId: e.target.value })}
              className="bg-filter-select"
            >
              <option value="">All Codes</option>
              {filteredHcfs.map((hcf) => (
                <option key={hcf.id} value={hcf.hcfCode}>
                  {hcf.hcfCode}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-filter-form-group">
            <label htmlFor="filter-company">COMPANY</label>
            <select
              id="filter-company"
              value={filters.companyId}
              onChange={(e) => {
                const newCompanyId = e.target.value;
                setFilters({ 
                  ...filters, 
                  companyId: newCompanyId,
                  // Clear HCF filter if company changes, but keep it if company is cleared
                  hcfId: newCompanyId ? '' : filters.hcfId
                });
              }}
              className="bg-filter-select"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-filter-form-group">
            <label htmlFor="filter-type">LABEL TYPE</label>
            <select
              id="filter-type"
              value={filters.barcodeType}
              onChange={(e) => setFilters({ ...filters, barcodeType: e.target.value })}
              className="bg-filter-select"
            >
              <option value="">All Types</option>
              <option value="Barcode">Barcode</option>
              <option value="QR Code">QR Code</option>
            </select>
          </div>

          <div className="bg-filter-form-group">
            <label htmlFor="filter-color">COLOR BLOCK</label>
            <select
              id="filter-color"
              value={filters.colorBlock}
              onChange={(e) => setFilters({ ...filters, colorBlock: e.target.value })}
              className="bg-filter-select"
            >
              <option value="">All Colors</option>
              <option value="Yellow">Yellow</option>
              <option value="Red">Red</option>
              <option value="White">White</option>
            </select>
          </div>
        </div>

        <div className="bg-filter-modal-footer">
          <button type="button" className="bg-link-btn" onClick={onClear}>
            Clear Filters
          </button>
          <button type="button" className="bg-filter-btn-primary" onClick={onClose}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerationPage;

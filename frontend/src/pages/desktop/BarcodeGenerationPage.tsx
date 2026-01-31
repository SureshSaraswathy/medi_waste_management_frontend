import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLabels, setPreviewLabels] = useState<BarcodeLabel[]>([]);
  const printContainerRef = useRef<HTMLDivElement>(null);
  
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
    if (!formData.companyId || !formData.hcfId || formData.count < 1) {
      setError('Please select company, HCF, and enter valid count');
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

      // Call backend API to generate labels
      const apiLabels = await barcodeLabelService.generateLabels({
        hcfId: formData.hcfId,
        companyId: formData.companyId,
        barcodeType: formData.barcodeType,
        colorBlock: formData.colorBlock,
        count: formData.count,
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
      setFormData({
        companyId: '',
        hcfId: '',
        barcodeType: 'Barcode',
        colorBlock: 'White',
        count: 1,
      });
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


  // Filter labels
  const filteredLabels = labels.filter(label => {
    const matchesSearch = 
      label.hcfCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      label.hcfName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      label.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      label.barcodeValue.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', active: location.pathname === '/dashboard' },
    { path: '/transaction', label: 'Transaction', icon: '💼', active: location.pathname === '/transaction' },
    { path: '/finance', label: 'Finance', icon: '💰', active: location.pathname === '/finance' },
    { path: '/commercial-agreements', label: 'Commercial Agreements', icon: '📝', active: location.pathname === '/commercial-agreements' },
    { path: '/compliance-training', label: 'Compliance & Training', icon: '✅', active: location.pathname === '/compliance-training' },
    { path: '/master', label: 'Masters', icon: '📋', active: location.pathname.startsWith('/master') },
    { path: '/report/billing-finance', label: 'Reports', icon: '📈', active: location.pathname.startsWith('/report') },
  ];

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
            <h1 className="barcode-generation-title">Barcode & QR Code Label Generation</h1>
            <p className="barcode-generation-subtitle">Generate and print labels with sequence numbers</p>
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
            <button className="generate-btn" onClick={() => setShowGenerateModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Generate Labels
            </button>
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
                  <th>Sequence</th>
                  <th>HCF Code</th>
                  <th>HCF Name</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Color Block</th>
                  <th>Barcode Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLabels.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-message">
                      No labels generated yet. Click "Generate Labels" to create barcode/QR labels.
                    </td>
                  </tr>
                ) : (
                  filteredLabels.map((label) => (
                    <tr key={label.id}>
                      <td className="sequence-cell">{label.sequenceNumber}</td>
                      <td className="hcf-code-cell">{label.hcfCode}</td>
                      <td>{label.hcfName}</td>
                      <td>{label.companyName}</td>
                      <td>
                        <span className={`barcode-type-badge barcode-type-badge--${label.barcodeType.toLowerCase().replace(' ', '-')}`}>
                          {label.barcodeType}
                        </span>
                      </td>
                      <td>
                        <span className={`color-block-badge color-block-badge--${label.colorBlock.toLowerCase()}`}>
                          {label.colorBlock}
                        </span>
                      </td>
                      <td className="barcode-value-cell">{label.barcodeValue}</td>
                      <td>
                        <div className="barcode-action-buttons">
                          <button
                            className="action-btn action-btn--print"
                            onClick={() => {
                              setPreviewLabels([label]);
                              setShowPreviewModal(true);
                            }}
                            title="Preview & Print"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="6 9 6 2 18 2 18 9"></polyline>
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                              <rect x="6" y="14" width="12" height="8"></rect>
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
    barcodeType: BarcodeType;
    colorBlock: ColorBlock;
    count: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    companyId: string;
    hcfId: string;
    barcodeType: BarcodeType;
    colorBlock: ColorBlock;
    count: number;
  }>>;
  onClose: () => void;
  onGenerate: () => void;
}

const GenerateLabelModal = ({ companies, hcfs, formData, setFormData, onClose, onGenerate }: GenerateLabelModalProps) => {
  const selectedHcf = hcfs.find(h => h.id === formData.hcfId);
  const [lastSeqBarcode, setLastSeqBarcode] = useState<number>(0);
  const [lastSeqQR, setLastSeqQR] = useState<number>(0);
  const [loadingSequence, setLoadingSequence] = useState(false);

  // Load last sequence numbers from backend when HCF is selected
  useEffect(() => {
    if (selectedHcf) {
      setLoadingSequence(true);
      Promise.all([
        barcodeLabelService.getLastSequence(selectedHcf.hcfCode, 'Barcode').catch(() => 0),
        barcodeLabelService.getLastSequence(selectedHcf.hcfCode, 'QR Code').catch(() => 0),
      ]).then(([barcodeSeq, qrSeq]) => {
        setLastSeqBarcode(barcodeSeq);
        setLastSeqQR(qrSeq);
        setLoadingSequence(false);
      }).catch(() => {
        setLoadingSequence(false);
      });
    } else {
      setLastSeqBarcode(0);
      setLastSeqQR(0);
    }
  }, [selectedHcf]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Generate Barcode/QR Labels</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="barcode-form" onSubmit={(e) => { e.preventDefault(); onGenerate(); }}>
          <div className="form-section">
            <h3 className="form-section-title">Label Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company *</label>
                <select
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value, hcfId: '' })}
                  required
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyCode} - {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>HCF *</label>
                <select
                  value={formData.hcfId}
                  onChange={(e) => setFormData({ ...formData, hcfId: e.target.value })}
                  required
                  disabled={!formData.companyId}
                >
                  <option value="">Select HCF</option>
                  {hcfs.map((hcf) => (
                    <option key={hcf.id} value={hcf.id}>
                      {hcf.hcfCode} - {hcf.hcfName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Barcode Type *</label>
                <select
                  value={formData.barcodeType}
                  onChange={(e) => setFormData({ ...formData, barcodeType: e.target.value as BarcodeType })}
                  required
                >
                  <option value="Barcode">Barcode (Code128)</option>
                  <option value="QR Code">QR Code</option>
                </select>
              </div>
              <div className="form-group">
                <label>Print Color Block *</label>
                <select
                  value={formData.colorBlock}
                  onChange={(e) => setFormData({ ...formData, colorBlock: e.target.value as ColorBlock })}
                  required
                >
                  <option value="Yellow">Yellow</option>
                  <option value="Red">Red</option>
                  <option value="White">White</option>
                </select>
              </div>
              <div className="form-group">
                <label>Barcode Count *</label>
                <input
                  type="number"
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
                  required
                  min={1}
                  max={1000}
                  placeholder="Enter count (1-1000)"
                />
              </div>
              {selectedHcf && (
                <div className="form-group">
                  <label>Last Sequence</label>
                  <input
                    type="text"
                    value={loadingSequence ? 'Loading...' : `Barcode: ${lastSeqBarcode} | QR: ${lastSeqQR}`}
                    readOnly
                    style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
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
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--preview" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Preview Labels ({labels.length})</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="preview-content">
          <div className="preview-info">
            <p><strong>HCF:</strong> {labels[0]?.hcfCode} - {labels[0]?.hcfName}</p>
            <p><strong>Company:</strong> {labels[0]?.companyName}</p>
            <p><strong>Type:</strong> {labels[0]?.barcodeType}</p>
            <p><strong>Color Block:</strong> {labels[0]?.colorBlock}</p>
            <p><strong>Sequence Range:</strong> {labels[0]?.sequenceNumber} - {labels[labels.length - 1]?.sequenceNumber}</p>
          </div>
          <div className="preview-labels-grid">
            {labels.slice(0, 6).map((label) => (
              <div key={label.id} className="preview-label">
                <div className="preview-label-header">
                  <div className={`preview-color-block-square preview-color-block-square--${label.colorBlock.toLowerCase()}`}>
                    {label.colorBlock.toUpperCase()}
                  </div>
                  <div className="preview-sequence-text">Seq. No. {label.sequenceNumber.toString().padStart(15, '0')}</div>
                </div>
                <div className="preview-barcode-placeholder">
                  {label.barcodeType === 'QR Code' ? 'QR Code' : 'Barcode'}
                </div>
                <div className="preview-barcode-value">{label.barcodeValue}</div>
                <div className="preview-label-footer">
                  <div className="preview-type-label">{label.barcodeType === 'QR Code' ? 'QR Code' : 'Bar Code'}</div>
                </div>
              </div>
            ))}
          </div>
          {labels.length > 6 && (
            <p className="preview-more-info">... and {labels.length - 6} more labels</p>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Close
          </button>
          <button 
            type="button" 
            className="btn btn--primary" 
            onClick={onPrint}
          >
            Print Labels
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerationPage;

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { hcfService, HcfResponse } from '../../services/hcfService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { barcodeLabelService, BarcodeLabelResponse } from '../../services/barcodeLabelService';
import NotificationBell from '../../components/NotificationBell';
// @ts-ignore - jsbarcode doesn't have TypeScript definitions
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import PageHeader from '../../components/layout/PageHeader';
import toast from 'react-hot-toast';
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
  colorBlock: 'Yellow' | 'Red' | 'White' | 'Blue';
  barcodeValue: string;
  hcfUniqueId?: string; // HCFUniqueID for display
  createdAt: string;
  status?: 'Active' | 'Inactive' | 'Collected' | 'Deleted';
}

type ColorBlock = 'Yellow' | 'Red' | 'White' | 'Blue';
type BarcodeType = 'Barcode' | 'QR Code';

const BarcodeGenerationPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [previewLabels, setPreviewLabels] = useState<BarcodeLabel[]>([]);
  const [allGeneratedLabels, setAllGeneratedLabels] = useState<BarcodeLabel[]>([]); // Store all labels for printing
  const [totalLabelCount, setTotalLabelCount] = useState<number>(0);
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
  const [globalSummary, setGlobalSummary] = useState({ total: 0, barcodes: 0, qrCodes: 0, collected: 0, deactivated: 0 });
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
    bagCount: 10,
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

  // Generate HCFUniqueID helper function
  const generateHCFUniqueID = useCallback((hcf: HcfResponse): string => {
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
  }, []);

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
          let hcfUniqueId = '';
          try {
            const hcf = await hcfService.getHcfById(apiLabel.hcfId);
            hcfName = hcf.hcfName;
            // Generate HCFUniqueID for display
            const first5Chars = (hcf.hcfCode || '').substring(0, 5).padEnd(5, '0');
            const last5Chars = (hcf.hcfCode || '').length >= 5 
              ? (hcf.hcfCode || '').substring((hcf.hcfCode || '').length - 5)
              : (hcf.hcfCode || '').padStart(5, '0');
            hcfUniqueId = `${first5Chars}${hcf.pincode || ''}${hcf.stateCode || ''}${hcf.hcfTypeCode || ''}${last5Chars}`;
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
            barcodeValue: apiLabel.barcodeValue, // Backend now generates correct format
            hcfUniqueId, // Add HCFUniqueID for display
            createdAt: apiLabel.createdOn,
            status: apiLabel.status || 'Active',
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

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      const data = await barcodeLabelService.getSummary();
      setGlobalSummary(data);
    } catch (err: any) {
      console.error('Failed to load summary:', err);
    }
  }, []);

  // Load labels when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadLabels();
      loadSummary();
    }
  }, [companies, loadLabels, loadSummary]);

  // Get last sequence number from backend API
  const getLastSequence = useCallback(async (hcfCode: string, barcodeType: BarcodeType): Promise<number> => {
    try {
      return await barcodeLabelService.getLastSequence(hcfCode, barcodeType);
    } catch (err) {
      console.error('Failed to get last sequence:', err);
      return 0;
    }
  }, []);

  // Generate labels using backend API
  const handleGenerate = async () => {
    // Validate bag count
    if (!formData.bagCount || formData.bagCount < 1) {
      setError('Please enter a valid bag count (minimum 1).');
      return;
    }
    
    // Calculate count from bag count (end sequence is auto-calculated)
    const count = formData.bagCount;
    
    if (!formData.companyId || !formData.hcfId || count < 1) {
      setError('Please select company, HCF, and enter valid bag count');
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

      // Show loading indicator
      const loadingToast = toast.loading('Generating labels...', {
        duration: Infinity,
      });

      // Call backend API to generate labels (backend expects count, not sequence range)
      const apiLabels = await barcodeLabelService.generateLabels({
        hcfId: formData.hcfId,
        companyId: formData.companyId,
        barcodeType: formData.barcodeType,
        colorBlock: formData.colorBlock,
        count: count, // Calculate count from start/end sequence
      });

      // Generate HCFUniqueID for display
      const hcfUniqueId = generateHCFUniqueID(selectedHcf);
      
      // Map backend response to frontend format
      // Backend now generates correct format: 13-digit numeric for Barcode, HCFUniqueID for QR Code
      const newLabels: BarcodeLabel[] = apiLabels.map((apiLabel: BarcodeLabelResponse) => {
        return {
          id: apiLabel.id,
          hcfCode: apiLabel.hcfCode,
          hcfName: selectedHcf.hcfName,
          companyId: apiLabel.companyId,
          companyName: selectedCompany.companyName,
          sequenceNumber: apiLabel.sequenceNumber,
          barcodeType: apiLabel.barcodeType,
          colorBlock: apiLabel.colorBlock,
          barcodeValue: apiLabel.barcodeValue, // Backend generates correct format
          hcfUniqueId: hcfUniqueId, // Always include HCFUniqueID for all colors and types
          createdAt: apiLabel.createdOn,
        };
      });

      // Update labels list and summary
      await Promise.all([loadLabels(), loadSummary()]);

      // Dismiss loading toast
      toast.dismiss(loadingToast);
      toast.success(`${newLabels.length} label(s) generated successfully`, {
        icon: '✓',
        duration: 3000,
      });

      // Show preview - Only show first label as sample, not all labels
      setPreviewLabels(newLabels.slice(0, 1)); // Only first label for preview
      setAllGeneratedLabels(newLabels); // Store all labels for printing
      setTotalLabelCount(newLabels.length); // Store total count
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
        bagCount: 10,
        barcodeType: 'Barcode',
        colorBlock: 'White',
        count: 1,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate labels';
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`, {
        duration: 5000,
      });
      console.error('Error generating labels:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate barcode/QR code images when preview modal opens
  useEffect(() => {
    if (showPreviewModal && printContainerRef.current && allGeneratedLabels.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const container = printContainerRef.current;
        if (!container) return;

        const svgElements = container.querySelectorAll<SVGElement>('.barcode-svg');
        const canvasElements = container.querySelectorAll<HTMLCanvasElement>('.qr-canvas');

        // Generate barcodes - encode sequence number
        svgElements.forEach((svg, index) => {
          const label = allGeneratedLabels[index];
          if (label && label.barcodeType === 'Barcode') {
            try {
              // Clear previous content
              svg.innerHTML = '';
              JsBarcode(svg, label.sequenceNumber.toString(), {
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

        // Generate QR codes - encode sequence number
        canvasElements.forEach((canvas, index) => {
          const label = allGeneratedLabels[index];
          if (label && label.barcodeType === 'QR Code') {
            QRCode.toCanvas(canvas, label.sequenceNumber.toString(), {
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
  }, [allGeneratedLabels, showPreviewModal]);

  // Print labels using window.print
  const handlePrint = () => {
    if (!printContainerRef.current || allGeneratedLabels.length === 0) return;
    
    // Regenerate barcodes/QR codes before printing
    setTimeout(() => {
      const container = printContainerRef.current;
      if (!container) return;

      const svgElements = container.querySelectorAll<SVGElement>('.barcode-svg');
      const canvasElements = container.querySelectorAll<HTMLCanvasElement>('.qr-canvas');

      // Generate barcodes - encode sequence number
      svgElements.forEach((svg, index) => {
        const label = allGeneratedLabels[index];
        if (label && label.barcodeType === 'Barcode') {
          try {
            svg.innerHTML = '';
            JsBarcode(svg, label.sequenceNumber.toString(), {
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

      // Generate QR codes - encode sequence number
      canvasElements.forEach((canvas, index) => {
        const label = allGeneratedLabels[index];
        if (label && label.barcodeType === 'QR Code') {
          QRCode.toCanvas(canvas, label.sequenceNumber.toString(), {
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
  const filteredLabels = useMemo(() => {
    return labels.filter(label => {
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
  }, [labels, searchQuery, filters]);

  // Calculate summary from filtered labels
  const summary = useMemo(() => {
    const total = filteredLabels.length;
    const barcodes = filteredLabels.filter(l => l.barcodeType === 'Barcode').length;
    const qrCodes = filteredLabels.filter(l => l.barcodeType === 'QR Code').length;
    const collected = filteredLabels.filter(l => l.status === 'Collected').length;
    const deactivated = filteredLabels.filter(l => l.status === 'Inactive').length;
    return { total, barcodes, qrCodes, collected, deactivated };
  }, [filteredLabels]);

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
          title="Barcode Generation"
          subtitle="Generate barcodes and QR codes for waste labels"
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

          {/* Summary View - Replace large grid listing */}
          <div className="barcode-summary-container">
            <div className="barcode-summary-card">
              <div className="barcode-summary-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                  <line x1="7" y1="8" x2="7" y2="16"></line>
                  <line x1="11" y1="8" x2="11" y2="16"></line>
                  <line x1="15" y1="8" x2="15" y2="16"></line>
                  <line x1="19" y1="8" x2="19" y2="16"></line>
                </svg>
                <h3 className="barcode-summary-title">Generated Labels Summary</h3>
              </div>
              <div className="barcode-summary-content">
                <div className="barcode-summary-stats">
                  <div className="barcode-summary-stat">
                    <span className="barcode-summary-stat-value">{summary.total}</span>
                    <span className="barcode-summary-stat-label">Total Labels Generated</span>
                  </div>
                  <div className="barcode-summary-stat">
                    <span className="barcode-summary-stat-value">{summary.barcodes}</span>
                    <span className="barcode-summary-stat-label">Total Barcodes</span>
                  </div>
                  <div className="barcode-summary-stat">
                    <span className="barcode-summary-stat-value">{summary.qrCodes}</span>
                    <span className="barcode-summary-stat-label">Total QR Codes</span>
                  </div>
                  <div className="barcode-summary-stat">
                    <span className="barcode-summary-stat-value">{summary.collected}</span>
                    <span className="barcode-summary-stat-label">Collected Barcodes</span>
                  </div>
                  <div className="barcode-summary-stat">
                    <span className="barcode-summary-stat-value">{summary.deactivated}</span>
                    <span className="barcode-summary-stat-label">Deactivated Barcodes</span>
                  </div>
                </div>
                <div className="barcode-summary-actions">
                  <button 
                    onClick={() => {
                      // Build URL with current search and filter params
                      const params = new URLSearchParams();
                      // Combine searchQuery and filters.hcfId (which is HCF Code) into search param
                      const searchValue = searchQuery || filters.hcfId || '';
                      if (searchValue) params.append('search', searchValue);
                      if (filters.barcodeType) params.append('barcodeType', filters.barcodeType);
                      if (filters.colorBlock) params.append('colorBlock', filters.colorBlock);
                      navigate(`/transaction/barcode-list?${params.toString()}`);
                    }}
                    className="barcode-view-list-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                      <line x1="7" y1="8" x2="7" y2="16"></line>
                      <line x1="11" y1="8" x2="11" y2="16"></line>
                      <line x1="15" y1="8" x2="15" y2="16"></line>
                      <line x1="19" y1="8" x2="19" y2="16"></line>
                    </svg>
                    View All Labels
                  </button>
                </div>
              </div>
            </div>
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
          totalCount={totalLabelCount}
          printContainerRef={printContainerRef}
          onClose={() => setShowPreviewModal(false)}
          onPrint={handlePrint}
        />
      )}

      {/* Hidden print container */}
      <div className="print-container" ref={printContainerRef}>
        {allGeneratedLabels.map((label) => (
          <div key={label.id} className="barcode-label-preview-container">
            {/* Top: Company Name */}
            <div className="barcode-label-preview-top">
              <div className="barcode-label-preview-company-name">{label.companyName || '-'}</div>
            </div>

            {/* Main Content: Left (QR/Barcode) and Right (Color Block + Info) */}
            <div className="barcode-label-preview-main">
              {/* Left: QR Code / Barcode */}
              <div className="barcode-label-preview-left">
                <div className="barcode-label-preview-code-container">
                  {label.barcodeType === 'QR Code' ? (
                    <canvas className="qr-canvas" width="150" height="150"></canvas>
                  ) : (
                    <svg className="barcode-svg"></svg>
                  )}
                </div>
              </div>

              {/* Right: Waste Color Block + Sequence Number + HCF Unique ID */}
              <div className="barcode-label-preview-right">
                {/* Waste Color Block */}
                <div 
                  className={`barcode-label-preview-color-block barcode-label-preview-color-block--${label.colorBlock.toLowerCase()}`}
                >
                  {label.colorBlock.toUpperCase()}
                </div>

                {/* Sequence Number */}
                <div className="barcode-label-preview-barcode-number">{label.sequenceNumber}</div>

                {/* HCF Unique ID - Always display for all colors */}
                <div className="barcode-label-preview-hcf-unique-id">{label.hcfUniqueId || '-'}</div>
              </div>
            </div>

            {/* Bottom: Hospital Name */}
            <div className="barcode-label-preview-bottom">
              <div className="barcode-label-preview-hospital-name">{label.hcfName || '-'}</div>
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
    bagCount: number;
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
    bagCount: number;
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
  
  const [lastSequence, setLastSequence] = useState<number | null>(null);
  
  // Load last sequence number on mount and auto-populate start sequence
  useEffect(() => {
    const loadLastSequence = async () => {
      try {
        const lastSeq = await barcodeLabelService.getLastSequence();
        setLastSequence(lastSeq);
        // Auto-populate start sequence with last sequence + 1 if current value is less than or equal to last sequence
        if (lastSeq !== null && formData.startSequence <= lastSeq) {
          const newStart = lastSeq + 1;
          const newEnd = newStart + formData.bagCount - 1;
          setFormData(prev => ({ ...prev, startSequence: newStart, endSequence: newEnd }));
        }
      } catch (err) {
        console.error('Failed to load last sequence:', err);
        setLastSequence(0);
      }
    };
    loadLastSequence();
  }, []); // Only on mount
  
  // Calculate label count from sequence range
  const labelCount = formData.endSequence >= formData.startSequence 
    ? formData.endSequence - formData.startSequence + 1 
    : 0;
  
  // Generate HCFUniqueID for preview
  const generateHCFUniqueID = (hcf: HcfResponse | undefined): string => {
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
  
  // Generate preview barcode value - both Barcode and QR Code use sequence number (13 digits)
  const previewBarcodeValue = (() => {
    // Both Barcode and QR Code encode the same sequence number, displayed as 13 digits
    return formData.startSequence ? formData.startSequence.toString().padStart(13, '0') : '0000000000000';
  })();

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

          {/* Row 1: COMPANY */}
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
            </div>
          </div>

          {/* Row 2: HCF NAME | HCF CODE */}
          <div className="bg-generate-form-section">
            <div className="bg-generate-form-grid">
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
            </div>
          </div>

          {/* Row 3: START SEQUENCE | NO OF BAG COUNT | END SEQUENCE */}
          <div className="bg-generate-form-section">
            <div className="bg-generate-form-grid">
              <div className="bg-generate-form-group">
                <label className="bg-generate-form-label">
                  START SEQUENCE <span className="bg-required">*</span>
                </label>
                <input
                  type="number"
                  value={formData.startSequence}
                  onChange={(e) => {
                    const newStart = parseInt(e.target.value) || (lastSequence !== null ? lastSequence + 1 : 1);
                    const minValue = lastSequence !== null ? lastSequence + 1 : 1;
                    if (newStart >= minValue) {
                      const newEnd = newStart + formData.bagCount - 1;
                      setFormData({ ...formData, startSequence: newStart, endSequence: newEnd });
                    }
                  }}
                  required
                  min={lastSequence !== null ? lastSequence + 1 : 1}
                  className="bg-generate-input"
                />
                {lastSequence !== null && (
                  <div className="bg-generate-help-text" style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Last generated: {lastSequence} (Auto-set to {lastSequence + 1})
                  </div>
                )}
              </div>
              <div className="bg-generate-form-group">
                <label className="bg-generate-form-label">
                  NO OF BAG COUNT <span className="bg-required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bagCount}
                  onChange={(e) => {
                    const inputValue = e.target.value.trim();
                    // Allow empty input while typing
                    if (inputValue === '') {
                      setFormData({ ...formData, bagCount: 0, endSequence: formData.startSequence });
                      return;
                    }
                    // Only allow numeric input
                    const numericValue = inputValue.replace(/[^0-9]/g, '');
                    if (numericValue !== '') {
                      const newBagCount = parseInt(numericValue, 10);
                      if (newBagCount > 0) {
                        const newEnd = formData.startSequence + newBagCount - 1;
                        setFormData({ ...formData, bagCount: newBagCount, endSequence: newEnd });
                      } else {
                        setFormData({ ...formData, bagCount: 0, endSequence: formData.startSequence });
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Ensure minimum value of 1 on blur
                    const value = parseInt(e.target.value, 10) || 1;
                    const newEnd = formData.startSequence + value - 1;
                    setFormData({ ...formData, bagCount: value, endSequence: newEnd });
                  }}
                  required
                  placeholder="Enter bag count"
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
                  readOnly
                  required
                  className="bg-generate-input bg-generate-input--readonly"
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                />
                <div className="bg-generate-help-text" style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Auto-calculated from Start Sequence + Bag Count
                </div>
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
              <button
                type="button"
                className={`bg-color-block-btn ${formData.colorBlock === 'Blue' ? 'bg-color-block-btn--active' : ''}`}
                onClick={() => setFormData({ ...formData, colorBlock: 'Blue' })}
              >
                <div className="bg-color-block-swatch" style={{ backgroundColor: '#0000FF' }}></div>
                <span>BLUE</span>
                <span className="bg-color-block-hex">#0000FF</span>
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
                                    formData.colorBlock === 'Red' ? '#FF0000' :
                                    formData.colorBlock === 'Blue' ? '#0000FF' : '#FFFFFF',
                    border: formData.colorBlock === 'White' ? '1px solid #e2e8f0' : 'none'
                  }}
                ></div>
                <div className="bg-preview-barcode-value">
                  {previewBarcodeValue}
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
  totalCount: number;
  printContainerRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onPrint: () => void;
}

const PreviewLabelModal = ({ labels, totalCount, printContainerRef, onClose, onPrint }: PreviewLabelModalProps) => {
  const previewBarcodeRef = useRef<SVGSVGElement>(null);
  const previewQrRef = useRef<HTMLCanvasElement>(null);
  const firstLabel = labels[0];

  // Generate barcode/QR code for preview
  useEffect(() => {
    if (!firstLabel) return;

    // Encode sequence number for both Barcode and QR Code
    const displayValue = firstLabel.sequenceNumber.toString();

    if (firstLabel.barcodeType === 'Barcode' && previewBarcodeRef.current) {
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
    } else if (firstLabel.barcodeType === 'QR Code' && previewQrRef.current) {
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
  }, [firstLabel]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--preview" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Preview Sample</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="preview-content">
          {firstLabel && (
            <div className="barcode-label-preview-container">
              {/* Top: Company Name */}
              <div className="barcode-label-preview-top">
                <div className="barcode-label-preview-company-name">{firstLabel.companyName || '-'}</div>
              </div>

              {/* Main Content: Left (QR/Barcode) and Right (Color Block + Info) */}
              <div className="barcode-label-preview-main">
                {/* Left: QR Code / Barcode */}
                <div className="barcode-label-preview-left">
                  <div className="barcode-label-preview-code-container">
                    {firstLabel.barcodeType === 'QR Code' ? (
                      <canvas ref={previewQrRef} className="barcode-label-preview-qr"></canvas>
                    ) : (
                      <svg ref={previewBarcodeRef} className="barcode-label-preview-barcode"></svg>
                    )}
                  </div>
                </div>

                {/* Right: Waste Color Block + Sequence Number + HCF Unique ID */}
                <div className="barcode-label-preview-right">
                  {/* Waste Color Block */}
                  <div 
                    className={`barcode-label-preview-color-block barcode-label-preview-color-block--${firstLabel.colorBlock.toLowerCase()}`}
                  >
                    {firstLabel.colorBlock.toUpperCase()}
                  </div>

                  {/* Sequence Number */}
                  <div className="barcode-label-preview-barcode-number">{firstLabel.sequenceNumber}</div>

                  {/* HCF Unique ID - Always display for all colors */}
                  <div className="barcode-label-preview-hcf-unique-id">{firstLabel.hcfUniqueId || '-'}</div>
                </div>
              </div>

              {/* Bottom: Hospital Name */}
              <div className="barcode-label-preview-bottom">
                <div className="barcode-label-preview-hospital-name">{firstLabel.hcfName || '-'}</div>
              </div>
            </div>
          )}
          <div className="preview-summary">
            <p className="preview-summary-text">{totalCount} label(s) will be generated.</p>
          </div>
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
              <option value="Blue">Blue</option>
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

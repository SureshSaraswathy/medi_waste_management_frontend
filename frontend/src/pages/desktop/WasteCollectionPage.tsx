import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { wasteCollectionService, WasteCollectionResponse, BarcodeLookupResponse } from '../../services/wasteCollectionService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import './wasteCollectionPage.css';
import '../desktop/dashboardPage.css';

interface WasteCollection {
  id: string;
  barcode: string;
  collectionDate: string;
  companyId: string;
  companyName: string;
  hcfId: string;
  hcfCode: string;
  hcfName: string;
  wasteColor: 'Yellow' | 'Red' | 'White';
  weightKg?: number | null;
  status: 'Pending' | 'Collected' | 'In Transit' | 'Processed' | 'Disposed';
  routeAssignmentId?: string | null;
  collectedBy?: string | null;
  collectedAt?: string | null;
  notes?: string | null;
  createdOn: string;
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

const WasteCollectionPage = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<WasteCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLookupResult, setBarcodeLookupResult] = useState<BarcodeLookupResponse | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [collections, setCollections] = useState<WasteCollection[]>([]);

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true);
      const mappedCompanies: Company[] = apiCompanies.map((c: CompanyResponse) => ({
        id: c.id,
        companyCode: c.companyCode,
        companyName: c.companyName,
        status: c.status,
      }));
      setCompanies(mappedCompanies);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  }, []);

  // Load collections
  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiCollections = await wasteCollectionService.getAllWasteCollections(
        undefined,
        undefined,
        selectedDate,
        undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );

      // Map backend response to frontend format with names
      const mappedCollections: WasteCollection[] = await Promise.all(
        apiCollections.map(async (apiCollection: WasteCollectionResponse) => {
          const company = companies.find(c => c.id === apiCollection.companyId);
          // Fetch HCF details if needed
          let hcfCode = '';
          let hcfName = '';
          try {
            const hcf = await hcfService.getHcfById(apiCollection.hcfId);
            hcfCode = hcf.hcfCode;
            hcfName = hcf.hcfName;
          } catch (err) {
            console.error('Error loading HCF:', err);
          }

          return {
            id: apiCollection.id,
            barcode: apiCollection.barcode,
            collectionDate: apiCollection.collectionDate,
            companyId: apiCollection.companyId,
            companyName: company?.companyName || 'Unknown',
            hcfId: apiCollection.hcfId,
            hcfCode,
            hcfName,
            wasteColor: apiCollection.wasteColor,
            weightKg: apiCollection.weightKg,
            status: apiCollection.status,
            routeAssignmentId: apiCollection.routeAssignmentId,
            collectedBy: apiCollection.collectedBy,
            collectedAt: apiCollection.collectedAt,
            notes: apiCollection.notes,
            createdOn: apiCollection.createdOn,
          };
        })
      );
      setCollections(mappedCollections);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load collections';
      setError(errorMessage);
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter, companies]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
    };
    initializeData();
  }, [loadCompanies]);

  // Load collections when dependencies are ready
  useEffect(() => {
    if (companies.length > 0) {
      loadCollections();
    }
  }, [selectedDate, statusFilter, companies, loadCollections]);

  // Handle barcode lookup
  const handleBarcodeLookup = async (barcode: string) => {
    if (!barcode || barcode.length < 5) {
      setError('Please enter a valid barcode (at least 5 characters)');
      return;
    }

    setLookupLoading(true);
    setError(null);
    setBarcodeLookupResult(null);

    try {
      const lookupResult = await wasteCollectionService.lookupBarcode(barcode);
      setBarcodeLookupResult(lookupResult);
      
      // Check if already collected today
      const existingCollection = collections.find(
        c => c.barcode === barcode && c.collectionDate === selectedDate
      );
      
      if (existingCollection) {
        setError(`Barcode ${barcode} has already been collected on ${selectedDate}`);
        setBarcodeLookupResult(null);
      } else {
        // Open collection modal with pre-filled data
        setShowCollectionModal(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to lookup barcode';
      setError(errorMessage);
      setBarcodeLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  };

  // Handle barcode input (Enter key or button click)
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (barcodeInput.trim()) {
      handleBarcodeLookup(barcodeInput.trim());
      setBarcodeInput('');
    }
  };

  // Handle collection save
  const handleSaveCollection = async (data: Partial<WasteCollection>) => {
    if (!barcodeLookupResult) {
      setError('Barcode lookup result is missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await wasteCollectionService.createWasteCollection({
        barcode: barcodeLookupResult.barcode,
        collectionDate: selectedDate,
        companyId: barcodeLookupResult.companyId,
        hcfId: barcodeLookupResult.hcfId,
        wasteColor: barcodeLookupResult.wasteColor,
        weightKg: data.weightKg || null,
        status: 'Pending',
        notes: data.notes || null,
      });

      setSuccessMessage('Waste collection recorded successfully');
      setShowCollectionModal(false);
      setBarcodeLookupResult(null);
      await loadCollections();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save collection';
      setError(errorMessage);
      console.error('Error saving collection:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle collect waste (with weight)
  const handleCollectWaste = async (collectionId: string, weightKg: number) => {
    try {
      setLoading(true);
      setError(null);
      await wasteCollectionService.collectWaste(collectionId, weightKg);
      setSuccessMessage('Waste collected successfully');
      await loadCollections();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to collect waste';
      setError(errorMessage);
      console.error('Error collecting waste:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = (collection: WasteCollection) => {
    setSelectedCollection(collection);
    setShowDetailModal(true);
  };

  // Filter collections
  const filteredCollections = collections.filter(collection => {
    const matchesSearch = 
      collection.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collection.hcfCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collection.hcfName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collection.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesColor = colorFilter === 'all' || collection.wasteColor === colorFilter;
    
    return matchesSearch && matchesColor;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'status-badge--pending';
      case 'Collected':
        return 'status-badge--collected';
      case 'In Transit':
        return 'status-badge--in-transit';
      case 'Processed':
        return 'status-badge--processed';
      case 'Disposed':
        return 'status-badge--disposed';
      default:
        return '';
    }
  };

  const getColorBadgeClass = (color: string) => {
    switch (color) {
      case 'Yellow':
        return 'color-badge--yellow';
      case 'Red':
        return 'color-badge--red';
      case 'White':
        return 'color-badge--white';
      default:
        return '';
    }
  };

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ), 
      active: location.pathname === '/dashboard' 
    },
    { 
      path: '/transaction', 
      label: 'Transaction', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ), 
      active: location.pathname === '/transaction' || location.pathname.startsWith('/transaction')
    },
    { 
      path: '/finance', 
      label: 'Finance', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ), 
      active: location.pathname === '/finance' || location.pathname.startsWith('/finance')
    },
    { 
      path: '/commercial-agreements', 
      label: 'Commercial / Agreements', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname === '/commercial-agreements' || location.pathname.startsWith('/commercial-agreements')
    },
    { 
      path: '/compliance-training', 
      label: 'Compliance & Training', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ), 
      active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training')
    },
    { 
      path: '/master', 
      label: 'Master', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ), 
      active: location.pathname === '/master' || location.pathname.startsWith('/master') 
    },
    { 
      path: '/report', 
      label: 'Report', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ), 
      active: location.pathname === '/report' 
    },
  ];

  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <span className="brand-name">MEDI-WASTE</span>
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
                  <span className="nav-label">{item.label}</span>
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
            <span>Profile</span>
          </Link>
          <button onClick={logout} className="sidebar-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Transaction / Waste Collection</span>
          </div>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#d4edda', 
            color: '#155724', 
            marginBottom: '16px', 
            borderRadius: '6px',
            border: '1px solid #c3e6cb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#155724',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 8px',
                lineHeight: '1'
              }}
              aria-label="Close success message"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fee', 
            color: '#c33', 
            marginBottom: '16px', 
            borderRadius: '6px',
            border: '1px solid #fcc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#c33',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 8px',
                lineHeight: '1'
              }}
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !collections.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading collections...
          </div>
        )}

        <div className="waste-collection-page">
          <div className="waste-collection-header">
            <h1 className="waste-collection-title">Waste Collection</h1>
          </div>

          {/* Barcode Scanner Section */}
          <div className="barcode-scanner-section">
            <form onSubmit={handleBarcodeSubmit} className="barcode-scanner-form">
              <div className="barcode-input-group">
                <label htmlFor="barcode-input">Scan Barcode</label>
                <div className="barcode-input-wrapper">
                  <input
                    id="barcode-input"
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan or enter barcode..."
                    className="barcode-input"
                    autoFocus
                    disabled={lookupLoading}
                  />
                  <button
                    type="submit"
                    className="barcode-scan-btn"
                    disabled={lookupLoading || !barcodeInput.trim()}
                  >
                    {lookupLoading ? (
                      <span>Looking up...</span>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"></path>
                        </svg>
                        Scan
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Filters */}
          <div className="waste-collection-filters">
            <div className="filter-group">
              <label htmlFor="collection-date">Collection Date</label>
              <input
                id="collection-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="filter-group">
              <label htmlFor="status-filter">Status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-select"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Collected">Collected</option>
                <option value="In Transit">In Transit</option>
                <option value="Processed">Processed</option>
                <option value="Disposed">Disposed</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="color-filter">Color</label>
              <select
                id="color-filter"
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                className="color-select"
              >
                <option value="all">All Colors</option>
                <option value="Yellow">Yellow</option>
                <option value="Red">Red</option>
                <option value="White">White</option>
              </select>
            </div>
            <div className="filter-group filter-group--search">
              <label htmlFor="search">Search</label>
              <div className="search-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  id="search"
                  type="text"
                  placeholder="Search by barcode, HCF, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          </div>

          {/* Collections Table */}
          <div className="waste-collection-table-container">
            <table className="waste-collection-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Barcode</th>
                  <th>HCF</th>
                  <th>Company</th>
                  <th>Color</th>
                  <th>Weight (Kg)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-message">
                      {loading ? 'Loading...' : 'No collections found for the selected date'}
                    </td>
                  </tr>
                ) : (
                  filteredCollections.map((collection) => (
                    <tr key={collection.id}>
                      <td>{new Date(collection.collectionDate).toLocaleDateString()}</td>
                      <td>
                        <span className="barcode-display">{collection.barcode}</span>
                      </td>
                      <td>
                        <div className="hcf-info">
                          <span className="hcf-code">{collection.hcfCode}</span>
                          <span className="hcf-name">{collection.hcfName}</span>
                        </div>
                      </td>
                      <td>{collection.companyName}</td>
                      <td>
                        <span className={`color-badge ${getColorBadgeClass(collection.wasteColor)}`}>
                          {collection.wasteColor}
                        </span>
                      </td>
                      <td>{collection.weightKg ? `${collection.weightKg} kg` : '-'}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(collection.status)}`}>
                          {collection.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => handleViewDetails(collection)}
                            title="View Details"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          {collection.status === 'Pending' && (
                            <button
                              className="action-btn action-btn--collect"
                              onClick={() => {
                                const weight = prompt('Enter weight in kg:');
                                if (weight && !isNaN(parseFloat(weight)) && parseFloat(weight) > 0) {
                                  handleCollectWaste(collection.id, parseFloat(weight));
                                }
                              }}
                              title="Collect Waste"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="waste-collection-pagination-info">
            Showing {filteredCollections.length} of {collections.length} Items
          </div>
        </div>
      </main>

      {/* Collection Modal */}
      {showCollectionModal && barcodeLookupResult && (
        <CollectionFormModal
          barcodeLookup={barcodeLookupResult}
          collectionDate={selectedDate}
          onClose={() => {
            setShowCollectionModal(false);
            setBarcodeLookupResult(null);
          }}
          onSave={handleSaveCollection}
        />
      )}

      {/* Detail View Modal */}
      {showDetailModal && selectedCollection && (
        <CollectionDetailModal
          collection={selectedCollection}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCollection(null);
          }}
        />
      )}
    </div>
  );
};

// Collection Form Modal Component
interface CollectionFormModalProps {
  barcodeLookup: BarcodeLookupResponse;
  collectionDate: string;
  onClose: () => void;
  onSave: (data: Partial<WasteCollection>) => void;
}

const CollectionFormModal = ({
  barcodeLookup,
  collectionDate,
  onClose,
  onSave,
}: CollectionFormModalProps) => {
  const [formData, setFormData] = useState<Partial<WasteCollection>>({
    weightKg: null,
    notes: null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--medium" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Record Waste Collection</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="collection-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Barcode Information</h3>
            <div className="form-grid form-grid--two-columns">
              <div className="form-group">
                <label>Barcode</label>
                <input
                  type="text"
                  value={barcodeLookup.barcode}
                  disabled
                  className="form-input form-input--readonly"
                />
              </div>
              <div className="form-group">
                <label>Collection Date</label>
                <input
                  type="date"
                  value={collectionDate}
                  disabled
                  className="form-input form-input--readonly"
                />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  value={barcodeLookup.companyName}
                  disabled
                  className="form-input form-input--readonly"
                />
              </div>
              <div className="form-group">
                <label>HCF</label>
                <input
                  type="text"
                  value={`${barcodeLookup.hcfCode} - ${barcodeLookup.hcfName}`}
                  disabled
                  className="form-input form-input--readonly"
                />
              </div>
              <div className="form-group">
                <label>Waste Color</label>
                <input
                  type="text"
                  value={barcodeLookup.wasteColor}
                  disabled
                  className="form-input form-input--readonly"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Collection Details</h3>
            <div className="form-grid form-grid--two-columns">
              <div className="form-group">
                <label>Weight (Kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weightKg || ''}
                  onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || null })}
                  required
                  className="form-input"
                  placeholder="Enter weight"
                />
              </div>
            </div>
            <div className="form-group form-group--full-width">
              <label>Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                rows={3}
                className="form-textarea"
                placeholder="Additional notes or observations..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Record Collection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Collection Detail Modal Component
interface CollectionDetailModalProps {
  collection: WasteCollection;
  onClose: () => void;
}

const CollectionDetailModal = ({ collection, onClose }: CollectionDetailModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Collection Details</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="collection-detail-content">
          <div className="detail-section">
            <h3 className="detail-section-title">Basic Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Barcode</label>
                <span>{collection.barcode}</span>
              </div>
              <div className="detail-item">
                <label>Collection Date</label>
                <span>{new Date(collection.collectionDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-item">
                <label>Company</label>
                <span>{collection.companyName}</span>
              </div>
              <div className="detail-item">
                <label>HCF Code</label>
                <span>{collection.hcfCode}</span>
              </div>
              <div className="detail-item">
                <label>HCF Name</label>
                <span>{collection.hcfName}</span>
              </div>
              <div className="detail-item">
                <label>Waste Color</label>
                <span className={`color-badge ${collection.wasteColor.toLowerCase()}`}>
                  {collection.wasteColor}
                </span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3 className="detail-section-title">Collection Details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Weight</label>
                <span>{collection.weightKg ? `${collection.weightKg} kg` : 'Not recorded'}</span>
              </div>
              <div className="detail-item">
                <label>Status</label>
                <span className={`status-badge ${collection.status.toLowerCase().replace(' ', '-')}`}>
                  {collection.status}
                </span>
              </div>
              {collection.collectedBy && (
                <div className="detail-item">
                  <label>Collected By</label>
                  <span>{collection.collectedBy}</span>
                </div>
              )}
              {collection.collectedAt && (
                <div className="detail-item">
                  <label>Collected At</label>
                  <span>{new Date(collection.collectedAt).toLocaleString()}</span>
                </div>
              )}
              {collection.notes && (
                <div className="detail-item detail-item--full-width">
                  <label>Notes</label>
                  <span>{collection.notes}</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3 className="detail-section-title">Audit Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Created On</label>
                <span>{new Date(collection.createdOn).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WasteCollectionPage;

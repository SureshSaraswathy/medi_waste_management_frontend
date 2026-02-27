import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { wasteCollectionService, WasteCollectionResponse, BarcodeLookupResponse } from '../../services/wasteCollectionService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import PageHeader from '../../components/layout/PageHeader';
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
  const { logout, user, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterColor, setFilterColor] = useState<string>('all');
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<WasteCollection | null>(null);
  const [collectionToEdit, setCollectionToEdit] = useState<WasteCollection | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<WasteCollection | null>(null);
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

  // Handle edit collection
  const handleEditCollection = (collection: WasteCollection) => {
    setCollectionToEdit(collection);
    setShowEditModal(true);
  };

  // Handle update collection
  const handleUpdateCollection = async (data: { weightKg: number }) => {
    if (!collectionToEdit) return;
    try {
      setLoading(true);
      setError(null);
      await wasteCollectionService.collectWaste(collectionToEdit.id, data.weightKg);
      setSuccessMessage('Collection updated successfully');
      await loadCollections();
      setShowEditModal(false);
      setCollectionToEdit(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update collection';
      setError(errorMessage);
      console.error('Error updating collection:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete collection click
  const handleDeleteClick = (collection: WasteCollection) => {
    setCollectionToDelete(collection);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!collectionToDelete) return;
    try {
      setLoading(true);
      setError(null);
      await wasteCollectionService.deleteWasteCollection(collectionToDelete.id);
      setSuccessMessage('Collection deleted successfully');
      await loadCollections();
      setShowDeleteModal(false);
      setCollectionToDelete(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete collection';
      setError(errorMessage);
      console.error('Error deleting collection:', err);
    } finally {
      setLoading(false);
    }
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
        return 'wc-status-badge--pending';
      case 'Collected':
        return 'wc-status-badge--collected';
      case 'In Transit':
        return 'wc-status-badge--in-transit';
      case 'Processed':
        return 'wc-status-badge--verified';
      case 'Disposed':
        return 'wc-status-badge--rejected';
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

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

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
        <PageHeader 
          title="Waste Collection"
          subtitle="Manage waste collection records"
        />

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

        <div className="wc-page">
          {/* Page Header */}
          <div className="wc-page-header">
            <div className="wc-header-left">
              <div className="wc-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <h1 className="wc-page-title">Waste Collection</h1>
            </div>
            <div className="wc-header-actions">
            </div>
          </div>

          {/* Search Section */}
          <div className="wc-search-section">
            {/* Barcode Scan Row */}
            <div className="wc-barcode-row">
              <div className="wc-barcode-search">
                <svg className="wc-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <form onSubmit={handleBarcodeSubmit} className="wc-barcode-form">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan or enter barcode..."
                    className="wc-barcode-input"
                    autoFocus
                    disabled={lookupLoading}
                  />
                </form>
              </div>
              <button 
                type="button"
                className="wc-btn wc-btn--scan-inline" 
                onClick={handleBarcodeSubmit}
                disabled={lookupLoading || !barcodeInput.trim()}
              >
                {lookupLoading ? (
                  <span>Scanning...</span>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                      <line x1="7" y1="8" x2="7" y2="16"></line>
                      <line x1="11" y1="8" x2="11" y2="16"></line>
                      <line x1="15" y1="8" x2="15" y2="16"></line>
                      <line x1="19" y1="8" x2="19" y2="16"></line>
                    </svg>
                    Scan
                  </>
                )}
              </button>
            </div>
            
            {/* General Search Row */}
            <div className="wc-search-row">
              <div className="wc-general-search">
                <svg className="wc-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  placeholder="Search by barcode, HCF, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="wc-search-input"
                />
              </div>
              <button className="wc-btn wc-btn--filter-inline" onClick={() => {
                // Initialize filter values from current state
                setFilterDate(selectedDate);
                setFilterStatus(statusFilter);
                setFilterColor(colorFilter);
                setShowAdvancedFilter(!showAdvancedFilter);
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Advanced Filter
              </button>
            </div>
          </div>

          {/* Collections Table */}
          <div className="wc-table-container">
            <table className="wc-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>BARCODE</th>
                  <th>HCF</th>
                  <th>COMPANY</th>
                  <th>COLOR</th>
                  <th>WEIGHT (KG)</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="wc-empty-message">
                      {loading ? 'Loading...' : 'No collections found'}
                    </td>
                  </tr>
                ) : (
                  filteredCollections.map((collection) => {
                    const collectionDate = new Date(collection.collectionDate);
                    const formattedDate = `${String(collectionDate.getDate()).padStart(2, '0')}/${String(collectionDate.getMonth() + 1).padStart(2, '0')}/${collectionDate.getFullYear()}`;
                    return (
                      <tr key={collection.id}>
                        <td>{formattedDate}</td>
                        <td>
                          <span className="wc-barcode-display">{collection.barcode}</span>
                        </td>
                        <td>
                          <span className="wc-hcf-code">{collection.hcfCode}</span>
                        </td>
                        <td>{collection.companyName}</td>
                        <td>
                          <div className="wc-color-badge-wrapper">
                            <span className={`wc-color-swatch wc-color-swatch--${collection.wasteColor.toLowerCase()}`}></span>
                            <span className="wc-color-text">{collection.wasteColor.toUpperCase()}</span>
                          </div>
                        </td>
                        <td>{collection.weightKg != null && !isNaN(Number(collection.weightKg)) ? Number(collection.weightKg).toFixed(2) : '-'}</td>
                        <td>
                          <span className={`wc-status-badge ${getStatusBadgeClass(collection.status)}`}>
                            {collection.status === 'Collected' ? 'COLLECTED' : 
                             collection.status === 'Processed' ? 'VERIFIED' : 
                             collection.status === 'Disposed' ? 'REJECTED' :
                             collection.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="wc-action-buttons">
                            <button
                              className="wc-action-btn wc-action-btn--view"
                              onClick={() => handleViewDetails(collection)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            {collection.status === 'Pending' && (
                              <>
                                <button
                                  className="wc-action-btn wc-action-btn--edit"
                                  onClick={() => handleEditCollection(collection)}
                                  title="Edit"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  className="wc-action-btn wc-action-btn--delete"
                                  onClick={() => handleDeleteClick(collection)}
                                  title="Delete"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="wc-table-footer">
            Showing {filteredCollections.length} of {collections.length} items
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

      {/* Advanced Filter Modal */}
      {showAdvancedFilter && (
        <AdvancedFilterModal
          filterDate={filterDate}
          filterStatus={filterStatus}
          filterColor={filterColor}
          onFilterDateChange={setFilterDate}
          onFilterStatusChange={setFilterStatus}
          onFilterColorChange={setFilterColor}
          onClearFilters={() => {
            setFilterDate('');
            setFilterStatus('all');
            setFilterColor('all');
          }}
          onApplyFilters={() => {
            // filterDate is already in yyyy-mm-dd format from date input
            if (filterDate) {
              setSelectedDate(filterDate);
            }
            setStatusFilter(filterStatus);
            setColorFilter(filterColor);
            setShowAdvancedFilter(false);
          }}
          onClose={() => setShowAdvancedFilter(false)}
        />
      )}

      {/* Edit Collection Modal */}
      {showEditModal && collectionToEdit && (
        <EditCollectionModal
          collection={collectionToEdit}
          onClose={() => {
            setShowEditModal(false);
            setCollectionToEdit(null);
          }}
          onUpdate={handleUpdateCollection}
          loading={loading}
        />
      )}

      {/* Delete Collection Modal */}
      {showDeleteModal && collectionToDelete && (
        <DeleteCollectionModal
          collection={collectionToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setCollectionToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          loading={loading}
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

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="wc-collection-modal-overlay" onClick={onClose}>
      <div className="wc-collection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wc-collection-modal-header">
          <div className="wc-collection-header-left">
            <div className="wc-collection-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
            </div>
            <h2 className="wc-collection-modal-title">Record Waste Collection</h2>
          </div>
          <button className="wc-collection-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="wc-collection-form" onSubmit={handleSubmit}>
          <div className="wc-collection-form-section">
            <h3 className="wc-collection-section-title">BARCODE INFORMATION</h3>
            <div className="wc-collection-form-grid">
              <div className="wc-collection-form-group">
                <label className="wc-collection-label">Barcode</label>
                <input
                  type="text"
                  value={barcodeLookup.barcode}
                  disabled
                  className="wc-collection-input wc-collection-input--readonly"
                />
              </div>
              <div className="wc-collection-form-group">
                <label className="wc-collection-label">Collection Date</label>
                <input
                  type="text"
                  value={formatDateForDisplay(collectionDate)}
                  disabled
                  className="wc-collection-input wc-collection-input--readonly"
                />
              </div>
              <div className="wc-collection-form-group">
                <label className="wc-collection-label">Company</label>
                <input
                  type="text"
                  value={barcodeLookup.companyName}
                  disabled
                  className="wc-collection-input wc-collection-input--readonly"
                />
              </div>
              <div className="wc-collection-form-group">
                <label className="wc-collection-label">HCF</label>
                <input
                  type="text"
                  value={barcodeLookup.hcfCode}
                  disabled
                  className="wc-collection-input wc-collection-input--readonly"
                />
              </div>
              <div className="wc-collection-form-group">
                <label className="wc-collection-label">Waste Color</label>
                <input
                  type="text"
                  value={barcodeLookup.wasteColor}
                  disabled
                  className="wc-collection-input wc-collection-input--readonly"
                />
              </div>
            </div>
          </div>

          <div className="wc-collection-form-section">
            <h3 className="wc-collection-section-title">COLLECTION DETAILS</h3>
            <div className="wc-collection-form-grid">
              <div className="wc-collection-form-group">
                <label className="wc-collection-label">
                  Weight (Kg) <span className="wc-collection-required">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weightKg || ''}
                  onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || null })}
                  required
                  className="wc-collection-input"
                  placeholder="Enter weight"
                />
              </div>
              <div className="wc-collection-form-group wc-collection-form-group--full">
                <label className="wc-collection-label">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                  rows={3}
                  className="wc-collection-textarea"
                  placeholder="Additional notes or observations..."
                />
              </div>
            </div>
          </div>

          <div className="wc-collection-modal-footer">
            <button type="button" className="wc-collection-btn wc-collection-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="wc-collection-btn wc-collection-btn--submit">
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
  onVerify?: () => void;
}

const CollectionDetailModal = ({ collection, onClose, onVerify }: CollectionDetailModalProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'wc-view-status-badge--pending';
      case 'Collected':
        return 'wc-view-status-badge--collected';
      case 'Processed':
        return 'wc-view-status-badge--verified';
      case 'Disposed':
        return 'wc-view-status-badge--rejected';
      default:
        return '';
    }
  };

  const getColorBadgeClass = (color: string) => {
    return `wc-view-color-badge--${color.toLowerCase()}`;
  };

  const handleVerify = () => {
    if (onVerify) {
      onVerify();
    }
    onClose();
  };

  return (
    <div className="wc-view-modal-overlay" onClick={onClose}>
      <div className="wc-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wc-view-modal-header">
          <div className="wc-view-header-left">
            <div className="wc-view-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
            <div className="wc-view-title-wrap">
              <h2 className="wc-view-modal-title">View Collection Details</h2>
              <p className="wc-view-modal-subtitle">Barcode: {collection.barcode}</p>
            </div>
          </div>
          <button className="wc-view-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="wc-view-modal-body">
          <div className="wc-view-detail-grid">
            <div className="wc-view-detail-column">
              <div className="wc-view-detail-item">
                <label className="wc-view-detail-label">COLLECTION DATE</label>
                <span className="wc-view-detail-value">{formatDate(collection.collectionDate)}</span>
              </div>
              <div className="wc-view-detail-item">
                <label className="wc-view-detail-label">HCF</label>
                <span className="wc-view-detail-value">{collection.hcfCode}</span>
              </div>
              <div className="wc-view-detail-item">
                <label className="wc-view-detail-label">WASTE COLOR</label>
                <div className={`wc-view-color-badge ${getColorBadgeClass(collection.wasteColor)}`}>
                  <span className="wc-view-color-swatch"></span>
                  <span className="wc-view-color-text">{collection.wasteColor.toUpperCase()}</span>
                </div>
              </div>
              <div className="wc-view-detail-item">
                <label className="wc-view-detail-label">STATUS</label>
                <span className={`wc-view-status-badge ${getStatusBadgeClass(collection.status)}`}>
                  {collection.status === 'Collected' ? 'COLLECTED' : 
                   collection.status === 'Processed' ? 'VERIFIED' : 
                   collection.status === 'Disposed' ? 'REJECTED' :
                   collection.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="wc-view-detail-column">
              <div className="wc-view-detail-item">
                <label className="wc-view-detail-label">BARCODE</label>
                <span className="wc-view-detail-value">{collection.barcode}</span>
              </div>
              <div className="wc-view-detail-item">
                <label className="wc-view-detail-label">COMPANY</label>
                <span className="wc-view-detail-value">{collection.companyName}</span>
              </div>
              <div className="wc-view-detail-item">
                <label className="wc-view-detail-label">WEIGHT</label>
                <span className="wc-view-detail-value">
                  {collection.weightKg != null && !isNaN(Number(collection.weightKg)) 
                    ? `${Number(collection.weightKg).toFixed(2)} kg` 
                    : 'Not recorded'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="wc-view-modal-footer">
          <button type="button" className="wc-view-btn wc-view-btn--close" onClick={onClose}>
            Close
          </button>
          {(collection.status === 'Collected' || collection.status === 'Pending') && (
            <button type="button" className="wc-view-btn wc-view-btn--verify" onClick={handleVerify}>
              Verify Collection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Advanced Filter Modal Component
interface AdvancedFilterModalProps {
  filterDate: string;
  filterStatus: string;
  filterColor: string;
  onFilterDateChange: (date: string) => void;
  onFilterStatusChange: (status: string) => void;
  onFilterColorChange: (color: string) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
  onClose: () => void;
}

const AdvancedFilterModal = ({
  filterDate,
  filterStatus,
  filterColor,
  onFilterDateChange,
  onFilterStatusChange,
  onFilterColorChange,
  onClearFilters,
  onApplyFilters,
  onClose,
}: AdvancedFilterModalProps) => {
  // Convert filterDate to yyyy-mm-dd format for date input
  const getDateInputValue = () => {
    if (!filterDate) return '';
    // If already in yyyy-mm-dd format, return as is
    if (filterDate.includes('-') && filterDate.length === 10 && filterDate.split('-')[0].length === 4) {
      return filterDate;
    }
    // Convert from dd-mm-yyyy to yyyy-mm-dd
    if (filterDate.includes('-') && filterDate.split('-')[0].length === 2) {
      const parts = filterDate.split('-');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
    }
    return filterDate;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Date input provides yyyy-mm-dd format
    if (value) {
      onFilterDateChange(value);
    } else {
      onFilterDateChange('');
    }
  };

  return (
    <div className="wc-filter-modal-overlay" onClick={onClose}>
      <div className="wc-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wc-filter-modal-header">
          <div className="wc-filter-modal-title-wrap">
            <h2 className="wc-filter-modal-title">Advanced Filters</h2>
            <p className="wc-filter-modal-subtitle">Refine results by multiple criteria</p>
          </div>
          <button className="wc-filter-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="wc-filter-modal-body">
          <div className="wc-filter-form-group">
            <label className="wc-filter-label">COLLECTION DATE</label>
            <div className="wc-filter-date-wrapper">
              <svg className="wc-filter-date-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <input
                type="date"
                value={getDateInputValue()}
                onChange={handleDateChange}
                className="wc-filter-date-input"
              />
            </div>
          </div>

          <div className="wc-filter-form-group">
            <label className="wc-filter-label">STATUS</label>
            <div className="wc-filter-select-wrapper">
              <select
                value={filterStatus}
                onChange={(e) => onFilterStatusChange(e.target.value)}
                className="wc-filter-select"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Collected">Collected</option>
                <option value="In Transit">In Transit</option>
                <option value="Processed">Processed</option>
                <option value="Disposed">Disposed</option>
              </select>
              <svg className="wc-filter-select-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <div className="wc-filter-form-group">
            <label className="wc-filter-label">COLOR</label>
            <div className="wc-filter-select-wrapper">
              <select
                value={filterColor}
                onChange={(e) => onFilterColorChange(e.target.value)}
                className="wc-filter-select"
              >
                <option value="all">All Colors</option>
                <option value="Yellow">Yellow</option>
                <option value="Red">Red</option>
                <option value="White">White</option>
                <option value="Blue">Blue</option>
                <option value="Black">Black</option>
              </select>
              <svg className="wc-filter-select-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </div>

        <div className="wc-filter-modal-footer">
          <button type="button" className="wc-filter-clear-btn" onClick={onClearFilters}>
            Clear Filters
          </button>
          <button type="button" className="wc-filter-apply-btn" onClick={onApplyFilters}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Collection Modal Component
interface EditCollectionModalProps {
  collection: WasteCollection;
  onClose: () => void;
  onUpdate: (data: { weightKg: number }) => void;
  loading: boolean;
}

const EditCollectionModal = ({ collection, onClose, onUpdate, loading }: EditCollectionModalProps) => {
  const [formData, setFormData] = useState<{ weightKg: number }>({
    weightKg: collection.weightKg != null && !isNaN(Number(collection.weightKg)) ? Number(collection.weightKg) : 0,
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.weightKg <= 0) {
      return;
    }
    onUpdate(formData);
  };

  return (
    <div className="wc-edit-modal-overlay" onClick={onClose}>
      <div className="wc-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wc-edit-modal-header">
          <h2 className="wc-edit-modal-title">Edit Waste Collection</h2>
          <button className="wc-edit-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="wc-edit-form" onSubmit={handleSubmit}>
          <div className="wc-edit-form-section">
            <h3 className="wc-edit-section-title">BARCODE INFORMATION</h3>
            <div className="wc-edit-form-grid">
              <div className="wc-edit-form-group">
                <label className="wc-edit-label">Barcode</label>
                <input
                  type="text"
                  value={collection.barcode}
                  disabled
                  className="wc-edit-input wc-edit-input--readonly"
                />
              </div>
              <div className="wc-edit-form-group">
                <label className="wc-edit-label">Collection Date</label>
                <input
                  type="text"
                  value={formatDate(collection.collectionDate)}
                  disabled
                  className="wc-edit-input wc-edit-input--readonly"
                />
              </div>
              <div className="wc-edit-form-group">
                <label className="wc-edit-label">Company</label>
                <input
                  type="text"
                  value={collection.companyName}
                  disabled
                  className="wc-edit-input wc-edit-input--readonly"
                />
              </div>
              <div className="wc-edit-form-group">
                <label className="wc-edit-label">HCF</label>
                <input
                  type="text"
                  value={collection.hcfCode}
                  disabled
                  className="wc-edit-input wc-edit-input--readonly"
                />
              </div>
              <div className="wc-edit-form-group">
                <label className="wc-edit-label">Waste Color</label>
                <input
                  type="text"
                  value={collection.wasteColor}
                  disabled
                  className="wc-edit-input wc-edit-input--readonly"
                />
              </div>
            </div>
          </div>

          <div className="wc-edit-form-section">
            <h3 className="wc-edit-section-title">COLLECTION DETAILS</h3>
            <div className="wc-edit-form-grid">
              <div className="wc-edit-form-group">
                <label className="wc-edit-label">
                  Weight (Kg) <span className="wc-edit-required">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.weightKg || ''}
                  onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0 })}
                  required
                  className="wc-edit-input"
                  placeholder="Enter weight"
                />
              </div>
            </div>
          </div>

          <div className="wc-edit-modal-footer">
            <button type="button" className="wc-edit-btn wc-edit-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="wc-edit-btn wc-edit-btn--update" disabled={loading}>
              {loading ? 'Updating...' : 'Update Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Collection Modal Component
interface DeleteCollectionModalProps {
  collection: WasteCollection;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

const DeleteCollectionModal = ({ collection, onClose, onConfirm, loading }: DeleteCollectionModalProps) => {
  return (
    <div className="wc-delete-modal-overlay" onClick={onClose}>
      <div className="wc-delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wc-delete-modal-header">
          <div className="wc-delete-header-left">
            <div className="wc-delete-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <h2 className="wc-delete-modal-title">Delete Waste Collection</h2>
          </div>
          <button className="wc-delete-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="wc-delete-modal-body">
          <p className="wc-delete-message">
            Are you sure you want to delete the collection record for barcode <strong>{collection.barcode}</strong>?
          </p>
        </div>

        <div className="wc-delete-modal-footer">
          <button type="button" className="wc-delete-btn wc-delete-btn--cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="wc-delete-btn wc-delete-btn--delete" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete Collection'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WasteCollectionPage;

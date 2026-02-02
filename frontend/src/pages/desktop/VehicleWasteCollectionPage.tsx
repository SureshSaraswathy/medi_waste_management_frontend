import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { vehicleWasteCollectionService, VehicleWasteCollectionResponse, CreateVehicleWasteCollectionRequest, UpdateVehicleWasteCollectionRequest } from '../../services/vehicleWasteCollectionService';
import { fleetService, FleetResponse } from '../../services/fleetService';
import './vehicleWasteCollectionPage.css';
import '../desktop/dashboardPage.css';

interface VehicleWasteCollection {
  id: string;
  vehicleId: string;
  vehicleNum: string;
  collectionDate: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  incinerationWeightKg: number;
  autoclaveWeightKg: number;
  vehicleKm?: number | null;
  fuelUsageLiters?: number | null;
  status: 'Draft' | 'Submitted' | 'Verified';
  notes?: string | null;
  createdOn: string;
}

const VehicleWasteCollectionPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<VehicleWasteCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Master data
  const [vehicles, setVehicles] = useState<FleetResponse[]>([]);
  const [collections, setCollections] = useState<VehicleWasteCollection[]>([]);

  // Form state
  const [formData, setFormData] = useState<CreateVehicleWasteCollectionRequest & { editingId?: string; editingStatus?: 'Draft' | 'Submitted' | 'Verified' }>({
    vehicleId: '',
    collectionDate: new Date().toISOString().split('T')[0],
    grossWeightKg: 0,
    tareWeightKg: 0,
    netWeightKg: 0,
    incinerationWeightKg: 0,
    autoclaveWeightKg: 0,
    vehicleKm: null,
    fuelUsageLiters: null,
    notes: null,
  });

  // Load vehicles
  const loadVehicles = useCallback(async () => {
    try {
      const data = await fleetService.getAllFleets(undefined, true);
      setVehicles(data);
    } catch (err: any) {
      console.error('Failed to load vehicles:', err);
      setError('Failed to load vehicles');
    }
  }, []);

  // Load collections
  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = selectedDate;
      const endDate = selectedDate;
      
      const apiCollections = await vehicleWasteCollectionService.getAllCollections(
        undefined,
        startDate,
        endDate,
        statusFilter !== 'all' ? statusFilter : undefined
      );
      
      const mappedCollections: VehicleWasteCollection[] = apiCollections.map((apiCollection: VehicleWasteCollectionResponse) => {
        const vehicle = vehicles.find(v => v.id === apiCollection.vehicleId);
        return {
          id: apiCollection.id,
          vehicleId: apiCollection.vehicleId,
          vehicleNum: vehicle?.vehicleNum || 'Unknown',
          collectionDate: apiCollection.collectionDate,
          grossWeightKg: Number(apiCollection.grossWeightKg) || 0,
          tareWeightKg: Number(apiCollection.tareWeightKg) || 0,
          netWeightKg: Number(apiCollection.netWeightKg) || 0,
          incinerationWeightKg: Number(apiCollection.incinerationWeightKg) || 0,
          autoclaveWeightKg: Number(apiCollection.autoclaveWeightKg) || 0,
          vehicleKm: apiCollection.vehicleKm !== null && apiCollection.vehicleKm !== undefined ? Number(apiCollection.vehicleKm) : null,
          fuelUsageLiters: apiCollection.fuelUsageLiters !== null && apiCollection.fuelUsageLiters !== undefined ? Number(apiCollection.fuelUsageLiters) : null,
          status: apiCollection.status,
          notes: apiCollection.notes,
          createdOn: apiCollection.createdOn,
        };
      });
      setCollections(mappedCollections);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load collections';
      setError(errorMessage);
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter, vehicles]);

  // Load data on mount
  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  // Load collections when dependencies are ready
  useEffect(() => {
    if (vehicles.length > 0) {
      loadCollections();
    }
  }, [selectedDate, statusFilter, vehicles, loadCollections]);

  // Calculate net weight automatically
  useEffect(() => {
    const net = formData.grossWeightKg - formData.tareWeightKg;
    if (net >= 0) {
      setFormData(prev => ({ ...prev, netWeightKg: net }));
    }
  }, [formData.grossWeightKg, formData.tareWeightKg]);

  // Removed validation warning - net weight validation handled by backend

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.vehicleId) {
      setError('Please select a vehicle');
      return;
    }
    if (formData.grossWeightKg < formData.tareWeightKg) {
      setError('Gross weight must be greater than or equal to tare weight');
      return;
    }
    // Net weight validation removed - backend will handle validation

    try {
      setLoading(true);
      setError(null);

      if (formData.editingId) {
        const updateData: UpdateVehicleWasteCollectionRequest = {
          grossWeightKg: formData.grossWeightKg,
          tareWeightKg: formData.tareWeightKg,
          netWeightKg: formData.netWeightKg,
          incinerationWeightKg: formData.incinerationWeightKg,
          autoclaveWeightKg: formData.autoclaveWeightKg,
          vehicleKm: formData.vehicleKm !== null && formData.vehicleKm !== undefined ? Number(formData.vehicleKm) : null,
          fuelUsageLiters: formData.fuelUsageLiters !== null && formData.fuelUsageLiters !== undefined ? Number(formData.fuelUsageLiters) : null,
          notes: formData.notes,
        };
        await vehicleWasteCollectionService.updateCollection(formData.editingId, updateData);
        setSuccessMessage('Collection updated successfully');
      } else {
        const createData: CreateVehicleWasteCollectionRequest = {
          vehicleId: formData.vehicleId,
          collectionDate: formData.collectionDate,
          grossWeightKg: Number(formData.grossWeightKg),
          tareWeightKg: Number(formData.tareWeightKg),
          netWeightKg: Number(formData.netWeightKg),
          incinerationWeightKg: Number(formData.incinerationWeightKg),
          autoclaveWeightKg: Number(formData.autoclaveWeightKg),
          vehicleKm: formData.vehicleKm !== null && formData.vehicleKm !== undefined ? Number(formData.vehicleKm) : null,
          fuelUsageLiters: formData.fuelUsageLiters !== null && formData.fuelUsageLiters !== undefined ? Number(formData.fuelUsageLiters) : null,
          notes: formData.notes,
        };
        await vehicleWasteCollectionService.createCollection(createData);
        setSuccessMessage('Collection created successfully');
      }

      await loadCollections();
      setShowFormModal(false);
      resetForm();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save collection';
      setError(errorMessage);
      console.error('Error saving collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (collectionId: string, action: 'submit' | 'verify') => {
    try {
      setLoading(true);
      setError(null);
      if (action === 'submit') {
        await vehicleWasteCollectionService.submitCollection(collectionId);
        setSuccessMessage('Collection submitted successfully');
      } else {
        await vehicleWasteCollectionService.verifyCollection(collectionId);
        setSuccessMessage('Collection verified successfully');
      }
      await loadCollections();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      setError(errorMessage);
      console.error('Error updating status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (collectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this collection?')) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await vehicleWasteCollectionService.deleteCollection(collectionId);
      setSuccessMessage('Collection deleted successfully');
      await loadCollections();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete collection';
      setError(errorMessage);
      console.error('Error deleting collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (collection: VehicleWasteCollection) => {
    setFormData({
      vehicleId: collection.vehicleId,
      collectionDate: collection.collectionDate,
      grossWeightKg: collection.grossWeightKg,
      tareWeightKg: collection.tareWeightKg,
      netWeightKg: collection.netWeightKg,
      incinerationWeightKg: collection.incinerationWeightKg,
      autoclaveWeightKg: collection.autoclaveWeightKg,
      vehicleKm: collection.vehicleKm,
      fuelUsageLiters: collection.fuelUsageLiters,
      notes: collection.notes,
      editingId: collection.id,
      editingStatus: collection.status,
    });
    setShowFormModal(true);
  };

  const handleViewDetails = (collection: VehicleWasteCollection) => {
    setSelectedCollection(collection);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      collectionDate: new Date().toISOString().split('T')[0],
      grossWeightKg: 0,
      tareWeightKg: 0,
      netWeightKg: 0,
      incinerationWeightKg: 0,
      autoclaveWeightKg: 0,
      vehicleKm: null,
      fuelUsageLiters: null,
      notes: null,
      editingId: undefined,
      editingStatus: undefined,
    });
  };

  // Filter collections by search query
  const filteredCollections = collections.filter((collection) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        collection.vehicleNum.toLowerCase().includes(query);
      
      if (!matchesSearch) {
        return false;
      }
    }
    
    return true;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'status-badge status-badge--draft';
      case 'Submitted':
        return 'status-badge status-badge--submitted';
      case 'Verified':
        return 'status-badge status-badge--verified';
      default:
        return 'status-badge';
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

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Transaction / Vehicle Waste Collection</span>
          </div>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div className="success-banner">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} aria-label="Close success message">×</button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Close error message">×</button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !collections.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading collections...
          </div>
        )}

        <div className="vehicle-waste-collection-page">
          <div className="vehicle-waste-collection-header">
            <h1 className="vehicle-waste-collection-title">Vehicle Waste Collection</h1>
          </div>

          {/* Filters */}
          <div className="vehicle-waste-collection-filters">
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
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Verified">Verified</option>
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
                  placeholder="Search by vehicle number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
            <div className="filter-group filter-group--action">
              <label>&nbsp;</label>
              <button className="add-collection-btn" onClick={() => { resetForm(); setShowFormModal(true); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Collection
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            {filteredCollections.length === 0 ? (
              <div className="empty-state">
                <p>No collections found</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Gross Weight (kg)</th>
                    <th>Tare Weight (kg)</th>
                    <th>Net Weight (kg)</th>
                    <th>Incineration (kg)</th>
                    <th>Autoclave (kg)</th>
                    <th>KM</th>
                    <th>Fuel (L)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollections.map((collection) => (
                    <tr key={collection.id}>
                      <td>{new Date(collection.collectionDate).toLocaleDateString()}</td>
                      <td>{collection.vehicleNum}</td>
                      <td>{collection.grossWeightKg.toFixed(2)}</td>
                      <td>{collection.tareWeightKg.toFixed(2)}</td>
                      <td>{collection.netWeightKg.toFixed(2)}</td>
                      <td>{collection.incinerationWeightKg.toFixed(2)}</td>
                      <td>{collection.autoclaveWeightKg.toFixed(2)}</td>
                      <td>{collection.vehicleKm?.toFixed(2) || '-'}</td>
                      <td>{collection.fuelUsageLiters?.toFixed(2) || '-'}</td>
                      <td>
                        <span className={getStatusBadgeClass(collection.status)}>
                          {collection.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-icon"
                            onClick={() => handleViewDetails(collection)}
                            title="View Details"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          {collection.status === 'Draft' && (
                            <>
                              <button
                                className="btn btn-icon"
                                onClick={() => handleEdit(collection)}
                                title="Edit"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className="btn btn-icon"
                                onClick={() => handleStatusChange(collection.id, 'submit')}
                                title="Submit"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </button>
                              <button
                                className="btn btn-icon btn-icon--danger"
                                onClick={() => handleDelete(collection.id)}
                                title="Delete"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </>
                          )}
                          {collection.status === 'Submitted' && (
                            <button
                              className="btn btn-icon"
                              onClick={() => handleStatusChange(collection.id, 'verify')}
                              title="Verify"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {filteredCollections.length > 0 && (
            <div className="table-footer">
              Showing {filteredCollections.length} of {collections.length} Items
            </div>
          )}
        </div>
      </main>

      {/* Form Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formData.editingId ? 'Edit Collection' : 'Add Collection'}</h2>
              <button className="modal-close" onClick={() => setShowFormModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="vehicleId">Vehicle *</label>
                  <select
                    id="vehicleId"
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    required
                    disabled={!!formData.editingId}
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.filter(v => v.status === 'Active').map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleNum}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="collectionDate">Collection Date *</label>
                  <input
                    id="collectionDate"
                    type="date"
                    value={formData.collectionDate}
                    onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                    required
                    disabled={!!formData.editingId}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="grossWeightKg">Gross Weight (kg) *</label>
                    <input
                      id="grossWeightKg"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.grossWeightKg}
                      onChange={(e) => setFormData({ ...formData, grossWeightKg: parseFloat(e.target.value) || 0 })}
                      required
                      disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="tareWeightKg">Tare Weight (kg) *</label>
                    <input
                      id="tareWeightKg"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.tareWeightKg}
                      onChange={(e) => setFormData({ ...formData, tareWeightKg: parseFloat(e.target.value) || 0 })}
                      required
                      disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="netWeightKg">Net Weight (kg) *</label>
                  <input
                    id="netWeightKg"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.netWeightKg.toFixed(2)}
                    readOnly
                    className="readonly-input"
                  />
                  <small>Auto-calculated: Gross - Tare</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="incinerationWeightKg">Incineration Weight (kg) *</label>
                    <input
                      id="incinerationWeightKg"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.incinerationWeightKg}
                      onChange={(e) => setFormData({ ...formData, incinerationWeightKg: parseFloat(e.target.value) || 0 })}
                      required
                      disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="autoclaveWeightKg">Autoclave Weight (kg) *</label>
                    <input
                      id="autoclaveWeightKg"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.autoclaveWeightKg}
                      onChange={(e) => setFormData({ ...formData, autoclaveWeightKg: parseFloat(e.target.value) || 0 })}
                      required
                      disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                    />
                  </div>
                </div>


                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="vehicleKm">Vehicle KM</label>
                    <input
                      id="vehicleKm"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.vehicleKm || ''}
                      onChange={(e) => setFormData({ ...formData, vehicleKm: e.target.value ? parseFloat(e.target.value) : null })}
                      disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="fuelUsageLiters">Fuel Usage (Liters)</label>
                    <input
                      id="fuelUsageLiters"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.fuelUsageLiters || ''}
                      onChange={(e) => setFormData({ ...formData, fuelUsageLiters: e.target.value ? parseFloat(e.target.value) : null })}
                      disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                    disabled={formData.editingId && formData.status !== 'Draft'}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCollection && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Collection Details</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Vehicle:</label>
                  <span>{selectedCollection.vehicleNum}</span>
                </div>
                <div className="detail-item">
                  <label>Collection Date:</label>
                  <span>{new Date(selectedCollection.collectionDate).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <label>Gross Weight:</label>
                  <span>{selectedCollection.grossWeightKg.toFixed(2)} kg</span>
                </div>
                <div className="detail-item">
                  <label>Tare Weight:</label>
                  <span>{selectedCollection.tareWeightKg.toFixed(2)} kg</span>
                </div>
                <div className="detail-item">
                  <label>Net Weight:</label>
                  <span>{selectedCollection.netWeightKg.toFixed(2)} kg</span>
                </div>
                <div className="detail-item">
                  <label>Incineration Weight:</label>
                  <span>{selectedCollection.incinerationWeightKg.toFixed(2)} kg</span>
                </div>
                <div className="detail-item">
                  <label>Autoclave Weight:</label>
                  <span>{selectedCollection.autoclaveWeightKg.toFixed(2)} kg</span>
                </div>
                <div className="detail-item">
                  <label>Vehicle KM:</label>
                  <span>{selectedCollection.vehicleKm?.toFixed(2) || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Fuel Usage:</label>
                  <span>{selectedCollection.fuelUsageLiters?.toFixed(2) || '-'} L</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={getStatusBadgeClass(selectedCollection.status)}>
                    {selectedCollection.status}
                  </span>
                </div>
                {selectedCollection.notes && (
                  <div className="detail-item detail-item--full">
                    <label>Notes:</label>
                    <span>{selectedCollection.notes}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleWasteCollectionPage;

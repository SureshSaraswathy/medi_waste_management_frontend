import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../services/permissionService';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { fleetService, FleetResponse } from '../../services/fleetService';
import { companyService, CompanyResponse } from '../../services/companyService';
import PageHeader from '../../components/layout/PageHeader';
import './fleetManagementPage.css';
import '../desktop/dashboardPage.css';

interface Fleet {
  id: string;
  companyName: string;
  vehicleNum: string;
  capacity: string;
  vehMake: string;
  vehModel: string;
  mfgYear: string;
  nextFCDate: string;
  pucDateValidUpto: string;
  insuranceValidUpto: string;
  ownerName: string;
  ownerContact: string;
  ownerEmail: string;
  ownerPAN: string;
  ownerAadhaar: string;
  pymtToName: string;
  pymtBankName: string;
  pymtAccNum: string;
  pymtIFSCode: string;
  pymtBranch: string;
  contractAmount: string;
  tdsExemption: boolean;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

const FleetManagementPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const canCreate = hasPermission(Array.isArray(permissions) ? permissions : [], 'FLEET_CREATE');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFleet, setEditingFleet] = useState<Fleet | null>(null);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  interface AdvancedFilters {
    vehicleNum: string;
    companyName: string;
    ownerName: string;
  }
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    vehicleNum: '',
    companyName: '',
    ownerName: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Load companies from API
  const loadCompanies = async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true);
      const mappedCompanies: Company[] = apiCompanies.map((apiCompany: CompanyResponse) => ({
        id: apiCompany.id,
        companyCode: apiCompany.companyCode,
        companyName: apiCompany.companyName,
        status: apiCompany.status,
      }));
      setCompanies(mappedCompanies);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  // Load fleets from API
  const loadFleets = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFleets = await fleetService.getAllFleets(undefined, true);
      const mappedFleets: Fleet[] = apiFleets.map((apiFleet: FleetResponse) => {
        const company = companies.find(c => c.id === apiFleet.companyId);
        return {
          id: apiFleet.id,
          companyName: company?.companyName || 'Unknown Company',
          vehicleNum: apiFleet.vehicleNum,
          capacity: apiFleet.capacity || '',
          vehMake: apiFleet.vehMake || '',
          vehModel: apiFleet.vehModel || '',
          mfgYear: apiFleet.mfgYear || '',
          nextFCDate: apiFleet.nextFCDate || '',
          pucDateValidUpto: apiFleet.pucDateValidUpto || '',
          insuranceValidUpto: apiFleet.insuranceValidUpto || '',
          ownerName: apiFleet.ownerName || '',
          ownerContact: apiFleet.ownerContact || '',
          ownerEmail: apiFleet.ownerEmail || '',
          ownerPAN: apiFleet.ownerPAN || '',
          ownerAadhaar: apiFleet.ownerAadhaar || '',
          pymtToName: apiFleet.pymtToName || '',
          pymtBankName: apiFleet.pymtBankName || '',
          pymtAccNum: apiFleet.pymtAccNum || '',
          pymtIFSCode: apiFleet.pymtIFSCode || '',
          pymtBranch: apiFleet.pymtBranch || '',
          contractAmount: apiFleet.contractAmount || '',
          tdsExemption: apiFleet.tdsExemption || false,
          status: apiFleet.status,
          createdBy: apiFleet.createdBy || '',
          createdOn: apiFleet.createdOn,
          modifiedBy: apiFleet.modifiedBy || '',
          modifiedOn: apiFleet.modifiedOn,
        };
      });
      setFleets(mappedFleets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load fleets';
      setError(errorMessage);
      console.error('Error loading fleets:', err);
      setFleets([]);
    } finally {
      setLoading(false);
    }
  };

  // Load companies first, then fleets
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
    };
    initializeData();
  }, []);

  // Load fleets when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadFleets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies.length]);

  const filteredFleets = fleets.filter(fleet => {
    const query = searchQuery.trim().toLowerCase();
    const vehicleQuery = advancedFilters.vehicleNum.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    const ownerQuery = advancedFilters.ownerName.trim().toLowerCase();
    
    const matchesSearch = !query ||
      fleet.companyName.toLowerCase().includes(query) ||
      fleet.vehicleNum.toLowerCase().includes(query) ||
      fleet.vehMake.toLowerCase().includes(query) ||
      fleet.vehModel.toLowerCase().includes(query) ||
      fleet.ownerName.toLowerCase().includes(query);
    
    const matchesVehicle = !vehicleQuery || fleet.vehicleNum.toLowerCase().includes(vehicleQuery);
    const matchesCompany = !companyQuery || fleet.companyName.toLowerCase().includes(companyQuery);
    const matchesOwner = !ownerQuery || fleet.ownerName.toLowerCase().includes(ownerQuery);
    const matchesStatus = statusFilter === 'all' || fleet.status === statusFilter;
    
    return matchesSearch && matchesVehicle && matchesCompany && matchesOwner && matchesStatus;
  });

  const handleAdd = () => {
    setEditingFleet(null);
    setShowModal(true);
  };

  const handleEdit = (fleet: Fleet) => {
    setEditingFleet(fleet);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this fleet vehicle?')) {
      try {
        setLoading(true);
        await fleetService.deleteFleet(id);
        await loadFleets();
        alert('Fleet deleted successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete fleet';
        alert(`Error: ${errorMessage}`);
        console.error('Error deleting fleet:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<Fleet>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Find company ID from company name
      const selectedCompany = companies.find(c => c.companyName === data.companyName);
      if (!selectedCompany) {
        alert('Please select a valid company');
        return;
      }

      if (editingFleet) {
        // Update existing - vehicleNum and companyId are immutable
        await fleetService.updateFleet(editingFleet.id, {
          capacity: data.capacity,
          vehMake: data.vehMake,
          vehModel: data.vehModel,
          mfgYear: data.mfgYear,
          nextFCDate: data.nextFCDate,
          pucDateValidUpto: data.pucDateValidUpto,
          insuranceValidUpto: data.insuranceValidUpto,
          ownerName: data.ownerName,
          ownerContact: data.ownerContact,
          ownerEmail: data.ownerEmail,
          ownerPAN: data.ownerPAN,
          ownerAadhaar: data.ownerAadhaar,
          pymtToName: data.pymtToName,
          pymtBankName: data.pymtBankName,
          pymtAccNum: data.pymtAccNum,
          pymtIFSCode: data.pymtIFSCode,
          pymtBranch: data.pymtBranch,
          contractAmount: data.contractAmount,
          tdsExemption: data.tdsExemption,
          status: data.status,
        });
        alert('Fleet updated successfully');
      } else {
        // Add new
        if (!data.vehicleNum || !data.companyName) {
          alert('Please fill in Vehicle Number and Company Name');
          return;
        }
        await fleetService.createFleet({
          companyId: selectedCompany.id,
          vehicleNum: data.vehicleNum,
          capacity: data.capacity,
          vehMake: data.vehMake,
          vehModel: data.vehModel,
          mfgYear: data.mfgYear,
          nextFCDate: data.nextFCDate,
          pucDateValidUpto: data.pucDateValidUpto,
          insuranceValidUpto: data.insuranceValidUpto,
          ownerName: data.ownerName,
          ownerContact: data.ownerContact,
          ownerEmail: data.ownerEmail,
          ownerPAN: data.ownerPAN,
          ownerAadhaar: data.ownerAadhaar,
          pymtToName: data.pymtToName,
          pymtBankName: data.pymtBankName,
          pymtAccNum: data.pymtAccNum,
          pymtIFSCode: data.pymtIFSCode,
          pymtBranch: data.pymtBranch,
          contractAmount: data.contractAmount,
          tdsExemption: data.tdsExemption,
        });
        alert('Fleet created successfully');
      }
      
      setShowModal(false);
      setEditingFleet(null);
      await loadFleets();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save fleet';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Error saving fleet:', err);
    } finally {
      setLoading(false);
    }
  };

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
        <PageHeader 
          title="Fleet Management"
          subtitle="Manage fleet and vehicle master data"
        />

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fee', 
            color: '#c33', 
            marginBottom: '16px', 
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
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
                padding: '0 8px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !fleets.length && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading fleets...
          </div>
        )}

        <div className="fleet-management-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
                <polygon points="12 15 17 21 7 21 12 15"></polygon>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Fleet Management</h1>
              <p className="ra-page-subtitle">Manage fleet vehicles and details</p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="ra-search-actions">
            <div className="ra-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                placeholder="Search by vehicle number, company, owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ra-search-input"
              />
            </div>
            <div className="ra-actions">
              <button className="ra-filter-btn" onClick={() => setShowAdvancedFilters(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Advanced Filter
              </button>
              {canCreate && (
                <button className="ra-add-btn" onClick={handleAdd}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Vehicle
                </button>
              )}
            </div>
          </div>

          {/* Fleets Table */}
          <div className="fleet-management-table-container">
            <table className="fleet-management-table">
              <thead>
                <tr>
                  <th>COMPANY NAME</th>
                  <th>VEHICLE NUMBER</th>
                  <th>MAKE</th>
                  <th>MODEL</th>
                  <th>CAPACITY</th>
                  <th>OWNER NAME</th>
                  <th>OWNER CONTACT</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredFleets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      {loading ? 'Loading...' : 'No fleet records found'}
                    </td>
                  </tr>
                ) : (
                  filteredFleets.map((fleet) => (
                    <tr key={fleet.id}>
                      <td>{fleet.companyName || '-'}</td>
                      <td>{fleet.vehicleNum || '-'}</td>
                      <td>{fleet.vehMake || '-'}</td>
                      <td>{fleet.vehModel || '-'}</td>
                      <td>{fleet.capacity || '-'}</td>
                      <td>{fleet.ownerName || '-'}</td>
                      <td>{fleet.ownerContact || '-'}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge status-badge--${fleet.status.toLowerCase()}`}>
                            {fleet.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => handleEdit(fleet)}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(fleet)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(fleet.id)}
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

          {/* Pagination Info */}
          <div className="cm-pagination-info">
            Showing {filteredFleets.length} of {fleets.length} items
          </div>
        </div>
      </main>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          statusFilter={statusFilter}
          advancedFilters={advancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setAdvancedFilters({ vehicleNum: '', companyName: '', ownerName: '' });
            setStatusFilter('all');
            setSearchQuery('');
          }}
          onApply={(payload) => {
            setStatusFilter(payload.statusFilter);
            setAdvancedFilters(payload.advancedFilters);
            setShowAdvancedFilters(false);
          }}
        />
      )}

      {/* Fleet Add/Edit Modal */}
      {showModal && (
        <FleetFormModal
          fleet={editingFleet}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingFleet(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Advanced Filters Modal Component
interface AdvancedFiltersModalProps {
  statusFilter: string;
  advancedFilters: AdvancedFilters;
  onClose: () => void;
  onClear: () => void;
  onApply: (payload: { statusFilter: string; advancedFilters: AdvancedFilters }) => void;
}

const AdvancedFiltersModal = ({
  statusFilter,
  advancedFilters,
  onClose,
  onClear,
  onApply,
}: AdvancedFiltersModalProps) => {
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draft, setDraft] = useState<AdvancedFilters>(advancedFilters);

  return (
    <div className="modal-overlay cm-filter-modal-overlay" onClick={onClose}>
      <div className="modal-content cm-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-filter-modal-header">
          <div className="cm-filter-modal-titlewrap">
            <div className="cm-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </div>
            <div>
              <div className="cm-filter-title">Advanced Filters</div>
              <div className="cm-filter-subtitle">Filter fleets by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>Vehicle Number</label>
              <input
                type="text"
                value={draft.vehicleNum}
                onChange={(e) => setDraft({ ...draft, vehicleNum: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter vehicle number"
              />
            </div>

            <div className="cm-filter-field">
              <label>Company Name</label>
              <input
                type="text"
                value={draft.companyName}
                onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter company name"
              />
            </div>

            <div className="cm-filter-field">
              <label>Owner Name</label>
              <input
                type="text"
                value={draft.ownerName}
                onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter owner name"
              />
            </div>

            <div className="cm-filter-field">
              <label>Status</label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="cm-filter-select"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="cm-filter-modal-footer">
          <button
            type="button"
            className="cm-link-btn"
            onClick={() => {
              setDraftStatus('all');
              setDraft({ vehicleNum: '', companyName: '', ownerName: '' });
              onClear();
            }}
          >
            Clear Filters
          </button>
          <button
            type="button"
            className="cm-btn cm-btn--primary cm-btn--sm"
            onClick={() =>
              onApply({
                statusFilter: draftStatus,
                advancedFilters: draft,
              })
            }
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

// Fleet Form Modal Component
interface FleetFormModalProps {
  fleet: Fleet | null;
  companies: Company[];
  onClose: () => void;
  onSave: (data: Partial<Fleet>) => void;
}

const FleetFormModal = ({ fleet, companies, onClose, onSave }: FleetFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Fleet>>(
    fleet || {
      companyName: '',
      vehicleNum: '',
      capacity: '',
      vehMake: '',
      vehModel: '',
      mfgYear: '',
      nextFCDate: '',
      pucDateValidUpto: '',
      insuranceValidUpto: '',
      ownerName: '',
      ownerContact: '',
      ownerEmail: '',
      ownerPAN: '',
      ownerAadhaar: '',
      pymtToName: '',
      pymtBankName: '',
      pymtAccNum: '',
      pymtIFSCode: '',
      pymtBranch: '',
      contractAmount: '',
      tdsExemption: false,
      status: 'Active',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{fleet ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="fleet-form" onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.companyName}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Vehicle Number *</label>
                <input
                  type="text"
                  value={formData.vehicleNum || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleNum: e.target.value })}
                  required
                  placeholder="e.g., MH-01-AB-1234"
                />
              </div>
              <div className="form-group">
                <label>Capacity *</label>
                <input
                  type="text"
                  value={formData.capacity || ''}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  required
                  placeholder="Enter capacity in kg"
                />
              </div>
              <div className="form-group">
                <label>Vehicle Make *</label>
                <input
                  type="text"
                  value={formData.vehMake || ''}
                  onChange={(e) => setFormData({ ...formData, vehMake: e.target.value })}
                  required
                  placeholder="e.g., Tata, Mahindra"
                />
              </div>
              <div className="form-group">
                <label>Vehicle Model *</label>
                <input
                  type="text"
                  value={formData.vehModel || ''}
                  onChange={(e) => setFormData({ ...formData, vehModel: e.target.value })}
                  required
                  placeholder="e.g., 407, Bolero"
                />
              </div>
              <div className="form-group">
                <label>Manufacturing Year</label>
                <input
                  type="text"
                  value={formData.mfgYear || ''}
                  onChange={(e) => setFormData({ ...formData, mfgYear: e.target.value })}
                  placeholder="e.g., 2020"
                />
              </div>
            </div>
          </div>

          {/* Compliance Dates */}
          <div className="form-section">
            <h3 className="form-section-title">Compliance Dates</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Next FC Date</label>
                <input
                  type="date"
                  value={formData.nextFCDate || ''}
                  onChange={(e) => setFormData({ ...formData, nextFCDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>PUC Date Valid Upto</label>
                <input
                  type="date"
                  value={formData.pucDateValidUpto || ''}
                  onChange={(e) => setFormData({ ...formData, pucDateValidUpto: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Insurance Valid Upto</label>
                <input
                  type="date"
                  value={formData.insuranceValidUpto || ''}
                  onChange={(e) => setFormData({ ...formData, insuranceValidUpto: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Owner Information */}
          <div className="form-section">
            <h3 className="form-section-title">Owner Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Owner Name *</label>
                <input
                  type="text"
                  value={formData.ownerName || ''}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Owner Contact *</label>
                <input
                  type="tel"
                  value={formData.ownerContact || ''}
                  onChange={(e) => setFormData({ ...formData, ownerContact: e.target.value })}
                  required
                  placeholder="+91-9876543210"
                />
              </div>
              <div className="form-group">
                <label>Owner Email</label>
                <input
                  type="email"
                  value={formData.ownerEmail || ''}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  placeholder="owner@example.com"
                />
              </div>
              <div className="form-group">
                <label>Owner PAN</label>
                <input
                  type="text"
                  value={formData.ownerPAN || ''}
                  onChange={(e) => setFormData({ ...formData, ownerPAN: e.target.value })}
                  placeholder="ABCDE1234F"
                />
              </div>
              <div className="form-group">
                <label>Owner Aadhaar</label>
                <input
                  type="text"
                  value={formData.ownerAadhaar || ''}
                  onChange={(e) => setFormData({ ...formData, ownerAadhaar: e.target.value })}
                  placeholder="1234-5678-9012"
                />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="form-section">
            <h3 className="form-section-title">Payment Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Payment To Name</label>
                <input
                  type="text"
                  value={formData.pymtToName || ''}
                  onChange={(e) => setFormData({ ...formData, pymtToName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  value={formData.pymtBankName || ''}
                  onChange={(e) => setFormData({ ...formData, pymtBankName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  value={formData.pymtAccNum || ''}
                  onChange={(e) => setFormData({ ...formData, pymtAccNum: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>IFSC Code</label>
                <input
                  type="text"
                  value={formData.pymtIFSCode || ''}
                  onChange={(e) => setFormData({ ...formData, pymtIFSCode: e.target.value })}
                  placeholder="SBIN0001234"
                />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input
                  type="text"
                  value={formData.pymtBranch || ''}
                  onChange={(e) => setFormData({ ...formData, pymtBranch: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contract Amount</label>
                <input
                  type="text"
                  value={formData.contractAmount || ''}
                  onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
                  placeholder="Enter amount"
                />
              </div>
              <div className="form-group">
                <label>TDS Exemption</label>
                <select
                  value={formData.tdsExemption ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, tdsExemption: e.target.value === 'true' })}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || 'Active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {fleet ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FleetManagementPage;

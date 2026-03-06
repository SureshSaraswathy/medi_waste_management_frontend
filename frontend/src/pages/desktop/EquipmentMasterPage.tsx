import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { equipmentService, EquipmentResponse } from '../../services/equipmentService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import PageHeader from '../../components/layout/PageHeader';
import '../desktop/dashboardPage.css';
import './equipmentMasterPage.css';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';

interface Equipment {
  id: string;
  companyId: string;
  companyName?: string;
  equipmentCode: string;
  equipmentName: string;
  equipmentType?: string | null;
  make?: string | null;
  capacity?: string | null;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const EQUIPMENT_TYPES = [
  'Incinerator',
  'Autoclave',
  'Shredder',
  'ETP Pump',
  'DG Set',
];

const EquipmentMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  interface AdvancedFilters {
    equipmentCode: string;
    equipmentName: string;
    companyName: string;
    equipmentType: string;
  }
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    equipmentCode: '',
    equipmentName: '',
    companyName: '',
    equipmentType: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load companies from API
  const loadCompanies = async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true);
      setCompanies(apiCompanies);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  // Load equipment from API
  const loadEquipment = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiEquipment = await equipmentService.getAllEquipment(true);
      const mappedEquipment: Equipment[] = apiEquipment.map((apiEquip: EquipmentResponse) => {
        let companyName = '';
        if (apiEquip.companyId) {
          const company = companies.find(c => c.id === apiEquip.companyId);
          companyName = company?.companyName || '';
        }
        return {
          id: apiEquip.id,
          companyId: apiEquip.companyId,
          companyName: companyName,
          equipmentCode: apiEquip.equipmentCode,
          equipmentName: apiEquip.equipmentName,
          equipmentType: apiEquip.equipmentType,
          make: apiEquip.make,
          capacity: apiEquip.capacity,
          status: apiEquip.status,
          createdBy: apiEquip.createdBy || '',
          createdOn: apiEquip.createdOn,
          modifiedBy: apiEquip.modifiedBy || '',
          modifiedOn: apiEquip.modifiedOn,
        };
      });
      setEquipment(mappedEquipment);
    } catch (err: any) {
      // Handle endpoint not found gracefully
      if (err?.isEndpointMissing || err?.status === 404) {
        console.warn('⚠️ Equipment API endpoint not found. Backend needs to implement: GET /api/v1/equipment');
        setEquipment([]);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load equipment';
        setError(errorMessage);
        console.error('Error loading equipment:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load companies first, then equipment
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
    };
    initializeData();
  }, []);

  // Load equipment when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadEquipment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies]);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredEquipment = equipment.filter(eq => {
    const query = searchQuery.trim().toLowerCase();
    const codeQuery = advancedFilters.equipmentCode.trim().toLowerCase();
    const nameQuery = advancedFilters.equipmentName.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    const typeQuery = advancedFilters.equipmentType.trim().toLowerCase();
    
    const matchesSearch = !query ||
      eq.equipmentName.toLowerCase().includes(query) ||
      eq.equipmentCode.toLowerCase().includes(query) ||
      (eq.companyName || '').toLowerCase().includes(query) ||
      (eq.equipmentType || '').toLowerCase().includes(query);
    
    const matchesCode = !codeQuery || eq.equipmentCode.toLowerCase().includes(codeQuery);
    const matchesName = !nameQuery || eq.equipmentName.toLowerCase().includes(nameQuery);
    const matchesCompany = !companyQuery || (eq.companyName || '').toLowerCase().includes(companyQuery);
    const matchesType = !typeQuery || (eq.equipmentType || '').toLowerCase().includes(typeQuery);
    const matchesStatus = statusFilter === 'all' || eq.status === statusFilter;
    
    return matchesSearch && matchesCode && matchesName && matchesCompany && matchesType && matchesStatus;
  });

  const handleAdd = () => {
    setEditingEquipment(null);
    setShowModal(true);
  };

  const handleEdit = (equip: Equipment) => {
    setEditingEquipment(equip);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      try {
        setLoading(true);
        
        // Validate deletion using validation service
        const { validateEquipmentDelete } = await import('../../utils/deleteValidationService');
        const validation = await validateEquipmentDelete(id);
        if (!validation.canDelete) {
          toast.error(validation.message);
          setLoading(false);
          return;
        }
        
        await equipmentService.deleteEquipment(id);
        await loadEquipment(); // Reload equipment after deletion
        toast.success('Equipment deleted successfully', {
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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete equipment';
        toast.error(`Error: ${errorMessage}`);
        console.error('Error deleting equipment:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: Partial<Equipment>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (editingEquipment) {
        // Update existing
        await equipmentService.updateEquipment(editingEquipment.id, {
          companyId: formData.companyId,
          equipmentType: formData.equipmentType,
          make: formData.make,
          capacity: formData.capacity,
          status: formData.status,
        });
        toast.success('Equipment updated successfully', {
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
      } else {
        // Add new
        if (!formData.equipmentCode || !formData.equipmentName || !formData.equipmentType || !formData.companyId) {
          toast.error('Please complete the required fields.');
          return;
        }
        await equipmentService.createEquipment({
          companyId: formData.companyId!,
          equipmentCode: formData.equipmentCode,
          equipmentName: formData.equipmentName,
          equipmentType: formData.equipmentType!,
          make: formData.make,
          capacity: formData.capacity,
        });
        toast.success('Equipment created successfully', {
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
      }
      
      setShowModal(false);
      setEditingEquipment(null);
      await loadEquipment(); // Reload equipment after save
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save equipment';
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        toast.error('Equipment Code already exists.');
      } else {
        setError(errorMessage);
        toast.error(`Error: ${errorMessage}`);
      }
      console.error('Error saving equipment:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
      <aside className={`dashboard-sidebar sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
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
          <NotificationBell variant="sidebar" />
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

      {/* Main Content */}
      <main className="dashboard-main">
        <PageHeader 
          title="Equipment Master"
          subtitle="Manage equipment master data"
        />

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '16px 20px', 
            background: '#fff3cd', 
            color: '#856404', 
            marginBottom: '20px', 
            borderRadius: '8px',
            border: '1px solid #ffc107',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>
                  <strong style={{ fontSize: '14px', fontWeight: 600 }}>Error</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', lineHeight: '1.5' }}>
                    {error}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setError(null)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#856404', 
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '0',
                  lineHeight: '1',
                  flexShrink: 0
                }}
                aria-label="Close error message"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !equipment.length && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading equipment...
          </div>
        )}

        <div className="equipment-master-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Equipment Master</h1>
              <p className="ra-page-subtitle">Manage equipment information and details</p>
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
                placeholder="Search by equipment code, name, company, type..."
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
              <button className="ra-add-btn" onClick={handleAdd}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Equipment
              </button>
            </div>
          </div>

          {/* Equipment Table */}
          <div className="equipment-master-table-container">
            <table className="equipment-master-table">
              <thead>
                <tr>
                  <th>EQUIPMENT CODE</th>
                  <th>EQUIPMENT NAME</th>
                  <th>COMPANY</th>
                  <th>EQUIPMENT TYPE</th>
                  <th>MAKE</th>
                  <th>CAPACITY</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-message">
                      {loading ? 'Loading...' : 'No equipment found'}
                    </td>
                  </tr>
                ) : (
                  filteredEquipment.map((equip) => (
                    <tr key={equip.id}>
                      <td>{equip.equipmentCode || '-'}</td>
                      <td>{equip.equipmentName || '-'}</td>
                      <td>{equip.companyName || '-'}</td>
                      <td>{equip.equipmentType || '-'}</td>
                      <td>{equip.make || '-'}</td>
                      <td>{equip.capacity || '-'}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge status-badge--${equip.status.toLowerCase()}`}>
                            {equip.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => handleEdit(equip)}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(equip)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(equip.id)}
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
            Showing {filteredEquipment.length} of {equipment.length} items
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
            setAdvancedFilters({ equipmentCode: '', equipmentName: '', companyName: '', equipmentType: '' });
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

      {/* Add/Edit Modal */}
      {showModal && (
        <EquipmentFormModal
          equipment={editingEquipment}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingEquipment(null);
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
              <div className="cm-filter-subtitle">Filter equipment by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>Equipment Code</label>
              <input
                type="text"
                value={draft.equipmentCode}
                onChange={(e) => setDraft({ ...draft, equipmentCode: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter equipment code"
              />
            </div>

            <div className="cm-filter-field">
              <label>Equipment Name</label>
              <input
                type="text"
                value={draft.equipmentName}
                onChange={(e) => setDraft({ ...draft, equipmentName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter equipment name"
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
              <label>Equipment Type</label>
              <input
                type="text"
                value={draft.equipmentType}
                onChange={(e) => setDraft({ ...draft, equipmentType: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter equipment type"
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
              setDraft({ equipmentCode: '', equipmentName: '', companyName: '', equipmentType: '' });
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

// Equipment Form Modal Component
interface EquipmentFormModalProps {
  equipment: Equipment | null;
  companies: CompanyResponse[];
  onClose: () => void;
  onSave: (data: Partial<Equipment>) => void;
}

const EquipmentFormModal = ({ equipment, companies, onClose, onSave }: EquipmentFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Equipment>>(
    equipment || {
      companyId: '',
      equipmentCode: '',
      equipmentName: '',
      equipmentType: '',
      make: '',
      capacity: '',
      status: 'Active',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay ra-assignment-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-assignment-modal template-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <div className="ra-assignment-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <div>
              <h2 className="modal-title ra-assignment-modal-title">{equipment ? 'Edit Equipment' : 'Add Equipment'}</h2>
              <p className="ra-assignment-modal-subtitle">{equipment ? 'Update equipment details.' : 'Create a new equipment record.'}</p>
            </div>
          </div>
          <button className="modal-close-btn ra-assignment-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="equipment-form ra-assignment-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid ra-assignment-form-grid">
              <div className="form-group">
                <label>Company *</label>
                <select
                  value={formData.companyId || ''}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  required
                  disabled={!!equipment}
                  style={equipment ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
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
                <label>Equipment Code *</label>
                <input
                  type="text"
                  value={formData.equipmentCode || ''}
                  onChange={(e) => setFormData({ ...formData, equipmentCode: e.target.value })}
                  required
                  maxLength={20}
                  disabled={!!equipment}
                  style={equipment ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Equipment Name *</label>
                <input
                  type="text"
                  value={formData.equipmentName || ''}
                  onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                  required
                  maxLength={50}
                  disabled={!!equipment}
                  style={equipment ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Equipment Type *</label>
                <select
                  value={formData.equipmentType || ''}
                  onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
                  required
                >
                  <option value="">Select Equipment Type</option>
                  {EQUIPMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Make</label>
                <input
                  type="text"
                  value={formData.make || ''}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  maxLength={30}
                />
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="text"
                  value={formData.capacity || ''}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  maxLength={30}
                />
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

          <div className="modal-footer ra-assignment-modal-footer">
            <button type="button" className="btn btn--secondary ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary ra-assignment-btn ra-assignment-btn--primary">
              {equipment ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EquipmentMasterPage;

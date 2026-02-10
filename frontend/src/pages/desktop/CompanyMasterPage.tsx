import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { companyService, CompanyResponse } from '../../services/companyService';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import '../desktop/dashboardPage.css';
import './companyMasterPage.css';

interface State {
  id: string;
  stateCode: string;
  stateName: string;
  status: 'Active' | 'Inactive';
}

interface PCBZone {
  id: string;
  pcbZoneName: string;
  pcbZoneAddress: string;
  contactNum: string;
  contactEmail: string;
  alertEmail: string;
  status: 'Active' | 'Inactive';
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  regdOfficeAddress: string;
  adminOfficeAddress: string;
  factoryAddress: string;
  gstin: string;
  state: string;
  pincode: string;
  prefix: string;
  authPersonName: string;
  authPersonDesignation: string;
  authPersonDOB: string;
  pcbauthNum: string;
  ctoWaterNum: string;
  ctoWaterDate: string;
  ctoWaterValidUpto: string;
  ctoAirNum: string;
  ctoAirDate: string;
  ctoAirValidUpto: string;
  cteWaterNum: string;
  cteWaterDate: string;
  cteWaterValidUpto: string;
  cteAirNum: string;
  cteAirDate: string;
  cteAirValidUpto: string;
  hazardousWasteNum: string;
  pcbZoneID: string;
  gstValidFrom: string;
  gstRate: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const CompanyMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  interface AdvancedFilters {
    companyCode: string;
    companyName: string;
    gstin: string;
    state: string;
    pcbZone: string;
  }
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    companyCode: '',
    companyName: '',
    gstin: '',
    state: '',
    pcbZone: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // States from State Master - Load active states only
  const [states] = useState<State[]>([
    {
      id: '1',
      stateCode: 'MH',
      stateName: 'Maharashtra',
      status: 'Active',
    },
    {
      id: '2',
      stateCode: 'DL',
      stateName: 'Delhi',
      status: 'Active',
    },
    {
      id: '3',
      stateCode: 'KA',
      stateName: 'Karnataka',
      status: 'Active',
    },
    {
      id: '4',
      stateCode: 'TN',
      stateName: 'Tamil Nadu',
      status: 'Active',
    },
    {
      id: '5',
      stateCode: 'GJ',
      stateName: 'Gujarat',
      status: 'Active',
    },
  ]);

  // PCB Zones from PCB Zone Master - Load active zones only
  const [pcbZones] = useState<PCBZone[]>([
    {
      id: '1',
      pcbZoneName: 'Zone A',
      pcbZoneAddress: '123 Industrial Area, Mumbai',
      contactNum: '+91-9876543210',
      contactEmail: 'zonea@example.com',
      alertEmail: 'alert.zonea@example.com',
      status: 'Active',
    },
    {
      id: '2',
      pcbZoneName: 'Zone B',
      pcbZoneAddress: '456 Commercial Street, Delhi',
      contactNum: '+91-9876543211',
      contactEmail: 'zoneb@example.com',
      alertEmail: 'alert.zoneb@example.com',
      status: 'Active',
    },
    {
      id: '3',
      pcbZoneName: 'Zone C',
      pcbZoneAddress: '789 Business Park, Bangalore',
      contactNum: '+91-9876543212',
      contactEmail: 'zonec@example.com',
      alertEmail: 'alert.zonec@example.com',
      status: 'Active',
    },
  ]);

  const [companies, setCompanies] = useState<Company[]>([]);

  // Map backend CompanyResponse to frontend Company interface
  const mapCompanyResponseToCompany = (apiCompany: CompanyResponse): Company => {
    return {
      id: apiCompany.id,
      companyCode: apiCompany.companyCode,
      companyName: apiCompany.companyName,
      regdOfficeAddress: '', // Will be added to backend later
      adminOfficeAddress: '', // Will be added to backend later
      factoryAddress: '', // Will be added to backend later
      gstin: '', // Will be added to backend later
      state: '', // Will be added to backend later
      pincode: '', // Will be added to backend later
      prefix: '', // Will be added to backend later
      authPersonName: '', // Will be added to backend later
      authPersonDesignation: '', // Will be added to backend later
      authPersonDOB: '', // Will be added to backend later
      pcbauthNum: '', // Will be added to backend later
      ctoWaterNum: '', // Will be added to backend later
      ctoWaterDate: '', // Will be added to backend later
      ctoWaterValidUpto: '', // Will be added to backend later
      ctoAirNum: '', // Will be added to backend later
      ctoAirDate: '', // Will be added to backend later
      ctoAirValidUpto: '', // Will be added to backend later
      cteWaterNum: '', // Will be added to backend later
      cteWaterDate: '', // Will be added to backend later
      cteWaterValidUpto: '', // Will be added to backend later
      cteAirNum: '', // Will be added to backend later
      cteAirDate: '', // Will be added to backend later
      cteAirValidUpto: '', // Will be added to backend later
      hazardousWasteNum: '', // Will be added to backend later
      pcbZoneID: '', // Will be added to backend later
      gstValidFrom: '', // Will be added to backend later
      gstRate: '', // Will be added to backend later
      status: apiCompany.status,
      createdBy: apiCompany.createdBy || 'System',
      createdOn: apiCompany.createdOn,
      modifiedBy: apiCompany.modifiedBy || 'System',
      modifiedOn: apiCompany.modifiedOn,
    };
  };

  // Load companies from API
  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiCompanies = await companyService.getAllCompanies(true); // Get only active companies
      const mappedCompanies = apiCompanies.map((apiCompany) => 
        mapCompanyResponseToCompany(apiCompany)
      );
      setCompanies(mappedCompanies);
    } catch (err: any) {
      const errorMessage = (err as Error).message || 'Failed to load companies';
      console.error('Error loading companies:', err);
      
      // Check for authentication errors
      if (
        errorMessage.includes('not authenticated') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        err?.status === 401 ||
        err?.status === 403
      ) {
        // Clear invalid auth data and redirect to login
        localStorage.removeItem('mw-auth-user');
        navigate('/login', { replace: true });
        return;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load companies on component mount
  useEffect(() => {
    loadCompanies();
  }, []);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredCompanies = companies.filter(company => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || (
      (company.companyName || '').toLowerCase().includes(query) ||
      (company.companyCode || '').toLowerCase().includes(query) ||
      (company.gstin || '').toLowerCase().includes(query)
    );
    
    // Advanced filters (UI-only, no backend API changes)
    const matchesCompanyCode = !advancedFilters.companyCode || 
      (company.companyCode || '').toLowerCase().includes(advancedFilters.companyCode.toLowerCase());
    const matchesCompanyName = !advancedFilters.companyName || 
      (company.companyName || '').toLowerCase().includes(advancedFilters.companyName.toLowerCase());
    const matchesGstin = !advancedFilters.gstin || 
      (company.gstin || '').toLowerCase().includes(advancedFilters.gstin.toLowerCase());
    const matchesState = !advancedFilters.state || 
      (company.state || '').toLowerCase().includes(advancedFilters.state.toLowerCase());
    const matchesPcbZone = !advancedFilters.pcbZone || 
      (company.pcbZoneID || '').toLowerCase().includes(advancedFilters.pcbZone.toLowerCase());
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
    
    return matchesSearch && matchesCompanyCode && matchesCompanyName && matchesGstin && 
           matchesState && matchesPcbZone && matchesStatus;
  });

  const handleAdd = () => {
    setEditingCompany(null);
    setShowModal(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this company?')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await companyService.deleteCompany(id);
      await loadCompanies(); // Reload companies after deletion
    } catch (err) {
      setError((err as Error).message || 'Failed to delete company');
      console.error('Error deleting company:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: Partial<Company>) => {
    setLoading(true);
    setError(null);
    
    try {
      if (editingCompany) {
        // Update existing company
        // Note: Currently backend only supports companyCode, companyName, status
        // Additional fields will need to be added to backend later
        const updateData = {
          companyCode: formData.companyCode,
          companyName: formData.companyName,
          status: formData.status,
        };
        
        await companyService.updateCompany(editingCompany.id, updateData);
      } else {
        // Create new company
        // Note: Currently backend only supports companyCode and companyName
        // Additional fields will need to be added to backend later
        if (!formData.companyCode || !formData.companyName) {
          throw new Error('Company Code and Company Name are required');
        }
        
        const createData = {
          companyCode: formData.companyCode,
          companyName: formData.companyName,
        };
        
        await companyService.createCompany(createData);
      }
      
      // Reload companies after save
      await loadCompanies();
      setShowModal(false);
      setEditingCompany(null);
    } catch (err) {
      const errorMessage = (err as Error).message || 'Failed to save company';
      setError(errorMessage);
      console.error('Error saving company:', err);
      
      // If authentication error, suggest login
      if (errorMessage.includes('403') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('Authentication failed. Please login again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Define columns for the table
  const columns: Column<Company>[] = [
    { key: 'companyCode', label: 'Code', minWidth: 110 },
    { key: 'companyName', label: 'Company Name', minWidth: 150, allowWrap: true },
    { key: 'gstin', label: 'GSTIN', minWidth: 130 },
    { key: 'state', label: 'State', minWidth: 120 },
    { key: 'pcbZoneID', label: 'PCB Zone', minWidth: 110 },
    { key: 'gstValidFrom', label: 'GST From', minWidth: 130 },
    { key: 'gstRate', label: 'GST Rate', minWidth: 100 },
    {
      key: 'status',
      label: 'Status',
      minWidth: 90,
      render: (company) => (
        <span className={`status-badge status-badge--${company.status.toLowerCase()}`}>
          {company.status}
        </span>
      ),
    },
  ];

  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
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

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">Home &nbsp;&gt;&nbsp; Company Master</span>
          </div>
        </header>

        {/* Error Banner */}
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
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px',
            color: '#666'
          }}>
            Loading...
          </div>
        )}

        <div className="company-master-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                <path d="M9 22v-4h6v4"></path>
                <path d="M8 6h.01"></path>
                <path d="M16 6h.01"></path>
                <path d="M12 6h.01"></path>
                <path d="M12 10h.01"></path>
                <path d="M12 14h.01"></path>
                <path d="M8 10h.01"></path>
                <path d="M8 14h.01"></path>
                <path d="M16 10h.01"></path>
                <path d="M16 14h.01"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Company Master</h1>
              <p className="ra-page-subtitle">Manage company information and details</p>
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
                placeholder="Search by company code, name, GSTIN..."
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
                Add Company
              </button>
            </div>
          </div>

          {/* Companies Table */}
          <div className="company-master-table-container">
            <table className="company-master-table">
                <thead>
                  <tr>
                    <th>CODE</th>
                    <th>COMPANY NAME</th>
                    <th>GSTIN</th>
                    <th>STATE</th>
                    <th>PCB ZONE</th>
                    <th>GST FROM</th>
                    <th>GST RATE</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty-message">
                        {loading ? 'Loading...' : 'No companies found'}
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((company) => (
                      <tr key={company.id}>
                        <td>{company.companyCode || '-'}</td>
                        <td>{company.companyName || '-'}</td>
                        <td>{company.gstin || '-'}</td>
                        <td>{company.state || '-'}</td>
                        <td>{company.pcbZoneID || '-'}</td>
                        <td>{company.gstValidFrom || '-'}</td>
                        <td>{company.gstRate || '-'}</td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge status-badge--${company.status.toLowerCase()}`}>
                              {company.status}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons ra-actions">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleEdit(company)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--edit"
                              onClick={() => handleEdit(company)}
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--delete"
                              onClick={() => handleDelete(company.id)}
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
              Showing {filteredCompanies.length} of {companies.length} items
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
            setAdvancedFilters({ companyCode: '', companyName: '', gstin: '', state: '', pcbZone: '' });
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
        <CompanyFormModal
          company={editingCompany}
          states={states.filter(s => s.status === 'Active')}
          pcbZones={pcbZones.filter(z => z.status === 'Active')}
          loading={loading}
          onClose={() => {
            setShowModal(false);
            setEditingCompany(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Company Form Modal Component
interface CompanyFormModalProps {
  company: Company | null;
  states: State[];
  pcbZones: PCBZone[];
  loading?: boolean;
  onClose: () => void;
  onSave: (data: Partial<Company>) => void;
}

const CompanyFormModal = ({ company, states, pcbZones, loading = false, onClose, onSave }: CompanyFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Company>>(
    company || {
      companyCode: '',
      companyName: '',
      regdOfficeAddress: '',
      adminOfficeAddress: '',
      factoryAddress: '',
      gstin: '',
      state: '',
      pincode: '',
      prefix: '',
      authPersonName: '',
      authPersonDesignation: '',
      authPersonDOB: '',
      pcbauthNum: '',
      ctoWaterNum: '',
      ctoWaterDate: '',
      ctoWaterValidUpto: '',
      ctoAirNum: '',
      ctoAirDate: '',
      ctoAirValidUpto: '',
      cteWaterNum: '',
      cteWaterDate: '',
      cteWaterValidUpto: '',
      cteAirNum: '',
      cteAirDate: '',
      cteAirValidUpto: '',
      hazardousWasteNum: '',
      pcbZoneID: '',
      gstValidFrom: '',
      gstRate: '',
      status: 'Active',
    }
  );

  // Step-based navigation state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Collapsible sections for Environmental Clearances
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    cto: true,
    cte: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper function to check if expiry date is within 30 days
  const isExpiringSoon = (expiryDate: string): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  // Define steps
  const steps = [
    { number: 1, title: 'Basic Information', icon: 'building', key: 'basicInfo' },
    { number: 2, title: 'Addresses', icon: 'map-pin', key: 'addresses' },
    { number: 3, title: 'Authorized Person', icon: 'user', key: 'authorizedPerson' },
    { number: 4, title: 'PCB & Compliance', icon: 'shield', key: 'pcbCompliance' },
    { number: 5, title: 'Environmental Clearances', icon: 'water', key: 'environmentalClearances' },
    { number: 6, title: 'GST Details', icon: 'document', key: 'gstDetails' },
  ];

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    // Only allow submit on last step
    if (currentStep === 6) {
      onSave(formData);
    }
  };

  const getStepIcon = (iconType: string) => {
    switch (iconType) {
      case 'building':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
            <path d="M9 22v-4h6v4"></path>
            <path d="M8 6h.01"></path>
            <path d="M16 6h.01"></path>
            <path d="M12 6h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M8 10h.01"></path>
            <path d="M8 14h.01"></path>
            <path d="M16 10h.01"></path>
            <path d="M16 14h.01"></path>
          </svg>
        );
      case 'map-pin':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        );
      case 'user':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        );
      case 'shield':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        );
      case 'water':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
        );
      case 'document':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content company-form-modal wizard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header company-form-header">
          <div className="modal-header-content">
            <div className="modal-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                <path d="M9 22v-4h6v4"></path>
                <path d="M8 6h.01"></path>
                <path d="M16 6h.01"></path>
                <path d="M12 6h.01"></path>
                <path d="M12 10h.01"></path>
                <path d="M12 14h.01"></path>
                <path d="M8 10h.01"></path>
                <path d="M8 14h.01"></path>
                <path d="M16 10h.01"></path>
                <path d="M16 14h.01"></path>
              </svg>
            </div>
          <h2 className="modal-title">{company ? 'Edit Company' : 'Add Company'}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="wizard-progress">
          {steps.map((step) => {
            const isActive = currentStep >= step.number;
            const isCurrent = currentStep === step.number;
            const showIcon = isCurrent;

            return (
              <div
                key={step.number}
                className={`wizard-step ${isActive ? 'wizard-step--active' : ''} ${isCurrent ? 'wizard-step--current' : ''}`}
              >
                <div className="wizard-step-icon-wrapper">
                  {showIcon ? (
                    <div className="wizard-step-icon">{getStepIcon(step.icon)}</div>
                  ) : (
                    <div className="wizard-step-number">{step.number}</div>
                  )}
                </div>
                <div className="wizard-step-title">{step.title}</div>
              </div>
            );
          })}
        </div>

        <div className="wizard-content">
        <form className="company-form" onSubmit={handleSubmit}>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon">
                    {getStepIcon('building')}
                  </div>
                  <h3 className="wizard-step-header-title">Basic Information</h3>
                </div>
                <div className="form-grid-two-col">
                  <div className="form-group">
                    <label className="form-label">
                      Company Code <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.companyCode || ''}
                      onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                      placeholder="e.g., COMP001"
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Company Name <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.companyName || ''}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="Enter company name"
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      GSTIN <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.gstin || ''}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      State <span className="required-asterisk">*</span>
                    </label>
                    <select
                      value={formData.state || ''}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      required
                      className="form-select"
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.stateCode}>
                          {state.stateCode}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input
                      type="text"
                      value={formData.pincode || ''}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prefix</label>
                    <input
                      type="text"
                      value={formData.prefix || ''}
                      onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                      placeholder="e.g., TI"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      value={formData.status || 'Active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                      className="form-select"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Addresses */}
            {currentStep === 2 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-pink">
                    {getStepIcon('map-pin')}
                  </div>
                  <h3 className="wizard-step-header-title">Addresses</h3>
                </div>
                <div className="form-grid-two-col">
                  <div className="form-group form-group--full">
                    <label className="form-label">Registered Office Address</label>
                    <textarea
                      value={formData.regdOfficeAddress || ''}
                      onChange={(e) => setFormData({ ...formData, regdOfficeAddress: e.target.value })}
                      rows={3}
                      className="form-textarea"
                    />
                  </div>
                  <div className="form-group form-group--full">
                    <label className="form-label">Admin Office Address</label>
                    <textarea
                      value={formData.adminOfficeAddress || ''}
                      onChange={(e) => setFormData({ ...formData, adminOfficeAddress: e.target.value })}
                      rows={3}
                      className="form-textarea"
                    />
                  </div>
                  <div className="form-group form-group--full">
                    <label className="form-label">Factory Address</label>
                    <textarea
                      value={formData.factoryAddress || ''}
                      onChange={(e) => setFormData({ ...formData, factoryAddress: e.target.value })}
                      rows={3}
                      className="form-textarea"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Authorized Person */}
            {currentStep === 3 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-green">
                    {getStepIcon('user')}
                  </div>
                  <h3 className="wizard-step-header-title">Authorized Person</h3>
                </div>
                <div className="form-grid-two-col">
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      value={formData.authPersonName || ''}
                      onChange={(e) => setFormData({ ...formData, authPersonName: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <input
                      type="text"
                      value={formData.authPersonDesignation || ''}
                      onChange={(e) => setFormData({ ...formData, authPersonDesignation: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.authPersonDOB || ''}
                      onChange={(e) => setFormData({ ...formData, authPersonDOB: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: PCB & Compliance */}
            {currentStep === 4 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-purple">
                    {getStepIcon('shield')}
                  </div>
                  <h3 className="wizard-step-header-title">PCB & Compliance</h3>
                </div>
                <div className="form-grid-two-col">
                  <div className="form-group">
                    <label className="form-label">PCB Auth Num</label>
                    <input
                      type="text"
                      value={formData.pcbauthNum || ''}
                      onChange={(e) => setFormData({ ...formData, pcbauthNum: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hazardous Waste Num</label>
                    <input
                      type="text"
                      value={formData.hazardousWasteNum || ''}
                      onChange={(e) => setFormData({ ...formData, hazardousWasteNum: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Environmental Clearances */}
            {currentStep === 5 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-orange">
                    {getStepIcon('water')}
                  </div>
                  <h3 className="wizard-step-header-title">Environmental Clearances</h3>
                </div>

                {/* CTO Section */}
                <div className="env-clearance-section">
                  <div className="env-clearance-section-header" onClick={() => toggleSection('cto')}>
                    <h4 className="env-clearance-section-title">CTO (Consent To Operate)</h4>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`env-clearance-section-arrow ${expandedSections.cto ? 'expanded' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                  {expandedSections.cto && (
                    <div className="env-clearance-grid">
                      {/* Water Column */}
                      <div className="env-clearance-column">
                        <div className="env-clearance-column-header">
                          <h5 className="env-clearance-column-title">Water</h5>
                          {isExpiringSoon(formData.ctoWaterValidUpto || '') && (
                            <span className="env-clearance-warning-badge">Expiring Soon</span>
                          )}
                        </div>
                        <div className="env-clearance-column-content">
                          <div className="form-group">
                            <label className="form-label">Certificate Number</label>
                            <input
                              type="text"
                              value={formData.ctoWaterNum || ''}
                              onChange={(e) => setFormData({ ...formData, ctoWaterNum: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Issue Date</label>
                            <input
                              type="date"
                              value={formData.ctoWaterDate || ''}
                              onChange={(e) => setFormData({ ...formData, ctoWaterDate: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Expiry Date</label>
                            <input
                              type="date"
                              value={formData.ctoWaterValidUpto || ''}
                              onChange={(e) => setFormData({ ...formData, ctoWaterValidUpto: e.target.value })}
                              className={`form-input ${isExpiringSoon(formData.ctoWaterValidUpto || '') ? 'form-input--warning' : ''}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Air Column */}
                      <div className="env-clearance-column">
                        <div className="env-clearance-column-header">
                          <h5 className="env-clearance-column-title">Air</h5>
                          {isExpiringSoon(formData.ctoAirValidUpto || '') && (
                            <span className="env-clearance-warning-badge">Expiring Soon</span>
                          )}
                        </div>
                        <div className="env-clearance-column-content">
                          <div className="form-group">
                            <label className="form-label">Certificate Number</label>
                            <input
                              type="text"
                              value={formData.ctoAirNum || ''}
                              onChange={(e) => setFormData({ ...formData, ctoAirNum: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Issue Date</label>
                            <input
                              type="date"
                              value={formData.ctoAirDate || ''}
                              onChange={(e) => setFormData({ ...formData, ctoAirDate: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Expiry Date</label>
                            <input
                              type="date"
                              value={formData.ctoAirValidUpto || ''}
                              onChange={(e) => setFormData({ ...formData, ctoAirValidUpto: e.target.value })}
                              className={`form-input ${isExpiringSoon(formData.ctoAirValidUpto || '') ? 'form-input--warning' : ''}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CTE Section */}
                <div className="env-clearance-section">
                  <div className="env-clearance-section-header" onClick={() => toggleSection('cte')}>
                    <h4 className="env-clearance-section-title">CTE (Consent To Establish)</h4>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`env-clearance-section-arrow ${expandedSections.cte ? 'expanded' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                  {expandedSections.cte && (
                    <div className="env-clearance-grid">
                      {/* Water Column */}
                      <div className="env-clearance-column">
                        <div className="env-clearance-column-header">
                          <h5 className="env-clearance-column-title">Water</h5>
                          {isExpiringSoon(formData.cteWaterValidUpto || '') && (
                            <span className="env-clearance-warning-badge">Expiring Soon</span>
                          )}
                        </div>
                        <div className="env-clearance-column-content">
                          <div className="form-group">
                            <label className="form-label">Certificate Number</label>
                            <input
                              type="text"
                              value={formData.cteWaterNum || ''}
                              onChange={(e) => setFormData({ ...formData, cteWaterNum: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Issue Date</label>
                            <input
                              type="date"
                              value={formData.cteWaterDate || ''}
                              onChange={(e) => setFormData({ ...formData, cteWaterDate: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Expiry Date</label>
                            <input
                              type="date"
                              value={formData.cteWaterValidUpto || ''}
                              onChange={(e) => setFormData({ ...formData, cteWaterValidUpto: e.target.value })}
                              className={`form-input ${isExpiringSoon(formData.cteWaterValidUpto || '') ? 'form-input--warning' : ''}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Air Column */}
                      <div className="env-clearance-column">
                        <div className="env-clearance-column-header">
                          <h5 className="env-clearance-column-title">Air</h5>
                          {isExpiringSoon(formData.cteAirValidUpto || '') && (
                            <span className="env-clearance-warning-badge">Expiring Soon</span>
                          )}
                        </div>
                        <div className="env-clearance-column-content">
                          <div className="form-group">
                            <label className="form-label">Certificate Number</label>
                            <input
                              type="text"
                              value={formData.cteAirNum || ''}
                              onChange={(e) => setFormData({ ...formData, cteAirNum: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Issue Date</label>
                            <input
                              type="date"
                              value={formData.cteAirDate || ''}
                              onChange={(e) => setFormData({ ...formData, cteAirDate: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Expiry Date</label>
                            <input
                              type="date"
                              value={formData.cteAirValidUpto || ''}
                              onChange={(e) => setFormData({ ...formData, cteAirValidUpto: e.target.value })}
                              className={`form-input ${isExpiringSoon(formData.cteAirValidUpto || '') ? 'form-input--warning' : ''}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 6: GST Details */}
            {currentStep === 6 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-purple">
                    {getStepIcon('document')}
              </div>
                  <h3 className="wizard-step-header-title">GST Details</h3>
                </div>
                <div className="form-grid-two-col">
                  <div className="form-group">
                    <label className="form-label">PCB Zone ID</label>
                    <select
                      value={formData.pcbZoneID || ''}
                      onChange={(e) => setFormData({ ...formData, pcbZoneID: e.target.value })}
                      className="form-select"
                    >
                      <option value="">Select PCB Zone</option>
                      {pcbZones.map((zone) => (
                        <option key={zone.id} value={zone.pcbZoneName}>
                          {zone.pcbZoneName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Valid From</label>
                    <input
                      type="date"
                      value={formData.gstValidFrom || ''}
                      onChange={(e) => setFormData({ ...formData, gstValidFrom: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Rate</label>
                    <input
                      type="text"
                      value={formData.gstRate || ''}
                      onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                      placeholder="e.g., 18%"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="modal-footer wizard-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          {currentStep > 1 && (
            <button type="button" className="btn btn--secondary" onClick={handleBack}>
              Back
            </button>
          )}
          {currentStep < 6 ? (
            <button type="button" className="btn btn--primary" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Company'}
            </button>
          )}
        </div>
      </div>
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
              <div className="cm-filter-subtitle">Filter companies by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>Company Code</label>
              <input
                type="text"
                value={draft.companyCode}
                onChange={(e) => setDraft({ ...draft, companyCode: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter company code"
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
              <label>GSTIN</label>
              <input
                type="text"
                value={draft.gstin}
                onChange={(e) => setDraft({ ...draft, gstin: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter GSTIN"
              />
            </div>

            <div className="cm-filter-field">
              <label>State</label>
              <input
                type="text"
                value={draft.state}
                onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter state"
              />
            </div>

            <div className="cm-filter-field">
              <label>PCB Zone</label>
              <input
                type="text"
                value={draft.pcbZone}
                onChange={(e) => setDraft({ ...draft, pcbZone: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter PCB zone"
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
              setDraft({ companyCode: '', companyName: '', gstin: '', state: '', pcbZone: '' });
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

export default CompanyMasterPage;

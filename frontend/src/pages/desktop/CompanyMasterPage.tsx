import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { companyService, CompanyResponse } from '../../services/companyService';
import MasterPageLayout from '../../components/common/MasterPageLayout';
import Tabs from '../../components/common/Tabs';
import { Column } from '../../components/common/DataTable';
import '../desktop/dashboardPage.css';

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
  const { logout } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  const filteredCompanies = companies.filter(company => {
    const query = searchQuery.toLowerCase();
    return (
      (company.companyName || '').toLowerCase().includes(query) ||
      (company.companyCode || '').toLowerCase().includes(query) ||
      (company.gstin || '').toLowerCase().includes(query)
    );
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
    { key: 'pcbauthNum', label: 'PCB Auth #', minWidth: 110 },
    { key: 'ctoWaterNum', label: 'CTO Water #', minWidth: 120 },
    { key: 'ctoWaterDate', label: 'CTO Wtr Date', minWidth: 130 },
    { key: 'ctoWaterValidUpto', label: 'CTO Wtr Valid To', minWidth: 150 },
    { key: 'ctoAirNum', label: 'CTO Air #', minWidth: 110 },
    { key: 'ctoAirDate', label: 'CTO Air Date', minWidth: 130 },
    { key: 'ctoAirValidUpto', label: 'CTO Air Valid To', minWidth: 150 },
    { key: 'cteWaterNum', label: 'CTE Water #', minWidth: 120 },
    { key: 'cteWaterDate', label: 'CTE Wtr Date', minWidth: 130 },
    { key: 'cteWaterValidUpto', label: 'CTE Wtr Valid To', minWidth: 150 },
    { key: 'cteAirNum', label: 'CTE Air #', minWidth: 110 },
    { key: 'cteAirDate', label: 'CTE Air Date', minWidth: 130 },
    { key: 'cteAirValidUpto', label: 'CTE Air Valid To', minWidth: 150 },
    { key: 'hazardousWasteNum', label: 'Haz Waste #', minWidth: 140 },
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
            <span className="breadcrumb">/ Masters / Company Master</span>
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

        {/* Company Master Content using reusable template */}
        <MasterPageLayout
          title="Company Master"
          breadcrumb="/ Masters / Company Master"
          data={companies}
          filteredData={filteredCompanies}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getId={(company) => company.id}
          addButtonLabel="Add Company"
        >
          {/* Tabs */}
          <Tabs
            tabs={[{ id: 'list', label: 'Company List' }]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'list' | 'form')}
          />
        </MasterPageLayout>
      </main>

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{company ? 'Edit Company' : 'Add Company'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="company-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Code *</label>
                <input
                  type="text"
                  value={formData.companyCode || ''}
                  onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>GSTIN *</label>
                <input
                  type="text"
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>State *</label>
                <select
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
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
                <label>Pincode</label>
                <input
                  type="text"
                  value={formData.pincode || ''}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Prefix</label>
                <input
                  type="text"
                  value={formData.prefix || ''}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Addresses</h3>
            <div className="form-grid">
              <div className="form-group form-group--full">
                <label>Registered Office Address</label>
                <textarea
                  value={formData.regdOfficeAddress || ''}
                  onChange={(e) => setFormData({ ...formData, regdOfficeAddress: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group form-group--full">
                <label>Admin Office Address</label>
                <textarea
                  value={formData.adminOfficeAddress || ''}
                  onChange={(e) => setFormData({ ...formData, adminOfficeAddress: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group form-group--full">
                <label>Factory Address</label>
                <textarea
                  value={formData.factoryAddress || ''}
                  onChange={(e) => setFormData({ ...formData, factoryAddress: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Authorized Person</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.authPersonName || ''}
                  onChange={(e) => setFormData({ ...formData, authPersonName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  value={formData.authPersonDesignation || ''}
                  onChange={(e) => setFormData({ ...formData, authPersonDesignation: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={formData.authPersonDOB || ''}
                  onChange={(e) => setFormData({ ...formData, authPersonDOB: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">PCB Authorization</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>PCB Auth Num</label>
                <input
                  type="text"
                  value={formData.pcbauthNum || ''}
                  onChange={(e) => setFormData({ ...formData, pcbauthNum: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">CTO Water</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>CTO Water Num</label>
                <input
                  type="text"
                  value={formData.ctoWaterNum || ''}
                  onChange={(e) => setFormData({ ...formData, ctoWaterNum: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>CTO Water Date</label>
                <input
                  type="date"
                  value={formData.ctoWaterDate || ''}
                  onChange={(e) => setFormData({ ...formData, ctoWaterDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>CTO Water Valid Upto</label>
                <input
                  type="date"
                  value={formData.ctoWaterValidUpto || ''}
                  onChange={(e) => setFormData({ ...formData, ctoWaterValidUpto: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">CTO Air</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>CTO Air Num</label>
                <input
                  type="text"
                  value={formData.ctoAirNum || ''}
                  onChange={(e) => setFormData({ ...formData, ctoAirNum: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>CTO Air Date</label>
                <input
                  type="date"
                  value={formData.ctoAirDate || ''}
                  onChange={(e) => setFormData({ ...formData, ctoAirDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>CTO Air Valid Upto</label>
                <input
                  type="date"
                  value={formData.ctoAirValidUpto || ''}
                  onChange={(e) => setFormData({ ...formData, ctoAirValidUpto: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">CTE Water</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>CTE Water Num</label>
                <input
                  type="text"
                  value={formData.cteWaterNum || ''}
                  onChange={(e) => setFormData({ ...formData, cteWaterNum: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>CTE Water Date</label>
                <input
                  type="date"
                  value={formData.cteWaterDate || ''}
                  onChange={(e) => setFormData({ ...formData, cteWaterDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>CTE Water Valid Upto</label>
                <input
                  type="date"
                  value={formData.cteWaterValidUpto || ''}
                  onChange={(e) => setFormData({ ...formData, cteWaterValidUpto: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">CTE Air</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>CTE Air Num</label>
                <input
                  type="text"
                  value={formData.cteAirNum || ''}
                  onChange={(e) => setFormData({ ...formData, cteAirNum: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>CTE Air Date</label>
                <input
                  type="date"
                  value={formData.cteAirDate || ''}
                  onChange={(e) => setFormData({ ...formData, cteAirDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>CTE Air Valid Upto</label>
                <input
                  type="date"
                  value={formData.cteAirValidUpto || ''}
                  onChange={(e) => setFormData({ ...formData, cteAirValidUpto: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Additional Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Hazardous Waste Num</label>
                <input
                  type="text"
                  value={formData.hazardousWasteNum || ''}
                  onChange={(e) => setFormData({ ...formData, hazardousWasteNum: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>PCB Zone ID</label>
                <select
                  value={formData.pcbZoneID || ''}
                  onChange={(e) => setFormData({ ...formData, pcbZoneID: e.target.value })}
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
                <label>GST Valid From</label>
                <input
                  type="date"
                  value={formData.gstValidFrom || ''}
                  onChange={(e) => setFormData({ ...formData, gstValidFrom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>GST Rate</label>
                <input
                  type="text"
                  value={formData.gstRate || ''}
                  onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                  placeholder="e.g., 18%"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Status</h3>
            <div className="form-grid">
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
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Saving...' : (company ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyMasterPage;

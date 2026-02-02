import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { colorService, ColorResponse } from '../../services/colorService';
import { companyService, CompanyResponse } from '../../services/companyService';
import MasterPageLayout from '../../components/common/MasterPageLayout';
import Tabs from '../../components/common/Tabs';
import { Column } from '../../components/common/DataTable';
import '../desktop/dashboardPage.css';

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

interface ColorCode {
  id: string;
  colorName: string;
  companyName: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const ColorCodeMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingColorCode, setEditingColorCode] = useState<ColorCode | null>(null);
  const [colorCodes, setColorCodes] = useState<ColorCode[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load companies from API
  const loadCompanies = async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true); // Get only active companies
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

  // Load colors from API
  const loadColors = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiColors = await colorService.getAllColors(undefined, true); // Get only active colors
      const mappedColors: ColorCode[] = apiColors.map((apiColor: ColorResponse) => {
        // Find company name by companyId
        const company = companies.find(c => c.id === apiColor.companyId);
        return {
          id: apiColor.id,
          colorName: apiColor.colorName,
          companyName: company?.companyName || 'Unknown Company',
          status: apiColor.status,
          createdBy: apiColor.createdBy || '',
          createdOn: apiColor.createdOn,
          modifiedBy: apiColor.modifiedBy || '',
          modifiedOn: apiColor.modifiedOn,
        };
      });
      setColorCodes(mappedColors);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load color codes';
      setError(errorMessage);
      console.error('Error loading color codes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load companies first, then colors
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
    };
    initializeData();
  }, []);

  // Load colors when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadColors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies.length]);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredColorCodes = colorCodes.filter(colorCode =>
    colorCode.colorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    colorCode.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingColorCode(null);
    setShowModal(true);
  };

  const handleEdit = (colorCode: ColorCode) => {
    setEditingColorCode(colorCode);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this color code?')) {
      try {
        setLoading(true);
        await colorService.deleteColor(id);
        await loadColors(); // Reload colors after deletion
        alert('Color code deleted successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete color code';
        alert(`Error: ${errorMessage}`);
        console.error('Error deleting color code:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: Partial<ColorCode>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Find company ID from company name
      const selectedCompany = companies.find(c => c.companyName === formData.companyName);
      if (!selectedCompany) {
        alert('Please select a valid company');
        return;
      }

      if (editingColorCode) {
        // Update existing - only status can be updated (colorName and companyId are immutable)
        await colorService.updateColor(editingColorCode.id, {
          status: formData.status,
        });
        alert('Color code updated successfully');
      } else {
        // Add new
        if (!formData.colorName || !formData.companyName) {
          alert('Please fill in all required fields');
          return;
        }
        await colorService.createColor({
          colorName: formData.colorName,
          companyId: selectedCompany.id,
        });
        alert('Color code created successfully');
      }
      
      setShowModal(false);
      setEditingColorCode(null);
      await loadColors(); // Reload colors after save
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save color code';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Error saving color code:', err);
    } finally {
      setLoading(false);
    }
  };

  // Define columns for the table
  const columns: Column<ColorCode>[] = [
    { key: 'colorName', label: 'Color Name', minWidth: 200, allowWrap: true },
    { key: 'companyName', label: 'Company Name', minWidth: 200, allowWrap: true },
    {
      key: 'status',
      label: 'Status',
      minWidth: 100,
      render: (colorCode) => (
        <span className={`status-badge status-badge--${colorCode.status.toLowerCase()}`}>
          {colorCode.status}
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
            <span className="breadcrumb">/ Masters / Color Code Master</span>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fee', 
            color: '#c33', 
            marginBottom: '16px', 
            borderRadius: '6px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !colorCodes.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading color codes...
          </div>
        )}

        {/* Color Code Master Content using reusable template */}
        <MasterPageLayout
          title="Color Code Master"
          breadcrumb="/ Masters / Color Code Master"
          data={colorCodes}
          filteredData={filteredColorCodes}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getId={(colorCode) => colorCode.id}
          addButtonLabel="Add Color Code"
          createPermissions={['COLOR_CREATE', 'COLOR.CREATE']}
          editPermissions={['COLOR_EDIT', 'COLOR.EDIT', 'COLOR_UPDATE', 'COLOR.UPDATE']}
          deletePermissions={['COLOR_DELETE', 'COLOR.DELETE']}
        >
          {/* Tabs */}
          <Tabs
            tabs={[{ id: 'list', label: 'Color Code List' }]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'list' | 'form')}
          />
        </MasterPageLayout>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <ColorCodeFormModal
          colorCode={editingColorCode}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingColorCode(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Color Code Form Modal Component
interface ColorCodeFormModalProps {
  colorCode: ColorCode | null;
  companies: Company[];
  onClose: () => void;
  onSave: (data: Partial<ColorCode>) => void;
}

const ColorCodeFormModal = ({ colorCode, companies, onClose, onSave }: ColorCodeFormModalProps) => {
  const [formData, setFormData] = useState<Partial<ColorCode>>(
    colorCode || {
      colorName: '',
      companyName: '',
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
          <h2 className="modal-title">{colorCode ? 'Edit Color Code' : 'Add Color Code'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="color-code-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label>Color Name *</label>
                <input
                  type="text"
                  value={formData.colorName || ''}
                  onChange={(e) => setFormData({ ...formData, colorName: e.target.value })}
                  required
                  disabled={!!colorCode} // Disable when editing (immutable field)
                  style={colorCode ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  disabled={!!colorCode} // Disable when editing (immutable field)
                  style={colorCode ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
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
              {colorCode ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColorCodeMasterPage;

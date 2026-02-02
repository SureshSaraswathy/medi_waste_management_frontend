import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { areaService, AreaResponse } from '../../services/areaService';
import MasterPageLayout from '../../components/common/MasterPageLayout';
import Tabs from '../../components/common/Tabs';
import { Column } from '../../components/common/DataTable';
import '../desktop/dashboardPage.css';

interface Area {
  id: string;
  areaCode: string;
  areaName: string;
  areaPincode: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const AreaMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load areas from API
  const loadAreas = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiAreas = await areaService.getAllAreas(true); // Get only active areas
      const mappedAreas: Area[] = apiAreas.map((apiArea: AreaResponse) => ({
        id: apiArea.id,
        areaCode: apiArea.areaCode,
        areaName: apiArea.areaName,
        areaPincode: apiArea.areaPincode,
        status: apiArea.status,
        createdBy: apiArea.createdBy || '',
        createdOn: apiArea.createdOn,
        modifiedBy: apiArea.modifiedBy || '',
        modifiedOn: apiArea.modifiedOn,
      }));
      setAreas(mappedAreas);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load areas';
      setError(errorMessage);
      console.error('Error loading areas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load areas on component mount
  useEffect(() => {
    loadAreas();
  }, []);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredAreas = areas.filter(area =>
    area.areaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.areaCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.areaPincode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingArea(null);
    setShowModal(true);
  };

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this area?')) {
      try {
        setLoading(true);
        await areaService.deleteArea(id);
        await loadAreas(); // Reload areas after deletion
        alert('Area deleted successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete area';
        alert(`Error: ${errorMessage}`);
        console.error('Error deleting area:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: Partial<Area>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (editingArea) {
        // Update existing - only areaPincode and status can be updated (areaCode and areaName are immutable)
        await areaService.updateArea(editingArea.id, {
          areaPincode: formData.areaPincode,
          status: formData.status,
        });
        alert('Area updated successfully');
      } else {
        // Add new
        if (!formData.areaCode || !formData.areaName || !formData.areaPincode) {
          alert('Please fill in all required fields');
          return;
        }
        await areaService.createArea({
          areaCode: formData.areaCode,
          areaName: formData.areaName,
          areaPincode: formData.areaPincode,
        });
        alert('Area created successfully');
      }
      
      setShowModal(false);
      setEditingArea(null);
      await loadAreas(); // Reload areas after save
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save area';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Error saving area:', err);
    } finally {
      setLoading(false);
    }
  };

  // Define columns for the table
  const columns: Column<Area>[] = [
    { key: 'areaCode', label: 'Area Code', minWidth: 120 },
    { key: 'areaName', label: 'Area Name', minWidth: 200, allowWrap: true },
    { key: 'areaPincode', label: 'Area Pincode', minWidth: 130 },
    {
      key: 'status',
      label: 'Status',
      minWidth: 100,
      render: (area) => (
        <span className={`status-badge status-badge--${area.status.toLowerCase()}`}>
          {area.status}
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
            <span className="breadcrumb">/ Masters / Area Master</span>
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
        {loading && !areas.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading areas...
          </div>
        )}

        {/* Area Master Content using reusable template */}
        <MasterPageLayout
          title="Area Master"
          breadcrumb="/ Masters / Area Master"
          data={areas}
          filteredData={filteredAreas}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getId={(area) => area.id}
          addButtonLabel="Add Area"
          createPermissions={['AREA_CREATE', 'AREA.CREATE']}
          editPermissions={['AREA_EDIT', 'AREA.EDIT', 'AREA_UPDATE', 'AREA.UPDATE']}
          deletePermissions={['AREA_DELETE', 'AREA.DELETE']}
        >
          {/* Tabs */}
          <Tabs
            tabs={[{ id: 'list', label: 'Area List' }]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'list' | 'form')}
          />
        </MasterPageLayout>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <AreaFormModal
          area={editingArea}
          onClose={() => {
            setShowModal(false);
            setEditingArea(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Area Form Modal Component
interface AreaFormModalProps {
  area: Area | null;
  onClose: () => void;
  onSave: (data: Partial<Area>) => void;
}

const AreaFormModal = ({ area, onClose, onSave }: AreaFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Area>>(
    area || {
      areaCode: '',
      areaName: '',
      areaPincode: '',
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
          <h2 className="modal-title">{area ? 'Edit Area' : 'Add Area'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="area-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label>Area Code *</label>
                <input
                  type="text"
                  value={formData.areaCode || ''}
                  onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
                  required
                  disabled={!!area} // Disable when editing (immutable field)
                  style={area ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Area Name *</label>
                <input
                  type="text"
                  value={formData.areaName || ''}
                  onChange={(e) => setFormData({ ...formData, areaName: e.target.value })}
                  required
                  disabled={!!area} // Disable when editing (immutable field)
                  style={area ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Area Pincode *</label>
                <input
                  type="text"
                  value={formData.areaPincode || ''}
                  onChange={(e) => setFormData({ ...formData, areaPincode: e.target.value })}
                  required
                  maxLength={10}
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

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {area ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AreaMasterPage;

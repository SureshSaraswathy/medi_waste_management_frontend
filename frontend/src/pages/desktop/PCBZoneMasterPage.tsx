import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { pcbZoneService, PcbZoneResponse } from '../../services/pcbZoneService';
import MasterPageLayout from '../../components/common/MasterPageLayout';
import Tabs from '../../components/common/Tabs';
import { Column } from '../../components/common/DataTable';
import '../desktop/dashboardPage.css';

interface PCBZone {
  id: string;
  pcbZoneName: string;
  pcbZoneAddress: string;
  contactNum: string;
  contactEmail: string;
  alertEmail: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const PCBZoneMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingPCBZone, setEditingPCBZone] = useState<PCBZone | null>(null);
  const [pcbZones, setPcbZones] = useState<PCBZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load PCB Zones from API
  const loadPcbZones = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiZones = await pcbZoneService.getAllPcbZones(true); // Get only active zones
      const mappedZones: PCBZone[] = apiZones.map((apiZone: PcbZoneResponse) => ({
        id: apiZone.id,
        pcbZoneName: apiZone.pcbZoneName,
        pcbZoneAddress: apiZone.pcbZoneAddress || '',
        contactNum: apiZone.contactNum || '',
        contactEmail: apiZone.contactEmail || '',
        alertEmail: apiZone.alertEmail || '',
        status: apiZone.status,
        createdBy: apiZone.createdBy || '',
        createdOn: apiZone.createdOn,
        modifiedBy: apiZone.modifiedBy || '',
        modifiedOn: apiZone.modifiedOn,
      }));
      setPcbZones(mappedZones);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PCB zones';
      setError(errorMessage);
      console.error('Error loading PCB zones:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load PCB zones on component mount
  useEffect(() => {
    loadPcbZones();
  }, []);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredPCBZones = pcbZones.filter(zone =>
    zone.pcbZoneName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.pcbZoneAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingPCBZone(null);
    setShowModal(true);
  };

  const handleEdit = (zone: PCBZone) => {
    setEditingPCBZone(zone);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this PCB Zone?')) {
      try {
        setLoading(true);
        await pcbZoneService.deletePcbZone(id);
        await loadPcbZones(); // Reload zones after deletion
        alert('PCB Zone deleted successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete PCB zone';
        alert(`Error: ${errorMessage}`);
        console.error('Error deleting PCB zone:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: Partial<PCBZone>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (editingPCBZone) {
        // Update existing - only updatable fields can be changed (pcbZoneName is immutable)
        await pcbZoneService.updatePcbZone(editingPCBZone.id, {
          pcbZoneAddress: formData.pcbZoneAddress,
          contactNum: formData.contactNum,
          contactEmail: formData.contactEmail,
          alertEmail: formData.alertEmail,
          status: formData.status,
        });
        alert('PCB Zone updated successfully');
      } else {
        // Add new
        if (!formData.pcbZoneName) {
          alert('Please fill in PCB Zone Name');
          return;
        }
        await pcbZoneService.createPcbZone({
          pcbZoneName: formData.pcbZoneName,
          pcbZoneAddress: formData.pcbZoneAddress,
          contactNum: formData.contactNum,
          contactEmail: formData.contactEmail,
          alertEmail: formData.alertEmail,
        });
        alert('PCB Zone created successfully');
      }
      
      setShowModal(false);
      setEditingPCBZone(null);
      await loadPcbZones(); // Reload zones after save
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save PCB zone';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Error saving PCB zone:', err);
    } finally {
      setLoading(false);
    }
  };

  // Define columns for the table
  const columns: Column<PCBZone>[] = [
    { key: 'pcbZoneName', label: 'PCB Zone Name', minWidth: 150, allowWrap: true },
    { key: 'pcbZoneAddress', label: 'PCB Zone Address', minWidth: 250, allowWrap: true },
    { key: 'contactNum', label: 'Contact Number', minWidth: 140 },
    { key: 'contactEmail', label: 'Contact Email', minWidth: 180, allowWrap: true },
    { key: 'alertEmail', label: 'Alert Email', minWidth: 180, allowWrap: true },
    {
      key: 'status',
      label: 'Status',
      minWidth: 100,
      render: (zone) => (
        <span className={`status-badge status-badge--${zone.status.toLowerCase()}`}>
          {zone.status}
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
            <span className="breadcrumb">/ Masters / PCB Zone Master</span>
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
        {loading && !pcbZones.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading PCB zones...
          </div>
        )}

        {/* PCB Zone Master Content using reusable template */}
        <MasterPageLayout
          title="PCB Zone Master"
          breadcrumb="/ Masters / PCB Zone Master"
          data={pcbZones}
          filteredData={filteredPCBZones}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getId={(zone) => zone.id}
          addButtonLabel="Add PCB Zone"
          createPermissions={['PCB_ZONE_CREATE', 'PCB_ZONE.CREATE']}
          editPermissions={['PCB_ZONE_EDIT', 'PCB_ZONE.EDIT', 'PCB_ZONE_UPDATE', 'PCB_ZONE.UPDATE']}
          deletePermissions={['PCB_ZONE_DELETE', 'PCB_ZONE.DELETE']}
        >
          {/* Tabs */}
          <Tabs
            tabs={[{ id: 'list', label: 'PCB Zone List' }]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'list' | 'form')}
          />
        </MasterPageLayout>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <PCBZoneFormModal
          pcbZone={editingPCBZone}
          onClose={() => {
            setShowModal(false);
            setEditingPCBZone(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// PCB Zone Form Modal Component
interface PCBZoneFormModalProps {
  pcbZone: PCBZone | null;
  onClose: () => void;
  onSave: (data: Partial<PCBZone>) => void;
}

const PCBZoneFormModal = ({ pcbZone, onClose, onSave }: PCBZoneFormModalProps) => {
  const [formData, setFormData] = useState<Partial<PCBZone>>(
    pcbZone || {
      pcbZoneName: '',
      pcbZoneAddress: '',
      contactNum: '',
      contactEmail: '',
      alertEmail: '',
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
          <h2 className="modal-title">{pcbZone ? 'Edit PCB Zone' : 'Add PCB Zone'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="pcb-zone-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label>PCB Zone Name *</label>
                <input
                  type="text"
                  value={formData.pcbZoneName || ''}
                  onChange={(e) => setFormData({ ...formData, pcbZoneName: e.target.value })}
                  required
                  disabled={!!pcbZone} // Disable when editing (immutable field)
                  style={pcbZone ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group form-group--full">
                <label>PCB Zone Address *</label>
                <textarea
                  value={formData.pcbZoneAddress || ''}
                  onChange={(e) => setFormData({ ...formData, pcbZoneAddress: e.target.value })}
                  required
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Contact Number *</label>
                <input
                  type="tel"
                  value={formData.contactNum || ''}
                  onChange={(e) => setFormData({ ...formData, contactNum: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact Email *</label>
                <input
                  type="email"
                  value={formData.contactEmail || ''}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Alert Email *</label>
                <input
                  type="email"
                  value={formData.alertEmail || ''}
                  onChange={(e) => setFormData({ ...formData, alertEmail: e.target.value })}
                  required
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
              {pcbZone ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PCBZoneMasterPage;

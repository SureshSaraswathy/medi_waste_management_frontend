import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingPCBZone, setEditingPCBZone] = useState<PCBZone | null>(null);
  const [pcbZones, setPcbZones] = useState<PCBZone[]>([
    {
      id: '1',
      pcbZoneName: 'Zone A',
      pcbZoneAddress: '123 Industrial Area, Mumbai',
      contactNum: '+91-9876543210',
      contactEmail: 'zonea@example.com',
      alertEmail: 'alert.zonea@example.com',
      status: 'Active',
      createdBy: 'Admin',
      createdOn: '2023-01-01',
      modifiedBy: 'Admin',
      modifiedOn: '2023-01-01',
    },
    {
      id: '2',
      pcbZoneName: 'Zone B',
      pcbZoneAddress: '456 Commercial Street, Delhi',
      contactNum: '+91-9876543211',
      contactEmail: 'zoneb@example.com',
      alertEmail: 'alert.zoneb@example.com',
      status: 'Active',
      createdBy: 'Admin',
      createdOn: '2023-01-01',
      modifiedBy: 'Admin',
      modifiedOn: '2023-01-01',
    },
  ]);

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

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this PCB Zone?')) {
      setPcbZones(pcbZones.filter(z => z.id !== id));
    }
  };

  const handleSave = (formData: Partial<PCBZone>) => {
    if (editingPCBZone) {
      // Update existing
      setPcbZones(pcbZones.map(z => 
        z.id === editingPCBZone.id 
          ? { ...z, ...formData, modifiedOn: new Date().toISOString().split('T')[0] }
          : z
      ));
    } else {
      // Add new
      const newPCBZone: PCBZone = {
        id: Date.now().toString(),
        ...formData as PCBZone,
        status: 'Active',
        createdBy: 'Current User',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'Current User',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setPcbZones([...pcbZones, newPCBZone]);
    }
    setShowModal(false);
    setEditingPCBZone(null);
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
            <span className="breadcrumb">/ Masters / PCB Zone Master</span>
          </div>
        </header>

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

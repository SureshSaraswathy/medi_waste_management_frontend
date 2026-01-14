import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './pcbZoneMasterPage.css';
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

        {/* PCB Zone Master Content */}
        <div className="pcb-zone-master-page">
          <div className="pcb-zone-master-header">
            <h1 className="pcb-zone-master-title">PCB Zone Master</h1>
          </div>

          {/* Tabs */}
          <div className="pcb-zone-master-tabs">
            <button
              className={`tab-button ${activeTab === 'list' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              PCB Zone List
            </button>
          </div>

          {/* Search and Add Button */}
          <div className="pcb-zone-master-actions">
            <div className="pcb-zone-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="pcb-zone-search-input"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="add-pcb-zone-btn" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add PCB Zone
            </button>
          </div>

          {/* Table */}
          <div className="pcb-zone-table-container">
            <table className="pcb-zone-table">
              <thead>
                <tr>
                  <th>PCB Zone Name</th>
                  <th>PCB Zone Address</th>
                  <th>Contact Number</th>
                  <th>Contact Email</th>
                  <th>Alert Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPCBZones.map((zone) => (
                  <tr key={zone.id}>
                    <td>{zone.pcbZoneName}</td>
                    <td>{zone.pcbZoneAddress}</td>
                    <td>{zone.contactNum}</td>
                    <td>{zone.contactEmail}</td>
                    <td>{zone.alertEmail}</td>
                    <td>
                      <span className={`status-badge status-badge--${zone.status.toLowerCase()}`}>
                        {zone.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="action-btn action-btn--edit"
                        onClick={() => handleEdit(zone)}
                        title="Edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        className="action-btn action-btn--delete"
                        onClick={() => handleDelete(zone.id)}
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Info */}
          <div className="pcb-zone-pagination-info">
            Showing {filteredPCBZones.length} of {pcbZones.length} Items
          </div>
        </div>
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

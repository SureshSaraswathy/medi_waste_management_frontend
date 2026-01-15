import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './barcodeGenerationPage.css';
import '../desktop/dashboardPage.css';

interface Barcode {
  id: string;
  companyID: string;
  barcodeValue: string;
  barcodeType: string;
  status: 'Available' | 'Assigned' | 'Used' | 'Blocked';
  assignedEntityType: string;
  assignedEntityID: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
  lastScannedAt?: string;
  scanCount?: number;
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

interface Entity {
  id: string;
  code: string;
  name: string;
  type: string;
  companyID: string;
}

const BarcodeGenerationPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkGenerateModal, setShowBulkGenerateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<Barcode | null>(null);
  const [assigningBarcode, setAssigningBarcode] = useState<Barcode | null>(null);

  // Master data
  const [companies] = useState<Company[]>([
    { id: '1', companyCode: 'COMP001', companyName: 'Sample Company', status: 'Active' },
    { id: '2', companyCode: 'COMP002', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', companyCode: 'COMP003', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  // Sample entities (containers, vehicles, etc.)
  const [entities] = useState<Entity[]>([
    { id: '1', code: 'CONT001', name: 'Container 001', type: 'Container', companyID: 'COMP001' },
    { id: '2', code: 'CONT002', name: 'Container 002', type: 'Container', companyID: 'COMP001' },
    { id: '3', code: 'VEH001', name: 'Vehicle 001', type: 'Vehicle', companyID: 'COMP001' },
    { id: '4', code: 'CONT003', name: 'Container 003', type: 'Container', companyID: 'COMP002' },
  ]);

  const [barcodes, setBarcodes] = useState<Barcode[]>([
    {
      id: '1',
      companyID: 'COMP001',
      barcodeValue: 'BC001234567890',
      barcodeType: 'Code128',
      status: 'Available',
      assignedEntityType: '',
      assignedEntityID: '',
      createdBy: 'System',
      createdOn: '2024-01-15',
      modifiedBy: 'System',
      modifiedOn: '2024-01-15',
      scanCount: 0,
    },
    {
      id: '2',
      companyID: 'COMP001',
      barcodeValue: 'BC001234567891',
      barcodeType: 'Code128',
      status: 'Assigned',
      assignedEntityType: 'Container',
      assignedEntityID: 'CONT001',
      createdBy: 'System',
      createdOn: '2024-01-15',
      modifiedBy: 'System',
      modifiedOn: '2024-01-16',
      scanCount: 0,
    },
    {
      id: '3',
      companyID: 'COMP002',
      barcodeValue: 'BC001234567892',
      barcodeType: 'QR Code',
      status: 'Used',
      assignedEntityType: 'Container',
      assignedEntityID: 'CONT003',
      createdBy: 'System',
      createdOn: '2024-01-15',
      modifiedBy: 'System',
      modifiedOn: '2024-01-17',
      lastScannedAt: '2024-01-17 10:30:00',
      scanCount: 5,
    },
    {
      id: '4',
      companyID: 'COMP001',
      barcodeValue: 'BC001234567893',
      barcodeType: 'Code128',
      status: 'Blocked',
      assignedEntityType: '',
      assignedEntityID: '',
      createdBy: 'System',
      createdOn: '2024-01-15',
      modifiedBy: 'System',
      modifiedOn: '2024-01-18',
      scanCount: 0,
    },
  ]);

  const filteredBarcodes = barcodes.filter(barcode => {
    const matchesSearch = 
      barcode.barcodeValue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barcode.companyID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      companies.find(c => c.companyCode === barcode.companyID)?.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barcode.barcodeType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barcode.assignedEntityID.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || barcode.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const generateBarcode = (companyID: string, barcodeType: string, prefix?: string): string => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const prefixStr = prefix ? prefix : 'BC';
    return `${prefixStr}${timestamp}${random}`;
  };

  const handleGenerate = (data: { companyID: string; barcodeType: string; prefix?: string }) => {
    const newBarcode: Barcode = {
      id: Date.now().toString(),
      companyID: data.companyID,
      barcodeValue: generateBarcode(data.companyID, data.barcodeType, data.prefix),
      barcodeType: data.barcodeType,
      status: 'Available',
      assignedEntityType: '',
      assignedEntityID: '',
      createdBy: 'System',
      createdOn: new Date().toISOString().split('T')[0],
      modifiedBy: 'System',
      modifiedOn: new Date().toISOString().split('T')[0],
      scanCount: 0,
    };
    setBarcodes([...barcodes, newBarcode]);
    setShowGenerateModal(false);
  };

  const handleBulkGenerate = (data: { companyID: string; barcodeType: string; count: number; prefix?: string }) => {
    const newBarcodes: Barcode[] = [];
    for (let i = 0; i < data.count; i++) {
      newBarcodes.push({
        id: (Date.now() + i).toString(),
        companyID: data.companyID,
        barcodeValue: generateBarcode(data.companyID, data.barcodeType, data.prefix),
        barcodeType: data.barcodeType,
        status: 'Available',
        assignedEntityType: '',
        assignedEntityID: '',
        createdBy: 'System',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'System',
        modifiedOn: new Date().toISOString().split('T')[0],
        scanCount: 0,
      });
    }
    setBarcodes([...barcodes, ...newBarcodes]);
    setShowBulkGenerateModal(false);
    alert(`Successfully generated ${data.count} barcodes`);
  };

  const handleAssign = (barcode: Barcode, entityType: string, entityID: string) => {
    if (barcode.status !== 'Available') {
      alert('Only Available barcodes can be assigned.');
      return;
    }
    setBarcodes(barcodes.map(b => 
      b.id === barcode.id 
        ? { 
            ...b, 
            status: 'Assigned',
            assignedEntityType: entityType,
            assignedEntityID: entityID,
            modifiedOn: new Date().toISOString().split('T')[0],
          }
        : b
    ));
    setShowAssignModal(false);
    setAssigningBarcode(null);
  };

  const handleUnassign = (barcode: Barcode) => {
    if (barcode.status !== 'Assigned') {
      alert('Only Assigned barcodes can be unassigned.');
      return;
    }
    if (window.confirm('Are you sure you want to unassign this barcode?')) {
      setBarcodes(barcodes.map(b => 
        b.id === barcode.id 
          ? { 
              ...b, 
              status: 'Available',
              assignedEntityType: '',
              assignedEntityID: '',
              modifiedOn: new Date().toISOString().split('T')[0],
            }
          : b
      ));
    }
  };

  const handleScan = (barcode: Barcode) => {
    if (barcode.status === 'Blocked') {
      alert('This barcode is blocked and cannot be scanned.');
      return;
    }
    if (barcode.status === 'Available') {
      alert('Please assign this barcode to an entity before scanning.');
      return;
    }
    // Simulate scan - update status to Used and increment scan count
    setBarcodes(barcodes.map(b => 
      b.id === barcode.id 
        ? { 
            ...b, 
            status: 'Used',
            lastScannedAt: new Date().toLocaleString(),
            scanCount: (b.scanCount || 0) + 1,
            modifiedOn: new Date().toISOString().split('T')[0],
          }
        : b
    ));
    alert(`Barcode ${barcode.barcodeValue} scanned successfully`);
  };

  const handleBlock = (barcode: Barcode) => {
    if (window.confirm('Are you sure you want to block this barcode? It cannot be used after blocking.')) {
      setBarcodes(barcodes.map(b => 
        b.id === barcode.id 
          ? { 
              ...b, 
              status: 'Blocked',
              modifiedOn: new Date().toISOString().split('T')[0],
            }
          : b
      ));
    }
  };

  const handleUnblock = (barcode: Barcode) => {
    if (window.confirm('Are you sure you want to unblock this barcode?')) {
      setBarcodes(barcodes.map(b => 
        b.id === barcode.id 
          ? { 
              ...b, 
              status: 'Available',
              modifiedOn: new Date().toISOString().split('T')[0],
            }
          : b
      ));
    }
  };

  const handlePrint = (barcode: Barcode) => {
    window.print();
  };

  const handlePreview = (barcode: Barcode) => {
    setSelectedBarcode(barcode);
    setShowPreviewModal(true);
  };

  const handleTrack = (barcode: Barcode) => {
    setSelectedBarcode(barcode);
    setShowTrackModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this barcode?')) {
      setBarcodes(barcodes.filter(barcode => barcode.id !== id));
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', active: location.pathname === '/dashboard' },
    { path: '/transaction', label: 'Transaction', icon: '💼', active: location.pathname === '/transaction' },
    { path: '/finance', label: 'Finance', icon: '💰', active: location.pathname === '/finance' },
    { path: '/commercial-agreements', label: 'Commercial Agreements', icon: '📝', active: location.pathname === '/commercial-agreements' },
    { path: '/compliance-training', label: 'Compliance & Training', icon: '✅', active: location.pathname === '/compliance-training' },
    { path: '/master', label: 'Masters', icon: '📋', active: location.pathname.startsWith('/master') },
    { path: '/report/billing-finance', label: 'Reports', icon: '📈', active: location.pathname.startsWith('/report') },
  ];

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-logo">Waste Management</h2>
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

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Transaction / Barcode Generation</span>
          </div>
        </header>

        <div className="barcode-generation-page">
          <div className="barcode-generation-header">
            <h1 className="barcode-generation-title">Barcode Generation</h1>
          </div>

          <div className="barcode-generation-actions">
            <div className="barcode-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="barcode-search-input"
                placeholder="Search Barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Assigned">Assigned</option>
              <option value="Used">Used</option>
              <option value="Blocked">Blocked</option>
            </select>
            <button className="bulk-generate-btn" onClick={() => setShowBulkGenerateModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Bulk Generate
            </button>
            <button className="generate-btn" onClick={() => setShowGenerateModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Generate
            </button>
          </div>

          <div className="barcode-table-container">
            <table className="barcode-table">
              <thead>
                <tr>
                  <th>Barcode Value</th>
                  <th>Company ID</th>
                  <th>Barcode Type</th>
                  <th>Status</th>
                  <th>Assigned Entity Type</th>
                  <th>Assigned Entity ID</th>
                  <th>Scan Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBarcodes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-message">
                      No barcode records found
                    </td>
                  </tr>
                ) : (
                  filteredBarcodes.map((barcode) => {
                    const company = companies.find(c => c.companyCode === barcode.companyID);
                    return (
                      <tr key={barcode.id}>
                        <td className="barcode-value-cell">{barcode.barcodeValue}</td>
                        <td>{company ? `${barcode.companyID} - ${company.companyName}` : barcode.companyID}</td>
                        <td>{barcode.barcodeType}</td>
                        <td>
                          <span className={`barcode-status-badge barcode-status-badge--${barcode.status.toLowerCase()}`}>
                            {barcode.status}
                          </span>
                        </td>
                        <td>{barcode.assignedEntityType || '-'}</td>
                        <td>{barcode.assignedEntityID || '-'}</td>
                        <td>{barcode.scanCount || 0}</td>
                        <td>
                          <div className="barcode-action-buttons">
                            <button
                              className="action-btn action-btn--preview"
                              onClick={() => handlePreview(barcode)}
                              title="Preview"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--print"
                              onClick={() => handlePrint(barcode)}
                              title="Print"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                              </svg>
                            </button>
                            {barcode.status === 'Available' && (
                              <button
                                className="action-btn action-btn--assign"
                                onClick={() => {
                                  setAssigningBarcode(barcode);
                                  setShowAssignModal(true);
                                }}
                                title="Assign"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="8.5" cy="7" r="4"></circle>
                                  <line x1="20" y1="8" x2="20" y2="14"></line>
                                  <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                              </button>
                            )}
                            {barcode.status === 'Assigned' && (
                              <button
                                className="action-btn action-btn--unassign"
                                onClick={() => handleUnassign(barcode)}
                                title="Unassign"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="8.5" cy="7" r="4"></circle>
                                  <line x1="20" y1="11" x2="14" y2="11"></line>
                                </svg>
                              </button>
                            )}
                            {(barcode.status === 'Assigned' || barcode.status === 'Used') && (
                              <button
                                className="action-btn action-btn--scan"
                                onClick={() => handleScan(barcode)}
                                title="Scan"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                                  <line x1="7" y1="8" x2="7" y2="16"></line>
                                  <line x1="11" y1="8" x2="11" y2="16"></line>
                                  <line x1="15" y1="8" x2="15" y2="16"></line>
                                  <line x1="19" y1="8" x2="19" y2="16"></line>
                                </svg>
                              </button>
                            )}
                            <button
                              className="action-btn action-btn--track"
                              onClick={() => handleTrack(barcode)}
                              title="Track"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                              </svg>
                            </button>
                            {barcode.status !== 'Blocked' && (
                              <button
                                className="action-btn action-btn--block"
                                onClick={() => handleBlock(barcode)}
                                title="Block"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                                  <line x1="9" y1="9" x2="15" y2="15"></line>
                                  <line x1="15" y1="9" x2="9" y2="15"></line>
                                </svg>
                              </button>
                            )}
                            {barcode.status === 'Blocked' && (
                              <button
                                className="action-btn action-btn--unblock"
                                onClick={() => handleUnblock(barcode)}
                                title="Unblock"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M9 12l2 2 4-4"></path>
                                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"></path>
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="barcode-pagination-info">
            Showing {filteredBarcodes.length} of {barcodes.length} Items
          </div>
        </div>
      </main>

      {/* Generate Modal */}
      {showGenerateModal && (
        <GenerateBarcodeModal
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerate}
        />
      )}

      {/* Bulk Generate Modal */}
      {showBulkGenerateModal && (
        <BulkGenerateBarcodeModal
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => setShowBulkGenerateModal(false)}
          onGenerate={handleBulkGenerate}
        />
      )}

      {/* Assign Modal */}
      {showAssignModal && assigningBarcode && (
        <AssignBarcodeModal
          barcode={assigningBarcode}
          companies={companies.filter(c => c.status === 'Active')}
          entities={entities}
          onClose={() => {
            setShowAssignModal(false);
            setAssigningBarcode(null);
          }}
          onAssign={handleAssign}
        />
      )}

      {/* Track Modal */}
      {showTrackModal && selectedBarcode && (
        <TrackBarcodeModal
          barcode={selectedBarcode}
          companies={companies}
          entities={entities}
          onClose={() => {
            setShowTrackModal(false);
            setSelectedBarcode(null);
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedBarcode && (
        <PreviewBarcodeModal
          barcode={selectedBarcode}
          companies={companies}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedBarcode(null);
          }}
        />
      )}
    </div>
  );
};

// Generate Barcode Modal
interface GenerateBarcodeModalProps {
  companies: Company[];
  onClose: () => void;
  onGenerate: (data: { companyID: string; barcodeType: string; prefix?: string }) => void;
}

const GenerateBarcodeModal = ({ companies, onClose, onGenerate }: GenerateBarcodeModalProps) => {
  const [formData, setFormData] = useState({
    companyID: '',
    barcodeType: 'Code128',
    prefix: 'BC',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyID) {
      alert('Please select a company');
      return;
    }
    onGenerate(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Generate Barcode</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="barcode-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Barcode Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company ID *</label>
                <select
                  value={formData.companyID}
                  onChange={(e) => setFormData({ ...formData, companyID: e.target.value })}
                  required
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.companyCode}>
                      {company.companyCode} - {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Barcode Type *</label>
                <select
                  value={formData.barcodeType}
                  onChange={(e) => setFormData({ ...formData, barcodeType: e.target.value })}
                  required
                >
                  <option value="Code128">Code128</option>
                  <option value="QR Code">QR Code</option>
                  <option value="Code39">Code39</option>
                  <option value="EAN-13">EAN-13</option>
                </select>
              </div>
              <div className="form-group">
                <label>Prefix (Optional)</label>
                <input
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                  placeholder="e.g., BC"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Generate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Bulk Generate Barcode Modal
interface BulkGenerateBarcodeModalProps {
  companies: Company[];
  onClose: () => void;
  onGenerate: (data: { companyID: string; barcodeType: string; count: number; prefix?: string }) => void;
}

const BulkGenerateBarcodeModal = ({ companies, onClose, onGenerate }: BulkGenerateBarcodeModalProps) => {
  const [formData, setFormData] = useState({
    companyID: '',
    barcodeType: 'Code128',
    count: 10,
    prefix: 'BC',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyID) {
      alert('Please select a company');
      return;
    }
    if (formData.count < 1 || formData.count > 1000) {
      alert('Count must be between 1 and 1000');
      return;
    }
    onGenerate(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Bulk Generate Barcodes</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="barcode-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Bulk Generation Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company ID *</label>
                <select
                  value={formData.companyID}
                  onChange={(e) => setFormData({ ...formData, companyID: e.target.value })}
                  required
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.companyCode}>
                      {company.companyCode} - {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Barcode Type *</label>
                <select
                  value={formData.barcodeType}
                  onChange={(e) => setFormData({ ...formData, barcodeType: e.target.value })}
                  required
                >
                  <option value="Code128">Code128</option>
                  <option value="QR Code">QR Code</option>
                  <option value="Code39">Code39</option>
                  <option value="EAN-13">EAN-13</option>
                </select>
              </div>
              <div className="form-group">
                <label>Count *</label>
                <input
                  type="number"
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 0 })}
                  required
                  min={1}
                  max={1000}
                  placeholder="Enter count (1-1000)"
                />
              </div>
              <div className="form-group">
                <label>Prefix (Optional)</label>
                <input
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                  placeholder="e.g., BC"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Bulk Generate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assign Barcode Modal
interface AssignBarcodeModalProps {
  barcode: Barcode;
  companies: Company[];
  entities: Entity[];
  onClose: () => void;
  onAssign: (barcode: Barcode, entityType: string, entityID: string) => void;
}

const AssignBarcodeModal = ({ barcode, companies, onClose, onAssign }: AssignBarcodeModalProps) => {
  const [formData, setFormData] = useState({
    entityType: '',
    entityID: '',
  });

  // Filter entities based on selected company and entity type
  const filteredEntities = formData.entityType
    ? entities.filter(e => e.companyID === barcode.companyID && e.type === formData.entityType)
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entityType || !formData.entityID) {
      alert('Please select entity type and entity');
      return;
    }
    onAssign(barcode, formData.entityType, formData.entityID);
  };

  const entityTypes = ['Container', 'Vehicle', 'Bin', 'Equipment'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Assign Barcode</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="barcode-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Assignment Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Barcode Value</label>
                <input
                  type="text"
                  value={barcode.barcodeValue}
                  readOnly
                  style={{ backgroundColor: '#f1f5f9' }}
                />
              </div>
              <div className="form-group">
                <label>Company ID</label>
                <input
                  type="text"
                  value={barcode.companyID}
                  readOnly
                  style={{ backgroundColor: '#f1f5f9' }}
                />
              </div>
              <div className="form-group">
                <label>Entity Type *</label>
                <select
                  value={formData.entityType}
                  onChange={(e) => {
                    setFormData({ ...formData, entityType: e.target.value, entityID: '' });
                  }}
                  required
                >
                  <option value="">Select Entity Type</option>
                  {entityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Entity ID *</label>
                <select
                  value={formData.entityID}
                  onChange={(e) => setFormData({ ...formData, entityID: e.target.value })}
                  required
                  disabled={!formData.entityType}
                >
                  <option value="">Select Entity</option>
                  {filteredEntities.map((entity) => (
                    <option key={entity.id} value={entity.code}>
                      {entity.code} - {entity.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--success">
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Track Barcode Modal
interface TrackBarcodeModalProps {
  barcode: Barcode;
  companies: Company[];
  entities: Entity[];
  onClose: () => void;
}

const TrackBarcodeModal = ({ barcode, companies, onClose }: TrackBarcodeModalProps) => {
  const company = companies.find(c => c.companyCode === barcode.companyID);
  const entity = entities.find(e => e.code === barcode.assignedEntityID);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--view" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Track Barcode - {barcode.barcodeValue}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="barcode-view-content">
          <div className="barcode-view-section">
            <h3 className="barcode-view-section-title">Barcode Information</h3>
            <div className="barcode-view-grid">
              <div className="barcode-view-field">
                <label>Barcode Value:</label>
                <span className="barcode-value-display">{barcode.barcodeValue}</span>
              </div>
              <div className="barcode-view-field">
                <label>Company ID:</label>
                <span>{company ? `${barcode.companyID} - ${company.companyName}` : barcode.companyID}</span>
              </div>
              <div className="barcode-view-field">
                <label>Barcode Type:</label>
                <span>{barcode.barcodeType}</span>
              </div>
              <div className="barcode-view-field">
                <label>Status:</label>
                <span className={`barcode-status-badge barcode-status-badge--${barcode.status.toLowerCase()}`}>
                  {barcode.status}
                </span>
              </div>
            </div>
          </div>

          <div className="barcode-view-section">
            <h3 className="barcode-view-section-title">Assignment Information</h3>
            <div className="barcode-view-grid">
              <div className="barcode-view-field">
                <label>Assigned Entity Type:</label>
                <span>{barcode.assignedEntityType || '-'}</span>
              </div>
              <div className="barcode-view-field">
                <label>Assigned Entity ID:</label>
                <span>{entity ? `${barcode.assignedEntityID} - ${entity.name}` : (barcode.assignedEntityID || '-')}</span>
              </div>
            </div>
          </div>

          <div className="barcode-view-section">
            <h3 className="barcode-view-section-title">Usage History</h3>
            <div className="barcode-view-grid">
              <div className="barcode-view-field">
                <label>Scan Count:</label>
                <span className="barcode-view-field--highlight">{barcode.scanCount || 0}</span>
              </div>
              <div className="barcode-view-field">
                <label>Last Scanned At:</label>
                <span>{barcode.lastScannedAt || 'Never'}</span>
              </div>
              <div className="barcode-view-field">
                <label>Created On:</label>
                <span>{barcode.createdOn}</span>
              </div>
              <div className="barcode-view-field">
                <label>Modified On:</label>
                <span>{barcode.modifiedOn}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

// Preview Barcode Modal
interface PreviewBarcodeModalProps {
  barcode: Barcode;
  companies: Company[];
  onClose: () => void;
}

const PreviewBarcodeModal = ({ barcode, companies, onClose }: PreviewBarcodeModalProps) => {
  const company = companies.find(c => c.companyCode === barcode.companyID);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--view" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Preview Barcode</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="barcode-view-content">
          <div className="barcode-preview-section">
            <div className="barcode-preview-display">
              <div className="barcode-preview-value">{barcode.barcodeValue}</div>
              <div className="barcode-preview-type">{barcode.barcodeType}</div>
              <div className="barcode-preview-company">{company?.companyName || barcode.companyID}</div>
            </div>
          </div>

          <div className="barcode-view-section">
            <h3 className="barcode-view-section-title">Barcode Details</h3>
            <div className="barcode-view-grid">
              <div className="barcode-view-field">
                <label>Barcode Value:</label>
                <span>{barcode.barcodeValue}</span>
              </div>
              <div className="barcode-view-field">
                <label>Company ID:</label>
                <span>{company ? `${barcode.companyID} - ${company.companyName}` : barcode.companyID}</span>
              </div>
              <div className="barcode-view-field">
                <label>Barcode Type:</label>
                <span>{barcode.barcodeType}</span>
              </div>
              <div className="barcode-view-field">
                <label>Status:</label>
                <span className={`barcode-status-badge barcode-status-badge--${barcode.status.toLowerCase()}`}>
                  {barcode.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerationPage;

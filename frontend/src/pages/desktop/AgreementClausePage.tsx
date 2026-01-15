import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './agreementClausePage.css';
import '../desktop/dashboardPage.css';

interface AgreementClause {
  id: string;
  agreementClauseID: string;
  agreementID: string;
  pointNum: string;
  pointTitle: string;
  pointText: string;
  sequenceNo: number;
  status: 'Active' | 'Inactive';
}

interface Agreement {
  id: string;
  agreementID: string;
  agreementNum: string;
  status: 'Draft' | 'Generated' | 'Signed';
}

const AgreementClausePage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [agreementFilter, setAgreementFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClause, setEditingClause] = useState<AgreementClause | null>(null);

  // Sample agreements
  const [agreements] = useState<Agreement[]>([
    { id: '1', agreementID: 'AGR001', agreementNum: 'AGR-2024-001', status: 'Generated' },
    { id: '2', agreementID: 'AGR002', agreementNum: 'AGR-2024-002', status: 'Generated' },
    { id: '3', agreementID: 'AGR003', agreementNum: 'AGR-2024-003', status: 'Signed' },
  ]);

  const [clauses, setClauses] = useState<AgreementClause[]>([
    {
      id: '1',
      agreementClauseID: 'CLS001',
      agreementID: 'AGR001',
      pointNum: '1',
      pointTitle: 'Termination',
      pointText: 'Either party may terminate this agreement with 30 days written notice.',
      sequenceNo: 1,
      status: 'Active',
    },
    {
      id: '2',
      agreementClauseID: 'CLS002',
      agreementID: 'AGR001',
      pointNum: '2',
      pointTitle: 'Jurisdiction',
      pointText: 'This agreement shall be governed by the laws of the jurisdiction in which services are provided.',
      sequenceNo: 2,
      status: 'Active',
    },
    {
      id: '3',
      agreementClauseID: 'CLS003',
      agreementID: 'AGR001',
      pointNum: '3',
      pointTitle: 'Liability',
      pointText: 'Each party shall be liable for their own actions and not for actions of third parties.',
      sequenceNo: 3,
      status: 'Active',
    },
    {
      id: '4',
      agreementClauseID: 'CLS004',
      agreementID: 'AGR002',
      pointNum: '1',
      pointTitle: 'Confidentiality',
      pointText: 'All information shared between parties shall be kept confidential and not disclosed to third parties.',
      sequenceNo: 1,
      status: 'Active',
    },
  ]);

  const filteredClauses = clauses.filter(clause => {
    const matchesSearch = 
      clause.pointTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clause.pointText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clause.pointNum.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAgreement = agreementFilter === 'All' || clause.agreementID === agreementFilter;
    const matchesStatus = statusFilter === 'All' || clause.status === statusFilter;
    
    return matchesSearch && matchesAgreement && matchesStatus;
  });

  const handleCreate = () => {
    setEditingClause(null);
    setShowCreateModal(true);
  };

  const handleEdit = (clause: AgreementClause) => {
    setEditingClause(clause);
    setShowCreateModal(true);
  };

  const handleMoveUp = (clause: AgreementClause) => {
    const index = clauses.findIndex(c => c.id === clause.id);
    if (index > 0) {
      const prevClause = clauses[index - 1];
      if (prevClause.agreementID === clause.agreementID) {
        const updated = [...clauses];
        updated[index] = { ...clause, sequenceNo: prevClause.sequenceNo };
        updated[index - 1] = { ...prevClause, sequenceNo: clause.sequenceNo };
        setClauses(updated.sort((a, b) => {
          if (a.agreementID !== b.agreementID) return 0;
          return a.sequenceNo - b.sequenceNo;
        }));
      }
    }
  };

  const handleMoveDown = (clause: AgreementClause) => {
    const index = clauses.findIndex(c => c.id === clause.id);
    if (index < clauses.length - 1) {
      const nextClause = clauses[index + 1];
      if (nextClause.agreementID === clause.agreementID) {
        const updated = [...clauses];
        updated[index] = { ...clause, sequenceNo: nextClause.sequenceNo };
        updated[index + 1] = { ...nextClause, sequenceNo: clause.sequenceNo };
        setClauses(updated.sort((a, b) => {
          if (a.agreementID !== b.agreementID) return 0;
          return a.sequenceNo - b.sequenceNo;
        }));
      }
    }
  };

  const handleDeactivate = (clause: AgreementClause) => {
    if (window.confirm('Deactivate this clause? (Clauses cannot be deleted, only deactivated)')) {
      setClauses(clauses.map(c => 
        c.id === clause.id 
          ? { ...c, status: 'Inactive' }
          : c
      ));
    }
  };

  const handleActivate = (clause: AgreementClause) => {
    setClauses(clauses.map(c => 
      c.id === clause.id 
        ? { ...c, status: 'Active' }
        : c
    ));
  };

  const handleSave = (data: Partial<AgreementClause>) => {
    if (editingClause) {
      setClauses(clauses.map(c => 
        c.id === editingClause.id 
          ? { ...c, ...data } as AgreementClause
          : c
      ));
    } else {
      const maxSeq = clauses
        .filter(c => c.agreementID === data.agreementID)
        .reduce((max, c) => Math.max(max, c.sequenceNo), 0);
      
      const newClause: AgreementClause = {
        ...data as AgreementClause,
        id: Date.now().toString(),
        agreementClauseID: `CLS${String(clauses.length + 1).padStart(3, '0')}`,
        sequenceNo: maxSeq + 1,
        status: 'Active',
      };
      setClauses([...clauses, newClause]);
    }
    setShowCreateModal(false);
    setEditingClause(null);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', active: location.pathname === '/dashboard' },
    { path: '/transaction', label: 'Transaction', icon: '💼', active: location.pathname === '/transaction' },
    { path: '/finance', label: 'Finance', icon: '💰', active: location.pathname === '/finance' },
    { path: '/commercial-agreements', label: 'Commercial Agreements', icon: '📝', active: location.pathname.startsWith('/commercial-agreements') },
    { path: '/compliance-training', label: 'Compliance & Training', icon: '✅', active: location.pathname.startsWith('/compliance-training') },
    { path: '/master', label: 'Masters', icon: '📋', active: location.pathname.startsWith('/master') },
    { path: '/report/billing-finance', label: 'Reports', icon: '📈', active: location.pathname.startsWith('/report') },
  ];

  // Sort clauses by agreement ID and sequence number
  const sortedFilteredClauses = [...filteredClauses].sort((a, b) => {
    if (a.agreementID !== b.agreementID) {
      return a.agreementID.localeCompare(b.agreementID);
    }
    return a.sequenceNo - b.sequenceNo;
  });

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
            <span className="breadcrumb">/ Commercial Agreements / Agreement Clause Management</span>
          </div>
        </header>

        <div className="agreement-clause-page">
          <div className="agreement-clause-header">
            <h1 className="agreement-clause-title">Agreement Clause Management</h1>
          </div>

          <div className="agreement-clause-filters">
            <div className="clause-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="clause-search-input"
                placeholder="Search Clause..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={agreementFilter}
              onChange={(e) => setAgreementFilter(e.target.value)}
            >
              <option value="All">All Agreements</option>
              {agreements.map((agreement) => (
                <option key={agreement.id} value={agreement.agreementID}>
                  {agreement.agreementID} - {agreement.agreementNum}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button className="add-clause-btn" onClick={handleCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Clause
            </button>
          </div>

          <div className="clause-table-container">
            <table className="clause-table">
              <thead>
                <tr>
                  <th>Agreement ID</th>
                  <th>Sequence</th>
                  <th>Point Num</th>
                  <th>Point Title</th>
                  <th>Point Text</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredClauses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-message">
                      No clause records found
                    </td>
                  </tr>
                ) : (
                  sortedFilteredClauses.map((clause, index) => {
                    const agreement = agreements.find(a => a.agreementID === clause.agreementID);
                    const sameAgreementClauses = sortedFilteredClauses.filter(c => c.agreementID === clause.agreementID);
                    const currentIndex = sameAgreementClauses.findIndex(c => c.id === clause.id);
                    const canMoveUp = currentIndex > 0;
                    const canMoveDown = currentIndex < sameAgreementClauses.length - 1;
                    
                    return (
                      <tr key={clause.id}>
                        <td>{agreement ? `${clause.agreementID} - ${agreement.agreementNum}` : clause.agreementID}</td>
                        <td className="sequence-cell">{clause.sequenceNo}</td>
                        <td>{clause.pointNum}</td>
                        <td className="title-cell">{clause.pointTitle}</td>
                        <td className="text-cell">{clause.pointText}</td>
                        <td>
                          <span className={`clause-status-badge clause-status-badge--${clause.status.toLowerCase()}`}>
                            {clause.status}
                          </span>
                        </td>
                        <td>
                          <div className="clause-action-buttons">
                            <button
                              className="action-btn action-btn--edit"
                              onClick={() => handleEdit(clause)}
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--up"
                              onClick={() => handleMoveUp(clause)}
                              disabled={!canMoveUp}
                              title="Move Up"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="18 15 12 9 6 15"></polyline>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--down"
                              onClick={() => handleMoveDown(clause)}
                              disabled={!canMoveDown}
                              title="Move Down"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </button>
                            {clause.status === 'Active' ? (
                              <button
                                className="action-btn action-btn--deactivate"
                                onClick={() => handleDeactivate(clause)}
                                title="Deactivate"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="15" y1="9" x2="9" y2="15"></line>
                                  <line x1="9" y1="9" x2="15" y2="15"></line>
                                </svg>
                              </button>
                            ) : (
                              <button
                                className="action-btn action-btn--activate"
                                onClick={() => handleActivate(clause)}
                                title="Activate"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
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
          <div className="clause-pagination-info">
            Showing {sortedFilteredClauses.length} of {clauses.length} Items
          </div>
        </div>
      </main>

      {/* Create/Edit Clause Modal */}
      {showCreateModal && (
        <ClauseFormModal
          clause={editingClause}
          agreements={agreements}
          onClose={() => {
            setShowCreateModal(false);
            setEditingClause(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Clause Form Modal
interface ClauseFormModalProps {
  clause: AgreementClause | null;
  agreements: Agreement[];
  onClose: () => void;
  onSave: (data: Partial<AgreementClause>) => void;
}

const ClauseFormModal = ({ clause, agreements, onClose, onSave }: ClauseFormModalProps) => {
  const [formData, setFormData] = useState<Partial<AgreementClause>>(
    clause || {
      agreementID: '',
      pointNum: '',
      pointTitle: '',
      pointText: '',
      sequenceNo: 0,
      status: 'Active',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreementID || !formData.pointTitle || !formData.pointText) {
      alert('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{clause ? 'Edit Agreement Clause' : 'Add Agreement Clause'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="clause-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Clause Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Agreement ID *</label>
                <select
                  value={formData.agreementID || ''}
                  onChange={(e) => setFormData({ ...formData, agreementID: e.target.value })}
                  required
                  disabled={!!clause}
                >
                  <option value="">Select Agreement</option>
                  {agreements.map((agreement) => (
                    <option key={agreement.id} value={agreement.agreementID}>
                      {agreement.agreementID} - {agreement.agreementNum}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Point Number</label>
                <input
                  type="text"
                  value={formData.pointNum || ''}
                  onChange={(e) => setFormData({ ...formData, pointNum: e.target.value })}
                  placeholder="e.g., 1, 2, 3"
                />
              </div>
              <div className="form-group form-group--full">
                <label>Point Title *</label>
                <input
                  type="text"
                  value={formData.pointTitle || ''}
                  onChange={(e) => setFormData({ ...formData, pointTitle: e.target.value })}
                  required
                  placeholder="e.g., Termination, Jurisdiction, Liability"
                />
              </div>
              <div className="form-group form-group--full">
                <label>Point Text *</label>
                <textarea
                  value={formData.pointText || ''}
                  onChange={(e) => setFormData({ ...formData, pointText: e.target.value })}
                  required
                  placeholder="Enter the clause text..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {clause ? 'Update' : 'Add'} Clause
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgreementClausePage;

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './agreementPage.css';
import '../desktop/dashboardPage.css';

interface Agreement {
  id: string;
  agreementID: string;
  contractID: string;
  agreementNum: string;
  agreementDate: string;
  status: 'Draft' | 'Generated' | 'Signed';
  createdBy: string;
  createdOn: string;
}

interface Contract {
  id: string;
  contractID: string;
  contractNum: string;
  status: 'Draft' | 'Active' | 'Closed';
}

const AgreementPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Sample contracts - only Active contracts can generate agreements
  const [contracts] = useState<Contract[]>([
    { id: '1', contractID: 'CNT001', contractNum: 'CONTRACT-2024-001', status: 'Active' },
    { id: '2', contractID: 'CNT002', contractNum: 'CONTRACT-2024-002', status: 'Active' },
    { id: '3', contractID: 'CNT003', contractNum: 'CONTRACT-2024-003', status: 'Draft' },
  ]);

  const [agreements, setAgreements] = useState<Agreement[]>([
    {
      id: '1',
      agreementID: 'AGR001',
      contractID: 'CNT001',
      agreementNum: 'AGR-2024-001',
      agreementDate: '2024-01-15',
      status: 'Generated',
      createdBy: 'System',
      createdOn: '2024-01-15',
    },
    {
      id: '2',
      agreementID: 'AGR002',
      contractID: 'CNT002',
      agreementNum: 'AGR-2024-002',
      agreementDate: '2024-02-01',
      status: 'Signed',
      createdBy: 'System',
      createdOn: '2024-02-01',
    },
  ]);

  const filteredAgreements = agreements.filter(agreement => {
    const matchesSearch = 
      agreement.agreementNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agreement.agreementID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agreement.contractID.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || agreement.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleGenerate = () => {
    setSelectedContract(null);
    setShowGenerateModal(true);
  };

  const handlePreview = (agreement: Agreement) => {
    setSelectedAgreement(agreement);
    setShowPreviewModal(true);
  };

  const handleDownloadPDF = (agreement: Agreement) => {
    alert('PDF download functionality will be implemented');
  };

  const handleEmail = (agreement: Agreement) => {
    alert('Email functionality will be implemented');
  };

  const handleGenerateAgreement = (contractID: string) => {
    const contract = contracts.find(c => c.contractID === contractID);
    if (!contract) return;

    const newAgreement: Agreement = {
      id: Date.now().toString(),
      agreementID: `AGR${String(agreements.length + 1).padStart(3, '0')}`,
      contractID: contractID,
      agreementNum: `AGR-${new Date().getFullYear()}-${String(agreements.length + 1).padStart(3, '0')}`,
      agreementDate: new Date().toISOString().split('T')[0],
      status: 'Generated',
      createdBy: 'System',
      createdOn: new Date().toISOString().split('T')[0],
    };
    setAgreements([...agreements, newAgreement]);
    setShowGenerateModal(false);
    alert(`Agreement ${newAgreement.agreementNum} generated successfully`);
  };

  const handleMarkAsSigned = (agreement: Agreement) => {
    if (window.confirm('Mark this agreement as signed?')) {
      setAgreements(agreements.map(a => 
        a.id === agreement.id 
          ? { ...a, status: 'Signed' }
          : a
      ));
    }
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
            <span className="breadcrumb">/ Commercial Agreements / Agreement Management</span>
          </div>
        </header>

        <div className="agreement-page">
          <div className="agreement-header">
            <h1 className="agreement-title">Agreement Management</h1>
          </div>

          <div className="agreement-actions">
            <div className="agreement-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="agreement-search-input"
                placeholder="Search Agreement..."
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
              <option value="Draft">Draft</option>
              <option value="Generated">Generated</option>
              <option value="Signed">Signed</option>
            </select>
            <button className="generate-agreement-btn" onClick={handleGenerate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Generate Agreement
            </button>
          </div>

          <div className="agreement-table-container">
            <table className="agreement-table">
              <thead>
                <tr>
                  <th>Agreement Number</th>
                  <th>Agreement ID</th>
                  <th>Contract ID</th>
                  <th>Agreement Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-message">
                      No agreement records found
                    </td>
                  </tr>
                ) : (
                  filteredAgreements.map((agreement) => {
                    const contract = contracts.find(c => c.contractID === agreement.contractID);
                    return (
                      <tr key={agreement.id}>
                        <td className="agreement-num-cell">{agreement.agreementNum}</td>
                        <td>{agreement.agreementID}</td>
                        <td>{contract ? `${agreement.contractID} - ${contract.contractNum}` : agreement.contractID}</td>
                        <td>{agreement.agreementDate}</td>
                        <td>
                          <span className={`agreement-status-badge agreement-status-badge--${agreement.status.toLowerCase()}`}>
                            {agreement.status}
                          </span>
                        </td>
                        <td>
                          <div className="agreement-action-buttons">
                            <button
                              className="action-btn action-btn--preview"
                              onClick={() => handlePreview(agreement)}
                              title="Preview"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            {agreement.status !== 'Draft' && (
                              <>
                                <button
                                  className="action-btn action-btn--download"
                                  onClick={() => handleDownloadPDF(agreement)}
                                  title="Download PDF"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                  </svg>
                                </button>
                                <button
                                  className="action-btn action-btn--email"
                                  onClick={() => handleEmail(agreement)}
                                  title="Email"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                  </svg>
                                </button>
                                {agreement.status === 'Generated' && (
                                  <button
                                    className="action-btn action-btn--sign"
                                    onClick={() => handleMarkAsSigned(agreement)}
                                    title="Mark as Signed"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M20 6L9 17l-5-5"></path>
                                    </svg>
                                  </button>
                                )}
                              </>
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
          <div className="agreement-pagination-info">
            Showing {filteredAgreements.length} of {agreements.length} Items
          </div>
        </div>
      </main>

      {/* Generate Agreement Modal */}
      {showGenerateModal && (
        <GenerateAgreementModal
          contracts={contracts.filter(c => c.status === 'Active')}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerateAgreement}
        />
      )}

      {/* Preview Agreement Modal */}
      {showPreviewModal && selectedAgreement && (
        <AgreementPreviewModal
          agreement={selectedAgreement}
          contract={contracts.find(c => c.contractID === selectedAgreement.contractID)}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedAgreement(null);
          }}
          onDownloadPDF={handleDownloadPDF}
        />
      )}
    </div>
  );
};

// Generate Agreement Modal
interface GenerateAgreementModalProps {
  contracts: Contract[];
  onClose: () => void;
  onGenerate: (contractID: string) => void;
}

const GenerateAgreementModal = ({ contracts, onClose, onGenerate }: GenerateAgreementModalProps) => {
  const [selectedContractID, setSelectedContractID] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractID) {
      alert('Please select a contract');
      return;
    }
    onGenerate(selectedContractID);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Generate Agreement</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="agreement-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Agreement Information</h3>
            <div className="form-grid">
              <div className="form-group form-group--full">
                <label>Select Contract *</label>
                <select
                  value={selectedContractID}
                  onChange={(e) => setSelectedContractID(e.target.value)}
                  required
                >
                  <option value="">Select Contract</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.contractID}>
                      {contract.contractID} - {contract.contractNum}
                    </option>
                  ))}
                </select>
                <p className="form-help-text">Only Active contracts can be used to generate agreements</p>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Generate Agreement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Agreement Preview Modal
interface AgreementPreviewModalProps {
  agreement: Agreement;
  contract: Contract | undefined;
  onClose: () => void;
  onDownloadPDF: (agreement: Agreement) => void;
}

const AgreementPreviewModal = ({ agreement, contract, onClose, onDownloadPDF }: AgreementPreviewModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--view modal-content--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Agreement Preview - {agreement.agreementNum}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="agreement-preview-content">
          <div className="agreement-preview-section">
            <h3 className="preview-section-title">Agreement Details</h3>
            <div className="preview-grid">
              <div className="preview-field">
                <label>Agreement Number:</label>
                <span>{agreement.agreementNum}</span>
              </div>
              <div className="preview-field">
                <label>Agreement ID:</label>
                <span>{agreement.agreementID}</span>
              </div>
              <div className="preview-field">
                <label>Contract ID:</label>
                <span>{contract ? `${agreement.contractID} - ${contract.contractNum}` : agreement.contractID}</span>
              </div>
              <div className="preview-field">
                <label>Agreement Date:</label>
                <span>{agreement.agreementDate}</span>
              </div>
              <div className="preview-field">
                <label>Status:</label>
                <span className={`agreement-status-badge agreement-status-badge--${agreement.status.toLowerCase()}`}>
                  {agreement.status}
                </span>
              </div>
            </div>
          </div>

          <div className="agreement-preview-section">
            <h3 className="preview-section-title">Section 1 - Commercial Terms</h3>
            <p className="preview-note">Content from ContractSub will be displayed here</p>
          </div>

          <div className="agreement-preview-section">
            <h3 className="preview-section-title">Section 2 - Legal Terms</h3>
            <p className="preview-note">Content from AgreementClause will be displayed here</p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Back
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onDownloadPDF(agreement)}>
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgreementPage;

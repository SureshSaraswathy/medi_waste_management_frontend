import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAgreementFilters, Agreement } from '../../hooks/useAgreementFilters';
import { agreementService } from '../../services/agreementService';
import { contractService } from '../../services/contractService';
import { agreementClauseService, AgreementClauseResponse } from '../../services/agreementClauseService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import DataTable, { Column } from '../../components/common/DataTable';
// @ts-ignore - html2pdf.js doesn't have TypeScript definitions
import html2pdf from 'html2pdf.js';
import './agreementPage.css';
import '../desktop/dashboardPage.css';

interface Contract {
  id: string;
  contractID: string;
  contractNum: string;
}

const AgreementPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const contractIdParam = searchParams.get('contractId');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Load contracts
  const loadContracts = useCallback(async () => {
    try {
      const data = await contractService.getAllContracts();
      setContracts(data.map(c => ({
        id: c.id,
        contractID: c.contractID,
        contractNum: c.contractNum,
      })));
    } catch (err: any) {
      console.error('Failed to load contracts:', err);
    }
  }, []);

  // Load agreements
  const loadAgreements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agreementService.getAllAgreements(contractIdParam || undefined);
      
      const mappedAgreements: Agreement[] = data.map(agreement => {
        const contract = contracts.find(c => c.id === agreement.contractId);
        return {
          id: agreement.id,
          agreementID: agreement.agreementID,
          contractID: agreement.contractId,
          contractNum: contract?.contractNum || '',
          agreementNum: agreement.agreementNum,
          agreementDate: agreement.agreementDate,
          status: agreement.status,
        };
      });
      
      setAgreements(mappedAgreements);
    } catch (err: any) {
      console.error('Failed to load agreements:', err);
      setError(err.message || 'Failed to load agreements');
    } finally {
      setLoading(false);
    }
  }, [contractIdParam, contracts]);

  // Initial load
  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  useEffect(() => {
    if (contracts.length > 0) {
      loadAgreements();
    }
  }, [contracts.length, loadAgreements]);

  // Use custom hook for filtering logic
  const { filteredAgreements } = useAgreementFilters({
    agreements,
    searchQuery,
    statusFilter,
  });

  // Handle Add
  const handleAdd = () => {
    setEditingAgreement(null);
    setShowFormModal(true);
  };

  // Handle Edit
  const handleEdit = (agreement: Agreement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAgreement(agreement);
    setShowFormModal(true);
  };

  // Handle Save
  const handleSave = async (data: Partial<Agreement>) => {
    try {
      setSaving(true);
      setError(null);

      if (editingAgreement) {
        await agreementService.updateAgreement(editingAgreement.id, {
          agreementNum: data.agreementNum,
          agreementDate: data.agreementDate,
          status: data.status,
        });
      } else {
        if (!data.contractID) {
          alert('Please select a contract');
          return;
        }
        await agreementService.createAgreement({
          contractId: data.contractID!,
          agreementDate: data.agreementDate!,
          status: data.status,
        });
      }

      setShowFormModal(false);
      setEditingAgreement(null);
      await loadAgreements();
    } catch (err: any) {
      console.error('Failed to save agreement:', err);
      setError(err.message || 'Failed to save agreement');
      alert(err.message || 'Failed to save agreement');
    } finally {
      setSaving(false);
    }
  };

  // Handle View Agreement
  const handleView = (agreement: Agreement) => {
    setSelectedAgreement(agreement);
    setShowPreviewModal(true);
  };


  // Status badge component
  const StatusBadge = ({ status }: { status: Agreement['status'] }) => {
    const statusClass = `agreement-status-badge agreement-status-badge--${status.toLowerCase()}`;
    return (
      <span className={statusClass} role="status" aria-label={`Status: ${status}`}>
        {status}
      </span>
    );
  };

  // Actions component
  const ActionsCell = ({ agreement }: { agreement: Agreement }) => (
    <div className="agreement-action-buttons" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <button
        className="action-btn action-btn--edit"
        onClick={(e) => handleEdit(agreement, e)}
        title="Edit Agreement"
        aria-label={`Edit agreement ${agreement.agreementNum}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button
        className="action-btn action-btn--view"
        onClick={() => handleView(agreement)}
        title="View Agreement"
        aria-label={`View agreement ${agreement.agreementNum}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </button>
    </div>
  );

  // Define table columns
  const columns: Column<Agreement>[] = [
    {
      key: 'agreementNum',
      label: 'Agreement Number',
      minWidth: 180,
      render: (agreement) => (
        <span className="agreement-num-cell">{agreement.agreementNum}</span>
      ),
    },
    {
      key: 'agreementID',
      label: 'Agreement ID',
      minWidth: 120,
    },
    {
      key: 'contractNum',
      label: 'Contract Reference',
      minWidth: 180,
      render: (agreement) => 
        agreement.contractNum 
          ? `${agreement.contractID} - ${agreement.contractNum}`
          : agreement.contractID,
    },
    {
      key: 'agreementDate',
      label: 'Agreement Date',
      minWidth: 140,
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: 120,
      render: (agreement) => <StatusBadge status={agreement.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      minWidth: 120,
      render: (agreement) => <ActionsCell agreement={agreement} />,
    },
  ];

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
    <div className="dashboard-page">
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

          {error && (
            <div className="error-message" style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
              {error}
            </div>
          )}

          <div className="agreement-actions">
            <div className="agreement-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="agreement-search-input"
                placeholder="Search by agreement number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search agreements by agreement number"
              />
            </div>
            <select
              className="status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="All">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Generated">Generated</option>
              <option value="Signed">Signed</option>
            </select>
            <button className="add-agreement-btn" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Agreement
            </button>
          </div>

          {loading && (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading agreements...</div>
          )}

          <div className="agreement-table-container">
            <DataTable
              data={filteredAgreements}
              columns={columns}
              getId={(agreement) => agreement.id}
              emptyMessage="No agreement records found"
            />
          </div>

          <div className="agreement-pagination-info">
            Showing {filteredAgreements.length} of {agreements.length} Items
          </div>
        </div>
      </main>

      {/* Create/Edit Agreement Modal */}
      {showFormModal && (
        <AgreementFormModal
          agreement={editingAgreement}
          contracts={contracts}
          contractIdParam={contractIdParam}
          saving={saving}
          onClose={() => {
            setShowFormModal(false);
            setEditingAgreement(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Preview Agreement Modal */}
      {showPreviewModal && selectedAgreement && (
        <AgreementPreviewModal
          agreement={selectedAgreement}
          contractNum={selectedAgreement.contractNum}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedAgreement(null);
          }}
        />
      )}
    </div>
  );
};

// Agreement Form Modal
interface AgreementFormModalProps {
  agreement: Agreement | null;
  contracts: Contract[];
  contractIdParam: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<Agreement>) => void;
}

const AgreementFormModal = ({ agreement, contracts, contractIdParam, saving, onClose, onSave }: AgreementFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Agreement>>(
    agreement || {
      contractID: contractIdParam || '',
      agreementNum: '',
      agreementDate: new Date().toISOString().split('T')[0],
      status: 'Draft',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractID || !formData.agreementDate) {
      alert('Please fill in all required fields');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{agreement ? 'Edit Agreement' : 'Add Agreement'}</h2>
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
              <div className="form-group">
                <label>Contract *</label>
                <select
                  value={formData.contractID || ''}
                  onChange={(e) => setFormData({ ...formData, contractID: e.target.value })}
                  required
                  disabled={saving || !!contractIdParam || !!agreement}
                >
                  <option value="">Select Contract</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.contractID} - {contract.contractNum}
                    </option>
                  ))}
                </select>
              </div>
              {agreement && (
                <div className="form-group">
                  <label>Agreement Number</label>
                  <input
                    type="text"
                    value={formData.agreementNum || ''}
                    onChange={(e) => setFormData({ ...formData, agreementNum: e.target.value })}
                    disabled={saving}
                    placeholder="Auto-generated if empty"
                  />
                </div>
              )}
              <div className="form-group">
                <label>Agreement Date *</label>
                <input
                  type="date"
                  value={formData.agreementDate || ''}
                  onChange={(e) => setFormData({ ...formData, agreementDate: e.target.value })}
                  required
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || 'Draft'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Draft' | 'Generated' | 'Signed' })}
                  disabled={saving}
                >
                  <option value="Draft">Draft</option>
                  <option value="Generated">Generated</option>
                  <option value="Signed">Signed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : (agreement ? 'Update' : 'Add')} Agreement
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
  contractNum?: string;
  onClose: () => void;
}

interface AgreementClause {
  id: string;
  pointNum: string;
  pointTitle: string;
  pointText: string;
  sequenceNo: number;
  status: string;
}

const AgreementPreviewModal = ({ agreement, contractNum, onClose }: AgreementPreviewModalProps) => {
  const [printOnStampPaper, setPrintOnStampPaper] = useState(false);
  const [clauses, setClauses] = useState<AgreementClause[]>([]);
  const [loadingClauses, setLoadingClauses] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [hcf, setHcf] = useState<HcfResponse | null>(null);
  const [loadingPartyData, setLoadingPartyData] = useState(false);
  const agreementDocumentRef = useRef<HTMLDivElement>(null);

  // Load agreement clauses
  useEffect(() => {
    const loadClauses = async () => {
      try {
        setLoadingClauses(true);
        // Use agreement.id (UUID) to fetch clauses
        const data = await agreementClauseService.getAllClauses(agreement.id);
        const sortedClauses = data
          .map((c: AgreementClauseResponse) => ({
            id: c.id,
            pointNum: c.pointNum,
            pointTitle: c.pointTitle,
            pointText: c.pointText,
            sequenceNo: c.sequenceNo,
            status: c.status,
          }))
          .sort((a, b) => a.sequenceNo - b.sequenceNo);
        setClauses(sortedClauses);
      } catch (err) {
        console.error('Failed to load clauses:', err);
        setClauses([]);
      } finally {
        setLoadingClauses(false);
      }
    };

    if (agreement.id) {
      loadClauses();
    }
  }, [agreement.id]);

  // Load contract, company, and HCF data for dynamic content
  useEffect(() => {
    const loadPartyData = async () => {
      if (!agreement.contractID) return;
      
      try {
        setLoadingPartyData(true);
        // Fetch contract details
        const contract = await contractService.getContractById(agreement.contractID);
        
        // Fetch company and HCF details in parallel
        const [companyData, hcfData] = await Promise.all([
          companyService.getCompanyById(contract.companyId),
          hcfService.getHcfById(contract.hcfId),
        ]);
        
        setCompany(companyData);
        setHcf(hcfData);
      } catch (err) {
        console.error('Failed to load party data:', err);
        // Don't set error state, just leave placeholders
      } finally {
        setLoadingPartyData(false);
      }
    };

    loadPartyData();
  }, [agreement.contractID]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!agreementDocumentRef.current) {
      alert('Unable to generate PDF. Please try again.');
      return;
    }

    try {
      setGeneratingPDF(true);
      
      const element = agreementDocumentRef.current;
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${agreement.agreementNum}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error: any) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Helper functions to identify clause types
  const isWhereasClause = (clause: AgreementClause): boolean => {
    const titleHasWhereas = clause.pointTitle.toLowerCase().includes('whereas');
    const numStartsWithW = clause.pointNum.toLowerCase().startsWith('w');
    const numStartsWithWhereas = clause.pointNum.toLowerCase().startsWith('whereas');
    return titleHasWhereas || numStartsWithW || numStartsWithWhereas;
  };

  const hasPointNumber = (clause: AgreementClause): boolean => {
    return !!(clause.pointNum && clause.pointNum.trim() !== '' && /^\d+$/.test(clause.pointNum.trim()));
  };

  const isNormalContent = (clause: AgreementClause): boolean => {
    return !isWhereasClause(clause) && !hasPointNumber(clause);
  };

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

        {/* Print Controls */}
        <div className="agreement-preview-controls">
          <label className="stamp-paper-toggle">
            <input
              type="checkbox"
              checked={printOnStampPaper}
              onChange={(e) => setPrintOnStampPaper(e.target.checked)}
            />
            <span>Print on Stamp Paper</span>
          </label>
          <div className="preview-actions">
            <button type="button" className="btn btn--secondary" onClick={handlePrint}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print
            </button>
            <button 
              type="button" 
              className="btn btn--primary" 
              onClick={handleDownloadPDF}
              disabled={generatingPDF}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {generatingPDF ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Agreement Document */}
        <div 
          ref={agreementDocumentRef}
          className={`agreement-document ${printOnStampPaper ? 'stamp-paper-mode' : ''}`}
        >
          {loadingClauses ? (
            <div className="loading-message">Loading agreement clauses...</div>
          ) : (
            <>
              {/* Page 1 - Party Introduction (only when stamp paper mode) */}
              {printOnStampPaper && (
                <div className="agreement-page agreement-page--stamp-paper">
                  <div className="stamp-paper-blank-space"></div>
                  <div className="agreement-party-intro">
                    <h2 className="party-intro-title">THIS SERVICE AGREEMENT</h2>
                    <p className="party-intro-subtitle">is made on this <strong>{new Date(agreement.agreementDate).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}</strong></p>
                    <div className="party-details">
                      <div className="party-section">
                        <p className="party-intro-text"><strong>BETWEEN</strong></p>
                        <h3 className="party-name">PARTY OF THE FIRST PART</h3>
                        <p className="party-description">
                          {company ? (
                            <>
                              <strong>{company.companyName}</strong>, a company incorporated under the Companies Act, 2013, 
                              having its registered office at [Address], represented by [Authorized Person], 
                              hereinafter referred to as the "<strong>Service Provider</strong>" (which expression shall, unless 
                              repugnant to the context or meaning thereof, be deemed to include its successors 
                              and assigns).
                            </>
                          ) : (
                            <>
                              [Company Name], a company incorporated under the Companies Act, 2013, 
                              having its registered office at [Address], represented by [Authorized Person], 
                              hereinafter referred to as the "<strong>Service Provider</strong>" (which expression shall, unless 
                              repugnant to the context or meaning thereof, be deemed to include its successors 
                              and assigns).
                            </>
                          )}
                        </p>
                      </div>
                      <div className="party-section">
                        <p className="party-intro-text"><strong>AND</strong></p>
                        <h3 className="party-name">PARTY OF THE SECOND PART</h3>
                        <p className="party-description">
                          {hcf ? (
                            <>
                              <strong>{hcf.hcfName}</strong>, a healthcare facility located at {hcf.serviceAddress || '[Address]'}, represented by 
                              {hcf.agrSignAuthName ? ` ${hcf.agrSignAuthName}` : ' [Authorized Person]'}, hereinafter referred to as the "<strong>Client</strong>" (which 
                              expression shall, unless repugnant to the context or meaning thereof, be 
                              deemed to include its successors and assigns).
                            </>
                          ) : (
                            <>
                              [HCF Name], a healthcare facility located at [Address], represented by 
                              [Authorized Person], hereinafter referred to as the "<strong>Client</strong>" (which 
                              expression shall, unless repugnant to the context or meaning thereof, be 
                              deemed to include its successors and assigns).
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Page 2+ - Main Agreement Content */}
              <div className="agreement-page">
            {/* Agreement Header */}
            <div className="agreement-header-section">
              <h1 className="agreement-main-title">SERVICE AGREEMENT</h1>
              <div className="agreement-meta">
                <p><strong>Agreement No.:</strong> {agreement.agreementNum}</p>
                {contractNum && <p><strong>Contract Reference:</strong> {contractNum}</p>}
              </div>
            </div>

            {/* Introduction Section - Show only if first clause is WHEREAS */}
            {clauses.length > 0 && isWhereasClause(clauses[0]) && (
              <div className="agreement-section agreement-intro-section">
                <p className="whereas-intro">
                  This Service Agreement ("Agreement") is made on this <strong>{new Date(agreement.agreementDate).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}</strong> between {company ? <strong>{company.companyName}</strong> : '[Company Name]'} (hereinafter referred to as the "<strong>Service Provider</strong>") and {hcf ? <strong>{hcf.hcfName}</strong> : '[HCF Name]'} (hereinafter referred to as the "<strong>Client</strong>"):
                </p>
              </div>
            )}

            {/* Introduction text when no clauses exist or first clause is not WHEREAS */}
            {(clauses.length === 0 || !isWhereasClause(clauses[0])) && (
              <div className="agreement-section agreement-intro-section">
                <p className="intro-text">
                  This Service Agreement ("Agreement") is made on this <strong>{new Date(agreement.agreementDate).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}</strong> between {company ? <strong>{company.companyName}</strong> : '[Company Name]'} (hereinafter referred to as the "<strong>Service Provider</strong>") and {hcf ? <strong>{hcf.hcfName}</strong> : '[HCF Name]'} (hereinafter referred to as the "<strong>Client</strong>").
                </p>
                {clauses.length > 0 && (
                  <p className="intro-continuation">
                    The parties agree as follows:
                  </p>
                )}
              </div>
            )}

            {/* All Clauses - Rendered in sequenceNo order with appropriate formatting */}
            {clauses.length > 0 && (() => {
              let whereasIndex = 0; // Track WHEREAS clause index for lettering
              
              return (
                <div className="agreement-section agreement-clauses-section">
                  {clauses.map((clause, index) => {
                    const isWhereas = isWhereasClause(clause);
                    const hasPointNum = hasPointNumber(clause);
                    const isNormal = isNormalContent(clause);
                    
                    // Track WHEREAS index for lettering
                    if (isWhereas) {
                      whereasIndex++;
                    }

                    // Check if we need to insert "NOW THEREFORE" before this clause
                    const prevClause = index > 0 ? clauses[index - 1] : null;
                    const shouldShowNowTherefore = 
                      prevClause && 
                      isWhereasClause(prevClause) && 
                      !isWhereas;

                    return (
                      <div key={clause.id}>
                        {/* Insert NOW THEREFORE before first non-WHEREAS clause */}
                        {shouldShowNowTherefore && (
                          <div className="agreement-section agreement-now-therefore-section">
                            <p className="now-therefore-text">
                              <strong>NOW THEREFORE</strong>, in consideration of the mutual covenants and agreements contained herein, 
                              the parties agree as follows:
                            </p>
                          </div>
                        )}

                        {/* Render clause based on type */}
                        {isWhereas ? (
                          <div className="whereas-item">
                            <p className="whereas-text">
                              <strong>WHEREAS {whereasIndex === 1 ? '' : String.fromCharCode(64 + whereasIndex) + ') '}</strong>
                              {clause.pointText}
                            </p>
                          </div>
                        ) : hasPointNum ? (
                          <div className="clause-item clause-item--numbered">
                            <p className="clause-text">
                              <strong>{clause.pointNum}.</strong> {clause.pointText}
                            </p>
                          </div>
                        ) : isNormal ? (
                          <div className="clause-item clause-item--normal">
                            <p className="clause-text">
                              {clause.pointText}
                            </p>
                          </div>
                        ) : (
                          <div className="clause-item">
                            <p className="clause-text">
                              {clause.pointText}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Signature Section */}
            <div className="agreement-section agreement-signature-section">
              <div className="signature-block">
                <div className="signature-party">
                  <p className="signature-party-title"><strong>PARTY OF THE FIRST PART</strong></p>
                  <div className="signature-space">
                    <div className="signature-line"></div>
                    <p className="signature-name">Signature</p>
                    <p className="signature-name">[Name of Authorized Signatory]</p>
                    <p className="signature-designation">[Designation]</p>
                    <p className="signature-designation">For and on behalf of {company ? company.companyName : '[Company Name]'}</p>
                  </div>
                </div>
                <div className="signature-party">
                  <p className="signature-party-title"><strong>PARTY OF THE SECOND PART</strong></p>
                  <div className="signature-space">
                    <div className="signature-line"></div>
                    <p className="signature-name">Signature</p>
                    <p className="signature-name">{hcf ? (hcf.agrSignAuthName || '[Name of Authorized Signatory]') : '[Name of Authorized Signatory]'}</p>
                    <p className="signature-designation">{hcf ? (hcf.agrSignAuthDesignation || '[Designation]') : '[Designation]'}</p>
                    <p className="signature-designation">For and on behalf of {hcf ? hcf.hcfName : '[HCF Name]'}</p>
                  </div>
                </div>
              </div>
              <div className="signature-date-place">
                <p className="date-place-text">
                  <strong>Date:</strong> _______________________
                </p>
                <p className="date-place-text">
                  <strong>Place:</strong> _______________________
                </p>
              </div>
              <div className="witness-section">
                <p className="witness-title"><strong>WITNESSES:</strong></p>
                <div className="witness-block">
                  <div className="witness-item">
                    <div className="signature-line"></div>
                    <p className="witness-name">1. [Name of Witness]</p>
                    <p className="witness-address">[Address]</p>
                  </div>
                  <div className="witness-item">
                    <div className="signature-line"></div>
                    <p className="witness-name">2. [Name of Witness]</p>
                    <p className="witness-address">[Address]</p>
                  </div>
                </div>
              </div>
            </div>
              </div>
              </>
            )}
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

export default AgreementPage;

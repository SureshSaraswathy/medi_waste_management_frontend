import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { Agreement } from '../../hooks/useAgreementFilters';
import { agreementService } from '../../services/agreementService';
import { contractService, ContractResponse } from '../../services/contractService';
import { agreementClauseService, AgreementClauseResponse } from '../../services/agreementClauseService';
import { agreementTemplateService } from '../../services/agreementTemplateService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import { placeholderMasterService, PlaceholderMasterResponse } from '../../services/placeholderMasterService';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';
// @ts-ignore - html2pdf.js doesn't have TypeScript definitions
import html2pdf from 'html2pdf.js';
import PageHeader from '../../components/layout/PageHeader';
import './agreementPage.css';
import '../desktop/dashboardPage.css';

interface AdvancedFilters {
  agreementNum: string;
  agreementID: string;
  contractNum: string;
  status: string;
}

interface Contract {
  id: string;
  contractID: string;
  contractNum: string;
  companyId?: string;
  hcfId?: string;
  agreementTemplateId?: string;
  startDate?: string;
  endDate?: string;
}

interface Company {
  id: string;
  companyName: string;
  companyCode: string;
}

interface HCF {
  id: string;
  hcfName: string;
  hcfCode: string;
}

const AgreementPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const contractIdParam = searchParams.get('contractId');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [agreementToTerminate, setAgreementToTerminate] = useState<Agreement | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [hcfs, setHcfs] = useState<HCF[]>([]);
  const [contractDetails, setContractDetails] = useState<Map<string, ContractResponse>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    agreementNum: '',
    agreementID: '',
    contractNum: '',
    status: '',
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const data = await companyService.getAllCompanies(true);
      setCompanies(data.map(c => ({
        id: c.id,
        companyName: c.companyName,
        companyCode: c.companyCode,
      })));
    } catch (err: any) {
      console.error('Failed to load companies:', err);
      toast.error(err.message || 'Failed to load companies');
    }
  }, []);

  // Load HCFs
  const loadHcfs = useCallback(async () => {
    try {
      const data = await hcfService.getAllHcfs(undefined, true);
      setHcfs(data.map(h => ({
        id: h.id,
        hcfName: h.hcfName,
        hcfCode: h.hcfCode,
      })));
    } catch (err: any) {
      console.error('Failed to load HCFs:', err);
      toast.error(err.message || 'Failed to load HCFs');
    }
  }, []);

  // Load contracts
  const loadContracts = useCallback(async () => {
    try {
      const data = await contractService.getAllContracts();
      const contractMap = new Map<string, contractService.ContractResponse>();
      data.forEach(c => contractMap.set(c.id, c));
      setContractDetails(contractMap);
      setContracts(data.map(c => ({
        id: c.id,
        contractID: c.contractID,
        contractNum: c.contractNum,
        companyId: c.companyId,
        hcfId: c.hcfId,
        agreementTemplateId: c.agreementTemplateId,
        startDate: c.startDate,
        endDate: c.endDate,
      })));
    } catch (err: any) {
      console.error('Failed to load contracts:', err);
      toast.error(err.message || 'Failed to load contracts');
    }
  }, []);

  // Load agreements
  const loadAgreements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agreementService.getAllAgreements(contractIdParam || undefined);
      
      const mappedAgreements: Agreement[] = await Promise.all(data.map(async (agreement) => {
        const contract = contractDetails.get(agreement.contractId);
        const company = contract ? companies.find(c => c.id === contract.companyId) : null;
        const hcf = contract ? hcfs.find(h => h.id === contract.hcfId) : null;
        
        return {
          id: agreement.id,
          agreementID: agreement.agreementID,
          contractID: agreement.contractId,
          contractNum: contract?.contractNum || '',
          companyName: company?.companyName || '',
          hcfName: hcf?.hcfName || '',
          agreementNum: agreement.agreementNum,
          agreementDate: agreement.agreementDate,
          status: agreement.status,
        };
      }));
      
      setAgreements(mappedAgreements);
    } catch (err: any) {
      console.error('Failed to load agreements:', err);
      const errorMessage = err.message || 'Failed to load agreements';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contractIdParam, contractDetails, companies, hcfs]);

  // Initial load
  useEffect(() => {
    loadCompanies();
    loadHcfs();
    loadContracts();
  }, [loadCompanies, loadHcfs, loadContracts]);

  useEffect(() => {
    if (contracts.length > 0 && companies.length > 0 && hcfs.length > 0) {
      loadAgreements();
    }
  }, [contracts.length, companies.length, hcfs.length, loadAgreements]);

  // Filter agreements with search query, status filter, and advanced filters
  const filteredAgreements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const agreementNumQuery = advancedFilters.agreementNum.trim().toLowerCase();
    const agreementIDQuery = advancedFilters.agreementID.trim().toLowerCase();
    const contractNumQuery = advancedFilters.contractNum.trim().toLowerCase();
    const advancedStatusQuery = advancedFilters.status.trim();

    return agreements.filter((agreement) => {
      // Top search box: broad match across key fields
      const matchesSearch =
        !query ||
        agreement.agreementNum.toLowerCase().includes(query) ||
        agreement.agreementID.toLowerCase().includes(query) ||
        (agreement.contractNum && agreement.contractNum.toLowerCase().includes(query));

      // Status filter (from dropdown)
      const matchesStatus = statusFilter === 'All' || agreement.status === statusFilter;

      // Advanced filters
      const matchesAgreementNum = !agreementNumQuery || agreement.agreementNum.toLowerCase().includes(agreementNumQuery);
      const matchesAgreementID = !agreementIDQuery || agreement.agreementID.toLowerCase().includes(agreementIDQuery);
      const matchesContractNum = !contractNumQuery || 
        (agreement.contractNum && agreement.contractNum.toLowerCase().includes(contractNumQuery));
      const matchesAdvancedStatus = !advancedStatusQuery || agreement.status === advancedStatusQuery;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesAgreementNum &&
        matchesAgreementID &&
        matchesContractNum &&
        matchesAdvancedStatus
      );
    });
  }, [agreements, searchQuery, statusFilter, advancedFilters]);

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
        toast.success('Agreement updated successfully');
      } else {
        if (!data.contractID) {
          toast.error('Please select a contract');
          setSaving(false);
          return;
        }

        // Check if an agreement already exists for this contract
        const existingAgreements = agreements.filter(
          a => a.contractID === data.contractID && !a.status?.includes('Deleted')
        );

        if (existingAgreements.length > 0) {
          // Check if contract has expired
          const contract = contractDetails.get(data.contractID!);
          if (contract && contract.endDate) {
            const contractEndDate = new Date(contract.endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            contractEndDate.setHours(0, 0, 0, 0);

            if (contractEndDate >= today) {
              // Contract is still active, don't allow new agreement
              toast.error('An agreement already exists for this contract. You can only create a new agreement after the contract expires.');
              setSaving(false);
              return;
            }
            // Contract has expired, allow creating new agreement
          } else {
            // Can't determine contract expiry, don't allow
            toast.error('An agreement already exists for this contract. You can only create a new agreement after the contract expires.');
            setSaving(false);
            return;
          }
        }

        await agreementService.createAgreement({
          contractId: data.contractID!,
          agreementDate: data.agreementDate!,
          status: data.status,
        });
        toast.success('Agreement created successfully');
      }

      setShowFormModal(false);
      setEditingAgreement(null);
      await loadAgreements();
    } catch (err: any) {
      console.error('Failed to save agreement:', err);
      const errorMessage = err.message || 'Failed to save agreement';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle View Agreement
  const handleView = (agreement: Agreement) => {
    setSelectedAgreement(agreement);
    setShowPreviewModal(true);
  };

  // Handle Download Agreement
  const handleDownload = async (agreement: Agreement) => {
    try {
      const blob = await agreementService.downloadAgreementPDF(agreement.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${agreement.agreementNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Agreement downloaded successfully');
    } catch (err: any) {
      console.error('Failed to download agreement:', err);
      toast.error(err.message || 'Failed to download agreement');
    }
  };

  // Handle Terminate Agreement Click
  const handleTerminateClick = (agreement: Agreement, e: React.MouseEvent) => {
    e.stopPropagation();
    setAgreementToTerminate(agreement);
    setShowTerminateModal(true);
  };

  // Handle Terminate Agreement Confirmation
  const handleTerminateConfirm = async () => {
    if (!agreementToTerminate) return;

    try {
      setSaving(true);
      await agreementService.updateAgreement(agreementToTerminate.id, {
        status: 'Signed', // Using Signed as terminated status, or we can add a Terminated status
      });
      toast.success('Agreement terminated successfully');
      setShowTerminateModal(false);
      setAgreementToTerminate(null);
      await loadAgreements();
    } catch (err: any) {
      console.error('Failed to terminate agreement:', err);
      toast.error(err.message || 'Failed to terminate agreement');
    } finally {
      setSaving(false);
    }
  };


  // Status badge component
  const StatusBadge = ({ status }: { status: Agreement['status'] }) => {
    const statusClass = `status-badge status-badge--${status.toLowerCase()}`;
    return (
      <span className={statusClass} role="status" aria-label={`Status: ${status}`}>
        {status}
      </span>
    );
  };

  // Actions component
  const ActionsCell = ({ agreement }: { agreement: Agreement }) => (
    <>
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
      {agreement.status === 'Draft' && (
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
      )}
      <button
        className="action-btn action-btn--download"
        onClick={(e) => {
          e.stopPropagation();
          handleView(agreement);
        }}
        title="Download Agreement PDF"
        aria-label={`Download agreement ${agreement.agreementNum}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </button>
      {agreement.status !== 'Signed' && (
        <button
          className="action-btn action-btn--terminate"
          onClick={(e) => handleTerminateClick(agreement, e)}
          title="Terminate Agreement"
          aria-label={`Terminate agreement ${agreement.agreementNum}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </button>
      )}
    </>
  );

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  return (
    <div className="dashboard-page">
      <aside className={`dashboard-sidebar sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="logo-container">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <div className="brand-text">
                <span className="brand-title">MEDI-WASTE</span>
                <span className="brand-subtitle">Enterprise Platform</span>
              </div>
            )}
          </div>

          <button
            className="toggle-button"
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              {isSidebarCollapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
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
                  {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <NotificationBell variant="sidebar" />
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
        <PageHeader 
          title="Agreement Management"
          subtitle="Create, manage and track agreements"
        />

        <div className="route-assignment-page">
          {/* Page Header (Route Assignment template) */}
          <div className="ra-page-header">
            <div className="ra-header-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Agreement Management</h1>
              <p className="ra-page-subtitle">Manage and track agreements, contracts and status</p>
            </div>
          </div>

          {error && (
            <div className="ra-alert ra-alert--error" role="alert">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ra-alert-close" aria-label="Close error message">
                ×
              </button>
            </div>
          )}

          {/* Search and Actions (Route Assignment template) */}
          <div className="ra-search-actions">
            <div className="ra-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="ra-search-input"
                placeholder="Search by agreement number, contract, agreement ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="ra-actions">
              <button className="ra-filter-btn" onClick={() => setShowAdvancedFilters(true)} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Advanced Filter
              </button>
              <button className="ra-add-btn" onClick={handleAdd} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Agreement
              </button>
            </div>
          </div>

          {loading && !agreements.length && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              Loading agreements...
            </div>
          )}

          {/* Agreements Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>AGREEMENT NUMBER</th>
                  <th>CONTRACT NUMBER</th>
                  <th>COMPANY</th>
                  <th>HCF</th>
                  <th>AGREEMENT DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-message">
                      {loading ? 'Loading...' : 'No agreement records found'}
                    </td>
                  </tr>
                ) : (
                  filteredAgreements.map((agreement) => {
                    // Format date to DD/MM/YYYY
                    const formatDate = (dateString: string) => {
                      if (!dateString) return '-';
                      const date = new Date(dateString);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };

                    return (
                      <tr key={agreement.id}>
                        <td>
                          <span className="agreement-num-cell">{agreement.agreementNum}</span>
                        </td>
                        <td>{agreement.contractNum || '-'}</td>
                        <td>{agreement.companyName || '-'}</td>
                        <td>{agreement.hcfName || '-'}</td>
                        <td>{formatDate(agreement.agreementDate)}</td>
                        <td>
                          <div className="ra-cell-center">
                            <StatusBadge status={agreement.status} />
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="action-buttons ra-actions">
                            <ActionsCell agreement={agreement} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="route-assignment-pagination-info">
            Showing {filteredAgreements.length} of {agreements.length} items
          </div>
        </div>
      </main>

      {/* Create/Edit Agreement Modal */}
      {showFormModal && (
        <AgreementFormModal
          agreement={editingAgreement}
          contracts={contracts}
          companies={companies}
          hcfs={hcfs}
          contractDetails={contractDetails}
          contractIdParam={contractIdParam}
          saving={saving}
          onClose={() => {
            setShowFormModal(false);
            setEditingAgreement(null);
          }}
          onSave={handleSave}
          agreements={agreements}
        />
      )}

      {/* Preview Agreement Modal */}
      {showPreviewModal && selectedAgreement && (
        <AgreementPreviewModal
          key={selectedAgreement.id}
          agreement={selectedAgreement}
          contractNum={selectedAgreement.contractNum}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedAgreement(null);
          }}
        />
      )}

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          statusFilter={statusFilter}
          advancedFilters={advancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setStatusFilter('All');
            setAdvancedFilters({
              agreementNum: '',
              agreementID: '',
              contractNum: '',
              status: '',
            });
            setShowAdvancedFilters(false);
          }}
          onApply={(payload) => {
            setStatusFilter(payload.statusFilter);
            setAdvancedFilters(payload.advancedFilters);
            setShowAdvancedFilters(false);
          }}
        />
      )}

      {/* Terminate Agreement Modal */}
      {showTerminateModal && agreementToTerminate && (
        <TerminateAgreementModal
          agreement={agreementToTerminate}
          onClose={() => {
            setShowTerminateModal(false);
            setAgreementToTerminate(null);
          }}
          onConfirm={handleTerminateConfirm}
          loading={saving}
        />
      )}
    </div>
  );
};

// Agreement Form Modal
interface AgreementFormModalProps {
  agreement: Agreement | null;
  contracts: Contract[];
  companies: Company[];
  hcfs: HCF[];
  contractDetails: Map<string, ContractResponse>;
  contractIdParam: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<Agreement>) => void;
  agreements: Agreement[];
}

const AgreementFormModal = ({ 
  agreement, 
  contracts, 
  companies, 
  hcfs, 
  contractDetails,
  contractIdParam, 
  saving, 
  onClose, 
  onSave,
  agreements: allAgreements
}: AgreementFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Agreement> & {
    companyName?: string;
    hcfName?: string;
    agreementTemplateName?: string;
    contractStartDate?: string;
    contractEndDate?: string;
  }>(
    agreement || {
      contractID: contractIdParam || '',
      agreementNum: '',
      agreementDate: new Date().toISOString().split('T')[0],
      status: 'Draft',
    }
  );

  // Auto-populate fields when contract is selected
  useEffect(() => {
    const loadContractData = async () => {
      if (formData.contractID && !agreement) {
        const contract = contractDetails.get(formData.contractID);
        if (contract) {
          const company = companies.find(c => c.id === contract.companyId);
          const hcf = hcfs.find(h => h.id === contract.hcfId);
          
          let templateName = '';
          if (contract.agreementTemplateId) {
            try {
              const template = await agreementTemplateService.getAgreementTemplateById(contract.agreementTemplateId);
              templateName = `${template.templateCode} – ${template.templateName}`;
            } catch (err) {
              console.error('Failed to load agreement template:', err);
            }
          }
          
          setFormData(prev => ({
            ...prev,
            companyName: company?.companyName || '',
            hcfName: hcf?.hcfName || '',
            agreementTemplateName: templateName,
            contractStartDate: contract.startDate,
            contractEndDate: contract.endDate,
          }));
        }
      }
    };
    
    loadContractData();
  }, [formData.contractID, contractDetails, companies, hcfs, agreement]);

  // Filter contracts: only show contracts without agreements OR with expired contracts
  const availableContracts = useMemo(() => {
    if (agreement) {
      // When editing, show all contracts (contract selection is disabled anyway)
      return contracts;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return contracts.filter(contract => {
      // Check if contract has an existing agreement
      const existingAgreement = allAgreements.find(
        a => a.contractID === contract.id
      );

      if (!existingAgreement) {
        // No agreement exists, allow selection
        return true;
      }

      // Agreement exists, check if contract is expired
      if (contract.endDate) {
        const contractEndDate = new Date(contract.endDate);
        contractEndDate.setHours(0, 0, 0, 0);
        // Only allow if contract has expired
        return contractEndDate < today;
      }

      // Can't determine expiry, don't allow
      return false;
    });
  }, [contracts, allAgreements, agreement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractID || !formData.agreementDate) {
      toast.error('Please complete the required fields.');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="modal-overlay ra-assignment-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-assignment-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <div className="ra-assignment-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">{agreement ? 'Edit Agreement' : 'Add Agreement'}</h2>
              <p className="ra-assignment-modal-subtitle">
                {agreement ? 'Update agreement details' : 'Create a new agreement record.'}
              </p>
            </div>
          </div>
          <button className="ra-assignment-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form className="ra-assignment-form" onSubmit={handleSubmit}>
          <div className="ra-assignment-form-grid">
            <div className="ra-assignment-form-group">
              <label htmlFor="contract">
                Contract <span className="ra-required">*</span>
              </label>
              <select
                id="contract"
                value={formData.contractID || ''}
                onChange={(e) => setFormData({ ...formData, contractID: e.target.value })}
                required
                disabled={saving || !!contractIdParam || !!agreement}
                className="ra-assignment-select"
              >
                <option value="">Select Contract</option>
                {availableContracts.map((contract) => {
                  const existingAgreement = allAgreements.find(a => a.contractID === contract.id);
                  const contractDetail = contractDetails.get(contract.id);
                  const isExpired = contractDetail?.endDate 
                    ? new Date(contractDetail.endDate) < new Date()
                    : false;
                  
                  return (
                    <option key={contract.id} value={contract.id}>
                      {contract.contractNum}
                      {existingAgreement && isExpired ? ' (Expired - Can create new agreement)' : ''}
                    </option>
                  );
                })}
              </select>
              {availableContracts.length === 0 && !agreement && (
                <small style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', display: 'block' }}>
                  No available contracts. All contracts already have agreements or are still active.
                </small>
              )}
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="agreement-num">
                Agreement Number
              </label>
              <input
                id="agreement-num"
                type="text"
                value={agreement ? (formData.agreementNum || '') : 'Auto-generated'}
                disabled={true}
                readOnly={true}
                className="ra-assignment-input"
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                title="Agreement number is auto-generated"
              />
              {!agreement && (
                <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                  Auto-generated in format: AGR-YYYY-XXXX
                </small>
              )}
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="company">
                Company
              </label>
              <input
                id="company"
                type="text"
                value={formData.companyName || ''}
                disabled={true}
                readOnly={true}
                className="ra-assignment-input"
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                placeholder="Auto-filled from contract"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="hcf">
                HCF
              </label>
              <input
                id="hcf"
                type="text"
                value={formData.hcfName || ''}
                disabled={true}
                readOnly={true}
                className="ra-assignment-input"
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                placeholder="Auto-filled from contract"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="agreement-template">
                Agreement Template
              </label>
              <input
                id="agreement-template"
                type="text"
                value={formData.agreementTemplateName || ''}
                disabled={true}
                readOnly={true}
                className="ra-assignment-input"
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                placeholder="Auto-filled from contract"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="contract-start-date">
                Contract Start Date
              </label>
              <input
                id="contract-start-date"
                type="date"
                value={formData.contractStartDate || ''}
                disabled={true}
                readOnly={true}
                className="ra-assignment-input"
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="contract-end-date">
                Contract End Date
              </label>
              <input
                id="contract-end-date"
                type="date"
                value={formData.contractEndDate || ''}
                disabled={true}
                readOnly={true}
                className="ra-assignment-input"
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="agreement-date">
                Agreement Date <span className="ra-required">*</span>
              </label>
              <input
                id="agreement-date"
                type="date"
                value={formData.agreementDate || ''}
                onChange={(e) => setFormData({ ...formData, agreementDate: e.target.value })}
                required
                disabled={saving}
                className="ra-assignment-input"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="status">
                Status
              </label>
              <select
                id="status"
                value={formData.status || 'Draft'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Draft' | 'Generated' | 'Signed' })}
                disabled={saving}
                className="ra-assignment-select"
              >
                <option value="Draft">Draft</option>
                <option value="Generated">Generated</option>
                <option value="Signed">Signed</option>
              </select>
            </div>
          </div>

          <div className="ra-assignment-modal-footer">
            <button type="button" className="ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="ra-assignment-btn ra-assignment-btn--primary" disabled={saving}>
              {saving ? 'Saving...' : (agreement ? 'Update' : 'Save')}
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
  const [placeholders, setPlaceholders] = useState<PlaceholderMasterResponse[]>([]);
  const agreementDocumentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrintOnStampPaper(false);
  }, [agreement.id]);

  // ---- Dynamic "BETWEEN" paragraph (master-driven) helpers ----
  const cleanText = (v?: string | null): string => (v ? v.replace(/\s+/g, ' ').trim() : '');

  const getFirstValue = (obj: any, keys: string[]): string => {
    if (!obj) return '';
    for (const key of keys) {
      const raw = obj[key];
      const cleaned = cleanText(raw);
      if (cleaned) return cleaned;
    }
    return '';
  };

  /** Parse YYYY-MM-DD as a local calendar date (avoids UTC off-by-one when displaying agreement dates). */
  const parseAgreementDateOnly = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const ymd = dateStr.trim().split('T')[0];
    const parts = ymd.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(day)) {
        return new Date(y, m, day);
      }
    }
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatOrdinalDate = (dateStr: string): string => {
    const d = parseAgreementDateOnly(dateStr);
    if (!d || Number.isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleString('en-IN', { month: 'long' });
    const year = d.getFullYear();

    const j = day % 10;
    const k = day % 100;
    let suffix = 'th';
    if (j === 1 && k !== 11) suffix = 'st';
    else if (j === 2 && k !== 12) suffix = 'nd';
    else if (j === 3 && k !== 13) suffix = 'rd';

    return `${day}${suffix} ${month} ${year}`;
  };

  const getAgreementCity = (): string => {
    // We don't have explicit city fields. Best-effort extraction; fallback to Chennai (common case in your sample).
    const addr = `${cleanText(company?.regdOfficeAddress)} ${cleanText(hcf?.serviceAddress)}`.toLowerCase();
    if (addr.includes('chennai')) return 'Chennai';
    return 'Chennai';
  };

  const firstPartyName = getFirstValue(company, ['companyName']) || '[Company Name]';
  const firstPartyAddress =
    getFirstValue(company, ['regdOfficeAddress', 'regd_office_address']) ||
    getFirstValue(company, ['adminOfficeAddress', 'admin_office_address']) ||
    getFirstValue(company, ['factoryAddress', 'factory_address']) ||
    '[Address of the company]';
  const firstPartyDesignation =
    getFirstValue(company, ['authPersonDesignation', 'auth_person_designation']) || 'Manager';
  const firstPartyPersonName =
    getFirstValue(company, ['authPersonName', 'auth_person_name']) || '[Authorized Person]';

  const secondPartyName = getFirstValue(hcf, ['hcfName']) || '[HCF Name]';
  const secondPartyAddress =
    getFirstValue(hcf, ['serviceAddress', 'service_address']) || '[HCF Address]';
  const secondPartyDesignation =
    getFirstValue(hcf, ['agrSignAuthDesignation', 'agr_sign_auth_designation']) ||
    getFirstValue(hcf, ['drDesignation', 'dr_designation']) ||
    'Proprietor';
  const secondPartyPersonName =
    getFirstValue(hcf, ['agrSignAuthName', 'agr_sign_auth_name']) ||
    getFirstValue(hcf, ['drName', 'dr_name']) ||
    '[Authorized Person]';

  // Load agreement clauses from contract's agreement template
  useEffect(() => {
    const loadClauses = async () => {
      try {
        setLoadingClauses(true);
        // First, get the contract to find the agreement template ID
        if (!agreement.contractID) {
          setClauses([]);
          return;
        }
        
        const contract = await contractService.getContractById(agreement.contractID);
        if (!contract.agreementTemplateId) {
          setClauses([]);
          return;
        }
        
        // Load clauses using the agreement template ID
        const data = await agreementClauseService.getAllClauses(contract.agreementTemplateId);
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
      } catch (err: any) {
        console.error('Failed to load clauses:', err);
        toast.error(err.message || 'Failed to load agreement clauses');
        setClauses([]);
      } finally {
        setLoadingClauses(false);
      }
    };

    if (agreement.id && agreement.contractID) {
      loadClauses();
    }
  }, [agreement.id, agreement.contractID]);

  // Load placeholders
  useEffect(() => {
    const loadPlaceholders = async () => {
      try {
        const data = await placeholderMasterService.getAllPlaceholderMasters(true);
        setPlaceholders(data);
      } catch (err) {
        console.error('Failed to load placeholders:', err);
      }
    };
    loadPlaceholders();
  }, []);

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
      toast.error('Unable to generate PDF. Please try again.');
      return;
    }

    // Ensure master + clauses are loaded before capturing the DOM,
    // otherwise we may end up with fallback placeholders like "[Address of the company]".
    if (loadingPartyData || loadingClauses || !company || !hcf) {
      toast.error('Please wait until party details are loaded before downloading PDF.');
      return;
    }

    try {
      setGeneratingPDF(true);
      
      const element = agreementDocumentRef.current;
      // Important: the document container is scroll-capped for UI. Remove that cap for HTML->canvas capture
      // so html2pdf can slice the full height into multiple A4 pages when needed.
      element.classList.add('pdf-export-mode');
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
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('Failed to generate PDF:', error);
      toast.error(error.message || 'Failed to generate PDF. Please try again.');
    } finally {
      agreementDocumentRef.current?.classList.remove('pdf-export-mode');
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

  // Convert snake_case to camelCase for TypeScript property access
  const snakeToCamel = (str: string): string => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  };

  // Get value from object by trying both camelCase and snake_case keys
  const getValueFromObject = (obj: any, columnName: string): string | null => {
    if (!obj) return null;
    
    // Try camelCase first (TypeScript interface format)
    const camelCaseKey = snakeToCamel(columnName);
    if (obj[camelCaseKey] !== undefined && obj[camelCaseKey] !== null) {
      return String(obj[camelCaseKey]);
    }
    
    // Try original snake_case format
    if (obj[columnName] !== undefined && obj[columnName] !== null) {
      return String(obj[columnName]);
    }
    
    // Try with first letter lowercase if it was uppercase
    const lowerFirst = camelCaseKey.charAt(0).toLowerCase() + camelCaseKey.slice(1);
    if (obj[lowerFirst] !== undefined && obj[lowerFirst] !== null) {
      return String(obj[lowerFirst]);
    }
    
    return null;
  };

  // Replace placeholders in text with actual values
  const replacePlaceholders = (text: string): string => {
    if (!text) return text;
    
    // If placeholders aren't loaded yet, return text as-is (will be replaced on next render)
    if (!placeholders || placeholders.length === 0) {
      return text;
    }
    
    let replacedText = text;
    
    // Find all unique placeholders in the format {{PLACEHOLDER_CODE}}
    const placeholderRegex = /\{\{([A-Z0-9_]+)\}\}/g;
    const matches = [...text.matchAll(placeholderRegex)];
    
    if (matches.length === 0) {
      return replacedText; // No placeholders found
    }
    
    const uniquePlaceholderCodes = [...new Set(matches.map(m => m[1]))];
    
    // Process each unique placeholder
    for (const placeholderCode of uniquePlaceholderCodes) {
      // Case-insensitive search for placeholder
      const placeholder = placeholders.find(p => 
        p.placeholderCode.toUpperCase() === placeholderCode.toUpperCase()
      );
      
      if (placeholder) {
        let replacementValue = '';
        
        // Map placeholder to actual value based on source table and column
        try {
          switch (placeholder.sourceTable.toLowerCase()) {
            case 'hcfs':
              if (hcf) {
                const value = getValueFromObject(hcf, placeholder.sourceColumn);
                if (value && value.trim() !== '') {
                  replacementValue = value;
                } else {
                  // Debug: Log what we're looking for
                  console.warn(`Placeholder ${placeholderCode}: Column "${placeholder.sourceColumn}" not found or empty in HCF data`, {
                    placeholderCode,
                    sourceTable: placeholder.sourceTable,
                    sourceColumn: placeholder.sourceColumn,
                    camelCase: snakeToCamel(placeholder.sourceColumn),
                    availableKeys: Object.keys(hcf),
                    hcfSample: {
                      hcfName: hcf.hcfName,
                      serviceAddress: hcf.serviceAddress,
                      hcfCode: hcf.hcfCode
                    }
                  });
                  replacementValue = `[${placeholder.placeholderDescription}]`;
                }
              } else {
                console.warn(`Placeholder ${placeholderCode}: HCF data not loaded`);
                replacementValue = `[${placeholder.placeholderDescription} - HCF not loaded]`;
              }
              break;
            case 'companies':
              if (company) {
                const value = getValueFromObject(company, placeholder.sourceColumn);
                if (value && value.trim() !== '') {
                  replacementValue = value;
                } else {
                  console.warn(`Placeholder ${placeholderCode}: Column "${placeholder.sourceColumn}" not found or empty in Company data`, {
                    placeholderCode,
                    sourceTable: placeholder.sourceTable,
                    sourceColumn: placeholder.sourceColumn,
                    camelCase: snakeToCamel(placeholder.sourceColumn),
                    availableKeys: Object.keys(company),
                    companySample: {
                      companyName: company.companyName,
                      companyCode: company.companyCode
                    }
                  });
                  replacementValue = `[${placeholder.placeholderDescription}]`;
                }
              } else {
                console.warn(`Placeholder ${placeholderCode}: Company data not loaded`);
                replacementValue = `[${placeholder.placeholderDescription} - Company not loaded]`;
              }
              break;
            default:
              console.warn(`Placeholder ${placeholderCode}: Unknown table "${placeholder.sourceTable}"`);
              replacementValue = `[${placeholder.placeholderDescription} - Unknown table: ${placeholder.sourceTable}]`;
          }
        } catch (err) {
          console.error(`Error replacing placeholder ${placeholderCode}:`, err);
          console.error('Placeholder details:', {
            code: placeholderCode,
            sourceTable: placeholder.sourceTable,
            sourceColumn: placeholder.sourceColumn,
            hcf: hcf ? 'loaded' : 'not loaded',
            company: company ? 'loaded' : 'not loaded'
          });
          replacementValue = `[${placeholder.placeholderDescription} - Error]`;
        }
        
        // Replace all occurrences of this placeholder in the text
        const placeholderPattern = new RegExp(`\\{\\{${placeholderCode}\\}\\}`, 'gi'); // Case-insensitive
        replacedText = replacedText.replace(placeholderPattern, replacementValue);
      } else {
        // Placeholder not found
        console.warn(`Placeholder ${placeholderCode} not found in placeholder master list`);
        const placeholderPattern = new RegExp(`\\{\\{${placeholderCode}\\}\\}`, 'gi'); // Case-insensitive
        replacedText = replacedText.replace(placeholderPattern, `[${placeholderCode} - Not Found]`);
      }
    }
    
    return replacedText;
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
              disabled={generatingPDF || loadingClauses || loadingPartyData || !company || !hcf}
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
                    <p className="party-intro-subtitle">
                      is made on this <strong>{formatOrdinalDate(agreement.agreementDate)}</strong>
                    </p>
                    <div className="party-details">
                      <div className="party-section">
                        <p className="party-intro-text"><strong>BETWEEN</strong></p>
                        <h3 className="party-name">PARTY OF THE FIRST PART</h3>
                        <p className="party-description">
                          <strong>M/s. {firstPartyName}</strong>, a company incorporated under the Companies Act, 2013,
                          having its Registered Office at {firstPartyAddress},
                          represented by its {firstPartyDesignation}, {firstPartyPersonName},
                          hereinafter referred to as the "<strong>FIRST PARTY</strong>" (which expression shall, unless
                          repugnant to the context or meaning thereof, be deemed to include its successors
                          and assigns).
                        </p>
                      </div>
                      <div className="party-section">
                        <p className="party-intro-text"><strong>AND</strong></p>
                        <h3 className="party-name">PARTY OF THE SECOND PART</h3>
                        <p className="party-description">
                          <strong>{secondPartyName}</strong>, a healthcare facility located at {secondPartyAddress},
                          represented by its {secondPartyDesignation}, {secondPartyPersonName},
                          hereinafter referred to as the "<strong>SECOND PARTY</strong>" (which expression shall, unless
                          repugnant to the context or meaning thereof, be deemed to include its successors
                          and assigns).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Page 2+ - Main Agreement Content */}
              <div className="agreement-page">
            {/* Agreement Header - Fixed at top */}
            <div className="agreement-header-section">
              <h1 className="agreement-main-title">SERVICE AGREEMENT</h1>
              <p className="agreement-subtitle">
                FOR COLLECTION, TRANSPORTATION, TREATMENT AND DISPOSAL OF BIOMEDICAL WASTES
              </p>
              <div className="agreement-meta">
                <p><strong>Agreement No.:</strong> {agreement.agreementNum}</p>
                {contractNum && <p><strong>Contract Reference:</strong> {contractNum}</p>}
              </div>
            </div>

            {/* Agreement Content - Starts after header spacing */}
            <div className="agreement-content">
            {/* BETWEEN / AND: hidden in stamp-paper mode — party block is on the stamp page only */}
            {!printOnStampPaper && (
            <div className="agreement-section agreement-intro-section">
              <p className="between-text">
                This Agreement made and entered into at <strong>{getAgreementCity()}</strong> on this{' '}
                <strong>{formatOrdinalDate(agreement.agreementDate)}</strong> BETWEEN{' '}
                <strong>M/s. {firstPartyName}</strong>, incorporated under the Companies Act, 1956 having it&apos;s Registered Office at{' '}
                <strong> {firstPartyAddress}</strong> represented by its {firstPartyDesignation},{' '}
                <strong> {firstPartyPersonName}</strong>, hereinafter called the <strong>FIRST PARTY</strong>.
              </p>
              <p className="between-and-sep"><strong>AND</strong></p>
              <p className="between-text">
                <strong>{secondPartyName}</strong>, <strong>{secondPartyAddress}</strong> represented by its {secondPartyDesignation},{' '}
                <strong> {secondPartyPersonName}</strong>, hereinafter called the <strong>SECOND PARTY</strong>.
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
                              {replacePlaceholders(clause.pointText)}
                            </p>
                          </div>
                        ) : hasPointNum ? (
                          <div className="clause-item clause-item--numbered">
                            <p className="clause-text">
                              <strong>{clause.sequenceNo}.</strong> {replacePlaceholders(clause.pointText)}
                            </p>
                          </div>
                        ) : isNormal ? (
                          <div className="clause-item clause-item--normal">
                            <p className="clause-text">
                              {replacePlaceholders(clause.pointText)}
                            </p>
                          </div>
                        ) : (
                          <div className="clause-item">
                            <p className="clause-text">
                              {replacePlaceholders(clause.pointText)}
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
            </div> {/* Close agreement-content */}
              </div> {/* Close agreement-page */}
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

// Advanced Filters Modal Component
interface AdvancedFiltersModalProps {
  statusFilter: string;
  advancedFilters: AdvancedFilters;
  onClose: () => void;
  onClear: () => void;
  onApply: (payload: { statusFilter: string; advancedFilters: AdvancedFilters }) => void;
}

const AdvancedFiltersModal = ({
  statusFilter,
  advancedFilters,
  onClose,
  onClear,
  onApply,
}: AdvancedFiltersModalProps) => {
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draft, setDraft] = useState<AdvancedFilters>(advancedFilters);

  return (
    <div className="modal-overlay ra-filter-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ra-filter-modal-header">
          <div className="ra-filter-modal-titlewrap">
            <div className="ra-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 3H2l8 9v7l4 2v-9l8-9z"></path>
              </svg>
            </div>
            <div>
              <div className="ra-filter-title">Advanced Filters</div>
              <div className="ra-filter-subtitle">Filter agreements by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
            <div className="ra-filter-field">
              <label>Agreement Number</label>
              <input
                type="text"
                value={draft.agreementNum}
                onChange={(e) => setDraft({ ...draft, agreementNum: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter agreement number"
              />
            </div>

            <div className="ra-filter-field">
              <label>Agreement ID</label>
              <input
                type="text"
                value={draft.agreementID}
                onChange={(e) => setDraft({ ...draft, agreementID: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter agreement ID"
              />
            </div>

            <div className="ra-filter-field">
              <label>Contract Number</label>
              <input
                type="text"
                value={draft.contractNum}
                onChange={(e) => setDraft({ ...draft, contractNum: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter contract number"
              />
            </div>

            <div className="ra-filter-field">
              <label>Status</label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="ra-filter-select"
              >
                <option value="All">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Generated">Generated</option>
                <option value="Signed">Signed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="ra-filter-modal-footer">
          <button
            type="button"
            className="ra-link-btn"
            onClick={() => {
              setDraftStatus('All');
              setDraft({ agreementNum: '', agreementID: '', contractNum: '', status: '' });
              onClear();
            }}
          >
            Clear Filters
          </button>
          <button
            type="button"
            className="ra-btn ra-btn--primary ra-btn--sm"
            onClick={() =>
              onApply({
                statusFilter: draftStatus,
                advancedFilters: draft,
              })
            }
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

// Terminate Agreement Modal Component
interface TerminateAgreementModalProps {
  agreement: Agreement;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

const TerminateAgreementModal = ({ agreement, onClose, onConfirm, loading }: TerminateAgreementModalProps) => {
  return (
    <div className="agreement-terminate-modal-overlay" onClick={onClose}>
      <div className="agreement-terminate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="agreement-terminate-modal-header">
          <div className="agreement-terminate-header-left">
            <div className="agreement-terminate-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <h2 className="agreement-terminate-modal-title">Terminate Agreement</h2>
          </div>
          <button className="agreement-terminate-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="agreement-terminate-modal-body">
          <p className="agreement-terminate-message">
            Are you sure you want to terminate agreement <strong>{agreement.agreementNum}</strong>?
            <br />
            <span style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', display: 'block' }}>
              This action will mark the agreement as terminated (Signed status).
            </span>
          </p>
        </div>

        <div className="agreement-terminate-modal-footer">
          <button type="button" className="agreement-terminate-btn agreement-terminate-btn--cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="agreement-terminate-btn agreement-terminate-btn--terminate" onClick={onConfirm} disabled={loading}>
            {loading ? 'Terminating...' : 'Terminate Agreement'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgreementPage;

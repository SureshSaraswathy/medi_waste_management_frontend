import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { Contract } from '../../hooks/useContractFilters';
import { contractService, ContractResponse } from '../../services/contractService';
import { companyService } from '../../services/companyService';
import { hcfService } from '../../services/hcfService';
import PageHeader from '../../components/layout/PageHeader';
import './contractMasterPage.css';
import '../desktop/dashboardPage.css';

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
}

interface HCF {
  id: string;
  hcfCode: string;
  hcfName: string;
  companyId: string;
}

interface AdvancedFilters {
  contractNum: string;
  companyName: string;
  hcfName: string;
  billingType: string;
  status: string;
}

const ContractMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [hcfs, setHcfs] = useState<HCF[]>([]);
  const [filteredHcfs, setFilteredHcfs] = useState<HCF[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    contractNum: '',
    companyName: '',
    hcfName: '',
    billingType: '',
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
        companyCode: c.companyCode,
        companyName: c.companyName,
      })));
    } catch (err: any) {
      console.error('Failed to load companies:', err);
    }
  }, []);

  // Load HCFs
  const loadHcfs = useCallback(async () => {
    try {
      const data = await hcfService.getAllHcfs(undefined, true);
      setHcfs(data.map(h => ({
        id: h.id,
        hcfCode: h.hcfCode,
        hcfName: h.hcfName,
        companyId: h.companyId,
      })));
    } catch (err: any) {
      console.error('Failed to load HCFs:', err);
    }
  }, []);

  // Load contracts
  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contractService.getAllContracts();
      
      // Map API response to Contract interface
      const mappedContracts: Contract[] = await Promise.all(
        data.map(async (contract: ContractResponse) => {
          const company = companies.find(c => c.id === contract.companyId);
          const hcf = hcfs.find(h => h.id === contract.hcfId);
          
          return {
            id: contract.id,
            contractID: contract.contractID,
            contractNum: contract.contractNum,
            companyName: company?.companyName || 'Unknown',
            companyID: contract.companyId,
            hcfName: hcf?.hcfName || 'Unknown',
            hcfID: contract.hcfId,
            startDate: contract.startDate,
            endDate: contract.endDate,
            billingType: contract.billingType,
            status: contract.status,
          };
        })
      );
      
      setContracts(mappedContracts);
    } catch (err: any) {
      console.error('Failed to load contracts:', err);
      setError(err.message || 'Failed to load contracts');
      // Keep mock data for now if API fails
    } finally {
      setLoading(false);
    }
  }, [companies, hcfs]);

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadCompanies(), loadHcfs()]);
    };
    initialize();
  }, [loadCompanies, loadHcfs]);

  // Load contracts when companies and HCFs are available
  useEffect(() => {
    if (companies.length > 0 && hcfs.length > 0) {
      loadContracts();
    }
  }, [companies.length, hcfs.length, loadContracts]);

  // Filter HCFs by selected company
  useEffect(() => {
    if (editingContract?.companyID) {
      setFilteredHcfs(hcfs.filter(h => h.companyId === editingContract.companyID));
    } else {
      setFilteredHcfs(hcfs);
    }
  }, [editingContract?.companyID, hcfs]);

  // Filter contracts with search query, status filter, and advanced filters
  const filteredContracts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const contractNumQuery = advancedFilters.contractNum.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    const hcfQuery = advancedFilters.hcfName.trim().toLowerCase();
    const billingTypeQuery = advancedFilters.billingType.trim().toLowerCase();
    const advancedStatusQuery = advancedFilters.status.trim();

    return contracts.filter((contract) => {
      // Top search box: broad match across key fields
      const matchesSearch =
        !query ||
        contract.contractNum.toLowerCase().includes(query) ||
        contract.companyName.toLowerCase().includes(query) ||
        contract.hcfName.toLowerCase().includes(query);

      // Status filter (from dropdown)
      const matchesStatus = statusFilter === 'All' || contract.status === statusFilter;

      // Advanced filters
      const matchesContractNum = !contractNumQuery || contract.contractNum.toLowerCase().includes(contractNumQuery);
      const matchesCompany = !companyQuery || contract.companyName.toLowerCase().includes(companyQuery);
      const matchesHcf = !hcfQuery || contract.hcfName.toLowerCase().includes(hcfQuery);
      const matchesBillingType = !billingTypeQuery || contract.billingType.toLowerCase().includes(billingTypeQuery);
      const matchesAdvancedStatus = !advancedStatusQuery || contract.status === advancedStatusQuery;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesContractNum &&
        matchesCompany &&
        matchesHcf &&
        matchesBillingType &&
        matchesAdvancedStatus
      );
    });
  }, [contracts, searchQuery, statusFilter, advancedFilters]);

  // Handle Add
  const handleAdd = () => {
    setEditingContract(null);
    setShowModal(true);
  };

  // Handle Edit
  const handleEdit = (contract: Contract, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContract(contract);
    setShowModal(true);
  };

  // Handle Save
  const handleSave = async (data: Partial<Contract>) => {
    try {
      setSaving(true);
      setError(null);

      if (editingContract) {
        await contractService.updateContract(editingContract.id, {
          contractNum: data.contractNum,
          startDate: data.startDate,
          endDate: data.endDate,
          billingType: data.billingType as 'Bed' | 'Kg' | 'Lumpsum',
          status: data.status as 'Draft' | 'Active' | 'Expired',
        });
      } else {
        await contractService.createContract({
          contractNum: data.contractNum!,
          companyId: data.companyID!,
          hcfId: data.hcfID!,
          startDate: data.startDate!,
          endDate: data.endDate!,
          billingType: data.billingType as 'Bed' | 'Kg' | 'Lumpsum',
          status: data.status as 'Draft' | 'Active' | 'Expired' || 'Draft',
        });
      }

      setShowModal(false);
      setEditingContract(null);
      await loadContracts();
    } catch (err: any) {
      console.error('Failed to save contract:', err);
      setError(err.message || 'Failed to save contract');
      alert(err.message || 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  };

  // Handle row click - navigate to Agreement Management
  const handleRowClick = (contract: Contract) => {
    navigate(`/commercial-agreements/agreement?contractId=${contract.id}`);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: Contract['status'] }) => {
    const statusClass = `status-badge status-badge--${status.toLowerCase()}`;
    return <span className={statusClass}>{status}</span>;
  };

  // Actions component
  const ActionsCell = ({ contract }: { contract: Contract }) => (
    <>
      <button
        className="action-btn action-btn--edit"
        onClick={(e) => handleEdit(contract, e)}
        title="Edit Contract"
        aria-label={`Edit contract ${contract.contractNum}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
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
        <PageHeader 
          title="Contract Master"
          subtitle="Manage contracts and agreements"
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
              <h1 className="ra-page-title">Contract Master</h1>
              <p className="ra-page-subtitle">Manage and track contracts, billing type and status</p>
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
              {error}
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
                placeholder="Search by contract number or company..."
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
                Add Contract
              </button>
            </div>
          </div>

          {loading && (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading contracts...</div>
          )}

          {/* Contracts Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>CONTRACT NUMBER</th>
                  <th>CONTRACT ID</th>
                  <th>COMPANY</th>
                  <th>HCF</th>
                  <th>START DATE</th>
                  <th>END DATE</th>
                  <th>BILLING TYPE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      {loading ? 'Loading...' : 'No contract records found'}
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((contract) => {
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
                      <tr key={contract.id} onClick={() => handleRowClick(contract)} style={{ cursor: 'pointer' }}>
                        <td>
                          <span className="contract-num-cell">{contract.contractNum}</span>
                        </td>
                        <td>{contract.contractID}</td>
                        <td>{contract.companyName}</td>
                        <td>{contract.hcfName}</td>
                        <td>{formatDate(contract.startDate)}</td>
                        <td>{formatDate(contract.endDate)}</td>
                        <td>{contract.billingType}</td>
                        <td>
                          <div className="ra-cell-center">
                            <StatusBadge status={contract.status} />
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="action-buttons ra-actions">
                            <ActionsCell contract={contract} />
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
            Showing {filteredContracts.length} of {contracts.length} items
          </div>
        </div>
      </main>

      {/* Create/Edit Contract Modal */}
      {showModal && (
        <ContractFormModal
          contract={editingContract}
          companies={companies}
          hcfs={filteredHcfs}
          saving={saving}
          onClose={() => {
            setShowModal(false);
            setEditingContract(null);
          }}
          onSave={handleSave}
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
              contractNum: '',
              companyName: '',
              hcfName: '',
              billingType: '',
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
    </div>
  );
};

// Contract Form Modal
interface ContractFormModalProps {
  contract: Contract | null;
  companies: Company[];
  hcfs: HCF[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<Contract>) => void;
}

const ContractFormModal = ({ contract, companies, hcfs, saving, onClose, onSave }: ContractFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Contract>>(
    contract || {
      contractNum: '',
      companyID: '',
      hcfID: '',
      startDate: '',
      endDate: '',
      billingType: 'Bed',
      status: 'Draft',
    }
  );

  const handleCompanyChange = (companyId: string) => {
    setFormData({ ...formData, companyID: companyId, hcfID: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractNum || !formData.companyID || !formData.hcfID || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    if (new Date(formData.startDate!) > new Date(formData.endDate!)) {
      alert('End date must be after start date');
      return;
    }

    onSave(formData);
  };

  const filteredHcfsForCompany = formData.companyID
    ? hcfs.filter(h => h.companyId === formData.companyID)
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{contract ? 'Edit Contract' : 'Add Contract'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="contract-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Contract Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Contract Number *</label>
                <input
                  type="text"
                  value={formData.contractNum || ''}
                  onChange={(e) => setFormData({ ...formData, contractNum: e.target.value })}
                  required
                  disabled={saving}
                  placeholder="e.g., CONTRACT-2024-001"
                />
              </div>
              <div className="form-group">
                <label>Company *</label>
                <select
                  value={formData.companyID || ''}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  required
                  disabled={saving || !!contract}
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyCode} - {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>HCF *</label>
                <select
                  value={formData.hcfID || ''}
                  onChange={(e) => setFormData({ ...formData, hcfID: e.target.value })}
                  required
                  disabled={saving || !formData.companyID}
                >
                  <option value="">Select HCF</option>
                  {filteredHcfsForCompany.map((hcf) => (
                    <option key={hcf.id} value={hcf.id}>
                      {hcf.hcfCode} - {hcf.hcfName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label>Billing Type *</label>
                <select
                  value={formData.billingType || 'Bed'}
                  onChange={(e) => setFormData({ ...formData, billingType: e.target.value as 'Bed' | 'Kg' | 'Lumpsum' })}
                  required
                  disabled={saving}
                >
                  <option value="Bed">Bed</option>
                  <option value="Kg">Kg</option>
                  <option value="Lumpsum">Lumpsum</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || 'Draft'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Draft' | 'Active' | 'Expired' })}
                  disabled={saving}
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : (contract ? 'Update' : 'Add')} Contract
            </button>
          </div>
        </form>
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
              <div className="ra-filter-subtitle">Filter contracts by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
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
              <label>Company Name</label>
              <input
                type="text"
                value={draft.companyName}
                onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter company name"
              />
            </div>

            <div className="ra-filter-field">
              <label>HCF Name</label>
              <input
                type="text"
                value={draft.hcfName}
                onChange={(e) => setDraft({ ...draft, hcfName: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter HCF name"
              />
            </div>

            <div className="ra-filter-field">
              <label>Billing Type</label>
              <select
                value={draft.billingType}
                onChange={(e) => setDraft({ ...draft, billingType: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Types</option>
                <option value="Bed">Bed</option>
                <option value="Kg">Kg</option>
                <option value="Lumpsum">Lumpsum</option>
              </select>
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
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
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
              setDraft({ contractNum: '', companyName: '', hcfName: '', billingType: '', status: '' });
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

export default ContractMasterPage;

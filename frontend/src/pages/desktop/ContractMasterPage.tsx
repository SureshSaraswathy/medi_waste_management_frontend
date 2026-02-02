import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { useContractFilters, Contract } from '../../hooks/useContractFilters';
import { contractService, ContractResponse } from '../../services/contractService';
import { companyService } from '../../services/companyService';
import { hcfService } from '../../services/hcfService';
import DataTable, { Column } from '../../components/common/DataTable';
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

const ContractMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [hcfs, setHcfs] = useState<HCF[]>([]);
  const [filteredHcfs, setFilteredHcfs] = useState<HCF[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  // Use custom hook for filtering logic
  const { filteredContracts } = useContractFilters({
    contracts,
    searchQuery,
    statusFilter,
  });

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
    const statusClass = `contract-status-badge contract-status-badge--${status.toLowerCase()}`;
    return <span className={statusClass}>{status}</span>;
  };

  // Actions component
  const ActionsCell = ({ contract }: { contract: Contract }) => (
    <div className="contract-action-buttons" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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
    </div>
  );

  // Define table columns
  const columns: Column<Contract>[] = [
    {
      key: 'contractNum',
      label: 'Contract Number',
      minWidth: 180,
      render: (contract) => (
        <span className="contract-num-cell">{contract.contractNum}</span>
      ),
    },
    {
      key: 'contractID',
      label: 'Contract ID',
      minWidth: 120,
    },
    {
      key: 'companyName',
      label: 'Company',
      minWidth: 150,
      render: (contract) => contract.companyName,
    },
    {
      key: 'hcfName',
      label: 'HCF',
      minWidth: 150,
      render: (contract) => contract.hcfName,
    },
    {
      key: 'startDate',
      label: 'Start Date',
      minWidth: 120,
    },
    {
      key: 'endDate',
      label: 'End Date',
      minWidth: 120,
    },
    {
      key: 'billingType',
      label: 'Billing Type',
      minWidth: 120,
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: 100,
      render: (contract) => <StatusBadge status={contract.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      minWidth: 100,
      render: (contract) => <ActionsCell contract={contract} />,
    },
  ];

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

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
            <span className="breadcrumb">/ Commercial Agreements / Contract Master</span>
          </div>
        </header>

        <div className="contract-master-page">
          <div className="contract-master-header">
            <h1 className="contract-master-title">Contract Master</h1>
          </div>

          {error && (
            <div className="error-message" style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
              {error}
            </div>
          )}

          <div className="contract-master-actions">
            <div className="contract-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="contract-search-input"
                placeholder="Search by contract number or company..."
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
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
            </select>
            <button className="add-contract-btn" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Contract
            </button>
          </div>

          {loading && (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading contracts...</div>
          )}

          <div className="contract-table-container">
            <DataTable
              data={filteredContracts}
              columns={columns}
              getId={(contract) => contract.id}
              onRowClick={handleRowClick}
              emptyMessage="No contract records found"
            />
          </div>
          <div className="contract-pagination-info">
            Showing {filteredContracts.length} of {contracts.length} Items
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

export default ContractMasterPage;

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './contractMasterPage.css';
import '../desktop/dashboardPage.css';

interface Contract {
  id: string;
  contractID: string;
  companyID: string;
  hcfID: string;
  contractNum: string;
  startDate: string;
  endDate: string;
  billingType: 'Bed' | 'Kg' | 'Lumpsum';
  paymentTerms: string;
  status: 'Draft' | 'Active' | 'Closed';
  createdBy: string;
  createdOn: string;
  modifiedBy?: string;
  modifiedOn?: string;
}

interface ContractSub {
  id: string;
  contractSubID: string;
  contractID: string;
  serviceType: string;
  billingUnit: string;
  rate: string;
  minQty: string;
  maxQty: string;
  commercialPointNum: string;
  commercialPointText: string;
  status: 'Active' | 'Inactive';
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

interface HCF {
  id: string;
  hcfCode: string;
  hcfName: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

const ContractMasterPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);

  // Master data
  const [companies] = useState<Company[]>([
    { id: '1', companyCode: 'COMP001', companyName: 'Sample Company', status: 'Active' },
    { id: '2', companyCode: 'COMP002', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', companyCode: 'COMP003', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  const [hcfs] = useState<HCF[]>([
    { id: '1', hcfCode: 'HCF001', hcfName: 'City Hospital', companyName: 'Sample Company', status: 'Active' },
    { id: '2', hcfCode: 'HCF002', hcfName: 'General Hospital', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', hcfCode: 'HCF003', hcfName: 'Medical Center', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  const [contracts, setContracts] = useState<Contract[]>([
    {
      id: '1',
      contractID: 'CNT001',
      companyID: 'COMP001',
      hcfID: 'HCF001',
      contractNum: 'CONTRACT-2024-001',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      billingType: 'Bed',
      paymentTerms: 'Net 30',
      status: 'Draft',
      createdBy: 'System',
      createdOn: '2024-01-01',
    },
    {
      id: '2',
      contractID: 'CNT002',
      companyID: 'COMP002',
      hcfID: 'HCF002',
      contractNum: 'CONTRACT-2024-002',
      startDate: '2024-02-01',
      endDate: '2024-12-31',
      billingType: 'Kg',
      paymentTerms: 'Net 45',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2024-02-01',
    },
  ]);

  const [contractSubs, setContractSubs] = useState<ContractSub[]>([
    {
      id: '1',
      contractSubID: 'SUB001',
      contractID: 'CNT001',
      serviceType: 'Waste Collection',
      billingUnit: 'Bed',
      rate: '500',
      minQty: '1',
      maxQty: '100',
      commercialPointNum: '1',
      commercialPointText: 'Rate applicable for waste up to 50 kg per day.',
      status: 'Active',
    },
    {
      id: '2',
      contractSubID: 'SUB002',
      contractID: 'CNT001',
      serviceType: 'Transportation',
      billingUnit: 'Trip',
      rate: '1000',
      minQty: '1',
      maxQty: '10',
      commercialPointNum: '2',
      commercialPointText: 'Extra quantity will be charged separately.',
      status: 'Active',
    },
  ]);

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.contractNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contractID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.companyID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.hcfID.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreate = () => {
    setEditingContract(null);
    setShowCreateModal(true);
  };

  const handleView = (contract: Contract) => {
    setViewingContract(contract);
    setShowViewModal(true);
  };

  const handleEdit = (contract: Contract) => {
    if (contract.status === 'Draft') {
      setEditingContract(contract);
      setShowCreateModal(true);
    } else {
      alert('Only Draft contracts can be edited.');
    }
  };

  const handleSaveDraft = (data: Partial<Contract>) => {
    if (editingContract) {
      const updatedContract = {
        ...editingContract,
        ...data,
        status: 'Draft',
        modifiedOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'System',
      };
      setContracts(contracts.map(contract => contract.id === editingContract.id ? updatedContract : contract));
    } else {
      const newContract: Contract = {
        ...data as Contract,
        id: Date.now().toString(),
        contractID: `CNT${String(contracts.length + 1).padStart(3, '0')}`,
        status: 'Draft',
        createdBy: 'System',
        createdOn: new Date().toISOString().split('T')[0],
      };
      setContracts([...contracts, newContract]);
    }
    setShowCreateModal(false);
    setEditingContract(null);
  };

  const handleActivate = (contract: Contract) => {
    if (contract.status === 'Draft') {
      if (window.confirm('Are you sure you want to activate this contract? Once activated, it cannot be edited.')) {
        setContracts(contracts.map(c => 
          c.id === contract.id 
            ? { ...c, status: 'Active', modifiedOn: new Date().toISOString().split('T')[0], modifiedBy: 'System' }
            : c
        ));
      }
    } else {
      alert('Only Draft contracts can be activated.');
    }
  };

  const handleClose = (contract: Contract) => {
    if (contract.status === 'Active') {
      if (window.confirm('Are you sure you want to close this contract?')) {
        setContracts(contracts.map(c => 
          c.id === contract.id 
            ? { ...c, status: 'Closed', modifiedOn: new Date().toISOString().split('T')[0], modifiedBy: 'System' }
            : c
        ));
      }
    } else {
      alert('Only Active contracts can be closed.');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this contract?')) {
      setContracts(contracts.filter(contract => contract.id !== id));
      setContractSubs(contractSubs.filter(sub => contracts.find(c => c.id === id)?.contractID !== sub.contractID));
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
            <span className="breadcrumb">/ Commercial Agreements / Contract Master</span>
          </div>
        </header>

        <div className="contract-master-page">
          <div className="contract-master-header">
            <h1 className="contract-master-title">Contract Master</h1>
          </div>

          <div className="contract-master-actions">
            <div className="contract-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="contract-search-input"
                placeholder="Search Contract..."
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
              <option value="Closed">Closed</option>
            </select>
            <button className="create-contract-btn" onClick={handleCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create Contract
            </button>
          </div>

          <div className="contract-table-container">
            <table className="contract-table">
              <thead>
                <tr>
                  <th>Contract Number</th>
                  <th>Contract ID</th>
                  <th>Company ID</th>
                  <th>HCF ID</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Billing Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      No contract records found
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((contract) => {
                    const company = companies.find(c => c.companyCode === contract.companyID);
                    const hcf = hcfs.find(h => h.hcfCode === contract.hcfID);
                    return (
                      <tr key={contract.id}>
                        <td className="contract-num-cell">{contract.contractNum}</td>
                        <td>{contract.contractID}</td>
                        <td>{company ? `${contract.companyID} - ${company.companyName}` : contract.companyID}</td>
                        <td>{hcf ? `${contract.hcfID} - ${hcf.hcfName}` : contract.hcfID}</td>
                        <td>{contract.startDate}</td>
                        <td>{contract.endDate}</td>
                        <td>{contract.billingType}</td>
                        <td>
                          <span className={`contract-status-badge contract-status-badge--${contract.status.toLowerCase()}`}>
                            {contract.status}
                          </span>
                        </td>
                        <td>
                          <div className="contract-action-buttons">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleView(contract)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            {contract.status === 'Draft' && (
                              <>
                                <button
                                  className="action-btn action-btn--edit"
                                  onClick={() => handleEdit(contract)}
                                  title="Edit"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  className="action-btn action-btn--activate"
                                  onClick={() => handleActivate(contract)}
                                  title="Activate"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                </button>
                              </>
                            )}
                            {contract.status === 'Active' && (
                              <button
                                className="action-btn action-btn--close"
                                onClick={() => handleClose(contract)}
                                title="Close"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="8" x2="12" y2="16"></line>
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
          <div className="contract-pagination-info">
            Showing {filteredContracts.length} of {contracts.length} Items
          </div>
        </div>
      </main>

      {/* Create/Edit Contract Modal */}
      {showCreateModal && (
        <ContractFormModal
          contract={editingContract}
          companies={companies.filter(c => c.status === 'Active')}
          hcfs={hcfs.filter(h => h.status === 'Active')}
          contractSubs={contractSubs.filter(sub => editingContract ? sub.contractID === editingContract.contractID : false)}
          onClose={() => {
            setShowCreateModal(false);
            setEditingContract(null);
          }}
          onSaveDraft={handleSaveDraft}
          onContractSubsChange={(subs) => {
            if (editingContract) {
              const existingSubs = contractSubs.filter(s => s.contractID !== editingContract.contractID);
              setContractSubs([...existingSubs, ...subs]);
            }
          }}
        />
      )}

      {/* View Contract Modal */}
      {showViewModal && viewingContract && (
        <ContractViewModal
          contract={viewingContract}
          companies={companies}
          hcfs={hcfs}
          contractSubs={contractSubs.filter(sub => sub.contractID === viewingContract.contractID)}
          onClose={() => {
            setShowViewModal(false);
            setViewingContract(null);
          }}
        />
      )}
    </div>
  );
};

// Contract Form Modal Component
interface ContractFormModalProps {
  contract: Contract | null;
  companies: Company[];
  hcfs: HCF[];
  contractSubs: ContractSub[];
  onClose: () => void;
  onSaveDraft: (data: Partial<Contract>) => void;
  onContractSubsChange: (subs: ContractSub[]) => void;
}

const ContractFormModal = ({ contract, companies, hcfs, contractSubs, onClose, onSaveDraft, onContractSubsChange }: ContractFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Contract>>(
    contract || {
      contractNum: '',
      companyID: '',
      hcfID: '',
      startDate: '',
      endDate: '',
      billingType: 'Bed',
      paymentTerms: '',
    }
  );

  const [localContractSubs, setLocalContractSubs] = useState<ContractSub[]>(contractSubs);
  const [editingSubIndex, setEditingSubIndex] = useState<number | null>(null);

  // Filter HCFs based on selected company
  const filteredHCFs = formData.companyID
    ? hcfs.filter(hcf => hcf.companyName === companies.find(c => c.companyCode === formData.companyID)?.companyName)
    : hcfs;

  const handleFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (field === 'companyID') {
      setFormData({ ...formData, companyID: value, hcfID: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contractNum || !formData.companyID || !formData.hcfID || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields');
      return;
    }
    onSaveDraft(formData);
    if (contract) {
      onContractSubsChange(localContractSubs);
    }
  };

  const handleAddSub = () => {
    const newSub: ContractSub = {
      id: Date.now().toString(),
      contractSubID: `SUB${String(localContractSubs.length + 1).padStart(3, '0')}`,
      contractID: contract?.contractID || '',
      serviceType: '',
      billingUnit: '',
      rate: '',
      minQty: '',
      maxQty: '',
      commercialPointNum: String(localContractSubs.length + 1),
      commercialPointText: '',
      status: 'Active',
    };
    setLocalContractSubs([...localContractSubs, newSub]);
    setEditingSubIndex(localContractSubs.length);
  };

  const handleEditSub = (index: number) => {
    setEditingSubIndex(index);
  };

  const handleRemoveSub = (index: number) => {
    if (window.confirm('Are you sure you want to remove this line item?')) {
      setLocalContractSubs(localContractSubs.filter((_, i) => i !== index));
      setEditingSubIndex(null);
    }
  };

  const handleSubChange = (index: number, field: string, value: string) => {
    const updated = localContractSubs.map((sub, i) => 
      i === index ? { ...sub, [field]: value } : sub
    );
    setLocalContractSubs(updated);
  };

  const isLocked = contract?.status !== 'Draft';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{contract ? 'Edit Contract' : 'Create Contract'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="contract-form" onSubmit={handleSubmit}>
          {/* Contract Header Section */}
          <div className="form-section">
            <h3 className="form-section-title">Contract Header</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Contract Number *</label>
                <input
                  type="text"
                  value={formData.contractNum || ''}
                  onChange={(e) => handleFieldChange('contractNum', e.target.value)}
                  required
                  disabled={isLocked}
                  placeholder="e.g., CONTRACT-2024-001"
                />
              </div>
              <div className="form-group">
                <label>Company ID *</label>
                <select
                  value={formData.companyID || ''}
                  onChange={(e) => handleFieldChange('companyID', e.target.value)}
                  required
                  disabled={isLocked}
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
                <label>HCF ID *</label>
                <select
                  value={formData.hcfID || ''}
                  onChange={(e) => handleFieldChange('hcfID', e.target.value)}
                  required
                  disabled={!formData.companyID || isLocked}
                >
                  <option value="">Select HCF</option>
                  {filteredHCFs.map((hcf) => (
                    <option key={hcf.id} value={hcf.hcfCode}>
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
                  onChange={(e) => handleFieldChange('startDate', e.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => handleFieldChange('endDate', e.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>
              <div className="form-group">
                <label>Billing Type *</label>
                <select
                  value={formData.billingType || 'Bed'}
                  onChange={(e) => handleFieldChange('billingType', e.target.value)}
                  required
                  disabled={isLocked}
                >
                  <option value="Bed">Bed</option>
                  <option value="Kg">Kg</option>
                  <option value="Lumpsum">Lumpsum</option>
                </select>
              </div>
              <div className="form-group form-group--full">
                <label>Payment Terms</label>
                <input
                  type="text"
                  value={formData.paymentTerms || ''}
                  onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g., Net 30, Net 45"
                />
              </div>
            </div>
          </div>

          {/* Contract Sub Section */}
          {!isLocked && (
            <div className="form-section">
              <div className="section-header-with-button">
                <h3 className="form-section-title">Commercial Line Items (ContractSub)</h3>
                <button type="button" className="btn btn--small btn--success" onClick={handleAddSub}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Line
                </button>
              </div>
              {localContractSubs.length === 0 ? (
                <div className="empty-state">No line items added. Click "Add Line" to add commercial items.</div>
              ) : (
                <div className="contract-sub-grid">
                  <table className="contract-sub-table">
                    <thead>
                      <tr>
                        <th>Service Type</th>
                        <th>Billing Unit</th>
                        <th>Rate</th>
                        <th>Min Qty</th>
                        <th>Max Qty</th>
                        <th>Point Num</th>
                        <th>Commercial Point Text</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localContractSubs.map((sub, index) => (
                        <tr key={sub.id}>
                          {editingSubIndex === index ? (
                            <>
                              <td>
                                <input
                                  type="text"
                                  value={sub.serviceType}
                                  onChange={(e) => handleSubChange(index, 'serviceType', e.target.value)}
                                  placeholder="Service Type"
                                  className="inline-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={sub.billingUnit}
                                  onChange={(e) => handleSubChange(index, 'billingUnit', e.target.value)}
                                  placeholder="Billing Unit"
                                  className="inline-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={sub.rate}
                                  onChange={(e) => handleSubChange(index, 'rate', e.target.value)}
                                  placeholder="Rate"
                                  className="inline-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={sub.minQty}
                                  onChange={(e) => handleSubChange(index, 'minQty', e.target.value)}
                                  placeholder="Min Qty"
                                  className="inline-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={sub.maxQty}
                                  onChange={(e) => handleSubChange(index, 'maxQty', e.target.value)}
                                  placeholder="Max Qty"
                                  className="inline-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={sub.commercialPointNum}
                                  onChange={(e) => handleSubChange(index, 'commercialPointNum', e.target.value)}
                                  placeholder="Point Num"
                                  className="inline-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={sub.commercialPointText}
                                  onChange={(e) => handleSubChange(index, 'commercialPointText', e.target.value)}
                                  placeholder="Commercial Point Text"
                                  className="inline-input"
                                />
                              </td>
                              <td>
                                <select
                                  value={sub.status}
                                  onChange={(e) => handleSubChange(index, 'status', e.target.value)}
                                  className="inline-select"
                                >
                                  <option value="Active">Active</option>
                                  <option value="Inactive">Inactive</option>
                                </select>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="action-btn-small action-btn-small--save"
                                  onClick={() => setEditingSubIndex(null)}
                                  title="Save"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{sub.serviceType || '-'}</td>
                              <td>{sub.billingUnit || '-'}</td>
                              <td>{sub.rate || '-'}</td>
                              <td>{sub.minQty || '-'}</td>
                              <td>{sub.maxQty || '-'}</td>
                              <td>{sub.commercialPointNum || '-'}</td>
                              <td className="text-cell">{sub.commercialPointText || '-'}</td>
                              <td>
                                <span className={`status-badge-small status-badge-small--${sub.status.toLowerCase()}`}>
                                  {sub.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="action-btn-small action-btn-small--edit"
                                  onClick={() => handleEditSub(index)}
                                  title="Edit"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="action-btn-small action-btn-small--remove"
                                  onClick={() => handleRemoveSub(index)}
                                  title="Remove"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {isLocked && localContractSubs.length > 0 && (
            <div className="form-section">
              <h3 className="form-section-title">Commercial Line Items (ContractSub) - Locked</h3>
              <div className="contract-sub-grid">
                <table className="contract-sub-table">
                  <thead>
                    <tr>
                      <th>Service Type</th>
                      <th>Billing Unit</th>
                      <th>Rate</th>
                      <th>Min Qty</th>
                      <th>Max Qty</th>
                      <th>Point Num</th>
                      <th>Commercial Point Text</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localContractSubs.map((sub) => (
                      <tr key={sub.id}>
                        <td>{sub.serviceType || '-'}</td>
                        <td>{sub.billingUnit || '-'}</td>
                        <td>{sub.rate || '-'}</td>
                        <td>{sub.minQty || '-'}</td>
                        <td>{sub.maxQty || '-'}</td>
                        <td>{sub.commercialPointNum || '-'}</td>
                        <td className="text-cell">{sub.commercialPointText || '-'}</td>
                        <td>
                          <span className={`status-badge-small status-badge-small--${sub.status.toLowerCase()}`}>
                            {sub.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            {!isLocked && (
              <button type="submit" className="btn btn--primary">
                Save Draft
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// Contract View Modal Component
interface ContractViewModalProps {
  contract: Contract;
  companies: Company[];
  hcfs: HCF[];
  contractSubs: ContractSub[];
  onClose: () => void;
}

const ContractViewModal = ({ contract, companies, hcfs, contractSubs, onClose }: ContractViewModalProps) => {
  const company = companies.find(c => c.companyCode === contract.companyID);
  const hcf = hcfs.find(h => h.hcfCode === contract.hcfID);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--view modal-content--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Contract Details - {contract.contractNum}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="contract-view-content">
          <div className="contract-view-section">
            <h3 className="contract-view-section-title">Contract Header</h3>
            <div className="contract-view-grid">
              <div className="contract-view-field">
                <label>Contract Number:</label>
                <span>{contract.contractNum}</span>
              </div>
              <div className="contract-view-field">
                <label>Contract ID:</label>
                <span>{contract.contractID}</span>
              </div>
              <div className="contract-view-field">
                <label>Company ID:</label>
                <span>{company ? `${contract.companyID} - ${company.companyName}` : contract.companyID}</span>
              </div>
              <div className="contract-view-field">
                <label>HCF ID:</label>
                <span>{hcf ? `${contract.hcfID} - ${hcf.hcfName}` : contract.hcfID}</span>
              </div>
              <div className="contract-view-field">
                <label>Start Date:</label>
                <span>{contract.startDate}</span>
              </div>
              <div className="contract-view-field">
                <label>End Date:</label>
                <span>{contract.endDate}</span>
              </div>
              <div className="contract-view-field">
                <label>Billing Type:</label>
                <span>{contract.billingType}</span>
              </div>
              <div className="contract-view-field">
                <label>Payment Terms:</label>
                <span>{contract.paymentTerms || '-'}</span>
              </div>
              <div className="contract-view-field">
                <label>Status:</label>
                <span className={`contract-status-badge contract-status-badge--${contract.status.toLowerCase()}`}>
                  {contract.status}
                </span>
              </div>
            </div>
          </div>

          {contractSubs.length > 0 && (
            <div className="contract-view-section">
              <h3 className="contract-view-section-title">Commercial Line Items</h3>
              <div className="contract-sub-grid">
                <table className="contract-sub-table">
                  <thead>
                    <tr>
                      <th>Service Type</th>
                      <th>Billing Unit</th>
                      <th>Rate</th>
                      <th>Min Qty</th>
                      <th>Max Qty</th>
                      <th>Point Num</th>
                      <th>Commercial Point Text</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractSubs.map((sub) => (
                      <tr key={sub.id}>
                        <td>{sub.serviceType || '-'}</td>
                        <td>{sub.billingUnit || '-'}</td>
                        <td>{sub.rate || '-'}</td>
                        <td>{sub.minQty || '-'}</td>
                        <td>{sub.maxQty || '-'}</td>
                        <td>{sub.commercialPointNum || '-'}</td>
                        <td className="text-cell">{sub.commercialPointText || '-'}</td>
                        <td>
                          <span className={`status-badge-small status-badge-small--${sub.status.toLowerCase()}`}>
                            {sub.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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

export default ContractMasterPage;

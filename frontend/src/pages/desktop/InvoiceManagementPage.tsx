import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './invoiceManagementPage.css';
import '../desktop/dashboardPage.css';

interface Invoice {
  id: string;
  companyName: string;
  hcfCode: string;
  invoiceNum: string;
  invoiceDate: string;
  dueDate: string;
  billingType: string;
  billingDays: string;
  bedCount: string;
  bedRate: string;
  weightInKg: string;
  kgRate: string;
  lumpsumAmount: string;
  taxableValue: string;
  igst: string;
  cgst: string;
  sgst: string;
  roundOff: string;
  invoiceValue: string;
  totalPaidAmount: string;
  balanceAmount: string;
  invoiceStatus: 'Draft' | 'Generated' | 'Partially Paid' | 'Paid' | 'Cancelled';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
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

const InvoiceManagementPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Master data - Load from respective masters
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

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: '1',
      companyName: 'Sample Company',
      hcfCode: 'HCF001',
      invoiceNum: 'INV-2024-001',
      invoiceDate: '2024-01-15',
      dueDate: '2024-02-15',
      billingType: 'Monthly',
      billingDays: '30',
      bedCount: '100',
      bedRate: '500',
      weightInKg: '5000',
      kgRate: '50',
      lumpsumAmount: '100000',
      taxableValue: '100000',
      igst: '18000',
      cgst: '9000',
      sgst: '9000',
      roundOff: '0',
      invoiceValue: '127000',
      totalPaidAmount: '0',
      balanceAmount: '127000',
      invoiceStatus: 'Draft',
      createdBy: 'System',
      createdOn: '2024-01-15',
      modifiedBy: 'System',
      modifiedOn: '2024-01-15',
    },
    {
      id: '2',
      companyName: 'ABC Industries',
      hcfCode: 'HCF002',
      invoiceNum: 'INV-2024-002',
      invoiceDate: '2024-01-20',
      dueDate: '2024-02-20',
      billingType: 'Monthly',
      billingDays: '30',
      bedCount: '150',
      bedRate: '600',
      weightInKg: '7500',
      kgRate: '55',
      lumpsumAmount: '150000',
      taxableValue: '150000',
      igst: '27000',
      cgst: '13500',
      sgst: '13500',
      roundOff: '0',
      invoiceValue: '190500',
      totalPaidAmount: '50000',
      balanceAmount: '140500',
      invoiceStatus: 'Partially Paid',
      createdBy: 'System',
      createdOn: '2024-01-20',
      modifiedBy: 'System',
      modifiedOn: '2024-01-25',
    },
  ]);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.hcfCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hcfs.find(h => h.hcfCode === invoice.hcfCode)?.hcfName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || invoice.invoiceStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreate = () => {
    setEditingInvoice(null);
    setShowCreateModal(true);
  };

  const handleView = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setShowViewModal(true);
  };

  const handleEdit = (invoice: Invoice) => {
    if (invoice.invoiceStatus === 'Draft') {
      setEditingInvoice(invoice);
      setShowCreateModal(true);
    } else {
      alert('Only Draft invoices can be edited.');
    }
  };

  const handleGenerate = (invoice: Invoice) => {
    if (invoice.invoiceStatus === 'Draft') {
      if (window.confirm('Are you sure you want to generate this invoice? This action cannot be undone.')) {
        setInvoices(invoices.map(inv => 
          inv.id === invoice.id 
            ? { ...inv, invoiceStatus: 'Generated', modifiedOn: new Date().toISOString().split('T')[0] }
            : inv
        ));
      }
    } else {
      alert('Only Draft invoices can be generated.');
    }
  };

  const handleCancel = (invoice: Invoice) => {
    if (window.confirm('Are you sure you want to cancel this invoice?')) {
      setInvoices(invoices.map(inv => 
        inv.id === invoice.id 
          ? { ...inv, invoiceStatus: 'Cancelled', modifiedOn: new Date().toISOString().split('T')[0] }
          : inv
      ));
    }
  };

  const handlePrint = (invoice: Invoice) => {
    window.print();
  };

  const handleExport = () => {
    alert('Export functionality will be implemented');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      setInvoices(invoices.filter(invoice => invoice.id !== id));
    }
  };

  const handleSave = (data: Partial<Invoice>, isGenerate: boolean = false) => {
    if (editingInvoice) {
      const updatedInvoice = {
        ...editingInvoice,
        ...data,
        invoiceStatus: isGenerate ? 'Generated' : 'Draft',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setInvoices(invoices.map(inv => inv.id === editingInvoice.id ? updatedInvoice : inv));
    } else {
      const newInvoice: Invoice = {
        ...data as Invoice,
        id: Date.now().toString(),
        invoiceStatus: isGenerate ? 'Generated' : 'Draft',
        totalPaidAmount: '0',
        balanceAmount: data.invoiceValue || '0',
        createdBy: 'System',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'System',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setInvoices([...invoices, newInvoice]);
    }
    setShowCreateModal(false);
    setEditingInvoice(null);
  };

  const calculateInvoiceValue = (formData: Partial<Invoice>) => {
    const taxable = parseFloat(formData.taxableValue || '0');
    const igst = parseFloat(formData.igst || '0');
    const cgst = parseFloat(formData.cgst || '0');
    const sgst = parseFloat(formData.sgst || '0');
    const roundOff = parseFloat(formData.roundOff || '0');
    const total = taxable + igst + cgst + sgst + roundOff;
    return total.toFixed(2);
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
            <span className="breadcrumb">/ Finance / Invoice Management</span>
          </div>
        </header>

        <div className="invoice-management-page">
          <div className="invoice-management-header">
            <h1 className="invoice-management-title">Invoice Management</h1>
          </div>

          <div className="invoice-management-actions">
            <div className="invoice-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="invoice-search-input"
                placeholder="Search Invoice..."
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
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button className="export-btn" onClick={handleExport}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export
            </button>
            <button className="add-invoice-btn" onClick={handleCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create Invoice
            </button>
          </div>

          <div className="invoice-table-container">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Company Name</th>
                  <th>HCF Code</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th>Invoice Value</th>
                  <th>Paid Amount</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-message">
                      No invoice records found
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const hcf = hcfs.find(h => h.hcfCode === invoice.hcfCode);
                    return (
                      <tr key={invoice.id}>
                        <td>{invoice.invoiceNum || '-'}</td>
                        <td>{invoice.companyName || '-'}</td>
                        <td>{hcf ? `${invoice.hcfCode} - ${hcf.hcfName}` : invoice.hcfCode}</td>
                        <td>{invoice.invoiceDate || '-'}</td>
                        <td>{invoice.dueDate || '-'}</td>
                        <td>₹{invoice.invoiceValue || '0'}</td>
                        <td>₹{invoice.totalPaidAmount || '0'}</td>
                        <td>₹{invoice.balanceAmount || '0'}</td>
                        <td>
                          <span className={`invoice-status-badge invoice-status-badge--${invoice.invoiceStatus.toLowerCase().replace(' ', '-')}`}>
                            {invoice.invoiceStatus}
                          </span>
                        </td>
                        <td>
                          <div className="invoice-action-buttons">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleView(invoice)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            {invoice.invoiceStatus === 'Draft' && (
                              <>
                                <button
                                  className="action-btn action-btn--edit"
                                  onClick={() => handleEdit(invoice)}
                                  title="Edit"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  className="action-btn action-btn--generate"
                                  onClick={() => handleGenerate(invoice)}
                                  title="Generate"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                </button>
                              </>
                            )}
                            {(invoice.invoiceStatus === 'Generated' || invoice.invoiceStatus === 'Partially Paid' || invoice.invoiceStatus === 'Paid') && (
                              <button
                                className="action-btn action-btn--print"
                                onClick={() => handlePrint(invoice)}
                                title="Print"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                  <rect x="6" y="14" width="12" height="8"></rect>
                                </svg>
                              </button>
                            )}
                            {invoice.invoiceStatus !== 'Cancelled' && invoice.invoiceStatus !== 'Paid' && (
                              <button
                                className="action-btn action-btn--cancel"
                                onClick={() => handleCancel(invoice)}
                                title="Cancel"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="15" y1="9" x2="9" y2="15"></line>
                                  <line x1="9" y1="9" x2="15" y2="15"></line>
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
          <div className="invoice-pagination-info">
            Showing {filteredInvoices.length} of {invoices.length} Items
          </div>
        </div>
      </main>

      {/* Invoice Create/Edit Modal */}
      {showCreateModal && (
        <InvoiceFormModal
          invoice={editingInvoice}
          companies={companies.filter(c => c.status === 'Active')}
          hcfs={hcfs.filter(h => h.status === 'Active')}
          onClose={() => {
            setShowCreateModal(false);
            setEditingInvoice(null);
          }}
          onSave={handleSave}
          calculateInvoiceValue={calculateInvoiceValue}
        />
      )}

      {/* Invoice View Modal */}
      {showViewModal && viewingInvoice && (
        <InvoiceViewModal
          invoice={viewingInvoice}
          hcfs={hcfs}
          onClose={() => {
            setShowViewModal(false);
            setViewingInvoice(null);
          }}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
};

// Invoice Form Modal Component
interface InvoiceFormModalProps {
  invoice: Invoice | null;
  companies: Company[];
  hcfs: HCF[];
  onClose: () => void;
  onSave: (data: Partial<Invoice>, isGenerate?: boolean) => void;
  calculateInvoiceValue: (data: Partial<Invoice>) => string;
}

const InvoiceFormModal = ({ invoice, companies, hcfs, onClose, onSave, calculateInvoiceValue }: InvoiceFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Invoice>>(
    invoice || {
      companyName: '',
      hcfCode: '',
      invoiceNum: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      billingType: '',
      billingDays: '',
      bedCount: '',
      bedRate: '',
      weightInKg: '',
      kgRate: '',
      lumpsumAmount: '',
      taxableValue: '',
      igst: '',
      cgst: '',
      sgst: '',
      roundOff: '0',
      invoiceValue: '',
      invoiceStatus: 'Draft',
    }
  );

  // Filter HCFs based on selected company
  const filteredHCFs = formData.companyName
    ? hcfs.filter(hcf => hcf.companyName === formData.companyName)
    : hcfs;

  // Calculate invoice value when tax fields change
  const updateInvoiceValue = () => {
    const calculatedValue = calculateInvoiceValue(formData);
    setFormData({ ...formData, invoiceValue: calculatedValue });
  };

  const handleFieldChange = (field: string, value: string) => {
    const updatedData = { ...formData, [field]: value };
    
    // Auto-calculate invoice value when tax fields change
    if (['taxableValue', 'igst', 'cgst', 'sgst', 'roundOff'].includes(field)) {
      const calculatedValue = calculateInvoiceValue(updatedData);
      updatedData.invoiceValue = calculatedValue;
    }
    
    // Calculate balance amount whenever invoice value or paid amount changes
    const invoiceVal = parseFloat(updatedData.invoiceValue || '0');
    const paid = parseFloat(updatedData.totalPaidAmount || '0');
    const balance = (invoiceVal - paid).toFixed(2);
    updatedData.balanceAmount = balance;
    
    setFormData(updatedData);
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, false);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNum || !formData.companyName || !formData.hcfCode) {
      alert('Please fill in all required fields');
      return;
    }
    if (window.confirm('Are you sure you want to generate this invoice? This action cannot be undone.')) {
      onSave(formData, true);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the form? All unsaved changes will be lost.')) {
      setFormData({
        companyName: '',
        hcfCode: '',
        invoiceNum: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        billingType: '',
        billingDays: '',
        bedCount: '',
        bedRate: '',
        weightInKg: '',
        kgRate: '',
        lumpsumAmount: '',
        taxableValue: '',
        igst: '',
        cgst: '',
        sgst: '',
        roundOff: '0',
        invoiceValue: '',
        invoiceStatus: 'Draft',
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{invoice ? 'Edit Invoice' : 'Create Invoice'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="invoice-form" onSubmit={handleSaveDraft}>
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => {
                    handleFieldChange('companyName', e.target.value);
                    handleFieldChange('hcfCode', '');
                  }}
                  required
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.companyName}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>HCF Code *</label>
                <select
                  value={formData.hcfCode || ''}
                  onChange={(e) => handleFieldChange('hcfCode', e.target.value)}
                  required
                  disabled={!formData.companyName}
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
                <label>Invoice Number *</label>
                <input
                  type="text"
                  value={formData.invoiceNum || ''}
                  onChange={(e) => handleFieldChange('invoiceNum', e.target.value)}
                  required
                  placeholder="e.g., INV-2024-001"
                />
              </div>
              <div className="form-group">
                <label>Invoice Date *</label>
                <input
                  type="date"
                  value={formData.invoiceDate || ''}
                  onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="form-section">
            <h3 className="form-section-title">Billing Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Billing Type *</label>
                <select
                  value={formData.billingType || ''}
                  onChange={(e) => handleFieldChange('billingType', e.target.value)}
                  required
                >
                  <option value="">Select Billing Type</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Billing Days</label>
                <input
                  type="text"
                  value={formData.billingDays || ''}
                  onChange={(e) => handleFieldChange('billingDays', e.target.value)}
                  placeholder="Enter billing days"
                />
              </div>
              <div className="form-group">
                <label>Bed Count</label>
                <input
                  type="text"
                  value={formData.bedCount || ''}
                  onChange={(e) => handleFieldChange('bedCount', e.target.value)}
                  placeholder="Enter bed count"
                />
              </div>
              <div className="form-group">
                <label>Bed Rate</label>
                <input
                  type="text"
                  value={formData.bedRate || ''}
                  onChange={(e) => handleFieldChange('bedRate', e.target.value)}
                  placeholder="Enter bed rate"
                />
              </div>
              <div className="form-group">
                <label>Weight in Kg</label>
                <input
                  type="text"
                  value={formData.weightInKg || ''}
                  onChange={(e) => handleFieldChange('weightInKg', e.target.value)}
                  placeholder="Enter weight in kg"
                />
              </div>
              <div className="form-group">
                <label>Kg Rate</label>
                <input
                  type="text"
                  value={formData.kgRate || ''}
                  onChange={(e) => handleFieldChange('kgRate', e.target.value)}
                  placeholder="Enter kg rate"
                />
              </div>
              <div className="form-group">
                <label>Lumpsum Amount</label>
                <input
                  type="text"
                  value={formData.lumpsumAmount || ''}
                  onChange={(e) => handleFieldChange('lumpsumAmount', e.target.value)}
                  placeholder="Enter lumpsum amount"
                />
              </div>
            </div>
          </div>

          {/* Tax & Amount Information */}
          <div className="form-section">
            <h3 className="form-section-title">Tax & Amount Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Taxable Value *</label>
                <input
                  type="text"
                  value={formData.taxableValue || ''}
                  onChange={(e) => handleFieldChange('taxableValue', e.target.value)}
                  required
                  placeholder="Enter taxable value"
                />
              </div>
              <div className="form-group">
                <label>IGST</label>
                <input
                  type="text"
                  value={formData.igst || ''}
                  onChange={(e) => handleFieldChange('igst', e.target.value)}
                  placeholder="Enter IGST"
                />
              </div>
              <div className="form-group">
                <label>CGST</label>
                <input
                  type="text"
                  value={formData.cgst || ''}
                  onChange={(e) => handleFieldChange('cgst', e.target.value)}
                  placeholder="Enter CGST"
                />
              </div>
              <div className="form-group">
                <label>SGST</label>
                <input
                  type="text"
                  value={formData.sgst || ''}
                  onChange={(e) => handleFieldChange('sgst', e.target.value)}
                  placeholder="Enter SGST"
                />
              </div>
              <div className="form-group">
                <label>Round Off</label>
                <input
                  type="text"
                  value={formData.roundOff || '0'}
                  onChange={(e) => handleFieldChange('roundOff', e.target.value)}
                  placeholder="Enter round off"
                />
              </div>
              <div className="form-group">
                <label>Invoice Value</label>
                <input
                  type="text"
                  value={formData.invoiceValue || ''}
                  readOnly
                  style={{ backgroundColor: '#f1f5f9', fontWeight: '600' }}
                  placeholder="Auto-calculated"
                />
              </div>
              <div className="form-group">
                <label>Total Paid Amount</label>
                <input
                  type="text"
                  value={formData.totalPaidAmount || '0'}
                  onChange={(e) => handleFieldChange('totalPaidAmount', e.target.value)}
                  placeholder="Enter paid amount"
                />
              </div>
              <div className="form-group">
                <label>Balance Amount</label>
                <input
                  type="text"
                  value={formData.balanceAmount || ''}
                  readOnly
                  style={{ backgroundColor: '#f1f5f9', fontWeight: '600' }}
                  placeholder="Auto-calculated"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={handleReset}>
              Reset
            </button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Save Draft
            </button>
            <button type="button" className="btn btn--success" onClick={handleGenerate}>
              Generate Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Invoice View Modal Component
interface InvoiceViewModalProps {
  invoice: Invoice;
  hcfs: HCF[];
  onClose: () => void;
  onPrint: (invoice: Invoice) => void;
}

const InvoiceViewModal = ({ invoice, hcfs, onClose, onPrint }: InvoiceViewModalProps) => {
  const hcf = hcfs.find(h => h.hcfCode === invoice.hcfCode);

  const handleAddReceipt = () => {
    alert('Add Receipt functionality will be implemented');
  };

  const handleViewReceipts = () => {
    alert('View Receipts functionality will be implemented');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--view" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Invoice Details - {invoice.invoiceNum}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="invoice-view-content">
          <div className="invoice-view-section">
            <h3 className="invoice-view-section-title">Basic Information</h3>
            <div className="invoice-view-grid">
              <div className="invoice-view-field">
                <label>Company Name:</label>
                <span>{invoice.companyName || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>HCF Code:</label>
                <span>{hcf ? `${invoice.hcfCode} - ${hcf.hcfName}` : invoice.hcfCode}</span>
              </div>
              <div className="invoice-view-field">
                <label>Invoice Number:</label>
                <span>{invoice.invoiceNum || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Invoice Date:</label>
                <span>{invoice.invoiceDate || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Due Date:</label>
                <span>{invoice.dueDate || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Status:</label>
                <span className={`invoice-status-badge invoice-status-badge--${invoice.invoiceStatus.toLowerCase().replace(' ', '-')}`}>
                  {invoice.invoiceStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="invoice-view-section">
            <h3 className="invoice-view-section-title">Billing Information</h3>
            <div className="invoice-view-grid">
              <div className="invoice-view-field">
                <label>Billing Type:</label>
                <span>{invoice.billingType || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Billing Days:</label>
                <span>{invoice.billingDays || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Bed Count:</label>
                <span>{invoice.bedCount || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Bed Rate:</label>
                <span>₹{invoice.bedRate || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Weight in Kg:</label>
                <span>{invoice.weightInKg || '-'} kg</span>
              </div>
              <div className="invoice-view-field">
                <label>Kg Rate:</label>
                <span>₹{invoice.kgRate || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Lumpsum Amount:</label>
                <span>₹{invoice.lumpsumAmount || '-'}</span>
              </div>
            </div>
          </div>

          <div className="invoice-view-section">
            <h3 className="invoice-view-section-title">Tax & Amount Details</h3>
            <div className="invoice-view-grid">
              <div className="invoice-view-field">
                <label>Taxable Value:</label>
                <span>₹{invoice.taxableValue || '0'}</span>
              </div>
              <div className="invoice-view-field">
                <label>IGST:</label>
                <span>₹{invoice.igst || '0'}</span>
              </div>
              <div className="invoice-view-field">
                <label>CGST:</label>
                <span>₹{invoice.cgst || '0'}</span>
              </div>
              <div className="invoice-view-field">
                <label>SGST:</label>
                <span>₹{invoice.sgst || '0'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Round Off:</label>
                <span>₹{invoice.roundOff || '0'}</span>
              </div>
              <div className="invoice-view-field invoice-view-field--highlight">
                <label>Invoice Value:</label>
                <span>₹{invoice.invoiceValue || '0'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Total Paid Amount:</label>
                <span>₹{invoice.totalPaidAmount || '0'}</span>
              </div>
              <div className="invoice-view-field invoice-view-field--highlight">
                <label>Balance Amount:</label>
                <span>₹{invoice.balanceAmount || '0'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Back
          </button>
          {(invoice.invoiceStatus === 'Generated' || invoice.invoiceStatus === 'Partially Paid' || invoice.invoiceStatus === 'Paid') && (
            <>
              <button type="button" className="btn btn--info" onClick={handleViewReceipts}>
                View Receipts
              </button>
              <button type="button" className="btn btn--success" onClick={handleAddReceipt}>
                Add Receipt
              </button>
            </>
          )}
          <button type="button" className="btn btn--primary" onClick={() => onPrint(invoice)}>
            Print / Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceManagementPage;

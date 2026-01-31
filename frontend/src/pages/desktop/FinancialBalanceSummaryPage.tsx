import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  getFinBalances,
  createFinBalance,
  updateFinBalance,
  deleteFinBalance,
  previewBulkUpload,
  executeBulkUpload,
  FinBalanceResponse,
  CreateFinBalanceRequest,
  UpdateFinBalanceRequest,
  BulkUploadPreviewResponse,
} from '../../services/finBalanceService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import './financialBalanceSummaryPage.css';
import '../desktop/dashboardPage.css';

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
  companyId: string;
  companyName: string;
}

interface PreviewRecord {
  finBalanceId?: string;
  companyCode: string;
  companyName: string;
  hcfCode: string;
  hcfName: string;
  openingBalance: number;
  notes?: string | null;
  action: 'insert' | 'update';
}

const FinancialBalanceSummaryPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [balances, setBalances] = useState<FinBalanceResponse[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [hcfs, setHcfs] = useState<HCF[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingBalance, setEditingBalance] = useState<FinBalanceResponse | null>(null);
  const [previewData, setPreviewData] = useState<BulkUploadPreviewResponse | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateFinBalanceRequest>({
    companyId: '',
    hcfId: '',
    openingBalance: 0,
    notes: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (companyFilter) {
      loadBalances(companyFilter);
    } else {
      loadBalances();
    }
  }, [companyFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load companies
      const companiesData = await companyService.getAllCompanies(true);
      setCompanies(
        companiesData.map((c: CompanyResponse) => ({
          id: c.id,
          companyCode: c.companyCode,
          companyName: c.companyName,
          status: c.status,
        }))
      );

      // Load HCFs
      const hcfsData = await hcfService.getAllHcfs(undefined, false);
      setHcfs(
        hcfsData.map((h: HcfResponse) => ({
          id: h.id,
          hcfCode: h.hcfCode,
          hcfName: h.hcfName,
          companyId: h.companyId,
          companyName: companiesData.find((c: CompanyResponse) => c.id === h.companyId)?.companyName || '',
        }))
      );

      // Load balances
      await loadBalances();
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async (companyId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getFinBalances(companyId);
      setBalances(Array.isArray(response) ? response : []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading balances:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Failed to load balances';
      setError(errorMessage);
      setBalances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const preview = await previewBulkUpload(file);
      setPreviewData(preview);
      setShowPreviewModal(true);
    } catch (err: any) {
      console.error('Error previewing upload:', err);
      setError(err.message || 'Failed to preview Excel file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExecuteBulkUpload = async () => {
    if (!previewData) return;

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const result = await executeBulkUpload(previewData);
      const totalProcessed = result.created.length + result.updated.length;
      setSuccessMessage(`Successfully processed ${totalProcessed} records (${result.created.length} created, ${result.updated.length} updated)`);
      setShowPreviewModal(false);
      setPreviewData(null);
      await loadBalances(companyFilter || undefined);
    } catch (err: any) {
      console.error('Error executing bulk upload:', err);
      setError(err.message || 'Failed to execute bulk upload');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      companyId: '',
      hcfId: '',
      openingBalance: 0,
      notes: null,
    });
    setShowCreateModal(true);
  };

  const handleEdit = (balance: FinBalanceResponse) => {
    setEditingBalance(balance);
    setFormData({
      companyId: balance.companyId,
      hcfId: balance.hcfId,
      openingBalance: balance.openingBalance,
      notes: balance.notes,
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this financial balance record?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteFinBalance(id);
      setSuccessMessage('Financial balance deleted successfully');
      await loadBalances(companyFilter || undefined);
    } catch (err: any) {
      console.error('Error deleting balance:', err);
      setError(err.message || 'Failed to delete financial balance');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      await createFinBalance(formData);
      setSuccessMessage('Financial balance created successfully');
      setShowCreateModal(false);
      setFormData({
        companyId: '',
        hcfId: '',
        openingBalance: 0,
        notes: null,
      });
      await loadBalances(companyFilter || undefined);
    } catch (err: any) {
      console.error('Error creating balance:', err);
      setError(err.message || 'Failed to create financial balance');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUpdate = async () => {
    if (!editingBalance) return;

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const updateData: UpdateFinBalanceRequest = {
        openingBalance: formData.openingBalance,
        notes: formData.notes,
      };

      await updateFinBalance(editingBalance.finBalanceId, updateData);
      setSuccessMessage('Financial balance updated successfully (current balance reset to opening balance)');
      setShowEditModal(false);
      setEditingBalance(null);
      await loadBalances(companyFilter || undefined);
    } catch (err: any) {
      console.error('Error updating balance:', err);
      setError(err.message || 'Failed to update financial balance');
    } finally {
      setLoading(false);
    }
  };

  const filteredBalances = balances.filter((balance) => {
    const matchesSearch =
      balance.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      balance.companyCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      balance.hcfCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      balance.hcfName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCompany = !companyFilter || balance.companyId === companyFilter;

    return matchesSearch && matchesCompany;
  });

  // Get available HCFs for selected company
  const availableHcfs = formData.companyId
    ? hcfs.filter(h => h.companyId === formData.companyId)
    : [];

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
            <span className="breadcrumb">/ Finance / Financial Balance Summary</span>
          </div>
        </header>

        <div className="invoice-management-page">
          <div className="invoice-management-header">
            <h1 className="invoice-management-title">Financial Balance Summary</h1>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="alert alert-error" style={{ margin: '16px', padding: '12px', background: '#fee', color: '#c33', borderRadius: '4px' }}>
              {error}
              <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
          )}
          {successMessage && (
            <div className="alert alert-success" style={{ margin: '16px', padding: '12px', background: '#efe', color: '#3c3', borderRadius: '4px' }}>
              {successMessage}
              <button onClick={() => setSuccessMessage(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
          )}

          {/* Action Bar */}
          <div className="invoice-management-actions">
            <div className="invoice-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="invoice-search-input"
                placeholder="Search by company, HCF code, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="status-filter-select"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="">All Companies</option>
              {companies
                .filter((c) => c.status === 'Active')
                .map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.companyName}
                  </option>
                ))}
            </select>
            <label
              className="export-btn"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload Excel
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
            <button className="add-invoice-btn" onClick={handleCreate} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Balance
            </button>
          </div>

          {/* Balances Table */}
          <div className="invoice-table-container">
            {loading && balances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading balances...</div>
            ) : filteredBalances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                {balances.length === 0
                  ? 'No financial balance records found'
                  : 'No records match your search criteria'}
              </div>
            ) : (
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>HCF Code</th>
                    <th>HCF Name</th>
                    <th>Opening Balance</th>
                    <th>Current Balance</th>
                    <th>Is Manual</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((balance) => (
                    <tr key={balance.finBalanceId}>
                      <td>{balance.companyName || '-'}</td>
                      <td>{balance.hcfCode || '-'}</td>
                      <td>{balance.hcfName || '-'}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(balance.openingBalance).toFixed(2)}</td>
                      <td style={{ fontWeight: 600, color: balance.currentBalance < 0 ? '#dc2626' : '#059669' }}>
                        ₹{Number(balance.currentBalance).toFixed(2)}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: balance.isManual ? '#dbeafe' : '#f3f4f6',
                            color: balance.isManual ? '#1e40af' : '#6b7280',
                          }}
                        >
                          {balance.isManual ? 'Manual' : 'Auto'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEdit(balance)}
                            style={{
                              padding: '6px 12px',
                              background: '#3b82f6',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 500,
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(balance.finBalanceId)}
                            style={{
                              padding: '6px 12px',
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 500,
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Create Modal */}
          {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Add Financial Balance</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                  Company <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value, hcfId: '' })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Select Company</option>
                  {companies
                    .filter((c) => c.status === 'Active')
                    .map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.companyName}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                  HCF <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formData.hcfId}
                  onChange={(e) => setFormData({ ...formData, hcfId: e.target.value })}
                  required
                  disabled={!formData.companyId}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: !formData.companyId ? '#f1f5f9' : '#fff',
                  }}
                >
                  <option value="">{formData.companyId ? 'Select HCF' : 'Select Company first'}</option>
                  {availableHcfs.map((hcf) => (
                    <option key={hcf.id} value={hcf.id}>
                      {hcf.hcfCode} - {hcf.hcfName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                  Opening Balance <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCreate}
                disabled={loading || !formData.companyId || !formData.hcfId || formData.openingBalance < 0}
                style={{
                  padding: '10px 20px',
                  background: loading || !formData.companyId || !formData.hcfId || formData.openingBalance < 0 ? '#cbd5e1' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading || !formData.companyId || !formData.hcfId || formData.openingBalance < 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

          {/* Edit Modal */}
          {showEditModal && editingBalance && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Edit Financial Balance</h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '12px', background: '#fef3c7', borderRadius: '6px', fontSize: '13px', color: '#92400e' }}>
                <strong>Note:</strong> Updating opening balance will reset current balance to the new opening balance value.
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#64748b' }}>
                  Company
                </label>
                <input
                  type="text"
                  value={editingBalance.companyName || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: '#f1f5f9',
                    color: '#64748b',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#64748b' }}>
                  HCF
                </label>
                <input
                  type="text"
                  value={`${editingBalance.hcfCode || ''} - ${editingBalance.hcfName || ''}`}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: '#f1f5f9',
                    color: '#64748b',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                  Opening Balance <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                  Current Balance (Read-only)
                </label>
                <input
                  type="text"
                  value={`₹${Number(editingBalance.currentBalance).toFixed(2)}`}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: '#f1f5f9',
                    color: '#64748b',
                  }}
                />
                <p style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                  Will be reset to opening balance after update
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitUpdate}
                disabled={loading || formData.openingBalance < 0}
                style={{
                  padding: '10px 20px',
                  background: loading || formData.openingBalance < 0 ? '#cbd5e1' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading || formData.openingBalance < 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

          {/* Preview Modal */}
          {showPreviewModal && previewData && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>Preview Bulk Upload</h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ padding: '12px', background: '#dbeafe', borderRadius: '6px', flex: '1', minWidth: '150px' }}>
                  <div style={{ fontSize: '12px', color: '#1e40af', marginBottom: '4px' }}>New Records</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e40af' }}>{previewData.inserts.length}</div>
                </div>
                <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '6px', flex: '1', minWidth: '150px' }}>
                  <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px' }}>Updates</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#92400e' }}>{previewData.updates.length}</div>
                </div>
                <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '6px', flex: '1', minWidth: '150px' }}>
                  <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>Errors</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#991b1b' }}>
                    {previewData.errors.length + previewData.parseErrors.length}
                  </div>
                </div>
              </div>

              {previewData.parseErrors.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#991b1b' }}>
                    Parse Errors
                  </h3>
                  <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #fee2e2', borderRadius: '6px', padding: '12px' }}>
                    {previewData.parseErrors.map((error, idx) => (
                      <div key={idx} style={{ marginBottom: '8px', fontSize: '13px', color: '#991b1b' }}>
                        <strong>Row {error.row}:</strong> {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewData.errors.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#991b1b' }}>
                    Validation Errors
                  </h3>
                  <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #fee2e2', borderRadius: '6px', padding: '12px' }}>
                    {previewData.errors.map((error, idx) => (
                      <div key={idx} style={{ marginBottom: '8px', fontSize: '13px', color: '#991b1b' }}>
                        <strong>Row {error.row}:</strong> {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(previewData.inserts.length > 0 || previewData.updates.length > 0) && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Records to Process</h3>
                  <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Action</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Company</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>HCF Code</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>HCF Name</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Opening Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.inserts.map((record, idx) => {
                          const company = companies.find(c => c.id === record.companyId);
                          const hcf = hcfs.find(h => h.id === record.hcfId);
                          return (
                            <tr key={`insert-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px' }}>
                                <span style={{ padding: '4px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                  INSERT
                                </span>
                              </td>
                              <td style={{ padding: '10px' }}>{company?.companyName || '-'}</td>
                              <td style={{ padding: '10px' }}>{hcf?.hcfCode || '-'}</td>
                              <td style={{ padding: '10px' }}>{hcf?.hcfName || '-'}</td>
                              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>₹{Number(record.openingBalance).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                        {previewData.updates.map((update, idx) => {
                          const company = companies.find(c => c.id === update.data.companyId);
                          const hcf = hcfs.find(h => h.id === update.data.hcfId);
                          return (
                            <tr key={`update-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px' }}>
                                <span style={{ padding: '4px 8px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                  UPDATE
                                </span>
                              </td>
                              <td style={{ padding: '10px' }}>{company?.companyName || '-'}</td>
                              <td style={{ padding: '10px' }}>{hcf?.hcfCode || '-'}</td>
                              <td style={{ padding: '10px' }}>{hcf?.hcfName || '-'}</td>
                              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>₹{Number(update.data.openingBalance).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkUpload}
                disabled={loading || (previewData.inserts.length === 0 && previewData.updates.length === 0)}
                style={{
                  padding: '10px 20px',
                  background: loading || (previewData.inserts.length === 0 && previewData.updates.length === 0) ? '#cbd5e1' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading || (previewData.inserts.length === 0 && previewData.updates.length === 0) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {loading ? 'Processing...' : 'Save All'}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
};

export default FinancialBalanceSummaryPage;

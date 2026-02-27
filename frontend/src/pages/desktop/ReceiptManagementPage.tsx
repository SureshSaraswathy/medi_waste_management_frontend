import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import {
  getPaymentsWithoutReceipt,
  createManualReceipt,
  PaymentResponse,
  CreateManualReceiptRequest,
} from '../../services/paymentService';
import { companyService, CompanyResponse } from '../../services/companyService';
import PageHeader from '../../components/layout/PageHeader';
import './receiptManagementPage.css';
import '../desktop/dashboardPage.css';

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

interface AdvancedFilters {
  paymentId: string;
  companyId: string;
  paymentDate: string;
  paymentMode: string;
  status: string;
}

const ReceiptManagementPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    paymentId: '',
    companyId: '',
    paymentDate: '',
    paymentMode: '',
    status: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Form state for manual receipt creation
  const [formData, setFormData] = useState<CreateManualReceiptRequest>({
    paymentId: '',
    receiptDate: '',
    notes: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Only load payments after companies are loaded
    if (companies.length > 0) {
      if (companyFilter) {
        loadPayments(companyFilter);
      } else {
        loadPayments();
      }
    }
  }, [companyFilter, companies.length]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors

      // Load companies first
      const companiesData = await companyService.getAllCompanies(true);
      const mappedCompanies = companiesData.map((c: CompanyResponse) => ({
        id: c.id,
        companyCode: c.companyCode,
        companyName: c.companyName,
        status: c.status,
      }));
      setCompanies(mappedCompanies);
      console.log('Loaded companies:', mappedCompanies.length);

      // Load payments without receipts after companies are loaded
      await loadPayments();
      
      // Clear error on successful load
      setError(null);
    } catch (err: any) {
      console.error('Error loading data:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (companyId?: string) => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const response = await getPaymentsWithoutReceipt(companyId);
      // apiRequest extracts the data property, so response is PaymentResponse[]
      const paymentsList = Array.isArray(response) ? response : [];
      setPayments(paymentsList);
      
      // Clear error on successful load
      setError(null);
      
      // Debug: Log company IDs from payments
      if (paymentsList.length > 0) {
        console.log('Payments loaded:', paymentsList.length);
        console.log('Payment company IDs:', paymentsList.map(p => p.companyId));
        console.log('Available companies:', companies.map(c => ({ id: c.id, name: c.companyName })));
      }
    } catch (err: any) {
      console.error('Error loading payments:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Failed to load payments';
      setError(errorMessage);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceipt = (payment: PaymentResponse) => {
    setSelectedPayment(payment);
    setFormData({
      paymentId: payment.paymentId,
      receiptDate: payment.paymentDate, // Default to payment date
      notes: null,
    });
    setShowCreateModal(true);
  };

  const handleSubmitReceipt = async () => {
    if (!formData.paymentId) {
      setError('Please select a payment');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const result = await createManualReceipt(formData);

      setSuccessMessage(`Receipt ${result.data.receipt.receiptNumber} created successfully!`);
      setShowCreateModal(false);
      setSelectedPayment(null);
      setFormData({
        paymentId: '',
        receiptDate: '',
        notes: null,
      });

      // Reload payments
      await loadPayments(companyFilter || undefined);
    } catch (err: any) {
      console.error('Error creating receipt:', err);
      setError(err.message || 'Failed to create receipt');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    // Search query filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      payment.paymentId.toLowerCase().includes(searchLower) ||
      payment.receiptNumber?.toLowerCase().includes(searchLower) ||
      companies.find((c) => c.id === payment.companyId)?.companyName.toLowerCase().includes(searchLower);

    // Company filter
    const matchesCompany = !companyFilter || payment.companyId === companyFilter;

    // Advanced filters
    const matchesPaymentId = !advancedFilters.paymentId || payment.paymentId.toLowerCase().includes(advancedFilters.paymentId.toLowerCase());
    const matchesAdvancedCompany = !advancedFilters.companyId || payment.companyId === advancedFilters.companyId;
    const matchesPaymentDate = !advancedFilters.paymentDate || payment.paymentDate === advancedFilters.paymentDate;
    const matchesPaymentMode = !advancedFilters.paymentMode || payment.paymentMode === advancedFilters.paymentMode;
    const matchesStatus = !advancedFilters.status || payment.status === advancedFilters.status;

    return matchesSearch && matchesCompany && matchesPaymentId && matchesAdvancedCompany && matchesPaymentDate && matchesPaymentMode && matchesStatus;
  });

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
        <PageHeader 
          title="Receipt Management"
          subtitle="Generate and manage payment receipts"
        />

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Receipt Management</h1>
              <p className="ra-page-subtitle">Generate and manage payment receipts</p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="ra-search-actions">
            <div className="ra-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="ra-search-input"
                placeholder="Search by payment ID, receipt number, company..."
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
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="ra-alert ra-alert--error">
              <span>{error}</span>
              <button className="ra-alert-close" onClick={() => setError(null)}>×</button>
            </div>
          )}
          {successMessage && (
            <div className="ra-alert ra-alert--success">
              <span>{successMessage}</span>
              <button className="ra-alert-close" onClick={() => setSuccessMessage(null)}>×</button>
            </div>
          )}

          {/* Table Container */}
          <div className="route-assignment-table-container">
            {loading && payments.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Loading payments...
              </div>
            ) : filteredPayments.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style={{ fontSize: '14px', margin: 0 }}>
                  {payments.length === 0
                    ? 'No payments found without receipts'
                    : 'No payments match your search criteria'}
                </p>
              </div>
            ) : (
              <table className="route-assignment-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Company</th>
                    <th>Payment Date</th>
                    <th>Payment Amount</th>
                    <th>Payment Mode</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => {
                    const company = companies.find((c) => c.id === payment.companyId);
                    return (
                      <tr key={payment.paymentId}>
                        <td className="payment-id-cell">{payment.paymentId.substring(0, 8)}...</td>
                        <td>{company?.companyName || payment.companyId || '-'}</td>
                        <td>{payment.paymentDate}</td>
                        <td style={{ fontWeight: 600 }}>₹{Number(payment.paymentAmount).toFixed(2)}</td>
                        <td>{payment.paymentMode}</td>
                        <td>
                          <span className={`receipt-status-badge receipt-status-badge--${payment.status.toLowerCase()}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn action-btn--create"
                            onClick={() => handleCreateReceipt(payment)}
                            type="button"
                          >
                            Create Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="route-assignment-pagination-info">
            Showing {filteredPayments.length} of {payments.length} items
          </div>

          {/* Advanced Filters Modal */}
          {showAdvancedFilters && (
            <AdvancedFiltersModal
              advancedFilters={advancedFilters}
              companies={companies.filter(c => c.status === 'Active')}
              onClose={() => setShowAdvancedFilters(false)}
              onClear={() => {
                setAdvancedFilters({
                  paymentId: '',
                  companyId: '',
                  paymentDate: '',
                  paymentMode: '',
                  status: '',
                });
                setShowAdvancedFilters(false);
              }}
              onApply={(payload) => {
                setAdvancedFilters(payload);
                setShowAdvancedFilters(false);
              }}
            />
          )}

          {/* Create Receipt Modal */}
          {showCreateModal && selectedPayment && (
            <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                  <h2>Create Receipt</h2>
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
                  <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '6px' }}>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Payment ID:</span>
                        <span style={{ fontWeight: 600 }}>{selectedPayment.paymentId.substring(0, 8)}...</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Payment Amount:</span>
                        <span style={{ fontWeight: 600 }}>₹{Number(selectedPayment.paymentAmount).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Payment Date:</span>
                        <span>{selectedPayment.paymentDate}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Payment Mode:</span>
                        <span>{selectedPayment.paymentMode}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                      Receipt Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.receiptDate || ''}
                      onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    <p style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                      Defaults to payment date if not specified
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
                    onClick={handleSubmitReceipt}
                    disabled={loading || !formData.receiptDate}
                    style={{
                      padding: '10px 20px',
                      background: loading || !formData.receiptDate ? '#cbd5e1' : '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: loading || !formData.receiptDate ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {loading ? 'Creating...' : 'Create Receipt'}
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

// Advanced Filters Modal Component
interface AdvancedFiltersModalProps {
  advancedFilters: AdvancedFilters;
  companies: Company[];
  onClose: () => void;
  onClear: () => void;
  onApply: (payload: AdvancedFilters) => void;
}

const AdvancedFiltersModal = ({
  advancedFilters,
  companies,
  onClose,
  onClear,
  onApply,
}: AdvancedFiltersModalProps) => {
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
              <div className="ra-filter-subtitle">Filter payments by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
            <div className="ra-filter-field">
              <label>Payment ID</label>
              <input
                type="text"
                value={draft.paymentId}
                onChange={(e) => setDraft({ ...draft, paymentId: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter payment ID"
              />
            </div>

            <div className="ra-filter-field">
              <label>Company</label>
              <select
                value={draft.companyId}
                onChange={(e) => setDraft({ ...draft, companyId: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div className="ra-filter-field">
              <label>Payment Date</label>
              <input
                type="date"
                value={draft.paymentDate}
                onChange={(e) => setDraft({ ...draft, paymentDate: e.target.value })}
                className="ra-filter-input"
              />
            </div>

            <div className="ra-filter-field">
              <label>Payment Mode</label>
              <select
                value={draft.paymentMode}
                onChange={(e) => setDraft({ ...draft, paymentMode: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Online Payment">Online Payment</option>
              </select>
            </div>

            <div className="ra-filter-field">
              <label>Status</label>
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Status</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="ra-filter-modal-footer">
          <button
            type="button"
            className="ra-link-btn"
            onClick={() => {
              setDraft({ paymentId: '', companyId: '', paymentDate: '', paymentMode: '', status: '' });
              onClear();
            }}
          >
            Clear Filters
          </button>
          <button
            type="button"
            className="ra-btn ra-btn--primary ra-btn--sm"
            onClick={() => onApply(draft)}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptManagementPage;

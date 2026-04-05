import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { getAllPayments, PaymentResponse } from '../../services/paymentService';
import { downloadReceiptPdf } from '../../utils/receiptPdfDownload';
import { notifySuccess, notifyError } from '../../utils/notify';
import NotificationBell from '../../components/NotificationBell';
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

/** Short human-readable ref when no bank/UPI reference exists (avoids raw UUID in the grid). */
function formatPaymentRef(paymentId: string): string {
  const compact = paymentId.replace(/-/g, '');
  return `PAY-${compact.slice(-8).toUpperCase()}`;
}

function paymentDisplayPrimary(p: PaymentResponse): string {
  const ref = p.referenceNumber?.trim();
  return ref || formatPaymentRef(p.paymentId);
}

const ReceiptManagementPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
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
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPaymentId, setDownloadingPaymentId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

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
      setError(null);
      const response = await getAllPayments(companyId ? { companyId } : undefined);
      const list = Array.isArray(response) ? response : [];
      setPayments(list.filter((p) => p.receiptId));
      setError(null);
    } catch (err: any) {
      console.error('Error loading payments:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Failed to load payments';
      setError(errorMessage);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceiptPdf = async (payment: PaymentResponse) => {
    if (!payment.receiptId) return;
    setDownloadingPaymentId(payment.paymentId);
    setError(null);
    try {
      const company = companies.find((c) => c.id === payment.companyId);
      await downloadReceiptPdf(payment.receiptId, { companyId: payment.companyId, fallbackCompanyName: company?.companyName });
      notifySuccess('Receipt PDF downloaded (same template as Invoice Management).');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to download receipt PDF';
      setError(msg);
      notifyError(msg);
    } finally {
      setDownloadingPaymentId(null);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    // Search query filter
    const searchLower = searchQuery.toLowerCase();
    const shortRef = formatPaymentRef(payment.paymentId).toLowerCase();
    const matchesSearch = !searchQuery ||
      payment.paymentId.toLowerCase().includes(searchLower) ||
      shortRef.includes(searchLower) ||
      payment.referenceNumber?.toLowerCase().includes(searchLower) ||
      payment.receiptNumber?.toLowerCase().includes(searchLower) ||
      companies.find((c) => c.id === payment.companyId)?.companyName.toLowerCase().includes(searchLower);

    // Company filter
    const matchesCompany = !companyFilter || payment.companyId === companyFilter;

    // Advanced filters
    const pid = advancedFilters.paymentId.toLowerCase();
    const matchesPaymentId =
      !advancedFilters.paymentId ||
      payment.paymentId.toLowerCase().includes(pid) ||
      shortRef.includes(pid) ||
      (payment.referenceNumber?.toLowerCase().includes(pid) ?? false);
    const matchesAdvancedCompany = !advancedFilters.companyId || payment.companyId === advancedFilters.companyId;
    const matchesPaymentDate = !advancedFilters.paymentDate || payment.paymentDate === advancedFilters.paymentDate;
    const matchesPaymentMode = !advancedFilters.paymentMode || payment.paymentMode === advancedFilters.paymentMode;
    const matchesStatus = !advancedFilters.status || payment.status === advancedFilters.status;

    return matchesSearch && matchesCompany && matchesPaymentId && matchesAdvancedCompany && matchesPaymentDate && matchesPaymentMode && matchesStatus;
  });

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
          title="Receipt Management"
          subtitle="Download payment receipt PDFs (Invoice Management template)"
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
              <p className="ra-page-subtitle">Download payment receipt PDFs</p>
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
                placeholder="Search by reference, PAY- code, receipt #, company..."
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
                    ? 'No payments with receipts found'
                    : 'No payments match your search criteria'}
                </p>
              </div>
            ) : (
              <table className="route-assignment-table">
                <thead>
                  <tr>
                    <th>Payment reference</th>
                    <th>Receipt #</th>
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
                        <td className="payment-ref-cell" title={payment.paymentId}>
                          <span className="payment-ref-primary">{paymentDisplayPrimary(payment)}</span>
                          {payment.referenceNumber?.trim() ? (
                            <span className="payment-ref-secondary">{formatPaymentRef(payment.paymentId)}</span>
                          ) : null}
                        </td>
                        <td style={{ fontWeight: 600 }}>{payment.receiptNumber || '—'}</td>
                        <td>{company?.companyName || payment.companyId || '-'}</td>
                        <td>{payment.paymentDate}</td>
                        <td style={{ fontWeight: 600 }}>₹{Number(payment.paymentAmount).toFixed(2)}</td>
                        <td>{payment.paymentMode}</td>
                        <td>
                          <span className={`receipt-status-badge receipt-status-badge--${payment.status.toLowerCase()}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="receipt-mgmt-actions">
                          <div className="receipt-action-icons">
                            <button
                              type="button"
                              className="receipt-icon-btn receipt-icon-btn--pdf"
                              disabled={!payment.receiptId || downloadingPaymentId === payment.paymentId}
                              title={
                                downloadingPaymentId === payment.paymentId
                                  ? 'Downloading…'
                                  : 'Download receipt PDF'
                              }
                              aria-label={
                                downloadingPaymentId === payment.paymentId
                                  ? 'Downloading receipt PDF'
                                  : 'Download receipt PDF'
                              }
                              onClick={() => void handleDownloadReceiptPdf(payment)}
                            >
                              {downloadingPaymentId === payment.paymentId ? (
                                <svg
                                  className="receipt-icon-btn__spinner"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  aria-hidden="true"
                                >
                                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                </svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                              )}
                            </button>
                          </div>
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
              <label>Reference / ID</label>
              <input
                type="text"
                value={draft.paymentId}
                onChange={(e) => setDraft({ ...draft, paymentId: e.target.value })}
                className="ra-filter-input"
                placeholder="Reference, PAY- code, or UUID"
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

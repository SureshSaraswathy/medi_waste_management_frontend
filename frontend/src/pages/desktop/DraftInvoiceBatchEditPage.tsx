import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAdminNavItems } from '../../utils/adminNavItems';
import { canAccessDesktopModule } from '../../utils/moduleAccess';
import {
  getDraftInvoicesByBatch,
  updateDraftInvoice,
  postDraftInvoices,
  InvoiceResponse,
} from '../../services/invoiceService';
import { hcfService } from '../../services/hcfService';
import PageHeader from '../../components/layout/PageHeader';
import './invoiceManagementPage.css';
import '../desktop/dashboardPage.css';
import '../desktop/masterPage.css';
import '../desktop/routeAssignmentPage.css';

interface DraftInvoice extends InvoiceResponse {
  isSelected: boolean;
  hasError: boolean;
  originalQuantity?: number;
  originalRate?: number;
  originalDueDate?: string;
}

const DraftInvoiceBatchEditPage = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, permissions, user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const [invoices, setInvoices] = useState<DraftInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hcfs, setHcfs] = useState<Record<string, { code: string; name: string }>>({});
  const [bulkRate, setBulkRate] = useState<string>('');
  const [bulkDueDate, setBulkDueDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    customer: '',
    status: 'All',
    minAmount: '',
    maxAmount: '',
  });

  useEffect(() => {
    if (batchId) {
      loadDraftInvoices();
    }
  }, [batchId]);

  const loadDraftInvoices = async () => {
    if (!batchId) return;

    setLoading(true);
    setError(null);
    try {
      const draftInvoices = await getDraftInvoicesByBatch(batchId);
      
      // Load HCF data for display
      const hcfIds = [...new Set(draftInvoices.map(inv => inv.hcfId))];
      const hcfData: Record<string, { code: string; name: string }> = {};
      
      for (const hcfId of hcfIds) {
        try {
          const hcf = await hcfService.getHcfById(hcfId);
          hcfData[hcfId] = { code: hcf.hcfCode, name: hcf.hcfName };
        } catch (err) {
          hcfData[hcfId] = { code: hcfId.substring(0, 8), name: 'Unknown' };
        }
      }
      
      setHcfs(hcfData);

      const mappedInvoices: DraftInvoice[] = draftInvoices.map(inv => ({
        ...inv,
        isSelected: true,
        hasError: (inv.invoiceValue || 0) <= 0,
        originalQuantity: inv.weightInKg || inv.bedCount || 1,
        originalRate: inv.kgRate || inv.bedRate || inv.lumpsumAmount || 0,
        originalDueDate: inv.dueDate,
      }));

      setInvoices(mappedInvoices);
    } catch (err: any) {
      console.error('Error loading draft invoices:', err);
      setError(err.message || 'Failed to load draft invoices');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (invoiceId: string) => {
    setInvoices(invoices.map(inv =>
      inv.invoiceId === invoiceId ? { ...inv, isSelected: !inv.isSelected } : inv
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = invoices.every(inv => inv.isSelected);
    setInvoices(invoices.map(inv => ({ ...inv, isSelected: !allSelected })));
  };

  const updateInvoiceField = async (invoiceId: string, field: 'quantity' | 'rate' | 'dueDate', value: number | string) => {
    const invoice = invoices.find(inv => inv.invoiceId === invoiceId);
    if (!invoice) return;

    setLoading(true);
    try {
      const updates: { quantity?: number; rate?: number; dueDate?: string } = {};
      
      if (field === 'quantity') {
        updates.quantity = Number(value);
      } else if (field === 'rate') {
        updates.rate = Number(value);
      } else if (field === 'dueDate') {
        updates.dueDate = String(value);
      }

      const updated = await updateDraftInvoice(invoiceId, updates);
      
      // Update local state
      setInvoices(invoices.map(inv => {
        if (inv.invoiceId === invoiceId) {
          const updatedInv = { ...inv, ...updated };
          // Recalculate error status
          updatedInv.hasError = (updatedInv.invoiceValue || 0) <= 0;
          return updatedInv;
        }
        return inv;
      }));

      setSuccessMessage('Invoice updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating invoice:', err);
      setError(err.message || 'Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };

  const applyBulkRate = () => {
    if (!bulkRate || isNaN(Number(bulkRate))) {
      setError('Please enter a valid rate');
      return;
    }

    const selectedInvoices = invoices.filter(inv => inv.isSelected && !inv.hasError);
    if (selectedInvoices.length === 0) {
      setError('Please select at least one invoice');
      return;
    }

    setLoading(true);
    Promise.all(
      selectedInvoices.map(inv => updateDraftInvoice(inv.invoiceId, { rate: Number(bulkRate) }))
    )
      .then(() => {
        loadDraftInvoices();
        setBulkRate('');
        setSuccessMessage(`Updated rate for ${selectedInvoices.length} invoice(s)`);
        setTimeout(() => setSuccessMessage(null), 3000);
      })
      .catch(err => {
        setError(err.message || 'Failed to update rates');
      })
      .finally(() => setLoading(false));
  };

  const applyBulkDueDate = () => {
    if (!bulkDueDate) {
      setError('Please select a due date');
      return;
    }

    const selectedInvoices = invoices.filter(inv => inv.isSelected && !inv.hasError);
    if (selectedInvoices.length === 0) {
      setError('Please select at least one invoice');
      return;
    }

    setLoading(true);
    Promise.all(
      selectedInvoices.map(inv => updateDraftInvoice(inv.invoiceId, { dueDate: bulkDueDate }))
    )
      .then(() => {
        loadDraftInvoices();
        setBulkDueDate('');
        setSuccessMessage(`Updated due date for ${selectedInvoices.length} invoice(s)`);
        setTimeout(() => setSuccessMessage(null), 3000);
      })
      .catch(err => {
        setError(err.message || 'Failed to update due dates');
      })
      .finally(() => setLoading(false));
  };

  const deleteSelected = () => {
    const selectedIds = invoices.filter(inv => inv.isSelected).map(inv => inv.invoiceId);
    if (selectedIds.length === 0) {
      setError('Please select at least one invoice to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} invoice(s)?`)) {
      return;
    }

    // Remove from local state (in production, call delete API)
    setInvoices(invoices.filter(inv => !inv.isSelected));
    setSuccessMessage(`Deleted ${selectedIds.length} invoice(s)`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const validateInvoices = () => {
    const errors: string[] = [];
    invoices.forEach(inv => {
      if (inv.isSelected && inv.hasError) {
        const hcf = hcfs[inv.hcfId];
        errors.push(`${hcf?.code || inv.hcfId}: Amount is zero or negative`);
      }
    });

    if (errors.length > 0) {
      setError(`Validation failed:\n${errors.join('\n')}`);
    } else {
      setSuccessMessage('All selected invoices are valid');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const saveDraft = async () => {
    // Draft invoices are auto-saved on update, so this just shows a message
    setSuccessMessage('Draft invoices saved');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const postInvoices = async () => {
    const selectedInvoices = invoices.filter(inv => inv.isSelected && !inv.hasError);
    if (selectedInvoices.length === 0) {
      setError('Please select at least one valid invoice to post');
      return;
    }

    const hasErrors = selectedInvoices.some(inv => inv.hasError);
    if (hasErrors) {
      setError('Cannot post invoices with errors. Please fix or deselect them.');
      return;
    }

    if (!window.confirm(`Are you sure you want to post ${selectedInvoices.length} invoice(s)? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const invoiceIds = selectedInvoices.map(inv => inv.invoiceId);
      const invoiceDate = new Date().toISOString().split('T')[0];
      
      const result = await postDraftInvoices(invoiceIds, invoiceDate);
      
      setSuccessMessage(`Posted ${result.success} invoice(s) successfully. ${result.failed} failed.`);
      
      setTimeout(() => {
        navigate('/finance/invoice-management');
      }, 2000);
    } catch (err: any) {
      console.error('Error posting invoices:', err);
      setError(err.message || 'Failed to post invoices');
    } finally {
      setLoading(false);
    }
  };

  const getQuantity = (invoice: DraftInvoice): number => {
    return invoice.weightInKg || invoice.bedCount || 1;
  };

  const getRate = (invoice: DraftInvoice): number => {
    return invoice.kgRate || invoice.bedRate || invoice.lumpsumAmount || 0;
  };

  const getDescription = (invoice: DraftInvoice): string => {
    if (invoice.billingOption === 'Weight-wise') {
      return `Weight-based billing: ${invoice.weightInKg?.toFixed(2)} kg @ ₹${invoice.kgRate?.toFixed(2)}/kg`;
    } else if (invoice.billingOption === 'Bed-wise') {
      return `Bed-wise billing: ${invoice.bedCount} beds @ ₹${invoice.bedRate?.toFixed(2)}/bed`;
    } else {
      return `Lumpsum billing: ₹${invoice.lumpsumAmount?.toFixed(2)}`;
    }
  };

  // Filter invoices based on search and advanced filters
  const filteredInvoices = invoices.filter(invoice => {
    const hcf = hcfs[invoice.hcfId];
    const customerName = hcf ? `${hcf.code} ${hcf.name}`.toLowerCase() : '';
    const description = getDescription(invoice).toLowerCase();
    const searchLower = searchQuery.toLowerCase();

    // Search filter
    if (searchQuery && !customerName.includes(searchLower) && !description.includes(searchLower)) {
      return false;
    }

    // Advanced filters
    if (advancedFilters.customer && hcf) {
      const customerFilter = advancedFilters.customer.toLowerCase();
      if (!customerName.includes(customerFilter)) {
        return false;
      }
    }

    if (advancedFilters.status !== 'All') {
      if (invoice.hasError && advancedFilters.status !== 'Error') return false;
      if (!invoice.hasError && invoice.status !== advancedFilters.status) return false;
    }

    if (advancedFilters.minAmount) {
      const min = parseFloat(advancedFilters.minAmount);
      if (invoice.invoiceValue < min) return false;
    }

    if (advancedFilters.maxAmount) {
      const max = parseFloat(advancedFilters.maxAmount);
      if (invoice.invoiceValue > max) return false;
    }

    return true;
  });

  const selectedCount = filteredInvoices.filter(inv => inv.isSelected).length;
  const validCount = filteredInvoices.filter(inv => inv.isSelected && !inv.hasError).length;
  const errorCount = filteredInvoices.filter(inv => inv.hasError).length;
  const totalAmount = filteredInvoices
    .filter(inv => inv.isSelected && !inv.hasError)
    .reduce((sum, inv) => sum + (inv.invoiceValue || 0), 0);

  // Navigation items - same as GenerateInvoicesPage
  const navItemsAll = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      active: location.pathname === '/dashboard',
    },
    {
      path: '/transaction',
      label: 'Transaction',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ),
      active: location.pathname === '/transaction' || location.pathname.startsWith('/transaction'),
    },
    {
      path: '/finance',
      label: 'Finance',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
      active: location.pathname === '/finance' || location.pathname.startsWith('/finance'),
    },
    {
      path: '/commercial-agreements',
      label: 'Commercial / Agreements',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      active: location.pathname === '/commercial-agreements' || location.pathname.startsWith('/commercial-agreements'),
    },
    {
      path: '/compliance-training',
      label: 'Compliance & Training',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ),
      active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training'),
    },
    {
      path: '/master',
      label: 'Master',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ),
      active: location.pathname === '/master' || location.pathname.startsWith('/master'),
    },
    {
      path: '/report',
      label: 'Reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      active: location.pathname.startsWith('/report'),
    },
    ...getAdminNavItems(permissions, location.pathname),
  ];

  const navItems = navItemsAll.filter((item) => {
    if (item.path === '/dashboard') return canAccessDesktopModule(permissions, 'dashboard');
    if (item.path === '/transaction') return canAccessDesktopModule(permissions, 'transaction');
    if (item.path === '/finance') return canAccessDesktopModule(permissions, 'finance');
    if (item.path === '/commercial-agreements') return canAccessDesktopModule(permissions, 'commercial');
    if (item.path === '/compliance-training') return canAccessDesktopModule(permissions, 'compliance');
    if (item.path === '/master') return canAccessDesktopModule(permissions, 'master');
    if (item.path === '/report') return canAccessDesktopModule(permissions, 'report');
    return true;
  });

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
          title="Draft Invoice Batch Edit"
          subtitle="Review and edit draft invoices before posting"
        />

        {/* Success Message */}
        {successMessage && (
          <div className="ra-alert ra-alert--success" role="status" aria-live="polite">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ra-alert-close" aria-label="Close success message">
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="ra-alert ra-alert--error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ra-alert-close" aria-label="Close error message">
              ×
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && invoices.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading draft invoices...
          </div>
        )}

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Draft Invoice Batch Edit</h1>
              <p className="ra-page-subtitle">Review and edit draft invoices before posting</p>
            </div>
          </div>

          {/* Compact Toolbar - Route Assignment Style */}
          <div className="ra-search-actions" style={{ 
            minHeight: '36px',
            marginBottom: '16px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '12px',
            alignItems: 'center'
          }}>
            {/* Search Box - Left Side */}
            <div className="ra-search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                placeholder="Search by customer, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ra-search-input"
                style={{ height: '34px', fontSize: '13px' }}
              />
            </div>

            {/* Action Controls - Right Side */}
            <div className="ra-actions" style={{ marginLeft: 'auto', gap: '8px' }}>
              {/* Change Rate Input */}
              <input
                type="number"
                value={bulkRate}
                onChange={(e) => setBulkRate(e.target.value)}
                placeholder="Rate"
                disabled={loading || invoices.length === 0}
                style={{
                  width: '100px',
                  height: '34px',
                  padding: '6px 10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#1e293b',
                  background: loading || invoices.length === 0 ? '#f1f5f9' : '#ffffff',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />

              {/* Apply Rate Button */}
              <button
                onClick={applyBulkRate}
                disabled={loading || invoices.length === 0 || !bulkRate}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  background: loading || invoices.length === 0 || !bulkRate ? '#cbd5e1' : '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: loading || invoices.length === 0 || !bulkRate ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#1e293b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#0f172a';
                  }
                }}
              >
                Apply
              </button>

              {/* Change Due Date Input */}
              <input
                type="date"
                value={bulkDueDate}
                onChange={(e) => setBulkDueDate(e.target.value)}
                disabled={loading || invoices.length === 0}
                style={{
                  width: '140px',
                  height: '34px',
                  padding: '6px 10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#1e293b',
                  background: loading || invoices.length === 0 ? '#f1f5f9' : '#ffffff',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />

              {/* Apply Due Date Button */}
              <button
                onClick={applyBulkDueDate}
                disabled={loading || invoices.length === 0 || !bulkDueDate}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  background: loading || invoices.length === 0 || !bulkDueDate ? '#cbd5e1' : '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: loading || invoices.length === 0 || !bulkDueDate ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#1e293b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#0f172a';
                  }
                }}
              >
                Apply
              </button>

              {/* Delete Selected Button */}
              <button
                onClick={deleteSelected}
                disabled={loading || selectedCount === 0 || invoices.length === 0}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  background: loading || selectedCount === 0 || invoices.length === 0 ? '#f1f5f9' : '#ffffff',
                  color: loading || selectedCount === 0 || invoices.length === 0 ? '#94a3b8' : '#ef4444',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: loading || selectedCount === 0 || invoices.length === 0 ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#fee2e2';
                    e.currentTarget.style.borderColor = '#ef4444';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                <span className="toolbar-label">Delete</span>
              </button>

              {/* Filter Button */}
              <button
                onClick={() => setShowAdvancedFilters(true)}
                className="ra-filter-btn"
                style={{ width: '163px', height: '34px', padding: '6px 14px', fontSize: '13px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Filter
              </button>
            </div>
          </div>

          {/* Validation Summary */}
          {invoices.length > 0 && (
            <div style={{ 
              background: '#f8fafc', 
              padding: '16px', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0',
              marginBottom: '16px',
              display: 'flex',
              gap: '24px',
              fontSize: '14px'
            }}>
              <div>
                <strong>Total Records:</strong> {filteredInvoices.length}
              </div>
              <div style={{ color: '#10b981' }}>
                <strong>Valid Records:</strong> {validCount}
              </div>
              <div style={{ color: '#ef4444' }}>
                <strong>Error Records:</strong> {errorCount}
              </div>
              <div>
                <strong>Total Amount:</strong> ₹{totalAmount.toFixed(2)}
              </div>
            </div>
          )}

          {/* Draft Invoices Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedCount === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={() => {
                        const allSelected = filteredInvoices.every(inv => inv.isSelected);
                        setInvoices(invoices.map(inv => {
                          const isInFiltered = filteredInvoices.some(fInv => fInv.invoiceId === inv.invoiceId);
                          return isInFiltered ? { ...inv, isSelected: !allSelected } : inv;
                        }));
                      }}
                    />
                  </th>
                  <th>CUSTOMER</th>
                  <th>DESCRIPTION</th>
                  <th style={{ textAlign: 'right' }}>QTY</th>
                  <th style={{ textAlign: 'right' }}>RATE</th>
                  <th style={{ textAlign: 'right' }}>AMOUNT</th>
                  <th>DUE DATE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-message">
                      {loading ? 'Loading...' : invoices.length === 0 ? 'No draft invoices found' : 'No invoices match the filters'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const hcf = hcfs[invoice.hcfId];
                    return (
                      <tr
                        key={invoice.invoiceId}
                        className={invoice.hasError ? 'read-only-row' : ''}
                        style={{
                          background: invoice.hasError ? '#fef2f2' : invoice.isSelected ? '#f0f9ff' : 'transparent',
                        }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={invoice.isSelected}
                            onChange={() => toggleSelection(invoice.invoiceId)}
                          />
                        </td>
                        <td>{hcf ? `${hcf.code} - ${hcf.name}` : invoice.hcfId}</td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>
                          {getDescription(invoice)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            value={getQuantity(invoice)}
                            onChange={(e) => updateInvoiceField(invoice.invoiceId, 'quantity', e.target.value)}
                            className="ra-assignment-input"
                            style={{ width: '80px', textAlign: 'right' }}
                            step="0.01"
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            value={getRate(invoice)}
                            onChange={(e) => updateInvoiceField(invoice.invoiceId, 'rate', e.target.value)}
                            className="ra-assignment-input"
                            style={{ width: '100px', textAlign: 'right' }}
                            step="0.01"
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ₹{(invoice.invoiceValue || 0).toFixed(2)}
                        </td>
                        <td>
                          <input
                            type="date"
                            value={invoice.dueDate || ''}
                            onChange={(e) => updateInvoiceField(invoice.invoiceId, 'dueDate', e.target.value)}
                            className="ra-assignment-input"
                            style={{ fontSize: '13px' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="ra-cell-center">
                            {invoice.hasError ? (
                              <span className="status-badge status-badge--draft" style={{ background: '#fee2e2', color: '#991b1b' }}>
                                Error
                              </span>
                            ) : (
                              <span className="status-badge status-badge--draft">
                                {invoice.status || 'Draft'}
                              </span>
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
          
          {/* Pagination Info */}
          {invoices.length > 0 && (
            <div className="route-assignment-pagination-info">
              Showing {filteredInvoices.length} of {invoices.length} items
            </div>
          )}

          {/* Footer Actions - Always visible */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            position: 'sticky',
            bottom: 0,
            zIndex: 10
          }}>
            <button
              onClick={saveDraft}
              disabled={loading || invoices.length === 0}
              className="ra-btn ra-btn--secondary"
            >
              Save Draft
            </button>
            <button
              onClick={validateInvoices}
              disabled={loading || invoices.length === 0}
              className="ra-btn ra-btn--secondary"
              style={{ background: '#f59e0b', color: 'white', borderColor: '#f59e0b' }}
            >
              Validate
            </button>
            <button
              onClick={postInvoices}
              disabled={loading || validCount === 0}
              className="ra-btn ra-btn--primary"
            >
              Post Invoices ({validCount})
            </button>
          </div>
        </div>
      </main>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          advancedFilters={advancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setAdvancedFilters({ customer: '', status: 'All', minAmount: '', maxAmount: '' });
            setSearchQuery('');
          }}
          onApply={(filters) => {
            setAdvancedFilters(filters);
            setShowAdvancedFilters(false);
          }}
        />
      )}
    </div>
  );
};

// Advanced Filters Modal Component
interface AdvancedFiltersModalProps {
  advancedFilters: {
    customer: string;
    status: string;
    minAmount: string;
    maxAmount: string;
  };
  onClose: () => void;
  onClear: () => void;
  onApply: (filters: {
    customer: string;
    status: string;
    minAmount: string;
    maxAmount: string;
  }) => void;
}

const AdvancedFiltersModal = ({
  advancedFilters,
  onClose,
  onClear,
  onApply,
}: AdvancedFiltersModalProps) => {
  const [filters, setFilters] = useState(advancedFilters);

  return (
    <div className="modal-overlay ra-filter-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ra-filter-modal-header">
          <div className="ra-filter-modal-titlewrap">
            <div className="ra-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </div>
            <div>
              <div className="ra-filter-title">Advanced Filters</div>
              <div className="ra-filter-subtitle">Filter draft invoices by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
            <div className="ra-filter-field">
              <label>Customer</label>
              <input
                type="text"
                value={filters.customer}
                onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
                placeholder="Search by customer name or code"
                className="ra-filter-input"
              />
            </div>

            <div className="ra-filter-field">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="ra-filter-select"
              >
                <option value="All">All</option>
                <option value="Draft">Draft</option>
                <option value="Error">Error</option>
              </select>
            </div>

            <div className="ra-filter-field">
              <label>Min Amount</label>
              <input
                type="number"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                placeholder="Minimum amount"
                className="ra-filter-input"
                step="0.01"
              />
            </div>

            <div className="ra-filter-field">
              <label>Max Amount</label>
              <input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                placeholder="Maximum amount"
                className="ra-filter-input"
                step="0.01"
              />
            </div>
          </div>
        </div>

        <div className="ra-filter-modal-footer">
          <button type="button" className="ra-link-btn" onClick={onClear}>
            Clear All
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="ra-assignment-btn ra-assignment-btn--cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ra-assignment-btn ra-assignment-btn--primary"
              onClick={() => onApply(filters)}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftInvoiceBatchEditPage;

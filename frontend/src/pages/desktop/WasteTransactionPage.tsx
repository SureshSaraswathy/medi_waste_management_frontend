import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { wasteTransactionService, WasteTransactionResponse, CreateWasteTransactionRequest, UpdateWasteTransactionRequest } from '../../services/wasteTransactionService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import './wasteTransactionPage.css';
import '../desktop/dashboardPage.css';

interface WasteTransaction {
  id: string;
  companyId: string;
  companyName: string;
  hcfId: string;
  hcfCode: string;
  hcfName: string;
  pickupDate: string;
  isNilPickup: boolean;
  yellowBagCount: number;
  redBagCount: number;
  whiteBagCount: number;
  yellowWeightKg?: number | null;
  redWeightKg?: number | null;
  whiteWeightKg?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  segregationQuality?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | null;
  status: 'Draft' | 'Submitted' | 'Verified';
  notes?: string | null;
  createdOn: string;
}

const WasteTransactionPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<WasteTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Master data
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [hcfs, setHcfs] = useState<HcfResponse[]>([]);
  const [filteredHcfs, setFilteredHcfs] = useState<HcfResponse[]>([]);
  const [transactions, setTransactions] = useState<WasteTransaction[]>([]);

  // Form state
  const [formData, setFormData] = useState<CreateWasteTransactionRequest & { editingId?: string }>({
    companyId: '',
    hcfId: '',
    pickupDate: new Date().toISOString().split('T')[0],
    isNilPickup: false,
    yellowBagCount: 0,
    redBagCount: 0,
    whiteBagCount: 0,
    yellowWeightKg: null,
    redWeightKg: null,
    whiteWeightKg: null,
    latitude: null,
    longitude: null,
    segregationQuality: null,
    notes: null,
  });

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const data = await companyService.getAllCompanies(undefined, true);
      setCompanies(data);
    } catch (err: any) {
      console.error('Failed to load companies:', err);
      setError('Failed to load companies');
    }
  }, []);

  // Load HCFs
  const loadHcfs = useCallback(async () => {
    try {
      const data = await hcfService.getAllHcfs(undefined, true);
      setHcfs(data);
    } catch (err: any) {
      console.error('Failed to load HCFs:', err);
      setError('Failed to load HCFs');
    }
  }, []);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Calculate date range for the selected date
      const startDate = selectedDate;
      const endDate = selectedDate;
      
      // Call API with filters
      const apiTransactions = await wasteTransactionService.getAllTransactions(
        undefined, // companyId
        undefined, // hcfId
        startDate,
        endDate,
        statusFilter !== 'all' ? statusFilter : undefined
      );
      
      const mappedTransactions: WasteTransaction[] = await Promise.all(
        apiTransactions.map(async (apiTransaction: WasteTransactionResponse) => {
          const company = companies.find(c => c.id === apiTransaction.companyId);
          let hcfName = '';
          let hcfCode = '';
          try {
            const hcf = await hcfService.getHcfById(apiTransaction.hcfId);
            hcfName = hcf.hcfName;
            hcfCode = hcf.hcfCode;
          } catch (err) {
            console.error('Error loading HCF:', err);
          }

          return {
            id: apiTransaction.id,
            companyId: apiTransaction.companyId,
            companyName: company?.companyName || 'Unknown',
            hcfId: apiTransaction.hcfId,
            hcfCode,
            hcfName,
            pickupDate: apiTransaction.pickupDate,
            isNilPickup: apiTransaction.isNilPickup,
            yellowBagCount: apiTransaction.yellowBagCount,
            redBagCount: apiTransaction.redBagCount,
            whiteBagCount: apiTransaction.whiteBagCount,
            yellowWeightKg: apiTransaction.yellowWeightKg,
            redWeightKg: apiTransaction.redWeightKg,
            whiteWeightKg: apiTransaction.whiteWeightKg,
            latitude: apiTransaction.latitude,
            longitude: apiTransaction.longitude,
            segregationQuality: apiTransaction.segregationQuality,
            status: apiTransaction.status,
            notes: apiTransaction.notes,
            createdOn: apiTransaction.createdOn,
          };
        })
      );
      setTransactions(mappedTransactions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(errorMessage);
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter, companies]);

  // Filter HCFs by company
  useEffect(() => {
    if (formData.companyId) {
      const filtered = hcfs.filter(hcf => hcf.companyId === formData.companyId);
      setFilteredHcfs(filtered);
      if (formData.hcfId && !filtered.find(h => h.id === formData.hcfId)) {
        setFormData(prev => ({ ...prev, hcfId: '' }));
      }
    } else {
      setFilteredHcfs([]);
      setFormData(prev => ({ ...prev, hcfId: '' }));
    }
  }, [formData.companyId, hcfs]);

  // Load data on mount
  useEffect(() => {
    loadCompanies();
    loadHcfs();
  }, [loadCompanies, loadHcfs]);

  // Load transactions when dependencies are ready
  useEffect(() => {
    if (companies.length > 0) {
      loadTransactions();
    }
  }, [selectedDate, statusFilter, companies, loadTransactions]);

  // Get GPS location
  const getGPSLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setGpsLoading(false);
        setSuccessMessage('GPS location captured successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      },
      (error) => {
        setGpsError(`Failed to get GPS location: ${error.message}`);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyId || !formData.hcfId || !formData.pickupDate) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.isNilPickup) {
      if (formData.yellowBagCount === 0 && formData.redBagCount === 0 && formData.whiteBagCount === 0) {
        setError('Please enter at least one bag count or select NIL pickup');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      if (formData.editingId) {
        // Update existing transaction - only send fields allowed in UpdateWasteTransactionDto
        // Helper function to safely convert to number or null
        const toNumberOrNull = (value: number | null | undefined): number | null => {
          if (value === null || value === undefined) return null;
          const num = Number(value);
          return isNaN(num) ? null : num;
        };

        const updateData: UpdateWasteTransactionRequest = {
          pickupDate: formData.pickupDate,
          isNilPickup: formData.isNilPickup,
          yellowBagCount: formData.yellowBagCount,
          redBagCount: formData.redBagCount,
          whiteBagCount: formData.whiteBagCount,
          yellowWeightKg: toNumberOrNull(formData.yellowWeightKg),
          redWeightKg: toNumberOrNull(formData.redWeightKg),
          whiteWeightKg: toNumberOrNull(formData.whiteWeightKg),
          latitude: toNumberOrNull(formData.latitude),
          longitude: toNumberOrNull(formData.longitude),
          segregationQuality: formData.segregationQuality,
          notes: formData.notes,
        };
        await wasteTransactionService.updateTransaction(formData.editingId, updateData);
        setSuccessMessage('Transaction updated successfully');
      } else {
        // Create new transaction - only send fields allowed in CreateWasteTransactionDto
        // Helper function to safely convert to number or null
        const toNumberOrNull = (value: number | null | undefined): number | null => {
          if (value === null || value === undefined) return null;
          const num = Number(value);
          return isNaN(num) ? null : num;
        };

        const createData: CreateWasteTransactionRequest = {
          companyId: formData.companyId,
          hcfId: formData.hcfId,
          pickupDate: formData.pickupDate,
          isNilPickup: formData.isNilPickup,
          yellowBagCount: formData.yellowBagCount,
          redBagCount: formData.redBagCount,
          whiteBagCount: formData.whiteBagCount,
          yellowWeightKg: toNumberOrNull(formData.yellowWeightKg),
          redWeightKg: toNumberOrNull(formData.redWeightKg),
          whiteWeightKg: toNumberOrNull(formData.whiteWeightKg),
          latitude: toNumberOrNull(formData.latitude),
          longitude: toNumberOrNull(formData.longitude),
          segregationQuality: formData.segregationQuality,
          notes: formData.notes,
        };
        await wasteTransactionService.createTransaction(createData);
        setSuccessMessage('Transaction created successfully');
      }

      await loadTransactions();
      setShowFormModal(false);
      resetForm();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save transaction';
      setError(errorMessage);
      console.error('Error saving transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (transactionId: string, action: 'submit' | 'verify') => {
    try {
      setLoading(true);
      setError(null);

      if (action === 'submit') {
        await wasteTransactionService.submitTransaction(transactionId);
        setSuccessMessage('Transaction submitted successfully');
      } else {
        await wasteTransactionService.verifyTransaction(transactionId);
        setSuccessMessage('Transaction verified successfully');
      }

      await loadTransactions();
      setShowDetailModal(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      setError(errorMessage);
      console.error('Error updating status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await wasteTransactionService.deleteTransaction(transactionId);
      setSuccessMessage('Transaction deleted successfully');
      await loadTransactions();
      setShowDetailModal(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(errorMessage);
      console.error('Error deleting transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      companyId: '',
      hcfId: '',
      pickupDate: new Date().toISOString().split('T')[0],
      isNilPickup: false,
      yellowBagCount: 0,
      redBagCount: 0,
      whiteBagCount: 0,
      yellowWeightKg: null,
      redWeightKg: null,
      whiteWeightKg: null,
      latitude: null,
      longitude: null,
      segregationQuality: null,
      notes: null,
    });
  };

  // Open form for editing
  const handleEdit = (transaction: WasteTransaction) => {
    if (transaction.status !== 'Draft') {
      setError('Only draft transactions can be edited');
      return;
    }
    // Only set fields that are allowed in the form (not response-only fields)
    setFormData({
      companyId: transaction.companyId,
      hcfId: transaction.hcfId,
      pickupDate: transaction.pickupDate.split('T')[0],
      isNilPickup: transaction.isNilPickup,
      yellowBagCount: transaction.yellowBagCount,
      redBagCount: transaction.redBagCount,
      whiteBagCount: transaction.whiteBagCount,
      yellowWeightKg: transaction.yellowWeightKg,
      redWeightKg: transaction.redWeightKg,
      whiteWeightKg: transaction.whiteWeightKg,
      latitude: transaction.latitude,
      longitude: transaction.longitude,
      segregationQuality: transaction.segregationQuality,
      notes: transaction.notes,
      editingId: transaction.id,
    });
    setShowFormModal(true);
  };

  // Open detail modal
  const handleViewDetails = (transaction: WasteTransaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  // Format date to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Filter transactions by search query (client-side filtering)
  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchQuery.trim()) {
      return true; // Show all if no search query
    }
    
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      transaction.companyName.toLowerCase().includes(query) ||
      transaction.hcfName.toLowerCase().includes(query) ||
      transaction.hcfCode.toLowerCase().includes(query);
    
    return matchesSearch;
  });

  const isFormEditable = !formData.editingId || transactions.find(t => t.id === formData.editingId)?.status === 'Draft';

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <span className="brand-name">MEDI-WASTE</span>
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
          <Link
            to="/profile"
            className={`sidebar-profile-btn ${location.pathname === '/profile' ? 'sidebar-profile-btn--active' : ''}`}
            title="My Profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Profile</span>
          </Link>
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
            <span className="breadcrumb">/ Transaction / Waste Transaction Data</span>
          </div>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#d4edda', 
            color: '#155724', 
            marginBottom: '16px', 
            borderRadius: '6px',
            border: '1px solid #c3e6cb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#155724',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 8px',
                lineHeight: '1'
              }}
              aria-label="Close success message"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fee', 
            color: '#c33', 
            marginBottom: '16px', 
            borderRadius: '6px',
            border: '1px solid #fcc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#c33',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 8px',
                lineHeight: '1'
              }}
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !transactions.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading transactions...
          </div>
        )}

        <div className="waste-transaction-page">
          <div className="waste-transaction-header">
            <div className="waste-transaction-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
                <line x1="8" y1="4" x2="8" y2="24"></line>
              </svg>
            </div>
            <h1 className="waste-transaction-title">Waste Transaction Data</h1>
          </div>

          {/* Search and Actions */}
          <div className="waste-transaction-search-actions">
            <div className="waste-transaction-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                placeholder="Search by company, HCF, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="waste-transaction-search-input"
              />
            </div>
            <div className="waste-transaction-actions">
              <button 
                className="waste-transaction-filter-btn" 
                onClick={() => setShowAdvancedFilter(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Advanced Filter
              </button>
              <button 
                className="waste-transaction-add-btn" 
                onClick={() => { resetForm(); setShowFormModal(true); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Transaction
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="waste-transaction-table-container">
            <table className="waste-transaction-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>COMPANY</th>
                  <th>HCF</th>
                  <th>NIL</th>
                  <th>YELLOW</th>
                  <th>RED</th>
                  <th>WHITE</th>
                  <th>TOTAL WEIGHT</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-message">
                      {loading ? 'Loading...' : 'No transactions found for the selected date'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const totalWeight = 
                      (Number(transaction.yellowWeightKg) || 0) +
                      (Number(transaction.redWeightKg) || 0) +
                      (Number(transaction.whiteWeightKg) || 0);

                    return (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.pickupDate)}</td>
                        <td>{transaction.companyName}</td>
                        <td>
                          <div className="wt-hcf-info">
                            <span className="wt-hcf-code">{transaction.hcfCode}</span>
                            <span className="wt-hcf-number">{transaction.id.slice(-3)}</span>
                          </div>
                        </td>
                        <td>
                          {transaction.isNilPickup ? (
                            <span className="wt-nil-badge">NIL</span>
                          ) : (
                            <span className="wt-yes-badge">Yes</span>
                          )}
                        </td>
                        <td>
                          {transaction.yellowBagCount > 0 ? (
                            <div className="wt-bag-info">
                              <span className="wt-color-circle wt-color-circle--yellow"></span>
                              <span className="wt-bag-text">
                                {transaction.yellowBagCount}
                                {transaction.yellowWeightKg && ` (${Number(transaction.yellowWeightKg).toFixed(2)}kg)`}
                              </span>
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          {transaction.redBagCount > 0 ? (
                            <div className="wt-bag-info">
                              <span className="wt-color-circle wt-color-circle--red"></span>
                              <span className="wt-bag-text">
                                {transaction.redBagCount}
                                {transaction.redWeightKg && ` (${Number(transaction.redWeightKg).toFixed(2)}kg)`}
                              </span>
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          {transaction.whiteBagCount > 0 ? (
                            <div className="wt-bag-info">
                              <span className="wt-color-circle wt-color-circle--white"></span>
                              <span className="wt-bag-text">{transaction.whiteBagCount}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td>{totalWeight > 0 ? `${Number(totalWeight).toFixed(2)} kg` : '-'}</td>
                        <td>
                          <span className={`wt-status-badge wt-status-badge--${transaction.status.toLowerCase()}`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td>
                          <div className="wt-action-buttons">
                            <button
                              className="wt-action-btn wt-action-btn--view"
                              onClick={() => handleViewDetails(transaction)}
                              title="View Details"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            {transaction.status === 'Draft' && (
                              <button
                                className="wt-action-btn wt-action-btn--edit"
                                onClick={() => handleEdit(transaction)}
                                title="Edit"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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
          <div className="waste-transaction-pagination-info">
            Showing {filteredTransactions.length} of {transactions.length} items
          </div>
        </div>
      </main>

      {/* Advanced Filter Modal */}
      {showAdvancedFilter && (
        <AdvancedFilterModal
          filterDate={filterDate}
          filterStatus={filterStatus}
          onFilterDateChange={setFilterDate}
          onFilterStatusChange={setFilterStatus}
          onClearFilters={() => {
            setFilterDate('');
            setFilterStatus('all');
          }}
          onApplyFilters={() => {
            if (filterDate) {
              setSelectedDate(filterDate);
            }
            setStatusFilter(filterStatus);
            setShowAdvancedFilter(false);
          }}
          onClose={() => setShowAdvancedFilter(false)}
        />
      )}

      {/* Form Modal */}
      {showFormModal && (
        <div className="wt-form-modal-overlay" onClick={() => { setShowFormModal(false); resetForm(); }}>
          <div className="wt-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wt-form-modal-header">
              <div className="wt-form-header-left">
                <div className="wt-form-header-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <h2 className="wt-form-modal-title">
                  {formData.editingId ? 'Edit Transaction' : 'Add Waste Transaction'}
                </h2>
              </div>
              <button className="wt-form-modal-close" onClick={() => { setShowFormModal(false); resetForm(); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form className="wt-form-modal-form" onSubmit={handleSubmit}>
              <div className="wt-form-body">
                {/* Top Row: Company, HCF, Pickup Date */}
                <div className="wt-form-row">
                  <div className="wt-form-group">
                    <label className="wt-form-label">Company <span className="wt-required">*</span></label>
                    <select
                      className="wt-form-select"
                      value={formData.companyId}
                      onChange={(e) => setFormData({ ...formData, companyId: e.target.value, hcfId: '' })}
                      required
                      disabled={!isFormEditable}
                    >
                      <option value="">Select Company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.companyCode} - {company.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="wt-form-group">
                    <label className="wt-form-label">HCF <span className="wt-required">*</span></label>
                    <select
                      className="wt-form-input wt-form-input--hcf"
                      value={formData.hcfId}
                      onChange={(e) => setFormData({ ...formData, hcfId: e.target.value })}
                      required
                      disabled={!formData.companyId || !isFormEditable}
                    >
                      <option value="">e.g., SET12</option>
                      {filteredHcfs.map((hcf) => (
                        <option key={hcf.id} value={hcf.id}>
                          {hcf.hcfCode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="wt-form-group">
                    <label className="wt-form-label">Pickup Date <span className="wt-required">*</span></label>
                    <input
                      type="date"
                      className="wt-form-input"
                      value={formData.pickupDate}
                      onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                      required
                      disabled={!isFormEditable}
                    />
                  </div>
                </div>

                {/* NIL Pickup Checkbox */}
                <div className="wt-form-row">
                  <div className="wt-form-group">
                    <label className="wt-form-checkbox-label">
                      <input
                        type="checkbox"
                        className="wt-form-checkbox"
                        checked={formData.isNilPickup}
                        onChange={(e) => setFormData({ ...formData, isNilPickup: e.target.checked })}
                        disabled={!isFormEditable}
                      />
                      <span>NIL Pickup</span>
                    </label>
                  </div>
                </div>

                {/* GPS Location Row */}
                <div className="wt-form-row">
                  <div className="wt-form-group">
                    <label className="wt-form-label">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="wt-form-input"
                      value={formData.latitude || ''}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="28.7041"
                      disabled={!isFormEditable}
                    />
                  </div>
                  <div className="wt-form-group">
                    <label className="wt-form-label">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="wt-form-input"
                      value={formData.longitude || ''}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="77.1025"
                      disabled={!isFormEditable}
                    />
                  </div>
                  <div className="wt-form-group">
                    <label className="wt-form-label">&nbsp;</label>
                    <button
                      type="button"
                      className="wt-form-gps-btn"
                      onClick={getGPSLocation}
                      disabled={!isFormEditable || gpsLoading}
                    >
                      {gpsLoading ? 'Capturing...' : 'Capture GPS'}
                    </button>
                    {gpsError && <div className="wt-form-error">{gpsError}</div>}
                  </div>
                </div>

                {/* Color-wise Bag Counts and Weights */}
                {!formData.isNilPickup && (
                  <>
                    <div className="wt-form-row">
                      {/* Yellow Bags */}
                      <div className="wt-color-group wt-color-group--yellow">
                        <h4 className="wt-color-title">Yellow Bags</h4>
                        <div className="wt-color-inputs">
                          <div className="wt-color-input-group">
                            <label className="wt-color-label">Count</label>
                            <input
                              type="number"
                              min="0"
                              className="wt-color-input"
                              value={formData.yellowBagCount || 0}
                              onChange={(e) => setFormData({ ...formData, yellowBagCount: parseInt(e.target.value) || 0 })}
                              disabled={!isFormEditable}
                            />
                          </div>
                          <div className="wt-color-input-group">
                            <label className="wt-color-label">Weight (kg)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="wt-color-input"
                              value={formData.yellowWeightKg || ''}
                              onChange={(e) => setFormData({ ...formData, yellowWeightKg: e.target.value ? parseFloat(e.target.value) : null })}
                              placeholder="0.00"
                              disabled={!isFormEditable}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Red Bags */}
                      <div className="wt-color-group wt-color-group--red">
                        <h4 className="wt-color-title">Red Bags</h4>
                        <div className="wt-color-inputs">
                          <div className="wt-color-input-group">
                            <label className="wt-color-label">Count</label>
                            <input
                              type="number"
                              min="0"
                              className="wt-color-input"
                              value={formData.redBagCount || 0}
                              onChange={(e) => setFormData({ ...formData, redBagCount: parseInt(e.target.value) || 0 })}
                              disabled={!isFormEditable}
                            />
                          </div>
                          <div className="wt-color-input-group">
                            <label className="wt-color-label">Weight (kg)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="wt-color-input"
                              value={formData.redWeightKg || ''}
                              onChange={(e) => setFormData({ ...formData, redWeightKg: e.target.value ? parseFloat(e.target.value) : null })}
                              placeholder="0.00"
                              disabled={!isFormEditable}
                            />
                          </div>
                        </div>
                      </div>

                      {/* White Bags */}
                      <div className="wt-color-group wt-color-group--white">
                        <h4 className="wt-color-title">White Bags</h4>
                        <div className="wt-color-inputs">
                          <div className="wt-color-input-group">
                            <label className="wt-color-label">Count</label>
                            <input
                              type="number"
                              min="0"
                              className="wt-color-input"
                              value={formData.whiteBagCount || 0}
                              onChange={(e) => setFormData({ ...formData, whiteBagCount: parseInt(e.target.value) || 0 })}
                              disabled={!isFormEditable}
                            />
                          </div>
                          <div className="wt-color-input-group">
                            <label className="wt-color-label">Weight (kg)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="wt-color-input"
                              value={formData.whiteWeightKg || ''}
                              onChange={(e) => setFormData({ ...formData, whiteWeightKg: e.target.value ? parseFloat(e.target.value) : null })}
                              placeholder="0.00"
                              disabled={!isFormEditable}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quality */}
                    <div className="wt-form-row">
                      <div className="wt-form-group">
                        <label className="wt-form-label">Quality</label>
                        <select
                          className="wt-form-select"
                          value={formData.segregationQuality || ''}
                          onChange={(e) => setFormData({ ...formData, segregationQuality: e.target.value as any || null })}
                          disabled={!isFormEditable}
                        >
                          <option value="">Select Quality</option>
                          <option value="Excellent">Excellent</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                          <option value="Poor">Poor</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Notes */}
                <div className="wt-form-row">
                  <div className="wt-form-group wt-form-group--full">
                    <label className="wt-form-label">Notes</label>
                    <textarea
                      className="wt-form-textarea"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                      placeholder="Additional notes or remarks..."
                      rows={3}
                      disabled={!isFormEditable}
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="wt-form-modal-footer">
                <button
                  type="button"
                  className="wt-form-btn wt-form-btn--cancel"
                  onClick={() => { setShowFormModal(false); resetForm(); }}
                  disabled={loading}
                >
                  Cancel
                </button>
                {isFormEditable && (
                  <button type="submit" className="wt-form-btn wt-form-btn--create" disabled={loading}>
                    {loading ? 'Saving...' : formData.editingId ? 'Update' : 'Create'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Transaction Details</h2>
              <button className="modal-close-btn" onClick={() => setShowDetailModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="transaction-details">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Pickup Date</label>
                    <span>{new Date(selectedTransaction.pickupDate).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Company</label>
                    <span>{selectedTransaction.companyName}</span>
                  </div>
                  <div className="detail-item">
                    <label>HCF</label>
                    <span>{selectedTransaction.hcfCode} - {selectedTransaction.hcfName}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <span className={`badge badge--${selectedTransaction.status.toLowerCase()}`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>NIL Pickup</label>
                    <span>{selectedTransaction.isNilPickup ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {!selectedTransaction.isNilPickup && (
                <>
                  <div className="detail-section">
                    <h3>Bag Counts & Weights</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Yellow Bags</label>
                        <span>
                          {selectedTransaction.yellowBagCount} bags
                          {selectedTransaction.yellowWeightKg && ` (${selectedTransaction.yellowWeightKg} kg)`}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Red Bags</label>
                        <span>
                          {selectedTransaction.redBagCount} bags
                          {selectedTransaction.redWeightKg && ` (${selectedTransaction.redWeightKg} kg)`}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>White Bags</label>
                        <span>
                          {selectedTransaction.whiteBagCount} bags
                          {selectedTransaction.whiteWeightKg && ` (${selectedTransaction.whiteWeightKg} kg)`}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Total Weight</label>
                        <span>
                          {Number(
                            (Number(selectedTransaction.yellowWeightKg) || 0) +
                            (Number(selectedTransaction.redWeightKg) || 0) +
                            (Number(selectedTransaction.whiteWeightKg) || 0)
                          ).toFixed(2)} kg
                        </span>
                      </div>
                      {selectedTransaction.segregationQuality && (
                        <div className="detail-item">
                          <label>Segregation Quality</label>
                          <span>{selectedTransaction.segregationQuality}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {(selectedTransaction.latitude || selectedTransaction.longitude) && (
                    <div className="detail-section">
                      <h3>GPS Location</h3>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Latitude</label>
                          <span>{selectedTransaction.latitude}</span>
                        </div>
                        <div className="detail-item">
                          <label>Longitude</label>
                          <span>{selectedTransaction.longitude}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedTransaction.notes && (
                <div className="detail-section">
                  <h3>Notes</h3>
                  <p>{selectedTransaction.notes}</p>
                </div>
              )}

              <div className="modal-footer">
                {selectedTransaction.status === 'Draft' && (
                  <>
                    <button
                      className="btn btn--secondary"
                      onClick={() => { handleEdit(selectedTransaction); setShowDetailModal(false); }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn--primary"
                      onClick={() => handleStatusChange(selectedTransaction.id, 'submit')}
                      disabled={loading}
                    >
                      Submit
                    </button>
                  </>
                )}
                {selectedTransaction.status === 'Submitted' && (
                  <button
                    className="btn btn--primary"
                    onClick={() => handleStatusChange(selectedTransaction.id, 'verify')}
                    disabled={loading}
                  >
                    Verify
                  </button>
                )}
                {selectedTransaction.status === 'Draft' && (
                  <button
                    className="btn btn--danger"
                    onClick={() => handleDelete(selectedTransaction.id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                )}
                <button
                  className="btn btn--secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Advanced Filter Modal Component
interface AdvancedFilterModalProps {
  filterDate: string;
  filterStatus: string;
  onFilterDateChange: (date: string) => void;
  onFilterStatusChange: (status: string) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
  onClose: () => void;
}

const AdvancedFilterModal = ({
  filterDate,
  filterStatus,
  onFilterDateChange,
  onFilterStatusChange,
  onClearFilters,
  onApplyFilters,
  onClose,
}: AdvancedFilterModalProps) => {
  const getDateInputValue = () => {
    if (!filterDate) return '';
    if (filterDate.includes('-') && filterDate.length === 10 && filterDate.split('-')[0].length === 4) {
      return filterDate;
    }
    if (filterDate.includes('-') && filterDate.split('-')[0].length === 2) {
      const parts = filterDate.split('-');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
    }
    return filterDate;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      onFilterDateChange(value);
    } else {
      onFilterDateChange('');
    }
  };

  return (
    <div className="wt-filter-modal-overlay" onClick={onClose}>
      <div className="wt-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wt-filter-modal-header">
          <div className="wt-filter-header-left">
            <div className="wt-filter-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </div>
            <h2 className="wt-filter-modal-title">Advanced Filter</h2>
          </div>
          <button className="wt-filter-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="wt-filter-modal-body">
          <div className="wt-filter-form-group">
            <label className="wt-filter-label">Pickup Date</label>
            <input
              type="date"
              value={getDateInputValue()}
              onChange={handleDateChange}
              className="wt-filter-date-input"
            />
          </div>

          <div className="wt-filter-form-group">
            <label className="wt-filter-label">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => onFilterStatusChange(e.target.value)}
              className="wt-filter-select"
            >
              <option value="all">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Verified">Verified</option>
            </select>
          </div>
        </div>

        <div className="wt-filter-modal-footer">
          <button type="button" className="wt-filter-btn-clear" onClick={onClearFilters}>
            Clear Filters
          </button>
          <button type="button" className="wt-filter-btn-apply" onClick={onApplyFilters}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default WasteTransactionPage;

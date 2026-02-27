import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { disposalRegisterService, DisposalRegisterResponse } from '../../services/disposalRegisterService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { categoryService, CategoryResponse } from '../../services/categoryService';
import PageHeader from '../../components/layout/PageHeader';
import './disposalRegisterPage.css';
import '../desktop/dashboardPage.css';

interface DisposalRegister {
  id: string;
  dispoRegNum: string;
  companyId: string;
  companyName: string;
  disposalDate: string;
  sourceTreatmentType: string;
  sourceBatchRef: string;
  wasteType: string;
  quantityKg: number;
  disposalMethod: string;
  disposalSite: string;
  transportMode: string;
  vehicleNo: string;
  manifestNo: string;
  complianceStatus: string;
  status: 'Active' | 'Inactive';
  createdBy?: string | null;
  createdOn: string;
  modifiedBy?: string | null;
  modifiedOn: string;
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

interface Category {
  id: string;
  categoryCode: string;
  categoryName: string;
  status: 'Active' | 'Inactive';
}

interface AdvancedFilters {
  dispoRegNum: string;
  companyName: string;
  disposalMethod: string;
  vehicleNo: string;
  complianceStatus: string;
}

const DisposalRegisterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingDisposal, setEditingDisposal] = useState<DisposalRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    dispoRegNum: '',
    companyName: '',
    disposalMethod: '',
    vehicleNo: '',
    complianceStatus: '',
  });

  // Master data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [disposals, setDisposals] = useState<DisposalRegister[]>([]);

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true);
      const mappedCompanies: Company[] = apiCompanies.map((c: CompanyResponse) => ({
        id: c.id,
        companyCode: c.companyCode,
        companyName: c.companyName,
        status: c.status,
      }));
      setCompanies(mappedCompanies);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const apiCategories = await categoryService.getAllCategories(undefined, true);
      const mappedCategories: Category[] = apiCategories.map((cat: CategoryResponse) => ({
        id: cat.id,
        categoryCode: cat.categoryCode,
        categoryName: cat.categoryName,
        status: cat.status,
      }));
      setCategories(mappedCategories);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, []);

  // Load disposals
  const loadDisposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiDisposals = await disposalRegisterService.getAllDisposalRegisters(
        undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );

      // Map backend response to frontend format with names
      const mappedDisposals: DisposalRegister[] = await Promise.all(
        apiDisposals.map(async (apiDisposal: DisposalRegisterResponse) => {
          const company = companies.find(c => c.id === apiDisposal.companyId);

          return {
            id: apiDisposal.id,
            dispoRegNum: apiDisposal.dispoRegNum,
            companyId: apiDisposal.companyId,
            companyName: company?.companyName || 'Unknown',
            disposalDate: apiDisposal.disposalDate,
            sourceTreatmentType: apiDisposal.sourceTreatmentType,
            sourceBatchRef: apiDisposal.sourceBatchRef,
            wasteType: apiDisposal.wasteType,
            quantityKg: apiDisposal.quantityKg,
            disposalMethod: apiDisposal.disposalMethod,
            disposalSite: apiDisposal.disposalSite,
            transportMode: apiDisposal.transportMode,
            vehicleNo: apiDisposal.vehicleNo,
            manifestNo: apiDisposal.manifestNo,
            complianceStatus: apiDisposal.complianceStatus,
            status: apiDisposal.status,
            createdBy: apiDisposal.createdBy,
            createdOn: apiDisposal.createdOn,
            modifiedBy: apiDisposal.modifiedBy,
            modifiedOn: apiDisposal.modifiedOn,
          };
        })
      );
      setDisposals(mappedDisposals);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load disposal registers';
      setError(errorMessage);
      console.error('Error loading disposal registers:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, companies]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
      await loadCategories();
    };
    initializeData();
  }, [loadCompanies, loadCategories]);

  // Load disposals when dependencies are ready
  useEffect(() => {
    if (companies.length > 0) {
      loadDisposals();
    }
  }, [companies, statusFilter, loadDisposals]);

  const filteredDisposals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const dispoRegNumQuery = advancedFilters.dispoRegNum.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    const disposalMethodQuery = advancedFilters.disposalMethod.trim().toLowerCase();
    const vehicleQuery = advancedFilters.vehicleNo.trim().toLowerCase();
    const complianceQuery = advancedFilters.complianceStatus.trim().toLowerCase();

    return disposals.filter((disposal) => {
      // Top search box: broad match across key fields
      const matchesSearch =
        !query ||
        disposal.dispoRegNum.toLowerCase().includes(query) ||
        disposal.companyName.toLowerCase().includes(query) ||
        disposal.disposalMethod.toLowerCase().includes(query) ||
        disposal.vehicleNo.toLowerCase().includes(query) ||
        disposal.manifestNo.toLowerCase().includes(query) ||
        disposal.wasteType.toLowerCase().includes(query);

      // Advanced filters
      const matchesDispoRegNum = !dispoRegNumQuery || disposal.dispoRegNum.toLowerCase().includes(dispoRegNumQuery);
      const matchesCompany = !companyQuery || disposal.companyName.toLowerCase().includes(companyQuery);
      const matchesDisposalMethod = !disposalMethodQuery || disposal.disposalMethod.toLowerCase().includes(disposalMethodQuery);
      const matchesVehicle = !vehicleQuery || disposal.vehicleNo.toLowerCase().includes(vehicleQuery);
      const matchesCompliance = !complianceQuery || disposal.complianceStatus.toLowerCase().includes(complianceQuery);
      const matchesStatus = statusFilter === 'all' || disposal.status === statusFilter;

      return matchesSearch && matchesDispoRegNum && matchesCompany && matchesDisposalMethod && matchesVehicle && matchesCompliance && matchesStatus;
    });
  }, [disposals, searchQuery, advancedFilters, statusFilter]);

  const handleAdd = () => {
    setEditingDisposal(null);
    setShowModal(true);
  };

  const handleEdit = (disposal: DisposalRegister) => {
    setEditingDisposal(disposal);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this disposal register?')) {
      try {
        setLoading(true);
        setError(null);
        await disposalRegisterService.deleteDisposalRegister(id);
        setSuccessMessage('Disposal register deleted successfully');
        await loadDisposals();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete disposal register';
        setError(errorMessage);
        console.error('Error deleting disposal register:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<DisposalRegister>) => {
    try {
      setLoading(true);
      setError(null);

      if (editingDisposal) {
        // Update existing disposal
        await disposalRegisterService.updateDisposalRegister(editingDisposal.id, {
          disposalDate: data.disposalDate,
          sourceTreatmentType: data.sourceTreatmentType,
          sourceBatchRef: data.sourceBatchRef,
          wasteType: data.wasteType,
          quantityKg: data.quantityKg,
          disposalMethod: data.disposalMethod,
          disposalSite: data.disposalSite,
          transportMode: data.transportMode,
          vehicleNo: data.vehicleNo,
          manifestNo: data.manifestNo,
          complianceStatus: data.complianceStatus,
          status: data.status,
        });
        setSuccessMessage('Disposal register updated successfully');
      } else {
        // Create new disposal
        const selectedCompany = companies.find(c => c.id === data.companyId);
        if (!selectedCompany) {
          setError('Please select a valid company');
          return;
        }

        await disposalRegisterService.createDisposalRegister({
          companyId: selectedCompany.id,
          disposalDate: data.disposalDate!,
          sourceTreatmentType: data.sourceTreatmentType!,
          sourceBatchRef: data.sourceBatchRef!,
          wasteType: data.wasteType!,
          quantityKg: data.quantityKg!,
          disposalMethod: data.disposalMethod!,
          disposalSite: data.disposalSite!,
          transportMode: data.transportMode!,
          vehicleNo: data.vehicleNo!,
          manifestNo: data.manifestNo!,
          complianceStatus: data.complianceStatus || 'Compliant',
          status: data.status || 'Active',
        });
        setSuccessMessage('Disposal register created successfully');
      }

      setShowModal(false);
      setEditingDisposal(null);
      await loadDisposals();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save disposal register';
      setError(errorMessage);
      console.error('Error saving disposal register:', err);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
        return 'status-badge--compliant';
      case 'non-compliant':
        return 'status-badge--non-compliant';
      case 'pending':
        return 'status-badge--pending';
      default:
        return '';
    }
  };

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

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <PageHeader 
          title="Disposal Register"
          subtitle="Manage waste disposal records"
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
        {loading && !disposals.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading disposal registers...
          </div>
        )}

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h18v18H3z"></path>
                <path d="M9 9h6v6H9z"></path>
                <path d="M3 12h18"></path>
                <path d="M12 3v18"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Disposal Register</h1>
              <p className="ra-page-subtitle">Manage and track waste disposal operations and compliance</p>
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
                placeholder="Search by register number, company, disposal method, vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ra-search-input"
              />
            </div>
            <div className="ra-actions">
              <button className="ra-filter-btn" onClick={() => setShowAdvancedFilters(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Advanced Filter
              </button>
              <button className="ra-add-btn" onClick={handleAdd}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Disposal
              </button>
            </div>
          </div>

          {/* Disposals Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>REG NUM</th>
                  <th>COMPANY</th>
                  <th>DATE</th>
                  <th>WASTE TYPE</th>
                  <th>QTY (KG)</th>
                  <th>DISPOSAL METHOD</th>
                  <th>DISPOSAL SITE</th>
                  <th>VEHICLE NO</th>
                  <th>MANIFEST NO</th>
                  <th>COMPLIANCE STATUS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDisposals.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="empty-message">
                      {loading ? 'Loading...' : 'No disposal registers found'}
                    </td>
                  </tr>
                ) : (
                  filteredDisposals.map((disposal) => {
                    // Format date to DD/MM/YYYY
                    const formatDate = (dateString: string) => {
                      const date = new Date(dateString);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };

                    return (
                      <tr key={disposal.id}>
                        <td>{disposal.dispoRegNum}</td>
                        <td>{disposal.companyName}</td>
                        <td>{formatDate(disposal.disposalDate)}</td>
                        <td>{disposal.wasteType}</td>
                        <td>{disposal.quantityKg.toFixed(2)}</td>
                        <td>{disposal.disposalMethod}</td>
                        <td>{disposal.disposalSite}</td>
                        <td>{disposal.vehicleNo}</td>
                        <td>{disposal.manifestNo}</td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge ${getComplianceBadgeClass(disposal.complianceStatus)}`}>
                              {disposal.complianceStatus}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge status-badge--${disposal.status.toLowerCase()}`}>
                              {disposal.status}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons ra-actions">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleEdit(disposal)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--edit"
                              onClick={() => handleEdit(disposal)}
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--delete"
                              onClick={() => handleDelete(disposal.id)}
                              title="Delete"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
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
            Showing {filteredDisposals.length} of {disposals.length} items
          </div>
        </div>
      </main>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          statusFilter={statusFilter}
          advancedFilters={advancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setAdvancedFilters({ dispoRegNum: '', companyName: '', disposalMethod: '', vehicleNo: '', complianceStatus: '' });
            setStatusFilter('all');
            setSearchQuery('');
          }}
          onApply={(payload) => {
            setStatusFilter(payload.statusFilter);
            setAdvancedFilters(payload.advancedFilters);
            setShowAdvancedFilters(false);
          }}
        />
      )}

      {/* Disposal Add/Edit Modal */}
      {showModal && (
        <DisposalFormModal
          disposal={editingDisposal}
          companies={companies.filter(c => c.status === 'Active')}
          categories={categories.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingDisposal(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Disposal Form Modal Component
interface DisposalFormModalProps {
  disposal: DisposalRegister | null;
  companies: Company[];
  categories: Category[];
  onClose: () => void;
  onSave: (data: Partial<DisposalRegister>) => void;
}

const DisposalFormModal = ({
  disposal,
  companies,
  categories,
  onClose,
  onSave,
}: DisposalFormModalProps) => {
  const [formData, setFormData] = useState<Partial<DisposalRegister>>(
    disposal || {
      companyId: '',
      disposalDate: new Date().toISOString().split('T')[0],
      sourceTreatmentType: '',
      sourceBatchRef: '',
      wasteType: '',
      quantityKg: 0,
      disposalMethod: '',
      disposalSite: '',
      transportMode: '',
      vehicleNo: '',
      manifestNo: '',
      complianceStatus: 'Compliant',
      status: 'Active',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
                <path d="M3 3h18v18H3z"></path>
                <path d="M9 9h6v6H9z"></path>
                <path d="M3 12h18"></path>
                <path d="M12 3v18"></path>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">
                {disposal ? 'Edit Disposal Register' : 'Add Disposal Register'}
              </h2>
              <p className="ra-assignment-modal-subtitle">
                {disposal ? 'Update disposal details' : 'Create a new disposal register.'}
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
            {/* Left Column */}
            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="company">
                  Company Name <span className="ra-required">*</span>
                </label>
                <select
                  id="company"
                  value={formData.companyId || ''}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  required
                  disabled={!!disposal}
                  className="ra-assignment-select"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="disposal-date">
                  Disposal Date <span className="ra-required">*</span>
                </label>
                <input
                  id="disposal-date"
                  type="date"
                  value={formData.disposalDate || ''}
                  onChange={(e) => setFormData({ ...formData, disposalDate: e.target.value })}
                  required
                  className="ra-assignment-input"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="source-treatment-type">
                  Source Treatment Type <span className="ra-required">*</span>
                </label>
                <input
                  id="source-treatment-type"
                  type="text"
                  value={formData.sourceTreatmentType || ''}
                  onChange={(e) => setFormData({ ...formData, sourceTreatmentType: e.target.value })}
                  required
                  className="ra-assignment-input"
                  placeholder="Enter source treatment type"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="source-batch-ref">
                  Source Batch Ref <span className="ra-required">*</span>
                </label>
                <input
                  id="source-batch-ref"
                  type="text"
                  value={formData.sourceBatchRef || ''}
                  onChange={(e) => setFormData({ ...formData, sourceBatchRef: e.target.value })}
                  required
                  className="ra-assignment-input"
                  placeholder="Enter source batch reference"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="waste-type">
                  Waste Type <span className="ra-required">*</span>
                </label>
                <select
                  id="waste-type"
                  value={formData.wasteType || ''}
                  onChange={(e) => setFormData({ ...formData, wasteType: e.target.value })}
                  required
                  className="ra-assignment-select"
                >
                  <option value="">Select Waste Type</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.categoryName}>
                      {category.categoryName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="quantity">
                  Quantity (kg) <span className="ra-required">*</span>
                </label>
                <input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={formData.quantityKg || 0}
                  onChange={(e) => setFormData({ ...formData, quantityKg: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="disposal-method">
                  Disposal Method <span className="ra-required">*</span>
                </label>
                <select
                  id="disposal-method"
                  value={formData.disposalMethod || ''}
                  onChange={(e) => setFormData({ ...formData, disposalMethod: e.target.value })}
                  required
                  className="ra-assignment-select"
                >
                  <option value="">Select Disposal Method</option>
                  <option value="Landfill">Landfill</option>
                  <option value="Incineration">Incineration</option>
                  <option value="Recycling">Recycling</option>
                  <option value="Composting">Composting</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="disposal-site">
                  Disposal Site <span className="ra-required">*</span>
                </label>
                <input
                  id="disposal-site"
                  type="text"
                  value={formData.disposalSite || ''}
                  onChange={(e) => setFormData({ ...formData, disposalSite: e.target.value })}
                  required
                  className="ra-assignment-input"
                  placeholder="Enter disposal site"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="transport-mode">
                  Transport Mode <span className="ra-required">*</span>
                </label>
                <select
                  id="transport-mode"
                  value={formData.transportMode || ''}
                  onChange={(e) => setFormData({ ...formData, transportMode: e.target.value })}
                  required
                  className="ra-assignment-select"
                >
                  <option value="">Select Transport Mode</option>
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Container">Container</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="vehicle-no">
                  Vehicle No <span className="ra-required">*</span>
                </label>
                <input
                  id="vehicle-no"
                  type="text"
                  value={formData.vehicleNo || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                  required
                  className="ra-assignment-input"
                  placeholder="Enter vehicle number"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="manifest-no">
                  Manifest No <span className="ra-required">*</span>
                </label>
                <input
                  id="manifest-no"
                  type="text"
                  value={formData.manifestNo || ''}
                  onChange={(e) => setFormData({ ...formData, manifestNo: e.target.value })}
                  required
                  className="ra-assignment-input"
                  placeholder="Enter manifest number"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="compliance-status">Compliance Status</label>
                <select
                  id="compliance-status"
                  value={formData.complianceStatus || 'Compliant'}
                  onChange={(e) => setFormData({ ...formData, complianceStatus: e.target.value })}
                  className="ra-assignment-select"
                >
                  <option value="Compliant">Compliant</option>
                  <option value="Non-Compliant">Non-Compliant</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status || 'Active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                  className="ra-assignment-select"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="ra-assignment-modal-footer">
            <button type="button" className="ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ra-assignment-btn ra-assignment-btn--primary">
              {disposal ? 'Update Disposal' : 'Create Disposal'}
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
              <div className="ra-filter-subtitle">Filter disposal registers by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
            <div className="ra-filter-field">
              <label>Register Number</label>
              <input
                type="text"
                value={draft.dispoRegNum}
                onChange={(e) => setDraft({ ...draft, dispoRegNum: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter register number"
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
              <label>Disposal Method</label>
              <input
                type="text"
                value={draft.disposalMethod}
                onChange={(e) => setDraft({ ...draft, disposalMethod: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter disposal method"
              />
            </div>

            <div className="ra-filter-field">
              <label>Vehicle No</label>
              <input
                type="text"
                value={draft.vehicleNo}
                onChange={(e) => setDraft({ ...draft, vehicleNo: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter vehicle number"
              />
            </div>

            <div className="ra-filter-field">
              <label>Compliance Status</label>
              <select
                value={draft.complianceStatus}
                onChange={(e) => setDraft({ ...draft, complianceStatus: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Status</option>
                <option value="Compliant">Compliant</option>
                <option value="Non-Compliant">Non-Compliant</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="ra-filter-field">
              <label>Status</label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="ra-filter-select"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="ra-filter-modal-footer">
          <button
            type="button"
            className="ra-link-btn"
            onClick={() => {
              setDraftStatus('all');
              setDraft({ dispoRegNum: '', companyName: '', disposalMethod: '', vehicleNo: '', complianceStatus: '' });
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

export default DisposalRegisterPage;

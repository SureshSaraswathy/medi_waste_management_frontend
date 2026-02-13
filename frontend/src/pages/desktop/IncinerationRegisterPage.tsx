import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { incinerationRegisterService, IncinerationRegisterResponse } from '../../services/incinerationRegisterService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { categoryService, CategoryResponse } from '../../services/categoryService';
import './incinerationRegisterPage.css';
import '../desktop/dashboardPage.css';

interface IncinerationRegister {
  id: string;
  inciRegNum: string;
  companyId: string;
  companyName: string;
  incinerationDate: string;
  equipmentId: string;
  secondaryChamberId: string;
  batchNo: string;
  wasteCategory: string;
  wasteQtyKg: number;
  startTime: string;
  endTime: string;
  avgTempC: number;
  retentionTimeSec: number;
  fuelUsedL: number;
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
  inciRegNum: string;
  companyName: string;
  equipmentId: string;
  batchNo: string;
  complianceStatus: string;
}

const IncinerationRegisterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingIncineration, setEditingIncineration] = useState<IncinerationRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    inciRegNum: '',
    companyName: '',
    equipmentId: '',
    batchNo: '',
    complianceStatus: '',
  });

  // Master data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [incinerations, setIncinerations] = useState<IncinerationRegister[]>([]);

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

  // Load incinerations
  const loadIncinerations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiIncinerations = await incinerationRegisterService.getAllIncinerationRegisters(
        undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );

      // Map backend response to frontend format with names
      const mappedIncinerations: IncinerationRegister[] = await Promise.all(
        apiIncinerations.map(async (apiIncineration: IncinerationRegisterResponse) => {
          const company = companies.find(c => c.id === apiIncineration.companyId);

          return {
            id: apiIncineration.id,
            inciRegNum: apiIncineration.inciRegNum,
            companyId: apiIncineration.companyId,
            companyName: company?.companyName || 'Unknown',
            incinerationDate: apiIncineration.incinerationDate,
            equipmentId: apiIncineration.equipmentId,
            secondaryChamberId: apiIncineration.secondaryChamberId,
            batchNo: apiIncineration.batchNo,
            wasteCategory: apiIncineration.wasteCategory,
            wasteQtyKg: apiIncineration.wasteQtyKg,
            startTime: apiIncineration.startTime,
            endTime: apiIncineration.endTime,
            avgTempC: apiIncineration.avgTempC,
            retentionTimeSec: apiIncineration.retentionTimeSec,
            fuelUsedL: apiIncineration.fuelUsedL,
            complianceStatus: apiIncineration.complianceStatus,
            status: apiIncineration.status,
            createdBy: apiIncineration.createdBy,
            createdOn: apiIncineration.createdOn,
            modifiedBy: apiIncineration.modifiedBy,
            modifiedOn: apiIncineration.modifiedOn,
          };
        })
      );
      setIncinerations(mappedIncinerations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load incineration registers';
      setError(errorMessage);
      console.error('Error loading incineration registers:', err);
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

  // Load incinerations when dependencies are ready
  useEffect(() => {
    if (companies.length > 0) {
      loadIncinerations();
    }
  }, [companies, statusFilter, loadIncinerations]);

  const filteredIncinerations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const inciRegNumQuery = advancedFilters.inciRegNum.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    const equipmentQuery = advancedFilters.equipmentId.trim().toLowerCase();
    const batchQuery = advancedFilters.batchNo.trim().toLowerCase();
    const complianceQuery = advancedFilters.complianceStatus.trim().toLowerCase();

    return incinerations.filter((incineration) => {
      // Top search box: broad match across key fields
      const matchesSearch =
        !query ||
        incineration.inciRegNum.toLowerCase().includes(query) ||
        incineration.companyName.toLowerCase().includes(query) ||
        incineration.equipmentId.toLowerCase().includes(query) ||
        incineration.batchNo.toLowerCase().includes(query) ||
        incineration.wasteCategory.toLowerCase().includes(query);

      // Advanced filters
      const matchesInciRegNum = !inciRegNumQuery || incineration.inciRegNum.toLowerCase().includes(inciRegNumQuery);
      const matchesCompany = !companyQuery || incineration.companyName.toLowerCase().includes(companyQuery);
      const matchesEquipment = !equipmentQuery || incineration.equipmentId.toLowerCase().includes(equipmentQuery);
      const matchesBatch = !batchQuery || incineration.batchNo.toLowerCase().includes(batchQuery);
      const matchesCompliance = !complianceQuery || incineration.complianceStatus.toLowerCase().includes(complianceQuery);
      const matchesStatus = statusFilter === 'all' || incineration.status === statusFilter;

      return matchesSearch && matchesInciRegNum && matchesCompany && matchesEquipment && matchesBatch && matchesCompliance && matchesStatus;
    });
  }, [incinerations, searchQuery, advancedFilters, statusFilter]);

  const handleAdd = () => {
    setEditingIncineration(null);
    setShowModal(true);
  };

  const handleEdit = (incineration: IncinerationRegister) => {
    setEditingIncineration(incineration);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this incineration register?')) {
      try {
        setLoading(true);
        setError(null);
        await incinerationRegisterService.deleteIncinerationRegister(id);
        setSuccessMessage('Incineration register deleted successfully');
        await loadIncinerations();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete incineration register';
        setError(errorMessage);
        console.error('Error deleting incineration register:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<IncinerationRegister>) => {
    try {
      setLoading(true);
      setError(null);

      if (editingIncineration) {
        // Update existing incineration
        await incinerationRegisterService.updateIncinerationRegister(editingIncineration.id, {
          incinerationDate: data.incinerationDate,
          equipmentId: data.equipmentId,
          secondaryChamberId: data.secondaryChamberId,
          batchNo: data.batchNo,
          wasteCategory: data.wasteCategory,
          wasteQtyKg: data.wasteQtyKg,
          startTime: data.startTime,
          endTime: data.endTime,
          avgTempC: data.avgTempC,
          retentionTimeSec: data.retentionTimeSec,
          fuelUsedL: data.fuelUsedL,
          complianceStatus: data.complianceStatus,
          status: data.status,
        });
        setSuccessMessage('Incineration register updated successfully');
      } else {
        // Create new incineration
        const selectedCompany = companies.find(c => c.id === data.companyId);
        if (!selectedCompany) {
          setError('Please select a valid company');
          return;
        }

        await incinerationRegisterService.createIncinerationRegister({
          companyId: selectedCompany.id,
          incinerationDate: data.incinerationDate!,
          equipmentId: data.equipmentId!,
          secondaryChamberId: data.secondaryChamberId!,
          batchNo: data.batchNo!,
          wasteCategory: data.wasteCategory!,
          wasteQtyKg: data.wasteQtyKg!,
          startTime: data.startTime!,
          endTime: data.endTime!,
          avgTempC: data.avgTempC!,
          retentionTimeSec: data.retentionTimeSec!,
          fuelUsedL: data.fuelUsedL!,
          complianceStatus: data.complianceStatus || 'Compliant',
          status: data.status || 'Active',
        });
        setSuccessMessage('Incineration register created successfully');
      }

      setShowModal(false);
      setEditingIncineration(null);
      await loadIncinerations();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save incineration register';
      setError(errorMessage);
      console.error('Error saving incineration register:', err);
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
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">Home &nbsp;&gt;&nbsp; Incineration Register</span>
          </div>
        </header>

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
        {loading && !incinerations.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading incineration registers...
          </div>
        )}

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
                <path d="M8 12h8"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Incineration Register</h1>
              <p className="ra-page-subtitle">Manage and track incineration operations and compliance</p>
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
                placeholder="Search by register number, company, equipment, batch..."
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
                Add Incineration
              </button>
            </div>
          </div>

          {/* Incinerations Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>REG NUM</th>
                  <th>COMPANY</th>
                  <th>DATE</th>
                  <th>EQUIPMENT ID</th>
                  <th>BATCH NO</th>
                  <th>WASTE CATEGORY</th>
                  <th>QTY (KG)</th>
                  <th>COMPLIANCE STATUS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncinerations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-message">
                      {loading ? 'Loading...' : 'No incineration registers found'}
                    </td>
                  </tr>
                ) : (
                  filteredIncinerations.map((incineration) => {
                    // Format date to DD/MM/YYYY
                    const formatDate = (dateString: string) => {
                      const date = new Date(dateString);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };

                    return (
                      <tr key={incineration.id}>
                        <td>{incineration.inciRegNum}</td>
                        <td>{incineration.companyName}</td>
                        <td>{formatDate(incineration.incinerationDate)}</td>
                        <td>{incineration.equipmentId}</td>
                        <td>{incineration.batchNo}</td>
                        <td>{incineration.wasteCategory}</td>
                        <td>{incineration.wasteQtyKg.toFixed(2)}</td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge ${getComplianceBadgeClass(incineration.complianceStatus)}`}>
                              {incineration.complianceStatus}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge status-badge--${incineration.status.toLowerCase()}`}>
                              {incineration.status}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons ra-actions">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleEdit(incineration)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--edit"
                              onClick={() => handleEdit(incineration)}
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--delete"
                              onClick={() => handleDelete(incineration.id)}
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
            Showing {filteredIncinerations.length} of {incinerations.length} items
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
            setAdvancedFilters({ inciRegNum: '', companyName: '', equipmentId: '', batchNo: '', complianceStatus: '' });
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

      {/* Incineration Add/Edit Modal */}
      {showModal && (
        <IncinerationFormModal
          incineration={editingIncineration}
          companies={companies.filter(c => c.status === 'Active')}
          categories={categories.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingIncineration(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Incineration Form Modal Component
interface IncinerationFormModalProps {
  incineration: IncinerationRegister | null;
  companies: Company[];
  categories: Category[];
  onClose: () => void;
  onSave: (data: Partial<IncinerationRegister>) => void;
}

const IncinerationFormModal = ({
  incineration,
  companies,
  categories,
  onClose,
  onSave,
}: IncinerationFormModalProps) => {
  const [formData, setFormData] = useState<Partial<IncinerationRegister>>(
    incineration || {
      companyId: '',
      incinerationDate: new Date().toISOString().split('T')[0],
      equipmentId: '',
      secondaryChamberId: '',
      batchNo: '',
      wasteCategory: '',
      wasteQtyKg: 0,
      startTime: '08:00',
      endTime: '17:00',
      avgTempC: 0,
      retentionTimeSec: 0,
      fuelUsedL: 0,
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
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
                <path d="M8 12h8"></path>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">
                {incineration ? 'Edit Incineration Register' : 'Add Incineration Register'}
              </h2>
              <p className="ra-assignment-modal-subtitle">
                {incineration ? 'Update incineration details' : 'Create a new incineration register.'}
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
                  disabled={!!incineration}
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
                <label htmlFor="incineration-date">
                  Incineration Date <span className="ra-required">*</span>
                </label>
                <input
                  id="incineration-date"
                  type="date"
                  value={formData.incinerationDate || ''}
                  onChange={(e) => setFormData({ ...formData, incinerationDate: e.target.value })}
                  required
                  className="ra-assignment-input"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="equipment-id">
                  Equipment ID <span className="ra-required">*</span>
                </label>
                <input
                  id="equipment-id"
                  type="text"
                  value={formData.equipmentId || ''}
                  onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                  required
                  className="ra-assignment-input"
                  placeholder="Enter equipment ID"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="secondary-chamber-id">
                  Secondary Chamber ID <span className="ra-required">*</span>
                </label>
                <input
                  id="secondary-chamber-id"
                  type="text"
                  value={formData.secondaryChamberId || ''}
                  onChange={(e) => setFormData({ ...formData, secondaryChamberId: e.target.value })}
                  required
                  className="ra-assignment-input"
                  placeholder="Enter secondary chamber ID"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="batch-no">
                  Batch No <span className="ra-required">*</span>
                </label>
                <input
                  id="batch-no"
                  type="text"
                  value={formData.batchNo || ''}
                  onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  required
                  className="ra-assignment-input"
                  placeholder="Enter batch number"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="waste-category">
                  Waste Category <span className="ra-required">*</span>
                </label>
                <select
                  id="waste-category"
                  value={formData.wasteCategory || ''}
                  onChange={(e) => setFormData({ ...formData, wasteCategory: e.target.value })}
                  required
                  className="ra-assignment-select"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.categoryName}>
                      {category.categoryName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="waste-qty">
                  Waste Quantity (kg) <span className="ra-required">*</span>
                </label>
                <input
                  id="waste-qty"
                  type="number"
                  step="0.01"
                  value={formData.wasteQtyKg || 0}
                  onChange={(e) => setFormData({ ...formData, wasteQtyKg: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="start-time">
                  Start Time <span className="ra-required">*</span>
                </label>
                <input
                  id="start-time"
                  type="time"
                  value={formData.startTime || ''}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                  className="ra-assignment-input"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="end-time">
                  End Time <span className="ra-required">*</span>
                </label>
                <input
                  id="end-time"
                  type="time"
                  value={formData.endTime || ''}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                  className="ra-assignment-input"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="avg-temp">
                  Average Temperature (°C) <span className="ra-required">*</span>
                </label>
                <input
                  id="avg-temp"
                  type="number"
                  step="0.01"
                  value={formData.avgTempC || 0}
                  onChange={(e) => setFormData({ ...formData, avgTempC: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="retention-time">
                  Retention Time (seconds) <span className="ra-required">*</span>
                </label>
                <input
                  id="retention-time"
                  type="number"
                  step="1"
                  value={formData.retentionTimeSec || 0}
                  onChange={(e) => setFormData({ ...formData, retentionTimeSec: parseInt(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="fuel-used">
                  Fuel Used (L) <span className="ra-required">*</span>
                </label>
                <input
                  id="fuel-used"
                  type="number"
                  step="0.01"
                  value={formData.fuelUsedL || 0}
                  onChange={(e) => setFormData({ ...formData, fuelUsedL: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
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
              {incineration ? 'Update Incineration' : 'Create Incineration'}
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
              <div className="ra-filter-subtitle">Filter incineration registers by multiple criteria</div>
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
                value={draft.inciRegNum}
                onChange={(e) => setDraft({ ...draft, inciRegNum: e.target.value })}
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
              <label>Equipment ID</label>
              <input
                type="text"
                value={draft.equipmentId}
                onChange={(e) => setDraft({ ...draft, equipmentId: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter equipment ID"
              />
            </div>

            <div className="ra-filter-field">
              <label>Batch No</label>
              <input
                type="text"
                value={draft.batchNo}
                onChange={(e) => setDraft({ ...draft, batchNo: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter batch number"
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
              setDraft({ inciRegNum: '', companyName: '', equipmentId: '', batchNo: '', complianceStatus: '' });
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

export default IncinerationRegisterPage;

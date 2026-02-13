import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { shredderRegisterService, ShredderRegisterResponse } from '../../services/shredderRegisterService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { categoryService, CategoryResponse } from '../../services/categoryService';
import './shredderRegisterPage.css';
import '../desktop/dashboardPage.css';

interface ShredderRegister {
  id: string;
  shredRegNum: string;
  companyId: string;
  companyName: string;
  shredderDate: string;
  equipmentId: string;
  batchNo: string;
  wasteCategory: string;
  wasteQtyKg: number;
  startTime: string;
  endTime: string;
  temperatureC: number;
  pressureBar: number;
  cycleTimeMin: number;
  indicatorResult: string;
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
  shredRegNum: string;
  companyName: string;
  equipmentId: string;
  batchNo: string;
  complianceStatus: string;
}

const ShredderRegisterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingShredder, setEditingShredder] = useState<ShredderRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    shredRegNum: '',
    companyName: '',
    equipmentId: '',
    batchNo: '',
    complianceStatus: '',
  });

  // Master data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shredders, setShredders] = useState<ShredderRegister[]>([]);

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

  // Load shredders
  const loadShredders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiShredders = await shredderRegisterService.getAllShredderRegisters(
        undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );

      // Map backend response to frontend format with names
      const mappedShredders: ShredderRegister[] = await Promise.all(
        apiShredders.map(async (apiShredder: ShredderRegisterResponse) => {
          const company = companies.find(c => c.id === apiShredder.companyId);

          return {
            id: apiShredder.id,
            shredRegNum: apiShredder.shredRegNum,
            companyId: apiShredder.companyId,
            companyName: company?.companyName || 'Unknown',
            shredderDate: apiShredder.shredderDate,
            equipmentId: apiShredder.equipmentId,
            batchNo: apiShredder.batchNo,
            wasteCategory: apiShredder.wasteCategory,
            wasteQtyKg: apiShredder.wasteQtyKg,
            startTime: apiShredder.startTime,
            endTime: apiShredder.endTime,
            temperatureC: apiShredder.temperatureC,
            pressureBar: apiShredder.pressureBar,
            cycleTimeMin: apiShredder.cycleTimeMin,
            indicatorResult: apiShredder.indicatorResult,
            complianceStatus: apiShredder.complianceStatus,
            status: apiShredder.status,
            createdBy: apiShredder.createdBy,
            createdOn: apiShredder.createdOn,
            modifiedBy: apiShredder.modifiedBy,
            modifiedOn: apiShredder.modifiedOn,
          };
        })
      );
      setShredders(mappedShredders);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load shredder registers';
      setError(errorMessage);
      console.error('Error loading shredder registers:', err);
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

  // Load shredders when dependencies are ready
  useEffect(() => {
    if (companies.length > 0) {
      loadShredders();
    }
  }, [companies, statusFilter, loadShredders]);

  const filteredShredders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const shredRegNumQuery = advancedFilters.shredRegNum.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    const equipmentQuery = advancedFilters.equipmentId.trim().toLowerCase();
    const batchQuery = advancedFilters.batchNo.trim().toLowerCase();
    const complianceQuery = advancedFilters.complianceStatus.trim().toLowerCase();

    return shredders.filter((shredder) => {
      // Top search box: broad match across key fields
      const matchesSearch =
        !query ||
        shredder.shredRegNum.toLowerCase().includes(query) ||
        shredder.companyName.toLowerCase().includes(query) ||
        shredder.equipmentId.toLowerCase().includes(query) ||
        shredder.batchNo.toLowerCase().includes(query) ||
        shredder.wasteCategory.toLowerCase().includes(query);

      // Advanced filters
      const matchesShredRegNum = !shredRegNumQuery || shredder.shredRegNum.toLowerCase().includes(shredRegNumQuery);
      const matchesCompany = !companyQuery || shredder.companyName.toLowerCase().includes(companyQuery);
      const matchesEquipment = !equipmentQuery || shredder.equipmentId.toLowerCase().includes(equipmentQuery);
      const matchesBatch = !batchQuery || shredder.batchNo.toLowerCase().includes(batchQuery);
      const matchesCompliance = !complianceQuery || shredder.complianceStatus.toLowerCase().includes(complianceQuery);
      const matchesStatus = statusFilter === 'all' || shredder.status === statusFilter;

      return matchesSearch && matchesShredRegNum && matchesCompany && matchesEquipment && matchesBatch && matchesCompliance && matchesStatus;
    });
  }, [shredders, searchQuery, advancedFilters, statusFilter]);

  const handleAdd = () => {
    setEditingShredder(null);
    setShowModal(true);
  };

  const handleEdit = (shredder: ShredderRegister) => {
    setEditingShredder(shredder);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this shredder register?')) {
      try {
        setLoading(true);
        setError(null);
        await shredderRegisterService.deleteShredderRegister(id);
        setSuccessMessage('Shredder register deleted successfully');
        await loadShredders();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete shredder register';
        setError(errorMessage);
        console.error('Error deleting shredder register:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<ShredderRegister>) => {
    try {
      setLoading(true);
      setError(null);

      if (editingShredder) {
        // Update existing shredder
        await shredderRegisterService.updateShredderRegister(editingShredder.id, {
          shredderDate: data.shredderDate,
          equipmentId: data.equipmentId,
          batchNo: data.batchNo,
          wasteCategory: data.wasteCategory,
          wasteQtyKg: data.wasteQtyKg,
          startTime: data.startTime,
          endTime: data.endTime,
          temperatureC: data.temperatureC,
          pressureBar: data.pressureBar,
          cycleTimeMin: data.cycleTimeMin,
          indicatorResult: data.indicatorResult,
          complianceStatus: data.complianceStatus,
          status: data.status,
        });
        setSuccessMessage('Shredder register updated successfully');
      } else {
        // Create new shredder
        const selectedCompany = companies.find(c => c.id === data.companyId);
        if (!selectedCompany) {
          setError('Please select a valid company');
          return;
        }

        await shredderRegisterService.createShredderRegister({
          companyId: selectedCompany.id,
          shredderDate: data.shredderDate!,
          equipmentId: data.equipmentId!,
          batchNo: data.batchNo!,
          wasteCategory: data.wasteCategory!,
          wasteQtyKg: data.wasteQtyKg!,
          startTime: data.startTime!,
          endTime: data.endTime!,
          temperatureC: data.temperatureC!,
          pressureBar: data.pressureBar!,
          cycleTimeMin: data.cycleTimeMin!,
          indicatorResult: data.indicatorResult!,
          complianceStatus: data.complianceStatus || 'Compliant',
          status: data.status || 'Active',
        });
        setSuccessMessage('Shredder register created successfully');
      }

      setShowModal(false);
      setEditingShredder(null);
      await loadShredders();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save shredder register';
      setError(errorMessage);
      console.error('Error saving shredder register:', err);
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

  const getIndicatorBadgeClass = (result: string) => {
    switch (result.toLowerCase()) {
      case 'pass':
        return 'status-badge--pass';
      case 'fail':
        return 'status-badge--fail';
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
            <span className="breadcrumb">Home &nbsp;&gt;&nbsp; Shredder Register</span>
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
        {loading && !shredders.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading shredder registers...
          </div>
        )}

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Shredder Register</h1>
              <p className="ra-page-subtitle">Manage and track shredder operations and compliance</p>
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
                Add Shredder
              </button>
            </div>
          </div>

          {/* Shredders Table */}
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
                  <th>INDICATOR RESULT</th>
                  <th>COMPLIANCE STATUS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredShredders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="empty-message">
                      {loading ? 'Loading...' : 'No shredder registers found'}
                    </td>
                  </tr>
                ) : (
                  filteredShredders.map((shredder) => {
                    // Format date to DD/MM/YYYY
                    const formatDate = (dateString: string) => {
                      const date = new Date(dateString);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };

                    return (
                      <tr key={shredder.id}>
                        <td>{shredder.shredRegNum}</td>
                        <td>{shredder.companyName}</td>
                        <td>{formatDate(shredder.shredderDate)}</td>
                        <td>{shredder.equipmentId}</td>
                        <td>{shredder.batchNo}</td>
                        <td>{shredder.wasteCategory}</td>
                        <td>{shredder.wasteQtyKg.toFixed(2)}</td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge ${getIndicatorBadgeClass(shredder.indicatorResult)}`}>
                              {shredder.indicatorResult}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge ${getComplianceBadgeClass(shredder.complianceStatus)}`}>
                              {shredder.complianceStatus}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge status-badge--${shredder.status.toLowerCase()}`}>
                              {shredder.status}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons ra-actions">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleEdit(shredder)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--edit"
                              onClick={() => handleEdit(shredder)}
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--delete"
                              onClick={() => handleDelete(shredder.id)}
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
            Showing {filteredShredders.length} of {shredders.length} items
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
            setAdvancedFilters({ shredRegNum: '', companyName: '', equipmentId: '', batchNo: '', complianceStatus: '' });
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

      {/* Shredder Add/Edit Modal */}
      {showModal && (
        <ShredderFormModal
          shredder={editingShredder}
          companies={companies.filter(c => c.status === 'Active')}
          categories={categories.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingShredder(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Shredder Form Modal Component
interface ShredderFormModalProps {
  shredder: ShredderRegister | null;
  companies: Company[];
  categories: Category[];
  onClose: () => void;
  onSave: (data: Partial<ShredderRegister>) => void;
}

const ShredderFormModal = ({
  shredder,
  companies,
  categories,
  onClose,
  onSave,
}: ShredderFormModalProps) => {
  const [formData, setFormData] = useState<Partial<ShredderRegister>>(
    shredder || {
      companyId: '',
      shredderDate: new Date().toISOString().split('T')[0],
      equipmentId: '',
      batchNo: '',
      wasteCategory: '',
      wasteQtyKg: 0,
      startTime: '08:00',
      endTime: '17:00',
      temperatureC: 0,
      pressureBar: 0,
      cycleTimeMin: 0,
      indicatorResult: 'Pass',
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
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">
                {shredder ? 'Edit Shredder Register' : 'Add Shredder Register'}
              </h2>
              <p className="ra-assignment-modal-subtitle">
                {shredder ? 'Update shredder details' : 'Create a new shredder register.'}
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
                  disabled={!!shredder}
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
                <label htmlFor="shredder-date">
                  Shredder Date <span className="ra-required">*</span>
                </label>
                <input
                  id="shredder-date"
                  type="date"
                  value={formData.shredderDate || ''}
                  onChange={(e) => setFormData({ ...formData, shredderDate: e.target.value })}
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
            </div>

            {/* Right Column */}
            <div className="ra-assignment-form-col">
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
                <label htmlFor="temperature">
                  Temperature (°C) <span className="ra-required">*</span>
                </label>
                <input
                  id="temperature"
                  type="number"
                  step="0.01"
                  value={formData.temperatureC || 0}
                  onChange={(e) => setFormData({ ...formData, temperatureC: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="pressure">
                  Pressure (bar) <span className="ra-required">*</span>
                </label>
                <input
                  id="pressure"
                  type="number"
                  step="0.01"
                  value={formData.pressureBar || 0}
                  onChange={(e) => setFormData({ ...formData, pressureBar: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="cycle-time">
                  Cycle Time (minutes) <span className="ra-required">*</span>
                </label>
                <input
                  id="cycle-time"
                  type="number"
                  step="1"
                  value={formData.cycleTimeMin || 0}
                  onChange={(e) => setFormData({ ...formData, cycleTimeMin: parseInt(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="indicator-result">Indicator Result</label>
                <select
                  id="indicator-result"
                  value={formData.indicatorResult || 'Pass'}
                  onChange={(e) => setFormData({ ...formData, indicatorResult: e.target.value })}
                  className="ra-assignment-select"
                >
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                </select>
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
              {shredder ? 'Update Shredder' : 'Create Shredder'}
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
              <div className="ra-filter-subtitle">Filter shredder registers by multiple criteria</div>
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
                value={draft.shredRegNum}
                onChange={(e) => setDraft({ ...draft, shredRegNum: e.target.value })}
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
              setDraft({ shredRegNum: '', companyName: '', equipmentId: '', batchNo: '', complianceStatus: '' });
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

export default ShredderRegisterPage;

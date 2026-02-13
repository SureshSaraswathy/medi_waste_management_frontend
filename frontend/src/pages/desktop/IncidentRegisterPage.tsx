import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { incidentRegisterService, IncidentRegisterResponse } from '../../services/incidentRegisterService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { categoryService, CategoryResponse } from '../../services/categoryService';
import './incidentRegisterPage.css';
import '../desktop/dashboardPage.css';

interface IncidentRegister {
  id: string;
  incidentNum: string;
  companyId: string;
  companyName: string;
  incidentDate: string;
  incidentTime: string;
  incidentType: string;
  location: string;
  wasteCategory: string;
  quantityValue: number;
  quantityUnit: string;
  severity: string;
  personAffected?: string | null;
  immediateAction?: string | null;
  medicalAction?: string | null;
  reportedTo?: string | null;
  incidentStatus: string;
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
  incidentNum: string;
  companyName: string;
  incidentType: string;
  severity: string;
  incidentStatus: string;
}

const IncidentRegisterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingIncident, setEditingIncident] = useState<IncidentRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    incidentNum: '',
    companyName: '',
    incidentType: '',
    severity: '',
    incidentStatus: '',
  });

  // Master data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [incidents, setIncidents] = useState<IncidentRegister[]>([]);

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

  // Load incidents
  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiIncidents = await incidentRegisterService.getAllIncidentRegisters(
        undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );

      // Map backend response to frontend format with names
      const mappedIncidents: IncidentRegister[] = await Promise.all(
        apiIncidents.map(async (apiIncident: IncidentRegisterResponse) => {
          const company = companies.find(c => c.id === apiIncident.companyId);

          return {
            id: apiIncident.id,
            incidentNum: apiIncident.incidentNum,
            companyId: apiIncident.companyId,
            companyName: company?.companyName || 'Unknown',
            incidentDate: apiIncident.incidentDate,
            incidentTime: apiIncident.incidentTime,
            incidentType: apiIncident.incidentType,
            location: apiIncident.location,
            wasteCategory: apiIncident.wasteCategory,
            quantityValue: apiIncident.quantityValue,
            quantityUnit: apiIncident.quantityUnit,
            severity: apiIncident.severity,
            personAffected: apiIncident.personAffected,
            immediateAction: apiIncident.immediateAction,
            medicalAction: apiIncident.medicalAction,
            reportedTo: apiIncident.reportedTo,
            incidentStatus: apiIncident.incidentStatus,
            status: apiIncident.status,
            createdBy: apiIncident.createdBy,
            createdOn: apiIncident.createdOn,
            modifiedBy: apiIncident.modifiedBy,
            modifiedOn: apiIncident.modifiedOn,
          };
        })
      );
      setIncidents(mappedIncidents);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load incidents';
      setError(errorMessage);
      console.error('Error loading incidents:', err);
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

  // Load incidents when dependencies are ready
  useEffect(() => {
    if (companies.length > 0) {
      loadIncidents();
    }
  }, [companies, statusFilter, loadIncidents]);

  const filteredIncidents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const incidentNumQuery = advancedFilters.incidentNum.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    const typeQuery = advancedFilters.incidentType.trim().toLowerCase();
    const severityQuery = advancedFilters.severity.trim().toLowerCase();
    const statusQuery = advancedFilters.incidentStatus.trim().toLowerCase();

    return incidents.filter((incident) => {
      // Top search box: broad match across key fields
      const matchesSearch =
        !query ||
        incident.incidentNum.toLowerCase().includes(query) ||
        incident.companyName.toLowerCase().includes(query) ||
        incident.incidentType.toLowerCase().includes(query) ||
        incident.location.toLowerCase().includes(query) ||
        incident.severity.toLowerCase().includes(query);

      // Advanced filters
      const matchesIncidentNum = !incidentNumQuery || incident.incidentNum.toLowerCase().includes(incidentNumQuery);
      const matchesCompany = !companyQuery || incident.companyName.toLowerCase().includes(companyQuery);
      const matchesType = !typeQuery || incident.incidentType.toLowerCase().includes(typeQuery);
      const matchesSeverity = !severityQuery || incident.severity.toLowerCase().includes(severityQuery);
      const matchesIncidentStatus = !statusQuery || incident.incidentStatus.toLowerCase().includes(statusQuery);
      const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;

      return matchesSearch && matchesIncidentNum && matchesCompany && matchesType && matchesSeverity && matchesIncidentStatus && matchesStatus;
    });
  }, [incidents, searchQuery, advancedFilters, statusFilter]);

  const handleAdd = () => {
    setEditingIncident(null);
    setShowModal(true);
  };

  const handleEdit = (incident: IncidentRegister) => {
    setEditingIncident(incident);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this incident register?')) {
      try {
        setLoading(true);
        setError(null);
        await incidentRegisterService.deleteIncidentRegister(id);
        setSuccessMessage('Incident register deleted successfully');
        await loadIncidents();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete incident register';
        setError(errorMessage);
        console.error('Error deleting incident register:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<IncidentRegister>) => {
    try {
      setLoading(true);
      setError(null);

      if (editingIncident) {
        // Update existing incident
        await incidentRegisterService.updateIncidentRegister(editingIncident.id, {
          incidentDate: data.incidentDate,
          incidentTime: data.incidentTime,
          incidentType: data.incidentType,
          location: data.location,
          wasteCategory: data.wasteCategory,
          quantityValue: data.quantityValue,
          quantityUnit: data.quantityUnit,
          severity: data.severity,
          personAffected: data.personAffected,
          immediateAction: data.immediateAction,
          medicalAction: data.medicalAction,
          reportedTo: data.reportedTo,
          incidentStatus: data.incidentStatus,
          status: data.status,
        });
        setSuccessMessage('Incident register updated successfully');
      } else {
        // Create new incident
        const selectedCompany = companies.find(c => c.id === data.companyId);
        if (!selectedCompany) {
          setError('Please select a valid company');
          return;
        }

        await incidentRegisterService.createIncidentRegister({
          companyId: selectedCompany.id,
          incidentDate: data.incidentDate!,
          incidentTime: data.incidentTime!,
          incidentType: data.incidentType!,
          location: data.location!,
          wasteCategory: data.wasteCategory!,
          quantityValue: data.quantityValue!,
          quantityUnit: data.quantityUnit!,
          severity: data.severity!,
          personAffected: data.personAffected,
          immediateAction: data.immediateAction,
          medicalAction: data.medicalAction,
          reportedTo: data.reportedTo,
          incidentStatus: data.incidentStatus || 'Reported',
          status: data.status || 'Active',
        });
        setSuccessMessage('Incident register created successfully');
      }

      setShowModal(false);
      setEditingIncident(null);
      await loadIncidents();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save incident register';
      setError(errorMessage);
      console.error('Error saving incident register:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'status-badge--critical';
      case 'high':
        return 'status-badge--high';
      case 'medium':
        return 'status-badge--medium';
      case 'low':
        return 'status-badge--low';
      default:
        return '';
    }
  };

  const getIncidentStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'reported':
        return 'status-badge--reported';
      case 'under investigation':
        return 'status-badge--investigation';
      case 'resolved':
        return 'status-badge--resolved';
      case 'closed':
        return 'status-badge--closed';
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
            <span className="breadcrumb">Home &nbsp;&gt;&nbsp; Incident Register</span>
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
        {loading && !incidents.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading incidents...
          </div>
        )}

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Incident Register</h1>
              <p className="ra-page-subtitle">Manage and track incident reports and safety issues</p>
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
                placeholder="Search by incident number, company, type, location..."
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
                Add Incident
              </button>
            </div>
          </div>

          {/* Incidents Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>INCIDENT NUM</th>
                  <th>COMPANY</th>
                  <th>INCIDENT DATE</th>
                  <th>INCIDENT TIME</th>
                  <th>INCIDENT TYPE</th>
                  <th>LOCATION</th>
                  <th>SEVERITY</th>
                  <th>INCIDENT STATUS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-message">
                      {loading ? 'Loading...' : 'No incidents found'}
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((incident) => {
                    // Format date to DD/MM/YYYY
                    const formatDate = (dateString: string) => {
                      const date = new Date(dateString);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };

                    return (
                      <tr key={incident.id}>
                        <td>{incident.incidentNum}</td>
                        <td>{incident.companyName}</td>
                        <td>{formatDate(incident.incidentDate)}</td>
                        <td>{incident.incidentTime}</td>
                        <td>{incident.incidentType}</td>
                        <td>{incident.location}</td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge ${getSeverityBadgeClass(incident.severity)}`}>
                              {incident.severity}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge ${getIncidentStatusBadgeClass(incident.incidentStatus)}`}>
                              {incident.incidentStatus}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge status-badge--${incident.status.toLowerCase()}`}>
                              {incident.status}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons ra-actions">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleEdit(incident)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--edit"
                              onClick={() => handleEdit(incident)}
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--delete"
                              onClick={() => handleDelete(incident.id)}
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
            Showing {filteredIncidents.length} of {incidents.length} items
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
            setAdvancedFilters({ incidentNum: '', companyName: '', incidentType: '', severity: '', incidentStatus: '' });
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

      {/* Incident Add/Edit Modal */}
      {showModal && (
        <IncidentFormModal
          incident={editingIncident}
          companies={companies.filter(c => c.status === 'Active')}
          categories={categories.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingIncident(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Incident Form Modal Component
interface IncidentFormModalProps {
  incident: IncidentRegister | null;
  companies: Company[];
  categories: Category[];
  onClose: () => void;
  onSave: (data: Partial<IncidentRegister>) => void;
}

const IncidentFormModal = ({
  incident,
  companies,
  categories,
  onClose,
  onSave,
}: IncidentFormModalProps) => {
  const [formData, setFormData] = useState<Partial<IncidentRegister>>(
    incident || {
      companyId: '',
      incidentDate: new Date().toISOString().split('T')[0],
      incidentTime: new Date().toTimeString().slice(0, 5),
      incidentType: '',
      location: '',
      wasteCategory: '',
      quantityValue: 0,
      quantityUnit: 'kg',
      severity: 'Low',
      personAffected: null,
      immediateAction: null,
      medicalAction: null,
      reportedTo: null,
      incidentStatus: 'Reported',
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
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">
                {incident ? 'Edit Incident Register' : 'Add Incident Register'}
              </h2>
              <p className="ra-assignment-modal-subtitle">
                {incident ? 'Update incident details' : 'Create a new incident register.'}
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
                  disabled={!!incident}
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
                <label htmlFor="incident-date">
                  Incident Date <span className="ra-required">*</span>
                </label>
                <input
                  id="incident-date"
                  type="date"
                  value={formData.incidentDate || ''}
                  onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                  required
                  className="ra-assignment-input"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="incident-time">
                  Incident Time <span className="ra-required">*</span>
                </label>
                <input
                  id="incident-time"
                  type="time"
                  value={formData.incidentTime || ''}
                  onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                  required
                  className="ra-assignment-input"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="incident-type">
                  Incident Type <span className="ra-required">*</span>
                </label>
                <select
                  id="incident-type"
                  value={formData.incidentType || ''}
                  onChange={(e) => setFormData({ ...formData, incidentType: e.target.value })}
                  required
                  className="ra-assignment-select"
                >
                  <option value="">Select Type</option>
                  <option value="Spill">Spill</option>
                  <option value="Exposure">Exposure</option>
                  <option value="Injury">Injury</option>
                  <option value="Fire">Fire</option>
                  <option value="Equipment Failure">Equipment Failure</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="location">
                  Location <span className="ra-required">*</span>
                </label>
                <input
                  id="location"
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  className="ra-assignment-input"
                  placeholder="Enter location"
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
            </div>

            {/* Right Column */}
            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="quantity-value">
                  Quantity Value <span className="ra-required">*</span>
                </label>
                <input
                  id="quantity-value"
                  type="number"
                  step="0.01"
                  value={formData.quantityValue || 0}
                  onChange={(e) => setFormData({ ...formData, quantityValue: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="quantity-unit">
                  Quantity Unit <span className="ra-required">*</span>
                </label>
                <select
                  id="quantity-unit"
                  value={formData.quantityUnit || 'kg'}
                  onChange={(e) => setFormData({ ...formData, quantityUnit: e.target.value })}
                  required
                  className="ra-assignment-select"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="mL">mL</option>
                  <option value="pieces">pieces</option>
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="severity">
                  Severity <span className="ra-required">*</span>
                </label>
                <select
                  id="severity"
                  value={formData.severity || 'Low'}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  required
                  className="ra-assignment-select"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="person-affected">Person Affected</label>
                <input
                  id="person-affected"
                  type="text"
                  value={formData.personAffected || ''}
                  onChange={(e) => setFormData({ ...formData, personAffected: e.target.value || null })}
                  className="ra-assignment-input"
                  placeholder="Enter person name"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="immediate-action">Immediate Action</label>
                <textarea
                  id="immediate-action"
                  value={formData.immediateAction || ''}
                  onChange={(e) => setFormData({ ...formData, immediateAction: e.target.value || null })}
                  className="ra-assignment-input"
                  rows={3}
                  placeholder="Describe immediate actions taken"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="medical-action">Medical Action</label>
                <textarea
                  id="medical-action"
                  value={formData.medicalAction || ''}
                  onChange={(e) => setFormData({ ...formData, medicalAction: e.target.value || null })}
                  className="ra-assignment-input"
                  rows={3}
                  placeholder="Describe medical actions taken"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="reported-to">Reported To</label>
                <input
                  id="reported-to"
                  type="text"
                  value={formData.reportedTo || ''}
                  onChange={(e) => setFormData({ ...formData, reportedTo: e.target.value || null })}
                  className="ra-assignment-input"
                  placeholder="Enter person/department reported to"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="incident-status">Incident Status</label>
                <select
                  id="incident-status"
                  value={formData.incidentStatus || 'Reported'}
                  onChange={(e) => setFormData({ ...formData, incidentStatus: e.target.value })}
                  className="ra-assignment-select"
                >
                  <option value="Reported">Reported</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
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
              {incident ? 'Update Incident' : 'Create Incident'}
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
              <div className="ra-filter-subtitle">Filter incidents by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
            <div className="ra-filter-field">
              <label>Incident Number</label>
              <input
                type="text"
                value={draft.incidentNum}
                onChange={(e) => setDraft({ ...draft, incidentNum: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter incident number"
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
              <label>Incident Type</label>
              <input
                type="text"
                value={draft.incidentType}
                onChange={(e) => setDraft({ ...draft, incidentType: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter incident type"
              />
            </div>

            <div className="ra-filter-field">
              <label>Severity</label>
              <select
                value={draft.severity}
                onChange={(e) => setDraft({ ...draft, severity: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Severity</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="ra-filter-field">
              <label>Incident Status</label>
              <select
                value={draft.incidentStatus}
                onChange={(e) => setDraft({ ...draft, incidentStatus: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Status</option>
                <option value="Reported">Reported</option>
                <option value="Under Investigation">Under Investigation</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
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
              setDraft({ incidentNum: '', companyName: '', incidentType: '', severity: '', incidentStatus: '' });
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

export default IncidentRegisterPage;

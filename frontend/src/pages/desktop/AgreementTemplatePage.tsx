import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { agreementTemplateService, AgreementTemplateResponse } from '../../services/agreementTemplateService';
import PageHeader from '../../components/layout/PageHeader';
import './agreementTemplatePage.css';
import '../desktop/dashboardPage.css';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';

interface AgreementTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  agreementCategory: string | null;
  templateDescription: string | null;
  status: 'Active' | 'Inactive';
  createdOn: string;
}

interface AdvancedFilters {
  templateCode: string;
  templateName: string;
  agreementCategory: string;
  status: string;
}

const AgreementTemplatePage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AgreementTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<AgreementTemplate | null>(null);
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    templateCode: '',
    templateName: '',
    agreementCategory: '',
    status: '',
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agreementTemplateService.getAllAgreementTemplates();
      
      // Map API response to AgreementTemplate interface
      const mappedTemplates: AgreementTemplate[] = data.map((template: AgreementTemplateResponse) => ({
        id: template.id,
        templateCode: template.templateCode,
        templateName: template.templateName,
        agreementCategory: template.agreementCategory,
        templateDescription: template.templateDescription,
        status: template.status,
        createdOn: template.createdOn,
      }));
      
      setTemplates(mappedTemplates);
    } catch (err: any) {
      console.error('Failed to load agreement templates:', err);
      setError(err.message || 'Failed to load agreement templates');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filter templates with search query, status filter, and advanced filters
  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const templateCodeQuery = advancedFilters.templateCode.trim().toLowerCase();
    const templateNameQuery = advancedFilters.templateName.trim().toLowerCase();
    const categoryQuery = advancedFilters.agreementCategory.trim().toLowerCase();
    const advancedStatusQuery = advancedFilters.status.trim();

    return templates.filter((template) => {
      // Top search box: search by Template Code and Template Name
      const matchesSearch =
        !query ||
        template.templateCode.toLowerCase().includes(query) ||
        template.templateName.toLowerCase().includes(query);

      // Status filter (from dropdown)
      const matchesStatus = statusFilter === 'All' || template.status === statusFilter;

      // Advanced filters
      const matchesTemplateCode = !templateCodeQuery || template.templateCode.toLowerCase().includes(templateCodeQuery);
      const matchesTemplateName = !templateNameQuery || template.templateName.toLowerCase().includes(templateNameQuery);
      const matchesCategory = !categoryQuery || (template.agreementCategory && template.agreementCategory.toLowerCase().includes(categoryQuery));
      const matchesAdvancedStatus = !advancedStatusQuery || template.status === advancedStatusQuery;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesTemplateCode &&
        matchesTemplateName &&
        matchesCategory &&
        matchesAdvancedStatus
      );
    });
  }, [templates, searchQuery, statusFilter, advancedFilters]);

  // Handle Add
  const handleAdd = () => {
    setEditingTemplate(null);
    setShowModal(true);
  };

  // Handle Edit
  const handleEdit = (template: AgreementTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setShowModal(true);
  };

  // Handle View
  const handleView = (template: AgreementTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewingTemplate(template);
    setShowViewModal(true);
  };

  // Handle Delete
  const handleDelete = async (template: AgreementTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete template "${template.templateName}"?`)) {
      try {
        await agreementTemplateService.deleteAgreementTemplate(template.id);
        toast.success('Template deleted successfully');
        await loadTemplates();
      } catch (err: any) {
        console.error('Failed to delete template:', err);
        toast.error(err.message || 'Failed to delete template');
      }
    }
  };

  // Handle Save
  const handleSave = async (data: Partial<AgreementTemplate>) => {
    try {
      setSaving(true);
      setError(null);

      if (editingTemplate) {
        await agreementTemplateService.updateAgreementTemplate(editingTemplate.id, {
          templateName: data.templateName!,
          agreementCategory: data.agreementCategory || undefined,
          templateDescription: data.templateDescription || undefined,
          status: data.status as 'Active' | 'Inactive',
        });
        toast.success('Template updated successfully');
      } else {
        await agreementTemplateService.createAgreementTemplate({
          templateName: data.templateName!,
          agreementCategory: data.agreementCategory || undefined,
          templateDescription: data.templateDescription || undefined,
          status: (data.status as 'Active' | 'Inactive') || 'Active',
        });
        toast.success('Template created successfully');
      }

      setShowModal(false);
      setEditingTemplate(null);
      await loadTemplates();
    } catch (err: any) {
      console.error('Failed to save template:', err);
      setError(err.message || 'Failed to save template');
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: AgreementTemplate['status'] }) => {
    const statusClass = `status-badge status-badge--${status.toLowerCase()}`;
    return <span className={statusClass}>{status}</span>;
  };

  // Actions component
  const ActionsCell = ({ template }: { template: AgreementTemplate }) => (
    <>
      <button
        className="action-btn action-btn--view"
        onClick={(e) => handleView(template, e)}
        title="View Template"
        aria-label={`View template ${template.templateCode}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </button>
      <button
        className="action-btn action-btn--edit"
        onClick={(e) => handleEdit(template, e)}
        title="Edit Template"
        aria-label={`Edit template ${template.templateCode}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button
        className="action-btn action-btn--close"
        onClick={(e) => handleDelete(template, e)}
        title="Delete Template"
        aria-label={`Delete template ${template.templateCode}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </>
  );

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
          title="Agreement Template"
          subtitle="Manage agreement templates used for contracts"
        />

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Agreement Template</h1>
              <p className="ra-page-subtitle">Manage agreement templates used for contracts.</p>
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
              {error}
            </div>
          )}

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
                placeholder="Search by template code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="ra-actions">
              <select
                className="ra-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button className="ra-filter-btn" onClick={() => setShowAdvancedFilters(true)} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Advanced Filter
              </button>
              <button className="ra-add-btn" onClick={handleAdd} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Template
              </button>
            </div>
          </div>

          {loading && (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading templates...</div>
          )}

          {/* Templates Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>TEMPLATE CODE</th>
                  <th>TEMPLATE NAME</th>
                  <th>AGREEMENT CATEGORY</th>
                  <th>STATUS</th>
                  <th>CREATED DATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-message">
                      {loading ? 'Loading...' : 'No template records found'}
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((template) => {
                    // Format date to DD/MM/YYYY
                    const formatDate = (dateString: string) => {
                      if (!dateString) return '-';
                      const date = new Date(dateString);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };

                    return (
                      <tr key={template.id}>
                        <td>
                          <span className="template-code-cell">{template.templateCode}</span>
                        </td>
                        <td>{template.templateName}</td>
                        <td>{template.agreementCategory || '-'}</td>
                        <td>
                          <div className="ra-cell-center">
                            <StatusBadge status={template.status} />
                          </div>
                        </td>
                        <td>{formatDate(template.createdOn)}</td>
                        <td>
                          <div className="action-buttons ra-actions">
                            <ActionsCell template={template} />
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
            Showing {filteredTemplates.length} of {templates.length} items
          </div>
        </div>
      </main>

      {/* Create/Edit Template Modal */}
      {showModal && (
        <AgreementTemplateFormModal
          template={editingTemplate}
          saving={saving}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* View Template Modal */}
      {showViewModal && viewingTemplate && (
        <AgreementTemplateViewModal
          template={viewingTemplate}
          onClose={() => {
            setShowViewModal(false);
            setViewingTemplate(null);
          }}
        />
      )}

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          statusFilter={statusFilter}
          advancedFilters={advancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setStatusFilter('All');
            setAdvancedFilters({
              templateCode: '',
              templateName: '',
              agreementCategory: '',
              status: '',
            });
            setShowAdvancedFilters(false);
          }}
          onApply={(payload) => {
            setStatusFilter(payload.statusFilter);
            setAdvancedFilters(payload.advancedFilters);
            setShowAdvancedFilters(false);
          }}
        />
      )}
    </div>
  );
};

// Agreement Template Form Modal
interface AgreementTemplateFormModalProps {
  template: AgreementTemplate | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<AgreementTemplate>) => void;
}

const AgreementTemplateFormModal = ({ template, saving, onClose, onSave }: AgreementTemplateFormModalProps) => {
  const [formData, setFormData] = useState<Partial<AgreementTemplate>>(
    template || {
      templateCode: '', // Will be auto-generated
      templateName: '',
      agreementCategory: '',
      templateDescription: '',
      status: 'Active',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.templateName) {
      toast.error('Please complete the required fields.');
      return;
    }

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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">{template ? 'Edit Agreement Template' : 'Add Agreement Template'}</h2>
              <p className="ra-assignment-modal-subtitle">
                {template ? 'Update template details' : 'Create a new agreement template.'}
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
            <div className="ra-assignment-form-group">
              <label htmlFor="template-code">
                Template Code <span className="ra-required">*</span>
              </label>
              <input
                id="template-code"
                type="text"
                value={template ? (formData.templateCode || '') : 'Auto-generated'}
                disabled={true}
                readOnly={true}
                className="ra-assignment-input"
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                title="Template code is auto-generated"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="template-name">
                Template Name <span className="ra-required">*</span>
              </label>
              <input
                id="template-name"
                type="text"
                value={formData.templateName || ''}
                onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                required
                disabled={saving}
                className="ra-assignment-input"
                placeholder="e.g., Biomedical Waste Agreement"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="agreement-category">Agreement Category</label>
              <input
                id="agreement-category"
                type="text"
                value={formData.agreementCategory || ''}
                onChange={(e) => setFormData({ ...formData, agreementCategory: e.target.value })}
                disabled={saving}
                className="ra-assignment-input"
                placeholder="e.g., Hospital / Clinic / Lab"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="template-description">Template Description</label>
              <textarea
                id="template-description"
                value={formData.templateDescription || ''}
                onChange={(e) => setFormData({ ...formData, templateDescription: e.target.value })}
                disabled={saving}
                className="ra-assignment-input"
                rows={3}
                placeholder="Enter template description"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status || 'Active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                disabled={saving}
                className="ra-assignment-select"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="ra-assignment-modal-footer">
            <button type="button" className="ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="ra-assignment-btn ra-assignment-btn--primary" disabled={saving}>
              {saving ? 'Saving...' : (template ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Agreement Template View Modal
interface AgreementTemplateViewModalProps {
  template: AgreementTemplate;
  onClose: () => void;
}

const AgreementTemplateViewModal = ({ template, onClose }: AgreementTemplateViewModalProps) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="modal-overlay ra-assignment-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-assignment-modal modal-content--view" onClick={(e) => e.stopPropagation()}>
        <div className="ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <div className="ra-assignment-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">View Agreement Template</h2>
              <p className="ra-assignment-modal-subtitle">Template details</p>
            </div>
          </div>
          <button className="ra-assignment-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="contract-view-content">
          <div className="contract-view-section">
            <div className="contract-view-grid">
              <div className="contract-view-field">
                <label>Template Code</label>
                <span>{template.templateCode}</span>
              </div>
              <div className="contract-view-field">
                <label>Template Name</label>
                <span>{template.templateName}</span>
              </div>
              <div className="contract-view-field">
                <label>Agreement Category</label>
                <span>{template.agreementCategory || '-'}</span>
              </div>
              <div className="contract-view-field">
                <label>Status</label>
                <span>
                  <StatusBadge status={template.status} />
                </span>
              </div>
              <div className="contract-view-field">
                <label>Created Date</label>
                <span>{formatDate(template.createdOn)}</span>
              </div>
            </div>
          </div>
          {template.templateDescription && (
            <div className="contract-view-section">
              <h3 className="contract-view-section-title">Description</h3>
              <p style={{ margin: 0, color: '#1e293b', lineHeight: '1.6' }}>{template.templateDescription}</p>
            </div>
          )}
        </div>

        <div className="ra-assignment-modal-footer">
          <button type="button" className="ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Status Badge Component for View Modal
const StatusBadge = ({ status }: { status: 'Active' | 'Inactive' }) => {
  const statusClass = `status-badge status-badge--${status.toLowerCase()}`;
  return <span className={statusClass}>{status}</span>;
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
              <div className="ra-filter-subtitle">Filter templates by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
            <div className="ra-filter-field">
              <label>Template Code</label>
              <input
                type="text"
                value={draft.templateCode}
                onChange={(e) => setDraft({ ...draft, templateCode: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter template code"
              />
            </div>

            <div className="ra-filter-field">
              <label>Template Name</label>
              <input
                type="text"
                value={draft.templateName}
                onChange={(e) => setDraft({ ...draft, templateName: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter template name"
              />
            </div>

            <div className="ra-filter-field">
              <label>Agreement Category</label>
              <input
                type="text"
                value={draft.agreementCategory}
                onChange={(e) => setDraft({ ...draft, agreementCategory: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter category"
              />
            </div>

            <div className="ra-filter-field">
              <label>Status</label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="ra-filter-select"
              >
                <option value="All">All Status</option>
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
              setDraftStatus('All');
              setDraft({ templateCode: '', templateName: '', agreementCategory: '', status: '' });
              onClear();
            }}
          >
            Clear All
          </button>
          <button
            type="button"
            className="ra-btn ra-btn--primary ra-btn--sm"
            onClick={() => onApply({ statusFilter: draftStatus, advancedFilters: draft })}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgreementTemplatePage;

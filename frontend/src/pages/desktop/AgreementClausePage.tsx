import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { useAgreementClauseFilters, AgreementClause } from '../../hooks/useAgreementClauseFilters';
import { agreementClauseService, AgreementClauseResponse } from '../../services/agreementClauseService';
import { agreementTemplateService, AgreementTemplateResponse } from '../../services/agreementTemplateService';
import { placeholderMasterService, PlaceholderMasterResponse } from '../../services/placeholderMasterService';
import PageHeader from '../../components/layout/PageHeader';
import './agreementClausePage.css';
import '../desktop/dashboardPage.css';
import '../desktop/routeAssignmentPage.css';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';

interface AgreementTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  status: 'Active' | 'Inactive';
}

interface AdvancedFilters {
  agreementTemplateId: string;
  pointNum: string;
  pointTitle: string;
  status: string;
}

const AgreementClausePage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingClause, setEditingClause] = useState<AgreementClause | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    agreementTemplateId: '',
    pointNum: '',
    pointTitle: '',
    status: '',
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // State variables for agreement templates and clauses loaded from API
  const [agreementTemplates, setAgreementTemplates] = useState<AgreementTemplate[]>([]);
  const [clauses, setClauses] = useState<AgreementClause[]>([]);

  // Load agreement templates from API
  const loadAgreementTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agreementTemplateService.getAllAgreementTemplates();
      setAgreementTemplates(data.map(t => ({
        id: t.id,
        templateCode: t.templateCode,
        templateName: t.templateName,
        status: t.status,
      })));
    } catch (err: any) {
      console.error('Failed to load agreement templates:', err);
      setError(err.message || 'Failed to load agreement templates');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load clauses from API
  const loadClauses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const templateIdParam = advancedFilters.agreementTemplateId || undefined;
      const statusParam = statusFilter !== 'All' ? statusFilter : undefined;
      
      const data = await agreementClauseService.getAllClauses(templateIdParam, statusParam);
      
      // Map API response to AgreementClause interface
      const mappedClauses: AgreementClause[] = data.map((clause: AgreementClauseResponse) => {
        const template = agreementTemplates.find(t => t.id === clause.agreementTemplateId);
        return {
          id: clause.id,
          agreementClauseID: clause.agreementClauseID,
          agreementTemplateId: clause.agreementTemplateId,
          agreementTemplateName: template ? `${template.templateCode} – ${template.templateName}` : (clause.agreementTemplateName || clause.agreementTemplateId),
          pointNum: clause.pointNum,
          pointTitle: clause.pointTitle,
          pointText: clause.pointText,
          sequenceNo: clause.sequenceNo,
          status: clause.status,
        };
      });
      
      // Sort by template name and sequence number
      mappedClauses.sort((a, b) => {
        const templateA = a.agreementTemplateName || a.agreementTemplateId;
        const templateB = b.agreementTemplateName || b.agreementTemplateId;
        if (templateA !== templateB) {
          return templateA.localeCompare(templateB);
        }
        return a.sequenceNo - b.sequenceNo;
      });
      
      setClauses(mappedClauses);
    } catch (err: any) {
      console.error('Failed to load clauses:', err);
      setError(err.message || 'Failed to load clauses');
      toast.error(err.message || 'Failed to load clauses');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, advancedFilters.agreementTemplateId, agreementTemplates]);

  // Load agreement templates on mount
  useEffect(() => {
    loadAgreementTemplates();
  }, [loadAgreementTemplates]);

  // Load clauses when templates are loaded or filters change
  useEffect(() => {
    // Load clauses - templates might be empty initially, but clauses can still load
    loadClauses();
  }, [loadClauses]);

  // Use custom hook for filtering logic
  const { filteredClauses } = useAgreementClauseFilters({
    clauses,
    searchQuery,
    statusFilter,
    advancedFilters,
  });

  // Handle Edit
  const handleEdit = (clause: AgreementClause) => {
    setEditingClause(clause);
    setShowCreateModal(true);
  };

  // Handle Move Up
  const handleMoveUp = async (clause: AgreementClause) => {
    // Use all clauses (not filtered) to ensure proper ordering
    const sameTemplateClauses = clauses.filter(c => c.agreementTemplateId === clause.agreementTemplateId);
    const sortedSameTemplateClauses = [...sameTemplateClauses].sort((a, b) => a.sequenceNo - b.sequenceNo);
    const currentIndex = sortedSameTemplateClauses.findIndex(c => c.id === clause.id);
    
    if (currentIndex > 0) {
      const prevClause = sortedSameTemplateClauses[currentIndex - 1];
      try {
        setLoading(true);
        setError(null);
        // Swap sequence numbers
        await agreementClauseService.reorderClause(clause.id, prevClause.sequenceNo);
        await agreementClauseService.reorderClause(prevClause.id, clause.sequenceNo);
        // Reload clauses after reorder
        await loadClauses();
      } catch (err: any) {
        console.error('Failed to reorder clause:', err);
        setError(err.message || 'Failed to reorder clause');
        toast.error(err.message || 'Failed to reorder clause');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Move Down
  const handleMoveDown = async (clause: AgreementClause) => {
    // Use all clauses (not filtered) to ensure proper ordering
    const sameTemplateClauses = clauses.filter(c => c.agreementTemplateId === clause.agreementTemplateId);
    const sortedSameTemplateClauses = [...sameTemplateClauses].sort((a, b) => a.sequenceNo - b.sequenceNo);
    const currentIndex = sortedSameTemplateClauses.findIndex(c => c.id === clause.id);
    
    if (currentIndex < sortedSameTemplateClauses.length - 1) {
      const nextClause = sortedSameTemplateClauses[currentIndex + 1];
      try {
        setLoading(true);
        setError(null);
        // Swap sequence numbers
        await agreementClauseService.reorderClause(clause.id, nextClause.sequenceNo);
        await agreementClauseService.reorderClause(nextClause.id, clause.sequenceNo);
        // Reload clauses after reorder
        await loadClauses();
      } catch (err: any) {
        console.error('Failed to reorder clause:', err);
        setError(err.message || 'Failed to reorder clause');
        toast.error(err.message || 'Failed to reorder clause');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Save
  const handleSave = async (data: Partial<AgreementClause>) => {
    try {
      setSaving(true);
      setError(null);

      // Validate point number uniqueness per template
      if (data.pointNum && data.agreementTemplateId) {
        const existingClause = clauses.find(
          c => c.agreementTemplateId === data.agreementTemplateId && 
          c.pointNum === data.pointNum && 
          c.id !== editingClause?.id
        );
        if (existingClause) {
          throw new Error(`Point number ${data.pointNum} already exists for this agreement template.`);
        }
      }

      if (editingClause) {
        await agreementClauseService.updateClause(editingClause.id, {
          pointNum: data.pointNum,
          pointTitle: data.pointTitle,
          pointText: data.pointText,
          sequenceNo: data.sequenceNo,
        });
      } else {
        const maxSeq = clauses
          .filter(c => c.agreementTemplateId === data.agreementTemplateId)
          .reduce((max, c) => Math.max(max, c.sequenceNo), 0);
        
        await agreementClauseService.createClause({
          agreementTemplateId: data.agreementTemplateId!,
          pointNum: data.pointNum!,
          pointTitle: data.pointTitle!,
          pointText: data.pointText!,
          sequenceNo: maxSeq + 1,
        });
      }
      
      setShowCreateModal(false);
      setEditingClause(null);
      // Reload clauses after save
      await loadClauses();
    } catch (err: any) {
      console.error('Failed to save clause:', err);
      setError(err.message || 'Failed to save clause');
      toast.error(err.message || 'Failed to save clause');
    } finally {
      setSaving(false);
    }
  };

  // Truncated Point Text component with tooltip
  const TruncatedText = ({ text, maxLength = 50 }: { text: string; maxLength?: number }) => {
    const truncated = text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    const needsTooltip = text.length > maxLength;
    
    return (
      <span 
        className="point-text-cell"
        title={needsTooltip ? text : undefined}
        style={{ cursor: needsTooltip ? 'help' : 'default' }}
      >
        {truncated}
      </span>
    );
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: AgreementClause['status'] }) => {
    const statusClass = `clause-status-badge clause-status-badge--${status.toLowerCase()}`;
    return (
      <span className={statusClass} role="status" aria-label={`Status: ${status}`}>
        {status}
      </span>
    );
  };

  // Actions component
  const ActionsCell = ({ clause }: { clause: AgreementClause }) => {
    // Use all clauses (not filtered) to find index for same template to ensure proper ordering
    const sameTemplateClauses = clauses.filter(c => c.agreementTemplateId === clause.agreementTemplateId);
    // Sort by sequenceNo to ensure correct order
    const sortedSameTemplateClauses = [...sameTemplateClauses].sort((a, b) => a.sequenceNo - b.sequenceNo);
    const currentIndex = sortedSameTemplateClauses.findIndex(c => c.id === clause.id);
    const canMoveUp = currentIndex > 0;
    const canMoveDown = currentIndex < sortedSameTemplateClauses.length - 1;

    return (
      <div className="clause-action-buttons" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button
          className="action-btn action-btn--edit"
          onClick={() => handleEdit(clause)}
          title="Edit Clause"
          aria-label={`Edit clause ${clause.pointTitle}`}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button
          className="action-btn action-btn--up"
          onClick={() => handleMoveUp(clause)}
          disabled={!canMoveUp}
          title={canMoveUp ? "Move Up" : "Already at the top"}
          aria-label={`Move clause ${clause.pointTitle} up`}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button
          className="action-btn action-btn--down"
          onClick={() => handleMoveDown(clause)}
          disabled={!canMoveDown}
          title={canMoveDown ? "Move Down" : "Already at the bottom"}
          aria-label={`Move clause ${clause.pointTitle} down`}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    );
  };

  const handleAdd = () => {
    setEditingClause(null);
    setShowCreateModal(true);
  };

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
          title="Agreement Clause Management"
          subtitle="Manage agreement clauses and points"
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
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Agreement Clause Management</h1>
              <p className="ra-page-subtitle">Manage and organize agreement clauses and points</p>
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
                placeholder="Search by agreement, point number, title..."
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
              <button className="ra-add-btn" onClick={handleAdd} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Clause
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="ra-alert ra-alert--error">
              <span>{error}</span>
              <button className="ra-alert-close" onClick={() => setError(null)}>×</button>
            </div>
          )}

          {/* Table Container */}
          <div className="route-assignment-table-container">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Loading clauses...
              </div>
            ) : filteredClauses.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style={{ fontSize: '14px', margin: 0 }}>No clauses found for the selected filters</p>
              </div>
            ) : (
              <table className="route-assignment-table">
                <thead>
                  <tr>
                    <th>Agreement Template Name</th>
                    <th>Sequence</th>
                    <th>Point Number</th>
                    <th>Point Title</th>
                    <th>Point Text</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClauses.map((clause) => {
                    return (
                      <tr key={clause.id}>
                        <td className="clause-agreement-cell">
                          {clause.agreementTemplateName || clause.agreementTemplateId}
                        </td>
                        <td className="ra-cell-center">
                          <span className="sequence-cell">{clause.sequenceNo}</span>
                        </td>
                        <td>{clause.pointNum}</td>
                        <td>{clause.pointTitle || '-'}</td>
                        <td>
                          <TruncatedText text={clause.pointText} maxLength={80} />
                        </td>
                        <td>
                          <StatusBadge status={clause.status} />
                        </td>
                        <td>
                          <ActionsCell clause={clause} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="route-assignment-pagination-info">
            Showing {filteredClauses.length} of {clauses.length} items
          </div>
        </div>
      </main>

      {/* Create/Edit Clause Modal */}
      {showCreateModal && (
        <ClauseFormModal
          clause={editingClause}
          agreementTemplates={agreementTemplates}
          clauses={clauses}
          saving={saving}
          onClose={() => {
            setShowCreateModal(false);
            setEditingClause(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          statusFilter={statusFilter}
          advancedFilters={advancedFilters}
          agreementTemplates={agreementTemplates}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setStatusFilter('All');
            setAdvancedFilters({
              agreementTemplateId: '',
              pointNum: '',
              pointTitle: '',
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

// Clause Form Modal
interface ClauseFormModalProps {
  clause: AgreementClause | null;
  agreementTemplates: AgreementTemplate[];
  clauses: AgreementClause[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<AgreementClause>) => void;
}

const ClauseFormModal = ({ clause, agreementTemplates, clauses, saving, onClose, onSave }: ClauseFormModalProps) => {
  const [formData, setFormData] = useState<Partial<AgreementClause>>(
    clause || {
      agreementTemplateId: '',
      pointNum: '',
      pointTitle: '',
      pointText: '',
      sequenceNo: 0,
      status: 'Active',
    }
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [placeholders, setPlaceholders] = useState<PlaceholderMasterResponse[]>([]);
  const [loadingPlaceholders, setLoadingPlaceholders] = useState(false);

  // Load placeholders when modal opens
  useEffect(() => {
    const loadPlaceholders = async () => {
      try {
        setLoadingPlaceholders(true);
        const data = await placeholderMasterService.getAllPlaceholderMasters(true);
        setPlaceholders(data);
      } catch (err) {
        console.error('Failed to load placeholders:', err);
      } finally {
        setLoadingPlaceholders(false);
      }
    };
    loadPlaceholders();
  }, []);

  const handlePlaceholderClick = (placeholderCode: string) => {
    const placeholderText = `{{${placeholderCode}}}`;
    const currentText = formData.pointText || '';
    const newText = currentText + (currentText ? ' ' : '') + placeholderText;
    setFormData({ ...formData, pointText: newText });
  };

  const validatePointNumber = (pointNum: string, agreementTemplateId: string): boolean => {
    if (!pointNum || !agreementTemplateId) return true; // Allow empty during editing
    
    const existingClause = clauses.find(
      c => c.agreementTemplateId === agreementTemplateId && 
      c.pointNum === pointNum && 
      c.id !== clause?.id
    );
    
    if (existingClause) {
      setValidationError(`Point number ${pointNum} already exists for this agreement template.`);
      return false;
    }
    
    setValidationError(null);
    return true;
  };

  const handlePointNumChange = (value: string) => {
    setFormData({ ...formData, pointNum: value });
    if (formData.agreementTemplateId) {
      validatePointNumber(value, formData.agreementTemplateId);
    }
  };

  const handleTemplateChange = (value: string) => {
    setFormData({ ...formData, agreementTemplateId: value, pointNum: '' });
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreementTemplateId || !formData.pointText || !formData.pointNum) {
      toast.error('Please complete the required fields.');
      return;
    }

    if (!validatePointNumber(formData.pointNum, formData.agreementTemplateId)) {
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
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">{clause ? 'Edit Agreement Clause' : 'Add Agreement Clause'}</h2>
              <p className="ra-assignment-modal-subtitle">
                {clause ? 'Update clause details' : 'Create a new agreement clause record.'}
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
              <label htmlFor="agreement-template">
                Agreement Template <span className="ra-required">*</span>
              </label>
              <select
                id="agreement-template"
                value={formData.agreementTemplateId || ''}
                onChange={(e) => handleTemplateChange(e.target.value)}
                required
                disabled={!!clause || saving}
                className="ra-assignment-select"
              >
                <option value="">Select Agreement Template</option>
                {agreementTemplates
                  .filter(t => t.status === 'Active')
                  .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.templateCode} – {template.templateName}
                  </option>
                ))}
              </select>
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="point-num">
                Point Number <span className="ra-required">*</span>
              </label>
              <input
                id="point-num"
                type="text"
                value={formData.pointNum || ''}
                onChange={(e) => handlePointNumChange(e.target.value)}
                placeholder="e.g., 1, 2, 3"
                required
                disabled={saving}
                className="ra-assignment-input"
              />
              {validationError && (
                <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {validationError}
                </span>
              )}
              <small style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Must be unique per agreement template
              </small>
            </div>
            <div className="ra-assignment-form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="point-title">Point Title</label>
              <input
                id="point-title"
                type="text"
                value={formData.pointTitle || ''}
                onChange={(e) => setFormData({ ...formData, pointTitle: e.target.value })}
                disabled={saving}
                placeholder="Optional: For reference only (not printed in PDF)"
                className="ra-assignment-input"
              />
            </div>
            <div className="ra-assignment-form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="point-text">
                Point Text <span className="ra-required">*</span>
              </label>
              <textarea
                id="point-text"
                value={formData.pointText || ''}
                onChange={(e) => setFormData({ ...formData, pointText: e.target.value })}
                required
                disabled={saving}
                placeholder="Enter the clause text... Use {{PLACEHOLDER_CODE}} for dynamic fields"
                rows={4}
                className="ra-assignment-input"
                style={{ height: 'auto', minHeight: '100px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Available Dynamic Fields Section */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
              Available Dynamic Fields
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
              Click on a placeholder to insert it into the Point Text field. Format: {'{{PLACEHOLDER_CODE}}'}
            </p>
            {loadingPlaceholders ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>Loading placeholders...</div>
            ) : placeholders.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>No active placeholders available</div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '8px',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}>
                {placeholders.map((placeholder) => (
                  <button
                    key={placeholder.id}
                    type="button"
                    onClick={() => handlePlaceholderClick(placeholder.placeholderCode)}
                    disabled={saving}
                    style={{
                      padding: '8px 12px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      fontSize: '12px',
                      transition: 'all 0.2s',
                      opacity: saving ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#0f172a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!saving) {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                    title={`${placeholder.placeholderDescription} (${placeholder.sourceTable}.${placeholder.sourceColumn})`}
                  >
                    <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                      {'{{'}{placeholder.placeholderCode}{'}}'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {placeholder.placeholderDescription}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ra-assignment-modal-footer">
            <button type="button" className="ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="ra-assignment-btn ra-assignment-btn--primary" disabled={saving || !!validationError}>
              {saving ? 'Saving...' : (clause ? 'Update' : 'Save')}
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
  agreementTemplates: AgreementTemplate[];
  onClose: () => void;
  onClear: () => void;
  onApply: (payload: { statusFilter: string; advancedFilters: AdvancedFilters }) => void;
}

const AdvancedFiltersModal = ({
  statusFilter,
  advancedFilters,
  agreementTemplates,
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
              <div className="ra-filter-subtitle">Filter clauses by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
            <div className="ra-filter-field">
              <label>Agreement Template</label>
              <select
                value={draft.agreementTemplateId}
                onChange={(e) => setDraft({ ...draft, agreementTemplateId: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Templates</option>
                {agreementTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.templateCode} – {template.templateName}
                  </option>
                ))}
              </select>
            </div>

            <div className="ra-filter-field">
              <label>Point Number</label>
              <input
                type="text"
                value={draft.pointNum}
                onChange={(e) => setDraft({ ...draft, pointNum: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter point number"
              />
            </div>

            <div className="ra-filter-field">
              <label>Point Title</label>
              <input
                type="text"
                value={draft.pointTitle}
                onChange={(e) => setDraft({ ...draft, pointTitle: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter point title"
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
              setDraft({ agreementTemplateId: '', pointNum: '', pointTitle: '', status: '' });
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

export default AgreementClausePage;

import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { useAgreementClauseFilters, AgreementClause } from '../../hooks/useAgreementClauseFilters';
import { agreementClauseService, AgreementClauseResponse } from '../../services/agreementClauseService';
import { agreementService, AgreementResponse } from '../../services/agreementService';
import PageHeader from '../../components/layout/PageHeader';
import './agreementClausePage.css';
import '../desktop/dashboardPage.css';

interface Agreement {
  id: string;
  agreementID: string;
  agreementNum: string;
  status: 'Draft' | 'Generated' | 'Signed';
}

interface AdvancedFilters {
  agreementID: string;
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
    agreementID: '',
    pointNum: '',
    pointTitle: '',
    status: '',
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // State variables for agreements and clauses loaded from API
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [clauses, setClauses] = useState<AgreementClause[]>([]);

  // Load agreements from API
  const loadAgreements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agreementService.getAllAgreements();
      setAgreements(data.map(a => ({
        id: a.id,
        agreementID: a.agreementID,
        agreementNum: a.agreementNum,
        status: a.status,
      })));
    } catch (err: any) {
      console.error('Failed to load agreements:', err);
      setError(err.message || 'Failed to load agreements');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load clauses from API
  const loadClauses = useCallback(async (currentAgreements: Agreement[]) => {
    try {
      setLoading(true);
      setError(null);
      const agreementIdParam = advancedFilters.agreementID 
        ? currentAgreements.find(a => a.agreementID === advancedFilters.agreementID)?.id 
        : undefined;
      const statusParam = statusFilter !== 'All' ? statusFilter : undefined;
      
      const data = await agreementClauseService.getAllClauses(agreementIdParam, statusParam);
      
      // Map API response to AgreementClause interface
      const mappedClauses: AgreementClause[] = data.map((clause: AgreementClauseResponse) => {
        const agreement = currentAgreements.find(a => a.id === clause.agreementId);
        return {
          id: clause.id,
          agreementClauseID: clause.agreementClauseID,
          agreementID: agreement?.agreementID || clause.agreementId,
          pointNum: clause.pointNum,
          pointTitle: clause.pointTitle,
          pointText: clause.pointText,
          sequenceNo: clause.sequenceNo,
          status: clause.status,
        };
      });
      
      // Sort by agreement ID and sequence number
      mappedClauses.sort((a, b) => {
        if (a.agreementID !== b.agreementID) {
          return a.agreementID.localeCompare(b.agreementID);
        }
        return a.sequenceNo - b.sequenceNo;
      });
      
      setClauses(mappedClauses);
    } catch (err: any) {
      console.error('Failed to load clauses:', err);
      setError(err.message || 'Failed to load clauses');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, advancedFilters.agreementID]);

  // Load agreements on mount
  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  // Load clauses when agreements are loaded or filters change
  useEffect(() => {
    if (agreements.length > 0) {
      loadClauses(agreements);
    }
  }, [agreements.length, statusFilter, advancedFilters.agreementID, loadClauses]);

  // Use custom hook for filtering logic
  const { filteredClauses } = useAgreementClauseFilters({
    clauses,
    searchQuery,
    statusFilter,
    advancedFilters,
  });

  // Get agreement status for a clause
  const getAgreementStatus = (agreementID: string): Agreement['status'] | null => {
    const agreement = agreements.find(a => a.agreementID === agreementID);
    if (!agreement) {
      console.warn(`Agreement not found for agreementID: ${agreementID}. Available agreements:`, agreements.map(a => a.agreementID));
    }
    return agreement?.status || null;
  };

  // Check if clause can be edited (only when agreement status is Draft)
  const canEditClause = (clause: AgreementClause): boolean => {
    const agreementStatus = getAgreementStatus(clause.agreementID);
    return agreementStatus === 'Draft';
  };

  // Handle Edit
  const handleEdit = (clause: AgreementClause) => {
    if (!canEditClause(clause)) {
      alert('Clauses can only be edited when the agreement status is Draft.');
      return;
    }
    setEditingClause(clause);
    setShowCreateModal(true);
  };

  // Handle Move Up
  const handleMoveUp = async (clause: AgreementClause) => {
    if (!canEditClause(clause)) {
      alert('Clauses can only be reordered when the agreement status is Draft.');
      return;
    }
    
    // Use all clauses (not filtered) to ensure proper ordering
    const sameAgreementClauses = clauses.filter(c => c.agreementID === clause.agreementID);
    const sortedSameAgreementClauses = [...sameAgreementClauses].sort((a, b) => a.sequenceNo - b.sequenceNo);
    const currentIndex = sortedSameAgreementClauses.findIndex(c => c.id === clause.id);
    
    if (currentIndex > 0) {
      const prevClause = sortedSameAgreementClauses[currentIndex - 1];
      try {
        setLoading(true);
        setError(null);
        // Swap sequence numbers
        await agreementClauseService.reorderClause(clause.id, prevClause.sequenceNo);
        await agreementClauseService.reorderClause(prevClause.id, clause.sequenceNo);
        // Reload clauses after reorder
        await loadClauses(agreements);
      } catch (err: any) {
        console.error('Failed to reorder clause:', err);
        setError(err.message || 'Failed to reorder clause');
        alert(err.message || 'Failed to reorder clause');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Move Down
  const handleMoveDown = async (clause: AgreementClause) => {
    if (!canEditClause(clause)) {
      alert('Clauses can only be reordered when the agreement status is Draft.');
      return;
    }
    
    // Use all clauses (not filtered) to ensure proper ordering
    const sameAgreementClauses = clauses.filter(c => c.agreementID === clause.agreementID);
    const sortedSameAgreementClauses = [...sameAgreementClauses].sort((a, b) => a.sequenceNo - b.sequenceNo);
    const currentIndex = sortedSameAgreementClauses.findIndex(c => c.id === clause.id);
    
    if (currentIndex < sortedSameAgreementClauses.length - 1) {
      const nextClause = sortedSameAgreementClauses[currentIndex + 1];
      try {
        setLoading(true);
        setError(null);
        // Swap sequence numbers
        await agreementClauseService.reorderClause(clause.id, nextClause.sequenceNo);
        await agreementClauseService.reorderClause(nextClause.id, clause.sequenceNo);
        // Reload clauses after reorder
        await loadClauses(agreements);
      } catch (err: any) {
        console.error('Failed to reorder clause:', err);
        setError(err.message || 'Failed to reorder clause');
        alert(err.message || 'Failed to reorder clause');
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

      // Validate point number uniqueness per agreement
      if (data.pointNum && data.agreementID) {
        const existingClause = clauses.find(
          c => c.agreementID === data.agreementID && 
          c.pointNum === data.pointNum && 
          c.id !== editingClause?.id
        );
        if (existingClause) {
          throw new Error(`Point number ${data.pointNum} already exists for this agreement.`);
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
          .filter(c => c.agreementID === data.agreementID)
          .reduce((max, c) => Math.max(max, c.sequenceNo), 0);
        
        // Find agreement by agreementID to get the UUID
        const agreement = agreements.find(a => a.agreementID === data.agreementID);
        if (!agreement) {
          throw new Error('Agreement not found');
        }
        
        await agreementClauseService.createClause({
          agreementId: agreement.id,
          pointNum: data.pointNum!,
          pointTitle: data.pointTitle!,
          pointText: data.pointText!,
          sequenceNo: maxSeq + 1,
        });
      }
      
      setShowCreateModal(false);
      setEditingClause(null);
      // Reload clauses after save
      await loadClauses(agreements);
    } catch (err: any) {
      console.error('Failed to save clause:', err);
      setError(err.message || 'Failed to save clause');
      alert(err.message || 'Failed to save clause');
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
    const agreementStatus = getAgreementStatus(clause.agreementID);
    const canEdit = agreementStatus === 'Draft';
    // Use all clauses (not filtered) to find index for same agreement to ensure proper ordering
    const sameAgreementClauses = clauses.filter(c => c.agreementID === clause.agreementID);
    // Sort by sequenceNo to ensure correct order
    const sortedSameAgreementClauses = [...sameAgreementClauses].sort((a, b) => a.sequenceNo - b.sequenceNo);
    const currentIndex = sortedSameAgreementClauses.findIndex(c => c.id === clause.id);
    const canMoveUp = canEdit && currentIndex > 0;
    const canMoveDown = canEdit && currentIndex < sortedSameAgreementClauses.length - 1;

    // Create tooltip messages
    const editTooltip = canEdit 
      ? "Edit Clause" 
      : `Edit only available when agreement status is Draft. Current status: ${agreementStatus || 'Unknown'}`;
    const moveUpTooltip = canMoveUp 
      ? "Move Up" 
      : !canEdit 
        ? `Move Up only available when agreement status is Draft. Current status: ${agreementStatus || 'Unknown'}`
        : "Already at the top";
    const moveDownTooltip = canMoveDown 
      ? "Move Down" 
      : !canEdit 
        ? `Move Down only available when agreement status is Draft. Current status: ${agreementStatus || 'Unknown'}`
        : "Already at the bottom";

    return (
      <div className="clause-action-buttons" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button
          className="action-btn action-btn--edit"
          onClick={() => handleEdit(clause)}
          title={editTooltip}
          aria-label={`Edit clause ${clause.pointTitle}`}
          disabled={!canEdit}
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
          title={moveUpTooltip}
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
          title={moveDownTooltip}
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
                    <th>Agreement ID</th>
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
                    const agreement = agreements.find(a => a.agreementID === clause.agreementID);
                    return (
                      <tr key={clause.id}>
                        <td className="clause-agreement-cell">
                          {agreement 
                            ? `${clause.agreementID} - ${agreement.agreementNum}`
                            : clause.agreementID}
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
          agreements={agreements}
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
          agreements={agreements}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setStatusFilter('All');
            setAdvancedFilters({
              agreementID: '',
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
  agreements: Agreement[];
  clauses: AgreementClause[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<AgreementClause>) => void;
}

const ClauseFormModal = ({ clause, agreements, clauses, saving, onClose, onSave }: ClauseFormModalProps) => {
  const [formData, setFormData] = useState<Partial<AgreementClause>>(
    clause || {
      agreementID: '',
      pointNum: '',
      pointTitle: '',
      pointText: '',
      sequenceNo: 0,
      status: 'Active',
    }
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const validatePointNumber = (pointNum: string, agreementID: string): boolean => {
    if (!pointNum || !agreementID) return true; // Allow empty during editing
    
    const existingClause = clauses.find(
      c => c.agreementID === agreementID && 
      c.pointNum === pointNum && 
      c.id !== clause?.id
    );
    
    if (existingClause) {
      setValidationError(`Point number ${pointNum} already exists for this agreement.`);
      return false;
    }
    
    setValidationError(null);
    return true;
  };

  const handlePointNumChange = (value: string) => {
    setFormData({ ...formData, pointNum: value });
    if (formData.agreementID) {
      validatePointNumber(value, formData.agreementID);
    }
  };

  const handleAgreementChange = (value: string) => {
    setFormData({ ...formData, agreementID: value, pointNum: '' });
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreementID || !formData.pointText || !formData.pointNum) {
      alert('Please fill in all required fields');
      return;
    }

    if (!validatePointNumber(formData.pointNum, formData.agreementID)) {
      return;
    }

    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{clause ? 'Edit Agreement Clause' : 'Add Agreement Clause'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="clause-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Clause Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Agreement ID *</label>
                <select
                  value={formData.agreementID || ''}
                  onChange={(e) => handleAgreementChange(e.target.value)}
                  required
                  disabled={!!clause || saving}
                >
                  <option value="">Select Agreement</option>
                  {agreements.map((agreement) => (
                    <option key={agreement.id} value={agreement.agreementID}>
                      {agreement.agreementID} - {agreement.agreementNum}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Point Number *</label>
                <input
                  type="text"
                  value={formData.pointNum || ''}
                  onChange={(e) => handlePointNumChange(e.target.value)}
                  placeholder="e.g., 1, 2, 3"
                  required
                  disabled={saving}
                />
                {validationError && (
                  <span className="form-error" style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {validationError}
                  </span>
                )}
                <p className="form-help-text" style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Must be unique per agreement
                </p>
              </div>
              <div className="form-group form-group--full">
                <label>Point Title</label>
                <input
                  type="text"
                  value={formData.pointTitle || ''}
                  onChange={(e) => setFormData({ ...formData, pointTitle: e.target.value })}
                  disabled={saving}
                  placeholder="Optional: For reference only (not printed in PDF)"
                />
              </div>
              <div className="form-group form-group--full">
                <label>Point Text *</label>
                <textarea
                  value={formData.pointText || ''}
                  onChange={(e) => setFormData({ ...formData, pointText: e.target.value })}
                  required
                  disabled={saving}
                  placeholder="Enter the clause text..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving || !!validationError}>
              {saving ? 'Saving...' : (clause ? 'Update' : 'Add')} Clause
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
  agreements: Agreement[];
  onClose: () => void;
  onClear: () => void;
  onApply: (payload: { statusFilter: string; advancedFilters: AdvancedFilters }) => void;
}

const AdvancedFiltersModal = ({
  statusFilter,
  advancedFilters,
  agreements,
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
              <label>Agreement ID</label>
              <select
                value={draft.agreementID}
                onChange={(e) => setDraft({ ...draft, agreementID: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Agreements</option>
                {agreements.map((agreement) => (
                  <option key={agreement.id} value={agreement.agreementID}>
                    {agreement.agreementID} - {agreement.agreementNum}
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
              setDraft({ agreementID: '', pointNum: '', pointTitle: '', status: '' });
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

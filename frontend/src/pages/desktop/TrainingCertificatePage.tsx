import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { trainingCertificateService, TrainingCertificateResponse } from '../../services/trainingCertificateService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import PageHeader from '../../components/layout/PageHeader';
import './trainingCertificatePage.css';
import '../desktop/dashboardPage.css';

interface TrainingCertificate {
  id: string;
  certificateNo: string;
  staffName: string;
  staffCode: string;
  designation: string;
  hcfCode: string; // Display code
  hcfId: string; // Backend ID
  trainingDate: string;
  status: 'Active' | 'Inactive';
  companyName: string; // Display name
  companyId: string; // Backend ID
  trainedBy: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

interface AdvancedFilters {
  companyId: string;
  hcfCode: string;
  staffName: string;
  staffCode: string;
  trainingDateFrom: string;
  trainingDateTo: string;
  status: string;
}

const TrainingCertificatePage = () => {
  const { logout, user, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('All');
  const [hcfFilter, setHcfFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    companyId: '',
    hcfCode: '',
    staffName: '',
    staffCode: '',
    trainingDateFrom: '',
    trainingDateTo: '',
    status: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<TrainingCertificate | null>(null);
  const [viewingCertificate, setViewingCertificate] = useState<TrainingCertificate | null>(null);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Master data
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [hcfs, setHcfs] = useState<HcfResponse[]>([]);
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([]);

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
  const loadHcfs = useCallback(async (companyId?: string) => {
    try {
      const data = await hcfService.getAllHcfs(companyId, true);
      setHcfs(data);
    } catch (err: any) {
      console.error('Failed to load HCFs:', err);
      setError('Failed to load HCFs');
    }
  }, []);

  // Load certificates
  const loadCertificates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const companyId = companyFilter !== 'All' 
        ? companies.find(c => c.companyName === companyFilter)?.id 
        : undefined;
      
      const filters: any = {};
      if (hcfFilter !== 'All') {
        const hcf = hcfs.find(h => h.hcfCode === hcfFilter);
        if (hcf) filters.hcfId = hcf.id;
      }
      if (statusFilter !== 'All') {
        filters.status = statusFilter;
      }
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (searchQuery) filters.search = searchQuery;

      const data = await trainingCertificateService.getAllCertificates(
        companyId,
        false,
        Object.keys(filters).length > 0 ? filters : undefined
      );

      // Map backend data to frontend format
      const mappedCertificates: TrainingCertificate[] = data.map(cert => {
        const company = companies.find(c => c.id === cert.companyId);
        const hcf = hcfs.find(h => h.id === cert.hcfId);
        return {
          id: cert.id,
          certificateNo: cert.certificateNo,
          staffName: cert.staffName,
          staffCode: cert.staffCode,
          designation: cert.designation || '',
          hcfCode: hcf?.hcfCode || '',
          hcfId: cert.hcfId,
          trainingDate: cert.trainingDate,
          status: cert.status,
          companyName: company?.companyName || '',
          companyId: cert.companyId,
          trainedBy: cert.trainedBy,
          createdBy: cert.createdBy || '',
          createdOn: cert.createdOn,
          modifiedBy: cert.modifiedBy || '',
          modifiedOn: cert.modifiedOn,
        };
      });
      setCertificates(mappedCertificates);
    } catch (err: any) {
      console.error('Failed to load certificates:', err);
      setError(err.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, [companyFilter, hcfFilter, statusFilter, dateFrom, dateTo, searchQuery, companies, hcfs]);

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      await loadCompanies();
      await loadHcfs();
    };
    initialize();
  }, [loadCompanies, loadHcfs]);

  // Reload certificates when filters change
  useEffect(() => {
    if (companies.length > 0 && hcfs.length > 0) {
      loadCertificates();
    }
  }, [companyFilter, hcfFilter, statusFilter, dateFrom, dateTo, searchQuery, companies, hcfs, loadCertificates]);

  // Reload HCFs when company filter changes
  useEffect(() => {
    if (companyFilter !== 'All') {
      const company = companies.find(c => c.companyName === companyFilter);
      if (company) {
        loadHcfs(company.id);
      }
    } else {
      loadHcfs();
    }
  }, [companyFilter, companies, loadHcfs]);

  // Client-side filtering with advanced filters
  const filteredCertificates = certificates.filter((certificate) => {
    // Search query filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      certificate.certificateNo.toLowerCase().includes(searchLower) ||
      certificate.staffName.toLowerCase().includes(searchLower) ||
      certificate.staffCode.toLowerCase().includes(searchLower) ||
      certificate.hcfCode.toLowerCase().includes(searchLower);

    // Advanced filters
    const matchesCompany = !advancedFilters.companyId || certificate.companyId === advancedFilters.companyId;
    const matchesHcfCode = !advancedFilters.hcfCode || certificate.hcfCode.toLowerCase().includes(advancedFilters.hcfCode.toLowerCase());
    const matchesStaffName = !advancedFilters.staffName || certificate.staffName.toLowerCase().includes(advancedFilters.staffName.toLowerCase());
    const matchesStaffCode = !advancedFilters.staffCode || certificate.staffCode.toLowerCase().includes(advancedFilters.staffCode.toLowerCase());
    const matchesDateFrom = !advancedFilters.trainingDateFrom || certificate.trainingDate >= advancedFilters.trainingDateFrom;
    const matchesDateTo = !advancedFilters.trainingDateTo || certificate.trainingDate <= advancedFilters.trainingDateTo;
    const matchesStatus = !advancedFilters.status || certificate.status === advancedFilters.status;

    return matchesSearch && matchesCompany && matchesHcfCode && matchesStaffName && matchesStaffCode && matchesDateFrom && matchesDateTo && matchesStatus;
  });

  const handleCreate = () => {
    setEditingCertificate(null);
    setShowCreateModal(true);
  };

  const handleView = (certificate: TrainingCertificate) => {
    setViewingCertificate(certificate);
    setShowViewModal(true);
  };

  const handleEdit = (certificate: TrainingCertificate) => {
    if (certificate.status === 'Active') {
      setEditingCertificate(certificate);
      setShowCreateModal(true);
    } else {
      alert('Only Active certificates can be edited.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this certificate?')) {
      try {
        setLoading(true);
        await trainingCertificateService.deleteCertificate(id);
        await loadCertificates();
      } catch (err: any) {
        console.error('Failed to delete certificate:', err);
        alert(err.message || 'Failed to delete certificate');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrint = (certificate: TrainingCertificate) => {
    window.print();
  };

  const handleExport = () => {
    alert('Export functionality will be implemented');
  };

  const handleSave = async (data: Partial<TrainingCertificate>) => {
    try {
      setSaving(true);
      setError(null);

      if (editingCertificate) {
        // Update existing certificate
        const updateData: any = {};
        if (data.staffName !== undefined) updateData.staffName = data.staffName;
        if (data.staffCode !== undefined) updateData.staffCode = data.staffCode;
        if (data.designation !== undefined) updateData.designation = data.designation;
        if (data.hcfId !== undefined) updateData.hcfId = data.hcfId;
        if (data.trainingDate !== undefined) updateData.trainingDate = data.trainingDate;
        if (data.trainedBy !== undefined) updateData.trainedBy = data.trainedBy;
        if (data.status !== undefined) updateData.status = data.status;

        await trainingCertificateService.updateCertificate(editingCertificate.id, updateData);
      } else {
        // Create new certificate
        const company = companies.find(c => c.companyName === data.companyName);
        if (!company) {
          throw new Error('Company not found');
        }
        if (!data.hcfId) {
          throw new Error('HCF is required');
        }
        if (!data.certificateNo) {
          throw new Error('Certificate number is required');
        }

        await trainingCertificateService.createCertificate({
          certificateNo: data.certificateNo || generateCertificateNo(),
          staffName: data.staffName || '',
          staffCode: data.staffCode || '',
          designation: data.designation,
          hcfId: data.hcfId,
          trainingDate: data.trainingDate || new Date().toISOString().split('T')[0],
          companyId: company.id,
          trainedBy: data.trainedBy || '',
        });
      }

      await loadCertificates();
      setShowCreateModal(false);
      setEditingCertificate(null);
    } catch (err: any) {
      console.error('Failed to save certificate:', err);
      setError(err.message || 'Failed to save certificate');
      alert(err.message || 'Failed to save certificate');
    } finally {
      setSaving(false);
    }
  };

  const generateCertificateNo = (): string => {
    const year = new Date().getFullYear();
    const count = certificates.length + 1;
    return `CERT-${year}-${count.toString().padStart(3, '0')}`;
  };

  // Map HCF by company name for display
  const getHcfsByCompany = (companyName: string) => {
    if (companyName === 'All') {
      return hcfs.filter(h => h.status === 'Active');
    }
    const company = companies.find(c => c.companyName === companyName);
    if (!company) return [];
    return hcfs.filter(h => h.companyId === company.id && h.status === 'Active');
  };

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  // Filter HCFs based on selected company
  const filteredHCFsForCompany = getHcfsByCompany(companyFilter);

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
          title="Training Certificate Management"
          subtitle="Manage training certificates and certifications"
        />

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M9 15l2 2 4-4"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Training Certificate Management</h1>
              <p className="ra-page-subtitle">Manage training certificates and certifications</p>
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
                placeholder="Search by certificate number, staff name, staff code, HCF..."
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
              <button className="ra-add-btn" onClick={handleCreate} disabled={loading} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Certificate
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
          {loading && (
            <div className="ra-alert" style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }}>
              <span>Loading certificates...</span>
            </div>
          )}

          {/* Table Container */}
          <div className="route-assignment-table-container">
            {loading && certificates.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Loading certificates...
              </div>
            ) : filteredCertificates.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style={{ fontSize: '14px', margin: 0 }}>
                  {certificates.length === 0
                    ? 'No certificate records found'
                    : 'No certificates match your search criteria'}
                </p>
              </div>
            ) : (
              <table className="route-assignment-table">
                <thead>
                  <tr>
                    <th>Certificate No</th>
                    <th>Staff Name</th>
                    <th>Staff Code</th>
                    <th>Designation</th>
                    <th>HCF Code</th>
                    <th>Training Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCertificates.map((certificate) => {
                    const hcf = hcfs.find(h => h.hcfCode === certificate.hcfCode);
                    return (
                      <tr key={certificate.id}>
                        <td className="certificate-no-cell">{certificate.certificateNo}</td>
                        <td>{certificate.staffName}</td>
                        <td>{certificate.staffCode}</td>
                        <td>{certificate.designation}</td>
                        <td>{hcf ? `${certificate.hcfCode} - ${hcf.hcfName}` : certificate.hcfCode}</td>
                        <td>{certificate.trainingDate}</td>
                        <td>
                          <span className={`certificate-status-badge certificate-status-badge--${certificate.status.toLowerCase()}`}>
                            {certificate.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleView(certificate)}
                              title="View"
                              type="button"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            {certificate.status === 'Active' && (
                              <button
                                className="action-btn action-btn--edit"
                                onClick={() => handleEdit(certificate)}
                                title="Edit"
                                type="button"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            )}
                            <button
                              className="action-btn action-btn--print"
                              onClick={() => handlePrint(certificate)}
                              title="Print"
                              type="button"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                              </svg>
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
            Showing {filteredCertificates.length} of {certificates.length} items
          </div>
        </div>
      </main>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          advancedFilters={advancedFilters}
          companies={companies.filter(c => c.status === 'Active')}
          hcfs={hcfs.filter(h => h.status === 'Active')}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setAdvancedFilters({
              companyId: '',
              hcfCode: '',
              staffName: '',
              staffCode: '',
              trainingDateFrom: '',
              trainingDateTo: '',
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

      {/* Create/Edit Certificate Modal */}
      {showCreateModal && (
        <CertificateFormModal
          certificate={editingCertificate}
          companies={companies.filter(c => c.status === 'Active')}
          hcfs={hcfs.filter(h => h.status === 'Active')}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCertificate(null);
          }}
          onSave={handleSave}
          generateCertificateNo={generateCertificateNo}
        />
      )}

      {/* View Certificate Modal */}
      {showViewModal && viewingCertificate && (
        <CertificateViewModal
          certificate={viewingCertificate}
          hcfs={hcfs}
          companies={companies}
          onClose={() => {
            setShowViewModal(false);
            setViewingCertificate(null);
          }}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
};

// Certificate Form Modal Component
interface CertificateFormModalProps {
  certificate: TrainingCertificate | null;
  companies: CompanyResponse[];
  hcfs: HcfResponse[];
  onClose: () => void;
  onSave: (data: Partial<TrainingCertificate>) => void;
  generateCertificateNo: () => string;
}

const CertificateFormModal = ({ certificate, companies, hcfs, onClose, onSave, generateCertificateNo }: CertificateFormModalProps) => {
  // Initialize form data with companyId if editing
  const getInitialFormData = (): Partial<TrainingCertificate> => {
    if (certificate) {
      // When editing, ensure companyId is set from companyName
      const company = companies.find(c => c.companyName === certificate.companyName);
      return {
        ...certificate,
        companyId: certificate.companyId || company?.id || '',
      };
    }
    return {
      certificateNo: '',
      staffName: '',
      staffCode: '',
      designation: '',
      hcfCode: '',
      hcfId: '',
      trainingDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      companyName: '',
      companyId: '',
      trainedBy: '',
    };
  };

  const [formData, setFormData] = useState<Partial<TrainingCertificate>>(getInitialFormData());

  const [certificateNoMode, setCertificateNoMode] = useState<'auto' | 'manual'>(certificate ? 'manual' : 'auto');

  // Update companyId when companies load or when companyName changes
  useEffect(() => {
    if (formData.companyName && !formData.companyId && companies.length > 0) {
      const company = companies.find(c => c.companyName === formData.companyName);
      if (company) {
        setFormData(prev => ({ ...prev, companyId: company.id }));
      }
    }
  }, [formData.companyName, companies.length]);

  // Filter HCFs based on selected company (check both companyId and companyName)
  const filteredHCFs = (() => {
    if (!formData.companyId && !formData.companyName) {
      return [];
    }
    
    // Find company by ID or name
    const selectedCompany = formData.companyId 
      ? companies.find(c => c.id === formData.companyId)
      : companies.find(c => c.companyName === formData.companyName);
    
    if (!selectedCompany) {
      return [];
    }
    
    // Filter HCFs by company ID (hcfs are already filtered by status in parent)
    const filtered = hcfs.filter(hcf => hcf.companyId === selectedCompany.id);
    
    return filtered;
  })();

  const handleFieldChange = (field: string, value: string) => {
    const updates: any = { [field]: value };
    
    // When company name changes, also update companyId and clear HCF selection
    if (field === 'companyName') {
      const company = companies.find(c => c.companyName === value);
      if (company) {
        updates.companyId = company.id;
      }
      updates.hcfCode = '';
      updates.hcfId = '';
    }
    
    // When HCF code changes, also update hcfId
    if (field === 'hcfCode') {
      const hcf = filteredHCFs.find(h => h.hcfCode === value);
      if (hcf) {
        updates.hcfId = hcf.id;
      }
    }
    
    setFormData({ ...formData, ...updates });
  };

  const handleCertificateNoModeChange = (mode: 'auto' | 'manual') => {
    setCertificateNoMode(mode);
    if (mode === 'auto') {
      setFormData({ ...formData, certificateNo: generateCertificateNo() });
    } else {
      setFormData({ ...formData, certificateNo: '' });
    }
  };

  const handleGenerateAuto = () => {
    setFormData({ ...formData, certificateNo: generateCertificateNo() });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.hcfCode || !formData.staffName || !formData.staffCode || !formData.trainingDate) {
      alert('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the form? All unsaved changes will be lost.')) {
      setFormData({
        certificateNo: certificateNoMode === 'auto' ? generateCertificateNo() : '',
        staffName: '',
        staffCode: '',
        designation: '',
        hcfCode: '',
        trainingDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        companyName: '',
        trainedBy: '',
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{certificate ? 'Edit Training Certificate' : 'Create Training Certificate'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="certificate-form" onSubmit={handleSubmit}>
          {/* Section 1: Organization Details */}
          <div className="form-section">
            <h3 className="form-section-title">Organization Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => {
                    handleFieldChange('companyName', e.target.value);
                  }}
                  required
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.companyName}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>HCF *</label>
                <select
                  value={formData.hcfCode || ''}
                  onChange={(e) => handleFieldChange('hcfCode', e.target.value)}
                  required
                  disabled={!formData.companyId && !formData.companyName}
                >
                  <option value="">Select HCF</option>
                  {filteredHCFs.length === 0 && (formData.companyId || formData.companyName) ? (
                    <option value="" disabled>No HCFs available for selected company</option>
                  ) : (
                    filteredHCFs.map((hcf) => (
                      <option key={hcf.id} value={hcf.hcfCode}>
                        {hcf.hcfCode} - {hcf.hcfName}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Staff Details */}
          <div className="form-section">
            <h3 className="form-section-title">Staff Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Staff Code *</label>
                <input
                  type="text"
                  value={formData.staffCode || ''}
                  onChange={(e) => handleFieldChange('staffCode', e.target.value)}
                  required
                  placeholder="Enter staff code"
                />
              </div>
              <div className="form-group">
                <label>Staff Name *</label>
                <input
                  type="text"
                  value={formData.staffName || ''}
                  onChange={(e) => handleFieldChange('staffName', e.target.value)}
                  required
                  placeholder="Enter staff name"
                />
              </div>
              <div className="form-group">
                <label>Designation *</label>
                <input
                  type="text"
                  value={formData.designation || ''}
                  onChange={(e) => handleFieldChange('designation', e.target.value)}
                  required
                  placeholder="Enter designation"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Training Details */}
          <div className="form-section">
            <h3 className="form-section-title">Training Details</h3>
            <div className="form-grid">
              <div className="form-group form-group--full">
                <label>Certificate Number *</label>
                <div className="certificate-no-input-group">
                  <div className="certificate-no-mode-toggle">
                    <button
                      type="button"
                      className={`mode-toggle-btn ${certificateNoMode === 'auto' ? 'active' : ''}`}
                      onClick={() => handleCertificateNoModeChange('auto')}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      className={`mode-toggle-btn ${certificateNoMode === 'manual' ? 'active' : ''}`}
                      onClick={() => handleCertificateNoModeChange('manual')}
                    >
                      Manual
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.certificateNo || ''}
                    onChange={(e) => handleFieldChange('certificateNo', e.target.value)}
                    required
                    placeholder={certificateNoMode === 'auto' ? 'Auto-generated' : 'Enter certificate number'}
                    disabled={certificateNoMode === 'auto' && !certificate}
                    style={{ flex: 1 }}
                  />
                  {certificateNoMode === 'auto' && !certificate && (
                    <button
                      type="button"
                      className="generate-btn-small"
                      onClick={handleGenerateAuto}
                    >
                      Generate
                    </button>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Training Date *</label>
                <input
                  type="date"
                  value={formData.trainingDate || ''}
                  onChange={(e) => handleFieldChange('trainingDate', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Trained By *</label>
                <input
                  type="text"
                  value={formData.trainedBy || ''}
                  onChange={(e) => handleFieldChange('trainedBy', e.target.value)}
                  required
                  placeholder="Enter trainer name or organization"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Status */}
          <div className="form-section">
            <h3 className="form-section-title">Status</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Status *</label>
                <select
                  value={formData.status || 'Active'}
                  onChange={(e) => handleFieldChange('status', e.target.value as 'Active' | 'Inactive')}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={handleReset}>
              Reset
            </button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Certificate View Modal Component
interface CertificateViewModalProps {
  certificate: TrainingCertificate;
  hcfs: HCF[];
  companies: Company[];
  onClose: () => void;
  onPrint: (certificate: TrainingCertificate) => void;
}

const CertificateViewModal = ({ certificate, hcfs, companies, onClose, onPrint }: CertificateViewModalProps) => {
  const hcf = hcfs.find(h => h.hcfCode === certificate.hcfCode);
  const company = companies.find(c => c.companyName === certificate.companyName);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--view" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Training Certificate - {certificate.certificateNo}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="certificate-view-content">
          <div className="certificate-view-section">
            <h3 className="certificate-view-section-title">Organization Details</h3>
            <div className="certificate-view-grid">
              <div className="certificate-view-field">
                <label>Company:</label>
                <span>{certificate.companyName || '-'}</span>
              </div>
              <div className="certificate-view-field">
                <label>HCF:</label>
                <span>{hcf ? `${certificate.hcfCode} - ${hcf.hcfName}` : certificate.hcfCode}</span>
              </div>
            </div>
          </div>

          <div className="certificate-view-section">
            <h3 className="certificate-view-section-title">Staff Details</h3>
            <div className="certificate-view-grid">
              <div className="certificate-view-field">
                <label>Staff Code:</label>
                <span>{certificate.staffCode || '-'}</span>
              </div>
              <div className="certificate-view-field">
                <label>Staff Name:</label>
                <span>{certificate.staffName || '-'}</span>
              </div>
              <div className="certificate-view-field">
                <label>Designation:</label>
                <span>{certificate.designation || '-'}</span>
              </div>
            </div>
          </div>

          <div className="certificate-view-section">
            <h3 className="certificate-view-section-title">Training Details</h3>
            <div className="certificate-view-grid">
              <div className="certificate-view-field">
                <label>Certificate Number:</label>
                <span className="certificate-no-display">{certificate.certificateNo || '-'}</span>
              </div>
              <div className="certificate-view-field">
                <label>Training Date:</label>
                <span>{certificate.trainingDate || '-'}</span>
              </div>
              <div className="certificate-view-field">
                <label>Trained By:</label>
                <span>{certificate.trainedBy || '-'}</span>
              </div>
              <div className="certificate-view-field">
                <label>Status:</label>
                <span className={`certificate-status-badge certificate-status-badge--${certificate.status.toLowerCase()}`}>
                  {certificate.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Back
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onPrint(certificate)}>
            Print Certificate
          </button>
        </div>
      </div>
    </div>
  );
};

// Advanced Filters Modal Component
interface AdvancedFiltersModalProps {
  advancedFilters: AdvancedFilters;
  companies: CompanyResponse[];
  hcfs: HcfResponse[];
  onClose: () => void;
  onClear: () => void;
  onApply: (payload: AdvancedFilters) => void;
}

const AdvancedFiltersModal = ({
  advancedFilters,
  companies,
  hcfs,
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
              <div className="ra-filter-subtitle">Filter certificates by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
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
              <label>HCF Code</label>
              <input
                type="text"
                value={draft.hcfCode}
                onChange={(e) => setDraft({ ...draft, hcfCode: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter HCF code"
              />
            </div>

            <div className="ra-filter-field">
              <label>Staff Name</label>
              <input
                type="text"
                value={draft.staffName}
                onChange={(e) => setDraft({ ...draft, staffName: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter staff name"
              />
            </div>

            <div className="ra-filter-field">
              <label>Staff Code</label>
              <input
                type="text"
                value={draft.staffCode}
                onChange={(e) => setDraft({ ...draft, staffCode: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter staff code"
              />
            </div>

            <div className="ra-filter-field">
              <label>Training Date From</label>
              <input
                type="date"
                value={draft.trainingDateFrom}
                onChange={(e) => setDraft({ ...draft, trainingDateFrom: e.target.value })}
                className="ra-filter-input"
              />
            </div>

            <div className="ra-filter-field">
              <label>Training Date To</label>
              <input
                type="date"
                value={draft.trainingDateTo}
                onChange={(e) => setDraft({ ...draft, trainingDateTo: e.target.value })}
                className="ra-filter-input"
              />
            </div>

            <div className="ra-filter-field">
              <label>Status</label>
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Status</option>
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
              setDraft({ companyId: '', hcfCode: '', staffName: '', staffCode: '', trainingDateFrom: '', trainingDateTo: '', status: '' });
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

export default TrainingCertificatePage;

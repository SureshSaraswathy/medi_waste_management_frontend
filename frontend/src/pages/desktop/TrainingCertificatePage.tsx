import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { trainingCertificateService, TrainingCertificateResponse } from '../../services/trainingCertificateService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
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

const TrainingCertificatePage = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('All');
  const [hcfFilter, setHcfFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
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

  // Certificates are already filtered by API, so we use them directly
  const filteredCertificates = certificates;

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

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', active: location.pathname === '/dashboard' },
    { path: '/transaction', label: 'Transaction', icon: '💼', active: location.pathname === '/transaction' },
    { path: '/finance', label: 'Finance', icon: '💰', active: location.pathname === '/finance' },
    { path: '/commercial-agreements', label: 'Commercial Agreements', icon: '📝', active: location.pathname === '/commercial-agreements' },
    { path: '/compliance-training', label: 'Compliance & Training', icon: '✅', active: location.pathname.startsWith('/compliance-training') },
    { path: '/master', label: 'Masters', icon: '📋', active: location.pathname.startsWith('/master') },
    { path: '/report/billing-finance', label: 'Reports', icon: '📈', active: location.pathname.startsWith('/report') },
  ];

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
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Compliance & Training / Training Certificate Management</span>
          </div>
        </header>

        <div className="training-certificate-page">
          {error && (
            <div className="error-message" style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
              {error}
            </div>
          )}
          {loading && (
            <div className="loading-message" style={{ padding: '10px', marginBottom: '20px', textAlign: 'center' }}>
              Loading...
            </div>
          )}
          <div className="training-certificate-header">
            <h1 className="training-certificate-title">Training Certificate Management</h1>
          </div>

          <div className="training-certificate-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>Company</label>
                <select
                  className="filter-select"
                  value={companyFilter}
                  onChange={(e) => {
                    setCompanyFilter(e.target.value);
                    if (e.target.value === 'All') {
                      setHcfFilter('All');
                    }
                  }}
                >
                  <option value="All">All Companies</option>
                  {companies.filter(c => c.status === 'Active').map((company) => (
                    <option key={company.id} value={company.companyName}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>HCF</label>
                <select
                  className="filter-select"
                  value={hcfFilter}
                  onChange={(e) => setHcfFilter(e.target.value)}
                >
                  <option value="All">All HCFs</option>
                  {filteredHCFsForCompany.map((hcf) => (
                    <option key={hcf.id} value={hcf.hcfCode}>
                      {hcf.hcfCode} - {hcf.hcfName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Date From</label>
                <input
                  type="date"
                  className="filter-input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Date To</label>
                <input
                  type="date"
                  className="filter-input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="filter-group">
                <button className="clear-filters-btn" onClick={() => {
                  setCompanyFilter('All');
                  setHcfFilter('All');
                  setStatusFilter('All');
                  setDateFrom('');
                  setDateTo('');
                }}>
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          <div className="training-certificate-actions">
            <div className="certificate-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="certificate-search-input"
                placeholder="Search Certificate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="export-btn" onClick={handleExport}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export
            </button>
            <button className="add-certificate-btn" onClick={handleCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Certificate
            </button>
          </div>

          <div className="certificate-table-container">
            <table className="certificate-table">
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
                {filteredCertificates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-message">
                      No certificate records found
                    </td>
                  </tr>
                ) : (
                  filteredCertificates.map((certificate) => {
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
                          <div className="certificate-action-buttons">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleView(certificate)}
                              title="View"
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
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="certificate-pagination-info">
            Showing {filteredCertificates.length} of {certificates.length} Items
          </div>
        </div>
      </main>

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

export default TrainingCertificatePage;

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { emissionRegisterService, EmissionRegisterResponse } from '../../services/emissionRegisterService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { equipmentService, EquipmentResponse } from '../../services/equipmentService';
import PageHeader from '../../components/layout/PageHeader';
import './emissionRegisterPage.css';
import '../desktop/dashboardPage.css';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';

interface EmissionRegister {
  id: string;
  emisRegNum: string;
  companyId: string;
  companyName: string;
  emissionDate: string;
  equipmentId: string;
  equipmentDisplay: string;
  stackId: string;
  pm: number;
  co: number;
  hci: number;
  temp: number;
  oxygen: number;
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

interface Equipment {
  id: string;
  equipmentCode: string;
  equipmentName: string;
  equipmentType: string | null;
  status: 'Active' | 'Inactive';
}

interface AdvancedFilters {
  emisRegNum: string;
  companyName: string;
  equipmentId: string;
  stackId: string;
  complianceStatus: string;
}

const EmissionRegisterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingEmission, setEditingEmission] = useState<EmissionRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    emisRegNum: '',
    companyName: '',
    equipmentId: '',
    stackId: '',
    complianceStatus: '',
  });

  // Master data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [emissions, setEmissions] = useState<EmissionRegister[]>([]);

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true);
      // Safety check: ensure apiCompanies is an array
      if (!apiCompanies || !Array.isArray(apiCompanies)) {
        console.warn('Companies API returned non-array response:', apiCompanies);
        setCompanies([]);
        return;
      }
      const mappedCompanies: Company[] = apiCompanies.map((c: CompanyResponse) => ({
        id: c.id,
        companyCode: c.companyCode,
        companyName: c.companyName,
        status: c.status,
      }));
      setCompanies(mappedCompanies);
    } catch (err) {
      console.error('Error loading companies:', err);
      setCompanies([]); // Set empty array on error to prevent crashes
    }
  }, []);

  // Load equipment from Equipment Master
  const loadEquipment = useCallback(async () => {
    try {
      const apiEquipment = await equipmentService.getAllEquipment(true);
      // Safety check: ensure apiEquipment is an array
      if (!apiEquipment || !Array.isArray(apiEquipment)) {
        console.warn('Equipment API returned non-array response:', apiEquipment);
        setEquipment([]);
        return;
      }
      const mappedEquipment: Equipment[] = apiEquipment.map((eq: EquipmentResponse) => ({
        id: eq.id,
        equipmentCode: eq.equipmentCode,
        equipmentName: eq.equipmentName,
        equipmentType: eq.equipmentType,
        status: eq.status,
      }));
      setEquipment(mappedEquipment);
    } catch (err) {
      console.error('Error loading equipment:', err);
      setEquipment([]); // Set empty array on error to prevent crashes
    }
  }, []);

  // Load emissions
  const loadEmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiEmissions = await emissionRegisterService.getAllEmissionRegisters(
        undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );

      // Safety check: ensure apiEmissions is an array
      if (!apiEmissions || !Array.isArray(apiEmissions)) {
        console.warn('Emission registers API returned non-array response:', apiEmissions);
        setEmissions([]);
        return;
      }

      // Map backend response to frontend format with names
      // Use current companies and equipment state from closure
      const mappedEmissions: EmissionRegister[] = await Promise.all(
        apiEmissions.map(async (apiEmission: EmissionRegisterResponse) => {
          const company = companies.find(c => c.id === apiEmission.companyId);
          
          // Handle equipment display - check if equipmentId is empty/null/undefined first
          let equipmentDisplay = '-';
          if (apiEmission.equipmentId && apiEmission.equipmentId.trim() !== '') {
            const equipmentItem = equipment.find(
              (eq) => eq.id === apiEmission.equipmentId || eq.equipmentCode === apiEmission.equipmentId
            );
            if (equipmentItem) {
              equipmentDisplay = `${equipmentItem.equipmentCode} - ${equipmentItem.equipmentName}`;
            } else {
              // If equipment ID exists but not found in master, show the ID as fallback
              equipmentDisplay = apiEmission.equipmentId;
            }
          }

          return {
            id: apiEmission.id,
            emisRegNum: apiEmission.emisRegNum,
            companyId: apiEmission.companyId,
            companyName: company?.companyName || 'Unknown',
            emissionDate: apiEmission.emissionDate,
            equipmentId: apiEmission.equipmentId,
            equipmentDisplay: equipmentDisplay,
            stackId: apiEmission.stackId,
            // Convert decimal strings to numbers
            pm: typeof apiEmission.pm === 'string' ? parseFloat(apiEmission.pm) : Number(apiEmission.pm) || 0,
            co: typeof apiEmission.co === 'string' ? parseFloat(apiEmission.co) : Number(apiEmission.co) || 0,
            hci: typeof apiEmission.hci === 'string' ? parseFloat(apiEmission.hci) : Number(apiEmission.hci) || 0,
            temp: typeof apiEmission.temp === 'string' ? parseFloat(apiEmission.temp) : Number(apiEmission.temp) || 0,
            oxygen: typeof apiEmission.oxygen === 'string' ? parseFloat(apiEmission.oxygen) : Number(apiEmission.oxygen) || 0,
            complianceStatus: apiEmission.complianceStatus,
            status: apiEmission.status,
            createdBy: apiEmission.createdBy,
            createdOn: apiEmission.createdOn,
            modifiedBy: apiEmission.modifiedBy,
            modifiedOn: apiEmission.modifiedOn,
          };
        })
      );
      setEmissions(mappedEmissions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load emission registers';
      setError(errorMessage);
      console.error('Error loading emission registers:', err);
      setEmissions([]); // Set empty array on error to prevent crashes
    } finally {
      setLoading(false);
    }
  }, [statusFilter, companies, equipment]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
      await loadEquipment();
    };
    initializeData();
  }, [loadCompanies, loadEquipment]);

  // Load emissions when dependencies are ready
  useEffect(() => {
    if (companies.length > 0 && equipment.length > 0) {
      loadEmissions();
    }
  }, [companies, equipment, statusFilter, loadEmissions]);

  const filteredEmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const emisRegNumQuery = advancedFilters.emisRegNum.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    const equipmentQuery = advancedFilters.equipmentId.trim().toLowerCase();
    const stackQuery = advancedFilters.stackId.trim().toLowerCase();
    const complianceQuery = advancedFilters.complianceStatus.trim().toLowerCase();

    return emissions.filter((emission) => {
      // Top search box: broad match across key fields
      const matchesSearch =
        !query ||
        emission.emisRegNum.toLowerCase().includes(query) ||
        emission.companyName.toLowerCase().includes(query) ||
        emission.equipmentId.toLowerCase().includes(query) ||
        emission.stackId.toLowerCase().includes(query);

      // Advanced filters
      const matchesEmisRegNum = !emisRegNumQuery || emission.emisRegNum.toLowerCase().includes(emisRegNumQuery);
      const matchesCompany = !companyQuery || emission.companyName.toLowerCase().includes(companyQuery);
      const matchesEquipment = !equipmentQuery || emission.equipmentId.toLowerCase().includes(equipmentQuery);
      const matchesStack = !stackQuery || emission.stackId.toLowerCase().includes(stackQuery);
      const matchesCompliance = !complianceQuery || emission.complianceStatus.toLowerCase().includes(complianceQuery);
      const matchesStatus = statusFilter === 'all' || emission.status === statusFilter;

      return matchesSearch && matchesEmisRegNum && matchesCompany && matchesEquipment && matchesStack && matchesCompliance && matchesStatus;
    });
  }, [emissions, searchQuery, advancedFilters, statusFilter]);

  const handleAdd = () => {
    setEditingEmission(null);
    setShowModal(true);
  };

  const handleEdit = (emission: EmissionRegister) => {
    setEditingEmission(emission);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this emission register?')) {
      try {
        setLoading(true);
        setError(null);
        await emissionRegisterService.deleteEmissionRegister(id);
        toast.success('Emission register deleted successfully', {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ),
          style: {
            background: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
          },
        });
        await loadEmissions();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete emission register';
        toast.error(`Error: ${errorMessage}`);
        console.error('Error deleting emission register:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<EmissionRegister>) => {
    try {
      setLoading(true);
      setError(null);

      if (editingEmission) {
        // Update existing emission
        await emissionRegisterService.updateEmissionRegister(editingEmission.id, {
          emissionDate: data.emissionDate,
          equipmentId: data.equipmentId,
          stackId: data.stackId,
          pm: data.pm,
          co: data.co,
          hci: data.hci,
          temp: data.temp,
          oxygen: data.oxygen,
          complianceStatus: data.complianceStatus,
          status: data.status,
        });
        toast.success('Emission register updated successfully', {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ),
          style: {
            background: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
          },
        });
      } else {
        // Create new emission
        const selectedCompany = companies.find(c => c.id === data.companyId);
        if (!selectedCompany) {
          toast.error('Please select a valid company');
          return;
        }

        await emissionRegisterService.createEmissionRegister({
          companyId: selectedCompany.id,
          emissionDate: data.emissionDate!,
          equipmentId: data.equipmentId!,
          stackId: data.stackId!,
          pm: data.pm!,
          co: data.co!,
          hci: data.hci!,
          temp: data.temp!,
          oxygen: data.oxygen!,
          complianceStatus: data.complianceStatus || 'Compliant',
          status: data.status || 'Active',
        });
        toast.success('Created Successfully', {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ),
          style: {
            background: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
          },
        });
      }

      setShowModal(false);
      setEditingEmission(null);
      // Reload emissions after save - ensure companies are loaded first
      // Use a fresh call to loadEmissions that will use the current companies state
      await loadEmissions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save emission register';
      toast.error(`Error: ${errorMessage}`);
      console.error('Error saving emission register:', err);
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
      <aside className={`dashboard-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
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
          <NotificationBell variant="sidebar" isSidebarCollapsed={isSidebarCollapsed} />
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

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <PageHeader 
          title="Emission Register"
          subtitle="Manage emission monitoring records"
        />

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
        {loading && !emissions.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading emission registers...
          </div>
        )}

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2v4"></path>
                <path d="M12 18v4"></path>
                <path d="M4.93 4.93l2.83 2.83"></path>
                <path d="M16.24 16.24l2.83 2.83"></path>
                <path d="M2 12h4"></path>
                <path d="M18 12h4"></path>
                <path d="M4.93 19.07l2.83-2.83"></path>
                <path d="M16.24 7.76l2.83-2.83"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Emission Register</h1>
              <p className="ra-page-subtitle">Manage and track emission monitoring and compliance</p>
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
                placeholder="Search by register number, company, equipment, stack..."
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
                Add Emission
              </button>
            </div>
          </div>

          {/* Emissions Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>REG NUM</th>
                  <th>COMPANY</th>
                  <th>DATE</th>
                  <th>EQUIPMENT ID</th>
                  <th>STACK ID</th>
                  <th>PM</th>
                  <th>CO</th>
                  <th>HCI</th>
                  <th>TEMP</th>
                  <th>OXYGEN</th>
                  <th>COMPLIANCE STATUS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmissions.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="empty-message">
                      {loading ? 'Loading...' : 'No emission registers found'}
                    </td>
                  </tr>
                ) : (
                  filteredEmissions.map((emission) => {
                    // Format date to DD/MM/YYYY
                    const formatDate = (dateString: string) => {
                      const date = new Date(dateString);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };

                    return (
                      <tr key={emission.id}>
                        <td>{emission.emisRegNum}</td>
                        <td>{emission.companyName}</td>
                        <td>{formatDate(emission.emissionDate)}</td>
                        <td className="emission-equipment-cell" title={emission.equipmentDisplay}>{emission.equipmentDisplay}</td>
                        <td>{emission.stackId}</td>
                        <td>{Number(emission.pm || 0).toFixed(2)}</td>
                        <td>{Number(emission.co || 0).toFixed(2)}</td>
                        <td>{Number(emission.hci || 0).toFixed(2)}</td>
                        <td>{Number(emission.temp || 0).toFixed(2)}</td>
                        <td>{Number(emission.oxygen || 0).toFixed(2)}</td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge ${getComplianceBadgeClass(emission.complianceStatus)}`}>
                              {emission.complianceStatus}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge status-badge--${emission.status.toLowerCase()}`}>
                              {emission.status}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons ra-actions">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleEdit(emission)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--edit"
                              onClick={() => handleEdit(emission)}
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--delete"
                              onClick={() => handleDelete(emission.id)}
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
            Showing {filteredEmissions.length} of {emissions.length} items
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
            setAdvancedFilters({ emisRegNum: '', companyName: '', equipmentId: '', stackId: '', complianceStatus: '' });
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

      {/* Emission Add/Edit Modal */}
      {showModal && (
        <EmissionFormModal
          emission={editingEmission}
          companies={companies.filter(c => c.status === 'Active')}
          equipment={equipment.filter(eq => eq.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingEmission(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Emission Form Modal Component
interface EmissionFormModalProps {
  emission: EmissionRegister | null;
  companies: Company[];
  equipment: Equipment[];
  onClose: () => void;
  onSave: (data: Partial<EmissionRegister>) => void;
}

const EmissionFormModal = ({
  emission,
  companies,
  equipment,
  onClose,
  onSave,
}: EmissionFormModalProps) => {
  const [formData, setFormData] = useState<Partial<EmissionRegister>>(
    emission || {
      companyId: '',
      emissionDate: new Date().toISOString().split('T')[0],
      equipmentId: '',
      stackId: '',
      pm: 0,
      co: 0,
      hci: 0,
      temp: 0,
      oxygen: 0,
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
      <div className="modal-content ra-assignment-modal emission-register-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <div className="ra-assignment-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2v4"></path>
                <path d="M12 18v4"></path>
                <path d="M4.93 4.93l2.83 2.83"></path>
                <path d="M16.24 16.24l2.83 2.83"></path>
                <path d="M2 12h4"></path>
                <path d="M18 12h4"></path>
                <path d="M4.93 19.07l2.83-2.83"></path>
                <path d="M16.24 7.76l2.83-2.83"></path>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">
                {emission ? 'Edit Emission Register' : 'Add Emission Register'}
              </h2>
              <p className="ra-assignment-modal-subtitle">
                {emission ? 'Update emission details' : 'Create a new emission register.'}
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
        <form className="ra-assignment-form emission-register-form" onSubmit={handleSubmit}>
          <div className="ra-assignment-form-grid emission-register-form-grid">
            <div className="ra-assignment-form-group">
              <label htmlFor="company">
                Company Name <span className="ra-required">*</span>
              </label>
              <select
                id="company"
                value={formData.companyId || ''}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                required
                disabled={!!emission}
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
              <label htmlFor="emission-date">
                Emission Date <span className="ra-required">*</span>
              </label>
              <input
                id="emission-date"
                type="date"
                value={formData.emissionDate || ''}
                onChange={(e) => setFormData({ ...formData, emissionDate: e.target.value })}
                required
                className="ra-assignment-input"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="equipment-id">
                Equipment ID <span className="ra-required">*</span>
              </label>
              <select
                id="equipment-id"
                value={formData.equipmentId || ''}
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                required
                className="ra-assignment-select"
              >
                <option value="">Select Equipment</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id} title={`${eq.equipmentCode} - ${eq.equipmentName}`}>
                    {eq.equipmentCode} - {eq.equipmentName}
                  </option>
                ))}
              </select>
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="stack-id">
                Stack ID <span className="ra-required">*</span>
              </label>
              <input
                id="stack-id"
                type="text"
                value={formData.stackId || ''}
                onChange={(e) => setFormData({ ...formData, stackId: e.target.value })}
                required
                className="ra-assignment-input"
                placeholder="Enter stack ID"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="pm">
                PM <span className="ra-required">*</span>
              </label>
              <input
                id="pm"
                type="number"
                step="0.01"
                value={formData.pm || 0}
                onChange={(e) => setFormData({ ...formData, pm: parseFloat(e.target.value) || 0 })}
                required
                className="ra-assignment-input"
                placeholder="0.00"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="co">
                CO <span className="ra-required">*</span>
              </label>
              <input
                id="co"
                type="number"
                step="0.01"
                value={formData.co || 0}
                onChange={(e) => setFormData({ ...formData, co: parseFloat(e.target.value) || 0 })}
                required
                className="ra-assignment-input"
                placeholder="0.00"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="hci">
                HCI <span className="ra-required">*</span>
              </label>
              <input
                id="hci"
                type="number"
                step="0.01"
                value={formData.hci || 0}
                onChange={(e) => setFormData({ ...formData, hci: parseFloat(e.target.value) || 0 })}
                required
                className="ra-assignment-input"
                placeholder="0.00"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="temp">
                Temperature <span className="ra-required">*</span>
              </label>
              <input
                id="temp"
                type="number"
                step="0.01"
                value={formData.temp || 0}
                onChange={(e) => setFormData({ ...formData, temp: parseFloat(e.target.value) || 0 })}
                required
                className="ra-assignment-input"
                placeholder="0.00"
              />
            </div>
            <div className="ra-assignment-form-group">
              <label htmlFor="oxygen">
                Oxygen <span className="ra-required">*</span>
              </label>
              <input
                id="oxygen"
                type="number"
                step="0.01"
                value={formData.oxygen || 0}
                onChange={(e) => setFormData({ ...formData, oxygen: parseFloat(e.target.value) || 0 })}
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

          {/* Modal Footer */}
          <div className="ra-assignment-modal-footer">
            <button type="button" className="ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ra-assignment-btn ra-assignment-btn--primary">
              {emission ? 'Update Emission' : 'Create Emission'}
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
              <div className="ra-filter-subtitle">Filter emission registers by multiple criteria</div>
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
                value={draft.emisRegNum}
                onChange={(e) => setDraft({ ...draft, emisRegNum: e.target.value })}
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
              <label>Stack ID</label>
              <input
                type="text"
                value={draft.stackId}
                onChange={(e) => setDraft({ ...draft, stackId: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter stack ID"
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
              setDraft({ emisRegNum: '', companyName: '', equipmentId: '', stackId: '', complianceStatus: '' });
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

export default EmissionRegisterPage;

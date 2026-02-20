import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../services/permissionService';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { hcfService, HcfResponse } from '../../services/hcfService';
import { adminResetHCFPassword } from '../../services/hcfAuthService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { areaService, AreaResponse } from '../../services/areaService';
import { stateService, StateResponse } from '../../services/stateService';
import { categoryService, CategoryResponse } from '../../services/categoryService';
import { routeService, RouteResponse } from '../../services/routeService';
import { pcbZoneService, PcbZoneResponse } from '../../services/pcbZoneService';
import { hcfTypeService, HcfTypeResponse } from '../../services/hcfTypeService';
import PageHeader from '../../components/layout/PageHeader';
import './hcfMasterPage.css';
import './companyMasterPage.css';
import '../desktop/dashboardPage.css';

interface HCF {
  id: string;
  companyName: string;
  companyID: string;
  hcfCode: string;
  password: string;
  hcfTypeCode: string;
  hcfName: string;
  hcfShortName: string;
  areaID: string;
  pincode: string;
  district: string;
  stateCode: string;
  groupCode: string;
  pcbZone: string;
  billingName: string;
  billingAddress: string;
  serviceAddress: string;
  gstin: string;
  regnNum: string;
  hospRegnDate: string;
  billingType: string;
  advAmount: string;
  billingOption: string;
  bedCount: string;
  bedRate: string;
  kgRate: string;
  lumpsum: string;
  accountsLandline: string;
  accountsMobile: string;
  accountsEmail: string;
  contactName: string;
  contactDesignation: string;
  contactMobile: string;
  contactEmail: string;
  agrSignAuthName: string;
  agrSignAuthDesignation: string;
  drName: string;
  drPhNo: string;
  drEmail: string;
  serviceStartDate: string;
  serviceEndDate: string;
  category: string;
  route: string;
  executive_Assigned: string;
  submitBy: string;
  agrID: string;
  sortOrder: string;
  isGovt: boolean;
  isGSTExempt: boolean;
  autoGen: boolean;
  loginEnabled?: boolean;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

interface Area {
  id: string;
  areaName: string;
  status: 'Active' | 'Inactive';
}

interface State {
  id: string;
  stateCode: string;
  stateName: string;
  status: 'Active' | 'Inactive';
}

interface PCBZone {
  id: string;
  pcbZoneName: string;
  status: 'Active' | 'Inactive';
}

interface Category {
  id: string;
  categoryName: string;
  status: 'Active' | 'Inactive';
}

interface Route {
  id: string;
  routeName: string;
  status: 'Active' | 'Inactive';
}

const HCFMasterPage = () => {
  const { logout, user, permissions } = useAuth();
  const location = useLocation();
  const perms = Array.isArray(permissions) ? permissions : [];
  const canCreate = hasPermission(perms, 'HCF_CREATE');
  const canEdit = hasPermission(perms, 'HCF_EDIT') || hasPermission(perms, 'HCF_UPDATE');
  const canDelete = hasPermission(perms, 'HCF_DELETE');
  
  // Debug: Log permissions (remove in production)
  useEffect(() => {
    if (user) {
      console.log('HCF Master - User:', { id: user.id, email: user.email, name: user.name, roles: user.roles });
      console.log('HCF Master - Permissions:', { canCreate, canEdit, canDelete });
    }
  }, [user, canCreate, canEdit]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingHCF, setEditingHCF] = useState<HCF | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  interface AdvancedFilters {
    hcfCode: string;
    hcfName: string;
    companyName: string;
  }
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    hcfCode: '',
    hcfName: '',
    companyName: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Master data - Load from API
  const [companies, setCompanies] = useState<Company[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [pcbZones, setPcbZones] = useState<PCBZone[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [hcfTypes, setHcfTypes] = useState<HcfTypeResponse[]>([]);
  const [hcfs, setHcfs] = useState<HCF[]>([]);

  // Load master data functions
  const loadCompanies = useCallback(async () => {
    try {
      const data = await companyService.getAllCompanies(undefined, true);
      setCompanies(data.map(c => ({
        id: c.id,
        companyCode: c.companyCode,
        companyName: c.companyName,
        status: c.status,
      })));
    } catch (err: any) {
      console.error('Failed to load companies:', err);
    }
  }, []);

  const loadAreas = useCallback(async () => {
    try {
      const data = await areaService.getAllAreas(true);
      setAreas(data.map(a => ({
        id: a.id,
        areaName: a.areaName,
        status: a.status,
      })));
    } catch (err: any) {
      console.error('Failed to load areas:', err);
    }
  }, []);

  const loadStates = useCallback(async () => {
    try {
      const data = await stateService.getAllStates(true);
      setStates(data.map(s => ({
        id: s.id,
        stateCode: s.stateCode,
        stateName: s.stateName,
        status: s.status,
      })));
    } catch (err: any) {
      console.error('Failed to load states:', err);
    }
  }, []);

  const loadPcbZones = useCallback(async () => {
    try {
      const data = await pcbZoneService.getAllPcbZones(true);
      setPcbZones(data.map(z => ({
        id: z.id,
        pcbZoneName: z.pcbZoneName,
        status: z.status,
      })));
    } catch (err: any) {
      console.error('Failed to load PCB zones:', err);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await categoryService.getAllCategories(undefined, true);
      setCategories(data.map(c => ({
        id: c.id,
        categoryName: c.categoryName,
        status: c.status,
      })));
    } catch (err: any) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const loadRoutes = useCallback(async () => {
    try {
      const data = await routeService.getAllRoutes(true);
      setRoutes(data.map(r => ({
        id: r.id,
        routeName: r.routeName,
        status: r.status,
      })));
    } catch (err: any) {
      console.error('Failed to load routes:', err);
    }
  }, []);

  const loadHcfTypes = useCallback(async () => {
    try {
      const data = await hcfTypeService.getAllHcfTypes(undefined, true);
      setHcfTypes(data);
    } catch (err: any) {
      console.error('Failed to load HCF types:', err);
    }
  }, []);

  // Load HCFs from API
  const loadHcfs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hcfService.getAllHcfs();
      
      // Map backend data to frontend format
      const mappedHcfs: HCF[] = data.map(hcf => {
        const company = companies.find(c => c.id === hcf.companyId);
        const area = areas.find(a => a.id === hcf.areaId);
        const state = states.find(s => s.stateCode === hcf.stateCode);
        const pcbZone = pcbZones.find(z => z.id === hcf.pcbZone);
        const category = categories.find(c => c.id === hcf.category);
        const route = routes.find(r => r.id === hcf.route);
        
        return {
          id: hcf.id,
          companyName: company?.companyName || '',
          companyID: hcf.companyId,
          hcfCode: hcf.hcfCode,
          password: hcf.password || '',
          hcfTypeCode: hcf.hcfTypeCode || '',
          hcfName: hcf.hcfName,
          hcfShortName: hcf.hcfShortName || '',
          areaID: hcf.areaId || '',
          pincode: hcf.pincode || '',
          district: hcf.district || '',
          stateCode: hcf.stateCode || '',
          groupCode: hcf.groupCode || '',
          pcbZone: hcf.pcbZone || '',
          billingName: hcf.billingName || '',
          billingAddress: hcf.billingAddress || '',
          serviceAddress: hcf.serviceAddress || '',
          gstin: hcf.gstin || '',
          regnNum: hcf.regnNum || '',
          hospRegnDate: hcf.hospRegnDate || '',
          billingType: hcf.billingType || '',
          advAmount: hcf.advAmount || '',
          billingOption: hcf.billingOption || '',
          bedCount: hcf.bedCount || '',
          bedRate: hcf.bedRate || '',
          kgRate: hcf.kgRate || '',
          lumpsum: hcf.lumpsum || '',
          accountsLandline: hcf.accountsLandline || '',
          accountsMobile: hcf.accountsMobile || '',
          accountsEmail: hcf.accountsEmail || '',
          contactName: hcf.contactName || '',
          contactDesignation: hcf.contactDesignation || '',
          contactMobile: hcf.contactMobile || '',
          contactEmail: hcf.contactEmail || '',
          agrSignAuthName: hcf.agrSignAuthName || '',
          agrSignAuthDesignation: hcf.agrSignAuthDesignation || '',
          drName: hcf.drName || '',
          drPhNo: hcf.drPhNo || '',
          drEmail: hcf.drEmail || '',
          serviceStartDate: hcf.serviceStartDate || '',
          serviceEndDate: hcf.serviceEndDate || '',
          category: hcf.category || '',
          route: hcf.route || '',
          executive_Assigned: hcf.executive_Assigned || '',
          submitBy: hcf.submitBy || '',
          agrID: hcf.agrID || '',
          sortOrder: hcf.sortOrder || '',
          isGovt: hcf.isGovt || false,
          isGSTExempt: hcf.isGSTExempt || false,
          autoGen: hcf.autoGen || false,
          loginEnabled: (hcf as any).loginEnabled || false,
          status: hcf.status,
          createdBy: hcf.createdBy || '',
          createdOn: hcf.createdOn,
          modifiedBy: hcf.modifiedBy || '',
          modifiedOn: hcf.modifiedOn,
        };
      });
      
      setHcfs(mappedHcfs);
    } catch (err: any) {
      console.error('Failed to load HCFs:', err);
      setError(err.message || 'Failed to load HCFs');
      setHcfs([]);
    } finally {
      setLoading(false);
    }
  }, [companies, areas, states, pcbZones, categories, routes]);

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        loadCompanies(),
        loadAreas(),
        loadStates(),
        loadPcbZones(),
        loadCategories(),
        loadRoutes(),
        loadHcfTypes(),
      ]);
    };
    initialize();
  }, [loadCompanies, loadAreas, loadStates, loadPcbZones, loadCategories, loadRoutes, loadHcfTypes]);

  // Reload HCFs when master data is loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadHcfs();
    }
  }, [companies.length, loadHcfs]);

  const filteredHCFs = hcfs.filter(hcf => {
    const query = searchQuery.trim().toLowerCase();
    const codeQuery = advancedFilters.hcfCode.trim().toLowerCase();
    const nameQuery = advancedFilters.hcfName.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    
    const matchesSearch = !query ||
      hcf.hcfName.toLowerCase().includes(query) ||
      hcf.hcfCode.toLowerCase().includes(query) ||
      hcf.companyName.toLowerCase().includes(query) ||
      hcf.hcfShortName.toLowerCase().includes(query);
    
    const matchesCode = !codeQuery || hcf.hcfCode.toLowerCase().includes(codeQuery);
    const matchesName = !nameQuery || hcf.hcfName.toLowerCase().includes(nameQuery);
    const matchesCompany = !companyQuery || hcf.companyName.toLowerCase().includes(companyQuery);
    const matchesStatus = statusFilter === 'all' || hcf.status === statusFilter;
    
    return matchesSearch && matchesCode && matchesName && matchesCompany && matchesStatus;
  });

  // Debug: Verify button rendering (moved after state declarations)
  useEffect(() => {
    // Use setTimeout to ensure DOM is rendered after table data loads
    const timer = setTimeout(() => {
      const addButton = document.querySelector('.add-hcf-btn');
      const actionButtons = document.querySelectorAll('.action-btn');
      
      // Check computed styles
      const addButtonStyles = addButton ? window.getComputedStyle(addButton) : null;
      const firstActionButton = actionButtons[0];
      const firstActionButtonStyles = firstActionButton ? window.getComputedStyle(firstActionButton) : null;
      
      console.log('HCF Master - Button Check:', {
        addButtonExists: !!addButton,
        addButtonVisible: addButton ? addButtonStyles?.display !== 'none' && addButtonStyles?.visibility !== 'hidden' : false,
        addButtonStyles: addButton ? {
          display: addButtonStyles?.display,
          visibility: addButtonStyles?.visibility,
          opacity: addButtonStyles?.opacity,
          width: addButtonStyles?.width,
          height: addButtonStyles?.height
        } : null,
        actionButtonsCount: actionButtons.length,
        firstActionButtonStyles: firstActionButton ? {
          display: firstActionButtonStyles?.display,
          visibility: firstActionButtonStyles?.visibility,
          opacity: firstActionButtonStyles?.opacity
        } : null,
        canCreate,
        canEdit,
        hcfsCount: hcfs.length,
        filteredHCFsCount: filteredHCFs.length
      });
    }, 500); // Increased timeout to ensure table is rendered
    return () => clearTimeout(timer);
  }, [canCreate, canEdit, hcfs.length, filteredHCFs.length]);

  const handleAdd = () => {
    setEditingHCF(null);
    setShowModal(true);
  };

  const handleEdit = (hcf: HCF) => {
    setEditingHCF(hcf);
    setShowModal(true);
  };

  const handleResetPassword = async (hcfId: string) => {
    if (!window.confirm('Are you sure you want to reset the password for this HCF? A temporary password will be generated and sent to their email.')) {
      return;
    }

    try {
      setLoading(true);
      const result = await adminResetHCFPassword(hcfId);
      alert(`Password reset successfully. Temporary password: ${result.temporaryPassword}\n\nPlease inform the HCF to check their email for the temporary password.`);
    } catch (err) {
      setError((err as Error).message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this HCF?')) {
      try {
        setLoading(true);
        await hcfService.deleteHcf(id);
        await loadHcfs();
      } catch (err: any) {
        console.error('Failed to delete HCF:', err);
        setError(err.message || 'Failed to delete HCF');
        alert(err.message || 'Failed to delete HCF');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<HCF>) => {
    try {
      setSaving(true);
      setError(null);

      if (editingHCF) {
        // Update existing HCF
        const updateData: any = {
          hcfName: data.hcfName,
          hcfShortName: data.hcfShortName,
          areaId: data.areaID,
          pincode: data.pincode,
          district: data.district,
          stateCode: data.stateCode,
          groupCode: data.groupCode,
          pcbZone: data.pcbZone,
          billingName: data.billingName,
          billingAddress: data.billingAddress,
          serviceAddress: data.serviceAddress,
          gstin: data.gstin,
          regnNum: data.regnNum,
          hospRegnDate: data.hospRegnDate,
          billingType: data.billingType,
          advAmount: data.advAmount,
          billingOption: data.billingOption,
          bedCount: data.bedCount,
          bedRate: data.bedRate,
          kgRate: data.kgRate,
          lumpsum: data.lumpsum,
          accountsLandline: data.accountsLandline,
          accountsMobile: data.accountsMobile,
          accountsEmail: data.accountsEmail,
          contactName: data.contactName,
          contactDesignation: data.contactDesignation,
          contactMobile: data.contactMobile,
          contactEmail: data.contactEmail,
          agrSignAuthName: data.agrSignAuthName,
          agrSignAuthDesignation: data.agrSignAuthDesignation,
          drName: data.drName,
          drPhNo: data.drPhNo,
          drEmail: data.drEmail,
          serviceStartDate: data.serviceStartDate,
          serviceEndDate: data.serviceEndDate,
          category: data.category,
          route: data.route,
          executive_Assigned: data.executive_Assigned,
          submitBy: data.submitBy,
          agrID: data.agrID,
          sortOrder: data.sortOrder,
          isGovt: data.isGovt,
          isGSTExempt: data.isGSTExempt,
          autoGen: data.autoGen,
          loginEnabled: data.loginEnabled,
          status: data.status,
        };

        await hcfService.updateHcf(editingHCF.id, updateData);
      } else {
        // Create new HCF
        if (!data.companyID) {
          throw new Error('Company is required');
        }
        if (!data.hcfCode) {
          throw new Error('HCF Code is required');
        }
        if (!data.hcfName) {
          throw new Error('HCF Name is required');
        }

        await hcfService.createHcf({
          companyId: data.companyID,
          hcfCode: data.hcfCode!,
          password: data.password,
          hcfTypeCode: data.hcfTypeCode,
          hcfName: data.hcfName!,
          hcfShortName: data.hcfShortName,
          areaId: data.areaID,
          pincode: data.pincode,
          district: data.district,
          stateCode: data.stateCode,
          groupCode: data.groupCode,
          pcbZone: data.pcbZone,
          billingName: data.billingName,
          billingAddress: data.billingAddress,
          serviceAddress: data.serviceAddress,
          gstin: data.gstin,
          regnNum: data.regnNum,
          hospRegnDate: data.hospRegnDate,
          billingType: data.billingType,
          advAmount: data.advAmount,
          billingOption: data.billingOption,
          bedCount: data.bedCount,
          bedRate: data.bedRate,
          kgRate: data.kgRate,
          lumpsum: data.lumpsum,
          accountsLandline: data.accountsLandline,
          accountsMobile: data.accountsMobile,
          accountsEmail: data.accountsEmail,
          contactName: data.contactName,
          contactDesignation: data.contactDesignation,
          contactMobile: data.contactMobile,
          contactEmail: data.contactEmail,
          agrSignAuthName: data.agrSignAuthName,
          agrSignAuthDesignation: data.agrSignAuthDesignation,
          drName: data.drName,
          drPhNo: data.drPhNo,
          drEmail: data.drEmail,
          serviceStartDate: data.serviceStartDate,
          serviceEndDate: data.serviceEndDate,
          category: data.category,
          route: data.route,
          executive_Assigned: data.executive_Assigned,
          submitBy: data.submitBy,
          agrID: data.agrID,
          sortOrder: data.sortOrder,
          isGovt: data.isGovt,
          isGSTExempt: data.isGSTExempt,
          autoGen: data.autoGen,
          loginEnabled: data.loginEnabled || false,
        });
      }

      await loadHcfs();
      setShowModal(false);
      setEditingHCF(null);
    } catch (err: any) {
      console.error('Failed to save HCF:', err);
      setError(err.message || 'Failed to save HCF');
      alert(err.message || 'Failed to save HCF');
    } finally {
      setSaving(false);
    }
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
          title="HCF Master"
          subtitle="Manage healthcare facility master data"
        />

        <div className="hcf-master-page">
          {error && (
            <div className="error-message" style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
              {error}
            </div>
          )}
          {loading && hcfs.length === 0 && (
            <div className="loading-message" style={{ padding: '10px', marginBottom: '20px', textAlign: 'center' }}>
              Loading HCFs...
            </div>
          )}
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">HCF Master</h1>
              <p className="ra-page-subtitle">Manage HCF information and details</p>
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
                placeholder="Search by HCF code, name, company..."
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
              {canCreate && (
                <button className="ra-add-btn" onClick={handleAdd}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add HCF
                </button>
              )}
            </div>
          </div>

          {/* HCFs Table */}
          <div className="hcf-master-table-container">
            <table className="hcf-master-table">
              <thead>
                <tr>
                  <th>COMPANY NAME</th>
                  <th>HCF CODE</th>
                  <th>HCF NAME</th>
                  <th>HCF SHORT NAME</th>
                  <th>STATE CODE</th>
                  <th>DISTRICT</th>
                  <th>PINCODE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading && hcfs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      Loading...
                    </td>
                  </tr>
                ) : filteredHCFs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      No HCF records found
                    </td>
                  </tr>
                ) : (
                  filteredHCFs.map((hcf) => (
                    <tr key={hcf.id}>
                      <td>{hcf.companyName || '-'}</td>
                      <td>{hcf.hcfCode || '-'}</td>
                      <td>{hcf.hcfName || '-'}</td>
                      <td>{hcf.hcfShortName || '-'}</td>
                      <td>{hcf.stateCode || '-'}</td>
                      <td>{hcf.district || '-'}</td>
                      <td>{hcf.pincode || '-'}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge status-badge--${hcf.status.toLowerCase()}`}>
                            {hcf.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => canEdit && handleEdit(hcf)}
                            title={canEdit ? "View" : "No permission to view"}
                            disabled={!canEdit}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => canEdit && handleEdit(hcf)}
                            title={canEdit ? "Edit" : "No permission to edit"}
                            disabled={!canEdit}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          {hcf.loginEnabled && (
                            <button
                              className="action-btn action-btn--reset"
                              onClick={() => canEdit && handleResetPassword(hcf.id)}
                              title={canEdit ? "Reset Password" : "No permission to reset password"}
                              disabled={!canEdit}
                              style={{ backgroundColor: '#f59e0b', color: 'white' }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                <path d="M21 3v5h-5"></path>
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                <path d="M3 21v-5h5"></path>
                              </svg>
                            </button>
                          )}
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => canDelete && handleDelete(hcf.id)}
                            title={canDelete ? "Delete" : "No permission to delete"}
                            disabled={!canDelete}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Info */}
          <div className="cm-pagination-info">
            Showing {filteredHCFs.length} of {hcfs.length} items
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
            setAdvancedFilters({ hcfCode: '', hcfName: '', companyName: '' });
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

      {/* HCF Add/Edit Modal */}
      {showModal && (
        <HCFFormModal
          hcf={editingHCF}
          companies={companies.filter(c => c.status === 'Active')}
          areas={areas.filter(a => a.status === 'Active')}
          states={states.filter(s => s.status === 'Active')}
          pcbZones={pcbZones.filter(z => z.status === 'Active')}
          categories={categories.filter(c => c.status === 'Active')}
          routes={routes.filter(r => r.status === 'Active')}
          hcfTypes={hcfTypes.filter(t => t.status === 'Active')}
          saving={saving}
          onClose={() => {
            setShowModal(false);
            setEditingHCF(null);
          }}
          onSave={handleSave}
        />
      )}
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
    <div className="modal-overlay cm-filter-modal-overlay" onClick={onClose}>
      <div className="modal-content cm-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-filter-modal-header">
          <div className="cm-filter-modal-titlewrap">
            <div className="cm-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </div>
            <div>
              <div className="cm-filter-title">Advanced Filters</div>
              <div className="cm-filter-subtitle">Filter HCFs by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>HCF Code</label>
              <input
                type="text"
                value={draft.hcfCode}
                onChange={(e) => setDraft({ ...draft, hcfCode: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter HCF code"
              />
            </div>

            <div className="cm-filter-field">
              <label>HCF Name</label>
              <input
                type="text"
                value={draft.hcfName}
                onChange={(e) => setDraft({ ...draft, hcfName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter HCF name"
              />
            </div>

            <div className="cm-filter-field">
              <label>Company Name</label>
              <input
                type="text"
                value={draft.companyName}
                onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter company name"
              />
            </div>

            <div className="cm-filter-field">
              <label>Status</label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="cm-filter-select"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="cm-filter-modal-footer">
          <button
            type="button"
            className="cm-link-btn"
            onClick={() => {
              setDraftStatus('all');
              setDraft({ hcfCode: '', hcfName: '', companyName: '' });
              onClear();
            }}
          >
            Clear Filters
          </button>
          <button
            type="button"
            className="cm-btn cm-btn--primary cm-btn--sm"
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

// HCF Form Modal Component
interface HCFFormModalProps {
  hcf: HCF | null;
  companies: Company[];
  areas: Area[];
  states: State[];
  pcbZones: PCBZone[];
  categories: Category[];
  routes: Route[];
  hcfTypes: HcfTypeResponse[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<HCF>) => void;
}

const HCFFormModal = ({ hcf, companies, areas, states, pcbZones, categories, routes, hcfTypes, saving, onClose, onSave }: HCFFormModalProps) => {
  const getInitialFormData = useCallback(() => {
    if (hcf) {
      return { ...hcf };
    }
    return {
      companyName: '',
      companyID: '',
      hcfCode: '',
      password: '',
      hcfTypeCode: '',
      hcfName: '',
      hcfShortName: '',
      areaID: '',
      pincode: '',
      district: '',
      stateCode: '',
      groupCode: '',
      pcbZone: '',
      billingName: '',
      billingAddress: '',
      serviceAddress: '',
      gstin: '',
      regnNum: '',
      hospRegnDate: '',
      billingType: '',
      advAmount: '',
      billingOption: '',
      bedCount: '',
      bedRate: '',
      kgRate: '',
      lumpsum: '',
      accountsLandline: '',
      accountsMobile: '',
      accountsEmail: '',
      contactName: '',
      contactDesignation: '',
      contactMobile: '',
      contactEmail: '',
      agrSignAuthName: '',
      agrSignAuthDesignation: '',
      drName: '',
      drPhNo: '',
      drEmail: '',
      serviceStartDate: '',
      serviceEndDate: '',
      category: '',
      route: '',
      executive_Assigned: '',
      submitBy: '',
      agrID: '',
      sortOrder: '',
      isGovt: false,
      isGSTExempt: false,
      autoGen: false,
      loginEnabled: false,
      status: 'Active' as 'Active' | 'Inactive',
    };
  }, [hcf]);

  const [formData, setFormData] = useState<Partial<HCF>>(getInitialFormData);

  // Update formData when hcf prop changes
  useEffect(() => {
    setFormData(getInitialFormData());
  }, [hcf, getInitialFormData]);

  // Step-based navigation state
  const [currentStep, setCurrentStep] = useState(1);

  // Define steps
  const steps = [
    { number: 1, title: 'Basic Information', icon: 'building', key: 'basicInfo' },
    { number: 2, title: 'Location', icon: 'map-pin', key: 'location' },
    { number: 3, title: 'Addresses', icon: 'address', key: 'addresses' },
    { number: 4, title: 'Registration & GST', icon: 'shield', key: 'registration' },
    { number: 5, title: 'Billing', icon: 'billing', key: 'billing' },
    { number: 6, title: 'Contacts & Service', icon: 'contacts', key: 'contacts' },
  ];

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    // Only allow submit on last step
    if (currentStep === 6) {
      onSave(formData);
    }
  };

  const getStepIcon = (iconType: string) => {
    switch (iconType) {
      case 'building':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
            <path d="M9 22v-4h6v4"></path>
            <path d="M8 6h.01"></path>
            <path d="M16 6h.01"></path>
            <path d="M12 6h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M8 10h.01"></path>
            <path d="M8 14h.01"></path>
            <path d="M16 10h.01"></path>
            <path d="M16 14h.01"></path>
          </svg>
        );
      case 'map-pin':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        );
      case 'address':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        );
      case 'shield':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        );
      case 'billing':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        );
      case 'contacts':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content company-form-modal wizard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header company-form-header">
          <div className="modal-header-content">
            <div className="modal-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h2 className="modal-title">{hcf ? 'Edit HCF' : 'Add HCF'}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="wizard-progress">
          {steps.map((step) => {
            const isActive = currentStep >= step.number;
            const isCurrent = currentStep === step.number;
            const showIcon = isCurrent;

            return (
              <div
                key={step.number}
                className={`wizard-step ${isActive ? 'wizard-step--active' : ''} ${isCurrent ? 'wizard-step--current' : ''}`}
              >
                <div className="wizard-step-icon-wrapper">
                  {showIcon ? (
                    <div className="wizard-step-icon">{getStepIcon(step.icon)}</div>
                  ) : (
                    <div className="wizard-step-number">{step.number}</div>
                  )}
                </div>
                <div className="wizard-step-title">{step.title}</div>
              </div>
            );
          })}
        </div>

        <div className="wizard-content">
          <form className="company-form" onSubmit={handleSubmit}>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon">
                    {getStepIcon('building')}
                  </div>
                  <h3 className="wizard-step-header-title">Basic Information</h3>
                </div>
                <div className="form-grid-two-col">
                  <div className="form-group">
                    <label className="form-label">
                      Company Name <span className="required-asterisk">*</span>
                    </label>
                    <select
                      value={formData.companyName || ''}
                      onChange={(e) => {
                        const selectedCompany = companies.find(c => c.companyName === e.target.value);
                        setFormData({ ...formData, companyName: e.target.value, companyID: selectedCompany?.id || '' });
                      }}
                      required
                      className="form-select"
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
                    <label className="form-label">Company ID</label>
                    <input
                      type="text"
                      value={formData.companyID || ''}
                      readOnly
                      className="form-input"
                      style={{ backgroundColor: '#f1f5f9' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      HCF Code <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.hcfCode || ''}
                      onChange={(e) => setFormData({ ...formData, hcfCode: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Password <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">HCF Type Code</label>
                    <select
                      value={formData.hcfTypeCode || ''}
                      onChange={(e) => setFormData({ ...formData, hcfTypeCode: e.target.value })}
                      className="form-select"
                    >
                      <option value="">Select HCF Type</option>
                      {hcfTypes.map((type) => (
                        <option key={type.id} value={type.hcfTypeCode}>
                          {type.hcfTypeCode} - {type.hcfTypeName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      HCF Name <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.hcfName || ''}
                      onChange={(e) => setFormData({ ...formData, hcfName: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">HCF Short Name</label>
                    <input
                      type="text"
                      value={formData.hcfShortName || ''}
                      onChange={(e) => setFormData({ ...formData, hcfShortName: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Group Code</label>
                    <input
                      type="text"
                      value={formData.groupCode || ''}
                      onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location Information */}
            {currentStep === 2 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-pink">
                    {getStepIcon('map-pin')}
                  </div>
                  <h3 className="wizard-step-header-title">Location Information</h3>
                </div>
                <div className="form-grid-two-col">
                  <div className="form-group">
                    <label className="form-label">
                      Area ID <span className="required-asterisk">*</span>
                    </label>
                    <select
                      value={formData.areaID || ''}
                      onChange={(e) => setFormData({ ...formData, areaID: e.target.value })}
                      required
                      className="form-select"
                    >
                      <option value="">Select Area</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.areaName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      State Code <span className="required-asterisk">*</span>
                    </label>
                    <select
                      value={formData.stateCode || ''}
                      onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                      required
                      className="form-select"
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.stateCode}>
                          {state.stateCode} - {state.stateName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      District <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.district || ''}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Pincode <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pincode || ''}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PCB Zone</label>
                    <select
                      value={formData.pcbZone || ''}
                      onChange={(e) => setFormData({ ...formData, pcbZone: e.target.value })}
                      className="form-select"
                    >
                      <option value="">Select PCB Zone</option>
                      {pcbZones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.pcbZoneName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Addresses */}
            {currentStep === 3 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-green">
                    {getStepIcon('address')}
                  </div>
                  <h3 className="wizard-step-header-title">Addresses</h3>
                </div>
                <div className="form-grid-two-col">
                  <div className="form-group form-group--full">
                    <label className="form-label">Billing Address</label>
                    <textarea
                      value={formData.billingAddress || ''}
                      onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                      rows={3}
                      className="form-textarea"
                    />
                  </div>
                  <div className="form-group form-group--full">
                    <label className="form-label">Service Address</label>
                    <textarea
                      value={formData.serviceAddress || ''}
                      onChange={(e) => setFormData({ ...formData, serviceAddress: e.target.value })}
                      rows={3}
                      className="form-textarea"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Billing Name</label>
                    <input
                      type="text"
                      value={formData.billingName || ''}
                      onChange={(e) => setFormData({ ...formData, billingName: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Registration & GST */}
            {currentStep === 4 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-purple">
                    {getStepIcon('shield')}
                  </div>
                  <h3 className="wizard-step-header-title">Registration & GST</h3>
                </div>
                <div className="form-grid-two-col">
                  <div className="form-group">
                    <label className="form-label">GSTIN</label>
                    <input
                      type="text"
                      value={formData.gstin || ''}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Registration Number</label>
                    <input
                      type="text"
                      value={formData.regnNum || ''}
                      onChange={(e) => setFormData({ ...formData, regnNum: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hospital Registration Date</label>
                    <input
                      type="date"
                      value={formData.hospRegnDate || ''}
                      onChange={(e) => setFormData({ ...formData, hospRegnDate: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Is GST Exempt</label>
                    <select
                      value={formData.isGSTExempt ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, isGSTExempt: e.target.value === 'true' })}
                      className="form-select"
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Is Government</label>
                    <select
                      value={formData.isGovt ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, isGovt: e.target.value === 'true' })}
                      className="form-select"
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Billing Information */}
            {currentStep === 5 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-blue">
                    {getStepIcon('billing')}
                  </div>
                  <h3 className="wizard-step-header-title">Billing Information</h3>
                </div>
                <div className="form-grid-two-col">
                  <div className="form-group">
                    <label className="form-label">Billing Type</label>
                    <select
                      value={formData.billingType || ''}
                      onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                      className="form-select"
                    >
                      <option value="">Select Billing Type</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Billing Option</label>
                    <select
                      value={formData.billingOption || ''}
                      onChange={(e) => setFormData({ ...formData, billingOption: e.target.value })}
                      className="form-select"
                    >
                      <option value="">Select Billing Option</option>
                      <option value="Per Bed">Per Bed</option>
                      <option value="Per Kg">Per Kg</option>
                      <option value="Lumpsum">Lumpsum</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Advance Amount</label>
                    <input
                      type="text"
                      value={formData.advAmount || ''}
                      onChange={(e) => setFormData({ ...formData, advAmount: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bed Count</label>
                    <input
                      type="text"
                      value={formData.bedCount || ''}
                      onChange={(e) => setFormData({ ...formData, bedCount: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bed Rate</label>
                    <input
                      type="text"
                      value={formData.bedRate || ''}
                      onChange={(e) => setFormData({ ...formData, bedRate: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kg Rate</label>
                    <input
                      type="text"
                      value={formData.kgRate || ''}
                      onChange={(e) => setFormData({ ...formData, kgRate: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lumpsum</label>
                    <input
                      type="text"
                      value={formData.lumpsum || ''}
                      onChange={(e) => setFormData({ ...formData, lumpsum: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Contacts & Service */}
            {currentStep === 6 && (
              <div className="wizard-step-content">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-orange">
                    {getStepIcon('contacts')}
                  </div>
                  <h3 className="wizard-step-header-title">Contacts & Service</h3>
                </div>
                <div className="form-grid-two-col">
                  {/* Accounts Contact */}
                  <div className="form-group">
                    <label className="form-label">Accounts Landline</label>
                    <input
                      type="tel"
                      value={formData.accountsLandline || ''}
                      onChange={(e) => setFormData({ ...formData, accountsLandline: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Accounts Mobile</label>
                    <input
                      type="tel"
                      value={formData.accountsMobile || ''}
                      onChange={(e) => setFormData({ ...formData, accountsMobile: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Accounts Email</label>
                    <input
                      type="email"
                      value={formData.accountsEmail || ''}
                      onChange={(e) => setFormData({ ...formData, accountsEmail: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  {/* Contact Information */}
                  <div className="form-group">
                    <label className="form-label">Contact Name</label>
                    <input
                      type="text"
                      value={formData.contactName || ''}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Designation</label>
                    <input
                      type="text"
                      value={formData.contactDesignation || ''}
                      onChange={(e) => setFormData({ ...formData, contactDesignation: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Mobile</label>
                    <input
                      type="tel"
                      value={formData.contactMobile || ''}
                      onChange={(e) => setFormData({ ...formData, contactMobile: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail || ''}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  {/* Agreement Signatory */}
                  <div className="form-group">
                    <label className="form-label">Agreement Signatory Auth Name</label>
                    <input
                      type="text"
                      value={formData.agrSignAuthName || ''}
                      onChange={(e) => setFormData({ ...formData, agrSignAuthName: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Agreement Signatory Auth Designation</label>
                    <input
                      type="text"
                      value={formData.agrSignAuthDesignation || ''}
                      onChange={(e) => setFormData({ ...formData, agrSignAuthDesignation: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Agreement ID</label>
                    <input
                      type="text"
                      value={formData.agrID || ''}
                      onChange={(e) => setFormData({ ...formData, agrID: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  {/* Doctor Information */}
                  <div className="form-group">
                    <label className="form-label">Doctor Name</label>
                    <input
                      type="text"
                      value={formData.drName || ''}
                      onChange={(e) => setFormData({ ...formData, drName: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Doctor Phone Number</label>
                    <input
                      type="tel"
                      value={formData.drPhNo || ''}
                      onChange={(e) => setFormData({ ...formData, drPhNo: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Doctor Email</label>
                    <input
                      type="email"
                      value={formData.drEmail || ''}
                      onChange={(e) => setFormData({ ...formData, drEmail: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  {/* Service Information */}
                  <div className="form-group">
                    <label className="form-label">Service Start Date</label>
                    <input
                      type="date"
                      value={formData.serviceStartDate || ''}
                      onChange={(e) => setFormData({ ...formData, serviceStartDate: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service End Date</label>
                    <input
                      type="date"
                      value={formData.serviceEndDate || ''}
                      onChange={(e) => setFormData({ ...formData, serviceEndDate: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="form-select"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Route</label>
                    <select
                      value={formData.route || ''}
                      onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                      className="form-select"
                    >
                      <option value="">Select Route</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.routeName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Executive Assigned</label>
                    <input
                      type="text"
                      value={formData.executive_Assigned || ''}
                      onChange={(e) => setFormData({ ...formData, executive_Assigned: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Submit By</label>
                    <input
                      type="text"
                      value={formData.submitBy || ''}
                      onChange={(e) => setFormData({ ...formData, submitBy: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  {/* Additional Information */}
                  <div className="form-group">
                    <label className="form-label">Sort Order</label>
                    <input
                      type="text"
                      value={formData.sortOrder || ''}
                      onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Auto Generate</label>
                    <select
                      value={formData.autoGen ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, autoGen: e.target.value === 'true' })}
                      className="form-select"
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={formData.loginEnabled || false}
                        onChange={(e) => setFormData({ ...formData, loginEnabled: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      Enable Login
                    </label>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      Allow this HCF to login to the system
                    </p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      value={formData.status || 'Active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                      className="form-select"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="wizard-footer">
          <button type="button" className="wp-btn wp-btn--cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentStep > 1 && (
              <button type="button" className="wp-btn wp-btn--secondary" onClick={handleBack} disabled={saving}>
                Back
              </button>
            )}
            {currentStep < 6 ? (
              <button type="button" className="wp-btn wp-btn--primary" onClick={handleNext} disabled={saving}>
                Next
              </button>
            ) : (
              <button type="button" className="wp-btn wp-btn--primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : (hcf ? 'Update' : 'Save')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HCFMasterPage;

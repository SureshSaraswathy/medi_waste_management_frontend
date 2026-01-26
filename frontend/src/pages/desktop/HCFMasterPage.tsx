import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { canCreateMasterData, canEditMasterData, canDeleteMasterData } from '../../utils/permissions';
import { hcfService, HcfResponse } from '../../services/hcfService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { areaService, AreaResponse } from '../../services/areaService';
import { stateService, StateResponse } from '../../services/stateService';
import { categoryService, CategoryResponse } from '../../services/categoryService';
import { routeService, RouteResponse } from '../../services/routeService';
import { pcbZoneService, PcbZoneResponse } from '../../services/pcbZoneService';
import { hcfTypeService, HcfTypeResponse } from '../../services/hcfTypeService';
import './hcfMasterPage.css';
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
  const { logout, user } = useAuth();
  const location = useLocation();
  const canCreate = canCreateMasterData(user);
  const canEdit = canEditMasterData(user);
  const canDelete = canDeleteMasterData(user);
  
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

  const filteredHCFs = hcfs.filter(hcf =>
    hcf.hcfName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hcf.hcfCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hcf.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hcf.hcfShortName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', active: location.pathname === '/dashboard' },
    { path: '/transaction', label: 'Transaction', icon: '💼', active: location.pathname === '/transaction' },
    { path: '/finance', label: 'Finance', icon: '💰', active: location.pathname === '/finance' },
    { path: '/commercial-agreements', label: 'Commercial Agreements', icon: '📝', active: location.pathname === '/commercial-agreements' },
    { path: '/compliance-training', label: 'Compliance & Training', icon: '✅', active: location.pathname === '/compliance-training' },
    { path: '/master', label: 'Masters', icon: '📋', active: location.pathname.startsWith('/master') },
    { path: '/report/billing-finance', label: 'Reports', icon: '📈', active: location.pathname.startsWith('/report') },
  ];

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-logo">Waste Management</h2>
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

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Masters / HCF Master</span>
          </div>
        </header>

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
          <div className="hcf-master-header">
            <h1 className="hcf-master-title">HCF Master</h1>
          </div>


          <div className="hcf-master-actions" style={{ 
            display: 'flex', 
            width: '100%', 
            justifyContent: 'flex-start', 
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
            flexWrap: 'nowrap'
          }}>
            <div className="hcf-search-box" style={{ flex: '0 1 auto', maxWidth: '400px', minWidth: '200px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="hcf-search-input"
                placeholder="Search HCF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              className="add-hcf-btn" 
              onClick={handleAdd}
              disabled={!canCreate}
              style={{ 
                display: 'flex !important',
                visibility: 'visible !important',
                opacity: canCreate ? 1 : 0.6,
                cursor: canCreate ? 'pointer' : 'not-allowed',
                position: 'relative',
                zIndex: 10,
                minWidth: '120px',
                minHeight: '40px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 600,
                flexShrink: 0,
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
              title={!canCreate ? 'No permission to create HCF' : 'Add new HCF'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add HCF
            </button>
          </div>

          <div className="hcf-table-container">
            <table className="hcf-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Company Name</th>
                  <th style={{ width: '8%' }}>HCF Code</th>
                  <th style={{ width: '12%' }}>HCF Name</th>
                  <th style={{ width: '10%' }}>HCF Short Name</th>
                  <th style={{ width: '7%' }}>State Code</th>
                  <th style={{ width: '10%' }}>District</th>
                  <th style={{ width: '8%' }}>Pincode</th>
                  <th style={{ width: '8%' }}>Status</th>
                  <th style={{ 
                    width: '120px',
                    minWidth: '120px',
                    maxWidth: '120px',
                    padding: '10px 8px',
                    textAlign: 'left',
                    backgroundColor: '#f1f5f9'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && hcfs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      Loading HCFs...
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
                        <span className={`status-badge status-badge--${hcf.status.toLowerCase()}`}>
                          {hcf.status}
                        </span>
                      </td>
                      <td style={{ 
                        width: '120px',
                        minWidth: '120px',
                        maxWidth: '120px',
                        padding: '8px',
                        whiteSpace: 'nowrap',
                        backgroundColor: '#ffffff'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          width: '100%',
                          visibility: 'visible',
                          flexWrap: 'nowrap'
                        }}>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => canEdit && handleEdit(hcf)}
                            title={canEdit ? "Edit" : "No permission to edit"}
                            disabled={!canEdit}
                            style={{ 
                              display: 'flex',
                              visibility: 'visible',
                              opacity: canEdit ? 1 : 0.5,
                              cursor: canEdit ? 'pointer' : 'not-allowed',
                              width: '32px',
                              height: '32px',
                              minWidth: '32px',
                              minHeight: '32px',
                              backgroundColor: canEdit ? '#3b82f6' : '#e5e7eb',
                              color: canEdit ? '#ffffff' : '#6b7280',
                              border: 'none',
                              borderRadius: '6px',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              padding: 0,
                              margin: 0
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => canDelete && handleDelete(hcf.id)}
                            title={canDelete ? "Delete" : "No permission to delete"}
                            disabled={!canDelete}
                            style={{ 
                              display: 'flex',
                              visibility: 'visible',
                              opacity: canDelete ? 1 : 0.5,
                              cursor: canDelete ? 'pointer' : 'not-allowed',
                              width: '32px',
                              height: '32px',
                              minWidth: '32px',
                              minHeight: '32px',
                              backgroundColor: canDelete ? '#ef4444' : '#e5e7eb',
                              color: canDelete ? '#ffffff' : '#6b7280',
                              border: 'none',
                              borderRadius: '6px',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              padding: 0,
                              margin: 0
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <div className="hcf-pagination-info">
            Showing {filteredHCFs.length} of {hcfs.length} Items
          </div>
        </div>
      </main>

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
      status: 'Active' as 'Active' | 'Inactive',
    };
  }, [hcf]);

  const [formData, setFormData] = useState<Partial<HCF>>(getInitialFormData);

  // Update formData when hcf prop changes
  useEffect(() => {
    setFormData(getInitialFormData());
  }, [hcf, getInitialFormData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{hcf ? 'Edit HCF' : 'Add HCF'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="hcf-form" onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => {
                    const selectedCompany = companies.find(c => c.companyName === e.target.value);
                    setFormData({ ...formData, companyName: e.target.value, companyID: selectedCompany?.id || '' });
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
                <label>Company ID</label>
                <input
                  type="text"
                  value={formData.companyID || ''}
                  readOnly
                  style={{ backgroundColor: '#f1f5f9' }}
                />
              </div>
              <div className="form-group">
                <label>HCF Code *</label>
                <input
                  type="text"
                  value={formData.hcfCode || ''}
                  onChange={(e) => setFormData({ ...formData, hcfCode: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>HCF Type Code</label>
                <select
                  value={formData.hcfTypeCode || ''}
                  onChange={(e) => setFormData({ ...formData, hcfTypeCode: e.target.value })}
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
                <label>HCF Name *</label>
                <input
                  type="text"
                  value={formData.hcfName || ''}
                  onChange={(e) => setFormData({ ...formData, hcfName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>HCF Short Name</label>
                <input
                  type="text"
                  value={formData.hcfShortName || ''}
                  onChange={(e) => setFormData({ ...formData, hcfShortName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Group Code</label>
                <input
                  type="text"
                  value={formData.groupCode || ''}
                  onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="form-section">
            <h3 className="form-section-title">Location Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Area ID *</label>
                <select
                  value={formData.areaID || ''}
                  onChange={(e) => setFormData({ ...formData, areaID: e.target.value })}
                  required
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
                <label>State Code *</label>
                <select
                  value={formData.stateCode || ''}
                  onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                  required
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
                <label>District *</label>
                <input
                  type="text"
                  value={formData.district || ''}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Pincode *</label>
                <input
                  type="text"
                  value={formData.pincode || ''}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>PCB Zone</label>
                <select
                  value={formData.pcbZone || ''}
                  onChange={(e) => setFormData({ ...formData, pcbZone: e.target.value })}
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

          {/* Address Information */}
          <div className="form-section">
            <h3 className="form-section-title">Address Information</h3>
            <div className="form-grid">
              <div className="form-group form-group--full">
                <label>Billing Address</label>
                <textarea
                  value={formData.billingAddress || ''}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group form-group--full">
                <label>Service Address</label>
                <textarea
                  value={formData.serviceAddress || ''}
                  onChange={(e) => setFormData({ ...formData, serviceAddress: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Billing Name</label>
                <input
                  type="text"
                  value={formData.billingName || ''}
                  onChange={(e) => setFormData({ ...formData, billingName: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Registration & GST Information */}
          <div className="form-section">
            <h3 className="form-section-title">Registration & GST Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Registration Number</label>
                <input
                  type="text"
                  value={formData.regnNum || ''}
                  onChange={(e) => setFormData({ ...formData, regnNum: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Hospital Registration Date</label>
                <input
                  type="date"
                  value={formData.hospRegnDate || ''}
                  onChange={(e) => setFormData({ ...formData, hospRegnDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Is GST Exempt</label>
                <select
                  value={formData.isGSTExempt ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isGSTExempt: e.target.value === 'true' })}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className="form-group">
                <label>Is Government</label>
                <select
                  value={formData.isGovt ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isGovt: e.target.value === 'true' })}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="form-section">
            <h3 className="form-section-title">Billing Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Billing Type</label>
                <select
                  value={formData.billingType || ''}
                  onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                >
                  <option value="">Select Billing Type</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Billing Option</label>
                <select
                  value={formData.billingOption || ''}
                  onChange={(e) => setFormData({ ...formData, billingOption: e.target.value })}
                >
                  <option value="">Select Billing Option</option>
                  <option value="Per Bed">Per Bed</option>
                  <option value="Per Kg">Per Kg</option>
                  <option value="Lumpsum">Lumpsum</option>
                </select>
              </div>
              <div className="form-group">
                <label>Advance Amount</label>
                <input
                  type="text"
                  value={formData.advAmount || ''}
                  onChange={(e) => setFormData({ ...formData, advAmount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Bed Count</label>
                <input
                  type="text"
                  value={formData.bedCount || ''}
                  onChange={(e) => setFormData({ ...formData, bedCount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Bed Rate</label>
                <input
                  type="text"
                  value={formData.bedRate || ''}
                  onChange={(e) => setFormData({ ...formData, bedRate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Kg Rate</label>
                <input
                  type="text"
                  value={formData.kgRate || ''}
                  onChange={(e) => setFormData({ ...formData, kgRate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Lumpsum</label>
                <input
                  type="text"
                  value={formData.lumpsum || ''}
                  onChange={(e) => setFormData({ ...formData, lumpsum: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Accounts Contact */}
          <div className="form-section">
            <h3 className="form-section-title">Accounts Contact</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Accounts Landline</label>
                <input
                  type="tel"
                  value={formData.accountsLandline || ''}
                  onChange={(e) => setFormData({ ...formData, accountsLandline: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Accounts Mobile</label>
                <input
                  type="tel"
                  value={formData.accountsMobile || ''}
                  onChange={(e) => setFormData({ ...formData, accountsMobile: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Accounts Email</label>
                <input
                  type="email"
                  value={formData.accountsEmail || ''}
                  onChange={(e) => setFormData({ ...formData, accountsEmail: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="form-section">
            <h3 className="form-section-title">Contact Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Contact Name</label>
                <input
                  type="text"
                  value={formData.contactName || ''}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contact Designation</label>
                <input
                  type="text"
                  value={formData.contactDesignation || ''}
                  onChange={(e) => setFormData({ ...formData, contactDesignation: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contact Mobile</label>
                <input
                  type="tel"
                  value={formData.contactMobile || ''}
                  onChange={(e) => setFormData({ ...formData, contactMobile: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  value={formData.contactEmail || ''}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Agreement Signatory */}
          <div className="form-section">
            <h3 className="form-section-title">Agreement Signatory</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Agreement Signatory Auth Name</label>
                <input
                  type="text"
                  value={formData.agrSignAuthName || ''}
                  onChange={(e) => setFormData({ ...formData, agrSignAuthName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Agreement Signatory Auth Designation</label>
                <input
                  type="text"
                  value={formData.agrSignAuthDesignation || ''}
                  onChange={(e) => setFormData({ ...formData, agrSignAuthDesignation: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Agreement ID</label>
                <input
                  type="text"
                  value={formData.agrID || ''}
                  onChange={(e) => setFormData({ ...formData, agrID: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Doctor Information */}
          <div className="form-section">
            <h3 className="form-section-title">Doctor Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Doctor Name</label>
                <input
                  type="text"
                  value={formData.drName || ''}
                  onChange={(e) => setFormData({ ...formData, drName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Doctor Phone Number</label>
                <input
                  type="tel"
                  value={formData.drPhNo || ''}
                  onChange={(e) => setFormData({ ...formData, drPhNo: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Doctor Email</label>
                <input
                  type="email"
                  value={formData.drEmail || ''}
                  onChange={(e) => setFormData({ ...formData, drEmail: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Service Information */}
          <div className="form-section">
            <h3 className="form-section-title">Service Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Service Start Date</label>
                <input
                  type="date"
                  value={formData.serviceStartDate || ''}
                  onChange={(e) => setFormData({ ...formData, serviceStartDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Service End Date</label>
                <input
                  type="date"
                  value={formData.serviceEndDate || ''}
                  onChange={(e) => setFormData({ ...formData, serviceEndDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                <label>Route</label>
                <select
                  value={formData.route || ''}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
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
                <label>Executive Assigned</label>
                <input
                  type="text"
                  value={formData.executive_Assigned || ''}
                  onChange={(e) => setFormData({ ...formData, executive_Assigned: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Submit By</label>
                <input
                  type="text"
                  value={formData.submitBy || ''}
                  onChange={(e) => setFormData({ ...formData, submitBy: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="form-section">
            <h3 className="form-section-title">Additional Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Sort Order</label>
                <input
                  type="text"
                  value={formData.sortOrder || ''}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Auto Generate</label>
                <select
                  value={formData.autoGen ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, autoGen: e.target.value === 'true' })}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || 'Active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : (hcf ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HCFMasterPage;

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { companyService, CompanyResponse } from '../../services/companyService';
import { stateService, StateResponse } from '../../services/stateService';
import { pcbZoneService, PcbZoneResponse } from '../../services/pcbZoneService';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { clearFieldValidation, focusAndScrollToField, setFieldValidationError, showValidationToast, validateRequiredFields } from '../../utils/formValidation';
import { notifySuccess, notifyError } from '../../utils/notify';
import PageHeader from '../../components/layout/PageHeader';
import '../desktop/dashboardPage.css';
import './companyMasterPage.css';
import '../desktop/autoclaveRegisterPage.css';
import NotificationBell from '../../components/NotificationBell';
import toast from 'react-hot-toast';

interface State {
  id: string;
  stateCode: string;
  stateName: string;
  status: 'Active' | 'Inactive';
}

interface PCBZone {
  id: string;
  pcbZoneName: string;
  pcbZoneAddress: string;
  contactNum: string;
  contactEmail: string;
  alertEmail: string;
  status: 'Active' | 'Inactive';
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  regdOfficeAddress: string;
  adminOfficeAddress: string;
  factoryAddress: string;
  gstin: string;
  state: string;
  pincode: string;
  prefix: string;
  authPersonName: string;
  authPersonDesignation: string;
  authPersonDOB: string;
  pcbauthNum: string;
  ctoWaterNum: string;
  ctoWaterDate: string;
  ctoWaterValidUpto: string;
  ctoAirNum: string;
  ctoAirDate: string;
  ctoAirValidUpto: string;
  cteWaterNum: string;
  cteWaterDate: string;
  cteWaterValidUpto: string;
  cteAirNum: string;
  cteAirDate: string;
  cteAirValidUpto: string;
  hazardousWasteNum: string;
  pcbZoneID: string;
  gstValidFrom: string;
  gstRate: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
  // Contact Information
  contactNum?: string;
  webAddress?: string;
  companyEmail?: string;
  // Bank & Payment Information
  bankAccountName?: string;
  bankName?: string;
  bankAccountNum?: string;
  bankIFSCode?: string;
  bankBranch?: string;
  upiId?: string;
  qrCode?: string;
}

interface AdvancedFilters {
  companyCode: string;
  companyName: string;
  gstin: string;
  state: string;
  pcbZone: string;
}

const CompanyMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    companyCode: '',
    companyName: '',
    gstin: '',
    state: '',
    pcbZone: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // States from State Master - Load from API
  const [states, setStates] = useState<State[]>([]);
  
  // PCB Zones from PCB Zone Master - Load from API
  const [pcbZones, setPcbZones] = useState<PCBZone[]>([]);

  const [companies, setCompanies] = useState<Company[]>([]);

  // Map backend CompanyResponse to frontend Company interface
  // This ensures API response fields correctly populate form fields
  const mapCompanyResponseToCompany = (apiCompany: CompanyResponse): Company => {
    // Log API response for debugging
    console.log('[CompanyMaster] Mapping API response to Company:', {
      id: apiCompany.id,
      companyCode: apiCompany.companyCode,
      companyName: apiCompany.companyName,
      gstin: apiCompany.gstin,
      pincode: apiCompany.pincode,
      state: apiCompany.state,
      prefix: apiCompany.prefix,
      regdOfficeAddress: apiCompany.regdOfficeAddress,
      adminOfficeAddress: apiCompany.adminOfficeAddress,
      factoryAddress: apiCompany.factoryAddress,
      authPersonName: apiCompany.authPersonName,
      authPersonDesignation: apiCompany.authPersonDesignation,
      authPersonDOB: apiCompany.authPersonDOB,
      pcbauthNum: apiCompany.pcbauthNum,
      hazardousWasteNum: apiCompany.hazardousWasteNum,
      ctoWaterNum: apiCompany.ctoWaterNum,
      ctoWaterDate: apiCompany.ctoWaterDate,
      ctoWaterValidUpto: apiCompany.ctoWaterValidUpto,
      ctoAirNum: apiCompany.ctoAirNum,
      ctoAirDate: apiCompany.ctoAirDate,
      ctoAirValidUpto: apiCompany.ctoAirValidUpto,
      cteWaterNum: apiCompany.cteWaterNum,
      cteWaterDate: apiCompany.cteWaterDate,
      cteWaterValidUpto: apiCompany.cteWaterValidUpto,
      cteAirNum: apiCompany.cteAirNum,
      cteAirDate: apiCompany.cteAirDate,
      cteAirValidUpto: apiCompany.cteAirValidUpto,
      pcbZoneID: apiCompany.pcbZoneID,
      gstValidFrom: apiCompany.gstValidFrom,
      gstRate: apiCompany.gstRate,
      contactNum: apiCompany.contactNum,
      webAddress: apiCompany.webAddress,
      companyEmail: apiCompany.companyEmail,
      bankAccountName: apiCompany.bankAccountName,
      bankName: apiCompany.bankName,
      bankAccountNum: apiCompany.bankAccountNum,
      bankIFSCode: apiCompany.bankIFSCode,
      bankBranch: apiCompany.bankBranch,
      upiId: apiCompany.upiId,
      qrCode: apiCompany.qrCode,
    });
    
    return {
      id: apiCompany.id,
      companyCode: apiCompany.companyCode,
      companyName: apiCompany.companyName,
      // Basic Information - Backend supported fields
      gstin: apiCompany.gstin || '',
      pincode: apiCompany.pincode || '',
      state: apiCompany.state || '',
      prefix: apiCompany.prefix || '',
      status: apiCompany.status,
      // Address Information - Backend supported fields
      regdOfficeAddress: apiCompany.regdOfficeAddress || '',
      adminOfficeAddress: apiCompany.adminOfficeAddress || '',
      factoryAddress: apiCompany.factoryAddress || '',
      // Authorized Person Information - Backend supported fields
      authPersonName: apiCompany.authPersonName || '',
      authPersonDesignation: apiCompany.authPersonDesignation || '',
      authPersonDOB: apiCompany.authPersonDOB || '',
      // PCB & Compliance - Backend supported fields
      pcbauthNum: apiCompany.pcbauthNum || '',
      hazardousWasteNum: apiCompany.hazardousWasteNum || '',
      // CTO (Consent To Operate) - Water - Backend supported fields
      ctoWaterNum: apiCompany.ctoWaterNum || '',
      ctoWaterDate: apiCompany.ctoWaterDate || '',
      ctoWaterValidUpto: apiCompany.ctoWaterValidUpto || '',
      // CTO (Consent To Operate) - Air - Backend supported fields
      ctoAirNum: apiCompany.ctoAirNum || '',
      ctoAirDate: apiCompany.ctoAirDate || '',
      ctoAirValidUpto: apiCompany.ctoAirValidUpto || '',
      // CTE (Consent To Establish) - Water - Backend supported fields
      cteWaterNum: apiCompany.cteWaterNum || '',
      cteWaterDate: apiCompany.cteWaterDate || '',
      cteWaterValidUpto: apiCompany.cteWaterValidUpto || '',
      // CTE (Consent To Establish) - Air - Backend supported fields
      cteAirNum: apiCompany.cteAirNum || '',
      cteAirDate: apiCompany.cteAirDate || '',
      cteAirValidUpto: apiCompany.cteAirValidUpto || '',
      // GST Details - Backend supported fields
      pcbZoneID: apiCompany.pcbZoneID || '',
      gstValidFrom: apiCompany.gstValidFrom || '',
      gstRate: apiCompany.gstRate || '',
      // Metadata
      createdBy: apiCompany.createdBy || 'System',
      createdOn: apiCompany.createdOn,
      modifiedBy: apiCompany.modifiedBy || 'System',
      modifiedOn: apiCompany.modifiedOn,
      // Contact Information - Backend supported fields
      contactNum: apiCompany.contactNum || '',
      webAddress: apiCompany.webAddress || '',
      companyEmail: apiCompany.companyEmail || '',
      // Bank & Payment Information - Backend supported fields
      bankAccountName: apiCompany.bankAccountName || '',
      bankName: apiCompany.bankName || '',
      bankAccountNum: apiCompany.bankAccountNum || '',
      bankIFSCode: apiCompany.bankIFSCode || '',
      bankBranch: apiCompany.bankBranch || '',
      upiId: apiCompany.upiId || '',
      qrCode: apiCompany.qrCode || '',
    };
  };

  // Load companies from API
  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiCompanies = await companyService.getAllCompanies(true); // Get only active companies
      const mappedCompanies = apiCompanies.map((apiCompany) => 
        mapCompanyResponseToCompany(apiCompany)
      );
      setCompanies(mappedCompanies);
    } catch (err: any) {
      const errorMessage = (err as Error).message || 'Failed to load companies';
      console.error('Error loading companies:', err);
      
      // Check for authentication errors
      if (
        errorMessage.includes('not authenticated') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        err?.status === 401 ||
        err?.status === 403
      ) {
        // Clear invalid auth data and redirect to login
        localStorage.removeItem('mw-auth-user');
        navigate('/login', { replace: true });
        return;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load states from State Master API
  const loadStates = async () => {
    try {
      const apiStates = await stateService.getAllStates(true); // Get only active states
      const mappedStates: State[] = apiStates.map((state: StateResponse) => ({
        id: state.id,
        stateCode: state.stateCode,
        stateName: state.stateName,
        status: state.status,
      }));
      setStates(mappedStates);
    } catch (err: any) {
      console.error('Error loading states:', err);
      // Don't show error toast here as it's not critical for initial load
      // States will just be empty, user can retry by refreshing
    }
  };

  // Load PCB zones from PCB Zone Master API
  const loadPcbZones = async () => {
    try {
      const apiZones = await pcbZoneService.getAllPcbZones(true); // Get only active zones
      const mappedZones: PCBZone[] = apiZones.map((zone: PcbZoneResponse) => ({
        id: zone.id,
        pcbZoneName: zone.pcbZoneName,
        pcbZoneAddress: zone.pcbZoneAddress || '',
        contactNum: zone.contactNum || '',
        contactEmail: zone.contactEmail || '',
        alertEmail: zone.alertEmail || '',
        status: zone.status,
      }));
      setPcbZones(mappedZones);
    } catch (err: any) {
      console.error('Error loading PCB zones:', err);
      // Don't show error toast here as it's not critical for initial load
      // PCB zones will just be empty, user can retry by refreshing
    }
  };

  // Load companies, states, and PCB zones on component mount
  useEffect(() => {
    loadCompanies();
    loadStates();
    loadPcbZones();
  }, []);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  // Helper function to get PCB Zone Name from ID
  const getPcbZoneName = (pcbZoneID: string | undefined): string => {
    if (!pcbZoneID) return '-';
    const zone = pcbZones.find(z => z.id === pcbZoneID);
    return zone ? zone.pcbZoneName : pcbZoneID; // Fallback to ID if zone not found
  };

  const filteredCompanies = companies.filter(company => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || (
      (company.companyName || '').toLowerCase().includes(query) ||
      (company.companyCode || '').toLowerCase().includes(query) ||
      (company.gstin || '').toLowerCase().includes(query)
    );
    
    // Advanced filters (UI-only, no backend API changes)
    const matchesCompanyCode = !advancedFilters.companyCode || 
      (company.companyCode || '').toLowerCase().includes(advancedFilters.companyCode.toLowerCase());
    const matchesCompanyName = !advancedFilters.companyName || 
      (company.companyName || '').toLowerCase().includes(advancedFilters.companyName.toLowerCase());
    const matchesGstin = !advancedFilters.gstin || 
      (company.gstin || '').toLowerCase().includes(advancedFilters.gstin.toLowerCase());
    const matchesState = !advancedFilters.state || 
      (company.state || '').toLowerCase().includes(advancedFilters.state.toLowerCase());
    const matchesPcbZone = !advancedFilters.pcbZone || 
      (getPcbZoneName(company.pcbZoneID) || '').toLowerCase().includes(advancedFilters.pcbZone.toLowerCase()) ||
      (company.pcbZoneID || '').toLowerCase().includes(advancedFilters.pcbZone.toLowerCase());
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
    
    return matchesSearch && matchesCompanyCode && matchesCompanyName && matchesGstin && 
           matchesState && matchesPcbZone && matchesStatus;
  });

  const handleAdd = () => {
    setEditingCompany(null);
    setShowModal(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this company?')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Validate deletion
      const { validateCompanyDelete } = await import('../../utils/deleteValidationService');
      const validation = await validateCompanyDelete(id);
      if (!validation.canDelete) {
        toast.error(validation.message);
        setLoading(false);
        return;
      }
      
      await companyService.deleteCompany(id);
      notifySuccess('Company deleted successfully');
      await loadCompanies(); // Reload companies after deletion
    } catch (err) {
      const errorMessage = (err as Error).message || 'Failed to delete company';
      setError(errorMessage);
      notifyError(errorMessage);
      console.error('Error deleting company:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to clean payload - removes undefined, null, empty strings, and whitespace-only strings
  const cleanPayload = <T extends Record<string, any>>(payload: T): Partial<T> => {
    const cleaned: Partial<T> = {};
    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      // Skip undefined, null, empty strings, and whitespace-only strings
      if (value === undefined || value === null) {
        return; // Skip this field
      }
      // For string values, trim and check if empty
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
          return; // Skip empty or whitespace-only strings
        }
        cleaned[key as keyof T] = trimmed as any; // Use trimmed value
      } else {
        // For non-string values (numbers, booleans, dates, etc.), include them
        cleaned[key as keyof T] = value;
      }
    });
    return cleaned;
  };

  // Helper function to check if a value is non-empty (handles strings, trimming whitespace)
  const hasValue = (value: any): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return true; // For non-string values (numbers, booleans, dates), consider them as having value
  };

  // Helper function to build API payload from form data
  const buildApiPayload = (formData: Partial<Company>, isUpdate: boolean) => {
    const payload: Record<string, any> = {};
    
    // Required fields (always included)
    if (hasValue(formData.companyCode)) payload.companyCode = formData.companyCode;
    if (hasValue(formData.companyName)) payload.companyName = formData.companyName;
    
    // Optional basic fields
    if (hasValue(formData.gstin)) payload.gstin = formData.gstin;
    if (hasValue(formData.pincode)) payload.pincode = formData.pincode;
    if (hasValue(formData.state)) payload.state = formData.state;
    if (hasValue(formData.prefix)) payload.prefix = formData.prefix;
    
    // Address Information
    if (hasValue(formData.regdOfficeAddress)) payload.regdOfficeAddress = formData.regdOfficeAddress;
    if (hasValue(formData.adminOfficeAddress)) payload.adminOfficeAddress = formData.adminOfficeAddress;
    if (hasValue(formData.factoryAddress)) payload.factoryAddress = formData.factoryAddress;
    
    // Authorized Person Information
    if (hasValue(formData.authPersonName)) payload.authPersonName = formData.authPersonName;
    if (hasValue(formData.authPersonDesignation)) payload.authPersonDesignation = formData.authPersonDesignation;
    if (hasValue(formData.authPersonDOB)) payload.authPersonDOB = formData.authPersonDOB;
    
    // PCB & Compliance
    if (hasValue(formData.pcbauthNum)) payload.pcbauthNum = formData.pcbauthNum;
    if (hasValue(formData.hazardousWasteNum)) payload.hazardousWasteNum = formData.hazardousWasteNum;
    
    // CTO (Consent To Operate) - Water
    if (hasValue(formData.ctoWaterNum)) payload.ctoWaterNum = formData.ctoWaterNum;
    if (hasValue(formData.ctoWaterDate)) payload.ctoWaterDate = formData.ctoWaterDate;
    if (hasValue(formData.ctoWaterValidUpto)) payload.ctoWaterValidUpto = formData.ctoWaterValidUpto;
    
    // CTO (Consent To Operate) - Air
    if (hasValue(formData.ctoAirNum)) payload.ctoAirNum = formData.ctoAirNum;
    if (hasValue(formData.ctoAirDate)) payload.ctoAirDate = formData.ctoAirDate;
    if (hasValue(formData.ctoAirValidUpto)) payload.ctoAirValidUpto = formData.ctoAirValidUpto;
    
    // CTE (Consent To Establish) - Water
    if (hasValue(formData.cteWaterNum)) payload.cteWaterNum = formData.cteWaterNum;
    if (hasValue(formData.cteWaterDate)) payload.cteWaterDate = formData.cteWaterDate;
    if (hasValue(formData.cteWaterValidUpto)) payload.cteWaterValidUpto = formData.cteWaterValidUpto;
    
    // CTE (Consent To Establish) - Air
    if (hasValue(formData.cteAirNum)) payload.cteAirNum = formData.cteAirNum;
    if (hasValue(formData.cteAirDate)) payload.cteAirDate = formData.cteAirDate;
    if (hasValue(formData.cteAirValidUpto)) payload.cteAirValidUpto = formData.cteAirValidUpto;
    
    // GST Details
    if (hasValue(formData.pcbZoneID)) payload.pcbZoneID = formData.pcbZoneID;
    if (hasValue(formData.gstValidFrom)) payload.gstValidFrom = formData.gstValidFrom;
    if (hasValue(formData.gstRate)) payload.gstRate = formData.gstRate;
    
    // Status (only for updates)
    if (isUpdate && formData.status) payload.status = formData.status;
    
    // Contact Information
    if (hasValue(formData.contactNum)) payload.contactNum = formData.contactNum;
    if (hasValue(formData.webAddress)) payload.webAddress = formData.webAddress;
    if (hasValue(formData.companyEmail)) payload.companyEmail = formData.companyEmail;
    
    // Bank & Payment Information
    if (hasValue(formData.bankAccountName)) payload.bankAccountName = formData.bankAccountName;
    if (hasValue(formData.bankName)) payload.bankName = formData.bankName;
    if (hasValue(formData.bankAccountNum)) payload.bankAccountNum = formData.bankAccountNum;
    if (hasValue(formData.bankIFSCode)) payload.bankIFSCode = formData.bankIFSCode;
    if (hasValue(formData.bankBranch)) payload.bankBranch = formData.bankBranch;
    if (hasValue(formData.upiId)) payload.upiId = formData.upiId;
    if (hasValue(formData.qrCode)) payload.qrCode = formData.qrCode;
    
    return cleanPayload(payload);
  };

  const handleSave = async (formData: Partial<Company>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Log form data before processing
      console.log('[CompanyMaster] Form data before save:', JSON.stringify(formData, null, 2));
      
      if (editingCompany) {
        // Update existing company
        const updateData = buildApiPayload(formData, true);
        
        console.log('[CompanyMaster] Update payload (cleaned):', JSON.stringify(updateData, null, 2));
        console.log('[CompanyMaster] Updating company ID:', editingCompany.id);
        
        const result = await companyService.updateCompany(editingCompany.id, updateData);
        
        console.log('[CompanyMaster] Update API response:', JSON.stringify(result, null, 2));
        notifySuccess('Company updated successfully');
      } else {
        // Create new company
        if (!formData.companyCode || !formData.companyName) {
          throw new Error('Company Code and Company Name are required');
        }
        
        const createData = buildApiPayload(formData, false);
        
        console.log('[CompanyMaster] Create payload (cleaned):', JSON.stringify(createData, null, 2));
        
        const result = await companyService.createCompany(createData);
        
        console.log('[CompanyMaster] Create API response:', JSON.stringify(result, null, 2));
        notifySuccess('Company created successfully');
      }
      
      // Reload companies after save
      await loadCompanies();
      setShowModal(false);
      setEditingCompany(null);
    } catch (err) {
      const errorMessage = (err as Error).message || 'Failed to save company';
      setError(errorMessage);
      notifyError(errorMessage);
      console.error('Error saving company:', err);
      
      // If authentication error, suggest login
      if (errorMessage.includes('403') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        const authError = 'Authentication failed. Please login again.';
        setError(authError);
        notifyError(authError);
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
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

      {/* Main Content */}
      <main className="dashboard-main">
        <PageHeader 
          title="Company Master"
          subtitle="Manage company master data"
        />

        {/* Error Banner */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fee', 
            color: '#c33', 
            marginBottom: '16px',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{error}</span>
            <button 
              onClick={() => setError(null)} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#c33', 
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 8px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px',
            color: '#666'
          }}>
            Loading...
          </div>
        )}

        <div className="company-master-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Company Master</h1>
              <p className="ra-page-subtitle">Manage company information and details</p>
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
                placeholder="Search by company code, name, GSTIN..."
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
                Add Company
              </button>
            </div>
          </div>

          {/* Companies Table */}
          <div className="company-master-table-container">
            <table className="company-master-table">
              <thead>
                <tr>
                  <th>COMPANY CODE</th>
                  <th>COMPANY NAME</th>
                  <th>GSTIN</th>
                  <th>STATE</th>
                  <th>PCB ZONE</th>
                  <th>GST FROM</th>
                  <th>GST RATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      Loading...
                    </td>
                  </tr>
                ) : filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      No companies found
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((company) => (
                    <tr key={company.id}>
                      <td>{company.companyCode || '-'}</td>
                      <td>{company.companyName || '-'}</td>
                      <td>{company.gstin || '-'}</td>
                      <td>{company.state || '-'}</td>
                      <td>{getPcbZoneName(company.pcbZoneID)}</td>
                      <td>{company.gstValidFrom || '-'}</td>
                      <td>{company.gstRate || '-'}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge status-badge--${company.status.toLowerCase()}`}>
                            {company.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => handleEdit(company)}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(company)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(company.id)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Info */}
          <div className="cm-pagination-info">
            Showing {filteredCompanies.length} of {companies.length} items
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
            setAdvancedFilters({ companyCode: '', companyName: '', gstin: '', state: '', pcbZone: '' });
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

      {/* Add/Edit Modal */}
      {showModal && (
        <CompanyFormModal
          company={editingCompany}
          states={states.filter(s => s.status === 'Active')}
          pcbZones={pcbZones.filter(z => z.status === 'Active')}
          loading={loading}
          onClose={() => {
            setShowModal(false);
            setEditingCompany(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Company Form Modal Component
interface CompanyFormModalProps {
  company: Company | null;
  states: State[];
  pcbZones: PCBZone[];
  loading?: boolean;
  onClose: () => void;
  onSave: (data: Partial<Company>) => void;
}

const CompanyFormModal = ({ company, states, pcbZones, loading = false, onClose, onSave }: CompanyFormModalProps) => {
  const defaultFormData = {
    companyCode: '',
    companyName: '',
    regdOfficeAddress: '',
    adminOfficeAddress: '',
    factoryAddress: '',
    gstin: '',
    state: '',
    pincode: '',
    prefix: '',
    authPersonName: '',
    authPersonDesignation: '',
    authPersonDOB: '',
    pcbauthNum: '',
    ctoWaterNum: '',
    ctoWaterDate: '',
    ctoWaterValidUpto: '',
    ctoAirNum: '',
    ctoAirDate: '',
    ctoAirValidUpto: '',
    cteWaterNum: '',
    cteWaterDate: '',
    cteWaterValidUpto: '',
    cteAirNum: '',
    cteAirDate: '',
    cteAirValidUpto: '',
    hazardousWasteNum: '',
    pcbZoneID: '',
    gstValidFrom: '',
    gstRate: '',
    status: 'Active' as 'Active' | 'Inactive',
    contactNum: '',
    webAddress: '',
    companyEmail: '',
    bankAccountName: '',
    bankName: '',
    bankAccountNum: '',
    bankIFSCode: '',
    bankBranch: '',
    upiId: '',
    qrCode: '',
  };

  const [formData, setFormData] = useState<Partial<Company>>(() => {
    if (company) {
      // When editing, merge company data with defaults
      // This ensures all fields are initialized correctly
      const merged = { ...defaultFormData, ...company };
      console.log('[CompanyFormModal] Initializing form data for edit:', {
        companyId: company.id,
        companyCode: merged.companyCode,
        companyName: merged.companyName,
        gstin: merged.gstin,
        pincode: merged.pincode,
        state: merged.state,
        prefix: merged.prefix,
        regdOfficeAddress: merged.regdOfficeAddress,
        adminOfficeAddress: merged.adminOfficeAddress,
        factoryAddress: merged.factoryAddress,
        authPersonName: merged.authPersonName,
        authPersonDesignation: merged.authPersonDesignation,
        authPersonDOB: merged.authPersonDOB,
        pcbauthNum: merged.pcbauthNum,
        hazardousWasteNum: merged.hazardousWasteNum,
        ctoWaterNum: merged.ctoWaterNum,
        ctoWaterDate: merged.ctoWaterDate,
        ctoWaterValidUpto: merged.ctoWaterValidUpto,
        ctoAirNum: merged.ctoAirNum,
        ctoAirDate: merged.ctoAirDate,
        ctoAirValidUpto: merged.ctoAirValidUpto,
        cteWaterNum: merged.cteWaterNum,
        cteWaterDate: merged.cteWaterDate,
        cteWaterValidUpto: merged.cteWaterValidUpto,
        cteAirNum: merged.cteAirNum,
        cteAirDate: merged.cteAirDate,
        cteAirValidUpto: merged.cteAirValidUpto,
        pcbZoneID: merged.pcbZoneID,
        gstValidFrom: merged.gstValidFrom,
        gstRate: merged.gstRate,
        contactNum: merged.contactNum,
        webAddress: merged.webAddress,
        companyEmail: merged.companyEmail,
        bankAccountName: merged.bankAccountName,
        bankName: merged.bankName,
        bankAccountNum: merged.bankAccountNum,
        bankIFSCode: merged.bankIFSCode,
        bankBranch: merged.bankBranch,
        upiId: merged.upiId,
        qrCode: merged.qrCode,
      });
      return merged;
    }
    console.log('[CompanyFormModal] Initializing form data for create');
    return defaultFormData;
  });

  // Step-based navigation state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Collapsible sections for Environmental Clearances
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    cto: true,
    cte: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper function to check if expiry date is within 30 days
  const isExpiringSoon = (expiryDate: string): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  // Define steps
  const steps = [
    { number: 1, label: 'Basic Info', title: 'Basic Information', icon: 'building', key: 'basicInfo' },
    { number: 2, label: 'Addresses', title: 'Addresses', icon: 'map-pin', key: 'addresses' },
    { number: 3, label: 'Auth Person', title: 'Authorized Person', icon: 'user', key: 'authorizedPerson' },
    { number: 4, label: 'CTO', title: 'Consent To Operate', icon: 'water', key: 'cto' },
    { number: 5, label: 'CTE', title: 'Consent To Establish', icon: 'water', key: 'cte' },
    { number: 6, label: 'GST', title: 'GST Details', icon: 'document', key: 'gstDetails' },
    { number: 7, label: 'Bank', title: 'Bank Details', icon: 'phone', key: 'bankDetails' },
  ];

  const handleNext = () => {
    const stepContainer = document.querySelector<HTMLElement>(`[data-company-step="${currentStep}"]`);
    if (stepContainer) {
      const invalidFields = validateRequiredFields(stepContainer);
      if (invalidFields.length > 0) {
        showValidationToast();
        focusAndScrollToField(invalidFields[0]);
        return;
      }
    }
    if (currentStep < 7) {
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
    if (currentStep === 7) {
      const stepContainer = document.querySelector<HTMLElement>('[data-company-step="7"]');
      if (stepContainer) {
        const invalidFields = validateRequiredFields(stepContainer);
        if (invalidFields.length > 0) {
          showValidationToast();
          focusAndScrollToField(invalidFields[0]);
          return;
        }
      }
      // Validate bank details business rule
      const hasAnyBankDetail = !!(formData.bankAccountName || formData.bankIFSCode || formData.bankBranch || formData.bankName || formData.upiId || formData.qrCode || formData.bankAccountNum);
      if (hasAnyBankDetail && (!formData.bankName || !formData.bankAccountNum)) {
        const bankNameField = document.getElementById('bank-name');
        const bankAccField = document.getElementById('bank-account-num');
        if (!formData.bankName && bankNameField) {
          setFieldValidationError(bankNameField, 'Bank Name is required.');
        }
        if (!formData.bankAccountNum && bankAccField) {
          setFieldValidationError(bankAccField, 'Bank Account Number is required.');
        }
        showValidationToast();
        if (!formData.bankName && bankNameField) {
          focusAndScrollToField(bankNameField);
        } else if (!formData.bankAccountNum && bankAccField) {
          focusAndScrollToField(bankAccField);
        }
        return;
      }
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
      case 'user':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        );
      case 'shield':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        );
      case 'water':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
        );
      case 'document':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        );
      case 'phone':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay ra-assignment-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-assignment-modal wizard-modal company-wizard-modal-template" onClick={(e) => e.stopPropagation()}>
        <div className="ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <div className="ra-assignment-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">
                {company ? 'Edit Company' : 'Add Company'}
              </h2>
              <p className="ra-assignment-modal-subtitle">
                {company ? 'Update company details' : 'Create a new company record.'}
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

        {/* Progress Steps */}
        <div className="company-wizard-steps">
          {steps.map((step, index) => {
            const isCurrent = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="company-wizard-step-item">
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.number)}
                  className={`company-wizard-step-btn ${isCurrent ? 'is-current' : ''} ${isCompleted ? 'is-complete' : ''}`}
                  aria-label={step.title}
                >
                  <div className={`company-wizard-step-badge ${isCurrent ? 'is-current' : ''} ${isCompleted ? 'is-complete' : ''}`}>
                    {isCurrent ? getStepIcon(step.icon) : <span>{step.number}</span>}
                  </div>
                  <span className="company-wizard-step-label">{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`company-wizard-step-connector ${isCompleted ? 'is-complete' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="wizard-content company-wizard-content">
        <form className="ra-assignment-form" onSubmit={handleSubmit} onInput={(e) => clearFieldValidation(e.target as HTMLElement)}>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="wizard-step-content company-step-content-standard" data-company-step="1">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon">
                    {getStepIcon('building')}
                  </div>
                  <h3 className="wizard-step-header-title">Basic Information</h3>
                </div>
                <div className="ra-assignment-form-grid">
                  <div className="ra-assignment-form-col">
                    <div className="ra-assignment-form-group">
                      <label htmlFor="company-code">
                        Company Code <span className="ra-required">*</span>
                      </label>
                      <input
                        id="company-code"
                        type="text"
                        value={formData.companyCode || ''}
                        onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                        placeholder="e.g., COMP001"
                        required
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="company-name">
                        Company Name <span className="ra-required">*</span>
                      </label>
                      <input
                        id="company-name"
                        type="text"
                        value={formData.companyName || ''}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="Enter company name"
                        required
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="gstin">
                        GSTIN <span className="ra-required">*</span>
                      </label>
                      <input
                        id="gstin"
                        type="text"
                        value={formData.gstin || ''}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                        required
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="state">
                        State <span className="ra-required">*</span>
                      </label>
                      <select
                        id="state"
                        value={formData.state || ''}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        required
                        className="ra-assignment-select"
                      >
                        <option value="">Select State</option>
                        {states.map((state) => (
                          <option key={state.id} value={state.stateCode}>
                            {state.stateCode}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="ra-assignment-form-col">
                    <div className="ra-assignment-form-group">
                      <label htmlFor="pincode">Pincode</label>
                      <input
                        id="pincode"
                        type="text"
                        value={formData.pincode || ''}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="prefix">Prefix</label>
                      <input
                        id="prefix"
                        type="text"
                        value={formData.prefix || ''}
                        onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                        placeholder="e.g., TI"
                        className="ra-assignment-input"
                      />
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

                {/* Contact Information Section */}
                <div className="company-section-block">
                  <h4 className="company-section-title">
                    Contact Information
                  </h4>
                  <div className="ra-assignment-form-grid">
                    <div className="ra-assignment-form-col">
                      <div className="ra-assignment-form-group">
                        <label htmlFor="contact-num">Contact Number</label>
                        <input
                          id="contact-num"
                          type="text"
                          value={formData.contactNum || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 15);
                            setFormData({ ...formData, contactNum: value });
                          }}
                          placeholder="Numbers only, max 15 digits"
                          maxLength={15}
                          className="ra-assignment-input"
                        />
                      </div>
                    </div>
                    <div className="ra-assignment-form-col">
                      <div className="ra-assignment-form-group">
                        <label htmlFor="web-address">Web Address</label>
                        <input
                          id="web-address"
                          type="url"
                          value={formData.webAddress || ''}
                          onChange={(e) => setFormData({ ...formData, webAddress: e.target.value })}
                          placeholder="https://example.com"
                          className="ra-assignment-input"
                        />
                      </div>
                    </div>
                    <div className="ra-assignment-form-col company-col-full">
                      <div className="ra-assignment-form-group">
                        <label htmlFor="company-email">Company Email</label>
                        <input
                          id="company-email"
                          type="email"
                          value={formData.companyEmail || ''}
                          onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                          placeholder="company@example.com"
                          className="ra-assignment-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Addresses */}
            {currentStep === 2 && (
              <div className="wizard-step-content company-step-content-standard" data-company-step="2">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-pink">
                    {getStepIcon('map-pin')}
                  </div>
                  <h3 className="wizard-step-header-title">Addresses</h3>
                </div>
                <div className="ra-assignment-form-grid">
                  <div className="ra-assignment-form-col company-col-full">
                    <div className="ra-assignment-form-group">
                      <label htmlFor="regd-office-address">Registered Office Address</label>
                      <textarea
                        id="regd-office-address"
                        value={formData.regdOfficeAddress || ''}
                        onChange={(e) => setFormData({ ...formData, regdOfficeAddress: e.target.value })}
                        rows={3}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="admin-office-address">Admin Office Address</label>
                      <textarea
                        id="admin-office-address"
                        value={formData.adminOfficeAddress || ''}
                        onChange={(e) => setFormData({ ...formData, adminOfficeAddress: e.target.value })}
                        rows={3}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="factory-address">Factory Address</label>
                      <textarea
                        id="factory-address"
                        value={formData.factoryAddress || ''}
                        onChange={(e) => setFormData({ ...formData, factoryAddress: e.target.value })}
                        rows={3}
                        className="ra-assignment-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Authorized Person & PCB Compliance */}
            {currentStep === 3 && (
              <div className="wizard-step-content company-step-content-standard" data-company-step="3">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-green">
                    {getStepIcon('user')}
                  </div>
                  <h3 className="wizard-step-header-title">Authorized Person</h3>
                </div>
                <div className="ra-assignment-form-grid">
                  <div className="ra-assignment-form-col">
                    <div className="ra-assignment-form-group">
                      <label htmlFor="auth-person-name">Name</label>
                      <input
                        id="auth-person-name"
                        type="text"
                        value={formData.authPersonName || ''}
                        onChange={(e) => setFormData({ ...formData, authPersonName: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="auth-person-dob">Date of Birth</label>
                      <input
                        id="auth-person-dob"
                        type="date"
                        value={formData.authPersonDOB || ''}
                        onChange={(e) => setFormData({ ...formData, authPersonDOB: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                  </div>
                  <div className="ra-assignment-form-col">
                    <div className="ra-assignment-form-group">
                      <label htmlFor="auth-person-designation">Designation</label>
                      <input
                        id="auth-person-designation"
                        type="text"
                        value={formData.authPersonDesignation || ''}
                        onChange={(e) => setFormData({ ...formData, authPersonDesignation: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                  </div>
                </div>

                {/* PCB & Compliance Section */}
                <div className="company-section-block">
                  <h4 className="company-section-title">
                    PCB & Compliance
                  </h4>
                  <div className="ra-assignment-form-grid">
                    <div className="ra-assignment-form-col">
                      <div className="ra-assignment-form-group">
                        <label htmlFor="pcb-auth-num">PCB Auth Num</label>
                        <input
                          id="pcb-auth-num"
                          type="text"
                          value={formData.pcbauthNum || ''}
                          onChange={(e) => setFormData({ ...formData, pcbauthNum: e.target.value })}
                          className="ra-assignment-input"
                        />
                      </div>
                    </div>
                    <div className="ra-assignment-form-col">
                      <div className="ra-assignment-form-group">
                        <label htmlFor="hazardous-waste-num">Hazardous Waste Num</label>
                        <input
                          id="hazardous-waste-num"
                          type="text"
                          value={formData.hazardousWasteNum || ''}
                          onChange={(e) => setFormData({ ...formData, hazardousWasteNum: e.target.value })}
                          className="ra-assignment-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Consent To Operate */}
            {currentStep === 4 && (
              <div className="wizard-step-content company-step-content-standard" data-company-step="4">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-orange">
                    {getStepIcon('water')}
                  </div>
                  <h3 className="wizard-step-header-title">Consent To Operate</h3>
                </div>
                <div className="ra-assignment-form-grid">
                  <div className="ra-assignment-form-col">
                    <div className="env-subsection-header">
                      <h5 className="env-subsection-title">Water</h5>
                      {isExpiringSoon(formData.ctoWaterValidUpto || '') && (
                        <span className="env-clearance-warning-badge">Expiring Soon</span>
                      )}
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cto-water-num">Certificate Number</label>
                      <input
                        id="cto-water-num"
                        type="text"
                        value={formData.ctoWaterNum || ''}
                        onChange={(e) => setFormData({ ...formData, ctoWaterNum: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cto-water-date">Issue Date</label>
                      <input
                        id="cto-water-date"
                        type="date"
                        value={formData.ctoWaterDate || ''}
                        onChange={(e) => setFormData({ ...formData, ctoWaterDate: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cto-water-expiry">Expiry Date</label>
                      <input
                        id="cto-water-expiry"
                        type="date"
                        value={formData.ctoWaterValidUpto || ''}
                        onChange={(e) => setFormData({ ...formData, ctoWaterValidUpto: e.target.value })}
                        className={`ra-assignment-input ${isExpiringSoon(formData.ctoWaterValidUpto || '') ? 'form-input--warning' : ''}`}
                      />
                    </div>
                  </div>
                  <div className="ra-assignment-form-col">
                    <div className="env-subsection-header">
                      <h5 className="env-subsection-title">Air</h5>
                      {isExpiringSoon(formData.ctoAirValidUpto || '') && (
                        <span className="env-clearance-warning-badge">Expiring Soon</span>
                      )}
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cto-air-num">Certificate Number</label>
                      <input
                        id="cto-air-num"
                        type="text"
                        value={formData.ctoAirNum || ''}
                        onChange={(e) => setFormData({ ...formData, ctoAirNum: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cto-air-date">Issue Date</label>
                      <input
                        id="cto-air-date"
                        type="date"
                        value={formData.ctoAirDate || ''}
                        onChange={(e) => setFormData({ ...formData, ctoAirDate: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cto-air-expiry">Expiry Date</label>
                      <input
                        id="cto-air-expiry"
                        type="date"
                        value={formData.ctoAirValidUpto || ''}
                        onChange={(e) => setFormData({ ...formData, ctoAirValidUpto: e.target.value })}
                        className={`ra-assignment-input ${isExpiringSoon(formData.ctoAirValidUpto || '') ? 'form-input--warning' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Consent To Establish */}
            {currentStep === 5 && (
              <div className="wizard-step-content company-step-content-standard" data-company-step="5">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-orange">
                    {getStepIcon('water')}
                  </div>
                  <h3 className="wizard-step-header-title">Consent To Establish</h3>
                </div>
                <div className="ra-assignment-form-grid">
                  <div className="ra-assignment-form-col">
                    <div className="env-subsection-header">
                      <h5 className="env-subsection-title">Water</h5>
                      {isExpiringSoon(formData.cteWaterValidUpto || '') && (
                        <span className="env-clearance-warning-badge">Expiring Soon</span>
                      )}
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cte-water-num">Certificate Number</label>
                      <input
                        id="cte-water-num"
                        type="text"
                        value={formData.cteWaterNum || ''}
                        onChange={(e) => setFormData({ ...formData, cteWaterNum: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cte-water-date">Issue Date</label>
                      <input
                        id="cte-water-date"
                        type="date"
                        value={formData.cteWaterDate || ''}
                        onChange={(e) => setFormData({ ...formData, cteWaterDate: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cte-water-expiry">Expiry Date</label>
                      <input
                        id="cte-water-expiry"
                        type="date"
                        value={formData.cteWaterValidUpto || ''}
                        onChange={(e) => setFormData({ ...formData, cteWaterValidUpto: e.target.value })}
                        className={`ra-assignment-input ${isExpiringSoon(formData.cteWaterValidUpto || '') ? 'form-input--warning' : ''}`}
                      />
                    </div>
                  </div>
                  <div className="ra-assignment-form-col">
                    <div className="env-subsection-header">
                      <h5 className="env-subsection-title">Air</h5>
                      {isExpiringSoon(formData.cteAirValidUpto || '') && (
                        <span className="env-clearance-warning-badge">Expiring Soon</span>
                      )}
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cte-air-num">Certificate Number</label>
                      <input
                        id="cte-air-num"
                        type="text"
                        value={formData.cteAirNum || ''}
                        onChange={(e) => setFormData({ ...formData, cteAirNum: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cte-air-date">Issue Date</label>
                      <input
                        id="cte-air-date"
                        type="date"
                        value={formData.cteAirDate || ''}
                        onChange={(e) => setFormData({ ...formData, cteAirDate: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="cte-air-expiry">Expiry Date</label>
                      <input
                        id="cte-air-expiry"
                        type="date"
                        value={formData.cteAirValidUpto || ''}
                        onChange={(e) => setFormData({ ...formData, cteAirValidUpto: e.target.value })}
                        className={`ra-assignment-input ${isExpiringSoon(formData.cteAirValidUpto || '') ? 'form-input--warning' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: GST Details */}
            {currentStep === 6 && (
              <div className="wizard-step-content company-step-content-standard" data-company-step="6">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-purple">
                    {getStepIcon('document')}
              </div>
                  <h3 className="wizard-step-header-title">GST Details</h3>
                </div>
                <div className="ra-assignment-form-grid">
                  <div className="ra-assignment-form-col">
                    <div className="ra-assignment-form-group">
                      <label htmlFor="pcb-zone-id">PCB Zone ID</label>
                      <select
                        id="pcb-zone-id"
                        value={formData.pcbZoneID || ''}
                        onChange={(e) => setFormData({ ...formData, pcbZoneID: e.target.value })}
                        className="ra-assignment-select"
                      >
                        <option value="">Select PCB Zone</option>
                        {pcbZones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.pcbZoneName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ra-assignment-form-group">
                      <label htmlFor="gst-rate">GST Rate</label>
                      <input
                        id="gst-rate"
                        type="text"
                        value={formData.gstRate || ''}
                        onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                        placeholder="e.g., 18%"
                        className="ra-assignment-input"
                      />
                    </div>
                  </div>
                  <div className="ra-assignment-form-col">
                    <div className="ra-assignment-form-group">
                      <label htmlFor="gst-valid-from">GST Valid From</label>
                      <input
                        id="gst-valid-from"
                        type="date"
                        value={formData.gstValidFrom || ''}
                        onChange={(e) => setFormData({ ...formData, gstValidFrom: e.target.value })}
                        className="ra-assignment-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Bank Details */}
            {currentStep === 7 && (
              <div className="wizard-step-content company-step-content-standard" data-company-step="7">
                <div className="wizard-step-header">
                  <div className="wizard-step-header-icon icon-blue">
                    {getStepIcon('phone')}
                  </div>
                  <h3 className="wizard-step-header-title">Bank Details</h3>
                </div>
                
                {/* Bank & Payment Information Section */}
                <div className="company-section-block company-section-block--tight">
                  <h4 className="company-section-title">
                    Bank & Payment Information
                  </h4>
                  <div className="ra-assignment-form-grid">
                    <div className="ra-assignment-form-col">
                      <div className="ra-assignment-form-group">
                        <label htmlFor="bank-account-name">Bank Account Name</label>
                        <input
                          id="bank-account-name"
                          type="text"
                          value={formData.bankAccountName || ''}
                          onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                          className="ra-assignment-input"
                        />
                      </div>
                      <div className="ra-assignment-form-group">
                        <label htmlFor="bank-name">
                          Bank Name
                          {((formData.bankAccountName || formData.bankIFSCode || formData.bankBranch || formData.bankAccountNum || formData.upiId || formData.qrCode) && !formData.bankName) && (
                            <span className="ra-required"> *</span>
                          )}
                        </label>
                        <input
                          id="bank-name"
                          type="text"
                          value={formData.bankName || ''}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          className="ra-assignment-input"
                        />
                      </div>
                      <div className="ra-assignment-form-group">
                        <label htmlFor="bank-ifsc-code">Bank IFSC Code</label>
                        <input
                          id="bank-ifsc-code"
                          type="text"
                          value={formData.bankIFSCode || ''}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                            setFormData({ ...formData, bankIFSCode: value });
                          }}
                          placeholder="ICIC000024 or HDFC0001234"
                          maxLength={11}
                          className="ra-assignment-input"
                        />
                        <small className="company-helper-text">
                          Format: 4 letters + 0 + 5-6 alphanumeric (e.g., ICIC000024, HDFC0001234)
                        </small>
                      </div>
                      <div className="ra-assignment-form-group">
                        <label htmlFor="upi-id">UPI ID</label>
                        <input
                          id="upi-id"
                          type="text"
                          value={formData.upiId || ''}
                          onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                          placeholder="john@paytm or 9876543210@ybl"
                          className="ra-assignment-input"
                        />
                        <small className="company-helper-text">
                          Format: name@bank (e.g., john@paytm, 9876543210@ybl, name@okaxis)
                        </small>
                      </div>
                    </div>
                    <div className="ra-assignment-form-col">
                      <div className="ra-assignment-form-group">
                        <label htmlFor="bank-account-num">
                          Bank Account Number
                          {((formData.bankAccountName || formData.bankIFSCode || formData.bankBranch || formData.bankName || formData.upiId || formData.qrCode) && !formData.bankAccountNum) && (
                            <span className="ra-required"> *</span>
                          )}
                        </label>
                        <input
                          id="bank-account-num"
                          type="text"
                          value={formData.bankAccountNum || ''}
                          onChange={(e) => setFormData({ ...formData, bankAccountNum: e.target.value })}
                          className="ra-assignment-input"
                        />
                      </div>
                      <div className="ra-assignment-form-group">
                        <label htmlFor="bank-branch">Bank Branch</label>
                        <input
                          id="bank-branch"
                          type="text"
                          value={formData.bankBranch || ''}
                          onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                          className="ra-assignment-input"
                        />
                      </div>
                      <div className="ra-assignment-form-group">
                        <label htmlFor="qr-code">QR Code</label>
                        <textarea
                          id="qr-code"
                          value={formData.qrCode || ''}
                          onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                          placeholder="Enter QR code string or upload QR image URL"
                          rows={3}
                          className="ra-assignment-input"
                        />
                        <small className="company-helper-text">
                          Enter QR code string value or image URL
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="ra-assignment-modal-footer company-wizard-footer">
          <div className="company-wizard-footer-actions">
            <button type="button" className="ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            {currentStep > 1 && (
              <button type="button" className="ra-assignment-btn ra-assignment-btn--cancel" onClick={handleBack} disabled={loading}>
                Back
              </button>
            )}
            {currentStep < 7 ? (
              <button type="button" className="ra-assignment-btn ra-assignment-btn--primary" onClick={handleNext} disabled={loading}>
                {loading ? 'Processing...' : 'Next'}
              </button>
            ) : (
              <button type="submit" className="ra-assignment-btn ra-assignment-btn--primary" disabled={loading} onClick={handleSubmit}>
                {loading ? 'Saving...' : company ? 'Update Company' : 'Save & Complete'}
              </button>
            )}
          </div>
        </div>
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
              <div className="cm-filter-subtitle">Filter companies by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>Company Code</label>
              <input
                type="text"
                value={draft.companyCode}
                onChange={(e) => setDraft({ ...draft, companyCode: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter company code"
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
              <label>GSTIN</label>
              <input
                type="text"
                value={draft.gstin}
                onChange={(e) => setDraft({ ...draft, gstin: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter GSTIN"
              />
            </div>

            <div className="cm-filter-field">
              <label>State</label>
              <input
                type="text"
                value={draft.state}
                onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter state"
              />
            </div>

            <div className="cm-filter-field">
              <label>PCB Zone</label>
              <input
                type="text"
                value={draft.pcbZone}
                onChange={(e) => setDraft({ ...draft, pcbZone: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter PCB zone"
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
              setDraft({ companyCode: '', companyName: '', gstin: '', state: '', pcbZone: '' });
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

export default CompanyMasterPage;

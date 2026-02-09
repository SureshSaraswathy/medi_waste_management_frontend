import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userService, UserResponse } from '../../services/userService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { roleService, RoleResponse } from '../../services/roleService';
import { activateUserWithPassword, resetPassword } from '../../services/passwordService';
import './userManagementPage.css';
import '../desktop/dashboardPage.css';

interface User {
  id: string;
  companyName: string;
  mobileNumber: string;
  userName: string;
  empCode: string;
  userRoleID: string;
  employmentType: string;
  webLogin: boolean;
  mobileApp: boolean;
  dlNum: string;
  aadhaar: string;
  pan: string;
  uan: string;
  pfNum: string;
  esiNum: string;
  address: string;
  area: string;
  city: string;
  district: string;
  pincode: string;
  emergencyContact: string;
  contractorName: string;
  grossSalary: string;
  password: string;
  emailAddress: string;
  designation?: string;
  companyNameThirdParty?: string;
  status: 'Active' | 'Inactive' | 'Draft';
  passwordEnabled?: boolean;
  otpEnabled?: boolean;
  forceOtpOnNextLogin?: boolean;
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

interface Role {
  id: string;
  roleName: string;
  description: string;
  companyName: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const UserManagementPage = () => {
  const { user: authUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to extract error message from various error formats
  const extractErrorMessage = (err: unknown): string => {
    console.log('[extractErrorMessage] Extracting error message from:', err);
    
    if (err instanceof Error) {
      const error = err as any;
      // Check if it has additional error data
      if (error.status) {
        console.log('[extractErrorMessage] Error has status:', error.status);
      }
      if (error.errorData) {
        console.log('[extractErrorMessage] Error has errorData:', error.errorData);
      }
      // Return the message
      const message = error.message || 'Unknown error occurred';
      console.log('[extractErrorMessage] Extracted message:', message);
      return message;
    }
    
    if (typeof err === 'string') {
      return err;
    }
    
    if (err && typeof err === 'object') {
      const errorObj = err as any;
      // Handle array of messages (validation errors)
      if (Array.isArray(errorObj.message)) {
        return errorObj.message.join(', ');
      }
      // Handle single message
      if (errorObj.message) {
        return String(errorObj.message);
      }
      // Handle error field
      if (errorObj.error) {
        if (Array.isArray(errorObj.error)) {
          return errorObj.error.join(', ');
        }
        return String(errorObj.error);
      }
      // Try to stringify if it's an object
      try {
        return JSON.stringify(errorObj);
      } catch {
        return 'Unknown error occurred';
      }
    }
    
    console.log('[extractErrorMessage] Could not extract message, returning default');
    return 'An unexpected error occurred. Please check the console for details.';
  };

  // Companies from Company Master - Load from API
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  // Map backend CompanyResponse to frontend Company interface
  const mapCompanyResponseToCompany = (apiCompany: CompanyResponse): Company => {
    return {
      id: apiCompany.id,
      companyCode: apiCompany.companyCode,
      companyName: apiCompany.companyName,
      status: apiCompany.status,
    };
  };

  // Load companies from API
  const loadCompanies = async (): Promise<Company[]> => {
    setCompaniesLoading(true);
    try {
      const apiCompanies = await companyService.getAllCompanies(true); // Get only active companies
      const mappedCompanies = apiCompanies.map((apiCompany) => 
        mapCompanyResponseToCompany(apiCompany)
      );
      setCompanies(mappedCompanies);
      return mappedCompanies;
    } catch (err) {
      console.error('Error loading companies:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage || 'Failed to load companies. Please ensure the backend is running and accessible.');
      return [];
    } finally {
      setCompaniesLoading(false);
    }
  };

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]); // Declare roles state early so it can be used in functions below

  // Helper function to get role name from role ID
  const getRoleNameFromId = (roleId: string | null | undefined): string => {
    if (!roleId) return '-';
    // Check if it's already a role name (not a UUID)
    const role = roles.find(r => r.id === roleId || r.roleName === roleId);
    if (role) {
      return role.roleName;
    }
    // If roles are not loaded yet or role not found, return loading placeholder or '-'
    if (roles.length === 0) {
      return 'Loading...'; // Show loading while roles are being fetched
    }
    // Role not found in loaded roles
    return '-';
  };

  // Helper function to get role ID from role name
  const getRoleIdFromName = (roleName: string | null | undefined): string | null => {
    if (!roleName) return null;
    // Check if it's already a UUID
    if (isValidUUID(roleName)) {
      return roleName;
    }
    // Otherwise, find role by name
    const role = roles.find(r => r.roleName === roleName);
    return role ? role.id : null;
  };

  // Map backend UserResponse to frontend User interface
  const mapUserResponseToUser = (apiUser: UserResponse, companyName: string): User => {
    // Convert role ID to role name for display
    // If roles are loaded, get the name; otherwise store the ID temporarily (will be updated by useEffect)
    let roleName = '-';
    if (apiUser.userRoleId) {
      if (roles.length > 0) {
        // Roles are loaded, try to get name
        const role = roles.find(r => r.id === apiUser.userRoleId);
        roleName = role ? role.roleName : '-';
      } else {
        // Roles not loaded yet, store the ID temporarily (will be converted by useEffect)
        roleName = apiUser.userRoleId;
      }
    }
    
    return {
      id: apiUser.userId,
      companyName: companyName,
      mobileNumber: apiUser.mobileNumber,
      userName: apiUser.userName,
      empCode: apiUser.employeeCode || '',
      userRoleID: roleName, // Store role name for display, will convert to ID when saving
      // Employee Profile data
      employmentType: apiUser.employmentType || '',
      designation: apiUser.designation || '',
      contractorName: apiUser.contractorName || '',
      companyNameThirdParty: apiUser.companyNameThirdParty || '',
      grossSalary: apiUser.grossSalary ? String(apiUser.grossSalary) : '',
      emailAddress: apiUser.emailAddress || '',
      // Identity & Compliance data
      aadhaar: apiUser.aadhaarNumber || '',
      pan: apiUser.panNumber || '',
      dlNum: apiUser.drivingLicenseNumber || '',
      pfNum: apiUser.pfNumber || '',
      uan: apiUser.uanNumber || '',
      esiNum: apiUser.esiNumber || '',
      // Address data
      address: apiUser.addressLine || '',
      area: apiUser.area || '',
      city: apiUser.city || '',
      district: apiUser.district || '',
      pincode: apiUser.pincode || '',
      emergencyContact: apiUser.emergencyContact || '',
      // User activation data
      webLogin: apiUser.webLogin,
      mobileApp: apiUser.mobileAppAccess,
      password: '',
      status: apiUser.status,
      passwordEnabled: apiUser.passwordEnabled,
      otpEnabled: apiUser.otpEnabled,
      forceOtpOnNextLogin: false, // Not available in current response
      createdBy: '',
      createdOn: apiUser.createdOn,
      modifiedBy: '',
      modifiedOn: apiUser.modifiedOn,
    };
  };

  // Load users from API
  const loadUsers = async (companiesToUse?: Company[]) => {
    // First, ensure companies are loaded
    let companiesList = companiesToUse || companies;
    if (companiesList.length === 0) {
      companiesList = await loadCompanies();
      if (companiesList.length === 0) {
        setUsers([]);
        setLoading(false);
        setError('No companies found. Please create a company first.');
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    try {
      // Load users for all companies
      const allUsers: User[] = [];
      let hasValidCompany = false;
      
      for (const company of companiesList) {
        // Verify company ID is a valid UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(company.id);
        if (!isUUID) {
          console.warn(`Skipping company ${company.companyName} - ID is not a valid UUID: ${company.id}`);
          continue;
        }
        
        try {
          hasValidCompany = true;
          const apiUsers = await userService.getUsersByCompany(company.id);
          const mappedUsers = apiUsers.map((apiUser) => 
            mapUserResponseToUser(apiUser, company.companyName)
          );
          allUsers.push(...mappedUsers);
        } catch (err) {
          // If one company fails, continue with others
          console.warn(`Failed to load users for company ${company.companyName}:`, err);
          const errorMessage = extractErrorMessage(err);
          if (errorMessage.includes('403') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            setError('Authentication failed. Please login again.');
          } else if (!errorMessage.includes('404')) {
            // Don't show error for 404 (no users for company), but show other errors
            console.warn(`Error loading users for ${company.companyName}: ${errorMessage}`);
          }
        }
      }
      
      if (!hasValidCompany) {
        setError('No valid companies found. Please create a company first.');
      } else {
        setUsers(allUsers);
        // Clear error if we successfully loaded at least one company's users
        if (allUsers.length > 0) {
          setError(null);
        }
      }
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage || 'Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load companies, users, and roles on component mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      try {
        // First load companies, then load roles first, then users
        const loadedCompanies = await loadCompanies();
        if (!isMounted) return;
        
        if (loadedCompanies.length > 0) {
          // Load roles first so they're available when mapping users
          await loadRoles(loadedCompanies);
          if (!isMounted) return;
          
          // Then load users (which will use the loaded roles for mapping)
          await loadUsers(loadedCompanies);
        } else {
          setError('No companies found. Please create a company first.');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('[UserManagementPage] Error during initialization:', err);
        const errorMessage = extractErrorMessage(err);
        setError(errorMessage || 'Failed to initialize page. Please refresh.');
      }
    };
    
    initializeData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Only run on mount

  // Re-map users when roles are loaded/updated to update role names
  useEffect(() => {
    if (roles.length > 0 && users.length > 0) {
      // Re-map users to update role names now that roles are loaded
      const updatedUsers = users.map(user => {
        // If userRoleID is a UUID, try to convert it to role name
        if (user.userRoleID && isValidUUID(user.userRoleID)) {
          const role = roles.find(r => r.id === user.userRoleID);
          if (role) {
            return { ...user, userRoleID: role.roleName };
          }
          // Role not found, keep as is or set to '-'
          return { ...user, userRoleID: '-' };
        }
        // If it's already a role name or '-', keep it
        return user;
      });
      // Only update if there are changes
      const hasChanges = updatedUsers.some((updatedUser, index) => 
        updatedUser.userRoleID !== users[index].userRoleID
      );
      if (hasChanges) {
        console.log('[UserManagementPage] Updating user role names after roles loaded');
        setUsers(updatedUsers);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]); // Re-run when roles change (users and helper functions are stable)

  // Mock users for initial development (remove when API is fully working)
  const [mockUsers] = useState<User[]>([
    {
      id: '1',
      companyName: 'Sample Company',
      mobileNumber: '+91-9876543210',
      userName: 'johndoe',
      empCode: 'EMP001',
      userRoleID: 'Admin',
      employmentType: 'Permanent',
      webLogin: true,
      mobileApp: true,
      dlNum: 'DL1234567890',
      aadhaar: '1234-5678-9012',
      pan: 'ABCDE1234F',
      uan: 'UAN123456789',
      pfNum: 'PF123456789',
      esiNum: 'ESI123456789',
      address: '123 Main Street',
      area: 'Downtown',
      city: 'Mumbai',
      district: 'Mumbai',
      pincode: '400001',
      emergencyContact: '+91-9876543211',
      contractorName: '',
      grossSalary: '50000',
      password: '********',
      emailAddress: 'john.doe@example.com',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '2',
      companyName: 'ABC Industries',
      mobileNumber: '+91-9876543212',
      userName: 'janesmith',
      empCode: 'EMP002',
      userRoleID: 'Manager',
      employmentType: 'Permanent',
      webLogin: true,
      mobileApp: false,
      dlNum: 'DL0987654321',
      aadhaar: '9876-5432-1098',
      pan: 'FGHIJ5678K',
      uan: 'UAN987654321',
      pfNum: 'PF987654321',
      esiNum: 'ESI987654321',
      address: '456 Admin Avenue',
      area: 'Suburban',
      city: 'Delhi',
      district: 'New Delhi',
      pincode: '110001',
      emergencyContact: '+91-9876543213',
      contractorName: '',
      grossSalary: '75000',
      password: '********',
      emailAddress: 'jane.smith@example.com',
      status: 'Active',
      createdBy: 'Admin',
      createdOn: '2023-01-02',
      modifiedBy: 'Admin',
      modifiedOn: '2023-01-02',
    },
    {
      id: '3',
      companyName: 'XYZ Corporation',
      mobileNumber: '+91-9876543214',
      userName: 'bobwilson',
      empCode: 'EMP003',
      userRoleID: 'Driver',
      employmentType: 'Contract',
      webLogin: false,
      mobileApp: true,
      dlNum: 'DL1122334455',
      aadhaar: '5555-6666-7777',
      pan: 'KLMNO9012P',
      uan: 'UAN555666777',
      pfNum: 'PF555666777',
      esiNum: 'ESI555666777',
      address: '789 Factory Road',
      area: 'Industrial',
      city: 'Bangalore',
      district: 'Bangalore',
      pincode: '560001',
      emergencyContact: '+91-9876543215',
      contractorName: 'ABC Contractors',
      grossSalary: '35000',
      password: '********',
      emailAddress: 'bob.wilson@example.com',
      status: 'Active',
      createdBy: 'Admin',
      createdOn: '2023-01-03',
      modifiedBy: 'Admin',
      modifiedOn: '2023-01-03',
    },
  ]);

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ), 
      active: location.pathname === '/dashboard' 
    },
    { 
      path: '/transaction', 
      label: 'Transaction', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ), 
      active: location.pathname === '/transaction' || location.pathname.startsWith('/transaction')
    },
    { 
      path: '/finance', 
      label: 'Finance', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ), 
      active: location.pathname === '/finance' || location.pathname.startsWith('/finance')
    },
    { 
      path: '/commercial-agreements', 
      label: 'Commercial / Agreements', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname === '/commercial-agreements' || location.pathname.startsWith('/commercial-agreements')
    },
    { 
      path: '/compliance-training', 
      label: 'Compliance & Training', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ), 
      active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training')
    },
    { 
      path: '/master', 
      label: 'Masters', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ), 
      active: location.pathname.startsWith('/master') 
    },
    { 
      path: '/report', 
      label: 'Reports', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname.startsWith('/report') 
    },
  ];

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      (user.userName || '').toLowerCase().includes(query) ||
      (user.emailAddress || '').toLowerCase().includes(query) ||
      (user.empCode || '').toLowerCase().includes(query) ||
      (user.mobileNumber || '').toLowerCase().includes(query) ||
      (user.companyName || '').toLowerCase().includes(query)
    );
  });

  const filteredRoles = roles.filter(role =>
    role.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = async (user: User) => {
    console.log('[handleEditUser] Editing user:', user.id);
    setLoading(true);
    setError(null);
    setViewMode(false);
    
    try {
      // Fetch complete user data from backend (including all related entities)
      const completeUserData = await userService.getUserById(user.id);
      console.log('[handleEditUser] Complete user data fetched:', completeUserData);
      
      // Find company name from companies list
      const userCompany = companies.find(c => c.id === completeUserData.companyId);
      const companyName = userCompany?.companyName || user.companyName;
      
      // Map the complete API response to frontend User interface
      const mappedUser = mapUserResponseToUser(completeUserData, companyName);
      console.log('[handleEditUser] Mapped user data:', mappedUser);
      
      setEditingUser(mappedUser);
      setShowUserModal(true);
    } catch (err) {
      console.error('[handleEditUser] Error fetching user data:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage || 'Failed to load user data. Please try again.');
      // Still open modal with existing data if fetch fails
    setEditingUser(user);
    setShowUserModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (user: User) => {
    console.log('[handleViewUser] Viewing user:', user.id);
    setLoading(true);
    setError(null);
    setViewMode(true);
    
    try {
      // Fetch complete user data from backend (including all related entities)
      const completeUserData = await userService.getUserById(user.id);
      console.log('[handleViewUser] Complete user data fetched:', completeUserData);
      
      // Find company name from companies list
      const userCompany = companies.find(c => c.id === completeUserData.companyId);
      const companyName = userCompany?.companyName || user.companyName;
      
      // Map the complete API response to frontend User interface
      const mappedUser = mapUserResponseToUser(completeUserData, companyName);
      console.log('[handleViewUser] Mapped user data:', mappedUser);
      
      setEditingUser(mappedUser);
      setShowUserModal(true);
    } catch (err) {
      console.error('[handleViewUser] Error fetching user data:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage || 'Failed to load user data. Please try again.');
      // Still open modal with existing data if fetch fails
    setEditingUser(user);
    setShowUserModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await userService.deleteUser(id);
      await loadUsers(); // Reload users after deletion
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage || 'Failed to delete user');
      console.error('Error deleting user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to validate UUID
  const isValidUUID = (value: string | undefined | null): boolean => {
    if (!value || value.trim() === '') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  };

  const handleSaveUser = async (formData: Partial<User>) => {
    console.log('handleSaveUser called with formData:', formData);
    setLoading(true);
    setError(null);
    
    try {
    if (editingUser) {
        // Update existing user with ALL steps data using complete update endpoint
        console.log('[handleSaveUser] ========== UPDATE START ==========');
        console.log('[handleSaveUser] Editing user ID:', editingUser.id);
        
        const selectedCompany = companies.find(c => c.companyName === formData.companyName) || companies[0];
        
        if (!selectedCompany) {
          throw new Error('Please select a company');
        }
        
        // Validate company ID is a UUID
        if (!isValidUUID(selectedCompany.id)) {
          throw new Error(`Invalid company ID. Please ensure companies are loaded from the API. Company ID: ${selectedCompany.id}`);
        }
        
        // Map all form data to complete user update DTO (same structure as create)
        const updateData: any = {
          // Step 1: Update User (Identity Only)
          companyId: selectedCompany.id,
          userName: formData.userName || '',
          mobileNumber: formData.mobileNumber || '',
          employeeCode: formData.empCode || null,
          emailAddress: formData.emailAddress || null,
        };
        
        // Convert role name to role ID (UUID) if needed
        // Only include userRoleId if it's a valid UUID (backend requirement)
        if (formData.userRoleID && formData.userRoleID.trim()) {
          console.log('[handleSaveUser] Processing userRoleID:', formData.userRoleID);
          const roleId = getRoleIdFromName(formData.userRoleID);
          console.log('[handleSaveUser] Converted role ID:', roleId);
          
          if (roleId && isValidUUID(roleId)) {
            updateData.userRoleId = roleId;
            console.log('[handleSaveUser] Using converted UUID role ID:', roleId);
          } else if (isValidUUID(formData.userRoleID)) {
            // Already a valid UUID
            updateData.userRoleId = formData.userRoleID;
            console.log('[handleSaveUser] Using provided UUID role ID:', formData.userRoleID);
    } else {
            // Role ID is not a valid UUID - skip it (userRoleId is optional)
            // This prevents validation errors when using mock roles with simple IDs
            console.warn('[handleSaveUser] Role ID is not a valid UUID, skipping role assignment:', {
              roleName: formData.userRoleID,
              roleId: roleId,
              message: 'Role will not be assigned. Please ensure roles are fetched from the backend API with valid UUIDs.'
            });
            // Don't include userRoleId in the payload - it's optional
          }
        } else {
          console.log('[handleSaveUser] No userRoleID provided, skipping role assignment');
        }
        
        // Step 2: Employee Profile
        updateData.employmentType = formData.employmentType && formData.employmentType.trim() ? formData.employmentType.trim() : null;
        updateData.designation = formData.designation && formData.designation.trim() ? formData.designation.trim() : null;
        updateData.contractorName = formData.contractorName && formData.contractorName.trim() ? formData.contractorName.trim() : null;
        updateData.companyNameThirdParty = formData.companyNameThirdParty && formData.companyNameThirdParty.trim() ? formData.companyNameThirdParty.trim() : null;
        updateData.grossSalary = formData.grossSalary ? (parseFloat(String(formData.grossSalary)) || null) : null;
        
        // Step 3: Identity & Compliance
        updateData.aadhaarNumber = formData.aadhaar && formData.aadhaar.trim() ? formData.aadhaar.trim() : null;
        updateData.panNumber = formData.pan && formData.pan.trim() ? formData.pan.trim() : null;
        updateData.drivingLicenseNumber = formData.dlNum && formData.dlNum.trim() ? formData.dlNum.trim() : null;
        updateData.pfNumber = formData.pfNum && formData.pfNum.trim() ? formData.pfNum.trim() : null;
        updateData.uanNumber = formData.uan && formData.uan.trim() ? formData.uan.trim() : null;
        updateData.esiNumber = formData.esiNum && formData.esiNum.trim() ? formData.esiNum.trim() : null;
        
        // Step 4: Address & Emergency
        updateData.addressLine = formData.address && formData.address.trim() ? formData.address.trim() : null;
        updateData.area = formData.area && formData.area.trim() ? formData.area.trim() : null;
        updateData.city = formData.city && formData.city.trim() ? formData.city.trim() : null;
        updateData.district = formData.district && formData.district.trim() ? formData.district.trim() : null;
        updateData.pincode = formData.pincode && formData.pincode.trim() ? formData.pincode.trim() : null;
        updateData.emergencyContact = formData.emergencyContact && formData.emergencyContact.trim() ? formData.emergencyContact.trim() : null;
        
        // Step 5: User Activation
        updateData.webLogin = formData.webLogin || false;
        updateData.mobileAppAccess = formData.mobileApp || false;
        updateData.status = formData.status || 'Draft';
        updateData.passwordEnabled = formData.passwordEnabled || false;
        updateData.otpEnabled = formData.otpEnabled || false;
        updateData.forceOtpOnNextLogin = formData.forceOtpOnNextLogin || false;
        
        console.log('[handleSaveUser] Update payload (FULL):', JSON.stringify(updateData, null, 2));
        console.log('[handleSaveUser] Field verification:');
        console.log('  - Email:', updateData.emailAddress);
        console.log('  - Aadhaar:', updateData.aadhaarNumber);
        console.log('  - PAN:', updateData.panNumber);
        console.log('  - ESI:', updateData.esiNumber);
        console.log('  - Address:', updateData.addressLine);
        
        // Call complete update endpoint
        let updateSuccess = false;
        try {
          const result = await userService.updateCompleteUser(editingUser.id, updateData);
          updateSuccess = true;
          console.log('[handleSaveUser] UPDATE API call successful. Result:', result);
          
          // Show success
          alert('User updated successfully!');
          
          // Close modal - MUST close even if reload fails
          console.log('[handleSaveUser] Closing modal...');
          setShowUserModal(false);
          setEditingUser(null);
          setError(null);
          console.log('[handleSaveUser] Modal closed');
          
          // Reload users after a delay
          setTimeout(async () => {
            try {
              await loadUsers();
              console.log('[handleSaveUser] Users reloaded');
            } catch (e) {
              console.error('[handleSaveUser] Reload error (data was saved):', e);
            }
          }, 500);
          
          console.log('[handleSaveUser] ========== UPDATE END (SUCCESS) ==========');
          
        } catch (apiErr) {
          updateSuccess = false;
          console.error('[handleSaveUser] ❌ UPDATE API CALL FAILED:', apiErr);
          throw apiErr;
        }
      } else {
        // Create complete new user with all steps data
        const selectedCompany = companies.find(c => c.companyName === formData.companyName) || companies[0];
        
        if (!selectedCompany) {
          throw new Error('Please select a company');
        }
        
        // Validate company ID is a UUID
        if (!isValidUUID(selectedCompany.id)) {
          throw new Error(`Invalid company ID. Please ensure companies are loaded from the API. Company ID: ${selectedCompany.id}`);
        }
        
        // Map all form data to complete user creation DTO
        const createData: any = {
          // Step 1: Create User (Identity Only)
          companyId: selectedCompany.id,
          userName: formData.userName || '',
          mobileNumber: formData.mobileNumber || '',
          employeeCode: formData.empCode,
          emailAddress: formData.emailAddress || null, // Ensure email is included even if empty
        };
        
        console.log('[handleSaveUser] Email address from formData:', formData.emailAddress);
        console.log('[handleSaveUser] Email address in createData:', createData.emailAddress);
        
        // Convert role name to role ID (UUID) if needed
        // Only include userRoleId if it's a valid UUID (backend requirement)
        if (formData.userRoleID && formData.userRoleID.trim()) {
          console.log('[handleSaveUser] Processing userRoleID:', formData.userRoleID);
          const roleId = getRoleIdFromName(formData.userRoleID);
          console.log('[handleSaveUser] Converted role ID:', roleId);
          
          if (roleId && isValidUUID(roleId)) {
            createData.userRoleId = roleId;
            console.log('[handleSaveUser] Using converted UUID role ID:', roleId);
          } else if (isValidUUID(formData.userRoleID)) {
            // Already a valid UUID
            createData.userRoleId = formData.userRoleID;
            console.log('[handleSaveUser] Using provided UUID role ID:', formData.userRoleID);
          } else {
            // Role ID is not a valid UUID - skip it (userRoleId is optional)
            // This prevents validation errors when using mock roles with simple IDs
            console.warn('[handleSaveUser] Role ID is not a valid UUID, skipping role assignment:', {
              roleName: formData.userRoleID,
              roleId: roleId,
              message: 'Role will not be assigned. Please ensure roles are fetched from the backend API with valid UUIDs.'
            });
            // Don't include userRoleId in the payload - it's optional
          }
        } else {
          console.log('[handleSaveUser] No userRoleID provided, skipping role assignment');
        }
        
        // Step 2: Employee Profile - Always include all fields (empty string becomes null)
        createData.employmentType = formData.employmentType && formData.employmentType.trim() ? formData.employmentType.trim() : null;
        createData.designation = formData.designation && formData.designation.trim() ? formData.designation.trim() : null;
        createData.contractorName = formData.contractorName && formData.contractorName.trim() ? formData.contractorName.trim() : null;
        createData.companyNameThirdParty = formData.companyNameThirdParty && formData.companyNameThirdParty.trim() ? formData.companyNameThirdParty.trim() : null;
        createData.grossSalary = formData.grossSalary ? (parseFloat(String(formData.grossSalary)) || null) : null;
        
        console.log('[handleSaveUser] Step 2 fields:', {
          employmentType: createData.employmentType,
          designation: createData.designation,
          contractorName: createData.contractorName,
          companyNameThirdParty: createData.companyNameThirdParty,
          grossSalary: createData.grossSalary,
        });
        
        // Step 3: Identity & Compliance - Always include all fields (empty string becomes null)
        createData.aadhaarNumber = formData.aadhaar && formData.aadhaar.trim() ? formData.aadhaar.trim() : null;
        createData.panNumber = formData.pan && formData.pan.trim() ? formData.pan.trim() : null;
        createData.drivingLicenseNumber = formData.dlNum && formData.dlNum.trim() ? formData.dlNum.trim() : null;
        createData.pfNumber = formData.pfNum && formData.pfNum.trim() ? formData.pfNum.trim() : null;
        createData.uanNumber = formData.uan && formData.uan.trim() ? formData.uan.trim() : null;
        createData.esiNumber = formData.esiNum && formData.esiNum.trim() ? formData.esiNum.trim() : null;
        
        console.log('[handleSaveUser] Step 3 fields:', {
          aadhaar: createData.aadhaarNumber,
          pan: createData.panNumber,
          drivingLicense: createData.drivingLicenseNumber,
          pfNumber: createData.pfNumber,
          uan: createData.uanNumber,
          esi: createData.esiNumber,
        });
        
        // Step 4: Address & Emergency - Always include all fields (empty string becomes null)
        createData.addressLine = formData.address && formData.address.trim() ? formData.address.trim() : null;
        createData.area = formData.area && formData.area.trim() ? formData.area.trim() : null;
        createData.city = formData.city && formData.city.trim() ? formData.city.trim() : null;
        createData.district = formData.district && formData.district.trim() ? formData.district.trim() : null;
        createData.pincode = formData.pincode && formData.pincode.trim() ? formData.pincode.trim() : null;
        createData.emergencyContact = formData.emergencyContact && formData.emergencyContact.trim() ? formData.emergencyContact.trim() : null;
        
        console.log('[handleSaveUser] Step 4 fields:', {
          address: createData.addressLine,
          area: createData.area,
          city: createData.city,
          district: createData.district,
          pincode: createData.pincode,
          emergencyContact: createData.emergencyContact,
        });
        
        // Step 5: User Activation
        createData.webLogin = formData.webLogin || false;
        createData.mobileAppAccess = formData.mobileApp || false;
        createData.status = formData.status || 'Draft';
        createData.passwordEnabled = formData.passwordEnabled || false;
        createData.otpEnabled = formData.otpEnabled || false;
        createData.forceOtpOnNextLogin = formData.forceOtpOnNextLogin || false;
        
        // Use complete user creation endpoint
        console.log('[handleSaveUser] ========== SAVE START ==========');
        console.log('[handleSaveUser] Calling createCompleteUser with data:', createData);
        console.log('[handleSaveUser] API payload (FULL):', JSON.stringify(createData, null, 2));
        console.log('[handleSaveUser] Field verification:');
        console.log('  - Email:', createData.emailAddress);
        console.log('  - Aadhaar:', createData.aadhaarNumber);
        console.log('  - PAN:', createData.panNumber);
        console.log('  - ESI:', createData.esiNumber);
        console.log('  - Address:', createData.addressLine);
        console.log('  - Area:', createData.area);
        console.log('  - City:', createData.city);
        
        // Call API
        let saveSuccess = false;
        try {
          const result = await userService.createCompleteUser(createData);
          saveSuccess = true;
          console.log('[handleSaveUser] API call successful. Result:', result);
          
          if (!result) {
            console.warn('[handleSaveUser] Warning: API returned empty result but status was 200');
          }
          
          // Show success
          alert('User created successfully!');
          
          // Close modal - MUST close even if reload fails
          console.log('[handleSaveUser] Closing modal...');
    setShowUserModal(false);
    setEditingUser(null);
          setError(null);
          console.log('[handleSaveUser] Modal closed');
          
          // Reload users after a delay
          setTimeout(async () => {
            try {
              await loadUsers();
              console.log('[handleSaveUser] Users reloaded');
            } catch (e) {
              console.error('[handleSaveUser] Reload error (data was saved):', e);
            }
          }, 500);
          
          console.log('[handleSaveUser] ========== SAVE END (SUCCESS) ==========');
          
        } catch (apiErr) {
          saveSuccess = false;
          console.error('[handleSaveUser] ❌ API CALL FAILED:', apiErr);
          // Re-throw to be caught by outer catch - DO NOT close modal on error
          throw apiErr;
        }
      }
    } catch (err) {
      console.error('[handleSaveUser] ========== ERROR START ==========');
      console.error('[handleSaveUser] Catch block - Error saving user:', err);
      console.error('[handleSaveUser] Error type:', typeof err);
      console.error('[handleSaveUser] Error instance check:', err instanceof Error);
      
      // Try to log full error details
      try {
        if (err instanceof Error) {
          const errorObj = err as any;
          console.error('[handleSaveUser] Error details:', {
            message: errorObj.message,
            name: errorObj.name,
            stack: errorObj.stack,
            status: errorObj.status,
            statusText: errorObj.statusText,
            errorData: errorObj.errorData,
          });
        } else {
          console.error('[handleSaveUser] Non-Error object:', JSON.stringify(err, null, 2));
        }
      } catch (logError) {
        console.error('[handleSaveUser] Could not log error details:', logError);
      }
      
      const errorMessage = extractErrorMessage(err);
      console.error('[handleSaveUser] Extracted error message:', errorMessage);
      console.error('[handleSaveUser] ========== ERROR END ==========');
      
      const displayMessage = errorMessage || 'Failed to save user. Please check console (F12) for details.';
      
      // Set error state (will show in UI error banner)
      setError(displayMessage);
      
      // Show alert for user visibility with clear message
      alert(`❌ Error Saving User\n\n${displayMessage}\n\nPlease check the browser console (F12) for more details.`);
      
      // Keep modal open so user can fix errors
      // Don't close modal on error
      
      console.error('[handleSaveUser] Error handling complete - Modal remains open');
    } finally {
      setLoading(false);
      console.log('[handleSaveUser] Finally block - Loading set to false');
    }
  };

  // Map backend RoleResponse to frontend Role interface
  const mapRoleResponseToRole = (apiRole: RoleResponse, companyName: string): Role => {
    return {
      id: apiRole.roleId,
      roleName: apiRole.roleName,
      description: apiRole.roleDescription || '',
      companyName: companyName,
      status: apiRole.status,
      createdBy: apiRole.createdBy || '',
      createdOn: apiRole.createdOn,
      modifiedBy: apiRole.modifiedBy || '',
      modifiedOn: apiRole.modifiedOn,
    };
  };

  // Load roles from API
  const loadRoles = async (companiesToUse?: Company[]): Promise<void> => {
    // Use provided companies or fall back to state
    let companiesList = companiesToUse || companies;
    
    // If no companies available, try to load them first
    if (companiesList.length === 0) {
      companiesList = await loadCompanies();
      if (companiesList.length === 0) {
        console.warn('No companies available to load roles');
        setRoles([]);
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    try {
      // Load roles for all companies
      const allRoles: Role[] = [];
      
      for (const company of companiesList) {
        // Verify company ID is a valid UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(company.id);
        if (!isUUID) {
          console.warn(`Skipping company ${company.companyName} - ID is not a valid UUID: ${company.id}`);
          continue;
        }
        
        try {
          const apiRoles = await roleService.getAllRoles(company.id, false); // Get all roles (active and inactive)
          const mappedRoles = apiRoles.map((apiRole) => 
            mapRoleResponseToRole(apiRole, company.companyName)
          );
          allRoles.push(...mappedRoles);
        } catch (err) {
          console.warn(`Failed to load roles for company ${company.companyName}:`, err);
        }
      }
      
      setRoles(allRoles);
      console.log(`[loadRoles] Loaded ${allRoles.length} roles`);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage || 'Failed to load roles');
      console.error('Error loading roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = () => {
    setEditingRole(null);
    setShowRoleModal(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this role?')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await roleService.deleteRole(id);
      await loadRoles(); // Reload roles after deletion
      alert('Role deleted successfully!');
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage || 'Failed to delete role');
      console.error('Error deleting role:', err);
      alert(`❌ Error Deleting Role\n\n${errorMessage}\n\nPlease check the browser console (F12) for more details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async (formData: Partial<Role>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Find company ID from company name
      const selectedCompany = companies.find(c => c.companyName === formData.companyName);
      if (!selectedCompany) {
        throw new Error('Please select a company');
      }

    if (editingRole) {
        // Update existing role
        const updateData = {
          roleName: formData.roleName,
          roleDescription: formData.description || null,
          status: formData.status,
        };
        
        console.log('[handleSaveRole] Updating role:', editingRole.id, updateData);
        await roleService.updateRole(editingRole.id, updateData);
        console.log('[handleSaveRole] Role updated successfully');
        alert('Role updated successfully!');
    } else {
        // Create new role
        const createData = {
          companyId: selectedCompany.id,
          roleName: formData.roleName || '',
          roleDescription: formData.description || null,
          status: formData.status || 'Active',
        };
        
        console.log('[handleSaveRole] Creating role:', createData);
        await roleService.createRole(createData);
        console.log('[handleSaveRole] Role created successfully');
        alert('Role created successfully!');
      }
      
    setShowRoleModal(false);
    setEditingRole(null);
      await loadRoles(); // Reload roles after save
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage || 'Failed to save role');
      console.error('[handleSaveRole] Error saving role:', err);
      alert(`❌ Error Saving Role\n\n${errorMessage}\n\nPlease check the browser console (F12) for more details.`);
    } finally {
      setLoading(false);
    }
  };

  // Activate user handler
  const [showTemporaryPasswordModal, setShowTemporaryPasswordModal] = useState(false);
  const [temporaryPasswordData, setTemporaryPasswordData] = useState<{
    userName: string;
    temporaryPassword: string;
    expiry: string | null;
  } | null>(null);
  
  // Reset password confirmation modal
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ id: string; userName: string } | null>(null);

  const handleActivateUser = async (userId: string, activationData: {
    passwordEnabled: boolean;
    otpEnabled: boolean;
    webLogin: boolean;
    mobileAppAccess: boolean;
    forceOtpOnNextLogin: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      // Use activate with password endpoint if password is enabled
      if (activationData.passwordEnabled) {
        const result = await activateUserWithPassword(userId, activationData);
        // Show temporary password modal
        setTemporaryPasswordData({
          userName: result.userName,
          temporaryPassword: result.temporaryPassword,
          expiry: result.temporaryPasswordExpiry,
        });
        setShowTemporaryPasswordModal(true);
        await loadUsers();
      } else {
        await userService.activateUser(userId, activationData);
        await loadUsers();
      }
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage || 'Failed to activate user');
      console.error('Error activating user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset password handler - show confirmation modal
  const handleResetPassword = (userId: string, userName: string) => {
    setResetPasswordUser({ id: userId, userName });
    setShowResetPasswordModal(true);
  };

  // Confirm reset password
  const handleConfirmResetPassword = async () => {
    if (!resetPasswordUser) return;
    
    setLoading(true);
    setError(null);
    setShowResetPasswordModal(false);
    
    try {
      const result = await resetPassword(resetPasswordUser.id);
      // Show temporary password modal
      setTemporaryPasswordData({
        userName: result.userName,
        temporaryPassword: result.temporaryPassword,
        expiry: result.temporaryPasswordExpiry,
      });
      setShowTemporaryPasswordModal(true);
      setResetPasswordUser(null);
      await loadUsers();
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage || 'Failed to reset password');
      console.error('Error resetting password:', err);
      alert(`❌ Error Resetting Password\n\n${errorMessage}\n\nPlease check the browser console (F12) for more details.`);
    } finally {
      setLoading(false);
    }
  };

  // Deactivate user handler
  const handleDeactivateUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await userService.deactivateUser(userId);
      await loadUsers();
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage || 'Failed to deactivate user');
      console.error('Error deactivating user:', err);
    } finally {
      setLoading(false);
    }
  };

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
            <span className="breadcrumb">/ Masters / User Management</span>
          </div>
        </header>

        {/* User Management Content */}
        <div className="user-management-page">
          <div className="user-management-header">
            <div className="user-management-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h1 className="user-management-title">
              {activeTab === 'roles' ? 'Roles & Permissions' : 'User Management'}
            </h1>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message" style={{ 
              padding: '12px 16px', 
              background: '#fee', 
              color: '#c33', 
              marginBottom: '16px', 
              borderRadius: '6px',
              border: '1px solid #fcc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
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
              color: '#64748b',
              fontSize: '14px'
            }}>
              Loading...
            </div>
          )}

          {/* Tabs */}
          <div className="user-management-tabs">
            <button
              className={`tab-button ${activeTab === 'users' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
            <button
              className={`tab-button ${activeTab === 'roles' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              Roles & Permissions
            </button>
          </div>

          {/* Search and Add Button */}
          <div className="user-management-actions">
            <div className="user-management-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="user-management-search-input"
                placeholder={activeTab === 'roles' ? 'Search roles...' : 'Search users...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="user-management-action-buttons">
              <button className="filter-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Filter
              </button>
            <button 
              className="add-btn" 
              onClick={activeTab === 'users' ? handleAddUser : handleAddRole}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              {activeTab === 'users' ? 'Add User' : 'Add Role'}
            </button>
            </div>
          </div>

          {/* Users Table */}
          {activeTab === 'users' && (
            <>
              <div className="user-management-table-container">
                <table className="user-management-table">
                  <thead>
                    <tr>
                      <th>Company Name</th>
                      <th>User Name</th>
                      <th>Emp Code</th>
                      <th>Email Address</th>
                      <th>Mobile Number</th>
                      <th>User Role</th>
                      <th>Employment Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          {loading ? 'Loading users...' : 'No users found'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.companyName || '-'}</td>
                        <td>
                          <span className="user-name-link">{user.userName || '-'}</span>
                        </td>
                        <td>{user.empCode || '-'}</td>
                        <td>{user.emailAddress || '-'}</td>
                        <td>{user.mobileNumber || '-'}</td>
                        <td>
                          {(() => {
                            // Try to find role name from roles array
                            const role = roles.find(r => r.id === user.userRoleID || r.roleName === user.userRoleID);
                            return role ? role.roleName : (user.userRoleID || '-');
                          })()}
                        </td>
                        <td>{user.employmentType || '-'}</td>
                        <td>
                          <span className={`status-badge status-badge--${user.status.toLowerCase()}`}>
                            {user.status}
                          </span>
                        </td>
                        <td>
                          <span className="action-icons">
                            <span
                              className="action-icon action-icon--edit"
                            onClick={() => handleEditUser(user)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            </span>
                            <span
                              className="action-icon action-icon--view"
                              onClick={() => handleViewUser(user)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </span>
                            <span
                              className="action-icon action-icon--reset"
                                onClick={() => handleResetPassword(user.id, user.userName)}
                              title="Reset Password"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                  <path d="M21 3v5h-5"></path>
                                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                  <path d="M3 21v-5h5"></path>
                                </svg>
                            </span>
                            <span
                              className="action-icon action-icon--delete"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            </span>
                          </span>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="user-management-pagination-info">
                Showing {filteredUsers.length} of {users.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              </div>
            </>
          )}

          {/* Roles Table */}
          {activeTab === 'roles' && (
            <>
              <div className="user-management-table-container">
                <table className="user-management-table">
                  <thead>
                    <tr>
                      <th>Role Name</th>
                      <th>Description</th>
                      <th>Company Name</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty-message">
                          {loading ? 'Loading roles...' : 'No roles found'}
                        </td>
                      </tr>
                    ) : (
                      filteredRoles.map((role) => (
                      <tr key={role.id}>
                        <td>{role.roleName}</td>
                        <td>{role.description}</td>
                        <td>{role.companyName || '-'}</td>
                        <td>
                          <span className={`status-badge status-badge--${role.status.toLowerCase()}`}>
                            {role.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEditRole(role)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--permissions"
                            onClick={() => {
                              setSelectedRoleForPermissions(role);
                              setShowPermissionsModal(true);
                            }}
                            title="Manage Permissions"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDeleteRole(role.id)}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="user-management-pagination-info">
                Showing {filteredRoles.length} of {roles.length} Items
              </div>
            </>
          )}
        </div>
      </main>

      {/* User Add/Edit Modal */}
      {showUserModal && (
        <UserFormModal
          user={editingUser}
          roles={roles.filter(r => r.status === 'Active')} // Pass full role objects
          companies={companies.filter(c => c.status === 'Active')}
          viewMode={viewMode}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
            setViewMode(false);
          }}
          onSave={handleSaveUser}
          onActivate={handleActivateUser}
          onDeactivate={handleDeactivateUser}
          loading={loading}
        />
      )}

      {/* Reset Password Confirmation Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="modal-overlay" onClick={() => {
          setShowResetPasswordModal(false);
          setResetPasswordUser(null);
        }}>
          <div className="modal-content reset-password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reset-password-modal-header">
              <div className="reset-password-modal-header-left">
                <div className="reset-password-modal-icon-box">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                    <path d="M3 21v-5h5"></path>
                  </svg>
                </div>
                <h2 className="reset-password-modal-title">Reset Password</h2>
              </div>
              <button className="modal-close-btn" onClick={() => {
                setShowResetPasswordModal(false);
                setResetPasswordUser(null);
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="reset-password-modal-body">
              <p className="reset-password-modal-message">
                Are you sure you want to reset the password for the user <strong>{resetPasswordUser.userName}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="reset-password-modal-footer">
              <button 
                type="button" 
                className="btn btn--cancel-reset" 
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetPasswordUser(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn--confirm-reset" 
                onClick={handleConfirmResetPassword}
                disabled={loading}
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Password Modal */}
      {showTemporaryPasswordModal && temporaryPasswordData && (
        <div className="modal-overlay" onClick={() => setShowTemporaryPasswordModal(false)}>
          <div className="modal-content temp-password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="temp-password-modal-header">
              <div className="temp-password-modal-header-left">
                <div className="temp-password-modal-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                    <path d="M3 21v-5h5"></path>
                  </svg>
                </div>
                <div className="temp-password-modal-title-wrap">
                  <h2 className="temp-password-modal-title">Temporary Password Generated</h2>
                  <p className="temp-password-modal-subtitle">Password will only be shown once.</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowTemporaryPasswordModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="temp-password-modal-body">
              {/* Security Notice */}
              <div className="temp-password-security-notice">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <div className="temp-password-security-notice-content">
                  <h3 className="temp-password-security-notice-title">Important Security Notice</h3>
                  <p className="temp-password-security-notice-text">This temporary password will only be displayed once for security reasons. Please copy it now and share it securely with the user through a secure channel.</p>
                </div>
              </div>

              {/* User Name */}
              <div className="temp-password-field">
                <label className="temp-password-field-label">USER NAME</label>
                <div className="temp-password-field-value">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>{temporaryPasswordData.userName}</span>
                </div>
              </div>

              {/* Temporary Password */}
              <div className="temp-password-field">
                <label className="temp-password-field-label">TEMPORARY PASSWORD</label>
                <div className="temp-password-password-row">
                  <div className="temp-password-password-value">
                    {temporaryPasswordData.temporaryPassword}
                  </div>
                  <button
                    type="button"
                    className="temp-password-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(temporaryPasswordData.temporaryPassword);
                      alert('Password copied to clipboard!');
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                  </button>
                </div>
              </div>

              {/* Expiry Details */}
              {temporaryPasswordData.expiry && (
                <div className="temp-password-expiry-row">
                  <div className="temp-password-field">
                    <label className="temp-password-field-label">EXPIRES ON</label>
                    <div className="temp-password-field-value">
                      {new Date(temporaryPasswordData.expiry).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="temp-password-field">
                    <label className="temp-password-field-label">VALID FOR</label>
                    <div className="temp-password-field-value">24 Hours</div>
                  </div>
                </div>
              )}

              {/* Password Requirements */}
              <div className="temp-password-requirements">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <div className="temp-password-requirements-content">
                  <h3 className="temp-password-requirements-title">Password Requirements</h3>
                  <ul className="temp-password-requirements-list">
                    <li>User must change password on first login</li>
                    <li>Password expires automatically after 24 hours</li>
                    <li>Share through secure communication channels only</li>
                  </ul>
              </div>
            </div>
            </div>
            <div className="temp-password-modal-footer">
              <button
                type="button"
                className="btn btn--copied-password" 
                onClick={() => {
                  setShowTemporaryPasswordModal(false);
                  setTemporaryPasswordData(null);
                }}
              >
                I've Copied the Password
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Role Add/Edit Modal */}
      {showRoleModal && (
        <RoleFormModal
          role={editingRole}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowRoleModal(false);
            setEditingRole(null);
          }}
          onSave={handleSaveRole}
        />
      )}

      {/* Role Permissions Modal */}
      {showPermissionsModal && selectedRoleForPermissions && (
        <RolePermissionsModal
          role={selectedRoleForPermissions}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedRoleForPermissions(null);
          }}
          onSave={(permissions) => {
            // Handle permissions save
            console.log('Saving permissions for role:', selectedRoleForPermissions.roleName, permissions);
            setShowPermissionsModal(false);
            setSelectedRoleForPermissions(null);
          }}
        />
      )}

    </div>
  );
};

// User Form Wizard Component
interface UserFormModalProps {
  user: User | null;
  roles: Role[]; // Pass full role objects to allow filtering by company
  companies: Company[];
  viewMode?: boolean;
  onClose: () => void;
  onSave: (data: Partial<User>) => void;
  onActivate?: (userId: string, data: {
    passwordEnabled: boolean;
    otpEnabled: boolean;
    webLogin: boolean;
    mobileAppAccess: boolean;
    forceOtpOnNextLogin: boolean;
  }) => Promise<void>;
  onDeactivate?: (userId: string) => Promise<void>;
  loading?: boolean;
}

const UserFormModal = ({ user, roles, companies, viewMode = false, onClose, onSave, onActivate, onDeactivate, loading }: UserFormModalProps) => {
  // Helper function to convert role name to role ID for dropdown
  const getRoleIdFromNameOrId = (roleNameOrId: string | undefined): string => {
    if (!roleNameOrId) return '';
    // If it's already a UUID, return it
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleNameOrId)) {
      return roleNameOrId;
    }
    // Otherwise, find role by name
    if (roles && roles.length > 0) {
      const role = roles.find(r => r.roleName === roleNameOrId);
      return role ? role.id : '';
    }
    return '';
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<User>>(
    user || {
      companyName: '',
      mobileNumber: '',
      userName: '',
      empCode: '',
      userRoleID: '',
      employmentType: '',
      webLogin: false,
      mobileApp: false,
      dlNum: '',
      aadhaar: '',
      pan: '',
      uan: '',
      pfNum: '',
      esiNum: '',
      address: '',
      area: '',
      city: '',
      district: '',
      pincode: '',
      emergencyContact: '',
      contractorName: '',
      grossSalary: '',
      password: '',
      emailAddress: '',
      designation: '',
      companyNameThirdParty: '',
      status: 'Draft',
      passwordEnabled: false,
      otpEnabled: false,
      forceOtpOnNextLogin: false,
    }
  );

  // Update formData when user changes, converting role name to ID for dropdown
  useEffect(() => {
    if (user) {
      try {
        const roleId = getRoleIdFromNameOrId(user.userRoleID);
        setFormData(prev => ({
          ...user,
          userRoleID: roleId || user.userRoleID || '',
        }));
      } catch (err) {
        console.error('[UserFormModal] Error converting role:', err);
        // Fallback: use user data as-is
        setFormData(user);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Calculate profile completeness
  const calculateCompleteness = (): number => {
    const fields = [
      formData.companyName,
      formData.userName,
      formData.mobileNumber,
      formData.empCode,
      formData.userRoleID,
      formData.employmentType,
      formData.designation,
      formData.aadhaar,
      formData.pan,
      formData.address,
      formData.area,
      formData.city,
      formData.district,
      formData.pincode,
      formData.emergencyContact,
    ];
    const filledFields = fields.filter(f => f && f.toString().trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const handleFieldChange = (field: keyof User, value: any) => {
    // If company changes, reset the role selection
    if (field === 'companyName') {
      setFormData({ ...formData, [field]: value, userRoleID: '' });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleNext = () => {
    // Allow navigation in view mode (users can view all steps, just not edit)
    console.log('handleNext called - Current step:', currentStep);
    if (currentStep < 6) {
      const nextStep = currentStep + 1;
      console.log('Setting step to:', nextStep);
      setCurrentStep(nextStep);
    } else {
      console.warn('handleNext called but already at step 6');
    }
  };

  const handleBack = () => {
    // Allow navigation in view mode (users can view all steps, just not edit)
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Validation function for all steps
  const validateStep = (step: number): { isValid: boolean; missingFields: string[]; message: string } => {
    const missingFields: string[] = [];
    
    switch (step) {
      case 1: // Create User
        if (!formData.companyName || formData.companyName.trim() === '') missingFields.push('Company');
        if (!formData.userName || formData.userName.trim() === '') missingFields.push('User Name');
        if (!formData.mobileNumber || formData.mobileNumber.trim() === '') missingFields.push('Mobile Number');
        if (!formData.empCode || formData.empCode.trim() === '') missingFields.push('Employee Code');
        if (!formData.userRoleID || formData.userRoleID.trim() === '') missingFields.push('User Role');
        break;
        
      case 2: // Employee Profile
        if (!formData.employmentType || formData.employmentType.trim() === '') missingFields.push('Employment Type');
        if (!formData.designation || formData.designation.trim() === '') missingFields.push('Designation');
        // Contractor name is required only if Employment Type is "Contract"
        if (formData.employmentType === 'Contract' && (!formData.contractorName || formData.contractorName.trim() === '')) {
          missingFields.push('Contractor Name');
        }
        break;
        
      case 3: // Identity & Compliance
        // All fields are optional in Step 3
        break;
        
      case 4: // Address & Emergency
        // All fields are optional in Step 4
        break;
        
      case 5: // User Activation
        // All fields have defaults, so no required validation
        break;
        
      case 6: // Summary - validate all required fields from Steps 1-2
        // Step 1 required fields
        if (!formData.companyName || formData.companyName.trim() === '') missingFields.push('Company (Step 1)');
        if (!formData.userName || formData.userName.trim() === '') missingFields.push('User Name (Step 1)');
        if (!formData.mobileNumber || formData.mobileNumber.trim() === '') missingFields.push('Mobile Number (Step 1)');
        if (!formData.empCode || formData.empCode.trim() === '') missingFields.push('Employee Code (Step 1)');
        if (!formData.userRoleID || formData.userRoleID.trim() === '') missingFields.push('User Role (Step 1)');
        // Step 2 required fields
        if (!formData.employmentType || formData.employmentType.trim() === '') missingFields.push('Employment Type (Step 2)');
        if (!formData.designation || formData.designation.trim() === '') missingFields.push('Designation (Step 2)');
        if (formData.employmentType === 'Contract' && (!formData.contractorName || formData.contractorName.trim() === '')) {
          missingFields.push('Contractor Name (Step 2)');
        }
        break;
    }
    
    const isValid = missingFields.length === 0;
    const stepTitle = step === 1 ? 'Create User' 
                      : step === 2 ? 'Employee Profile'
                      : step === 3 ? 'Identity & Compliance'
                      : step === 4 ? 'Address & Emergency'
                      : step === 5 ? 'User Activation'
                      : 'Summary';
    
    const message = isValid 
      ? '' 
      : `Validation Error - Step ${step}: ${stepTitle}\n\n` +
        `Please fill in the following required fields:\n\n` +
        `${missingFields.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}\n\n` +
        `Please complete these fields before continuing.`;
    
    return { isValid, missingFields, message };
  };

  const handleSaveAndContinue = (e?: React.MouseEvent) => {
    if (e) {
    e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('handleSaveAndContinue called - Current step:', currentStep);
    console.log('Form data:', formData);
    
    // Validate current step before moving to next
    const validation = validateStep(currentStep);
    
    if (!validation.isValid) {
      alert(validation.message);
      console.error(`Step ${currentStep} validation failed - Missing fields:`, validation.missingFields);
      return;
    }
    
    // For Steps 1-5, just move to next step without saving
    if (currentStep < 6) {
      console.log(`Moving from Step ${currentStep} to Step ${currentStep + 1}`);
      handleNext();
    } else {
      console.warn('handleSaveAndContinue called on Step 6 - should use handleFinalSave instead');
    }
  };

  const handleFinalSave = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('handleFinalSave called - Current step:', currentStep);
    
    // Only on Step 6, save all data
    if (currentStep === 6) {
      // Validate all required fields across all steps
      const allMissingFields: { step: number; fields: string[] }[] = [];
      
      // Validate Step 1 (required)
      const step1Validation = validateStep(1);
      if (!step1Validation.isValid) {
        allMissingFields.push({ step: 1, fields: step1Validation.missingFields });
      }
      
      // Check if any required data is missing
      if (allMissingFields.length > 0) {
        const missingSteps = allMissingFields.map(({ step, fields }) => 
          `Step ${step}:\n${fields.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}`
        ).join('\n\n');
        
        alert(`Please fill in all required fields before saving:\n\n${missingSteps}\n\nPlease go back and complete these fields.`);
        console.error('Final save validation failed - Missing fields:', allMissingFields);
        return;
      }
      
      // Ensure status is set properly - if not Active/Inactive, keep as Draft
      const finalData = {
        ...formData,
        status: formData.status || 'Draft',
      };
      
      console.log('[handleFinalSave] Saving complete user data:', finalData);
      console.log('[handleFinalSave] Email address in finalData:', finalData.emailAddress);
      console.log('[handleFinalSave] Calling onSave (handleSaveUser)...');
      
      // Call onSave which triggers handleSaveUser
      onSave(finalData);
    } else {
      console.warn('handleFinalSave called but not on Step 6 - Current step:', currentStep);
    }
  };

  const handleSave = () => {
    if (currentStep === 6) {
      handleFinalSave();
    } else {
      handleSaveAndContinue();
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      onClose();
    }
  };

  const steps = [
    { number: 1, title: 'Create user', icon: 'user-plus' },
    { number: 2, title: 'Employee profile', icon: 'building' },
    { number: 3, title: 'Identity & compliance', icon: 'document' },
    { number: 4, title: 'Address & emergency', icon: 'map-pin' },
    { number: 5, title: 'User activation', icon: 'shield' },
    { number: 6, title: 'Summary & confirm', icon: 'sparkle' },
  ];

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content wizard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
            </div>
            <h2 className="modal-title">{viewMode ? 'View User' : (user ? 'Edit User' : 'Add User')}</h2>
          </div>
          <button className="modal-close-btn" onClick={handleCancel}>
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
            // Show icon only for the current step
            const showIcon = isCurrent;
            
            const getStepIcon = (iconType: string) => {
              switch (iconType) {
                case 'user-plus':
                  return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                  );
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
                case 'document':
                  return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  );
                case 'map-pin':
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
                case 'sparkle':
                  return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
                    </svg>
                  );
                default:
                  return null;
              }
            };
            
            return (
              <div 
                key={step.number} 
                className={`wizard-step ${isActive ? 'wizard-step--active' : ''} ${isCurrent ? 'wizard-step--current' : ''} ${viewMode ? 'wizard-step--clickable' : ''}`}
                onClick={viewMode ? () => setCurrentStep(step.number) : undefined}
                style={viewMode ? { cursor: 'pointer' } : {}}
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
          {/* Step 1: Create User */}
          {currentStep === 1 && (
            <div className="wizard-step-content">
              <div className="wizard-step-header">
                <div className="wizard-step-header-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                </div>
                <h3 className="wizard-step-header-title">{viewMode ? 'User Information' : 'Create user'}</h3>
              </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label-with-icon">
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
                  Company *
                </label>
                <select
                  value={formData.companyName || ''}
                    onChange={(e) => handleFieldChange('companyName', e.target.value)}
                  required
                  disabled={viewMode}
                >
                    <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.companyName}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  User name *
                </label>
                <input
                  type="text"
                  value={formData.userName || ''}
                    onChange={(e) => handleFieldChange('userName', e.target.value)}
                    placeholder="e.g., johndoe, user123"
                  required
                    minLength={3}
                    maxLength={100}
                    pattern="^[a-zA-Z0-9_]+$"
                    disabled={viewMode}
                />
                  <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                    Minimum 3 characters, only letters, numbers, and underscores allowed (e.g., johndoe, user_123)
                  </small>
              </div>
                <div className="form-group field-mobile">
                  <label className="form-label-with-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    Mobile number *
                  </label>
                <input
                    type="tel"
                    value={formData.mobileNumber || ''}
                    onChange={(e) => handleFieldChange('mobileNumber', e.target.value)}
                    placeholder="e.g., 9876543210 or +91-9876543210"
                  required
                  disabled={viewMode}
                />
                  <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                    Format: 10-digit Indian mobile number (9876543210, +91-9876543210, or 98765 43210)
                  </small>
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Email address
                </label>
                <input
                    type="email"
                    value={formData.emailAddress || ''}
                    onChange={(e) => handleFieldChange('emailAddress', e.target.value)}
                    placeholder="e.g., user@example.com"
                    maxLength={255}
                    disabled={viewMode}
                  />
                  <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                    Valid email address (e.g., user@example.com)
                  </small>
              </div>
                <div className="form-group field-emp-code">
                  <label className="form-label-with-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="4" y1="9" x2="20" y2="9"></line>
                      <line x1="4" y1="15" x2="20" y2="15"></line>
                      <line x1="10" y1="3" x2="8" y2="21"></line>
                      <line x1="16" y1="3" x2="14" y2="21"></line>
                    </svg>
                    # Employee code *
                  </label>
                <input
                  type="text"
                  value={formData.empCode || ''}
                    onChange={(e) => handleFieldChange('empCode', e.target.value)}
                    placeholder="e.g., EMP001, E12345"
                  required
                    maxLength={50}
                    disabled={viewMode}
                />
                  <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                    Maximum 50 characters (e.g., EMP001, E12345)
                  </small>
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  User role *
                </label>
                <select
                  value={formData.userRoleID || ''}
                    onChange={(e) => handleFieldChange('userRoleID', e.target.value)}
                  required
                    disabled={viewMode || !formData.companyName}
                  >
                    <option value="">{formData.companyName ? 'Select role' : 'Select company first'}</option>
                    {formData.companyName && roles
                      .filter(role => {
                        // Filter roles by selected company
                        return role.companyName === formData.companyName && role.status === 'Active';
                      })
                      .map((role) => (
                        <option key={role.id} value={role.id}>{role.roleName}</option>
                  ))}
                </select>
                  {!formData.companyName && (
                    <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                      Please select a company first to see available roles
                    </small>
                  )}
                  {formData.companyName && roles.filter(r => 
                    r.companyName === formData.companyName && r.status === 'Active'
                  ).length === 0 && (
                    <small style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px', display: 'block' }}>
                      No active roles available for this company. Please create a role first.
                    </small>
                  )}
              </div>
              </div>
            </div>
          )}

          {/* Step 2: Employee Profile */}
          {currentStep === 2 && (
            <div className="wizard-step-content">
              <div className="wizard-step-header">
                <div className="wizard-step-header-icon icon-green">
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
                <h3 className="wizard-step-header-title">Employee profile</h3>
              </div>
              <div className="form-grid">
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Employment type *
                </label>
                <select
                  value={formData.employmentType || ''}
                    onChange={(e) => handleFieldChange('employmentType', e.target.value)}
                  required
                  disabled={viewMode}
                >
                    <option value="">Select type</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  Designation *
                </label>
                <input
                    type="text"
                    value={formData.designation || ''}
                    onChange={(e) => handleFieldChange('designation', e.target.value)}
                  required
                  disabled={viewMode}
                />
              </div>
                {formData.employmentType === 'Contract' && (
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Contractor name *
                </label>
                    <input
                      type="text"
                      value={formData.contractorName || ''}
                      onChange={(e) => handleFieldChange('contractorName', e.target.value)}
                      required
                      disabled={viewMode}
                    />
              </div>
                )}
              <div className="form-group">
                <label className="form-label-with-icon">
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
                  Company name (if third-party)
                </label>
                  <input
                    type="text"
                    value={formData.companyNameThirdParty || ''}
                    onChange={(e) => handleFieldChange('companyNameThirdParty', e.target.value)}
                    disabled={viewMode}
                  />
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="9" x2="20" y2="9"></line>
                    <line x1="4" y1="15" x2="20" y2="15"></line>
                    <line x1="10" y1="3" x2="8" y2="21"></line>
                    <line x1="16" y1="3" x2="14" y2="21"></line>
                  </svg>
                  Gross salary
                </label>
                  <input
                    type="text"
                    value={formData.grossSalary || ''}
                    onChange={(e) => handleFieldChange('grossSalary', e.target.value)}
                    disabled={viewMode}
                  />
              </div>
            </div>
          </div>
          )}

          {/* Step 3: Identity & Compliance Details */}
          {currentStep === 3 && (
            <div className="wizard-step-content">
              <div className="wizard-step-header">
                <div className="wizard-step-header-icon icon-orange">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <h3 className="wizard-step-header-title">Identity & compliance details</h3>
              </div>
            <div className="form-grid">
                <div className="form-group field-aadhaar">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="9" x2="20" y2="9"></line>
                    <line x1="4" y1="15" x2="20" y2="15"></line>
                    <line x1="10" y1="3" x2="8" y2="21"></line>
                    <line x1="16" y1="3" x2="14" y2="21"></line>
                  </svg>
                  # Aadhaar
                </label>
                <input
                  type="text"
                  value={formData.aadhaar || ''}
                    onChange={(e) => handleFieldChange('aadhaar', e.target.value)}
                  disabled={viewMode}
                />
              </div>
                <div className="form-group field-pan">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="9" x2="20" y2="9"></line>
                    <line x1="4" y1="15" x2="20" y2="15"></line>
                    <line x1="10" y1="3" x2="8" y2="21"></line>
                    <line x1="16" y1="3" x2="14" y2="21"></line>
                  </svg>
                  # PAN
                </label>
                <input
                  type="text"
                  value={formData.pan || ''}
                    onChange={(e) => handleFieldChange('pan', e.target.value)}
                  disabled={viewMode}
                />
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="9" x2="20" y2="9"></line>
                    <line x1="4" y1="15" x2="20" y2="15"></line>
                    <line x1="10" y1="3" x2="8" y2="21"></line>
                    <line x1="16" y1="3" x2="14" y2="21"></line>
                  </svg>
                  # Driving license
                </label>
                <input
                  type="text"
                    value={formData.dlNum || ''}
                    onChange={(e) => handleFieldChange('dlNum', e.target.value)}
                  disabled={viewMode}
                />
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="9" x2="20" y2="9"></line>
                    <line x1="4" y1="15" x2="20" y2="15"></line>
                    <line x1="10" y1="3" x2="8" y2="21"></line>
                    <line x1="16" y1="3" x2="14" y2="21"></line>
                  </svg>
                  # PF number
                </label>
                <input
                  type="text"
                  value={formData.pfNum || ''}
                    onChange={(e) => handleFieldChange('pfNum', e.target.value)}
                  disabled={viewMode}
                />
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="9" x2="20" y2="9"></line>
                    <line x1="4" y1="15" x2="20" y2="15"></line>
                    <line x1="10" y1="3" x2="8" y2="21"></line>
                    <line x1="16" y1="3" x2="14" y2="21"></line>
                  </svg>
                  # UAN
                </label>
                  <input
                    type="text"
                    value={formData.uan || ''}
                    onChange={(e) => handleFieldChange('uan', e.target.value)}
                    disabled={viewMode}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="4" y1="9" x2="20" y2="9"></line>
                      <line x1="4" y1="15" x2="20" y2="15"></line>
                      <line x1="10" y1="3" x2="8" y2="21"></line>
                      <line x1="16" y1="3" x2="14" y2="21"></line>
                    </svg>
                    # ESI number
                  </label>
                <input
                  type="text"
                  value={formData.esiNum || ''}
                    onChange={(e) => handleFieldChange('esiNum', e.target.value)}
                  disabled={viewMode}
                />
              </div>
            </div>
          </div>
          )}

          {/* Step 4: Address & Emergency */}
          {currentStep === 4 && (
            <div className="wizard-step-content">
              <div className="wizard-step-header">
                <div className="wizard-step-header-icon icon-pink">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <h3 className="wizard-step-header-title">Address & emergency</h3>
              </div>
            <div className="form-grid">
                <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Address
                </label>
                <textarea
                  value={formData.address || ''}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                  rows={3}
                  disabled={viewMode}
                />
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  Area
                </label>
                <input
                  type="text"
                  value={formData.area || ''}
                    onChange={(e) => handleFieldChange('area', e.target.value)}
                  disabled={viewMode}
                />
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
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
                  City
                </label>
                <input
                  type="text"
                  value={formData.city || ''}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                  disabled={viewMode}
                />
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  District
                </label>
                <input
                  type="text"
                  value={formData.district || ''}
                    onChange={(e) => handleFieldChange('district', e.target.value)}
                  disabled={viewMode}
                />
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="9" x2="20" y2="9"></line>
                    <line x1="4" y1="15" x2="20" y2="15"></line>
                    <line x1="10" y1="3" x2="8" y2="21"></line>
                    <line x1="16" y1="3" x2="14" y2="21"></line>
                  </svg>
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode || ''}
                    onChange={(e) => handleFieldChange('pincode', e.target.value)}
                  disabled={viewMode}
                />
              </div>
                <div className="form-group field-mobile">
                  <label className="form-label-with-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    Emergency contact number
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContact || ''}
                    onChange={(e) => handleFieldChange('emergencyContact', e.target.value)}
                    disabled={viewMode}
                  />
            </div>
          </div>
            </div>
          )}

          {/* Step 5: User Activation & Access Enablement */}
          {currentStep === 5 && (
            <div className="wizard-step-content">
              <div className="wizard-step-header">
                <div className="wizard-step-header-icon icon-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <h3 className="wizard-step-header-title">User activation & access enablement</h3>
              </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  Web login *
                </label>
                  <select
                    value={formData.webLogin ? 'Yes' : 'No'}
                    onChange={(e) => handleFieldChange('webLogin', e.target.value === 'Yes')}
                    required
                    disabled={viewMode}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  Mobile app access *
                </label>
                  <select
                    value={formData.mobileApp ? 'Yes' : 'No'}
                    onChange={(e) => handleFieldChange('mobileApp', e.target.value === 'Yes')}
                    required
                    disabled={viewMode}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
              </div>
              <div className="form-group">
                <label className="form-label-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Status *
                </label>
                  <select
                    value={formData.status || 'Draft'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    required
                    disabled={viewMode}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
              </div>
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    Password enabled *
                  </label>
                  <select
                    value={formData.passwordEnabled ? 'Yes' : 'No'}
                    onChange={(e) => handleFieldChange('passwordEnabled', e.target.value === 'Yes')}
                    required
                    disabled={viewMode}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
            </div>
                <div className="form-group field-otp">
                  <label className="form-label-with-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    OTP enabled *
                  </label>
                  <select
                    value={formData.otpEnabled ? 'Yes' : 'No'}
                    onChange={(e) => handleFieldChange('otpEnabled', e.target.value === 'Yes')}
                    required
                    disabled={viewMode}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className="form-group field-otp">
                  <label className="form-label-with-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    Force OTP on next login *
                  </label>
                  <select
                    value={formData.forceOtpOnNextLogin ? 'Yes' : 'No'}
                    onChange={(e) => handleFieldChange('forceOtpOnNextLogin', e.target.value === 'Yes')}
                    required
                    disabled={viewMode}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: User Summary & Confirmation */}
          {currentStep === 6 && (
            <div className="wizard-step-content">
              <div className="wizard-step-header">
                <div className="wizard-step-header-icon icon-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
                  </svg>
                </div>
                <h3 className="wizard-step-header-title">User summary & confirmation</h3>
              </div>
              
              {/* Profile Completeness */}
              <div className="profile-completeness-box">
                <div className="completeness-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div className="completeness-text">
                  <span className="completeness-label">Profile Completeness</span>
                  <span className="completeness-value">{calculateCompleteness()}%</span>
                </div>
                <button className="btn-ready-activate">Ready to activate</button>
              </div>
              
              {/* Summary Cards */}
              <div className="summary-cards-grid">
                <div className="summary-card-item">
                  <div className="summary-card-icon summary-card-icon--blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                      <path d="M9 22v-4h6v4"></path>
                    </svg>
                  </div>
                  <div className="summary-card-content">
                    <span className="summary-card-label">Company</span>
                    <span className="summary-card-value">{formData.companyName || '-'}</span>
                  </div>
                </div>
                
                <div className="summary-card-item">
                  <div className="summary-card-icon summary-card-icon--purple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div className="summary-card-content">
                    <span className="summary-card-label">User Name</span>
                    <span className="summary-card-value">{formData.userName || '-'}</span>
                  </div>
                </div>
                
                <div className="summary-card-item">
                  <div className="summary-card-icon summary-card-icon--orange">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <div className="summary-card-content">
                    <span className="summary-card-label">Employee Code</span>
                    <span className="summary-card-value">{formData.empCode || '-'}</span>
                  </div>
                </div>
                
                <div className="summary-card-item">
                  <div className="summary-card-icon summary-card-icon--pink">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                  </div>
                  <div className="summary-card-content">
                    <span className="summary-card-label">Role</span>
                    <span className="summary-card-value">
                      {(() => {
                        const role = roles.find(r => r.id === formData.userRoleID);
                        return role ? role.roleName : (formData.userRoleID || '-');
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Activation Actions */}
              <div className="activation-actions">
                <button
                  type="button"
                  className="btn btn--activate"
                  onClick={async () => {
                    if (user?.id && onActivate) {
                      await onActivate(user.id, {
                        passwordEnabled: formData.passwordEnabled || false,
                        otpEnabled: formData.otpEnabled || false,
                        webLogin: formData.webLogin || false,
                        mobileAppAccess: formData.mobileApp || false,
                        forceOtpOnNextLogin: formData.forceOtpOnNextLogin || false,
                      });
                      onClose();
                    }
                  }}
                  disabled={!user?.id || loading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Activate User
                </button>
                <button
                  type="button"
                  className="btn btn--deactivate"
                  onClick={async () => {
                    if (user?.id && onDeactivate) {
                      await onDeactivate(user.id);
                      onClose();
                    }
                  }}
                  disabled={!user?.id || loading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  Deactivate
                </button>
              </div>
            </div>
          )}
          </div>

          <div className="modal-footer">
          {viewMode ? (
            <>
          {currentStep > 1 && (
                <button type="button" className="btn btn--cancel" onClick={handleBack}>
                  Previous
            </button>
          )}
              {currentStep < 6 ? (
                <button type="button" className="btn btn--next" onClick={handleNext}>
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              ) : (
                <button type="button" className="btn btn--cancel" onClick={handleCancel}>
                  Close
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" className="btn btn--cancel" onClick={handleCancel}>
              Cancel
            </button>
          {currentStep < 6 ? (
            <button 
              type="button" 
                  className="btn btn--next" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                    console.log('Next button clicked!');
                handleSaveAndContinue(e);
              }}
              disabled={loading}
            >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
            </button>
          ) : (
            <button 
              type="button" 
              className="btn btn--primary" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Save & Complete button clicked!');
                handleFinalSave(e);
              }}
              disabled={loading}
            >
              Save & Complete
            </button>
              )}
            </>
          )}
          </div>
      </div>
    </div>
  );
};

// Role Form Modal Component
interface RoleFormModalProps {
  role: Role | null;
  companies: Company[];
  onClose: () => void;
  onSave: (data: Partial<Role>) => void;
}

const RoleFormModal = ({ role, companies, onClose, onSave }: RoleFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Role>>(
    role || {
      roleName: '',
      description: '',
      companyName: '',
      status: 'Active',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--role" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{role ? 'Edit Role' : 'Add Role'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="role-form role-form--simple" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-single-column">
              <div className="form-group">
                <label>Company *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  disabled={!!role} // Disable company selection when editing
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.companyName}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
                {role && <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                  Company cannot be changed after role creation
                </small>}
              </div>
              <div className="form-group">
                <label>Role name *</label>
                <input
                  type="text"
                  value={formData.roleName || ''}
                  onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                  required
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  maxLength={500}
                />
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
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {role ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Role Permissions Modal Component
interface Permission {
  id: string;
  name: string;
  code: string;
}

interface ModulePermissions {
  module: string;
  permissions: Permission[];
}

interface RolePermissionsModalProps {
  role: Role;
  onClose: () => void;
  onSave: (permissions: Record<string, boolean>) => void;
}

const RolePermissionsModal = ({ role, onClose, onSave }: RolePermissionsModalProps) => {
  // Define modules and their permissions
  const modules: ModulePermissions[] = [
    {
      module: 'User Management',
      permissions: [
        { id: 'user_view', name: 'View User', code: 'user.view' },
        { id: 'user_create', name: 'Create User', code: 'user.create' },
        { id: 'user_edit', name: 'Edit User', code: 'user.edit' },
        { id: 'user_delete', name: 'Delete User', code: 'user.delete' },
      ],
    },
    {
      module: 'Roles & Permissions',
      permissions: [
        { id: 'role_view', name: 'View Role', code: 'role.view' },
        { id: 'role_create', name: 'Create Role', code: 'role.create' },
        { id: 'role_edit', name: 'Edit Role', code: 'role.edit' },
        { id: 'role_delete', name: 'Delete Role', code: 'role.delete' },
        { id: 'role_permissions', name: 'Manage Permissions', code: 'role.permissions' },
      ],
    },
    {
      module: 'Company Master',
      permissions: [
        { id: 'company_view', name: 'View Company', code: 'company.view' },
        { id: 'company_create', name: 'Create Company', code: 'company.create' },
        { id: 'company_edit', name: 'Edit Company', code: 'company.edit' },
        { id: 'company_delete', name: 'Delete Company', code: 'company.delete' },
      ],
    },
    {
      module: 'Invoice',
      permissions: [
        { id: 'invoice_view', name: 'View Invoice', code: 'invoice.view' },
        { id: 'invoice_create', name: 'Create Invoice', code: 'invoice.create' },
        { id: 'invoice_edit', name: 'Edit Invoice', code: 'invoice.edit' },
        { id: 'invoice_approve', name: 'Approve Invoice', code: 'invoice.approve' },
        { id: 'invoice_delete', name: 'Delete Invoice', code: 'invoice.delete' },
      ],
    },
    {
      module: 'HCF Master',
      permissions: [
        { id: 'hcf_view', name: 'View HCF', code: 'hcf.view' },
        { id: 'hcf_create', name: 'Create HCF', code: 'hcf.create' },
        { id: 'hcf_edit', name: 'Edit HCF', code: 'hcf.edit' },
        { id: 'hcf_delete', name: 'Delete HCF', code: 'hcf.delete' },
      ],
    },
    {
      module: 'Route Master',
      permissions: [
        { id: 'route_view', name: 'View Route', code: 'route.view' },
        { id: 'route_create', name: 'Create Route', code: 'route.create' },
        { id: 'route_edit', name: 'Edit Route', code: 'route.edit' },
        { id: 'route_delete', name: 'Delete Route', code: 'route.delete' },
      ],
    },
  ];

  // Initialize permissions state (mock - in real app, load from backend)
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    modules.forEach((mod) => {
      mod.permissions.forEach((perm) => {
        initial[perm.code] = false; // Default: all unchecked
      });
    });
    return initial;
  });

  const isReadOnly = role.status === 'Inactive';

  const handlePermissionChange = (code: string, checked: boolean) => {
    if (isReadOnly) return;
    setPermissions({ ...permissions, [code]: checked });
  };

  const handleSelectAll = (modulePermissions: Permission[]) => {
    if (isReadOnly) return;
    const newPermissions = { ...permissions };
    const allSelected = modulePermissions.every((perm) => permissions[perm.code]);
    modulePermissions.forEach((perm) => {
      newPermissions[perm.code] = !allSelected;
    });
    setPermissions(newPermissions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(permissions);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--permissions" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Manage Permissions - {role.roleName}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="permissions-form" onSubmit={handleSubmit}>
          <div className="permissions-content">
            {modules.map((module) => {
              const modulePermissions = module.permissions;
              const allSelected = modulePermissions.every((perm) => permissions[perm.code]);
              const someSelected = modulePermissions.some((perm) => permissions[perm.code]);

              return (
                <div key={module.module} className="permissions-module">
                  <div className="permissions-module-header">
                    <h3 className="permissions-module-title">{module.module}</h3>
                    <button
                      type="button"
                      className="permissions-select-all"
                      onClick={() => handleSelectAll(modulePermissions)}
                      disabled={isReadOnly}
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="permissions-list">
                    {modulePermissions.map((permission) => (
                      <label key={permission.id} className="permission-item">
                        <input
                          type="checkbox"
                          checked={permissions[permission.code] || false}
                          onChange={(e) => handlePermissionChange(permission.code, e.target.checked)}
                          disabled={isReadOnly}
                        />
                        <span className="permission-label">{permission.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="modal-footer modal-footer--sticky">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isReadOnly}>
              Save Permissions
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagementPage;

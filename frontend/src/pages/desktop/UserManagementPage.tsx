import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
  const { logout } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Companies from Company Master - Load active companies only
  const [companies] = useState<Company[]>([
    {
      id: '1',
      companyCode: 'COMP001',
      companyName: 'Sample Company',
      status: 'Active',
    },
    {
      id: '2',
      companyCode: 'COMP002',
      companyName: 'ABC Industries',
      status: 'Active',
    },
    {
      id: '3',
      companyCode: 'COMP003',
      companyName: 'XYZ Corporation',
      status: 'Active',
    },
  ]);

  const [users, setUsers] = useState<User[]>([
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

  const [roles, setRoles] = useState<Role[]>([
    {
      id: '1',
      roleName: 'Driver',
      description: 'Driver - Vehicle operation and transportation',
      companyName: 'Sample Company',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '2',
      roleName: 'Supervisor',
      description: 'Supervisor - Field supervision and monitoring',
      companyName: 'ABC Industries',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '3',
      roleName: 'Field Executive',
      description: 'Field Executive - Field operations and execution',
      companyName: 'Sample Company',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '4',
      roleName: 'Accountant',
      description: 'Accountant - Financial management and accounting',
      companyName: 'XYZ Corporation',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '5',
      roleName: 'FactoryIncharge',
      description: 'Factory Incharge - Factory operations management',
      companyName: 'ABC Industries',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '6',
      roleName: 'Manager',
      description: 'Manager - General management and coordination',
      companyName: 'Sample Company',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '7',
      roleName: 'Audit',
      description: 'Audit - Auditing and compliance verification',
      companyName: 'XYZ Corporation',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '8',
      roleName: 'Admin',
      description: 'Admin - Administrative access and management',
      companyName: 'Sample Company',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '9',
      roleName: 'SuperAdmin',
      description: 'Super Admin - Full system access and control',
      companyName: 'Sample Company',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '10',
      roleName: 'PCB',
      description: 'PCB - PCB zone management and operations',
      companyName: 'ABC Industries',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '11',
      roleName: 'Training',
      description: 'Training - Training and development management',
      companyName: 'XYZ Corporation',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '12',
      roleName: 'DataEntry',
      description: 'Data Entry - Data entry and record management',
      companyName: 'Sample Company',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
  ]);

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ), 
      active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training')
    },
    { 
      path: '/master', 
      label: 'Master', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ), 
      active: location.pathname === '/master' || location.pathname.startsWith('/master') 
    },
    { 
      path: '/report', 
      label: 'Report', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ), 
      active: location.pathname === '/report' 
    },
  ];

  const filteredUsers = users.filter(user =>
    user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.emailAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.empCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.mobileNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRoles = roles.filter(role =>
    role.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleSaveUser = (formData: Partial<User>) => {
    if (editingUser) {
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...formData, modifiedOn: new Date().toISOString().split('T')[0] }
          : u
      ));
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        ...formData as User,
        status: 'Active',
        createdBy: 'Current User',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'Current User',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setUsers([...users, newUser]);
    }
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleAddRole = () => {
    setEditingRole(null);
    setShowRoleModal(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setShowRoleModal(true);
  };

  const handleDeleteRole = (id: string) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      setRoles(roles.filter(r => r.id !== id));
    }
  };

  const handleSaveRole = (formData: Partial<Role>) => {
    if (editingRole) {
      setRoles(roles.map(r => 
        r.id === editingRole.id 
          ? { ...r, ...formData, modifiedOn: new Date().toISOString().split('T')[0] }
          : r
      ));
    } else {
      const newRole: Role = {
        id: Date.now().toString(),
        ...formData as Role,
        status: 'Active',
        createdBy: 'Current User',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'Current User',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setRoles([...roles, newRole]);
    }
    setShowRoleModal(false);
    setEditingRole(null);
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
            <h1 className="user-management-title">User Management</h1>
          </div>

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
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              className="add-btn" 
              onClick={activeTab === 'users' ? handleAddUser : handleAddRole}
            >
              Add
            </button>
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
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.companyName || '-'}</td>
                        <td>{user.userName || '-'}</td>
                        <td>{user.empCode || '-'}</td>
                        <td>{user.emailAddress || '-'}</td>
                        <td>{user.mobileNumber || '-'}</td>
                        <td>{user.userRoleID || '-'}</td>
                        <td>{user.employmentType || '-'}</td>
                        <td>
                          <span className={`status-badge status-badge--${user.status.toLowerCase()}`}>
                            {user.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEditUser(user)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="user-management-pagination-info">
                Showing {filteredUsers.length} of {users.length} Items
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
                    {filteredRoles.map((role) => (
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
                    ))}
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
          roles={roles.filter(r => r.status === 'Active').map(r => r.roleName)}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUser}
        />
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
    </div>
  );
};

// User Form Modal Component
interface UserFormModalProps {
  user: User | null;
  roles: string[];
  companies: Company[];
  onClose: () => void;
  onSave: (data: Partial<User>) => void;
}

const UserFormModal = ({ user, roles, companies, onClose, onSave }: UserFormModalProps) => {
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
      status: 'Active',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{user ? 'Edit User' : 'Add User'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="user-form" onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
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
                <label>User Name *</label>
                <input
                  type="text"
                  value={formData.userName || ''}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={formData.emailAddress || ''}
                  onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  value={formData.mobileNumber || ''}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Emp Code *</label>
                <input
                  type="text"
                  value={formData.empCode || ''}
                  onChange={(e) => setFormData({ ...formData, empCode: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>User Role ID *</label>
                <select
                  value={formData.userRoleID || ''}
                  onChange={(e) => setFormData({ ...formData, userRoleID: e.target.value })}
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Employment Type *</label>
                <select
                  value={formData.employmentType || ''}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Contract">Contract</option>
                  <option value="Temporary">Temporary</option>
                </select>
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
            </div>
          </div>

          {/* Access & Permissions */}
          <div className="form-section">
            <h3 className="form-section-title">Access & Permissions</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Web Login</label>
                <select
                  value={formData.webLogin ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, webLogin: e.target.value === 'true' })}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Mobile App</label>
                <select
                  value={formData.mobileApp ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, mobileApp: e.target.value === 'true' })}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
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

          {/* Identity Documents */}
          <div className="form-section">
            <h3 className="form-section-title">Identity Documents</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>DL Number</label>
                <input
                  type="text"
                  value={formData.dlNum || ''}
                  onChange={(e) => setFormData({ ...formData, dlNum: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Aadhaar</label>
                <input
                  type="text"
                  value={formData.aadhaar || ''}
                  onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>PAN</label>
                <input
                  type="text"
                  value={formData.pan || ''}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>UAN</label>
                <input
                  type="text"
                  value={formData.uan || ''}
                  onChange={(e) => setFormData({ ...formData, uan: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>PF Number</label>
                <input
                  type="text"
                  value={formData.pfNum || ''}
                  onChange={(e) => setFormData({ ...formData, pfNum: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>ESI Number</label>
                <input
                  type="text"
                  value={formData.esiNum || ''}
                  onChange={(e) => setFormData({ ...formData, esiNum: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="form-section">
            <h3 className="form-section-title">Address Information</h3>
            <div className="form-grid">
              <div className="form-group form-group--full">
                <label>Address</label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Area</label>
                <input
                  type="text"
                  value={formData.area || ''}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>District</label>
                <input
                  type="text"
                  value={formData.district || ''}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  value={formData.pincode || ''}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="form-section">
            <h3 className="form-section-title">Employment Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Emergency Contact</label>
                <input
                  type="tel"
                  value={formData.emergencyContact || ''}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contractor Name</label>
                <input
                  type="text"
                  value={formData.contractorName || ''}
                  onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Gross Salary</label>
                <input
                  type="text"
                  value={formData.grossSalary || ''}
                  onChange={(e) => setFormData({ ...formData, grossSalary: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {user ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{role ? 'Edit Role' : 'Add Role'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="role-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label>Role Name *</label>
                <input
                  type="text"
                  value={formData.roleName || ''}
                  onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
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

export default UserManagementPage;

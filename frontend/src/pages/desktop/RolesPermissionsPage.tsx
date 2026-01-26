import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './userManagementPage.css';
import '../desktop/dashboardPage.css';

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
  landingPage: string;
  accessLevel: 'Admin' | 'Maker' | 'Checker' | 'Viewer';
  status: 'Active' | 'Inactive';
  permissions: Record<string, boolean>;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

interface Permission {
  id: string;
  name: string;
  code: string;
  module: string;
  hasSubPermissions?: boolean;
  subPermissions?: Permission[];
}

const RolesPermissionsPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Landing pages
  const landingPages = [
    'Dashboard',
    'User Management',
    'Roles & Permissions',
    'Company Master',
    'Invoice',
    'HCF Master',
    'Route Master',
  ];

  // Permissions modules based on image
  const permissionModules: Record<string, Permission[]> = {
    'Home': [
      { id: 'home-view', name: 'View Home', code: 'HOME_VIEW', module: 'Home' },
    ],
    'Recon Onboarding': [
      { id: 'recon-onboarding-view', name: 'View Recon Onboarding', code: 'RECON_ONBOARDING_VIEW', module: 'Recon Onboarding' },
      { id: 'recon-onboarding-create', name: 'Create Recon Onboarding', code: 'RECON_ONBOARDING_CREATE', module: 'Recon Onboarding' },
      { id: 'recon-onboarding-edit', name: 'Edit Recon Onboarding', code: 'RECON_ONBOARDING_EDIT', module: 'Recon Onboarding' },
    ],
    'Recon Configuration': [
      { id: 'recon-config-view', name: 'View Recon Configuration', code: 'RECON_CONFIG_VIEW', module: 'Recon Configuration' },
      { id: 'recon-config-edit', name: 'Edit Recon Configuration', code: 'RECON_CONFIG_EDIT', module: 'Recon Configuration' },
    ],
    'Recon XOXO': [
      { id: 'recon-xoxo-view', name: 'View Recon XOXO', code: 'RECON_XOXO_VIEW', module: 'Recon XOXO' },
      { id: 'recon-xoxo-create', name: 'Create Recon XOXO', code: 'RECON_XOXO_CREATE', module: 'Recon XOXO' },
    ],
    'Funding': [
      { id: 'funding-view', name: 'View Funding', code: 'FUNDING_VIEW', module: 'Funding' },
      { id: 'funding-approve', name: 'Approve Funding', code: 'FUNDING_APPROVE', module: 'Funding' },
    ],
    'Reports': [
      { id: 'reports-view', name: 'View Reports', code: 'REPORTS_VIEW', module: 'Reports' },
      { id: 'reports-export', name: 'Export Reports', code: 'REPORTS_EXPORT', module: 'Reports' },
    ],
    'Masters': [
      { id: 'masters-view', name: 'View Masters', code: 'MASTERS_VIEW', module: 'Masters' },
      { id: 'masters-create', name: 'Create Masters', code: 'MASTERS_CREATE', module: 'Masters' },
      { id: 'masters-edit', name: 'Edit Masters', code: 'MASTERS_EDIT', module: 'Masters' },
      { id: 'masters-delete', name: 'Delete Masters', code: 'MASTERS_DELETE', module: 'Masters' },
    ],
    'Camspay Exceptions': [
      { id: 'camspay-view', name: 'View Camspay Exceptions', code: 'CAMSPAY_VIEW', module: 'Camspay Exceptions' },
      { id: 'camspay-resolve', name: 'Resolve Camspay Exceptions', code: 'CAMSPAY_RESOLVE', module: 'Camspay Exceptions' },
    ],
  };

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

  const [roles, setRoles] = useState<Role[]>([
    {
      id: '1',
      roleName: 'Administrator',
      description: 'Full system access',
      companyName: 'Sample Company',
      landingPage: 'Dashboard',
      accessLevel: 'Admin',
      status: 'Active',
      permissions: {},
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
  ]);

  const [formData, setFormData] = useState({
    roleName: '',
    description: '',
    companyName: '',
    landingPage: '',
    status: '',
    accessLevel: 'Admin' as 'Admin' | 'Maker' | 'Checker' | 'Viewer',
    permissions: {} as Record<string, boolean>,
  });

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      ),
      active: location.pathname === '/dashboard',
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
      active: location.pathname === '/master' || location.pathname.startsWith('/master'),
    },
    {
      path: '/master/user-management',
      label: 'User Management',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
      active: location.pathname === '/master/user-management' || location.pathname.startsWith('/master/user-management'),
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
      active: location.pathname.startsWith('/report'),
    },
  ];

  const filteredRoles = roles.filter((role) =>
    role.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setFormData({
      roleName: '',
      description: '',
      companyName: '',
      landingPage: '',
      status: '',
      accessLevel: 'Admin',
      permissions: {},
    });
    setEditingRole(null);
    setShowModal(true);
    // Initialize all permissions as unchecked
    const allPermissions: Record<string, boolean> = {};
    Object.values(permissionModules).forEach((perms) => {
      perms.forEach((perm) => {
        allPermissions[perm.code] = false;
      });
    });
    setFormData((prev) => ({ ...prev, permissions: allPermissions }));
  };

  const handleEdit = (role: Role) => {
    setFormData({
      roleName: role.roleName,
      description: role.description,
      companyName: role.companyName,
      landingPage: role.landingPage,
      status: role.status,
      accessLevel: role.accessLevel,
      permissions: role.permissions || {},
    });
    setEditingRole(role);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      setRoles(roles.filter((role) => role.id !== id));
    }
  };

  const handleSave = () => {
    if (!formData.roleName || !formData.companyName || !formData.status) {
      alert('Please fill in all required fields (Role Name, Company Name, and Status)');
      return;
    }

    if (editingRole) {
      setRoles(
        roles.map((role) =>
          role.id === editingRole.id
            ? {
                ...role,
                roleName: formData.roleName,
                description: formData.description,
                companyName: formData.companyName,
                landingPage: formData.landingPage,
                status: formData.status as 'Active' | 'Inactive',
                accessLevel: formData.accessLevel,
                permissions: formData.permissions,
                modifiedBy: 'Current User',
                modifiedOn: new Date().toISOString().split('T')[0],
              }
            : role
        )
      );
    } else {
      const newRole: Role = {
        id: Date.now().toString(),
        roleName: formData.roleName,
        description: formData.description,
        companyName: formData.companyName,
        landingPage: formData.landingPage,
        status: formData.status as 'Active' | 'Inactive',
        accessLevel: formData.accessLevel,
        permissions: formData.permissions,
        createdBy: 'Current User',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'Current User',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setRoles([...roles, newRole]);
    }

    setShowModal(false);
    setEditingRole(null);
  };

  const handlePermissionChange = (permissionCode: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionCode]: checked,
      },
    }));
  };

  const handleModuleSelectAll = (moduleName: string, checked: boolean) => {
    const modulePermissions = permissionModules[moduleName] || [];
    const updatedPermissions = { ...formData.permissions };
    modulePermissions.forEach((perm) => {
      updatedPermissions[perm.code] = checked;
    });
    setFormData((prev) => ({
      ...prev,
      permissions: updatedPermissions,
    }));
  };

  const toggleModule = (moduleName: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  const isModuleAllSelected = (moduleName: string) => {
    const modulePermissions = permissionModules[moduleName] || [];
    if (modulePermissions.length === 0) return false;
    return modulePermissions.every((perm) => formData.permissions[perm.code]);
  };

  const isModulePartiallySelected = (moduleName: string) => {
    const modulePermissions = permissionModules[moduleName] || [];
    const selectedCount = modulePermissions.filter((perm) => formData.permissions[perm.code]).length;
    return selectedCount > 0 && selectedCount < modulePermissions.length;
  };

  return (
    <div className="dashboard-page">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-logo">MWM</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${item.active ? 'nav-item--active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
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
          <button onClick={logout} className="logout-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Masters / User Management / Roles & Permissions</span>
          </div>
        </header>

        {/* Roles & Permissions Content */}
        <div className="user-management-page">
          <div className="user-management-header">
            <h1 className="user-management-title">Roles & Permissions</h1>
            <button className="btn btn-primary" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Role
            </button>
          </div>

          {/* Search */}
          <div className="user-management-search-section">
            <div className="user-management-search-box">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="user-management-search-input"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Roles Table */}
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
                      No roles found
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => (
                    <tr key={role.id}>
                      <td>{role.roleName}</td>
                      <td>{role.description}</td>
                      <td>{role.companyName}</td>
                      <td>
                        <span className={`status-badge status-badge--${role.status.toLowerCase()}`}>
                          {role.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(role)}
                            title="Edit Role"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--permissions"
                            onClick={() => handleEdit(role)}
                            title="Manage Permissions"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(role.id)}
                            title="Delete Role"
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
        </div>
      </main>

      {/* Add/Edit Role Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-content--role-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {editingRole ? 'Edit Role' : 'Add Role'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {/* Access Level Section */}
              <div className="form-section">
                <label className="form-label">Access Level</label>
                <div className="access-level-options">
                  {(['Admin', 'Maker', 'Checker', 'Viewer'] as const).map((level) => (
                    <label key={level} className="access-level-option">
                      <input
                        type="radio"
                        name="accessLevel"
                        value={level}
                        checked={formData.accessLevel === level}
                        onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value as typeof formData.accessLevel })}
                      />
                      <span>{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Role Details */}
              <div className="form-section">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Role Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter Role Name"
                      value={formData.roleName}
                      onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter Description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <select
                      className="form-input"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      required
                    >
                      <option value="">Select Company</option>
                      {companies.filter(c => c.status === 'Active').map((company) => (
                        <option key={company.id} value={company.companyName}>
                          {company.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status *</label>
                    <select
                      className="form-input"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Permissions List */}
              <div className="form-section">
                <label className="form-label">Permissions</label>
                <div className="permissions-list-container">
                  {Object.entries(permissionModules).map(([moduleName, permissions]) => (
                    <div key={moduleName} className="permission-module-item">
                      <div className="permission-module-header-row">
                        <div className="permission-module-header-left">
                          <input
                            type="checkbox"
                            checked={isModuleAllSelected(moduleName)}
                            ref={(input) => {
                              if (input) input.indeterminate = isModulePartiallySelected(moduleName);
                            }}
                            onChange={(e) => handleModuleSelectAll(moduleName, e.target.checked)}
                            className="permission-module-checkbox"
                          />
                          <span className="permission-module-title">{moduleName}</span>
                        </div>
                        <button
                          className="permission-module-toggle"
                          onClick={() => toggleModule(moduleName)}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{
                              transform: expandedModules[moduleName] ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s',
                            }}
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>
                      {expandedModules[moduleName] && (
                        <div className="permission-module-permissions">
                          {permissions.map((permission) => (
                            <label key={permission.id} className="permission-item">
                              <input
                                type="checkbox"
                                checked={formData.permissions[permission.code] || false}
                                onChange={(e) => handlePermissionChange(permission.code, e.target.checked)}
                              />
                              <span>{permission.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPermissionsPage;

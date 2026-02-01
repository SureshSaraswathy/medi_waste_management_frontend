import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { roleService } from '../../../services/roleService';
import { permissionAdminService, PermissionAdminItem } from '../../../services/permissionAdminService';
import { canAccessDesktopModule } from '../../../utils/moduleAccess';
import { hasPermission } from '../../../services/permissionService';
import './permissionConfigurationPage.css';
import '../dashboardPage.css';

type RoleItem = { roleId: string; roleName: string };

const PermissionConfigurationPage = () => {
  const { user, permissions, logout } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isSuperAdmin = permissions.includes('*');
  const isSuperAdminUser = permissions.includes('*');

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const navItemsAll = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      active: location.pathname === '/dashboard',
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
      active: location.pathname === '/transaction' || location.pathname.startsWith('/transaction'),
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
      active: location.pathname === '/finance' || location.pathname.startsWith('/finance'),
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
      active: location.pathname === '/commercial-agreements' || location.pathname.startsWith('/commercial-agreements'),
    },
    {
      path: '/compliance-training',
      label: 'Compliance & Training',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      ),
      active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training'),
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
      path: '/report',
      label: 'Reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      active: location.pathname.startsWith('/report'),
    },
    ...(isSuperAdminUser
      ? [
          {
            path: '/admin/dashboard-configuration',
            label: 'Dashboard Configuration',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            ),
            active:
              location.pathname === '/admin/dashboard-configuration' ||
              location.pathname.startsWith('/admin/dashboard-configuration'),
          },
          {
            path: '/admin/permission-configuration',
            label: 'Permission Configuration',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1l3 5 5 .5-3.6 3.3 1.1 5.2L12 12.9 6.5 15l1.1-5.2L4 6.5 9 6z"></path>
                <path d="M20 21v-7a2 2 0 0 0-2-2h-3"></path>
                <path d="M4 21v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
            ),
            active:
              location.pathname === '/admin/permission-configuration' ||
              location.pathname.startsWith('/admin/permission-configuration'),
          },
        ]
      : []),
  ];

  const navItems = navItemsAll.filter((item: any) => {
    if (item.path === '/dashboard') return true;
    if (item.path === '/transaction') return canAccessDesktopModule(permissions, 'transaction');
    if (item.path === '/finance') return canAccessDesktopModule(permissions, 'finance');
    if (item.path === '/commercial-agreements') return canAccessDesktopModule(permissions, 'commercial');
    if (item.path === '/compliance-training') return canAccessDesktopModule(permissions, 'compliance');
    if (item.path === '/master') return canAccessDesktopModule(permissions, 'master');
    if (item.path === '/report') return canAccessDesktopModule(permissions, 'report');
    return true;
  });

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [allPermissions, setAllPermissions] = useState<PermissionAdminItem[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.token) return;
      setLoading(true);
      setError(null);
      try {
        const [roleList, permList] = await Promise.all([
          roleService.getAllRoles(undefined, true),
          permissionAdminService.listAllPermissions(user.token),
        ]);
        setRoles((roleList || []).map((r: any) => ({ roleId: r.roleId, roleName: r.roleName })));
        setAllPermissions(permList || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load roles/permissions');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.token]);

  useEffect(() => {
    const loadRolePerms = async () => {
      if (!user?.token || !selectedRoleId) return;
      setError(null);
      setSuccess(null);
      try {
        const codes = await permissionAdminService.getRolePermissionCodes(user.token, selectedRoleId);
        setSelectedCodes(new Set(codes || []));
      } catch (e: any) {
        setError(e?.message || 'Failed to load role permissions');
      }
    };
    loadRolePerms();
  }, [user?.token, selectedRoleId]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = allPermissions.filter((p) => {
      if (!q) return true;
      return (
        p.permissionCode.toLowerCase().includes(q) ||
        p.permissionName.toLowerCase().includes(q) ||
        p.moduleName.toLowerCase().includes(q)
      );
    });
    const map = new Map<string, PermissionAdminItem[]>();
    for (const p of filtered) {
      const key = p.moduleName || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allPermissions, query]);

  const toggle = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const onSave = async () => {
    if (!user?.token || !selectedRoleId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const codes = Array.from(selectedCodes);
      await permissionAdminService.replaceRolePermissions(user.token, selectedRoleId, codes);
      setSuccess('Permissions updated successfully');
    } catch (e: any) {
      setError(e?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // SuperAdmin-only UI requirement
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

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
            {navItems.map((item: any) => (
              <li key={item.path}>
                <Link to={item.path} className={`nav-link ${item.active ? 'nav-link--active' : ''}`}>
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
            <span className="breadcrumb">/ Admin / Permission Configuration</span>
          </div>
        </header>

        <div className="dashboard-page-content" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div className="perm-config-page">
            <div className="perm-config-header">
              <h1>Permission Configuration</h1>
              <p>Assign permissions to roles (writes to existing role_permissions table)</p>
            </div>

            <div className="perm-config-toolbar">
              <label className="perm-config-field">
                <span>Role</span>
                <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
                  <option value="">Select role...</option>
                  {roles.map((r) => (
                    <option key={r.roleId} value={r.roleId}>
                      {r.roleName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="perm-config-field">
                <span>Search</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by module / code / name..."
                />
              </label>

              <button
                className="perm-config-save"
                type="button"
                disabled={saving || !selectedRoleId}
                onClick={onSave}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {loading && <div className="perm-config-info">Loading...</div>}
            {error && <div className="perm-config-error">{error}</div>}
            {success && <div className="perm-config-success">{success}</div>}

            {!loading && selectedRoleId && (
              <div className="perm-config-grid">
                {grouped.map(([module, perms]) => (
                  <div key={module} className="perm-config-module">
                    <div className="perm-config-module__title">{module}</div>
                    <div className="perm-config-module__list">
                      {perms.map((p) => (
                        <label key={p.permissionId} className="perm-config-item">
                          <input
                            type="checkbox"
                            checked={selectedCodes.has(p.permissionCode)}
                            onChange={() => toggle(p.permissionCode)}
                          />
                          <div className="perm-config-item__meta">
                            <div className="perm-config-item__name">{p.permissionName}</div>
                            <div className="perm-config-item__code">{p.permissionCode}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !selectedRoleId && (
              <div className="perm-config-info">Select a role to view and assign permissions.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PermissionConfigurationPage;


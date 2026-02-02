import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { canAccessDesktopModule } from '../../../utils/moduleAccess';
import { roleService, RoleResponse } from '../../../services/roleService';
import { permissionAdminService, AdminPermissionItem } from '../../../services/permissionAdminService';
import './permissionConfigurationPage.css';
import '../dashboardPage.css';

type PermissionByModule = Record<string, AdminPermissionItem[]>;

const groupByModule = (items: AdminPermissionItem[]): PermissionByModule => {
  return items.reduce<PermissionByModule>((acc, p) => {
    const key = p.moduleName || 'General';
    acc[key] = acc[key] || [];
    acc[key].push(p);
    return acc;
  }, {});
};

const PermissionConfigurationPage: React.FC = () => {
  const { permissions, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const isSuperAdmin = permissions.includes('*');

  const [roles, setRoles] = React.useState<RoleResponse[]>([]);
  const [allPermissions, setAllPermissions] = React.useState<AdminPermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>('');
  const [assigned, setAssigned] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard', { replace: true, state: { from: location } });
    }
  }, [isSuperAdmin, navigate, location]);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [r, p] = await Promise.all([
          roleService.getAllRoles(undefined, true),
          permissionAdminService.listPermissions(),
        ]);
        setRoles(r);
        setAllPermissions(p);
      } catch (e: any) {
        setError(e?.message || 'Failed to load roles/permissions');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  React.useEffect(() => {
    const loadRolePerms = async () => {
      if (!selectedRoleId) {
        setAssigned(new Set());
        return;
      }
      setError(null);
      try {
        const codes = await permissionAdminService.getRolePermissionCodes(selectedRoleId);
        setAssigned(new Set(codes));
      } catch (e: any) {
        setError(e?.message || 'Failed to load role permissions');
      }
    };
    loadRolePerms();
  }, [selectedRoleId]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPermissions;
    return allPermissions.filter((p) => {
      const hay = `${p.moduleName} ${p.permissionCode} ${p.permissionName} ${p.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allPermissions, search]);

  const grouped = React.useMemo(() => {
    const by = groupByModule(filtered);
    for (const k of Object.keys(by)) {
      by[k].sort((a, b) => (a.permissionName || '').localeCompare(b.permissionName || ''));
    }
    return Object.entries(by).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggle = (code: string) => {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const onSave = async () => {
    if (!selectedRoleId) {
      setError('Please select a role');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const codes = Array.from(assigned).sort();
      await permissionAdminService.replaceRolePermissions(selectedRoleId, codes);
    } catch (e: any) {
      setError(e?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

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
          onClick={() => setIsSidebarCollapsed((v) => !v)}
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

        {(() => {
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
          ];

          const navItems = navItemsAll.filter((item) => {
            if (item.path === '/dashboard') return true;
            if (item.path === '/transaction') return canAccessDesktopModule(permissions, 'transaction');
            if (item.path === '/finance') return canAccessDesktopModule(permissions, 'finance');
            if (item.path === '/commercial-agreements') return canAccessDesktopModule(permissions, 'commercial');
            if (item.path === '/compliance-training') return canAccessDesktopModule(permissions, 'compliance');
            if (item.path === '/master') return canAccessDesktopModule(permissions, 'master');
            if (item.path === '/report') return canAccessDesktopModule(permissions, 'report');
            return true;
          });

          return (
            <nav className="sidebar-nav">
              <ul className="nav-list">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path} className={`nav-link ${item.active ? 'nav-link--active' : ''}`}>
                      <span className="nav-icon">{item.icon}</span>
                      {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          );
        })()}

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
            <span className="breadcrumb">MEDI-WASTE / Admin / Permission configuration</span>
          </div>
        </header>

        <div className="dashboard-page-content" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div className="perm-config-page">
        <div className="perm-config-header">
          <div>
            <h1>Permission Configuration</h1>
            <p>Assign permissions to roles (writes to existing <code>role_permissions</code> table)</p>
          </div>
          <button className="perm-config-save" onClick={onSave} disabled={saving || loading || !selectedRoleId}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="perm-config-controls">
          <div className="perm-config-control">
            <label>Role</label>
            <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
              <option value="">Select role...</option>
              {roles.map((r) => (
                <option key={r.roleId} value={r.roleId}>
                  {r.roleName}
                </option>
              ))}
            </select>
          </div>

          <div className="perm-config-control perm-config-control--search">
            <label>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by module / code / name..."
            />
          </div>
        </div>

        {error && <div className="perm-config-error">{error}</div>}

        {loading ? (
          <div className="perm-config-loading">Loading...</div>
        ) : !selectedRoleId ? (
          <div className="perm-config-empty">Select a role to view and assign permissions.</div>
        ) : (
          <div className="perm-config-grid">
            {grouped.map(([moduleName, perms]) => (
              <section key={moduleName} className="perm-config-module">
                <h2>{moduleName}</h2>
                <div className="perm-config-list">
                  {perms.map((p) => (
                    <label key={p.permissionId} className="perm-config-item">
                      <input
                        type="checkbox"
                        checked={assigned.has(p.permissionCode)}
                        onChange={() => toggle(p.permissionCode)}
                      />
                      <div className="perm-config-item-text">
                        <div className="perm-config-item-title">
                          <span className="perm-code">{p.permissionCode}</span>
                          <span className="perm-name">{p.permissionName}</span>
                        </div>
                        {p.description ? <div className="perm-desc">{p.description}</div> : null}
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
        </div>
      </main>
    </div>
  );
};

export default PermissionConfigurationPage;


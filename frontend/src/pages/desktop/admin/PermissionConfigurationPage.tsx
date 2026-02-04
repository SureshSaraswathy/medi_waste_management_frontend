import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { canAccessDesktopModule } from '../../../utils/moduleAccess';
import { roleService, RoleResponse } from '../../../services/roleService';
import { companyService, CompanyResponse } from '../../../services/companyService';
import { permissionAdminService, AdminPermissionItem } from '../../../services/permissionAdminService';
import { hasPermission } from '../../../services/permissionService';
import './permissionConfigurationPage.css';
import '../dashboardPage.css';

type PermTree = Array<{
  moduleName: string; // Menu
  features: Array<{
    featureKey: string; // Submenu / Feature
    items: Array<AdminPermissionItem & { action: string }>; // Operation leaves
  }>;
}>;

const normalizeModuleName = (moduleName?: string | null) => (moduleName && moduleName.trim() ? moduleName.trim() : 'General');

// Parse permission codes like:
// - INVOICE.VIEW   => feature: INVOICE, action: VIEW
// - DASHBOARD_CONFIG.VIEW => feature: DASHBOARD_CONFIG, action: VIEW
// - INVOICE_VIEW   => feature: INVOICE, action: VIEW (legacy)
const parsePermissionCode = (code: string): { featureKey: string; action: string } => {
  const raw = String(code || '').trim();
  if (!raw) return { featureKey: 'GENERAL', action: 'ACCESS' };

  // Prefer dot format; fallback to underscore.
  const parts = raw.includes('.') ? raw.split('.') : raw.split('_');
  if (parts.length <= 1) return { featureKey: raw, action: 'ACCESS' };
  const action = parts[parts.length - 1] || 'ACCESS';
  const featureKey = parts.slice(0, -1).join('_') || raw;
  return { featureKey, action };
};

const buildTree = (items: AdminPermissionItem[]): PermTree => {
  const moduleMap = new Map<string, Map<string, Array<AdminPermissionItem & { action: string }>>>();

  for (const p of items) {
    const moduleName = normalizeModuleName(p.moduleName);
    const { featureKey, action } = parsePermissionCode(p.permissionCode);

    if (!moduleMap.has(moduleName)) moduleMap.set(moduleName, new Map());
    const featureMap = moduleMap.get(moduleName)!;
    if (!featureMap.has(featureKey)) featureMap.set(featureKey, []);
    featureMap.get(featureKey)!.push({ ...p, action });
  }

  const tree: PermTree = Array.from(moduleMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([moduleName, featureMap]) => {
      const features = Array.from(featureMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([featureKey, perms]) => {
          perms.sort((a, b) => {
            const byAction = String(a.action || '').localeCompare(String(b.action || ''));
            if (byAction !== 0) return byAction;
            return String(a.permissionName || '').localeCompare(String(b.permissionName || ''));
          });
          return { featureKey, items: perms };
        });
      return { moduleName, features };
    });

  return tree;
};

const countSelected = (codes: string[], assigned: Set<string>) => {
  let selected = 0;
  for (const c of codes) if (assigned.has(c)) selected++;
  return { selected, total: codes.length };
};

// UI-only: helpers for template-aligned display
const normalizeKey = (value: string) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const pickMostCommon = (values: Array<string | null | undefined>) => {
  const counts = new Map<string, number>();
  for (const v of values) {
    const s = String(v || '').trim();
    if (!s) continue;
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [k, n] of counts.entries()) {
    if (n > bestCount) {
      best = k;
      bestCount = n;
    }
  }
  return { value: best, count: bestCount };
};

const TriStateCheckbox: React.FC<{
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel: string;
}> = ({ checked, indeterminate, disabled, onChange, ariaLabel }) => {
  const ref = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={ariaLabel}
    />
  );
};

const PermissionConfigurationPage: React.FC = () => {
  const { permissions, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // Backend requires ROLE_PERMISSIONS_MANAGE (SuperAdmin wildcard '*' is also accepted).
  // Keep frontend authorization aligned with backend guard rules.
  const canManageRolePermissions = hasPermission(permissions, 'ROLE_PERMISSIONS_MANAGE');
  const isWildcard = permissions.includes('*');

  const [companies, setCompanies] = React.useState<CompanyResponse[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>('');
  const [roles, setRoles] = React.useState<RoleResponse[]>([]);
  const [allPermissions, setAllPermissions] = React.useState<AdminPermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>('');
  const [assigned, setAssigned] = React.useState<Set<string>>(new Set());
  // UI/UX refactor: track initial state so Save can be disabled when no changes (no API/save behavior changes).
  const [initialAssigned, setInitialAssigned] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [openModules, setOpenModules] = React.useState<Set<string>>(new Set());
  const [openFeatures, setOpenFeatures] = React.useState<Set<string>>(new Set());
  // UI-only: template-style filter pills (does not change permission assignment/save behavior).
  const [uiFilter, setUiFilter] = React.useState<'all' | 'enabled' | 'partial' | 'disabled' | 'system'>('all');

  React.useEffect(() => {
    if (!canManageRolePermissions) {
      navigate('/dashboard', { replace: true, state: { from: location } });
    }
  }, [canManageRolePermissions, navigate, location]);

  React.useEffect(() => {
    const loadBase = async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await permissionAdminService.listPermissions();
        setAllPermissions(p);

        // For wildcard users (SuperAdmin), roles are company-specific but token companyId is "system" (all zeros).
        // Provide company selection so SuperAdmin can manage roles across companies.
        if (isWildcard) {
          const c = await companyService.getAllCompanies(true);
          setCompanies(c);
          if (!selectedCompanyId && c.length > 0) {
            setSelectedCompanyId(c[0].id);
          }
        }

        // UI-only: keep modules collapsed by default to reduce confusion/clutter.
        // Admin expands a module explicitly to view its entities/actions.
        setOpenModules(new Set());
      } catch (e: any) {
        setError(e?.message || 'Failed to load roles/permissions');
      } finally {
        setLoading(false);
      }
    };
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWildcard]);

  React.useEffect(() => {
    const loadRoles = async () => {
      // If wildcard user, require company selection.
      if (isWildcard && !selectedCompanyId) {
        setRoles([]);
        setSelectedRoleId('');
        setAssigned(new Set());
        return;
      }

      setError(null);
      try {
        const r = await roleService.getAllRoles(isWildcard ? selectedCompanyId : undefined, false);
        setRoles(r);

        // If selected role no longer exists under this company, reset selection.
        if (selectedRoleId && !r.some((x) => x.roleId === selectedRoleId)) {
          setSelectedRoleId('');
          setAssigned(new Set());
        }
      } catch (e: any) {
        setRoles([]);
        setSelectedRoleId('');
        setAssigned(new Set());
        setError(e?.message || 'Failed to load roles');
      }
    };

    // Avoid role fetch before base load completes.
    if (!canManageRolePermissions) return;
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageRolePermissions, isWildcard, selectedCompanyId]);

  React.useEffect(() => {
    const loadRolePerms = async () => {
      if (!selectedRoleId) {
        setAssigned(new Set());
        setInitialAssigned(new Set());
        return;
      }
      setError(null);
      try {
        const codes = await permissionAdminService.getRolePermissionCodes(selectedRoleId);
        const next = new Set(codes);
        setAssigned(next);
        setInitialAssigned(new Set(next));
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

  const tree = React.useMemo(() => buildTree(filtered), [filtered]);

  const codeToItem = React.useMemo(() => {
    const m = new Map<string, AdminPermissionItem>();
    for (const p of allPermissions) m.set(p.permissionCode, p);
    return m;
  }, [allPermissions]);

  const selectedItems = React.useMemo(() => {
    const items: AdminPermissionItem[] = [];
    for (const code of Array.from(assigned)) {
      const it = codeToItem.get(code);
      if (it) items.push(it);
      else {
        // Fallback if permission list is filtered/outdated
        items.push({
          permissionId: code,
          permissionCode: code,
          permissionName: code,
          moduleName: 'General',
          description: null,
          isActive: true,
        });
      }
    }
    items.sort((a, b) => {
      const byModule = normalizeModuleName(a.moduleName).localeCompare(normalizeModuleName(b.moduleName));
      if (byModule !== 0) return byModule;
      return String(a.permissionCode).localeCompare(String(b.permissionCode));
    });
    return items;
  }, [assigned, codeToItem]);

  const selectedByModule = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of selectedItems) {
      const moduleName = normalizeModuleName(p.moduleName);
      if (!map.has(moduleName)) map.set(moduleName, []);
      map.get(moduleName)!.push(p.permissionCode);
    }
    const entries = Array.from(map.entries()).map(([moduleName, codes]) => {
      codes.sort((a, b) => a.localeCompare(b));
      return { moduleName, codes };
    });
    entries.sort((a, b) => a.moduleName.localeCompare(b.moduleName));
    return entries;
  }, [selectedItems]);

  const dirtyCount = React.useMemo(() => {
    let changes = 0;
    for (const c of assigned) if (!initialAssigned.has(c)) changes++;
    for (const c of initialAssigned) if (!assigned.has(c)) changes++;
    return changes;
  }, [assigned, initialAssigned]);

  const toggleCodes = (codes: string[]) => {
    setAssigned((prev) => {
      const next = new Set(prev);
      const { selected, total } = countSelected(codes, prev);
      const shouldSelectAll = selected !== total;
      for (const c of codes) {
        if (shouldSelectAll) next.add(c);
        else next.delete(c);
      }
      return next;
    });
  };

  // UI-only improvement: explicit bulk actions (Select all / Clear all) at entity level.
  // Uses the same assigned Set and does not change save payload/behavior.
  const selectCodes = (codes: string[]) => {
    setAssigned((prev) => {
      const next = new Set(prev);
      for (const c of codes) next.add(c);
      return next;
    });
  };

  const clearCodes = (codes: string[]) => {
    setAssigned((prev) => {
      const next = new Set(prev);
      for (const c of codes) next.delete(c);
      return next;
    });
  };

  // UI-only: filter helpers (do not affect assigned values; only what is shown)
  const moduleMatchesFilter = (selected: number, total: number, hasSystem: boolean) => {
    if (uiFilter === 'all') return true;
    if (uiFilter === 'enabled') return selected > 0;
    if (uiFilter === 'disabled') return selected < total;
    if (uiFilter === 'partial') return selected > 0 && selected < total;
    if (uiFilter === 'system') return hasSystem;
    return true;
  };

  const leafMatchesFilter = (isSelected: boolean, isSystem: boolean) => {
    if (uiFilter === 'all') return true;
    if (uiFilter === 'enabled') return isSelected;
    if (uiFilter === 'disabled') return !isSelected;
    if (uiFilter === 'system') return isSystem;
    // Partial is meaningful at module/entity level; keep leafs visible when viewing partial groups.
    if (uiFilter === 'partial') return true;
    return true;
  };

  const toggleLeaf = (code: string) => {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const setModuleOpen = (moduleName: string, open: boolean) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (open) next.add(moduleName);
      else next.delete(moduleName);
      return next;
    });
  };

  const setFeatureOpen = (key: string, open: boolean) => {
    setOpenFeatures((prev) => {
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
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
      // UI/UX refactor: after successful save, reset initial state so Save becomes disabled again.
      setInitialAssigned(new Set(assigned));
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
            if (item.path === '/admin/permission-configuration') return canManageRolePermissions;
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
          {/* UI-only: sticky save button + unsaved indicator; save payload/behavior unchanged */}
          <div className="perm-config-save-wrap">
            {dirtyCount > 0 ? <div className="perm-config-unsaved">Unsaved changes</div> : null}
            <button
              className="perm-config-save"
              onClick={onSave}
              disabled={saving || loading || !selectedRoleId || dirtyCount === 0}
              title={dirtyCount === 0 ? 'No changes to save' : 'Save role permissions'}
            >
              {saving ? 'Saving...' : dirtyCount > 0 ? `Save changes (${dirtyCount})` : 'Saved'}
          </button>
          </div>
        </div>

        <div className={`perm-config-controls ${isWildcard ? 'perm-config-controls--company' : ''}`}>
          {isWildcard ? (
            <div className="perm-config-control">
              <label>Company</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setSelectedRoleId('');
                  setAssigned(new Set());
                  setInitialAssigned(new Set());
                }}
              >
                <option value="">Select company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="perm-config-control">
            <label>Role</label>
            <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
              <option value="">Select role...</option>
              {roles.length === 0 && !loading ? (
                <option value="" disabled>
                  No roles found
                </option>
              ) : null}
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
              placeholder="Search by menu / module / code / operation..."
            />
          </div>

          {/* UI-only: template-style filter pills (visual only) */}
          <div className="perm-config-filters" aria-label="Filters">
            <div className="perm-config-filters-left">
              <span className="perm-config-filters-label">Filter:</span>
              <div className="perm-config-filter-pills" role="tablist" aria-label="Permission filters">
                <button
                  type="button"
                  className={`perm-config-pill ${uiFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setUiFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`perm-config-pill ${uiFilter === 'enabled' ? 'active' : ''}`}
                  onClick={() => setUiFilter('enabled')}
                >
                  Enabled
                </button>
                <button
                  type="button"
                  className={`perm-config-pill ${uiFilter === 'partial' ? 'active' : ''}`}
                  onClick={() => setUiFilter('partial')}
                >
                  Partial
                </button>
                <button
                  type="button"
                  className={`perm-config-pill ${uiFilter === 'disabled' ? 'active' : ''}`}
                  onClick={() => setUiFilter('disabled')}
                >
                  Disabled
                </button>
                <button
                  type="button"
                  className={`perm-config-pill ${uiFilter === 'system' ? 'active' : ''}`}
                  onClick={() => setUiFilter('system')}
                >
                  <span className="legend-lock" aria-hidden>
                    🔒
                  </span>{' '}
                  System
                </button>
              </div>
            </div>

            <button
              className="perm-config-clear-link"
              type="button"
              onClick={() => setAssigned(new Set())}
              disabled={loading || saving || !selectedRoleId}
            >
              Clear selection
            </button>
          </div>
        </div>

        {/* UI-only: toolbar removed (filters row above contains helper actions) */}

        {error && <div className="perm-config-error">{error}</div>}

        {loading ? (
          <div className="perm-config-loading">Loading...</div>
        ) : !selectedRoleId ? (
          <div className="perm-config-empty">Select a role to view and assign permissions.</div>
        ) : (
          <div className="perm-config-layout">
            <section className="perm-config-tree">
              {tree.length === 0 ? (
                <div className="perm-config-empty">No permissions match your search.</div>
              ) : (
                tree.map((mod) => {
                  const moduleCodes = mod.features.flatMap((f) => f.items.map((x) => x.permissionCode));
                  const moduleCount = countSelected(moduleCodes, assigned);
                  const moduleChecked = moduleCount.total > 0 && moduleCount.selected === moduleCount.total;
                  const moduleIndeterminate = moduleCount.selected > 0 && moduleCount.selected < moduleCount.total;
                  const moduleOpen = openModules.has(mod.moduleName);
                  const moduleHasSystem = mod.features.some((f) => f.items.some((x) => x.isActive === false));

                  if (!moduleMatchesFilter(moduleCount.selected, moduleCount.total, moduleHasSystem)) {
                    return null;
                  }

                  return (
                    // UI/UX refactor: module card layout + collapsed state hides details (no logic changes).
                    <div key={mod.moduleName} className="module-card">
                      <div className="module-card-header">
                        <div className="module-card-left">
                          <TriStateCheckbox
                            checked={moduleChecked}
                            indeterminate={moduleIndeterminate}
                            disabled={loading || saving}
                            onChange={() => toggleCodes(moduleCodes)}
                            ariaLabel={`Toggle module ${mod.moduleName}`}
                          />
                          <div className="module-card-title">
                            <div className="module-card-name">{mod.moduleName}</div>
                            <div className="module-card-meta">
                              {moduleOpen
                                ? `${moduleCount.selected} of ${moduleCount.total} selected`
                                : moduleCount.selected > 0
                                  ? `${moduleCount.selected} selected`
                                  : 'Expand to view items'}
                            </div>
                          </div>
                        </div>

                        <div className="module-card-right">
                          {/* UI-only: quick bulk actions at module level */}
                          {moduleOpen ? (
                            <div className="module-bulk-actions">
                              <button
                                type="button"
                                className="perm-config-btn perm-config-btn--ghost perm-config-btn--tiny"
                                onClick={() => selectCodes(moduleCodes)}
                                disabled={loading || saving || moduleCodes.length === 0}
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                className="perm-config-btn perm-config-btn--ghost perm-config-btn--tiny"
                                onClick={() => clearCodes(moduleCodes)}
                                disabled={loading || saving || moduleCodes.length === 0}
                              >
                                Clear
                              </button>
                            </div>
                          ) : null}

                          <button
                            type="button"
                            className="module-card-expander"
                            onClick={() => setModuleOpen(mod.moduleName, !moduleOpen)}
                            aria-label={moduleOpen ? `Collapse ${mod.moduleName}` : `Expand ${mod.moduleName}`}
                          >
                            {moduleOpen ? '▾' : '▸'}
                          </button>
                        </div>
                      </div>

                      {moduleOpen ? (
                        <div className="module-card-body">
                          {/* UI-only: module-level permissions are shown as a simple list (template-style). */}
                          {(() => {
                            const moduleLevel = mod.features.find((f) => normalizeKey(f.featureKey) === normalizeKey(mod.moduleName));
                            if (!moduleLevel) return null;

                            const items = moduleLevel.items;
                            if (!items || items.length === 0) return null;

                            return (
                              <div className="module-actions">
                                {items.map((p) => {
                                  const isDisabled = Boolean((loading || saving) || p.isActive === false);
                                  const isSystem = Boolean(p.isActive === false);
                                  const isSelected = assigned.has(p.permissionCode);
                                  if (!leafMatchesFilter(isSelected, isSystem)) return null;

                                  return (
                                    <label
                                      key={p.permissionId}
                                      className={`action-item module-action-item ${isDisabled ? 'action-item--disabled' : ''}`}
                                      title={p.permissionCode}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleLeaf(p.permissionCode)}
                                        disabled={isDisabled}
                                      />
                                      <span className="action-text">
                                        <span className="action-name">{p.permissionName || p.action}</span>
                                        <span className="action-code">{p.permissionCode}</span>
                                      </span>
                                      {isSystem ? (
                                        <span className="action-lock" aria-label="System permission">
                                          🔒
                                        </span>
                                      ) : null}
                                    </label>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {mod.features
                            .filter((f) => normalizeKey(f.featureKey) !== normalizeKey(mod.moduleName))
                            .map((feat) => {
                            const featureId = `${mod.moduleName}::${feat.featureKey}`;
                            const featureCodes = feat.items.map((x) => x.permissionCode);
                            const featureCount = countSelected(featureCodes, assigned);
                            const featureChecked = featureCount.total > 0 && featureCount.selected === featureCount.total;
                            const featureIndeterminate =
                              featureCount.selected > 0 && featureCount.selected < featureCount.total;
                            const featureOpen = openFeatures.has(featureId);
                            const featureHasSystem = feat.items.some((x) => x.isActive === false);

                            if (!moduleMatchesFilter(featureCount.selected, featureCount.total, featureHasSystem)) {
                              return null;
                            }

                            // UI-only: promote a friendly entity title/description when permission_name/description is consistent across actions.
                            const commonName = pickMostCommon(feat.items.map((x) => x.permissionName));
                            const commonDesc = pickMostCommon(feat.items.map((x) => x.description));
                            const entityName = commonName.count >= 2 && commonName.value ? commonName.value : feat.featureKey;
                            const entityDesc = commonDesc.count >= 2 && commonDesc.value ? commonDesc.value : '';
                            const showCompactActionChips = entityName !== feat.featureKey;

                            return (
                              // UI/UX refactor: entity section styling + action grid; no grouping logic changes.
                              <div key={featureId} className="entity-section">
                                <div className="entity-header">
                                  <div className="entity-header-left">
                                    <TriStateCheckbox
                                      checked={featureChecked}
                                      indeterminate={featureIndeterminate}
                                      disabled={loading || saving}
                                      onChange={() => toggleCodes(featureCodes)}
                                      ariaLabel={`Toggle entity ${entityName}`}
                                    />
                                    <div className="entity-title">
                                      <div className="entity-name">{entityName}</div>
                                      {entityDesc ? <div className="entity-desc">{entityDesc}</div> : null}
                                      <div className="entity-meta">{`${featureCount.selected} of ${featureCount.total} selected`}</div>
                                    </div>
                                  </div>
                                  <div className="entity-header-right">
                                    {/* UI-only: entity-level bulk selection shortcuts */}
                                    <div className="entity-bulk-actions" aria-label="Entity bulk actions">
                                      <button
                                        type="button"
                                        className="perm-config-btn perm-config-btn--ghost perm-config-btn--tiny"
                                        onClick={() => selectCodes(featureCodes)}
                                        disabled={loading || saving || featureCodes.length === 0}
                                        title="Select all actions in this entity"
                                      >
                                        Select all
                                      </button>
                                      <button
                                        type="button"
                                        className="perm-config-btn perm-config-btn--ghost perm-config-btn--tiny"
                                        onClick={() => clearCodes(featureCodes)}
                                        disabled={loading || saving || featureCodes.length === 0}
                                        title="Clear all actions in this entity"
                                      >
                                        Clear
                                      </button>
                                    </div>

                                    {/* UI-only: replace Show/Hide with chevron indicator for clarity (behavior unchanged) */}
                                    <button
                                      type="button"
                                      className="entity-expander entity-expander--icon"
                                      onClick={() => setFeatureOpen(featureId, !featureOpen)}
                                      aria-label={featureOpen ? `Collapse ${entityName}` : `Expand ${entityName}`}
                                      title={featureOpen ? 'Collapse' : 'Expand'}
                                    >
                                      {featureOpen ? '▾' : '▸'}
                                    </button>
                                  </div>
                                </div>

                                {featureOpen ? (
                                  <div className="entity-actions">
                                    <div className={`action-grid ${showCompactActionChips ? 'action-grid--chips' : 'action-grid--list'}`}>
                                      {feat.items.filter((p) => {
                                        const isSystem = Boolean(p.isActive === false);
                                        const isSelected = assigned.has(p.permissionCode);
                                        return leafMatchesFilter(isSelected, isSystem);
                                      }).map((p) => {
                                        const isDisabled = Boolean((loading || saving) || p.isActive === false);
                                        const isSystem = Boolean(p.isActive === false);
                                        const isSelected = assigned.has(p.permissionCode);
                                        return (
                                          <label
                                            key={p.permissionId}
                                            className={`action-item ${showCompactActionChips ? 'action-item--chip' : ''} ${isDisabled ? 'action-item--disabled' : ''}`}
                                            title={p.permissionCode}
                                          >
                      <input
                        type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleLeaf(p.permissionCode)}
                                              disabled={isDisabled}
                                            />
                                            {showCompactActionChips ? (
                                              <span className="action-chip-label">{String(p.action || '').toUpperCase()}</span>
                                            ) : (
                                              <span className="action-text">
                                                <span className="action-name">{p.permissionName || p.action}</span>
                                                <span className="action-code">{p.permissionCode}</span>
                                              </span>
                                            )}
                                            {isSystem ? (
                                              <span className="action-lock" aria-label="System permission">
                                                🔒
                                              </span>
                                            ) : null}
                                          </label>
                                        );
                                      })}
                                    </div>
                                    <div className="entity-footnote">
                                      {feat.items.length > 0 ? (
                                        <span className="muted">Permission codes are saved exactly as-is.</span>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </section>

            <aside className="perm-config-selected">
              <div className="perm-config-selected-header">
                <div>
                  <div className="perm-config-selected-title">Selected permissions</div>
                  <div className="perm-config-selected-subtitle">{selectedItems.length} selected</div>
                </div>
              </div>

              {selectedItems.length === 0 ? (
                <div className="perm-config-selected-empty">
                  {/* UI-only: enhanced empty state guidance for admins (no logic change) */}
                  <div className="perm-config-selected-empty-icon" aria-hidden>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z"></path>
                      <path d="M9 12h6"></path>
                      <path d="M12 9v6"></path>
                    </svg>
                  </div>
                  <div className="perm-config-selected-empty-title">No permissions selected</div>
                  <div className="perm-config-selected-empty-subtitle">
                    Select permissions from the left tree (Module → Entity → Action). Your selection will appear here grouped by module.
                  </div>
                </div>
              ) : (
                <div className="perm-config-selected-list">
                  {/* UI/UX refactor: grouped by module, compact code list */}
                  {selectedByModule.map((g) => (
                    <div key={g.moduleName} className="selected-module-group">
                      <div className="selected-module-header">
                        <span className="selected-module-name">{g.moduleName}</span>
                        <span className="selected-module-count">{g.codes.length}</span>
                      </div>
                      <ul className="selected-code-list">
                        {g.codes.map((code) => (
                          <li key={code} className="selected-code-item">
                            <code className="selected-code">{code}</code>
                            <button
                              type="button"
                              className="perm-config-btn perm-config-btn--ghost perm-config-btn--tiny"
                              onClick={() => toggleLeaf(code)}
                              aria-label={`Remove ${code}`}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
        </div>
      </main>
    </div>
  );
};

export default PermissionConfigurationPage;


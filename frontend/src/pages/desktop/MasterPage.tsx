import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../services/permissionService';
import { canAccessDesktopModule } from '../../utils/moduleAccess';
import PageHeader from '../../components/layout/PageHeader';
import './masterPage.css';
import '../desktop/dashboardPage.css';
import './masterPageHeader.css';
import NotificationBell from '../../components/NotificationBell';

const MasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<{ sort: 'az' | 'za'; favorites: boolean }>({
    sort: 'az',
    favorites: false,
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const masterItems = [
    {
      id: 'company',
      title: 'Company Master',
      description: 'Manage company information and details',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      path: '/master/company',
    },
    {
      id: 'state',
      title: 'State Master',
      description: 'Manage state information and regions',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      ),
      path: '/master/state',
    },
    {
      id: 'district',
      title: 'District Master',
      description: 'Manage district information and details',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      ),
      path: '/master/district',
    },
    {
      id: 'equipment',
      title: 'Equipment Master',
      description: 'Manage equipment information and details',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      ),
      path: '/master/equipment',
    },
    {
      id: 'finance-year',
      title: 'Finance Year Master',
      description: 'Manage finance year information and details',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
      path: '/master/finance-year',
    },
    {
      id: 'area',
      title: 'Area Master',
      description: 'Manage area and zone information',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
          <line x1="15" y1="3" x2="15" y2="21"></line>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="3" y1="15" x2="21" y2="15"></line>
        </svg>
      ),
      path: '/master/area',
    },
    {
      id: 'category',
      title: 'Category Master',
      description: 'Organize items into categories',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="2" x2="12" y2="22"></line>
          <line x1="2" y1="12" x2="22" y2="12"></line>
        </svg>
      ),
      path: '/master/category',
    },
    {
      id: 'color-code',
      title: 'Color Code Master',
      description: 'Manage color coding standards',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
          <circle cx="11.5" cy="11.5" r=".5" fill="currentColor"></circle>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.7-.5-1.125-.5-.437 0-.835.19-1.125.5-.289.29-.5.7-.5 1.125 0 .942-.722 1.688-1.648 1.688-3.866 0-7-3.134-7-7s3.134-7 7-7 7 3.134 7 7c0 .437-.19.835-.5 1.125-.29.29-.7.5-1.125.5-.437 0-.835-.19-1.125-.5-.29-.29-.5-.7-.5-1.125 0-.942.722-1.688 1.648-1.688.437 0 .835.19 1.125.5.29.29.5.7.5 1.125 0 .942.722 1.688 1.648 1.688C17.254 22 18 21.254 18 20.328c0-.437-.19-.835-.5-1.125-.29-.29-.7-.5-1.125-.5-.437 0-.835.19-1.125.5-.29.29-.5.7-.5 1.125 0 .942-.722 1.688-1.648 1.688"></path>
        </svg>
      ),
      path: '/master/color-code',
    },
    {
      id: 'pcb-zone',
      title: 'PCB Zone Master',
      description: 'Manage PCB zone configurations',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <circle cx="15.5" cy="8.5" r="1.5"></circle>
          <circle cx="8.5" cy="15.5" r="1.5"></circle>
          <circle cx="15.5" cy="15.5" r="1.5"></circle>
        </svg>
      ),
      path: '/master/pcb-zone',
    },
    {
      id: 'frequency',
      title: 'Frequency Master',
      description: 'Manage frequency settings and schedules',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      ),
      path: '/master/frequency',
    },
    {
      id: 'hcf-type',
      title: 'HCF Type Master',
      description: 'Manage Healthcare Facility types',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
      path: '/master/hcf-type',
    },
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Control user access and permissions',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      path: '/master/user-management',
    },
    {
      id: 'hcf-master',
      title: 'HCF Master',
      description: 'Manage Healthcare Facility information',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      path: '/master/hcf-master',
    },
    {
      id: 'hcf-amendments',
      title: 'HCF Amendments',
      description: 'Manage Healthcare Facility amendments',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      ),
      path: '/master/hcf-amendments',
    },
    {
      id: 'fleet-management',
      title: 'Fleet Management',
      description: 'Manage vehicle fleet and logistics',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
          <polygon points="12 15 17 21 7 21 12 15"></polygon>
        </svg>
      ),
      path: '/master/fleet-management',
    },
    {
      id: 'route-master',
      title: 'Route Master',
      description: 'Manage routes and pathways',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      path: '/master/route',
    },
    {
      id: 'route-hcf-mapping',
      title: 'Route–HCF Mapping',
      description: 'Map routes to Healthcare Facilities',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
          <path d="M12 13l-2-2"></path>
          <path d="M12 13l2-2"></path>
        </svg>
      ),
      path: '/master/route-hcf-mapping',
    },
  ];

  const filteredItems = masterItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fav:master');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setFavoriteIds(new Set(parsed.filter((x) => typeof x === 'string')));
    } catch {
      // ignore
    }
  }, []);

  const persistFavorites = (next: Set<string>) => {
    setFavoriteIds(next);
    try {
      localStorage.setItem('fav:master', JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
  };

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
      label: 'Reports', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname.startsWith('/report')
    },
    // SuperAdmin-only admin pages
    ...(Array.isArray(permissions) && permissions.includes('*') ? [
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
    ] : []),
  ];

  const masterItemPermissionById: Record<string, string> = {
    company: 'COMPANY_VIEW',
    state: 'STATE_VIEW',
    area: 'AREA_VIEW',
    category: 'CATEGORY_VIEW',
    'color-code': 'COLOR_VIEW',
    'pcb-zone': 'PCB_ZONE_VIEW',
    frequency: 'FREQUENCY_VIEW',
    'hcf-type': 'HCF_TYPE_VIEW',
    'user-management': 'USER_VIEW',
    'hcf-master': 'HCF_VIEW',
    'hcf-amendments': 'HCF_AMENDMENT_VIEW',
    'fleet-management': 'FLEET_VIEW',
    'route-master': 'ROUTE_VIEW',
    'route-hcf-mapping': 'ROUTE_HCF_VIEW',
  };

  const canSeeMasterCard = (itemId: string) => {
    const perms = Array.isArray(permissions) ? permissions : [];
    if (perms.includes('*')) return true;
    const required = masterItemPermissionById[itemId];
    if (!required) return false;
    return hasPermission(perms, required);
  };

  const visibleItems = useMemo(() => {
    const byPerm = filteredItems.filter((item) => canSeeMasterCard(item.id));
    const byFav = filters.favorites ? byPerm.filter((i) => favoriteIds.has(i.id)) : byPerm;
    const sorted = [...byFav].sort((a, b) => {
      const cmp = a.title.localeCompare(b.title);
      return filters.sort === 'za' ? -cmp : cmp;
    });
    return sorted;
  }, [filteredItems, permissions, filters.sort, filters.favorites, favoriteIds]);

  const navItems = navItemsAll.filter((item) => {
    if (item.path === '/dashboard') return canAccessDesktopModule(permissions, 'dashboard');
    if (item.path === '/transaction') return canAccessDesktopModule(permissions, 'transaction');
    if (item.path === '/finance') return canAccessDesktopModule(permissions, 'finance');
    if (item.path === '/commercial-agreements') return canAccessDesktopModule(permissions, 'commercial');
    if (item.path === '/compliance-training') return canAccessDesktopModule(permissions, 'compliance');
    if (item.path === '/master') return canAccessDesktopModule(permissions, 'master');
    if (item.path === '/report') return canAccessDesktopModule(permissions, 'report');
    return true;
  });

  useEffect(() => {
    if (!isFiltersOpen) return;

    const updatePos = () => {
      const btn = filterBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = 320;
      const margin = 12;
      const leftRaw = rect.right - width;
      const left = Math.max(margin, Math.min(leftRaw, window.innerWidth - width - margin));
      const top = Math.min(rect.bottom + 8, window.innerHeight - 140);
      setPanelPos({ top, left, width });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);

    const onDocMouseDown = (e: MouseEvent) => {
      const el = panelRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setIsFiltersOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFiltersOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [isFiltersOpen]);

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
        {/* Top Header */}
        <PageHeader 
          title="Master Data"
          subtitle="Manage master data and configurations"
        />

        {isFiltersOpen ? <div className="cf-backdrop" onClick={() => setIsFiltersOpen(false)} /> : null}
        {isFiltersOpen ? (
          <div
            className="cf-panel"
            ref={panelRef}
            style={panelPos ? { top: panelPos.top, left: panelPos.left, width: panelPos.width } : undefined}
          >
            <div className="cf-header">
              <h3>Filters</h3>
              <button className="cf-close" type="button" onClick={() => setIsFiltersOpen(false)} aria-label="Close filters">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="cf-content">
              <div>
                <div className="cf-section-label">Sort</div>
                <div className="cf-seg">
                  <button
                    type="button"
                    className={`cf-seg-btn ${filters.sort === 'az' ? 'active' : ''}`}
                    onClick={() => setFilters((p) => ({ ...p, sort: 'az' }))}
                  >
                    A → Z
                  </button>
                  <button
                    type="button"
                    className={`cf-seg-btn ${filters.sort === 'za' ? 'active' : ''}`}
                    onClick={() => setFilters((p) => ({ ...p, sort: 'za' }))}
                  >
                    Z → A
                  </button>
                </div>
              </div>

              <div>
                <div className="cf-section-label">Favorites</div>
                <div className="cf-toggle-row">
                  <button
                    type="button"
                    className={`cf-toggle ${filters.favorites ? 'active' : ''}`}
                    onClick={() => setFilters((p) => ({ ...p, favorites: !p.favorites }))}
                    aria-pressed={filters.favorites}
                  >
                    <span className="cf-toggle-slider" />
                  </button>
                  <span className="cf-toggle-label">{filters.favorites ? 'Show favorites only' : 'Show all modules'}</span>
                </div>
              </div>
            </div>

            {(filters.sort !== 'az' || filters.favorites) ? (
              <div className="cf-actions">
                <button className="cf-clear" type="button" onClick={() => setFilters({ sort: 'az', favorites: false })}>
                  Clear All
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Master Page Content */}
        <div className="master-page master-page-header">
      <div className="master-header">
        <div className="master-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
          </svg>
        </div>
        <div className="master-title-section">
          <h1 className="master-title">Masters</h1>
          <p className="master-subtitle">Manage your data at one place</p>
        </div>
      </div>

      <div className="master-search-section">
        <div className="master-search-row">
        <div className="master-search-box">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            className="master-search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="master-filter-btn"
          onClick={() => setIsFiltersOpen((v) => !v)}
          aria-expanded={isFiltersOpen}
          ref={filterBtnRef}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9v7l4 2v-9l8-9z"></path>
          </svg>
          <span>Filter</span>
        </button>
        </div>
      </div>

      <div className="master-grid">
        {/* UI-only: hide master cards that user cannot access (avoid clutter/disabled grid) */}
        {visibleItems.map((item) => (
          <Link key={item.id} to={item.path} className="master-card">
            <button
              type="button"
              className={`cf-fav-btn ${favoriteIds.has(item.id) ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const next = new Set(favoriteIds);
                if (next.has(item.id)) next.delete(item.id);
                else next.add(item.id);
                persistFavorites(next);
              }}
              aria-label={favoriteIds.has(item.id) ? 'Remove from favorites' : 'Add to favorites'}
              title={favoriteIds.has(item.id) ? 'Favorited' : 'Favorite'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
            <div className="master-card-icon">{item.icon}</div>
            <h3 className="master-card-title">{item.title}</h3>
            <p className="master-card-description">{item.description}</p>
          </Link>
        ))}

        {visibleItems.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13, padding: '8px 4px' }}>
            No master modules available for your permissions.
          </div>
        ) : null}
      </div>
      </div>
      </main>
    </div>
  );
};

export default MasterPage;

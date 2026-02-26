import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { hasPermission } from '../../services/permissionService';
import PageHeader from '../../components/layout/PageHeader';
import './masterPage.css';
import '../desktop/dashboardPage.css';

const CommercialAgreementsPage = () => {
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

  const commercialAgreementsItems = [
    {
      id: 'contract-master',
      title: 'Contract Master',
      description: 'Manage contracts and commercial line items',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      path: '/commercial-agreements/contract-master',
    },
    {
      id: 'agreement',
      title: 'Agreement Management',
      description: 'Generate and manage agreement documents',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ),
      path: '/commercial-agreements/agreement',
    },
    {
      id: 'agreement-clause',
      title: 'Agreement Clause Management',
      description: 'Manage legal clauses for agreements',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
      path: '/commercial-agreements/agreement-clause',
    },
  ];

  // UI-only: hide cards the user cannot access (prevents clutter from disabled cards).
  const commercialItemPermissionById: Record<string, string[]> = {
    'contract-master': ['CONTRACT_VIEW', 'CONTRACT_CREATE', 'CONTRACT_EDIT', 'CONTRACT_DELETE'],
    agreement: ['AGREEMENT_VIEW', 'AGREEMENT_CREATE', 'AGREEMENT_EDIT', 'AGREEMENT_DELETE'],
    'agreement-clause': ['AGREEMENT_CLAUSE_VIEW', 'AGREEMENT_CLAUSE_CREATE', 'AGREEMENT_CLAUSE_EDIT', 'AGREEMENT_CLAUSE_DELETE'],
  };

  const canSeeCommercialCard = (itemId: string) => {
    const perms = Array.isArray(permissions) ? permissions : [];
    if (perms.includes('*')) return true;
    const reqs = commercialItemPermissionById[itemId] || [];
    return reqs.some((p) => hasPermission(perms, p));
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fav:commercial');
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
      localStorage.setItem('fav:commercial', JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
  };

  const visibleItems = useMemo(() => {
    const byPerm = commercialAgreementsItems.filter((item) => canSeeCommercialCard(item.id));
    const bySearch = byPerm.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    const byFav = filters.favorites ? bySearch.filter((i) => favoriteIds.has(i.id)) : bySearch;
    const sorted = [...byFav].sort((a, b) => {
      const cmp = a.title.localeCompare(b.title);
      return filters.sort === 'za' ? -cmp : cmp;
    });
    return sorted;
  }, [searchQuery, permissions, filters.sort, filters.favorites, favoriteIds]);

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

  // Fix: use shared permission-filtered sidebar nav (prevents unauthorized menus from showing/clicking)
  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

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

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <PageHeader 
          title="Commercial Agreements"
          subtitle="Manage contracts and agreements"
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

        {/* Commercial Agreements Page Content */}
        <div className="master-page">
          <div className="master-header">
            <div className="master-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div className="master-title-section">
              <h1 className="master-title">Commercial / Agreements</h1>
              <p className="master-subtitle">Manage your commercial agreements at one place</p>
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
            {visibleItems.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 13, padding: '8px 4px' }}>
                No commercial modules available for your permissions.
              </div>
            ) : (
              visibleItems.map((item) => (
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
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CommercialAgreementsPage;

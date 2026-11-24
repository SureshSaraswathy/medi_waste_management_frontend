import React from 'react';
import { canAccessDesktopModule, firstAdministrationPath } from './moduleAccess';
import { getAdminNavItems, SidebarNavItem } from './adminNavItems';

export function getDesktopSidebarNavItems(permissions: string[] | undefined, pathname: string): SidebarNavItem[] {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const isComplianceRegisterRoute = normalizedPath === '/transaction/compliance-register';

  const navItemsAll: SidebarNavItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      active: pathname === '/dashboard',
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
      active:
        (normalizedPath === '/transaction' || normalizedPath.startsWith('/transaction/')) &&
        !isComplianceRegisterRoute,
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
      active: normalizedPath === '/finance' || normalizedPath.startsWith('/finance/'),
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
      active: normalizedPath === '/commercial-agreements' || normalizedPath.startsWith('/commercial-agreements/'),
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
      active:
        normalizedPath === '/compliance-training' ||
        normalizedPath.startsWith('/compliance-training/') ||
        isComplianceRegisterRoute,
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
      active: normalizedPath === '/master' || normalizedPath.startsWith('/master/'),
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
      active: normalizedPath === '/report' || normalizedPath.startsWith('/report/'),
    },
  ];

  const modules = navItemsAll.filter((item) => {
    if (item.path === '/dashboard') return canAccessDesktopModule(permissions, 'dashboard');
    if (item.path === '/transaction') return canAccessDesktopModule(permissions, 'transaction');
    if (item.path === '/finance') return canAccessDesktopModule(permissions, 'finance');
    if (item.path === '/commercial-agreements') return canAccessDesktopModule(permissions, 'commercial');
    if (item.path === '/compliance-training') return canAccessDesktopModule(permissions, 'compliance');
    if (item.path === '/master') return canAccessDesktopModule(permissions, 'master');
    if (item.path === '/report') return canAccessDesktopModule(permissions, 'report');
    return true;
  });

  // Core Administration (User Management, Roles & Permissions) is independent of the Master licence. When the Master item is not
  // available to this user (no Master permission, or Master disabled for the customer) but they may still manage users/roles, offer a
  // direct Administration entry so those core pages stay reachable. SuperAdmin keeps the normal Master hub.
  const isWildcard = (Array.isArray(permissions) ? permissions : []).includes('*');
  const adminPath = firstAdministrationPath(permissions);
  const administration: SidebarNavItem[] =
    !isWildcard && adminPath && !modules.some((m) => m.path === '/master')
      ? [
          {
            path: adminPath,
            label: 'Administration',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path>
                <circle cx="10" cy="7" r="4"></circle>
                <path d="M21 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            ),
            active: normalizedPath.startsWith('/master/user-management') || normalizedPath.startsWith('/master/roles-permissions') || normalizedPath === '/users/new',
          },
        ]
      : [];

  // SuperAdmin-only tools (Dashboard Configuration, Permission Configuration, Customer Entitlements): not licensable, never filtered here.
  return [...modules, ...administration, ...getAdminNavItems(permissions, pathname)];
}


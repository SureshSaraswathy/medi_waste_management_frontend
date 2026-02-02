import React from 'react';

export type SidebarNavItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
};

export function getAdminNavItems(permissions: string[] | undefined, pathname: string): SidebarNavItem[] {
  const perms = Array.isArray(permissions) ? permissions : [];
  if (!perms.includes('*')) return [];

  return [
    {
      path: '/admin/dashboard-configuration',
      label: 'Dashboard Configuration',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
      active: pathname === '/admin/dashboard-configuration' || pathname.startsWith('/admin/dashboard-configuration'),
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
      active: pathname === '/admin/permission-configuration' || pathname.startsWith('/admin/permission-configuration'),
    },
  ];
}


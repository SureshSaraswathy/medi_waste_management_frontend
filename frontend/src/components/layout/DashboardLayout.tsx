/**
 * Dashboard Layout Wrapper
 * 
 * Wraps all desktop pages with the shared DashboardShell layout.
 * This ensures consistent sidebar, header, and breadcrumbs across all pages.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardShell from '../dashboard/DashboardShell';
import { useDashboard } from '../../context/DashboardContext';

const DashboardLayout: React.FC = () => {
  const { previewMode, exitPreview } = useDashboard();

  return (
    <DashboardShell previewMode={previewMode} onExitPreview={exitPreview}>
      <Outlet />
    </DashboardShell>
  );
};

export default DashboardLayout;

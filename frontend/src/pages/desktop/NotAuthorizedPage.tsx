import React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AppLayout from '../../components/layout/AppLayout';
import './notAuthorizedPage.css';

/**
 * "Not authorized" screen. UI only: the redirect rules below are unchanged (who is sent here, and when they are sent back to the
 * dashboard, is decided exactly as before). The page now renders inside the shared application layout, so the sidebar, header
 * and footer are the same as on every other page.
 */
export default function NotAuthorizedPage() {
  const { permissions, permissionsLoading, permissionsReady } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from as string | undefined;

  // If user has permissions and landed on /not-authorized directly (or from a stale redirect),
  // send them back to dashboard. If they were redirected here from a blocked route, keep the page.
  React.useEffect(() => {
    if (permissionsLoading || !permissionsReady) return;
    const perms = Array.isArray(permissions) ? permissions : [];
    if (perms.length === 0) return;

    if (!from || from === '/dashboard') {
      navigate('/dashboard', { replace: true });
    }
  }, [from, navigate, permissions, permissionsLoading, permissionsReady]);

  // Avoid a brief flash before redirect when we know we should go back.
  if (!permissionsLoading && permissionsReady) {
    const perms = Array.isArray(permissions) ? permissions : [];
    if (perms.length > 0 && (!from || from === '/dashboard')) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

  return (
    <AppLayout pageTitle="Not Authorized" pageSubtitle="You don't have permission to access this page">
      <div className="na-wrap">
        <section className="na-card" role="alert" aria-labelledby="na-title">
          <span className="na-icon" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5l8-3z" />
              <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
            </svg>
          </span>
          <h2 id="na-title" className="na-title">Not authorized</h2>
          <p className="na-text">
            You don’t have permission to access this page. If you think this is a mistake, please contact your administrator.
          </p>

          <div className="na-meta">
            <span className="na-meta-label">Requested page</span>
            <code className="na-meta-value">{from || location.pathname}</code>
          </div>

          <div className="na-actions">
            <Link className="na-btn na-btn--primary" to="/dashboard">
              Go to Dashboard
            </Link>
            {canGoBack && (
              <button type="button" className="na-btn" onClick={() => navigate(-1)}>
                Go back
              </button>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

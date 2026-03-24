import { useAuth } from '../../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import BreadcrumbNavigation, { BreadcrumbItem } from '../common/BreadcrumbNavigation';
import { resolveBreadcrumbMeta } from '../../utils/breadcrumbConfig';
import './pageHeader.css';
import NotificationBell from '../NotificationBell';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbItems?: BreadcrumbItem[];
  leftIcon?: React.ReactNode;
  className?: string;
  breadcrumbOnly?: boolean;
  /**
   * Standard enterprise header styling for non-dashboard pages.
   * Dashboard page can opt-out to keep its existing header look/behavior.
   */
  standard?: boolean;
}

const PageHeader = ({
  title,
  subtitle,
  breadcrumbItems,
  leftIcon,
  className,
  breadcrumbOnly,
  standard = true,
}: PageHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get user display name
  const displayName = user?.name || user?.username || 'User';
  
  // Get avatar initials (first letter of first name and first letter of last name, or first two letters of username)
  const getAvatarInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const avatarInitials = getAvatarInitials(displayName);

  const effectiveBreadcrumbItems =
    standard && (!breadcrumbItems || breadcrumbItems.length === 0)
      ? (() => {
          const meta = resolveBreadcrumbMeta(location.pathname, title);
          const items: BreadcrumbItem[] = [{ label: 'Home', path: '/dashboard', isCurrent: false }];

          if (meta.moduleLabel && meta.moduleLabel !== 'Home' && meta.moduleLabel !== meta.pageLabel) {
            items.push({
              label: meta.moduleLabel,
              path: meta.modulePath || undefined,
              isCurrent: false,
            });
          }

          if (meta.pageLabel !== 'Home') {
            items.push({ label: meta.pageLabel, isCurrent: true });
          } else {
            items[0].isCurrent = true;
          }

          return items;
        })()
      : breadcrumbItems;

  const hasBreadcrumb = !!effectiveBreadcrumbItems?.length;
  const effectiveBreadcrumbOnly = typeof breadcrumbOnly === 'boolean' ? breadcrumbOnly : standard;
  const isReportRoute = location.pathname.startsWith('/report');

  return (
    <header
      className={[
        'dashboard-header page-header top-header app-header',
        standard ? 'app-header--standard' : '',
        standard && hasBreadcrumb ? 'app-header--has-breadcrumb' : '',
        isReportRoute ? 'report-page-header' : '',
        className || '',
      ].join(' ')}
    >
      <div className="app-header-left">
        <div className="app-title-group">
          {effectiveBreadcrumbItems?.length ? (
            <div className="app-breadcrumb-wrap">
              <BreadcrumbNavigation items={effectiveBreadcrumbItems} />

              {!effectiveBreadcrumbOnly ? (
                <div className="app-breadcrumb-title" aria-label="Page title">
                  {leftIcon ? <span className="app-breadcrumb-title__icon">{leftIcon}</span> : null}
                  <span className="app-breadcrumb-title__text">{title}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <h1 className="app-page-title">{title}</h1>
              {subtitle && <span className="app-page-subtitle">{subtitle}</span>}
            </>
          )}
        </div>
      </div>

      <div className="app-header-actions">
        <div className="app-notification-btn">
          <NotificationBell />
        </div>

        <div className="app-user-profile">
          <div className="app-avatar" aria-hidden="true">{avatarInitials}</div>
          <div className="app-user-text">
            <div className="app-name">{displayName}</div>
            <div className="app-status">Online</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PageHeader;

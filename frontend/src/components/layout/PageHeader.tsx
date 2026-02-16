import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../NotificationBell';
import './pageHeader.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  const { user } = useAuth();

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

  return (
    <header className="dashboard-header page-header top-header app-header">
      <div className="app-header-left">
        <div className="app-title-group">
          <h1 className="app-page-title">{title}</h1>
          {subtitle && <span className="app-page-subtitle">{subtitle}</span>}
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

import { useState } from 'react';

export interface UserCardProps {
  id: string;
  userName: string;
  employeeCode?: string;
  emailAddress?: string;
  mobileNumber: string;
  companyName: string;
  roleName?: string;
  status: 'Active' | 'Inactive' | 'Draft';
  employmentType?: string;
  webLogin?: boolean;
  mobileApp?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (id: string) => void;
}

const UserCard = ({
  id,
  userName,
  employeeCode,
  emailAddress,
  mobileNumber,
  companyName,
  roleName,
  status,
  employmentType,
  webLogin,
  mobileApp,
  onEdit,
  onDelete,
  onClick,
}: UserCardProps) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = () => {
    switch (status) {
      case 'Active':
        return { bg: '#d1fae5', color: '#065f46' };
      case 'Inactive':
        return { bg: '#fee2e2', color: '#991b1b' };
      case 'Draft':
        return { bg: '#fef3c7', color: '#92400e' };
      default:
        return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  const statusStyle = getStatusColor();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on action buttons
    if ((e.target as HTMLElement).closest('.user-card-actions')) {
      return;
    }
    onClick?.(id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  return (
    <div
      className="user-card-modern"
      onClick={handleCardClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Card Header */}
      <div className="user-card-modern-header">
        <div className="user-card-modern-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <div className="user-card-modern-title-section">
          <h3 className="user-card-modern-title">{userName}</h3>
          <div className="user-card-modern-indicators">
            {webLogin && (
              <span className="indicator-icon" title="Web Login Enabled">🌐</span>
            )}
            {mobileApp && (
              <span className="indicator-icon" title="Mobile App Access">📱</span>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="user-card-modern-body">
        {/* Employee Code */}
        {employeeCode && (
          <div className="user-card-modern-field">
            <span className="field-label">Emp Code:</span>
            <span className="field-value">{employeeCode}</span>
          </div>
        )}

        {/* Email */}
        {emailAddress && (
          <div className="user-card-modern-field">
            <span className="field-label">Email:</span>
            <span className="field-value">{emailAddress}</span>
          </div>
        )}

        {/* Mobile */}
        <div className="user-card-modern-field">
          <span className="field-label">Mobile:</span>
          <span className="field-value">{mobileNumber}</span>
        </div>

        {/* Company */}
        <div className="user-card-modern-field">
          <span className="field-label">Company:</span>
          <span className="field-value">{companyName}</span>
        </div>

        {/* Role */}
        {roleName && (
          <div className="user-card-modern-field">
            <span className="field-label">Role:</span>
            <span className="field-value">{roleName}</span>
          </div>
        )}

        {/* Employment Type */}
        {employmentType && (
          <div className="user-card-modern-field">
            <span className="field-label">Type:</span>
            <span className="field-value">{employmentType}</span>
          </div>
        )}

        {/* Status Badge */}
        <div className="user-card-modern-status">
          <span
            className="status-badge"
            style={{
              background: statusStyle.bg,
              color: statusStyle.color,
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {(onEdit || onDelete) && (
        <div className={`user-card-actions ${showActions ? 'visible' : ''}`}>
          {onEdit && (
            <button
              className="action-btn action-btn--edit"
              onClick={handleEdit}
              aria-label="Edit user"
              title="Edit user"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              className="action-btn action-btn--delete"
              onClick={handleDelete}
              aria-label="Delete user"
              title="Delete user"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UserCard;

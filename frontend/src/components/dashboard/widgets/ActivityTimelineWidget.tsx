/**
 * Activity Timeline Widget Component
 * 
 * Displays a chronological list of activities/events.
 * Used for audit logs, recent activities, system events, etc.
 */

import React from 'react';
import './widgets.css';

interface ActivityItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  description?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
}

interface ActivityTimelineWidgetProps {
  title: string;
  activities: ActivityItem[];
  loading?: boolean;
  maxItems?: number;
  onItemClick?: (item: ActivityItem) => void;
}

export const ActivityTimelineWidget: React.FC<ActivityTimelineWidgetProps> = ({
  title,
  activities,
  loading = false,
  maxItems = 10,
  onItemClick,
}) => {
  const displayActivities = activities.slice(0, maxItems);

  if (loading) {
    return (
      <div className="widget-panel widget-panel--activity-timeline">
        <div className="widget-panel__header">
          <h3 className="widget-panel__title">{title}</h3>
        </div>
        <div className="widget-panel__body">
          <div className="widget-panel__skeleton">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-activity-item"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type?: ActivityItem['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        );
      case 'warning':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        );
      case 'error':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        );
    }
  };

  return (
    <div className="widget-panel widget-panel--activity-timeline">
      <div className="widget-panel__header">
        <h3 className="widget-panel__title">{title}</h3>
        {activities.length > maxItems && (
          <span className="widget-panel__badge">{activities.length} total</span>
        )}
      </div>
      <div className="widget-panel__body">
        {displayActivities.length === 0 ? (
          <div className="widget-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <p>No recent activity</p>
          </div>
        ) : (
          <ul className="activity-timeline">
            {displayActivities.map((activity, index) => (
              <li
                key={activity.id}
                className={`activity-item activity-item--${activity.type || 'info'} ${onItemClick ? 'activity-item--clickable' : ''}`}
                onClick={() => onItemClick?.(activity)}
              >
                <div className="activity-item__line">
                  {index < displayActivities.length - 1 && <div className="activity-item__line-connector"></div>}
                </div>
                <div className="activity-item__icon">
                  {activity.icon || getActivityIcon(activity.type)}
                </div>
                <div className="activity-item__content">
                  <div className="activity-item__header">
                    <span className="activity-item__user">{activity.user}</span>
                    <span className="activity-item__timestamp">{activity.timestamp}</span>
                  </div>
                  <div className="activity-item__action">{activity.action}</div>
                  {activity.description && (
                    <div className="activity-item__description">{activity.description}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ActivityTimelineWidget;

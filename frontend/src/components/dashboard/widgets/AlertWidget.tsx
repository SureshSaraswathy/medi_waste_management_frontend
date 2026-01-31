/**
 * Alert Widget Component
 * 
 * Displays important alerts, notifications, or warnings.
 * Used for system alerts, compliance warnings, etc.
 */

import React from 'react';
import './widgets.css';

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface AlertWidgetProps {
  title: string;
  alerts: Alert[];
  loading?: boolean;
  maxItems?: number;
}

export const AlertWidget: React.FC<AlertWidgetProps> = ({
  title,
  alerts,
  loading = false,
  maxItems = 5,
}) => {
  const displayAlerts = alerts.slice(0, maxItems);

  if (loading) {
    return (
      <div className="widget-panel widget-panel--alert">
        <div className="widget-panel__header">
          <h3 className="widget-panel__title">{title}</h3>
        </div>
        <div className="widget-panel__body">
          <div className="widget-panel__skeleton">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="skeleton-alert-item"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        );
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        );
    }
  };

  return (
    <div className="widget-panel widget-panel--alert">
      <div className="widget-panel__header">
        <h3 className="widget-panel__title">{title}</h3>
        {alerts.length > maxItems && (
          <span className="widget-panel__badge">{alerts.length} total</span>
        )}
      </div>
      <div className="widget-panel__body">
        {displayAlerts.length === 0 ? (
          <div className="widget-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <p>No alerts</p>
          </div>
        ) : (
          <ul className="alert-list">
            {displayAlerts.map((alert) => (
              <li key={alert.id} className={`alert-item alert-item--${alert.type}`}>
                <div className="alert-item__icon">{getAlertIcon(alert.type)}</div>
                <div className="alert-item__content">
                  <h4 className="alert-item__title">{alert.title}</h4>
                  <p className="alert-item__message">{alert.message}</p>
                  {alert.timestamp && (
                    <span className="alert-item__timestamp">{alert.timestamp}</span>
                  )}
                </div>
                {alert.actionLabel && alert.onAction && (
                  <button
                    className="alert-item__action"
                    onClick={alert.onAction}
                  >
                    {alert.actionLabel}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AlertWidget;

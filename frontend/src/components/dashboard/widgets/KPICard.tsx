/**
 * KPI Card Widget Component
 * 
 * Displays a Key Performance Indicator with value, label, and optional trend indicator.
 * Used for metrics like total users, revenue, pending approvals, etc.
 */

import React from 'react';
import './widgets.css';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  loading = false,
  onClick,
}) => {
  if (loading) {
    return (
      <div className="widget-card widget-card--kpi">
        <div className="widget-card__skeleton">
          <div className="skeleton-line skeleton-line--title"></div>
          <div className="skeleton-line skeleton-line--value"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`widget-card widget-card--kpi ${onClick ? 'widget-card--clickable' : ''}`}
      onClick={onClick}
    >
      <div className="widget-card__header">
        <h3 className="widget-card__title">{title}</h3>
        {icon && <div className="widget-card__icon">{icon}</div>}
      </div>
      <div className="widget-card__body">
        <div className="kpi-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
        {trend && (
          <div className={`kpi-trend kpi-trend--${trend.isPositive ? 'positive' : 'negative'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {trend.isPositive ? (
                <polyline points="18 15 12 9 6 15"></polyline>
              ) : (
                <polyline points="6 9 12 15 18 9"></polyline>
              )}
            </svg>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;

/**
 * Metric Widget Component
 * 
 * Displays a single metric value with optional label and trend.
 * Minimal design - no flashy cards, just clean panel-based display.
 */

import React from 'react';
import './widgets.css';

interface MetricWidgetProps {
  title: string;
  value: string | number;
  unit?: string;
  label?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
  loading?: boolean;
}

export const MetricWidget: React.FC<MetricWidgetProps> = ({
  title,
  value,
  unit,
  label,
  trend,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="widget-panel widget-panel--metric">
        <div className="widget-panel__skeleton">
          <div className="skeleton-line skeleton-line--title"></div>
          <div className="skeleton-line skeleton-line--value"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-panel widget-panel--metric">
      <div className="widget-panel__header">
        <h3 className="widget-panel__title">{title}</h3>
      </div>
      <div className="widget-panel__body">
        <div className="metric-value">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && <span className="metric-unit">{unit}</span>}
        </div>
        {label && <div className="metric-label">{label}</div>}
        {trend && (
          <div className={`metric-trend metric-trend--${trend.isPositive ? 'positive' : 'negative'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {trend.isPositive ? (
                <polyline points="18 15 12 9 6 15"></polyline>
              ) : (
                <polyline points="6 9 12 15 18 9"></polyline>
              )}
            </svg>
            <span>{Math.abs(trend.value)}%</span>
            {trend.period && <span className="metric-trend-period">{trend.period}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricWidget;

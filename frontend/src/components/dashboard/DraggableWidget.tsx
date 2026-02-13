/**
 * DraggableWidget Component
 * 
 * Wrapper component for dashboard widgets with drag-and-drop support
 * and modern styling matching the template design
 */

import React from 'react';
import { WidgetConfig } from '../../types/dashboard';
import './DraggableWidget.css';

interface DraggableWidgetProps {
  widget: WidgetConfig;
  index: number;
  isSelected?: boolean;
  children: React.ReactNode;
  className?: string;
  disableGridSizing?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  onDuplicate?: () => void;
  onUpdateSize?: (size: { width?: number; height?: number }) => void;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  widget,
  index,
  isSelected = false,
  children,
  className = '',
  disableGridSizing = false,
  onSelect,
  onRemove,
  onDuplicate,
  onUpdateSize,
}) => {
  // Backend sends gridColumn as 1-4 (4-col layout). The new template uses a 12-col grid.
  // Map 1->3, 2->6, 3->9, 4->12 to match the template card sizing.
  const gridColumnSpan = Math.min(12, Math.max(1, (widget.gridColumn || 1) * 3));
  const gridRowSpan = widget.gridRow || 1;

  return (
    <div
      className={`draggable-widget ${className} ${isSelected ? 'draggable-widget--selected' : ''}`.trim()}
      style={
        disableGridSizing
          ? undefined
          : {
              gridColumn: `span ${gridColumnSpan}`,
              gridRow: `span ${gridRowSpan}`,
            }
      }
      onClick={onSelect}
    >
      <div className="draggable-widget__content">
        {children}
      </div>
      {isSelected && (
        <div className="draggable-widget__overlay">
          <div className="draggable-widget__actions">
            {onDuplicate && (
              <button
                className="draggable-widget__action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                title="Duplicate"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            )}
            {onRemove && (
              <button
                className="draggable-widget__action-btn draggable-widget__action-btn--danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                title="Remove"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

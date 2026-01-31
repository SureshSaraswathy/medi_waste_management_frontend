/**
 * Approval Queue Widget Component
 * 
 * Displays a list of items pending approval with actions.
 * Used for workflows requiring approval (invoices, payments, etc.)
 */

import React from 'react';
import './widgets.css';

interface ApprovalItem {
  id: string;
  title: string;
  description?: string;
  submittedBy: string;
  submittedOn: string;
  amount?: number;
  priority?: 'low' | 'medium' | 'high';
  type?: string;
}

interface ApprovalQueueWidgetProps {
  title: string;
  items: ApprovalItem[];
  loading?: boolean;
  maxItems?: number;
  onApprove?: (item: ApprovalItem) => void;
  onReject?: (item: ApprovalItem) => void;
  onView?: (item: ApprovalItem) => void;
  canApprove?: boolean; // Permission check
  canReject?: boolean; // Permission check
}

export const ApprovalQueueWidget: React.FC<ApprovalQueueWidgetProps> = ({
  title,
  items,
  loading = false,
  maxItems = 5,
  onApprove,
  onReject,
  onView,
  canApprove = false,
  canReject = false,
}) => {
  const displayItems = items.slice(0, maxItems);

  if (loading) {
    return (
      <div className="widget-panel widget-panel--approval-queue">
        <div className="widget-panel__header">
          <h3 className="widget-panel__title">{title}</h3>
        </div>
        <div className="widget-panel__body">
          <div className="widget-panel__skeleton">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-approval-item"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-panel widget-panel--approval-queue">
      <div className="widget-panel__header">
        <h3 className="widget-panel__title">{title}</h3>
        {items.length > maxItems && (
          <span className="widget-panel__badge">{items.length} pending</span>
        )}
      </div>
      <div className="widget-panel__body">
        {displayItems.length === 0 ? (
          <div className="widget-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <p>No pending approvals</p>
          </div>
        ) : (
          <ul className="approval-queue">
            {displayItems.map((item) => (
              <li key={item.id} className="approval-item">
                <div className="approval-item__header">
                  <div className="approval-item__info">
                    <h4 className="approval-item__title">{item.title}</h4>
                    {item.description && (
                      <p className="approval-item__description">{item.description}</p>
                    )}
                  </div>
                  {item.amount && (
                    <div className="approval-item__amount">₹{item.amount.toLocaleString()}</div>
                  )}
                </div>
                <div className="approval-item__meta">
                  <span className="approval-item__submitted">
                    By {item.submittedBy} • {item.submittedOn}
                  </span>
                  {item.priority && (
                    <span className={`approval-item__priority approval-item__priority--${item.priority}`}>
                      {item.priority}
                    </span>
                  )}
                </div>
                <div className="approval-item__actions">
                  {onView && (
                    <button
                      className="approval-item__action-btn approval-item__action-btn--view"
                      onClick={() => onView(item)}
                    >
                      View
                    </button>
                  )}
                  {canReject && onReject && (
                    <button
                      className="approval-item__action-btn approval-item__action-btn--reject"
                      onClick={() => onReject(item)}
                    >
                      Reject
                    </button>
                  )}
                  {canApprove && onApprove && (
                    <button
                      className="approval-item__action-btn approval-item__action-btn--approve"
                      onClick={() => onApprove(item)}
                    >
                      Approve
                    </button>
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

export default ApprovalQueueWidget;

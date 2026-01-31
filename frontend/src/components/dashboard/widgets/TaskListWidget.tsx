/**
 * Task List Widget Component
 * 
 * Displays a list of tasks or items with status indicators.
 * Used for assigned routes, pending approvals, etc.
 */

import React from 'react';
import './widgets.css';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface TaskListWidgetProps {
  title: string;
  tasks: Task[];
  loading?: boolean;
  maxItems?: number;
  onTaskClick?: (task: Task) => void;
}

export const TaskListWidget: React.FC<TaskListWidgetProps> = ({
  title,
  tasks,
  loading = false,
  maxItems = 5,
  onTaskClick,
}) => {
  const displayTasks = tasks.slice(0, maxItems);

  if (loading) {
    return (
      <div className="widget-panel widget-panel--task-list">
        <div className="widget-panel__header">
          <h3 className="widget-panel__title">{title}</h3>
        </div>
        <div className="widget-panel__body">
          <div className="widget-panel__skeleton">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-task-item"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in-progress':
        return '#3b82f6';
      case 'overdue':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  return (
    <div className="widget-panel widget-panel--task-list">
      <div className="widget-panel__header">
        <h3 className="widget-panel__title">{title}</h3>
        {tasks.length > maxItems && (
          <span className="widget-panel__badge">{tasks.length} total</span>
        )}
      </div>
      <div className="widget-panel__body">
        {displayTasks.length === 0 ? (
          <div className="widget-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
            </svg>
            <p>No tasks available</p>
          </div>
        ) : (
          <ul className="task-list">
            {displayTasks.map((task) => (
              <li
                key={task.id}
                className={`task-item ${onTaskClick ? 'task-item--clickable' : ''}`}
                onClick={() => onTaskClick?.(task)}
              >
                <div className="task-item__header">
                  <h4 className="task-item__title">{task.title}</h4>
                  <span
                    className="task-item__status"
                    style={{ backgroundColor: getStatusColor(task.status) }}
                  >
                    {task.status}
                  </span>
                </div>
                {task.description && (
                  <p className="task-item__description">{task.description}</p>
                )}
                {task.dueDate && (
                  <div className="task-item__meta">
                    <span className="task-item__due-date">Due: {task.dueDate}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TaskListWidget;

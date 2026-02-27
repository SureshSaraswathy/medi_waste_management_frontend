import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService, Notification, NotificationPriority } from '../services/notificationService';
import './NotificationBell.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notifs, count] = await Promise.all([
        notificationService.getMyNotifications(),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    // Find unread receiver for current user
    const receiver = notification.receivers.find(r => !r.isRead && (r.userId || r.roleId));
    if (receiver) {
      try {
        await notificationService.markAsRead(receiver.id);
        await loadNotifications();
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to module page
    if (notification.referenceId) {
      const moduleRoutes: Record<string, string> = {
        invoice: '/finance',
        downtime: '/transaction',
        compliance: '/compliance-training',
        training: '/compliance-training',
      };
      const route = moduleRoutes[notification.module] || '/dashboard';
      navigate(route);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    await loadNotifications();
  };

  const getPriorityColor = (priority: NotificationPriority): string => {
    switch (priority) {
      case NotificationPriority.LOW:
        return '#94a3b8';
      case NotificationPriority.MEDIUM:
        return '#3b82f6';
      case NotificationPriority.HIGH:
        return '#f59e0b';
      case NotificationPriority.CRITICAL:
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const groupNotifications = (notifs: Notification[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { label: string; notifications: Notification[] }[] = [
      { label: 'Today', notifications: [] },
      { label: 'Yesterday', notifications: [] },
      { label: 'Earlier', notifications: [] },
    ];

    notifs.forEach((notif) => {
      const notifDate = new Date(notif.createdAt);
      if (notifDate >= today) {
        groups[0].notifications.push(notif);
      } else if (notifDate >= yesterday) {
        groups[1].notifications.push(notif);
      } else {
        groups[2].notifications.push(notif);
      }
    });

    return groups.filter((group) => group.notifications.length > 0);
  };

  const groupedNotifications = groupNotifications(notifications);

  return (
    <div className="notification-bell-container" ref={panelRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="notification-mark-all-btn" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-panel-body">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              groupedNotifications.map((group) => (
                <div key={group.label} className="notification-group">
                  <div className="notification-group-label">{group.label}</div>
                  {group.notifications.map((notification) => {
                    const receiver = notification.receivers[0];
                    const isUnread = receiver && !receiver.isRead;
                    return (
                      <div
                        key={notification.id}
                        className={`notification-item ${isUnread ? 'notification-item--unread' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-item-content">
                          <div className="notification-item-header">
                            <span
                              className="notification-priority-dot"
                              style={{ backgroundColor: getPriorityColor(receiver.priority) }}
                            ></span>
                            <span className="notification-title">{notification.title}</span>
                          </div>
                          <p className="notification-message">{notification.message}</p>
                          <span className="notification-time">{formatTimeAgo(notification.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

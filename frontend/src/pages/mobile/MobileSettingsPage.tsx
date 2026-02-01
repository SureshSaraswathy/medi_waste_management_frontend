import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { useAuth } from '../../hooks/useAuth';
import './mobileSettingsPage.css';

type SettingsState = {
  darkMode: boolean;
  notifications: boolean;
};

const STORAGE_KEY = 'mw-mobile-settings';

const readSettings = (): SettingsState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { darkMode: false, notifications: true };
    const parsed = JSON.parse(raw);
    return {
      darkMode: !!parsed.darkMode,
      notifications: parsed.notifications !== false,
    };
  } catch {
    return { darkMode: false, notifications: true };
  }
};

const writeSettings = (s: SettingsState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
};

const MobileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(() => readSettings());

  const userLabel = useMemo(() => {
    if (!user) return 'Guest';
    return user.name || user.email || 'User';
  }, [user]);

  useEffect(() => {
    // Apply dark mode at app level (simple body class)
    if (settings.darkMode) document.body.classList.add('mw-dark');
    else document.body.classList.remove('mw-dark');
    writeSettings(settings);
  }, [settings]);

  const toggle = (key: keyof SettingsState) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClearLocalData = () => {
    // Keep settings (optional) — but clear auth and cached items
    try {
      localStorage.removeItem('mw-auth-user');
    } catch {
      // ignore
    }
    logout();
    navigate('/mobile/login', { replace: true });
  };

  return (
    <MobileLayout title="Settings" showBackButton onBack={() => navigate(-1)}>
      <div className="mobile-settings">
        <div className="mobile-settings-card">
          <div className="mobile-settings-title">Account</div>
          <div className="mobile-settings-row">
            <div className="mobile-settings-row-main">
              <div className="mobile-settings-label">Signed in as</div>
              <div className="mobile-settings-value">{userLabel}</div>
            </div>
          </div>
        </div>

        <div className="mobile-settings-card">
          <div className="mobile-settings-title">Preferences</div>

          <button className="mobile-settings-row button" onClick={() => toggle('darkMode')}>
            <div className="mobile-settings-row-main">
              <div className="mobile-settings-label">Dark mode</div>
              <div className="mobile-settings-sub">Applies a dark theme on this device</div>
            </div>
            <div className={`mobile-settings-toggle ${settings.darkMode ? 'on' : ''}`} aria-hidden="true" />
          </button>

          <button className="mobile-settings-row button" onClick={() => toggle('notifications')}>
            <div className="mobile-settings-row-main">
              <div className="mobile-settings-label">Notifications</div>
              <div className="mobile-settings-sub">Enable in-app reminders (placeholder)</div>
            </div>
            <div className={`mobile-settings-toggle ${settings.notifications ? 'on' : ''}`} aria-hidden="true" />
          </button>
        </div>

        <div className="mobile-settings-card">
          <div className="mobile-settings-title">Security</div>
          <button className="mobile-settings-row danger" onClick={handleClearLocalData}>
            <div className="mobile-settings-row-main">
              <div className="mobile-settings-label">Logout</div>
              <div className="mobile-settings-sub">Sign out from this device</div>
            </div>
          </button>
        </div>

        <div className="mobile-settings-footer">
          <div className="mobile-settings-footer-text">Medi Waste Management (Mobile)</div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileSettingsPage;


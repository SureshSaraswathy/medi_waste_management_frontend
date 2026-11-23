import { useEffect, useState } from 'react';
import LogoUpload from '../common/LogoUpload';
import { useBranding } from '../../context/BrandingContext';
import { brandingService } from '../../services/brandingService';
import { notifyError, notifySuccess } from '../../utils/notify';

interface ApplicationBrandingModalProps {
  onClose: () => void;
}

/**
 * Application Branding (Application Logo) - opened from the Company Master toolbar.
 * Independent of any company record. The parent only shows the button to SuperAdmin; the API
 * enforces the same rule (SuperAdminGuard), so hiding the button is a convenience, not the security.
 *
 * Changes are staged in the modal and only sent when "Save" is pressed; "Cancel" discards them.
 */
const ApplicationBrandingModal = ({ onClose }: ApplicationBrandingModalProps) => {
  const { logoUrl, refresh } = useBranding();
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free the temporary preview URL when it changes / the modal closes
  useEffect(() => {
    return () => {
      if (stagedPreview) URL.revokeObjectURL(stagedPreview);
    };
  }, [stagedPreview]);

  const close = () => {
    if (!saving) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const handleSelect = (selected: File) => {
    setFile(selected);
    setRemoved(false);
    setError(null);
    setStagedPreview(URL.createObjectURL(selected));
  };

  const handleRemove = () => {
    setFile(null);
    setStagedPreview(null);
    setRemoved(true);
    setError(null);
  };

  const preview = stagedPreview ?? (removed ? null : logoUrl);
  const hasChange = !!file || (removed && !!logoUrl);

  const handleSave = async () => {
    if (!hasChange) return;
    setSaving(true);
    setError(null);
    try {
      if (file) {
        await brandingService.uploadAppLogo(file);
        await refresh();
        notifySuccess('Application logo updated');
      } else {
        await brandingService.removeAppLogo();
        await refresh();
        notifySuccess('Application logo removed. The default icon is shown again.');
      }
      onClose();
    } catch (err) {
      const message = (err as Error).message || 'Failed to save application logo';
      setError(message);
      notifyError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay cm-filter-modal-overlay" onClick={close}>
      <div
        className="modal-content cm-filter-modal app-branding-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-branding-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cm-filter-modal-header">
          <div className="cm-filter-modal-titlewrap">
            <div className="cm-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="13.5" cy="6.5" r="1" />
                <circle cx="17.5" cy="10.5" r="1" />
                <circle cx="8.5" cy="7.5" r="1" />
                <circle cx="6.5" cy="12.5" r="1" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.75 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.48-9-10-9z" />
              </svg>
            </div>
            <div>
              <div className="cm-filter-title" id="app-branding-title">Application Branding</div>
              <div className="cm-filter-subtitle">Logo of the Medi Waste Management software</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={close} aria-label="Close application branding" disabled={saving}>
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="app-branding-modal__section">
            <div className="app-branding-modal__label">Application Logo</div>
            <LogoUpload
              idPrefix="app-logo"
              previewUrl={preview}
              placeholder="Default icon"
              busy={saving}
              onSelect={handleSelect}
              onRemove={handleRemove}
            />
          </div>

          <ul className="app-branding-modal__notes">
            <li>Supported formats: PNG, JPG, SVG. Maximum file size: 2 MB.</li>
            <li>Shown in the sidebar, login page, loading screen and browser tab.</li>
            <li>Not linked to any company. Each company's own logo is set in its Add/Edit form.</li>
          </ul>

          {error && (
            <div className="app-branding-modal__error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="cm-filter-modal-footer">
          <button type="button" className="cm-filter-btn cm-filter-btn--clear" onClick={close} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="cm-filter-btn cm-filter-btn--apply"
            onClick={handleSave}
            disabled={!hasChange || saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationBrandingModal;

import { ChangeEvent, useRef, useState } from 'react';

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const ALLOWED_EXT = /\.(png|jpe?g|svg)$/i;

interface LogoUploadProps {
  /** Image to show (object URL or absolute URL). null/undefined = nothing configured. */
  previewUrl?: string | null;
  /** Called with a validated file. */
  onSelect: (file: File) => void;
  /** Called when the user removes the current logo. Omit to hide the Remove button. */
  onRemove?: () => void;
  disabled?: boolean;
  busy?: boolean;
  placeholder?: string;
  idPrefix?: string;
}

/**
 * Reusable logo field: preview + upload / replace / remove, with client-side validation.
 * (The server validates again - type, magic bytes, size and SVG sanitisation.)
 */
const LogoUpload = ({
  previewUrl,
  onSelect,
  onRemove,
  disabled = false,
  busy = false,
  placeholder = 'No logo',
  idPrefix = 'logo',
}: LogoUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    if (!ALLOWED_EXT.test(file.name) || (file.type && !ALLOWED_TYPES.includes(file.type))) {
      setError('Unsupported file. Use PNG, JPG or SVG.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError('File is too large. Maximum size is 2 MB.');
      return;
    }
    setError(null);
    onSelect(file);
  };

  return (
    <div className="logo-upload">
      <div className="logo-upload__preview">
        {previewUrl ? <img src={previewUrl} alt="Logo preview" /> : <span className="logo-upload__placeholder">{placeholder}</span>}
      </div>
      <div className="logo-upload__body">
        <div className="logo-upload__actions">
          <input
            ref={inputRef}
            id={`${idPrefix}-file`}
            type="file"
            accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
            style={{ display: 'none' }}
            onChange={handleChange}
          />
          <button
            type="button"
            className="logo-upload__btn"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Working...' : previewUrl ? 'Replace' : 'Upload'}
          </button>
          {previewUrl && onRemove && (
            <button
              type="button"
              className="logo-upload__btn logo-upload__btn--danger"
              disabled={disabled || busy}
              onClick={onRemove}
            >
              Remove
            </button>
          )}
        </div>
        <span className="logo-upload__hint">PNG, JPG or SVG, up to 2 MB. Shown without stretching.</span>
        {error && <span className="logo-upload__error">{error}</span>}
      </div>
    </div>
  );
};

export default LogoUpload;

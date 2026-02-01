import React, { useMemo, useState } from 'react';
import './companyPicker.css';

export type CompanyOption = { id: string; name: string };

type Props = {
  label?: string;
  placeholder?: string;
  value: string;
  options: CompanyOption[];
  onChange: (companyId: string) => void;
};

const CompanyPicker: React.FC<Props> = ({
  label = 'Company',
  placeholder = 'Select Company',
  value,
  options,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => options.find((o) => o.id === value), [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="company-picker">
      {label && <div className="company-picker-label">{label}</div>}

      <button
        type="button"
        className="company-picker-button"
        onClick={() => setOpen(true)}
      >
        <span className="company-picker-button-text">
          {selected ? selected.name : placeholder}
        </span>
        <span className="company-picker-chevron" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="company-picker-overlay" onClick={() => setOpen(false)}>
          <div className="company-picker-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="company-picker-sheet-header">
              <div className="company-picker-sheet-title">{placeholder}</div>
              <button
                type="button"
                className="company-picker-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="company-picker-search">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search company..."
              />
            </div>

            <div className="company-picker-list">
              {filtered.length === 0 ? (
                <div className="company-picker-empty">No companies found.</div>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`company-picker-item ${o.id === value ? 'active' : ''}`}
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                    }}
                  >
                    {o.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyPicker;


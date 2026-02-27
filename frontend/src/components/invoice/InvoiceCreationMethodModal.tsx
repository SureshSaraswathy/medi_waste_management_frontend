import React, { useState } from 'react';
import '../../pages/desktop/invoiceManagementPage.css';

interface InvoiceCreationMethodModalProps {
  onClose: () => void;
  onSelectMethod: (method: 'create' | 'auto-bed' | 'auto-weight') => void;
}

const InvoiceCreationMethodModal: React.FC<InvoiceCreationMethodModalProps> = ({
  onClose,
  onSelectMethod,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'create' | 'auto-bed' | 'auto-weight' | null>(null);

  const handleContinue = () => {
    if (selectedMethod) {
      onSelectMethod(selectedMethod);
    }
  };

  const options = [
    {
      value: 'create' as const,
      title: 'Manual Invoice',
      subtitle: 'Create a custom invoice',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      ),
    },
    {
      value: 'auto-bed' as const,
      title: 'Bed / Lumpsum',
      subtitle: 'Recurring monthly billing',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        </svg>
      ),
    },
    {
      value: 'auto-weight' as const,
      title: 'Weight Based',
      subtitle: 'Based on waste collection',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        </svg>
      ),
    },
  ];

  return (
    <div className="wp-modal-overlay" onClick={onClose}>
      <div className="wp-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="wp-modal-header">
          <div className="wp-modal-header-left">
            <div className="wp-modal-icon wp-modal-icon--add">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <h2 className="wp-modal-title">New Invoice</h2>
          </div>
          <button className="wp-modal-close" onClick={onClose} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="wp-modal-body" style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {options.map((option) => (
              <label
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background-color 0.15s',
                  backgroundColor: selectedMethod === option.value ? '#f0f7ff' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (selectedMethod !== option.value) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== option.value) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <input
                  type="radio"
                  name="invoiceMethod"
                  value={option.value}
                  checked={selectedMethod === option.value}
                  onChange={() => setSelectedMethod(option.value)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#3b82f6',
                    flexShrink: 0,
                  }}
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  color: selectedMethod === option.value ? '#3b82f6' : '#64748b',
                  flexShrink: 0,
                }}>
                  {option.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#0f172a',
                    lineHeight: '1.4',
                    marginBottom: '2px',
                  }}>
                    {option.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b',
                    lineHeight: '1.3',
                  }}>
                    {option.subtitle}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="wp-modal-footer">
          <button type="button" className="wp-btn wp-btn--cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="wp-btn wp-btn--save"
            onClick={handleContinue}
            disabled={!selectedMethod}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreationMethodModal;

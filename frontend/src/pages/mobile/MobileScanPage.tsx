import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { wasteCollectionService, BarcodeLookupResponse } from '../../services/wasteCollectionService';
import './mobileScanPage.css';

const MobileScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lookupResult, setLookupResult] = useState<BarcodeLookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleBarcodeLookup = async (barcode: string) => {
    if (!barcode || barcode.length < 5) {
      setError('Please enter a valid barcode (at least 5 characters)');
      return;
    }

    setLoading(true);
    setError(null);
    setLookupResult(null);

    try {
      const result = await wasteCollectionService.lookupBarcode(barcode);
      setLookupResult(result);
      setBarcodeInput('');
    } catch (err: any) {
      const errorMessage = err?.message || 'Barcode not found';
      setError(errorMessage);
      setLookupResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      handleBarcodeLookup(barcodeInput.trim());
    }
  };

  const handleProceedToCollection = () => {
    if (lookupResult) {
      navigate('/mobile/waste-entry', {
        state: {
          barcode: lookupResult.barcode,
          companyId: lookupResult.companyId,
          hcfId: lookupResult.hcfId,
          wasteColor: lookupResult.wasteColor,
        },
      });
    }
  };

  return (
    <MobileLayout title="Scan Barcode" showBackButton onBack={() => navigate('/mobile/home')}>
      <div className="mobile-scan">
        {/* Barcode Input Section */}
        <div className="mobile-scan-input-section">
          <form onSubmit={handleSubmit} className="mobile-scan-form">
            <div className="mobile-scan-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Enter or scan barcode"
                className="mobile-scan-input"
                autoFocus
                autoComplete="off"
              />
              <button
                type="submit"
                className="mobile-scan-submit-btn"
                disabled={loading || !barcodeInput.trim()}
              >
                {loading ? '...' : '🔍'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mobile-scan-error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Lookup Result */}
        {lookupResult && (
          <div className="mobile-scan-result">
            <div className="mobile-scan-result-header">
              <h3>Barcode Found</h3>
              <div className="mobile-scan-result-badge" data-color={lookupResult.wasteColor}>
                {lookupResult.wasteColor}
              </div>
            </div>

            <div className="mobile-scan-result-details">
              <div className="mobile-scan-result-item">
                <span className="mobile-scan-result-label">Barcode:</span>
                <span className="mobile-scan-result-value">{lookupResult.barcode}</span>
              </div>
              <div className="mobile-scan-result-item">
                <span className="mobile-scan-result-label">Company:</span>
                <span className="mobile-scan-result-value">{lookupResult.companyName}</span>
              </div>
              <div className="mobile-scan-result-item">
                <span className="mobile-scan-result-label">HCF:</span>
                <span className="mobile-scan-result-value">{lookupResult.hcfName}</span>
              </div>
              <div className="mobile-scan-result-item">
                <span className="mobile-scan-result-label">HCF Code:</span>
                <span className="mobile-scan-result-value">{lookupResult.hcfCode}</span>
              </div>
            </div>

            <button
              className="mobile-scan-proceed-btn"
              onClick={handleProceedToCollection}
            >
              Proceed to Waste Entry
            </button>
          </div>
        )}

        {/* Instructions */}
        {!lookupResult && !error && (
          <div className="mobile-scan-instructions">
            <h4>How to scan:</h4>
            <ul>
              <li>Enter the barcode manually in the input field above</li>
              <li>Or use your device camera to scan the barcode</li>
              <li>Barcode must be at least 5 characters long</li>
            </ul>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default MobileScanPage;

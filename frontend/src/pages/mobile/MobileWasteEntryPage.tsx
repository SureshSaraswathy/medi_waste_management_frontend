import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { wasteCollectionService } from '../../services/wasteCollectionService';
import './mobileWasteEntryPage.css';

const MobileWasteEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [barcode, setBarcode] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Pre-fill from scan page
    if (location.state) {
      const { barcode: scannedBarcode } = location.state as any;
      if (scannedBarcode) {
        setBarcode(scannedBarcode);
      }
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!barcode || barcode.length < 5) {
      setError('Please enter a valid barcode');
      return;
    }

    if (!weight || parseFloat(weight) <= 0) {
      setError('Please enter a valid weight');
      return;
    }

    setLoading(true);
    try {
      await wasteCollectionService.createWasteCollection({
        barcode: barcode.trim(),
        weightKg: parseFloat(weight),
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      // Reset form
      setBarcode('');
      setWeight('');
      setNotes('');
      // Navigate back after 2 seconds
      setTimeout(() => {
        navigate('/mobile/home');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save waste entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout title="Waste Entry" showBackButton onBack={() => navigate('/mobile/home')}>
      <div className="mobile-waste-entry">
        {success && (
          <div className="mobile-waste-entry-success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Waste entry saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="mobile-waste-entry-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mobile-waste-entry-form">
          <div className="mobile-waste-entry-field">
            <label htmlFor="barcode">Barcode *</label>
            <input
              id="barcode"
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Enter barcode"
              required
              disabled={loading}
            />
          </div>

          <div className="mobile-waste-entry-field">
            <label htmlFor="weight">Weight (Kg) *</label>
            <input
              id="weight"
              type="number"
              step="0.01"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.00"
              required
              disabled={loading}
            />
          </div>

          <div className="mobile-waste-entry-field">
            <label htmlFor="notes">Notes (Optional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={4}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="mobile-waste-entry-submit"
            disabled={loading || success}
          >
            {loading ? 'Saving...' : success ? 'Saved!' : 'Save Entry'}
          </button>
        </form>
      </div>
    </MobileLayout>
  );
};

export default MobileWasteEntryPage;

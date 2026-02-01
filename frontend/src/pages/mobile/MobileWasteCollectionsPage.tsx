import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { wasteCollectionService, WasteCollectionResponse } from '../../services/wasteCollectionService';
import './mobileWasteCollectionsPage.css';

const formatDate = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const MobileWasteCollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<WasteCollectionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => {
      return (
        (x.barcode || '').toLowerCase().includes(q) ||
        (x.status || '').toLowerCase().includes(q) ||
        (x.wasteColor || '').toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await wasteCollectionService.getAllWasteCollections();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load waste collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MobileLayout title="Waste Collections" showBackButton onBack={() => navigate(-1)}>
      <div className="mobile-wc">
        <div className="mobile-wc-toolbar">
          <input
            className="mobile-wc-search"
            placeholder="Search by barcode / status / color"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="mobile-wc-refresh" onClick={load} disabled={loading} type="button">
            {loading ? '...' : '↻'}
          </button>
        </div>

        {error && <div className="mobile-wc-banner error">{error}</div>}

        <div className="mobile-wc-actions">
          <button
            className="mobile-wc-primary"
            type="button"
            onClick={() => navigate('/mobile/scan')}
          >
            New Collection (Scan)
          </button>
          <button
            className="mobile-wc-secondary"
            type="button"
            onClick={() => navigate('/mobile/waste-entry')}
          >
            Manual Waste Entry
          </button>
        </div>

        <div className="mobile-wc-list">
          {loading && items.length === 0 ? (
            <div className="mobile-wc-empty">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="mobile-wc-empty">No waste collections found.</div>
          ) : (
            filtered.map((x) => (
              <div key={x.id} className="mobile-wc-item">
                <div className="mobile-wc-item-top">
                  <div className="mobile-wc-barcode">{x.barcode}</div>
                  <div className={`mobile-wc-badge ${String(x.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                    {x.status}
                  </div>
                </div>
                <div className="mobile-wc-meta">
                  <div className="mobile-wc-meta-row">
                    <span className="k">Color</span>
                    <span className="v">{x.wasteColor}</span>
                  </div>
                  <div className="mobile-wc-meta-row">
                    <span className="k">Weight</span>
                    <span className="v">{x.weightKg ?? '-'}</span>
                  </div>
                  <div className="mobile-wc-meta-row">
                    <span className="k">Created</span>
                    <span className="v">{formatDate(x.createdOn)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileWasteCollectionsPage;


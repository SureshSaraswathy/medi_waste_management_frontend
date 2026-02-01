import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import CompanyPicker from '../../components/mobile/CompanyPicker';
import './mobileHCFMasterPage.css';

const MobileHCFMasterPage: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [hcfs, setHcfs] = useState<HcfResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await companyService.getAllCompanies(true);
        setCompanies(data);
        if (data.length === 1) setCompanyId(data[0].id);
      } catch (e: any) {
        setError(e?.message || 'Failed to load companies');
      }
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    const loadHcfs = async () => {
      if (!companyId) {
        setHcfs([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await hcfService.getAllHcfs(companyId, true);
        setHcfs(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load HCF list');
      } finally {
        setLoading(false);
      }
    };
    loadHcfs();
  }, [companyId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hcfs;
    return hcfs.filter((h) => {
      return (
        (h.hcfCode || '').toLowerCase().includes(q) ||
        (h.hcfName || '').toLowerCase().includes(q) ||
        (h.district || '').toLowerCase().includes(q) ||
        (h.pincode || '').toLowerCase().includes(q)
      );
    });
  }, [hcfs, query]);

  return (
    <MobileLayout title="HCF Master" showBackButton onBack={() => navigate('/mobile/home')}>
      <div className="mobile-hcf-master">
        <div className="mobile-hcf-toolbar">
          <CompanyPicker
            placeholder="Select Company"
            value={companyId}
            options={companies.map((c) => ({ id: c.id, name: c.companyName }))}
            onChange={setCompanyId}
          />

          <input
            className="mobile-hcf-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search HCF code / name / area / pincode"
          />
        </div>

        {error && <div className="mobile-hcf-empty">{error}</div>}

        <div className="mobile-hcf-table">
          {loading ? (
            <div className="mobile-hcf-empty">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="mobile-hcf-empty">No HCFs found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>HCF Code</th>
                  <th>HCF Name</th>
                  <th>Area</th>
                  <th>PinCode</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr key={h.id}>
                    <td>{h.hcfCode}</td>
                    <td>{h.hcfName}</td>
                    <td>{h.district || h.areaId || '-'}</td>
                    <td>{h.pincode || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileHCFMasterPage;

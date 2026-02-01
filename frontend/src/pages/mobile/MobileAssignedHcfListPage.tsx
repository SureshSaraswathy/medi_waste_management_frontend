import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import { routeHcfService, RouteHcfMappingResponse } from '../../services/routeHcfService';
import CompanyPicker from '../../components/mobile/CompanyPicker';
import './mobileAssignedHcfListPage.css';

type Row = {
  hcfId: string;
  hcfCode: string;
  hcfName: string;
  area: string;
  pincode: string;
  routesCount: number;
};

const MobileAssignedHcfListPage: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

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
    const load = async () => {
      if (!companyId) {
        setRows([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [mappings, hcfs] = await Promise.all([
          routeHcfService.getAllRouteHcfMappings(undefined, undefined, companyId, true),
          hcfService.getAllHcfs(companyId, true),
        ]);

        const routeIdsByHcf = new Map<string, Set<string>>();
        (mappings || []).forEach((m: RouteHcfMappingResponse) => {
          const set = routeIdsByHcf.get(m.hcfId) || new Set<string>();
          set.add(m.routeId);
          routeIdsByHcf.set(m.hcfId, set);
        });

        const assignedIds = new Set(Array.from(routeIdsByHcf.keys()));
        const list = (hcfs || [])
          .filter((h: HcfResponse) => assignedIds.has(h.id))
          .map((h: HcfResponse) => ({
            hcfId: h.id,
            hcfCode: h.hcfCode,
            hcfName: h.hcfName,
            area: h.district || h.areaId || '-',
            pincode: h.pincode || '-',
            routesCount: routeIdsByHcf.get(h.id)?.size || 0,
          }));

        setRows(list);
      } catch (e: any) {
        setError(e?.message || 'Failed to load assigned HCF list');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.hcfCode.toLowerCase().includes(q) ||
        r.hcfName.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        r.pincode.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  return (
    <MobileLayout title="Assigned HCF List" showBackButton onBack={() => navigate(-1)}>
      <div className="mobile-ahcf">
        <div className="mobile-ahcf-toolbar">
          <CompanyPicker
            placeholder="Select Company"
            value={companyId}
            options={companies.map((c) => ({ id: c.id, name: c.companyName }))}
            onChange={setCompanyId}
          />

          <input
            className="mobile-ahcf-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search HCF code / name / area / pincode"
          />
        </div>

        {error && <div className="mobile-ahcf-banner">{error}</div>}

        <div className="mobile-ahcf-table">
          {loading ? (
            <div className="mobile-ahcf-empty">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="mobile-ahcf-empty">No assigned HCFs found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>HCF Code</th>
                  <th>HCF Name</th>
                  <th>Area</th>
                  <th>PinCode</th>
                  <th>Routes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.hcfId}>
                    <td>{r.hcfCode}</td>
                    <td>{r.hcfName}</td>
                    <td>{r.area}</td>
                    <td>{r.pincode}</td>
                    <td>{r.routesCount}</td>
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

export default MobileAssignedHcfListPage;


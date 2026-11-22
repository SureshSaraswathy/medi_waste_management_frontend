import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import AppLayout from '../../../components/layout/AppLayout';
import {
  AuditRow, CompanySummary, CompanyTree, EntitlementApiError, EntitlementNode, RolloutMode, entitlementService,
} from '../../../services/entitlementService';
import './CustomerEntitlementsPage.css';

type Draft = Record<string, boolean>;
const MODES: RolloutMode[] = ['OFF', 'SHADOW', 'ENFORCE'];

const children = (n: EntitlementNode): EntitlementNode[] => n.submodules || n.features || [];
const walk = (n: EntitlementNode, fn: (x: EntitlementNode) => void) => {
  fn(n);
  children(n).forEach((c) => walk(c, fn));
};

const CustomerEntitlementsPage = () => {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [tree, setTree] = useState<CompanyTree | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<'config' | 'audit' | 'rollout'>('config');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [audit, setAudit] = useState<{ rows: AuditRow[]; total: number; page: number } | null>(null);
  const [modes, setModes] = useState<{ mode: RolloutMode; tenantMode: RolloutMode } | null>(null);
  const [shadow, setShadow] = useState<any>(null);

  useEffect(() => {
    entitlementService.companies().then(setCompanies).catch((e) => toast.error(e.message));
    entitlementService.modes().then(setModes).catch(() => undefined);
  }, []);

  const nodes = useMemo(() => {
    const all: EntitlementNode[] = [];
    (tree?.modules || []).forEach((m) => walk(m, (n) => all.push(n)));
    return all;
  }, [tree]);

  const load = useCallback(async (id: string) => {
    if (!id) { setTree(null); return; }
    setLoading(true);
    try {
      const t = await entitlementService.companyTree(id);
      setTree(t);
      const d: Draft = {};
      t.modules.forEach((m) => walk(m, (n) => { if (!n.core) d[n.code] = n.stored === true; }));
      setDraft(d);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async (id: string, page = 1) => {
    try {
      const a = await entitlementService.audit(id, page, 25);
      setAudit({ rows: a.rows, total: a.total, page: a.page });
    } catch (e: any) {
      toast.error(e.message);
    }
  }, []);

  useEffect(() => { void load(companyId); setAudit(null); }, [companyId, load]);
  useEffect(() => { if (tab === 'audit' && companyId) void loadAudit(companyId); }, [tab, companyId, loadAudit]);
  useEffect(() => {
    if (tab === 'rollout') entitlementService.shadowReport(14).then(setShadow).catch(() => setShadow(null));
  }, [tab]);

  const changes = useMemo(
    () => nodes.filter((n) => !n.core && (n.stored === null || draft[n.code] !== n.stored))
      .map((n) => ({ code: n.code, name: n.name, from: n.stored, to: draft[n.code] === true })),
    [nodes, draft],
  );
  const realChanges = changes.filter((c) => c.from !== c.to);

  const setMany = (root: EntitlementNode, value: boolean) => {
    setDraft((d) => { const next = { ...d }; walk(root, (n) => { if (!n.core) next[n.code] = value; }); return next; });
  };
  const setAll = (value: boolean) => (tree?.modules || []).forEach((m) => setMany(m, value));

  const save = async () => {
    if (!tree || !companyId) return;
    setSaving(true);
    try {
      const r = await entitlementService.save(companyId, changes.map((c) => ({ code: c.code, enabled: c.to })), tree.version, reason);
      toast.success(r.changed ? `Saved ${r.changed} change(s)` : 'No changes to save');
      setConfirming(false);
      setReason('');
      await load(companyId);
    } catch (e: any) {
      if (e instanceof EntitlementApiError && e.status === 409) {
        toast.error('Another SuperAdmin changed this customer. Reloaded the latest settings, please review and save again.');
        setConfirming(false);
        await load(companyId);
      } else toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const changeMode = async (key: 'mode' | 'tenantMode', value: RolloutMode) => {
    if (value === 'ENFORCE' && !window.confirm(`Switch ${key === 'mode' ? 'licensing' : 'tenant isolation'} to ENFORCE? Customers will be blocked from disabled features.`)) return;
    try { setModes(await entitlementService.setModes({ [key]: value })); toast.success('Rollout mode updated'); } catch (e: any) { toast.error(e.message); }
  };

  const match = (n: EntitlementNode): boolean => !filter || n.name.toLowerCase().includes(filter.toLowerCase()) || n.code.toLowerCase().includes(filter.toLowerCase()) || children(n).some(match);

  const renderNode = (n: EntitlementNode, parentOn: boolean, depth: number): JSX.Element | null => {
    if (!match(n)) return null;
    const on = n.core ? true : draft[n.code] === true;
    const kids = children(n);
    const expanded = !!filter || open[n.code];
    const dirty = !n.core && n.stored !== null && draft[n.code] !== n.stored;
    return (
      <div key={n.code} className="ce-node" style={{ marginLeft: depth * 18 }}>
        <div className={`ce-row${dirty ? ' ce-dirty' : ''}`}>
          {kids.length ? (
            <button type="button" className="ce-exp" onClick={() => setOpen((o) => ({ ...o, [n.code]: !o[n.code] }))}>{expanded ? '▾' : '▸'}</button>
          ) : <span className="ce-exp" />}
          <label className="ce-toggle">
            <input type="checkbox" checked={on} disabled={n.core} onChange={(e) => setDraft((d) => ({ ...d, [n.code]: e.target.checked }))} />
            <span>{n.name}</span>
          </label>
          {n.core && <span className="ce-badge ce-core">Core (always on)</span>}
          {n.isNew && <span className="ce-badge ce-new">NEW</span>}
          <span className={`ce-badge ${on && parentOn ? 'ce-active' : 'ce-inactive'}`}>
            {on && parentOn ? 'Active' : on ? 'Inactive (parent off)' : 'Inactive'}
          </span>
          {kids.length > 0 && !n.core && (
            <span className="ce-bulk">
              <button type="button" onClick={() => setMany(n, true)}>Enable all</button>
              <button type="button" onClick={() => setMany(n, false)}>Disable all</button>
            </span>
          )}
        </div>
        {expanded && kids.map((k) => renderNode(k, parentOn && on, depth + 1))}
      </div>
    );
  };

  return (
    <AppLayout pageTitle="Customer Entitlements" pageSubtitle="Control which modules, submodules and features each customer can use">
      <div className="ce-page">
        <div className="ce-top">
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Customer">
            <option value="">Select a customer…</option>
            {companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>)}
          </select>
          <div className="ce-tabs">
            <button className={tab === 'config' ? 'on' : ''} onClick={() => setTab('config')}>Configuration</button>
            <button className={tab === 'audit' ? 'on' : ''} onClick={() => setTab('audit')} disabled={!companyId}>Audit history</button>
            <button className={tab === 'rollout' ? 'on' : ''} onClick={() => setTab('rollout')}>Rollout</button>
          </div>
        </div>

        {tab === 'config' && !companyId && <p className="ce-hint">Choose a customer to view and change what they can use.</p>}
        {tab === 'config' && companyId && loading && <p className="ce-hint">Loading…</p>}
        {tab === 'config' && tree && !loading && (
          <>
            <div className="ce-summary">
              <span>{tree.totals.effective} of {tree.totals.items} items active</span>
              {tree.totals.newItems > 0 && <span className="ce-badge ce-new">{tree.totals.newItems} NEW</span>}
              <input placeholder="Filter modules, submodules, features…" value={filter} onChange={(e) => setFilter(e.target.value)} />
              <button onClick={() => setAll(true)}>Enable all</button>
              <button onClick={() => setAll(false)}>Disable all</button>
            </div>
            <p className="ce-hint">Turning a parent off hides it for the customer but keeps every child setting, so turning it back on restores them. Nothing is ever deleted.</p>
            <div className="ce-tree">{tree.modules.map((m) => renderNode(m, true, 0))}</div>
            <div className="ce-savebar">
              <span>{realChanges.length} unsaved change(s)</span>
              <button onClick={() => load(companyId)} disabled={saving}>Discard</button>
              <button className="primary" onClick={() => setConfirming(true)} disabled={saving || changes.length === 0}>Save…</button>
            </div>
          </>
        )}

        {tab === 'audit' && audit && (
          <div className="ce-audit">
            <table>
              <thead><tr><th>When</th><th>User</th><th>Item</th><th>Old</th><th>New</th><th>Action</th><th>Reason</th></tr></thead>
              <tbody>
                {audit.rows.map((r) => (
                  <tr key={r.audit_id}>
                    <td>{new Date(r.changed_on).toLocaleString()}</td><td>{r.changed_by_name || r.changed_by || '—'}</td>
                    <td>{r.entity_code}</td><td>{r.old_value === null ? '—' : r.old_value ? 'Enabled' : 'Disabled'}</td>
                    <td>{r.new_value ? 'Enabled' : 'Disabled'}</td><td>{r.action}</td><td>{r.reason || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ce-pager">
              <button disabled={audit.page <= 1} onClick={() => loadAudit(companyId, audit.page - 1)}>Prev</button>
              <span>Page {audit.page} · {audit.total} records</span>
              <button disabled={audit.page * 25 >= audit.total} onClick={() => loadAudit(companyId, audit.page + 1)}>Next</button>
            </div>
          </div>
        )}

        {tab === 'rollout' && (
          <div className="ce-rollout">
            <p className="ce-hint">OFF = no effect. SHADOW = log what would be blocked, block nothing. ENFORCE = block. Use SHADOW for 14 days in production, review the report, then ask for approval before ENFORCE.</p>
            {modes && (['mode', 'tenantMode'] as const).map((k) => (
              <div key={k} className="ce-modeRow">
                <strong>{k === 'mode' ? 'Licensing (module/feature access)' : 'Tenant isolation (customer data)'}</strong>
                {MODES.map((m) => <button key={m} className={modes[k] === m ? 'on' : ''} onClick={() => changeMode(k, m)}>{m}</button>)}
              </div>
            ))}
            {shadow && <pre className="ce-shadow">{JSON.stringify(shadow, null, 2)}</pre>}
          </div>
        )}

        {confirming && (
          <div className="ce-modal" role="dialog" aria-modal="true">
            <div className="ce-dialog">
              <h3>Confirm changes for {String(tree?.company?.company_name || '')}</h3>
              <ul>
                {realChanges.slice(0, 40).map((c) => <li key={c.code}>{c.name}: {c.from === null ? 'new' : c.from ? 'Enabled' : 'Disabled'} → <b>{c.to ? 'Enabled' : 'Disabled'}</b></li>)}
                {realChanges.length > 40 && <li>…and {realChanges.length - 40} more</li>}
                {realChanges.length === 0 && <li>No on/off changes; new items will be recorded as configured.</li>}
              </ul>
              <textarea placeholder="Reason (optional, stored in the audit history)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="ce-dialogBtns">
                <button onClick={() => setConfirming(false)} disabled={saving}>Cancel</button>
                <button className="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Confirm & save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CustomerEntitlementsPage;

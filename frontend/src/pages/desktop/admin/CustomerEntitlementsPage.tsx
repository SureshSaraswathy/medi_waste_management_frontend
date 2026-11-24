import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import AppLayout from '../../../components/layout/AppLayout';
import PageHeader from '../../../components/layout/PageHeader';
import {
  AuditRow, CompanySummary, CompanyTree, EntitlementApiError, EntitlementNode, RolloutMode, entitlementService,
} from '../../../services/entitlementService';
import './CustomerEntitlementsPage.css';

type Draft = Record<string, boolean>;
const MODES: RolloutMode[] = ['OFF', 'SHADOW', 'ENFORCE'];
const MODE_HELP: Record<RolloutMode, string> = {
  OFF: 'No effect. Nothing is logged or blocked.',
  SHADOW: 'Logs what would be blocked, blocks nothing.',
  ENFORCE: 'Blocks customers from disabled items.',
};

const children = (n: EntitlementNode): EntitlementNode[] => n.submodules || n.features || [];
const walk = (n: EntitlementNode, fn: (x: EntitlementNode) => void) => {
  fn(n);
  children(n).forEach((c) => walk(c, fn));
};

/** Small inline icons (no extra dependency). */
const Icon = ({ name }: { name: 'shield' | 'search' | 'module' | 'submodule' | 'feature' | 'lock' | 'chevron' | 'users' | 'check' | 'ban' | 'grid' | 'list' }) => {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (name) {
    case 'shield': return <svg {...p}><path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5l8-3z" /><path d="M9 12l2 2 4-4" /></svg>;
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>;
    case 'module': return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case 'submodule': return <svg {...p}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>;
    case 'feature': return <svg {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>;
    case 'lock': return <svg {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>;
    case 'chevron': return <svg {...p}><path d="M9 6l6 6-6 6" /></svg>;
    case 'users': return <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M21 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8" /></svg>;
    case 'check': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>;
    case 'ban': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>;
    case 'grid': return <svg {...p}><path d="M3 3h18v18H3z" /><path d="M3 9h18M9 21V9" /></svg>;
    default: return <svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
  }
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
  // Which customer is selected RIGHT NOW, and a counter per kind of request: an answer that arrives after the user switched customer
  // (or after a newer request) is ignored, so one customer's entitlements can never be shown under another customer.
  const selectedRef = useRef('');
  const treeSeq = useRef(0);
  const auditSeq = useRef(0);
  selectedRef.current = companyId;

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
    const mine = ++treeSeq.current;
    if (!id) { setTree(null); return; }
    setLoading(true);
    try {
      const t = await entitlementService.companyTree(id);
      if (mine !== treeSeq.current || id !== selectedRef.current) return; // stale answer: another customer / a newer load took over
      setTree(t);
      const d: Draft = {};
      t.modules.forEach((m) => walk(m, (n) => { if (!n.core) d[n.code] = n.stored === true; }));
      setDraft(d);
    } catch (e: any) {
      if (mine === treeSeq.current) toast.error(e.message);
    } finally {
      if (mine === treeSeq.current) setLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async (id: string, page = 1) => {
    const mine = ++auditSeq.current;
    try {
      const a = await entitlementService.audit(id, page, 25);
      if (mine !== auditSeq.current || id !== selectedRef.current) return;
      setAudit({ rows: a.rows, total: a.total, page: a.page });
    } catch (e: any) {
      if (mine === auditSeq.current) toast.error(e.message);
    }
  }, []);

  useEffect(() => { setTree(null); setDraft({}); setAudit(null); void load(companyId); }, [companyId, load]);
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

  // ---- display-only figures for the summary cards -------------------------------------------------------------
  // Saved figures come straight from the API (tree.totals / node.effective). While there are unsaved edits the cards
  // show the saved figure plus the effect of the edits, computed with the same rule the list uses (on AND parent on).
  const countActive = useCallback((d: Draft) => {
    let items = 0; let active = 0; let modulesActive = 0;
    const rec = (n: EntitlementNode, parentOn: boolean) => {
      const on = n.core ? true : d[n.code] === true;
      const eff = on && parentOn;
      items += 1;
      if (eff) active += 1;
      if (n.type === 'MODULE' && eff) modulesActive += 1;
      children(n).forEach((c) => rec(c, eff));
    };
    (tree?.modules || []).forEach((m) => rec(m, true));
    return { items, active, modulesActive };
  }, [tree]);

  const figures = useMemo(() => {
    if (!tree) return null;
    const baseDraft: Draft = {};
    nodes.forEach((n) => { if (!n.core) baseDraft[n.code] = n.stored === true; });
    const base = countActive(baseDraft);
    const live = countActive(draft);
    const savedModulesActive = tree.modules.filter((m) => m.effective).length;
    const active = Math.max(0, Math.min(tree.totals.items, tree.totals.effective + (live.active - base.active)));
    const modulesActive = Math.max(0, Math.min(tree.modules.length, savedModulesActive + (live.modulesActive - base.modulesActive)));
    return { total: tree.totals.items, active, disabled: tree.totals.items - active, modulesActive, modules: tree.modules.length };
  }, [tree, nodes, draft, countActive]);

  const toEnable = realChanges.filter((c) => c.to).length;
  const toDisable = realChanges.length - toEnable;
  const expandAll = () => setOpen(Object.fromEntries(nodes.filter((n) => children(n).length > 0).map((n) => [n.code, true])));
  const collapseAll = () => setOpen({});
  const selectedCompany = companies.find((c) => c.companyId === companyId);

  const renderNode = (n: EntitlementNode, parentOn: boolean, depth: number): JSX.Element | null => {
    if (!match(n)) return null;
    const on = n.core ? true : draft[n.code] === true;
    const kids = children(n);
    const expanded = !!filter || open[n.code];
    const dirty = !n.core && n.stored !== null && draft[n.code] !== n.stored;
    const effective = on && parentOn;
    const state = n.core ? 'core' : effective ? 'active' : 'disabled';
    const kind = n.type === 'MODULE' ? 'module' : n.type === 'SUBMODULE' ? 'submodule' : 'feature';
    return (
      <div key={n.code} className={`ce-node ce-depth-${Math.min(depth, 2)}`}>
        <div className={`ce-row ce-${state}${dirty ? ' ce-dirty' : ''}`}>
          {kids.length ? (
            <button type="button" className="ce-exp" aria-expanded={!!expanded} aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => setOpen((o) => ({ ...o, [n.code]: !o[n.code] }))}>{expanded ? '▾' : '▸'}</button>
          ) : <span className="ce-exp" />}
          <span className={`ce-kind ce-kind-${kind}`}><Icon name={kind} /></span>
          <label className="ce-toggle">
            <input type="checkbox" checked={on} disabled={n.core} onChange={(e) => setDraft((d) => ({ ...d, [n.code]: e.target.checked }))} aria-label={`${n.name} enabled`} />
            <span className="ce-switch" aria-hidden="true" />
            <span className="ce-name">
              <span className="ce-title">{n.name}</span>
              <span className="ce-sub">{n.code}{kids.length > 0 ? ` · ${kids.length} ${n.type === 'MODULE' ? 'submodule' : 'feature'}${kids.length === 1 ? '' : 's'}` : ''}</span>
            </span>
          </label>
          <span className="ce-badges">
            {n.core && <span className="ce-badge ce-core"><Icon name="lock" />Core (always on)</span>}
            {n.isNew && <span className="ce-badge ce-new">NEW</span>}
            {dirty && <span className="ce-badge ce-changed">Unsaved</span>}
            {!n.core && (
              <span className={`ce-badge ${effective ? 'ce-active' : on ? 'ce-parentoff' : 'ce-inactive'}`}>
                {effective ? 'Active' : on ? 'Inactive (parent off)' : 'Disabled'}
              </span>
            )}
          </span>
          {kids.length > 0 && !n.core && (
            <span className="ce-bulk">
              <button type="button" className="ce-btn ce-btn-enable ce-sm" onClick={() => setMany(n, true)}>Enable all</button>
              <button type="button" className="ce-btn ce-btn-disable ce-sm" onClick={() => setMany(n, false)}>Disable all</button>
            </span>
          )}
        </div>
        {expanded && kids.length > 0 && <div className="ce-children">{kids.map((k) => renderNode(k, parentOn && on, depth + 1))}</div>}
      </div>
    );
  };

  const modeBadge = (m: RolloutMode) => <span className={`ce-pill ce-pill-${m.toLowerCase()}`}>{m}</span>;

  return (
    <AppLayout>
      {/* Shared header; `report-page-header` is the existing shared alignment class for the standard 64px header. */}
      <PageHeader title="Customer Entitlements" subtitle="Control which modules, submodules and features each customer can use" className="report-page-header" />
      <div className="ce-page">
        <section className="ce-hero">
          <span className="ce-hero-icon"><Icon name="shield" /></span>
          <div className="ce-hero-text">
            <h2>Customer Entitlements</h2>
            <p>Decide which modules, submodules and features each customer company can use. Changes are recorded in the audit history.</p>
          </div>
          {modes && (
            <div className="ce-hero-modes" aria-label="Current rollout modes">
              <span>Licensing {modeBadge(modes.mode)}</span>
              <span>Tenant isolation {modeBadge(modes.tenantMode)}</span>
            </div>
          )}
        </section>

        <div className="ce-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'config'} className={tab === 'config' ? 'on' : ''} onClick={() => setTab('config')}>Configuration</button>
          <button role="tab" aria-selected={tab === 'audit'} className={tab === 'audit' ? 'on' : ''} onClick={() => setTab('audit')} disabled={!companyId}>Audit History</button>
          <button role="tab" aria-selected={tab === 'rollout'} className={tab === 'rollout' ? 'on' : ''} onClick={() => setTab('rollout')}>Rollout</button>
        </div>

        <section className="ce-toolbar">
          <label className="ce-field ce-field-customer">
            <span className="ce-label"><Icon name="users" />Customer</span>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Customer">
              <option value="">Select a customer…</option>
              {companies.map((c) => <option key={c.companyId} value={c.companyId}>{c.companyName} ({c.companyCode})</option>)}
            </select>
          </label>
          <label className="ce-field ce-field-search">
            <span className="ce-label"><Icon name="search" />Search</span>
            <input type="search" placeholder="Search modules, submodules, features…" value={filter} onChange={(e) => setFilter(e.target.value)} disabled={tab !== 'config' || !tree} aria-label="Search entitlements" />
          </label>
          {selectedCompany && <span className="ce-company-chip" title={selectedCompany.companyId}>{selectedCompany.companyCode}</span>}
        </section>

        {tab === 'config' && !companyId && (
          <div className="ce-empty">
            <span className="ce-empty-icon"><Icon name="users" /></span>
            <p className="ce-hint">Choose a customer to view and change what they can use.</p>
          </div>
        )}
        {tab === 'config' && companyId && loading && <p className="ce-hint ce-loading">Loading…</p>}
        {tab === 'config' && tree && !loading && figures && (
          <>
            <div className="ce-cards">
              <div className="ce-card ce-card-total"><span className="ce-card-icon"><Icon name="list" /></span><div><span className="ce-card-label">Total items</span><strong>{figures.total}</strong><span className="ce-card-sub">modules, submodules and features</span></div></div>
              <div className="ce-card ce-card-active"><span className="ce-card-icon"><Icon name="check" /></span><div><span className="ce-card-label">Active items</span><strong>{figures.active}</strong><span className="ce-card-sub">{figures.total ? Math.round((figures.active / figures.total) * 100) : 0}% of all items</span><span className="ce-meter" aria-hidden="true"><i style={{ width: `${figures.total ? Math.round((figures.active / figures.total) * 100) : 0}%` }} /></span></div></div>
              <div className="ce-card ce-card-disabled"><span className="ce-card-icon"><Icon name="ban" /></span><div><span className="ce-card-label">Disabled items</span><strong>{figures.disabled}</strong><span className="ce-card-sub">{figures.disabled === 0 ? 'nothing switched off' : 'not available to the customer'}</span></div></div>
              <div className="ce-card ce-card-modules"><span className="ce-card-icon"><Icon name="grid" /></span><div><span className="ce-card-label">Modules</span><strong>{figures.modulesActive}<small> / {figures.modules}</small></strong><span className="ce-card-sub">modules enabled</span></div></div>
            </div>

            <div className="ce-listbar">
              <span className="ce-summary">
                {tree.totals.effective} of {tree.totals.items} items active<span className="ce-saved-note">saved</span>
                {tree.totals.newItems > 0 && <span className="ce-badge ce-new">{tree.totals.newItems} NEW</span>}
              </span>
              <span className="ce-listbar-actions">
                <button type="button" className="ce-btn ce-btn-ghost" onClick={expandAll}>Expand all</button>
                <button type="button" className="ce-btn ce-btn-ghost" onClick={collapseAll}>Collapse all</button>
                <button type="button" className="ce-btn ce-btn-enable" onClick={() => setAll(true)}>Enable all</button>
                <button type="button" className="ce-btn ce-btn-disable" onClick={() => setAll(false)}>Disable all</button>
              </span>
            </div>
            <p className="ce-hint">Turning a parent off hides it for the customer but keeps every child setting, so turning it back on restores them. Nothing is ever deleted.</p>
            <div className="ce-tree">{tree.modules.map((m) => renderNode(m, true, 0))}</div>
            <div className={`ce-savebar${realChanges.length ? ' ce-savebar-dirty' : ''}`}>
              <span className="ce-savebar-info">
                <span className="ce-dot" aria-hidden="true" />
                <strong>{realChanges.length} unsaved change{realChanges.length === 1 ? '' : 's'}</strong>
                {realChanges.length > 0 && <span className="ce-savebar-detail"><span className="ce-up">{toEnable} to enable</span> · <span className="ce-down">{toDisable} to disable</span></span>}
              </span>
              <button type="button" className="ce-btn ce-btn-ghost" onClick={() => load(companyId)} disabled={saving}>Discard</button>
              <button type="button" className="ce-btn ce-btn-primary" onClick={() => setConfirming(true)} disabled={saving || changes.length === 0}>Save Changes</button>
            </div>
          </>
        )}

        {tab === 'audit' && audit && (
          <div className="ce-audit ce-panel">
            <div className="ce-tablewrap">
              <table>
                <thead><tr><th>When</th><th>User</th><th>Item</th><th>Old</th><th>New</th><th>Action</th><th>Reason</th></tr></thead>
                <tbody>
                  {audit.rows.map((r) => (
                    <tr key={r.auditId}>
                      <td>{new Date(r.changedOn).toLocaleString()}</td><td>{r.changedByName || r.changedBy || '—'}</td>
                      <td><code>{r.entityCode}</code></td>
                      <td>{r.oldValue === null ? '—' : <span className={`ce-badge ${r.oldValue ? 'ce-active' : 'ce-inactive'}`}>{r.oldValue ? 'Enabled' : 'Disabled'}</span>}</td>
                      <td><span className={`ce-badge ${r.newValue ? 'ce-active' : 'ce-inactive'}`}>{r.newValue ? 'Enabled' : 'Disabled'}</span></td>
                      <td><span className="ce-badge ce-action">{r.action}</span></td><td>{r.reason || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ce-pager">
              <button type="button" className="ce-btn ce-btn-ghost" disabled={audit.page <= 1} onClick={() => loadAudit(companyId, audit.page - 1)}>Prev</button>
              <span>Page {audit.page} · {audit.total} records</span>
              <button type="button" className="ce-btn ce-btn-ghost" disabled={audit.page * 25 >= audit.total} onClick={() => loadAudit(companyId, audit.page + 1)}>Next</button>
            </div>
          </div>
        )}

        {tab === 'rollout' && (
          <div className="ce-rollout">
            <p className="ce-hint">OFF = no effect. SHADOW = log what would be blocked, block nothing. ENFORCE = block. Use SHADOW for 14 days in production, review the report, then ask for approval before ENFORCE.</p>
            <div className="ce-modegrid">
              {modes && (['mode', 'tenantMode'] as const).map((k) => (
                <div key={k} className="ce-modeRow ce-panel">
                  <strong>{k === 'mode' ? 'Licensing (module/feature access)' : 'Tenant isolation (customer data)'}</strong>
                  <span className="ce-modeHelp">{MODE_HELP[modes[k]]}</span>
                  <span className="ce-segment">
                    {MODES.map((m) => <button type="button" key={m} className={`${modes[k] === m ? 'on' : ''} ce-seg-${m.toLowerCase()}`} onClick={() => changeMode(k, m)}>{m}</button>)}
                  </span>
                </div>
              ))}
            </div>
            {shadow && (
              <div className="ce-panel">
                <div className="ce-cards ce-cards-small">
                  <div className="ce-card"><div><span className="ce-card-label">Days observed</span><strong>{shadow.daysObserved ?? 0}</strong></div></div>
                  <div className="ce-card"><div><span className="ce-card-label">Endpoints exercised</span><strong>{shadow.coverage?.exercised ?? 0}<small> / {shadow.coverage?.total ?? 0}</small></strong></div></div>
                  <div className="ce-card"><div><span className="ce-card-label">Would-be refusals</span><strong>{Array.isArray(shadow.byReason) ? shadow.byReason.reduce((a: number, r: any) => a + (Number(r.hits) || 0), 0) : 0}</strong></div></div>
                </div>
                <pre className="ce-shadow">{JSON.stringify(shadow, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {confirming && (
          <div className="ce-modal" role="dialog" aria-modal="true">
            <div className="ce-dialog">
              <h3>Confirm changes for {String(tree?.company?.companyName || '')}</h3>
              <ul>
                {realChanges.slice(0, 40).map((c) => <li key={c.code}>{c.name}: {c.from === null ? 'new' : c.from ? 'Enabled' : 'Disabled'} → <b className={c.to ? 'ce-up' : 'ce-down'}>{c.to ? 'Enabled' : 'Disabled'}</b></li>)}
                {realChanges.length > 40 && <li>…and {realChanges.length - 40} more</li>}
                {realChanges.length === 0 && <li>No on/off changes; new items will be recorded as configured.</li>}
              </ul>
              <textarea placeholder="Reason (optional, stored in the audit history)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="ce-dialogBtns">
                <button type="button" className="ce-btn ce-btn-ghost" onClick={() => setConfirming(false)} disabled={saving}>Cancel</button>
                <button type="button" className="ce-btn ce-btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Confirm & save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CustomerEntitlementsPage;

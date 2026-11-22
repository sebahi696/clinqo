import { ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ModuleToggles, PresetPicker } from '../../components/ModuleMatrix';
import { Badge, Card, Field, PageHeader, Stat, Tabs, Toggle } from '../../components/ui';
import { campaignFunnels, sumFunnels } from '../../lib/metrics';
import { PRESETS, ROLE_LABEL } from '../../lib/modules';
import type { MarketingPlan, Role, Tenant } from '../../lib/types';
import { cx, fmtDate, num, uid, usd } from '../../lib/utils';
import { useDB } from '../../store/db';
import { statusStyle } from './Overview';

type TabKey = 'overview' | 'features' | 'channels' | 'plan' | 'users';
const PHASES: MarketingPlan['phase'][] = ['plan', 'configuration', 'ad_spend', 'optimizing'];
const PHASE_LABEL = { plan: '1 · Marketing plan', configuration: '2 · Configuration', ad_spend: '3 · Ad spend', optimizing: '4 · Optimizing' };

export default function TenantDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TabKey) ?? 'overview';
  const db = useDB();
  const nav = useNavigate();
  const t = db.tenants.find((x) => x.id === id);
  if (!t) return <p className="text-ink-500">Tenant not found.</p>;
  const f = sumFunnels(campaignFunnels(db, t.id));
  const counts = {
    patients: db.patients.filter((p) => p.tenantId === t.id).length,
    appts: db.appointments.filter((a) => a.tenantId === t.id).length,
    revenue: db.invoices.filter((i) => i.tenantId === t.id).reduce((s, i) => s + i.total, 0),
    users: db.users.filter((u) => u.tenantId === t.id).length,
  };

  return (
    <>
      <PageHeader
        title={t.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge className={statusStyle[t.status]}>{t.status}</Badge>
            {t.vertical} · {t.city} · {PRESETS[t.plan].label} · {usd(t.monthlyFeeUSD)}/mo
          </span>
        }
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              db.openTenant(t.id);
              nav('/app');
            }}
          >
            <ExternalLink size={15} /> Open as tenant
          </button>
        }
      />
      <Tabs<TabKey>
        value={tab}
        onChange={(k) => setParams({ tab: k })}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'features', label: 'Features & plan' },
          { key: 'channels', label: 'Meta & channels' },
          { key: 'plan', label: 'Marketing plan' },
          { key: 'users', label: 'Users' },
        ]}
      />
      {tab === 'overview' && <OverviewTab t={t} counts={counts} f={f} />}
      {tab === 'features' && (
        <div className="space-y-6">
          <Card title="Plan preset" actions={t.hasOwnAgency ? <Badge className="bg-amber-50 text-amber-700 ring-amber-200">Client has own agency</Badge> : undefined}>
            <PresetPicker value={t.plan} onPick={(p) => db.applyPreset(t.id, p)} />
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <Field label="Monthly fee (USD)" className="w-40">
                <input className="input" type="number" value={t.monthlyFeeUSD} onChange={(e) => db.updateTenant(t.id, { monthlyFeeUSD: +e.target.value })} />
              </Field>
              <Field label="Max users" className="w-28">
                <input className="input" type="number" value={t.limits.users} onChange={(e) => db.updateTenant(t.id, { limits: { ...t.limits, users: +e.target.value } })} />
              </Field>
              <Field label="Max branches" className="w-28">
                <input className="input" type="number" value={t.limits.branches} onChange={(e) => db.updateTenant(t.id, { limits: { ...t.limits, branches: +e.target.value } })} />
              </Field>
            </div>
          </Card>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-ink-800">Modules for this tenant</h3>
            <p className="mb-3 text-xs text-ink-500">Changes apply instantly. Disabled modules disappear from the tenant's menu and their pages are blocked.</p>
            <ModuleToggles modules={t.modules} onToggle={(k) => db.toggleModule(t.id, k)} />
          </div>
        </div>
      )}
      {tab === 'channels' && <ChannelsTab t={t} />}
      {tab === 'plan' && <PlanTab t={t} />}
      {tab === 'users' && <UsersTab t={t} />}
    </>
  );
}

function OverviewTab({ t, counts, f }: { t: Tenant; counts: { patients: number; appts: number; revenue: number; users: number }; f: ReturnType<typeof sumFunnels> }) {
  const update = useDB((s) => s.updateTenant);
  const activity = useDB((s) => s.activity.filter((a) => a.tenantId === t.id).slice(0, 6));
  const set = (k: keyof Tenant) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => update(t.id, { [k]: e.target.value } as Partial<Tenant>);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Patients / clients" value={num(counts.patients)} />
        <Stat label="Appointments" value={num(counts.appts)} />
        <Stat label="Revenue through POS" value={usd(counts.revenue)} tone="brand" />
        <Stat label="Ad ROAS" value={t.modules.marketing && f.spend ? `${f.roas.toFixed(1)}×` : '—'} hint={t.modules.marketing ? `${usd(f.spend)} spend · ${f.leads} leads` : 'Marketing off'} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name">
              <input className="input" value={t.name} onChange={set('name')} />
            </Field>
            <Field label="Status">
              <select className="input" value={t.status} onChange={set('status')}>
                <option value="onboarding">Onboarding</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </Field>
            <Field label="Owner">
              <input className="input" value={t.ownerName} onChange={set('ownerName')} />
            </Field>
            <Field label="Owner email">
              <input className="input" value={t.ownerEmail} onChange={set('ownerEmail')} />
            </Field>
            <Field label="Phone">
              <input className="input" value={t.phone} onChange={set('phone')} />
            </Field>
            <Field label="City">
              <input className="input" value={t.city} onChange={set('city')} />
            </Field>
            <Field label="Business model notes" className="sm:col-span-2">
              <textarea className="input min-h-[80px]" value={t.businessModel} onChange={set('businessModel')} />
            </Field>
          </div>
        </Card>
        <Card title="Tenant activity">
          {activity.length ? (
            <ul className="space-y-3 text-sm">
              {activity.map((a) => (
                <li key={a.id}>
                  <div className="text-ink-700">{a.text}</div>
                  <div className="text-xs text-ink-400">
                    {a.actor} · {fmtDate(a.at)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-400">No activity yet.</p>
          )}
          <p className="mt-4 border-t border-ink-50 pt-3 text-xs text-ink-400">Created {fmtDate(t.createdAt)} · {counts.users} users</p>
        </Card>
      </div>
    </div>
  );
}

function ChannelsTab({ t }: { t: Tenant }) {
  const { meta, tenants, updateTenant, log } = useDB();
  const used = new Map(tenants.filter((x) => x.metaAdAccountId && x.id !== t.id).map((x) => [x.metaAdAccountId!, x.name]));
  const campaigns = useDB((s) => s.campaigns.filter((c) => c.tenantId === t.id));
  return (
    <div className="space-y-6">
      {!t.modules.marketing && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          The Marketing module is off for this tenant{t.hasOwnAgency ? ' (they work with their own agency)' : ''}. You can still connect WhatsApp and Instagram for the inbox.
        </div>
      )}
      <Card title="Meta ad account">
        {!meta.connected ? (
          <p className="text-sm text-ink-500">
            Connect the Clinqo Business Manager first in <Link className="text-brand-700 underline" to="/admin/meta">Meta ad accounts</Link>.
          </p>
        ) : (
          <div className="max-w-lg">
            <Field label={`Ad account from ${meta.businessName}`}>
              <select
                className="input"
                disabled={!t.modules.marketing}
                value={t.metaAdAccountId ?? ''}
                onChange={(e) => {
                  updateTenant(t.id, { metaAdAccountId: e.target.value || undefined });
                  log(`Assigned ad account ${e.target.value || 'none'} to ${t.name}`, t.id);
                }}
              >
                <option value="">— not assigned —</option>
                {meta.adAccounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={used.has(a.id)}>
                    {a.name} · {a.id}
                    {used.has(a.id) ? ` (used by ${used.get(a.id)})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <p className="mt-2 text-xs text-ink-500">Campaign spend from this account is synced daily into the tenant's Marketing dashboard and Finance as an expense.</p>
          </div>
        )}
        {campaigns.length > 0 && (
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="th ps-0">Campaign</th>
                <th className="th">Status</th>
                <th className="th text-end">Daily</th>
                <th className="th text-end">Spend</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-ink-50">
                  <td className="py-2">{c.name}</td>
                  <td className="td">
                    <Badge className={c.status === 'ACTIVE' ? 'bg-brand-50 text-brand-700 ring-brand-200' : undefined}>{c.status}</Badge>
                  </td>
                  <td className="td text-end">{usd(c.dailyBudget)}</td>
                  <td className="td text-end">{usd(c.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Messaging channels">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp Business API number">
            <input className="input" value={t.whatsappNumber ?? ''} onChange={(e) => updateTenant(t.id, { whatsappNumber: e.target.value })} />
          </Field>
          <Field label="Instagram account">
            <input className="input" value={t.instagramHandle ?? ''} onChange={(e) => updateTenant(t.id, { instagramHandle: e.target.value })} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-ink-400">Test build: messages are simulated. Live build connects through the WhatsApp Cloud API and Instagram Graph API.</p>
      </Card>
    </div>
  );
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [v, setV] = useState('');
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-xs text-ink-700">
            {x}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (v.trim()) onChange([...items, v.trim()]);
          setV('');
        }}
      >
        <input className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder="Add…" />
        <button className="btn-secondary">
          <Plus size={14} />
        </button>
      </form>
    </div>
  );
}

function PlanTab({ t }: { t: Tenant }) {
  const plan = useDB((s) => s.plans.find((p) => p.tenantId === t.id));
  const { log } = useDB.getState();
  const save = (data: Partial<MarketingPlan>) =>
    useDB.setState((s) => ({
      plans: s.plans.some((p) => p.tenantId === t.id)
        ? s.plans.map((p) => (p.tenantId === t.id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p))
        : [...s.plans, { tenantId: t.id, goal: '', monthlyBudget: 300, targetCPL: 6, targetBookings: 20, offers: [], audiences: [], channels: [], approvedByClient: false, phase: 'plan', updatedAt: new Date().toISOString(), ...data }],
    }));
  if (!t.modules.marketing)
    return <div className="card p-6 text-sm text-ink-500">Marketing is off for this tenant. Turn it on under Features to build a growth plan.</div>;
  if (!plan)
    return (
      <div className="card p-6">
        <button className="btn-primary" onClick={() => save({})}>
          Start marketing plan
        </button>
      </div>
    );
  const idx = PHASES.indexOf(plan.phase);
  return (
    <div className="space-y-6">
      <Card title="Growth phase">
        <div className="grid gap-2 sm:grid-cols-4">
          {PHASES.map((ph, i) => (
            <button
              key={ph}
              onClick={() => {
                save({ phase: ph });
                log(`${t.name} moved to phase: ${PHASE_LABEL[ph]}`, t.id);
              }}
              className={cx('rounded-lg border px-3 py-2.5 text-start text-sm', i === idx ? 'border-brand-500 bg-brand-50 font-semibold text-brand-800' : i < idx ? 'border-brand-200 text-brand-700' : 'border-ink-100 text-ink-500')}
            >
              {PHASE_LABEL[ph]}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <Toggle on={plan.approvedByClient} onChange={() => save({ approvedByClient: !plan.approvedByClient })} />
          <span className="text-ink-700">Client approved the plan</span>
          {!plan.approvedByClient && plan.phase !== 'plan' && <Badge className="bg-rose-50 text-rose-700 ring-rose-200">Not approved yet</Badge>}
        </div>
      </Card>
      <Card title="Plan">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Goal" className="sm:col-span-4">
            <input className="input" value={plan.goal} onChange={(e) => save({ goal: e.target.value })} placeholder="e.g. 40 new implant consultations per month" />
          </Field>
          <Field label="Monthly ad budget ($)">
            <input className="input" type="number" value={plan.monthlyBudget} onChange={(e) => save({ monthlyBudget: +e.target.value })} />
          </Field>
          <Field label="Target cost per lead ($)">
            <input className="input" type="number" value={plan.targetCPL} onChange={(e) => save({ targetCPL: +e.target.value })} />
          </Field>
          <Field label="Target bookings / month">
            <input className="input" type="number" value={plan.targetBookings} onChange={(e) => save({ targetBookings: +e.target.value })} />
          </Field>
          <div className="text-xs text-ink-500 sm:pt-6">
            Implied max cost per booking: <b className="text-ink-800">{plan.targetBookings ? usd(plan.monthlyBudget / plan.targetBookings) : '—'}</b>
          </div>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <ListEditor label="Offers" items={plan.offers} onChange={(offers) => save({ offers })} />
          <ListEditor label="Audiences" items={plan.audiences} onChange={(audiences) => save({ audiences })} />
          <ListEditor label="Channels" items={plan.channels} onChange={(channels) => save({ channels })} />
        </div>
        <p className="mt-5 text-xs text-ink-400">The client sees this plan read-only in their Marketing page.</p>
      </Card>
    </div>
  );
}

function UsersTab({ t }: { t: Tenant }) {
  const users = useDB((s) => s.users.filter((u) => u.tenantId === t.id));
  const [f, setF] = useState({ name: '', email: '', role: 'reception' as Role });
  const full = users.length >= t.limits.users;
  return (
    <Card title={`Users (${users.length}/${t.limits.users})`} pad={false}>
      <table className="w-full">
        <tbody className="divide-y divide-ink-50">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="td font-medium">{u.name}</td>
              <td className="td text-ink-500">{u.email}</td>
              <td className="td">
                <select className="input py-1" value={u.role} onChange={(e) => useDB.getState().patch('users', u.id, { role: e.target.value as Role })}>
                  {(['owner', 'manager', 'reception', 'provider', 'accountant'] as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="td text-end">
                <button className="btn-ghost btn-sm text-rose-600" onClick={() => useDB.getState().remove('users', u.id)} aria-label="Remove user">
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form
        className="flex flex-wrap items-end gap-3 border-t border-ink-100 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.name || full) return;
          useDB.getState().insert('users', { id: uid('u'), tenantId: t.id, ...f });
          setF({ name: '', email: '', role: 'reception' });
        }}
      >
        <Field label="Name">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Role">
          <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            {(['owner', 'manager', 'reception', 'provider', 'accountant'] as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn-primary" disabled={full}>
          <Plus size={14} /> Add user
        </button>
        {full && <span className="text-xs text-rose-600">User limit reached for this plan.</span>}
      </form>
    </Card>
  );
}

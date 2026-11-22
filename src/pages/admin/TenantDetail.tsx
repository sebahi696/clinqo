import { ExternalLink, Megaphone, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ModuleToggles, PresetPicker } from '../../components/ModuleMatrix';
import { Badge, Card, Field, PageHeader, Stat, Tabs } from '../../components/ui';
import { campaignFunnels, sumFunnels } from '../../lib/metrics';
import { PRESETS, ROLE_LABEL } from '../../lib/modules';
import type { Role, Tenant } from '../../lib/types';
import { fmtDate, num, uid, usd } from '../../lib/utils';
import { useDB } from '../../store/db';
import { statusStyle } from './Overview';

type TabKey = 'overview' | 'features' | 'users';

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
          <>
          {t.modules.marketing && (
            <Link to={`/admin/growth/${t.id}`} className="btn-secondary">
              <Megaphone size={15} /> Growth workspace
            </Link>
          )}
          <button
            className="btn-primary"
            onClick={() => {
              db.openTenant(t.id);
              nav('/app');
            }}
          >
            <ExternalLink size={15} /> Open as tenant
          </button>
          </>
        }
      />
      <Tabs<TabKey>
        value={tab}
        onChange={(k) => setParams({ tab: k })}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'features', label: 'Features & plan' },
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

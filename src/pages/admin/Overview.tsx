import { ArrowUpRight, Building2, DollarSign, Megaphone, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Card, PageHeader, Stat } from '../../components/ui';
import { campaignFunnels, sumFunnels } from '../../lib/metrics';
import { PRESETS } from '../../lib/modules';
import { ago, num, usd } from '../../lib/utils';
import { useDB } from '../../store/db';

const PHASES = ['plan', 'configuration', 'ad_spend', 'optimizing'] as const;
const PHASE_LABEL = { plan: 'Marketing plan', configuration: 'Configuration', ad_spend: 'Ad spend', optimizing: 'Optimizing' };

export const statusStyle = {
  active: 'bg-brand-50 text-brand-700 ring-brand-200',
  trial: 'bg-sky-50 text-sky-700 ring-sky-200',
  onboarding: 'bg-amber-50 text-amber-700 ring-amber-200',
  suspended: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export default function AdminOverview() {
  const db = useDB();
  const nav = useNavigate();
  const active = db.tenants.filter((t) => t.status === 'active');
  const mrr = db.tenants.filter((t) => t.status !== 'suspended' && t.status !== 'onboarding').reduce((s, t) => s + t.monthlyFeeUSD, 0);
  const managedSpend = db.campaigns.reduce((s, c) => s + c.spend, 0);
  const since = Date.now() - 30 * 864e5;
  const leads30 = db.leads.filter((l) => new Date(l.createdAt).getTime() > since).length;
  const processed = db.invoices.reduce((s, i) => s + i.total, 0);

  return (
    <>
      <PageHeader title="Platform overview" subtitle="All Clinqo tenants, their plans, ad performance and onboarding status." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active tenants" value={active.length} hint={`${db.tenants.length} total`} icon={<Building2 size={16} />} />
        <Stat label="MRR (subscriptions)" value={usd(mrr)} hint="Active + trial tenants" icon={<DollarSign size={16} />} tone="brand" />
        <Stat label="Managed ad spend" value={usd(managedSpend)} hint="All Clinqo-run campaigns" icon={<Megaphone size={16} />} />
        <Stat label="Leads, last 30 days" value={num(leads30)} hint={`${usd(processed)} processed through POS`} icon={<Users size={16} />} />
      </div>

      <Card title="Tenants" className="mt-6" pad={false} actions={<Link to="/admin/tenants" className="btn-ghost btn-sm">All tenants <ArrowUpRight size={14} /></Link>}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-ink-100">
              <tr>
                <th className="th">Tenant</th>
                <th className="th">Plan</th>
                <th className="th">Modules</th>
                <th className="th text-end">Ad spend</th>
                <th className="th text-end">Leads</th>
                <th className="th text-end">Cost / patient</th>
                <th className="th text-end">ROAS</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {db.tenants.map((t) => {
                const f = sumFunnels(campaignFunnels(db, t.id));
                const on = Object.values(t.modules).filter(Boolean).length;
                return (
                  <tr key={t.id} className="hover:bg-sand-50">
                    <td className="td">
                      <Link to={`/admin/tenants/${t.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                        {t.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-400">
                        <Badge className={statusStyle[t.status]}>{t.status}</Badge> {t.city}
                      </div>
                    </td>
                    <td className="td">
                      {PRESETS[t.plan].label}
                      {t.hasOwnAgency && <div className="text-xs text-ink-400">Own agency</div>}
                    </td>
                    <td className="td text-ink-500">{on}/12</td>
                    <td className="td text-end">{t.modules.marketing ? usd(f.spend) : <span className="text-ink-300">—</span>}</td>
                    <td className="td text-end">{t.modules.marketing ? f.leads : <span className="text-ink-300">—</span>}</td>
                    <td className="td text-end">{f.patients ? usd(f.costPerPatient) : <span className="text-ink-300">—</span>}</td>
                    <td className="td text-end font-medium">{f.spend ? `${f.roas.toFixed(1)}×` : <span className="text-ink-300">—</span>}</td>
                    <td className="td text-end">
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          db.openTenant(t.id);
                          nav('/app');
                        }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Growth onboarding pipeline">
          <div className="space-y-4">
            {db.plans.map((p) => {
              const t = db.tenants.find((x) => x.id === p.tenantId);
              if (!t) return null;
              const idx = PHASES.indexOf(p.phase);
              return (
                <Link to={`/admin/tenants/${t.id}?tab=plan`} key={p.tenantId} className="block">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-800">{t.name}</span>
                    <span className="text-xs text-ink-400">{p.approvedByClient ? 'Plan approved' : 'Awaiting client approval'}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {PHASES.map((ph, i) => (
                      <div key={ph}>
                        <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-brand-500' : 'bg-ink-100'}`} />
                        <div className={`mt-1 text-[10px] ${i === idx ? 'font-semibold text-brand-700' : 'text-ink-400'}`}>{PHASE_LABEL[ph]}</div>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
        <Card title="Recent activity" actions={<Link to="/admin/activity" className="btn-ghost btn-sm">View all</Link>}>
          <ul className="space-y-3">
            {db.activity.slice(0, 7).map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <span className="flex-1 text-ink-700">{a.text}</span>
                <span className="shrink-0 text-xs text-ink-400">{ago(a.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, PageHeader, Stat } from '../../components/ui';
import { campaignFunnels, growthInsights, sumFunnels } from '../../lib/metrics';
import { cx, num, usd } from '../../lib/utils';
import { useDB } from '../../store/db';

const PHASE_LABEL = { plan: 'Plan', configuration: 'Configuration', ad_spend: 'Ad spend', optimizing: 'Optimizing' };

// The Clinqo marketer's cockpit: every clinic where Clinqo runs the ads
export default function Growth() {
  const db = useDB();
  const clients = db.tenants.filter((t) => t.modules.marketing);
  const rows = clients.map((t) => {
    const f = sumFunnels(campaignFunnels(db, t.id));
    const plan = db.plans.find((p) => p.tenantId === t.id);
    const ins = growthInsights(db, t.id).filter((i) => i.level !== 'good');
    const leads7 = db.leads.filter((l) => l.tenantId === t.id && l.source === 'meta_ads' && Date.now() - new Date(l.createdAt).getTime() < 7 * 864e5).length;
    const uncalled = db.leads.filter((l) => l.tenantId === t.id && l.source === 'meta_ads' && l.stage === 'new').length;
    const monthly = db.campaigns.filter((c) => c.tenantId === t.id && c.status === 'ACTIVE').reduce((s, c) => s + c.dailyBudget * 30, 0);
    return { t, f, plan, ins, leads7, uncalled, monthly };
  });
  const tot = rows.reduce((a, r) => ({ spend: a.spend + r.f.spend, revenue: a.revenue + r.f.revenue, leads7: a.leads7 + r.leads7, alerts: a.alerts + r.ins.length }), { spend: 0, revenue: 0, leads7: 0, alerts: 0 });

  return (
    <>
      <PageHeader title="Growth" subtitle="Every clinic where Clinqo runs the Meta ads. Work here, or in Ads Manager: changes made there show up on the next sync." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Growth clients" value={rows.length} />
        <Stat label="Ad leads, last 7 days" value={num(tot.leads7)} />
        <Stat label="Managed spend → clinic revenue" value={`${usd(tot.spend)} → ${usd(tot.revenue)}`} tone="brand" />
        <Stat label="Things to fix" value={tot.alerts} tone={tot.alerts ? 'bad' : 'good'} />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-ink-100">
            <tr>
              <th className="th">Clinic</th>
              <th className="th">Phase</th>
              <th className="th text-end">Budget / month</th>
              <th className="th text-end">Leads 7d</th>
              <th className="th text-end">CPL vs target</th>
              <th className="th text-end">Uncalled</th>
              <th className="th text-end">ROAS</th>
              <th className="th">Attention</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {rows.map(({ t, f, plan, ins, leads7, uncalled, monthly }) => (
              <tr key={t.id} className="hover:bg-sand-50">
                <td className="td">
                  <Link to={`/admin/growth/${t.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                    {t.name}
                  </Link>
                  <div className="text-xs text-ink-400">{t.metaAdAccountId ?? <span className="text-rose-600">no ad account</span>}</div>
                </td>
                <td className="td">
                  {plan ? <Badge className="bg-brand-50 text-brand-700 ring-brand-200">{PHASE_LABEL[plan.phase]}</Badge> : '—'}
                  {plan && !plan.approvedByClient && <div className="mt-1 text-[11px] text-amber-700">awaiting approval</div>}
                </td>
                <td className="td text-end">
                  {usd(monthly)}
                  {plan && <div className="text-xs text-ink-400">plan {usd(plan.monthlyBudget)}</div>}
                </td>
                <td className="td text-end">{leads7}</td>
                <td className={cx('td text-end', plan && f.cpl > plan.targetCPL ? 'text-rose-600' : '')}>
                  {f.leads ? usd(f.cpl, 2) : '—'}
                  {plan && <span className="text-xs text-ink-400"> / {usd(plan.targetCPL)}</span>}
                </td>
                <td className={cx('td text-end', uncalled ? 'font-semibold text-rose-600' : 'text-ink-400')}>{uncalled}</td>
                <td className="td text-end font-medium">{f.spend ? `${f.roas.toFixed(1)}×` : '—'}</td>
                <td className="td max-w-[260px]">
                  {ins.length ? (
                    <span className="flex items-start gap-1.5 text-xs text-ink-700">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                      <span className="line-clamp-2">
                        {ins[0].title}
                        {ins.length > 1 && ` (+${ins.length - 1})`}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-brand-700">On track</span>
                  )}
                </td>
                <td className="td text-end">
                  <Link to={`/admin/growth/${t.id}`} className="btn-secondary btn-sm">
                    Open <ArrowRight size={13} className="rtl:rotate-180" />
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-sm text-ink-400">
                  No clinic has the Marketing module on.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

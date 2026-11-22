import { CheckCircle2, Circle, Download, Pause, Play, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { Badge, Card, PageHeader, Stat } from '../../components/ui';
import { campaignFunnels, sumFunnels } from '../../lib/metrics';
import { cx, download, fmtDate, num, pct, toCSV, usd } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

const PHASES = [
  ['plan', 'Marketing plan'],
  ['configuration', 'Configuration'],
  ['ad_spend', 'Ad spend'],
  ['optimizing', 'Optimizing'],
] as const;

export default function Marketing() {
  const tenant = useTenant()!;
  const db = useDB();
  const isAdmin = db.session.impersonating;
  const plan = db.plans.find((p) => p.tenantId === tenant.id);
  const campaigns = useT('campaigns');
  const funnels = useMemo(() => campaignFunnels(db, tenant.id), [db, tenant.id]);
  const t = sumFunnels(funnels);
  const phaseIdx = PHASES.findIndex(([k]) => k === plan?.phase);
  const steps = [
    { label: 'Ad spend', value: usd(t.spend), n: t.spend },
    { label: 'Leads', value: num(t.leads), n: t.leads },
    { label: 'Consults booked', value: num(t.booked), n: t.booked },
    { label: 'Attended', value: num(t.attended), n: t.attended },
    { label: 'Paying patients', value: num(t.patients), n: t.patients },
    { label: 'Revenue', value: usd(t.revenue), n: t.revenue },
  ];
  const countSteps = steps.slice(1, 5);
  const maxCount = Math.max(1, countSteps[0].n);

  return (
    <>
      <PageHeader
        title="Marketing"
        subtitle={tenant.metaAdAccountId ? `Managed by Clinqo · Meta ad account ${tenant.metaAdAccountId}` : 'No Meta ad account assigned yet'}
        actions={
          <button
            className="btn-secondary"
            onClick={() => download(`ads-report-${new Date().toISOString().slice(0, 7)}.csv`, toCSV(funnels.map((f) => ({ campaign: f.campaign.name, status: f.campaign.status, spend: f.spend, leads: f.leads, booked: f.booked, patients: f.patients, revenue: f.revenue, cpl: f.cpl.toFixed(2), cost_per_patient: f.costPerPatient.toFixed(2), roas: f.roas.toFixed(2) }))))}
          >
            <Download size={15} /> Monthly report
          </button>
        }
      />

      {plan && (
        <Card className="mb-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">Growth plan</div>
              <p className="mt-1 font-display text-xl font-semibold text-ink-900">{plan.goal || 'Plan in preparation'}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {plan.offers.map((o) => (
                  <Badge key={o} className="bg-coral-400/10 text-coral-600 ring-coral-400/30">
                    {o}
                  </Badge>
                ))}
              </div>
              <div className="mt-2 text-xs text-ink-500">Audiences: {plan.audiences.join(' · ') || '—'}</div>
              {!plan.approvedByClient && <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Your account manager is waiting for your approval of this plan before ad spend starts.</div>}
            </div>
            <div>
              <ol className="space-y-2">
                {PHASES.map(([k, label], i) => (
                  <li key={k} className="flex items-center gap-2 text-sm">
                    {i < phaseIdx ? <CheckCircle2 size={16} className="text-brand-600" /> : i === phaseIdx ? <span className="h-4 w-4 rounded-full border-4 border-brand-600" /> : <Circle size={16} className="text-ink-200" />}
                    <span className={cx(i === phaseIdx ? 'font-semibold text-ink-900' : i < phaseIdx ? 'text-ink-600' : 'text-ink-400')}>{label}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-sand-100 p-2">
                  <div className="text-ink-400">Budget / mo</div>
                  <div className="font-semibold text-ink-800">{usd(plan.monthlyBudget)}</div>
                </div>
                <div className="rounded-lg bg-sand-100 p-2">
                  <div className="text-ink-400">Target CPL</div>
                  <div className={cx('font-semibold', t.cpl && t.cpl > plan.targetCPL ? 'text-rose-600' : 'text-ink-800')}>{usd(plan.targetCPL)}</div>
                </div>
                <div className="rounded-lg bg-sand-100 p-2">
                  <div className="text-ink-400">Bookings / mo</div>
                  <div className="font-semibold text-ink-800">{plan.targetBookings}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ad spend to date" value={usd(t.spend)} />
        <Stat label="Cost per lead" value={usd(t.cpl, 2)} hint={plan ? `Target ${usd(plan.targetCPL)}` : undefined} tone={plan && t.cpl > plan.targetCPL ? 'bad' : 'good'} />
        <Stat label="Cost per paying patient" value={usd(t.costPerPatient)} />
        <Stat label="Return on ad spend" value={`${t.roas.toFixed(1)}×`} hint={`${usd(t.revenue)} revenue from ad patients`} tone="brand" />
      </div>

      <Card title="Ad funnel: from spend to revenue" className="mb-6">
        <div className="space-y-2.5">
          {countSteps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-36 shrink-0 text-sm text-ink-600">{s.label}</div>
              <div className="h-8 flex-1 rounded bg-ink-50">
                <div className="flex h-full items-center rounded bg-brand-600 px-2 text-xs font-semibold text-white" style={{ width: `${Math.max(6, (s.n / maxCount) * 100)}%`, opacity: 1 - i * 0.15 }}>
                  {s.value}
                </div>
              </div>
              <div className="w-14 shrink-0 text-end text-xs text-ink-400">{i ? pct(s.n / Math.max(1, countSteps[i - 1].n)) : ''}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-500">Percentages show how many carry on from the stage above. The biggest drop is where the front desk or offer needs work.</p>
      </Card>

      <Card title="Campaigns" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-ink-100">
              <tr>
                <th className="th">Campaign</th>
                <th className="th text-end">Daily</th>
                <th className="th text-end">Spend</th>
                <th className="th text-end">Leads</th>
                <th className="th text-end">CPL</th>
                <th className="th text-end">Patients</th>
                <th className="th text-end">Revenue</th>
                <th className="th text-end">ROAS</th>
                {isAdmin && <th className="th" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {funnels.map((f) => (
                <tr key={f.campaign.id}>
                  <td className="td">
                    <div className="font-medium text-ink-800">{f.campaign.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-400">
                      <Badge className={f.campaign.status === 'ACTIVE' ? 'bg-brand-50 text-brand-700 ring-brand-200' : undefined}>{f.campaign.status}</Badge>
                      {f.campaign.objective} · since {fmtDate(f.campaign.startDate)}
                    </div>
                  </td>
                  <td className="td text-end">
                    {isAdmin ? (
                      <input type="number" className="w-16 rounded border border-ink-200 px-1 py-0.5 text-end text-sm" value={f.campaign.dailyBudget} onChange={(e) => db.patch('campaigns', f.campaign.id, { dailyBudget: +e.target.value })} />
                    ) : (
                      usd(f.campaign.dailyBudget)
                    )}
                  </td>
                  <td className="td text-end">{usd(f.spend)}</td>
                  <td className="td text-end">{f.leads}</td>
                  <td className="td text-end">{usd(f.cpl, 2)}</td>
                  <td className="td text-end">{f.patients}</td>
                  <td className="td text-end">{usd(f.revenue)}</td>
                  <td className={cx('td text-end font-semibold', f.roas >= 3 ? 'text-brand-700' : f.roas < 1 ? 'text-rose-600' : '')}>{f.roas.toFixed(1)}×</td>
                  {isAdmin && (
                    <td className="td text-end">
                      <button className="btn-secondary btn-sm" onClick={() => db.patch('campaigns', f.campaign.id, { status: f.campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' })}>
                        {f.campaign.status === 'ACTIVE' ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-sm text-ink-400">
                    No campaigns yet. They appear here once the ad spend phase starts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-600">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-600" />
        <p>
          Patient health data never goes to Meta. Clinqo sends only neutral conversion events (for example <code className="rounded bg-ink-50 px-1">Qualified_Lead</code> and a value), as Meta's health-and-wellness data rules require.
        </p>
      </div>
    </>
  );
}

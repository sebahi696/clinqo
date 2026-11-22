import type { DB } from './seed';
import type { Campaign, Invoice } from './types';
import { monthKey } from './utils';

export interface CampaignFunnel {
  campaign: Campaign;
  spend: number;
  leads: number;
  booked: number;
  attended: number;
  patients: number;
  revenue: number;
  cpl: number;
  costPerPatient: number;
  roas: number;
}

/** Ad spend → leads → bookings → paying patients → revenue, per campaign */
export function campaignFunnels(db: Pick<DB, 'campaigns' | 'leads' | 'patients' | 'invoices' | 'appointments'>, tenantId: string): CampaignFunnel[] {
  const campaigns = db.campaigns.filter((c) => c.tenantId === tenantId);
  return campaigns.map((c) => {
    const leads = db.leads.filter((l) => l.campaignId === c.id);
    const patients = db.patients.filter((p) => p.campaignId === c.id);
    const pids = new Set(patients.map((p) => p.id));
    const revenue = db.invoices.filter((i) => i.patientId && pids.has(i.patientId)).reduce((s, i) => s + i.total, 0);
    const booked = leads.filter((l) => ['consult_booked', 'attended', 'won'].includes(l.stage)).length;
    const attended = leads.filter((l) => ['attended', 'won'].includes(l.stage)).length;
    const paying = new Set(db.invoices.filter((i) => i.patientId && pids.has(i.patientId)).map((i) => i.patientId)).size;
    return {
      campaign: c,
      spend: c.spend,
      leads: leads.length,
      booked,
      attended,
      patients: paying,
      revenue,
      cpl: leads.length ? c.spend / leads.length : 0,
      costPerPatient: paying ? c.spend / paying : 0,
      roas: c.spend ? revenue / c.spend : 0,
    };
  });
}

export function sumFunnels(f: CampaignFunnel[]) {
  const t = f.reduce(
    (a, x) => ({ spend: a.spend + x.spend, leads: a.leads + x.leads, booked: a.booked + x.booked, attended: a.attended + x.attended, patients: a.patients + x.patients, revenue: a.revenue + x.revenue }),
    { spend: 0, leads: 0, booked: 0, attended: 0, patients: 0, revenue: 0 },
  );
  return { ...t, cpl: t.leads ? t.spend / t.leads : 0, costPerPatient: t.patients ? t.spend / t.patients : 0, roas: t.spend ? t.revenue / t.spend : 0 };
}

export function revenueByDay(invoices: Invoice[], days: number) {
  const out: { day: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key.slice(5), revenue: 0 });
    const bucket = out[out.length - 1];
    for (const inv of invoices) if (inv.createdAt.slice(0, 10) === key && inv.status !== 'refunded') bucket.revenue += inv.total;
  }
  return out;
}

export function revenueByMonth(invoices: Invoice[]) {
  const m = new Map<string, number>();
  for (const i of invoices) if (i.status !== 'refunded') m.set(monthKey(i.createdAt), (m.get(monthKey(i.createdAt)) ?? 0) + i.total);
  return m;
}

export function paidUSD(inv: Invoice) {
  return inv.payments.reduce((s, p) => s + p.amountUSD, 0);
}

export interface Insight {
  level: 'good' | 'warn' | 'bad';
  title: string;
  detail: string;
}

/** Rule-based suggestions for the Clinqo marketer, from ads + CRM data together */
export function growthInsights(
  db: Pick<DB, 'campaigns' | 'leads' | 'patients' | 'invoices' | 'appointments' | 'plans'>,
  tenantId: string,
): Insight[] {
  const out: Insight[] = [];
  const plan = db.plans.find((p) => p.tenantId === tenantId);
  const funnels = campaignFunnels(db, tenantId);
  const leads = db.leads.filter((l) => l.tenantId === tenantId && l.source === 'meta_ads');
  const target = plan?.targetCPL ?? 0;

  const waiting = leads.filter((l) => l.stage === 'new' && Date.now() - new Date(l.createdAt).getTime() > 2 * 36e5);
  if (waiting.length)
    out.push({ level: 'bad', title: `${waiting.length} ad leads not called after 2 hours`, detail: 'Leads go cold fast. Ask the clinic to call them today; slow follow-up makes the ads look expensive.' });

  for (const f of funnels) {
    if (f.campaign.status !== 'ACTIVE') continue;
    if (target && f.leads >= 5 && f.cpl > target * 1.3)
      out.push({ level: 'warn', title: `${f.campaign.name}: cost per lead ${usd(f.cpl, 2)} vs target ${usd(target)}`, detail: 'Refresh the creative or tighten the audience before raising budget.' });
    if (f.spend > 150 && f.patients === 0)
      out.push({ level: 'bad', title: `${f.campaign.name}: ${usd(f.spend)} spent, no paying patients yet`, detail: 'Check lead quality with the clinic (wrong area? price shoppers?). Add a qualifying question to the form.' });
  }
  const active = funnels.filter((f) => f.campaign.status === 'ACTIVE' && f.spend > 100);
  if (active.length > 1) {
    const best = [...active].sort((a, b) => b.roas - a.roas)[0];
    const worst = [...active].sort((a, b) => a.roas - b.roas)[0];
    if (best.roas > worst.roas * 1.8)
      out.push({ level: 'good', title: `${best.campaign.name} returns ${best.roas.toFixed(1)}× vs ${worst.roas.toFixed(1)}×`, detail: `Consider moving budget from “${worst.campaign.name}” to it.` });
  }
  const booked = leads.filter((l) => ['consult_booked', 'attended', 'won'].includes(l.stage)).length;
  const contacted = leads.filter((l) => l.stage !== 'new').length;
  if (contacted > 20 && booked / contacted < 0.15)
    out.push({ level: 'warn', title: `Only ${Math.round((booked / contacted) * 100)}% of contacted leads book`, detail: 'The offer or the call script may be the problem, not the ads. Review call notes with the clinic.' });
  if (plan) {
    const monthly = db.campaigns.filter((c) => c.tenantId === tenantId && c.status === 'ACTIVE').reduce((s, c) => s + c.dailyBudget * 30, 0);
    if (monthly > plan.monthlyBudget * 1.1) out.push({ level: 'warn', title: `Daily budgets add up to ${usd(monthly)}/month`, detail: `That is above the agreed ${usd(plan.monthlyBudget)}. Lower budgets or update the plan with the client.` });
    else if (monthly < plan.monthlyBudget * 0.8 && plan.phase !== 'plan') out.push({ level: 'warn', title: `Under-spending: ${usd(monthly)}/month of ${usd(plan.monthlyBudget)}`, detail: 'Room to scale the best campaign.' });
    if (!plan.approvedByClient && plan.phase !== 'plan') out.push({ level: 'bad', title: 'Plan not approved by the client', detail: 'Get approval before spending more.' });
  }
  if (!out.length) out.push({ level: 'good', title: 'Everything on track', detail: 'Cost per lead, follow-up and budget are within plan.' });
  return out;
}

function usd(n: number, d = 0) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

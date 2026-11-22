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

import { useMemo, useState } from 'react';
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Avatar, Bar, Card, PageHeader, Stat } from '../../components/ui';
import type { LeadSource, PaymentMethod } from '../../lib/types';
import { useSourceLabel } from '../../lib/hooks';
import { METHOD_LABEL, pct, usd } from '../../lib/utils';
import { useT } from '../../store/db';

export default function Reports() {
  const [range, setRange] = useState(30);
  const label = useSourceLabel();
  const since = Date.now() - range * 864e5;
  const invoices = useT('invoices').filter((i) => i.status !== 'refunded' && new Date(i.createdAt).getTime() > since);
  const appts = useT('appointments').filter((a) => new Date(a.start).getTime() > since && new Date(a.start) < new Date());
  const patients = useT('patients');
  const leads = useT('leads');
  const services = useT('services');
  const staff = useT('staff');

  const bySvc = useMemo(() => {
    const m = new Map<string, number>();
    invoices.forEach((i) => i.items.forEach((x) => x.kind === 'service' && m.set(x.name, (m.get(x.name) ?? 0) + x.price * x.qty)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, revenue]) => ({ name: name.length > 18 ? name.slice(0, 17) + '…' : name, revenue }));
  }, [invoices]);

  const byStaff = staff.map((s) => {
    const mine = appts.filter((a) => a.staffId === s.id && a.status === 'completed');
    const mins = mine.reduce((a, x) => a + x.duration, 0);
    const days = Math.round(range * (6 / 7));
    const rev = invoices.reduce((a, i) => a + i.items.filter((x) => x.staffId === s.id).reduce((b, x) => b + x.price * x.qty, 0), 0);
    return { s, visits: mine.length, util: mins / (days * 9 * 60), rev };
  });
  const maxRev = Math.max(1, ...byStaff.map((x) => x.rev));

  const methods = new Map<PaymentMethod, number>();
  invoices.forEach((i) => i.payments.forEach((p) => methods.set(p.method, (methods.get(p.method) ?? 0) + p.amountUSD)));
  const totalPaid = [...methods.values()].reduce((a, b) => a + b, 0);

  const srcConv = useMemo(() => {
    const m = new Map<LeadSource, { n: number; won: number }>();
    leads.forEach((l) => {
      const x = m.get(l.source) ?? { n: 0, won: 0 };
      x.n++;
      if (l.stage === 'won') x.won++;
      m.set(l.source, x);
    });
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [leads]);

  const newPatients = patients.filter((p) => new Date(p.createdAt).getTime() > since).length;
  const completed = appts.filter((a) => a.status === 'completed').length;
  const noShow = appts.filter((a) => a.status === 'no_show').length;
  const cancelled = appts.filter((a) => a.status === 'cancelled').length;
  const revenue = invoices.reduce((s, i) => s + i.total, 0);
  const visitors = new Set(appts.filter((a) => a.status === 'completed').map((a) => a.patientId));
  const returning = [...visitors].filter((pid) => appts.filter((a) => a.patientId === pid && a.status === 'completed').length > 1).length;

  return (
    <>
      <PageHeader
        title="Reports"
        actions={
          <select className="input w-auto" value={range} onChange={(e) => setRange(+e.target.value)}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Revenue" value={usd(revenue)} tone="brand" />
        <Stat label="Completed visits" value={completed} />
        <Stat label="New patients" value={newPatients} />
        <Stat label="No-show rate" value={pct(noShow / Math.max(1, appts.length), 1)} tone={noShow / Math.max(1, appts.length) > 0.08 ? 'bad' : 'good'} />
        <Stat label="Returning visitors" value={pct(returning / Math.max(1, visitors.size))} hint={`${cancelled} cancellations`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Revenue by service">
          <div style={{ height: Math.max(200, bySvc.length * 30) }}>
            <ResponsiveContainer>
              <BarChart data={bySvc} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="#e8eded" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => usd(v)} />
                <RBar dataKey="revenue" fill="#1f9880" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Providers">
          <ul className="space-y-4">
            {byStaff.map(({ s, visits, util, rev }) => (
              <li key={s.id} className="flex items-center gap-3">
                <Avatar name={s.name} color={s.color} />
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="font-semibold">{usd(rev)}</span>
                  </div>
                  <Bar value={rev} max={maxRev} />
                  <div className="mt-1 text-xs text-ink-400">
                    {visits} visits · {pct(Math.min(1, util))} of chair time booked
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Payment methods">
          <ul className="space-y-3">
            {[...methods.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([m, v]) => (
                <li key={m}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{METHOD_LABEL[m]}</span>
                    <span className="text-ink-500">
                      {usd(v)} · {pct(v / Math.max(1, totalPaid))}
                    </span>
                  </div>
                  <Bar value={v} max={totalPaid} color="bg-ink-600" />
                </li>
              ))}
          </ul>
        </Card>
        <Card title="Lead source → won">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="th ps-0">Source</th>
                <th className="th text-end">Leads</th>
                <th className="th text-end">Won</th>
                <th className="th text-end">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {srcConv.map(([s, x]) => (
                <tr key={s}>
                  <td className="py-2">{label(s)}</td>
                  <td className="td text-end">{x.n}</td>
                  <td className="td text-end">{x.won}</td>
                  <td className="td text-end font-medium">{pct(x.won / x.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-400">{services.length} services in catalog.</p>
        </Card>
      </div>
    </>
  );
}

import { Download, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Field, Modal, PageHeader, Stat, Tabs } from '../../components/ui';
import type { PaymentMethod } from '../../lib/types';
import { download, fmtDate, lbp, METHOD_LABEL, monthKey, pct, sameDay, toCSV, uid, usd } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

type TabKey = 'pnl' | 'drawer' | 'expenses' | 'commissions';
const CATS = ['Rent', 'Salaries', 'Generator subscription', 'Electricity (EDL)', 'Supplies', 'Internet & phone', 'Meta ad spend', 'Marketing agency', 'Maintenance', 'Clinqo subscription', 'Other'];

export default function Finance() {
  const tenant = useTenant()!;
  const invoices = useT('invoices').filter((i) => i.status !== 'refunded');
  const expenses = useT('expenses');
  const products = useT('products');
  const staff = useT('staff');
  const { insert, remove } = useDB.getState();
  const [tab, setTab] = useState<TabKey>('pnl');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ category: 'Supplies', vendor: '', amount: 0, date: new Date().toISOString().slice(0, 10), note: '' });

  const months = useMemo(() => {
    const keys = new Set<string>();
    const now = new Date();
    for (let i = 2; i >= 0; i--) keys.add(new Date(now.getFullYear(), now.getMonth() - i, 15).toISOString().slice(0, 7));
    return [...keys].map((m) => {
      const inv = invoices.filter((i) => monthKey(i.createdAt) === m);
      const revenue = inv.reduce((s, i) => s + i.total, 0);
      const cogs = inv.reduce((s, i) => s + i.items.filter((x) => x.kind === 'product').reduce((a, x) => a + (products.find((p) => p.id === x.refId)?.cost ?? 0) * x.qty, 0), 0);
      const commissions = inv.reduce((s, i) => s + i.items.filter((x) => x.kind === 'service' && x.staffId).reduce((a, x) => a + (x.price * x.qty * (staff.find((st) => st.id === x.staffId)?.commissionRate ?? 0)) / 100, 0), 0);
      const exp = expenses.filter((e) => e.date.slice(0, 7) === m);
      const byCat = new Map<string, number>();
      exp.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
      const opex = exp.reduce((s, e) => s + e.amount, 0);
      return { m, label: new Date(m + '-15').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }), revenue, cogs, commissions, opex, byCat, net: revenue - cogs - commissions - opex };
    });
  }, [invoices, expenses, products, staff]);
  const cur = months[months.length - 1];
  const cats = [...new Set(months.flatMap((m) => [...m.byCat.keys()]))];

  const today = invoices.filter((i) => sameDay(new Date(i.createdAt), new Date()));
  const drawer = new Map<PaymentMethod, { usd: number; native: number }>();
  today.forEach((i) =>
    i.payments.forEach((p) => {
      const d = drawer.get(p.method) ?? { usd: 0, native: 0 };
      d.usd += p.amountUSD;
      d.native += p.amount;
      drawer.set(p.method, d);
    }),
  );

  return (
    <>
      <PageHeader
        title="Finance"
        subtitle="A simple monthly P&L, cash drawer by currency and expense tracking. Export for your accountant."
        actions={
          <>
            <button className="btn-secondary" onClick={() => download('expenses.csv', toCSV(expenses.map((e) => ({ date: e.date, category: e.category, vendor: e.vendor, amount: e.amount, note: e.note ?? '' }))))}>
              <Download size={15} /> Export
            </button>
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> Add expense
            </button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Revenue · ${cur.label}`} value={usd(cur.revenue)} tone="brand" />
        <Stat label="Expenses" value={usd(cur.opex + cur.cogs + cur.commissions)} />
        <Stat label="Net profit" value={usd(cur.net)} tone={cur.net >= 0 ? 'good' : 'bad'} hint={`Margin ${pct(cur.net / Math.max(1, cur.revenue))}`} />
        <Stat label="Collected today" value={usd(today.reduce((s, i) => s + i.payments.reduce((a, p) => a + p.amountUSD, 0), 0))} />
      </div>
      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'pnl', label: 'Profit & loss' },
          { key: 'drawer', label: 'Cash drawer (today)' },
          { key: 'expenses', label: 'Expenses' },
          { key: 'commissions', label: 'Commissions' },
        ]}
      />
      {tab === 'pnl' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <Card title="Revenue vs costs">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={months.map((m) => ({ name: m.label, Revenue: Math.round(m.revenue), Costs: Math.round(m.opex + m.cogs + m.commissions) }))} margin={{ left: -6 }}>
                  <CartesianGrid stroke="#e8eded" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => usd(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Revenue" fill="#1f9880" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Costs" fill="#e46a48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card pad={false} title="Monthly P&L (USD)">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100">
                <tr>
                  <th className="th" />
                  {months.map((m) => (
                    <th key={m.m} className="th text-end">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                <tr className="font-medium">
                  <td className="td">Revenue</td>
                  {months.map((m) => (
                    <td key={m.m} className="td text-end text-brand-700">
                      {usd(m.revenue)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="td text-ink-500">Cost of products sold</td>
                  {months.map((m) => (
                    <td key={m.m} className="td text-end">
                      -{usd(m.cogs)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="td text-ink-500">Staff commissions</td>
                  {months.map((m) => (
                    <td key={m.m} className="td text-end">
                      -{usd(m.commissions)}
                    </td>
                  ))}
                </tr>
                {cats.map((c) => (
                  <tr key={c}>
                    <td className="td text-ink-500">{c}</td>
                    {months.map((m) => (
                      <td key={m.m} className="td text-end">
                        {m.byCat.get(c) ? `-${usd(m.byCat.get(c)!)}` : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-sand-50 font-semibold">
                  <td className="td">Net profit</td>
                  {months.map((m) => (
                    <td key={m.m} className={`td text-end ${m.net < 0 ? 'text-rose-600' : 'text-ink-900'}`}>
                      {usd(m.net)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      )}
      {tab === 'drawer' && (
        <Card title={`End-of-day close · ${today.length} sales`}>
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100">
              <tr>
                <th className="th ps-0">Method</th>
                <th className="th text-end">Counted in</th>
                <th className="th text-end">USD equivalent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {[...drawer.entries()].map(([m, d]) => (
                <tr key={m}>
                  <td className="py-2.5 font-medium">{METHOD_LABEL[m]}</td>
                  <td className="td text-end">{m === 'cash_lbp' ? lbp(d.native) : usd(d.native, 2)}</td>
                  <td className="td text-end">{usd(d.usd, 2)}</td>
                </tr>
              ))}
              {drawer.size === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-ink-400">
                    No payments yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-ink-500">LBP cash is converted at {tenant.exchangeRate.toLocaleString()} LBP per dollar. Count the USD and LBP drawers separately at closing.</p>
        </Card>
      )}
      {tab === 'expenses' && (
        <Card pad={false}>
          <table className="w-full">
            <thead className="border-b border-ink-100">
              <tr>
                <th className="th">Date</th>
                <th className="th">Category</th>
                <th className="th">Vendor</th>
                <th className="th">Note</th>
                <th className="th text-end">Amount</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {[...expenses]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((e) => (
                  <tr key={e.id}>
                    <td className="td text-ink-500">{fmtDate(e.date)}</td>
                    <td className="td">{e.category}</td>
                    <td className="td text-ink-600">{e.vendor}</td>
                    <td className="td text-xs text-ink-400">{e.note}</td>
                    <td className="td text-end font-medium">{usd(e.amount)}</td>
                    <td className="td text-end">
                      <button className="text-ink-300 hover:text-rose-500" onClick={() => remove('expenses', e.id)} aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      )}
      {tab === 'commissions' && (
        <Card pad={false} title={`Commissions · ${cur.label}`}>
          <table className="w-full">
            <thead className="border-b border-ink-100">
              <tr>
                <th className="th">Staff</th>
                <th className="th text-end">Rate</th>
                <th className="th text-end">Service revenue</th>
                <th className="th text-end">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {staff.map((s) => {
                const rev = invoices.filter((i) => monthKey(i.createdAt) === cur.m).reduce((a, i) => a + i.items.filter((x) => x.kind === 'service' && x.staffId === s.id).reduce((b, x) => b + x.price * x.qty, 0), 0);
                return (
                  <tr key={s.id}>
                    <td className="td font-medium">{s.name}</td>
                    <td className="td text-end">{s.commissionRate}%</td>
                    <td className="td text-end">{usd(rev)}</td>
                    <td className="td text-end font-semibold">{usd((rev * s.commissionRate) / 100)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add expense"
        footer={
          <button
            className="btn-primary"
            disabled={!f.amount}
            onClick={() => {
              insert('expenses', { id: uid('ex'), tenantId: tenant.id, ...f, note: f.note || undefined });
              setOpen(false);
            }}
          >
            Save
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {CATS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Vendor">
            <input className="input" value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} />
          </Field>
          <Field label="Amount ($)">
            <input className="input" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} />
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Field label="Note" className="sm:col-span-2">
            <input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

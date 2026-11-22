import { Download } from 'lucide-react';
import { useState } from 'react';
import { Badge, PageHeader, Stat } from '../../components/ui';
import { fullName, usePatientMap } from '../../lib/hooks';
import { paidUSD } from '../../lib/metrics';
import type { Invoice } from '../../lib/types';
import { download, fmtDateTime, METHOD_LABEL, toCSV, usd } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';
import { Receipt } from './POS';

const STYLE: Record<Invoice['status'], string> = {
  paid: 'bg-brand-50 text-brand-700 ring-brand-200',
  partial: 'bg-amber-50 text-amber-700 ring-amber-200',
  unpaid: 'bg-rose-50 text-rose-700 ring-rose-200',
  refunded: 'bg-ink-50 text-ink-500 ring-ink-200',
};

export default function Invoices() {
  const tenant = useTenant()!;
  const invoices = useT('invoices');
  const patients = usePatientMap();
  const { patch, log } = useDB.getState();
  const [status, setStatus] = useState<'all' | Invoice['status']>('all');
  const [range, setRange] = useState(30);
  const [view, setView] = useState<Invoice | null>(null);
  const since = Date.now() - range * 864e5;
  const list = invoices.filter((i) => new Date(i.createdAt).getTime() > since && (status === 'all' || i.status === status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = list.filter((i) => i.status !== 'refunded').reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.reduce((s, i) => s + (i.status === 'refunded' ? 0 : Math.max(0, i.total - paidUSD(i))), 0);

  const settle = (inv: Invoice) => {
    const due = +(inv.total - paidUSD(inv)).toFixed(2);
    patch('invoices', inv.id, { payments: [...inv.payments, { method: 'cash_usd', currency: 'USD', amount: due, amountUSD: due }], status: 'paid' });
    log(`Settled ${inv.number} (${usd(due)})`, tenant.id);
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        actions={
          <button
            className="btn-secondary"
            onClick={() =>
              download(
                'invoices.csv',
                toCSV(list.map((i) => ({ number: i.number, date: i.createdAt, customer: fullName(patients.get(i.patientId ?? '')), items: i.items.map((x) => x.name).join(' | '), discount: i.discount, vat: i.vat, total: i.total, paid: paidUSD(i), status: i.status, methods: i.payments.map((p) => METHOD_LABEL[p.method]).join(' | ') }))),
              )
            }
          >
            <Download size={15} /> Export for accountant
          </button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Sales, last ${range} days`} value={usd(total)} tone="brand" />
        <Stat label="Invoices" value={list.length} />
        <Stat label="Average ticket" value={usd(list.length ? total / list.length : 0)} />
        <Stat label="Outstanding balances" value={usd(outstanding)} tone={outstanding ? 'bad' : 'default'} />
      </div>
      <div className="mb-4 flex gap-2">
        <select className="input w-auto" value={range} onChange={(e) => setRange(+e.target.value)}>
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-ink-100">
            <tr>
              <th className="th">Number</th>
              <th className="th">Date</th>
              <th className="th">Customer</th>
              <th className="th">Items</th>
              <th className="th">Paid with</th>
              <th className="th text-end">Total</th>
              <th className="th">Status</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {list.slice(0, 300).map((i) => (
              <tr key={i.id} className="hover:bg-sand-50">
                <td className="td">
                  <button className="font-medium text-brand-700 hover:underline" onClick={() => setView(i)}>
                    {i.number}
                  </button>
                </td>
                <td className="td whitespace-nowrap text-ink-500">{fmtDateTime(i.createdAt)}</td>
                <td className="td">{fullName(patients.get(i.patientId ?? ''))}</td>
                <td className="td max-w-[220px] truncate text-ink-600">{i.items.map((x) => x.name).join(', ')}</td>
                <td className="td text-xs text-ink-500">{[...new Set(i.payments.map((p) => METHOD_LABEL[p.method]))].join(', ')}</td>
                <td className="td text-end font-medium">{usd(i.total, 2)}</td>
                <td className="td">
                  <Badge className={STYLE[i.status]}>{i.status}</Badge>
                </td>
                <td className="td whitespace-nowrap text-end">
                  {(i.status === 'partial' || i.status === 'unpaid') && (
                    <button className="btn-secondary btn-sm" onClick={() => settle(i)}>
                      Settle
                    </button>
                  )}
                  {i.status === 'paid' && (
                    <button
                      className="btn-ghost btn-sm text-ink-400"
                      onClick={() => {
                        if (confirm(`Refund ${i.number}?`)) {
                          patch('invoices', i.id, { status: 'refunded' });
                          log(`Refunded ${i.number}`, tenant.id);
                        }
                      }}
                    >
                      Refund
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Receipt inv={view} onClose={() => setView(null)} />
    </>
  );
}

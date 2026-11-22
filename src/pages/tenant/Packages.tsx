import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Bar, Card, Field, Modal, PageHeader, Stat, Tabs } from '../../components/ui';
import { fullName, usePatientMap } from '../../lib/hooks';
import type { PackageDef } from '../../lib/types';
import { fmtDate, uid, usd } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

type TabKey = 'catalog' | 'sold' | 'gift';

export default function Packages() {
  const tenant = useTenant()!;
  const defs = useT('packageDefs');
  const sold = useT('patientPackages');
  const gcs = useT('giftCards');
  const services = useT('services');
  const patients = usePatientMap();
  const { insert, remove } = useDB.getState();
  const [tab, setTab] = useState<TabKey>('catalog');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Omit<PackageDef, 'id' | 'tenantId'>>({ name: '', serviceId: services[0]?.id ?? '', sessions: 6, price: 0, validityDays: 365, kind: 'package' });
  const svc = services.find((s) => s.id === f.serviceId);
  const fullPrice = (svc?.price ?? 0) * f.sessions;
  const active = sold.filter((p) => p.remaining > 0 && new Date(p.expires) > new Date());
  const liability = active.reduce((s, p) => {
    const d = defs.find((x) => x.id === p.packageId);
    return s + (d ? (d.price / d.sessions) * p.remaining : 0);
  }, 0);

  return (
    <>
      <PageHeader
        title="Packages, memberships & gift cards"
        subtitle="Prepaid revenue. Sessions are redeemed at checkout or from the patient profile."
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={15} /> New package
          </button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active packages" value={active.length} />
        <Stat label="Unused sessions value" value={usd(liability)} hint="Prepaid, still owed as service" />
        <Stat label="Gift cards outstanding" value={usd(gcs.reduce((s, g) => s + g.balance, 0))} />
        <Stat label="Gift cards sold" value={gcs.length} />
      </div>
      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'catalog', label: 'Catalog' },
          { key: 'sold', label: `Sold (${sold.length})` },
          { key: 'gift', label: `Gift cards (${gcs.length})` },
        ]}
      />
      {tab === 'catalog' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {defs.map((d) => {
            const s = services.find((x) => x.id === d.serviceId);
            const save = s ? s.price * d.sessions - d.price : 0;
            return (
              <div key={d.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <Badge className={d.kind === 'membership' ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-brand-50 text-brand-700 ring-brand-200'}>{d.kind}</Badge>
                  <button className="text-ink-300 hover:text-rose-500" onClick={() => remove('packageDefs', d.id)} aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-3 font-semibold text-ink-900">{d.name}</div>
                <div className="text-sm text-ink-500">
                  {d.kind === 'membership' ? `${d.sessions} visit per ${d.validityDays} days` : `${d.sessions} × ${s?.name}`} · valid {d.validityDays} days
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-semibold text-brand-700">{usd(d.price)}</span>
                  {save > 0 && <span className="text-xs text-ink-400">client saves {usd(save)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'sold' && (
        <Card pad={false}>
          <table className="w-full">
            <thead className="border-b border-ink-100">
              <tr>
                <th className="th">Patient</th>
                <th className="th">Package</th>
                <th className="th w-48">Sessions left</th>
                <th className="th">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {sold.map((p) => {
                const d = defs.find((x) => x.id === p.packageId);
                return (
                  <tr key={p.id}>
                    <td className="td">
                      <Link className="font-medium hover:text-brand-700" to={`/app/patients/${p.patientId}`}>
                        {fullName(patients.get(p.patientId))}
                      </Link>
                    </td>
                    <td className="td">{d?.name}</td>
                    <td className="td">
                      <div className="mb-1 text-xs">
                        {p.remaining}/{d?.sessions}
                      </div>
                      <Bar value={p.remaining} max={d?.sessions ?? 1} />
                    </td>
                    <td className="td text-ink-500">{fmtDate(p.expires)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      {tab === 'gift' && (
        <Card pad={false}>
          <table className="w-full">
            <thead className="border-b border-ink-100">
              <tr>
                <th className="th">Code</th>
                <th className="th">Bought by</th>
                <th className="th">Date</th>
                <th className="th text-end">Value</th>
                <th className="th text-end">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {gcs.map((g) => (
                <tr key={g.id}>
                  <td className="td font-mono text-sm font-medium">{g.code}</td>
                  <td className="td">{g.buyer ?? '—'}</td>
                  <td className="td text-ink-500">{fmtDate(g.createdAt)}</td>
                  <td className="td text-end">{usd(g.initial)}</td>
                  <td className="td text-end font-medium">{g.balance ? usd(g.balance, 2) : <Badge>Used</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-ink-100 px-5 py-3 text-xs text-ink-400">Sell new gift cards from the POS. Redeem them at checkout with the code.</p>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New package or membership"
        footer={
          <button
            className="btn-primary"
            disabled={!f.name || !f.price}
            onClick={() => {
              insert('packageDefs', { id: uid('pk'), tenantId: tenant.id, ...f });
              setOpen(false);
            }}
          >
            Create
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as PackageDef['kind'], ...(e.target.value === 'membership' ? { sessions: 1, validityDays: 30 } : {}) })}>
              <option value="package">Session package</option>
              <option value="membership">Monthly membership</option>
            </select>
          </Field>
          <Field label="Name">
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. 6 laser sessions" />
          </Field>
          <Field label="Service included">
            <select className="input" value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({usd(s.price)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sessions">
            <input className="input" type="number" min={1} value={f.sessions} onChange={(e) => setF({ ...f, sessions: +e.target.value })} />
          </Field>
          <Field label={`Price ($) · full price ${usd(fullPrice)}`}>
            <input className="input" type="number" value={f.price} onChange={(e) => setF({ ...f, price: +e.target.value })} />
          </Field>
          <Field label="Valid for (days)">
            <input className="input" type="number" value={f.validityDays} onChange={(e) => setF({ ...f, validityDays: +e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

import { Minus, Plus, Printer, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Modal, PageHeader, Tabs } from '../../components/ui';
import { fullName, useCan } from '../../lib/hooks';
import type { Invoice, InvoiceItem, Payment, PaymentMethod } from '../../lib/types';
import { cx, fmtDateTime, lbp, METHOD_LABEL, usd } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

type Cat = 'services' | 'products' | 'packages' | 'gift';
const METHODS: PaymentMethod[] = ['cash_usd', 'cash_lbp', 'card', 'whish', 'omt', 'bank', 'gift_card'];

export default function POS() {
  const tenant = useTenant()!;
  const can = useCan();
  const [params] = useSearchParams();
  const services = useT('services');
  const products = useT('products').filter((p) => p.retail);
  const defs = useT('packageDefs');
  const patients = useT('patients');
  const appts = useT('appointments');
  const staff = useT('staff');
  const pkgs = useT('patientPackages');
  const gcs = useT('giftCards');
  const { checkout, patch } = useDB.getState();

  const [cat, setCat] = useState<Cat>('services');
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [patientId, setPatientId] = useState<string>('');
  const [apptId, setApptId] = useState<string | undefined>();
  const [pq, setPq] = useState('');
  const [discount, setDiscount] = useState(0);
  const [vatOn, setVatOn] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pm, setPm] = useState<{ method: PaymentMethod; amount: string; code: string }>({ method: 'cash_usd', amount: '', code: '' });
  const [receipt, setReceipt] = useState<Invoice | null>(null);
  const [usePkg, setUsePkg] = useState<Record<number, string>>({});

  // prefill from appointment or patient link
  useEffect(() => {
    const a = appts.find((x) => x.id === params.get('appointment'));
    if (a) {
      const s = services.find((x) => x.id === a.serviceId);
      setPatientId(a.patientId);
      setApptId(a.id);
      if (s) setCart([{ kind: 'service', refId: s.id, name: s.name, qty: 1, price: s.price, staffId: a.staffId }]);
      if (a.deposit) setPayments([{ method: 'cash_usd', currency: 'USD', amount: a.deposit, amountUSD: a.deposit }]);
    } else if (params.get('patient')) setPatientId(params.get('patient')!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = (it: InvoiceItem) =>
    setCart((c) => {
      const i = c.findIndex((x) => x.refId === it.refId && x.kind === it.kind && it.kind !== 'gift_card');
      if (i >= 0) return c.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x));
      return [...c, it];
    });

  const patientPkgs = pkgs.filter((p) => p.patientId === patientId && p.remaining > 0 && new Date(p.expires) > new Date());
  const lineTotal = (it: InvoiceItem, i: number) => (usePkg[i] ? 0 : it.price * it.qty);
  const sub = cart.reduce((s, it, i) => s + lineTotal(it, i), 0);
  const afterDisc = Math.max(0, sub - discount);
  const vat = vatOn ? Math.round(afterDisc * tenant.vatRate) / 100 : 0;
  const total = afterDisc + vat;
  const paid = payments.reduce((s, p) => s + p.amountUSD, 0);
  const remaining = Math.max(0, +(total - paid).toFixed(2));
  const change = Math.max(0, paid - total);

  const addPayment = () => {
    const amt = parseFloat(pm.amount || (pm.method === 'cash_lbp' ? String(remaining * tenant.exchangeRate) : String(remaining)));
    if (!amt) return;
    if (pm.method === 'gift_card') {
      const g = gcs.find((x) => x.code.toLowerCase() === pm.code.trim().toLowerCase());
      if (!g) return alert('Gift card not found');
      const use = Math.min(g.balance, amt);
      if (use <= 0) return alert('Gift card has no balance');
      patch('giftCards', g.id, { balance: +(g.balance - use).toFixed(2) });
      setPayments([...payments, { method: 'gift_card', currency: 'USD', amount: use, amountUSD: use }]);
    } else {
      const lbpPay = pm.method === 'cash_lbp';
      setPayments([...payments, { method: pm.method, currency: lbpPay ? 'LBP' : 'USD', amount: amt, amountUSD: lbpPay ? +(amt / tenant.exchangeRate).toFixed(2) : amt }]);
    }
    setPm({ ...pm, amount: '', code: '' });
  };

  const complete = () => {
    // redeem package sessions used in this sale
    Object.values(usePkg).forEach((ppId) => {
      const p = pkgs.find((x) => x.id === ppId);
      if (p) patch('patientPackages', p.id, { remaining: p.remaining - 1 });
    });
    const items = cart.map((it, i) => (usePkg[i] ? { ...it, price: 0, name: `${it.name} (package session)` } : it));
    const inv = checkout({ patientId: patientId || undefined, appointmentId: apptId, items, discount, vat, total, payments: [...payments, ...(Object.keys(usePkg).length ? [{ method: 'package' as const, currency: 'USD' as const, amount: 0, amountUSD: 0 }] : [])] });
    setReceipt(inv);
    setCart([]);
    setPayments([]);
    setDiscount(0);
    setApptId(undefined);
    setUsePkg({});
  };

  const catalog = useMemo(() => {
    const ql = q.toLowerCase();
    if (cat === 'services') return services.filter((s) => s.name.toLowerCase().includes(ql)).map((s) => ({ id: s.id, name: s.name, sub: `${s.category} · ${s.duration}′`, price: s.price, item: { kind: 'service' as const, refId: s.id, name: s.name, qty: 1, price: s.price, staffId: staff[0]?.id } }));
    if (cat === 'products') return products.filter((s) => s.name.toLowerCase().includes(ql)).map((s) => ({ id: s.id, name: s.name, sub: `${s.stock} in stock`, price: s.price, item: { kind: 'product' as const, refId: s.id, name: s.name, qty: 1, price: s.price } }));
    if (cat === 'packages') return defs.filter((s) => s.name.toLowerCase().includes(ql)).map((s) => ({ id: s.id, name: s.name, sub: s.kind === 'membership' ? `Membership · ${s.validityDays} days` : `${s.sessions} sessions · valid ${s.validityDays} days`, price: s.price, item: { kind: s.kind, refId: s.id, name: s.name, qty: 1, price: s.price } }));
    return [25, 50, 100, 150, 200, 300].map((v) => ({ id: 'gc' + v, name: `Gift card ${usd(v)}`, sub: 'Digital or printed', price: v, item: { kind: 'gift_card' as const, refId: 'gc' + v, name: `Gift card ${usd(v)}`, qty: 1, price: v } }));
  }, [cat, q, services, products, defs, staff]);

  const matches = pq ? patients.filter((p) => (fullName(p) + p.phone).toLowerCase().includes(pq.toLowerCase())).slice(0, 5) : [];
  const customer = patients.find((p) => p.id === patientId);

  return (
    <>
      <PageHeader title="Point of sale" subtitle={`Rate: $1 = ${tenant.exchangeRate.toLocaleString()} LBP · change it in Settings`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div>
          <Tabs<Cat>
            value={cat}
            onChange={setCat}
            tabs={[
              { key: 'services', label: 'Services' },
              { key: 'products', label: 'Products' },
              ...(can('packages') ? [{ key: 'packages' as const, label: 'Packages' }, { key: 'gift' as const, label: 'Gift cards' }] : []),
            ]}
          />
          <div className="relative mb-4 max-w-xs">
            <Search size={15} className="absolute start-3 top-2.5 text-ink-300" />
            <input className="input ps-9" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {catalog.map((c) => (
              <button key={c.id} onClick={() => add(c.item)} className="card p-3.5 text-start transition hover:border-brand-300 hover:shadow-md">
                <div className="text-sm font-medium leading-snug text-ink-800">{c.name}</div>
                <div className="mt-0.5 text-xs text-ink-400">{c.sub}</div>
                <div className="mt-2 font-semibold text-brand-700">{usd(c.price)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card flex flex-col self-start lg:sticky lg:top-6">
          <div className="border-b border-ink-100 p-4">
            {customer ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{fullName(customer)}</div>
                  <div className="text-xs text-ink-400">{customer.phone}</div>
                </div>
                <button className="btn-ghost btn-sm" onClick={() => setPatientId('')} aria-label="Remove customer">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input className="input" placeholder="Customer (optional – walk-in)" value={pq} onChange={(e) => setPq(e.target.value)} />
                {matches.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-lg border border-ink-100 bg-white shadow-lg">
                    {matches.map((p) => (
                      <li key={p.id}>
                        <button
                          className="w-full px-3 py-2 text-start text-sm hover:bg-sand-50"
                          onClick={() => {
                            setPatientId(p.id);
                            setPq('');
                          }}
                        >
                          {fullName(p)} <span className="text-ink-400">{p.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="scrollbar-thin max-h-72 flex-1 divide-y divide-ink-50 overflow-y-auto">
            {cart.length === 0 && <p className="p-6 text-center text-sm text-ink-400">Tap items to add them.</p>}
            {cart.map((it, i) => {
              const avail = it.kind === 'service' ? patientPkgs.filter((p) => defs.find((d) => d.id === p.packageId)?.serviceId === it.refId) : [];
              return (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-ink-800">{it.name}</div>
                      {it.kind === 'service' && (
                        <select className="mt-1 rounded border border-ink-100 bg-white px-1 py-0.5 text-xs text-ink-500" value={it.staffId} onChange={(e) => setCart(cart.map((x, j) => (j === i ? { ...x, staffId: e.target.value } : x)))}>
                          {staff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="rounded p-1 hover:bg-ink-50" onClick={() => setCart(cart.map((x, j) => (j === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} aria-label="Less">
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-sm">{it.qty}</span>
                      <button className="rounded p-1 hover:bg-ink-50" onClick={() => setCart(cart.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)))} aria-label="More">
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="w-16 text-end text-sm font-medium">{usd(lineTotal(it, i))}</div>
                    <button className="text-ink-300 hover:text-rose-500" onClick={() => setCart(cart.filter((_, j) => j !== i))} aria-label="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {avail.length > 0 && (
                    <label className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-700">
                      <input
                        type="checkbox"
                        checked={!!usePkg[i]}
                        onChange={(e) => {
                          const n = { ...usePkg };
                          if (e.target.checked) n[i] = avail[0].id;
                          else delete n[i];
                          setUsePkg(n);
                        }}
                      />
                      Use package session ({avail[0].remaining} left)
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 border-t border-ink-100 p-4 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span>
              <span>{usd(sub, 2)}</span>
            </div>
            <div className="flex items-center justify-between text-ink-500">
              <span>Discount ($)</span>
              <input type="number" min={0} className="w-20 rounded border border-ink-200 px-2 py-0.5 text-end" value={discount} onChange={(e) => setDiscount(+e.target.value)} />
            </div>
            <label className="flex items-center justify-between text-ink-500">
              <span>
                <input type="checkbox" className="me-1.5" checked={vatOn} onChange={(e) => setVatOn(e.target.checked)} />
                VAT {tenant.vatRate}%
              </span>
              <span>{usd(vat, 2)}</span>
            </label>
            <div className="flex items-end justify-between border-t border-ink-100 pt-2">
              <span className="font-semibold">Total</span>
              <span className="text-end">
                <span className="block text-xl font-semibold text-ink-900">{usd(total, 2)}</span>
                <span className="text-xs text-ink-400">{lbp(total * tenant.exchangeRate)}</span>
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t border-ink-100 bg-sand-50 p-4">
            {payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{METHOD_LABEL[p.method]}</span>
                <span className="flex items-center gap-2">
                  {p.currency === 'LBP' ? lbp(p.amount) : usd(p.amount, 2)}
                  <button onClick={() => setPayments(payments.filter((_, j) => j !== i))} className="text-ink-300 hover:text-rose-500" aria-label="Remove payment">
                    <X size={13} />
                  </button>
                </span>
              </div>
            ))}
            <div className="flex gap-1.5">
              <select className="input py-1.5 text-xs" value={pm.method} onChange={(e) => setPm({ ...pm, method: e.target.value as PaymentMethod })}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
              {pm.method === 'gift_card' && <input className="input py-1.5 text-xs" placeholder="Code" value={pm.code} onChange={(e) => setPm({ ...pm, code: e.target.value })} />}
              <input className="input w-28 py-1.5 text-xs" placeholder={pm.method === 'cash_lbp' ? String(Math.round(remaining * tenant.exchangeRate)) : String(remaining)} value={pm.amount} onChange={(e) => setPm({ ...pm, amount: e.target.value })} />
              <button className="btn-secondary btn-sm" onClick={addPayment} disabled={!cart.length}>
                Add
              </button>
            </div>
            <div className="flex justify-between text-xs">
              <span className={remaining > 0 ? 'text-rose-600' : 'text-brand-700'}>{remaining > 0 ? `Remaining ${usd(remaining, 2)} · ${lbp(remaining * tenant.exchangeRate)}` : 'Fully paid'}</span>
              {change > 0 && <span className="font-medium text-amber-700">Change {usd(change, 2)}</span>}
            </div>
            <button className="btn-primary mt-1 w-full py-2.5" disabled={!cart.length} onClick={complete}>
              {remaining > 0 && payments.length ? 'Complete (partial payment)' : remaining > 0 && total > 0 ? 'Complete (unpaid – on account)' : 'Complete sale'}
            </button>
          </div>
        </div>
      </div>
      <Receipt inv={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}

export function Receipt({ inv, onClose }: { inv: Invoice | null; onClose: () => void }) {
  const tenant = useTenant()!;
  const patients = useT('patients');
  const gcs = useT('giftCards');
  if (!inv) return null;
  const p = patients.find((x) => x.id === inv.patientId);
  const newCards = gcs.filter((g) => g.createdAt === inv.createdAt);
  return (
    <Modal
      open
      onClose={onClose}
      title="Receipt"
      footer={
        <>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-xs font-mono text-xs text-ink-800">
        <div className="text-center">
          <div className="font-sans text-base font-semibold">{tenant.name}</div>
          <div>{tenant.city}</div>
          <div>{tenant.phone}</div>
          <div className="mt-2">
            {inv.number} · {fmtDateTime(inv.createdAt)}
          </div>
          <div>{p ? fullName(p) : 'Walk-in'}</div>
        </div>
        <div className="my-3 border-t border-dashed border-ink-300" />
        {inv.items.map((it, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span>
              {it.qty}× {it.name}
            </span>
            <span>{usd(it.price * it.qty, 2)}</span>
          </div>
        ))}
        <div className="my-3 border-t border-dashed border-ink-300" />
        {inv.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{usd(inv.discount, 2)}</span>
          </div>
        )}
        {inv.vat > 0 && (
          <div className="flex justify-between">
            <span>VAT</span>
            <span>{usd(inv.vat, 2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{usd(inv.total, 2)}</span>
        </div>
        <div className="flex justify-between text-ink-500">
          <span />
          <span>{lbp(inv.total * tenant.exchangeRate)}</span>
        </div>
        <div className="my-3 border-t border-dashed border-ink-300" />
        {inv.payments
          .filter((x) => x.method !== 'package')
          .map((x, i) => (
            <div key={i} className="flex justify-between">
              <span>{METHOD_LABEL[x.method]}</span>
              <span>{x.currency === 'LBP' ? lbp(x.amount) : usd(x.amount, 2)}</span>
            </div>
          ))}
        {newCards.map((g) => (
          <div key={g.id} className="mt-3 rounded border border-ink-300 p-2 text-center">
            Gift card <b>{g.code}</b> · {usd(g.initial)}
          </div>
        ))}
        <p className={cx('mt-4 text-center', inv.status !== 'paid' && 'font-bold text-rose-600')}>{inv.status === 'paid' ? 'Thank you!' : `Status: ${inv.status.toUpperCase()}`}</p>
      </div>
    </Modal>
  );
}

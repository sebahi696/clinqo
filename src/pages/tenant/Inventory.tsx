import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge, Field, Modal, PageHeader, Stat } from '../../components/ui';
import type { Product } from '../../lib/types';
import { fmtDate, uid, usd } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

export default function Inventory() {
  const tenant = useTenant()!;
  const products = useT('products');
  const { patch, insert, log } = useDB.getState();
  const [filter, setFilter] = useState<'all' | 'low' | 'retail' | 'consumable' | 'expiring'>('all');
  const [open, setOpen] = useState(false);
  const blank = { name: '', sku: '', category: 'Retail', price: 0, cost: 0, stock: 0, lowStock: 5, retail: true, lot: '', expiry: '' };
  const [f, setF] = useState(blank);
  const soon = (p: Product) => !!p.expiry && new Date(p.expiry).getTime() - Date.now() < 60 * 864e5;
  const list = products.filter((p) => (filter === 'all' ? true : filter === 'low' ? p.stock <= p.lowStock : filter === 'retail' ? p.retail : filter === 'consumable' ? !p.retail : soon(p)));
  const adjust = (p: Product, d: number) => {
    patch('products', p.id, { stock: Math.max(0, p.stock + d) });
    log(`Stock ${d > 0 ? '+' : ''}${d} ${p.name}`, tenant.id);
  };

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Retail products and clinical consumables, with lot numbers and expiry for injectables and implants."
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={15} /> Add product
          </button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Products" value={products.length} />
        <Stat label="Stock value (cost)" value={usd(products.reduce((s, p) => s + p.cost * p.stock, 0))} />
        <Stat label="Low stock" value={products.filter((p) => p.stock <= p.lowStock).length} tone="bad" />
        <Stat label="Expiring in 60 days" value={products.filter(soon).length} tone={products.some(soon) ? 'bad' : 'default'} />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(['all', 'low', 'retail', 'consumable', 'expiring'] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === k ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-100'}`}>
            {k === 'all' ? 'All' : k === 'low' ? 'Low stock' : k === 'retail' ? 'Retail' : k === 'consumable' ? 'Consumables' : 'Expiring'}
          </button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-ink-100">
            <tr>
              <th className="th">Product</th>
              <th className="th">Type</th>
              <th className="th">Lot / expiry</th>
              <th className="th text-end">Cost</th>
              <th className="th text-end">Price</th>
              <th className="th text-center">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {list.map((p) => (
              <tr key={p.id}>
                <td className="td">
                  <div className="font-medium text-ink-800">{p.name}</div>
                  <div className="text-xs text-ink-400">{p.sku}</div>
                </td>
                <td className="td">
                  <Badge className={p.retail ? 'bg-brand-50 text-brand-700 ring-brand-200' : undefined}>{p.retail ? 'Retail' : p.category}</Badge>
                </td>
                <td className="td text-xs">
                  {p.lot ? (
                    <>
                      <div>{p.lot}</div>
                      <div className={soon(p) ? 'font-medium text-rose-600' : 'text-ink-400'}>{p.expiry && `exp. ${fmtDate(p.expiry)}`}</div>
                    </>
                  ) : (
                    <span className="text-ink-300">—</span>
                  )}
                </td>
                <td className="td text-end text-ink-500">{usd(p.cost)}</td>
                <td className="td text-end">{p.retail ? usd(p.price) : <span className="text-ink-300">—</span>}</td>
                <td className="td">
                  <div className="flex items-center justify-center gap-2">
                    <button className="rounded border border-ink-100 p-1 hover:bg-ink-50" onClick={() => adjust(p, -1)} aria-label="Remove one">
                      <Minus size={12} />
                    </button>
                    <span className={`w-8 text-center font-semibold ${p.stock <= p.lowStock ? 'text-rose-600' : 'text-ink-800'}`}>{p.stock}</span>
                    <button className="rounded border border-ink-100 p-1 hover:bg-ink-50" onClick={() => adjust(p, 1)} aria-label="Add one">
                      <Plus size={12} />
                    </button>
                    <button className="btn-ghost btn-sm text-xs" onClick={() => adjust(p, 10)}>
                      +10
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add product"
        footer={
          <button
            className="btn-primary"
            disabled={!f.name}
            onClick={() => {
              insert('products', { ...f, id: uid('pr'), tenantId: tenant.id, lot: f.lot || undefined, expiry: f.expiry || undefined, sku: f.sku || f.name.slice(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 900 + 100) });
              setF(blank);
              setOpen(false);
            }}
          >
            Save
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Type">
            <select className="input" value={f.retail ? 'retail' : 'consumable'} onChange={(e) => setF({ ...f, retail: e.target.value === 'retail', category: e.target.value === 'retail' ? 'Retail' : 'Consumable' })}>
              <option value="retail">Retail (sold to clients)</option>
              <option value="consumable">Consumable (used in treatments)</option>
            </select>
          </Field>
          <Field label="SKU">
            <input className="input" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} />
          </Field>
          <Field label="Cost ($)">
            <input className="input" type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: +e.target.value })} />
          </Field>
          <Field label="Sale price ($)">
            <input className="input" type="number" value={f.price} disabled={!f.retail} onChange={(e) => setF({ ...f, price: +e.target.value })} />
          </Field>
          <Field label="Stock">
            <input className="input" type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: +e.target.value })} />
          </Field>
          <Field label="Low stock alert at">
            <input className="input" type="number" value={f.lowStock} onChange={(e) => setF({ ...f, lowStock: +e.target.value })} />
          </Field>
          <Field label="Lot number">
            <input className="input" value={f.lot} onChange={(e) => setF({ ...f, lot: e.target.value })} />
          </Field>
          <Field label="Expiry date">
            <input className="input" type="date" value={f.expiry} onChange={(e) => setF({ ...f, expiry: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

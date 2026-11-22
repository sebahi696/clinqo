import { Check, Lock, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card, Field, PageHeader, Tabs } from '../../components/ui';
import { MODULES, PRESETS } from '../../lib/modules';
import type { Lang } from '../../lib/types';
import { lbp, uid, usd } from '../../lib/utils';
import { useDB, useT, useTenant } from '../../store/db';

type TabKey = 'business' | 'money' | 'services' | 'plan';

export default function Settings() {
  const tenant = useTenant()!;
  const services = useT('services');
  const { updateTenant, patch, insert, remove, setLang } = useDB.getState();
  const lang = useDB((s) => s.session.lang);
  const [tab, setTab] = useState<TabKey>('business');
  const [n, setN] = useState({ name: '', category: '', duration: 30, price: 0, recallDays: 0 });

  return (
    <>
      <PageHeader title="Settings" />
      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'business', label: 'Business' },
          { key: 'money', label: 'Currency & tax' },
          { key: 'services', label: `Services (${services.length})` },
          { key: 'plan', label: 'Plan & modules' },
        ]}
      />
      {tab === 'business' && (
        <Card>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <Field label="Business name">
              <input className="input" value={tenant.name} onChange={(e) => updateTenant(tenant.id, { name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="input" value={tenant.phone} onChange={(e) => updateTenant(tenant.id, { phone: e.target.value })} />
            </Field>
            <Field label="Address / area">
              <input className="input" value={tenant.city} onChange={(e) => updateTenant(tenant.id, { city: e.target.value })} />
            </Field>
            <Field label="WhatsApp number">
              <input className="input" value={tenant.whatsappNumber ?? ''} onChange={(e) => updateTenant(tenant.id, { whatsappNumber: e.target.value })} />
            </Field>
            <Field label="Interface language">
              <select className="input" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
              </select>
            </Field>
            <Field label="Brand colour">
              <input type="color" className="h-10 w-20 rounded border border-ink-200" value={tenant.brandColor} onChange={(e) => updateTenant(tenant.id, { brandColor: e.target.value })} />
            </Field>
          </div>
        </Card>
      )}
      {tab === 'money' && (
        <Card>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <Field label="Main currency">
              <input className="input" value="USD" disabled />
            </Field>
            <Field label="Second currency">
              <input className="input" value="LBP" disabled />
            </Field>
            <Field label="Exchange rate (LBP per $1)">
              <input className="input" type="number" value={tenant.exchangeRate} onChange={(e) => updateTenant(tenant.id, { exchangeRate: +e.target.value })} />
            </Field>
            <Field label="VAT rate (%)">
              <input className="input" type="number" value={tenant.vatRate} onChange={(e) => updateTenant(tenant.id, { vatRate: +e.target.value })} />
            </Field>
          </div>
          <p className="mt-4 text-sm text-ink-500">
            Example: {usd(100)} = {lbp(100 * tenant.exchangeRate)}. VAT is off by default at checkout; switch it on per sale. Confirm your VAT registration and rate with your accountant.
          </p>
        </Card>
      )}
      {tab === 'services' && (
        <Card pad={false}>
          <table className="w-full">
            <thead className="border-b border-ink-100">
              <tr>
                <th className="th">Service</th>
                <th className="th">Category</th>
                <th className="th">Minutes</th>
                <th className="th">Price ($)</th>
                <th className="th">Recall (days)</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="td">
                    <input className="input py-1" value={s.name} onChange={(e) => patch('services', s.id, { name: e.target.value })} />
                  </td>
                  <td className="td">
                    <input className="input py-1" value={s.category} onChange={(e) => patch('services', s.id, { category: e.target.value })} />
                  </td>
                  <td className="td w-24">
                    <input className="input py-1" type="number" value={s.duration} onChange={(e) => patch('services', s.id, { duration: +e.target.value })} />
                  </td>
                  <td className="td w-28">
                    <input className="input py-1" type="number" value={s.price} onChange={(e) => patch('services', s.id, { price: +e.target.value })} />
                  </td>
                  <td className="td w-28">
                    <input className="input py-1" type="number" value={s.recallDays ?? ''} onChange={(e) => patch('services', s.id, { recallDays: +e.target.value || undefined })} />
                  </td>
                  <td className="td">
                    <button className="text-ink-300 hover:text-rose-500" onClick={() => remove('services', s.id)} aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-sand-50">
                <td className="td">
                  <input className="input py-1" placeholder="New service" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
                </td>
                <td className="td">
                  <input className="input py-1" value={n.category} onChange={(e) => setN({ ...n, category: e.target.value })} />
                </td>
                <td className="td">
                  <input className="input py-1" type="number" value={n.duration} onChange={(e) => setN({ ...n, duration: +e.target.value })} />
                </td>
                <td className="td">
                  <input className="input py-1" type="number" value={n.price} onChange={(e) => setN({ ...n, price: +e.target.value })} />
                </td>
                <td className="td">
                  <input className="input py-1" type="number" value={n.recallDays} onChange={(e) => setN({ ...n, recallDays: +e.target.value })} />
                </td>
                <td className="td">
                  <button
                    className="btn-primary btn-sm"
                    disabled={!n.name}
                    onClick={() => {
                      insert('services', { id: uid('sv'), tenantId: tenant.id, ...n, recallDays: n.recallDays || undefined });
                      setN({ name: '', category: '', duration: 30, price: 0, recallDays: 0 });
                    }}
                    aria-label="Add service"
                  >
                    <Plus size={13} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}
      {tab === 'plan' && (
        <Card title={`${PRESETS[tenant.plan].label} · ${usd(tenant.monthlyFeeUSD)}/month`}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {MODULES.map((m) => (
              <li key={m.key} className="flex items-center gap-2 text-sm">
                {tenant.modules[m.key] ? <Check size={15} className="text-brand-600" /> : <Lock size={14} className="text-ink-300" />}
                <span className={tenant.modules[m.key] ? 'text-ink-800' : 'text-ink-400'}>{m.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-ink-500">Need another module? Ask your Clinqo account manager. Modules are switched on from the Clinqo admin panel.</p>
        </Card>
      )}
    </>
  );
}

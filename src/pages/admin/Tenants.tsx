import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, PageHeader } from '../../components/ui';
import { MODULES, PRESETS } from '../../lib/modules';
import { fmtDate, usd } from '../../lib/utils';
import { useDB } from '../../store/db';
import { statusStyle } from './Overview';

export default function Tenants() {
  const tenants = useDB((s) => s.tenants);
  const openTenant = useDB((s) => s.openTenant);
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const list = tenants.filter((t) => (t.name + t.city + t.ownerName).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Tenants"
        subtitle="Each clinic or spa is an isolated tenant. Switch modules on or off to match their business model."
        actions={
          <Link to="/admin/tenants/new" className="btn-primary">
            <Plus size={15} /> New tenant
          </Link>
        }
      />
      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute start-3 top-2.5 text-ink-300" />
        <input className="input ps-9" placeholder="Search tenants" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((t) => (
          <div key={t.id} className="card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ background: t.brandColor }}>
                {t.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <Link to={`/admin/tenants/${t.id}`} className="font-semibold text-ink-900 hover:text-brand-700">
                  {t.name}
                </Link>
                <div className="text-xs text-ink-500">
                  {t.vertical} · {t.city} · since {fmtDate(t.createdAt)}
                </div>
              </div>
              <Badge className={statusStyle[t.status]}>{t.status}</Badge>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-ink-600">{t.businessModel}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {MODULES.map((m) => (
                <span key={m.key} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${t.modules[m.key] ? 'bg-brand-50 text-brand-700' : 'bg-ink-50 text-ink-300 line-through'}`}>
                  {m.label.split(' ')[0]}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-ink-50 pt-3 text-sm">
              <span className="text-ink-500">
                {PRESETS[t.plan].label} · <span className="font-medium text-ink-800">{usd(t.monthlyFeeUSD)}/mo</span>
              </span>
              <div className="flex gap-2">
                <Link to={`/admin/tenants/${t.id}?tab=features`} className="btn-secondary btn-sm">
                  Features
                </Link>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => {
                    openTenant(t.id);
                    nav('/app');
                  }}
                >
                  Open as tenant
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

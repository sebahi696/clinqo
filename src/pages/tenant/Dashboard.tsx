import { AlertTriangle, CalendarDays, DollarSign, PhoneCall, UserPlus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Avatar, Badge, Bar, Card, PageHeader, Stat } from '../../components/ui';
import { fullName, useCan, useLookup, usePatientMap } from '../../lib/hooks';
import { campaignFunnels, revenueByDay, sumFunnels } from '../../lib/metrics';
import { ago, fmtTime, pct, sameDay, SOURCE_LABEL, STATUS_LABEL, STATUS_STYLE, usd } from '../../lib/utils';
import type { LeadSource } from '../../lib/types';
import { useDB, useMe, useT, useTenant } from '../../store/db';

export default function Dashboard() {
  const tenant = useTenant()!;
  const me = useMe()!;
  const can = useCan();
  const appts = useT('appointments');
  const invoices = useT('invoices');
  const leads = useT('leads');
  const products = useT('products');
  const patients = usePatientMap();
  const lk = useLookup();
  const db = useDB();
  const now = new Date();

  const today = appts.filter((a) => sameDay(new Date(a.start), now) && a.status !== 'cancelled').sort((a, b) => a.start.localeCompare(b.start));
  const revToday = invoices.filter((i) => sameDay(new Date(i.createdAt), now)).reduce((s, i) => s + i.total, 0);
  const newLeads = leads.filter((l) => Date.now() - new Date(l.createdAt).getTime() < 864e5).length;
  const waiting = leads.filter((l) => l.stage === 'new');
  const oldest = waiting.reduce<string | undefined>((m, l) => (!m || l.createdAt < m ? l.createdAt : m), undefined);
  const series = useMemo(() => revenueByDay(invoices, 30), [invoices]);
  const rev30 = series.reduce((s, d) => s + d.revenue, 0);
  const past30 = appts.filter((a) => new Date(a.start) < now && Date.now() - new Date(a.start).getTime() < 30 * 864e5);
  const noShow = past30.filter((a) => a.status === 'no_show').length / Math.max(1, past30.length);
  const low = products.filter((p) => p.stock <= p.lowStock);
  const f = sumFunnels(campaignFunnels(db, tenant.id));

  const bySource = useMemo(() => {
    const m = new Map<LeadSource, number>();
    for (const l of leads) m.set(l.source, (m.get(l.source) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [leads]);
  const maxSrc = Math.max(1, ...bySource.map((x) => x[1]));
  const hour = now.getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader title={`${hello}, ${me.name.split(' ').slice(0, 2).join(' ')}`} subtitle={`${tenant.name} · ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {can('appointments') && <Stat label="Appointments today" value={today.length} hint={`${today.filter((a) => a.status === 'confirmed').length} confirmed`} icon={<CalendarDays size={16} />} />}
        {can('pos') && <Stat label="Revenue today" value={usd(revToday)} hint={`${usd(rev30)} last 30 days`} icon={<DollarSign size={16} />} tone="brand" />}
        {can('crm') && <Stat label="New leads (24h)" value={newLeads} hint={`${leads.filter((l) => l.source === 'meta_ads' && Date.now() - new Date(l.createdAt).getTime() < 864e5).length} from Meta lead ads`} icon={<UserPlus size={16} />} />}
        {can('crm') && <Stat label="Leads to call now" value={waiting.length} tone={waiting.length ? 'bad' : 'good'} hint={waiting.length ? <Link to="/app/leads" className="underline">Oldest waiting {ago(oldest!)}</Link> : 'All leads contacted'} icon={<PhoneCall size={16} />} />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {can('pos') ? (
          <Card title="Revenue, last 30 days" actions={<span className="text-xs text-ink-400">No-show rate {pct(noShow)}</span>}>
            <div className="h-60">
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ left: -10, right: 6, top: 6 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#1f9880" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1f9880" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e8eded" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6f8888' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11, fill: '#6f8888' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => usd(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e8eded', fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#147a68" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <Card title="Leads by source">
            <SourceBars bySource={bySource} max={maxSrc} />
          </Card>
        )}

        {can('appointments') && (
          <Card title="Today's schedule" pad={false} actions={<Link to="/app/calendar" className="btn-ghost btn-sm">Calendar</Link>}>
            <ul className="scrollbar-thin max-h-[290px] divide-y divide-ink-50 overflow-y-auto">
              {today.length === 0 && <li className="p-5 text-sm text-ink-400">No appointments today.</li>}
              {today.map((a) => {
                const st = lk.staff.get(a.staffId);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="w-11 text-xs font-semibold text-ink-500">{fmtTime(a.start)}</span>
                    <Avatar name={st?.name ?? '?'} color={st?.color} size={26} />
                    <div className="min-w-0 flex-1">
                      <Link to={`/app/patients/${a.patientId}`} className="block truncate text-sm font-medium text-ink-800 hover:text-brand-700">
                        {fullName(patients.get(a.patientId))}
                      </Link>
                      <div className="truncate text-xs text-ink-400">{lk.service.get(a.serviceId)?.name}</div>
                    </div>
                    <Badge className={STATUS_STYLE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {can('marketing') && (
          <Card title="Ads performance (to date)" actions={<Link to="/app/marketing" className="btn-ghost btn-sm">Details</Link>}>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-ink-400">Ad spend</dt>
                <dd className="text-lg font-semibold">{usd(f.spend)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400">Revenue from ad patients</dt>
                <dd className="text-lg font-semibold text-brand-700">{usd(f.revenue)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400">Cost per lead</dt>
                <dd className="font-semibold">{usd(f.cpl, 2)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400">Return on ad spend</dt>
                <dd className="font-semibold">{f.roas.toFixed(1)}×</dd>
              </div>
            </dl>
          </Card>
        )}
        {can('crm') && can('pos') && (
          <Card title="Leads by source">
            <SourceBars bySource={bySource} max={maxSrc} />
          </Card>
        )}
        {can('inventory') && (
          <Card title="Stock alerts" actions={<Link to="/app/inventory" className="btn-ghost btn-sm">Inventory</Link>}>
            {low.length === 0 ? (
              <p className="text-sm text-ink-400">All stock levels are fine.</p>
            ) : (
              <ul className="space-y-2">
                {low.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="flex-1 text-ink-700">{p.name}</span>
                    <span className="font-semibold text-rose-600">{p.stock} left</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}

function SourceBars({ bySource, max }: { bySource: [LeadSource, number][]; max: number }) {
  return (
    <ul className="space-y-3">
      {bySource.map(([s, n]) => (
        <li key={s}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-ink-600">{SOURCE_LABEL[s]}</span>
            <span className="font-medium text-ink-800">{n}</span>
          </div>
          <Bar value={n} max={max} color={s === 'meta_ads' ? 'bg-[#0866ff]' : 'bg-brand-500'} />
        </li>
      ))}
    </ul>
  );
}

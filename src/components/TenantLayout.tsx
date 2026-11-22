import {
  BarChart3,
  Boxes,
  CalendarDays,
  ContactRound,
  CreditCard,
  Gift,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  Workflow,
  Funnel,
} from 'lucide-react';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useI18n, type TKey } from '../i18n';
import { canAccess, ROLE_LABEL } from '../lib/modules';
import type { Lang, ModuleKey } from '../lib/types';
import { cx } from '../lib/utils';
import { useDB, useMe, useTenant } from '../store/db';
import Logo from './Logo';
import { Avatar } from './ui';

type Item = { to: string; key: TKey; icon: LucideIcon; mod?: ModuleKey; end?: boolean; badge?: number };

export default function TenantLayout() {
  const me = useMe()!;
  const tenant = useTenant()!;
  const session = useDB((s) => s.session);
  const fresh = useDB((s) => s.leads.filter((l) => l.tenantId === s.session.tenantId && l.stage === 'new').length);
  const { logout, exitTenant, setLang } = useDB.getState();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  if (!tenant) return null;
  const role = session.impersonating ? 'super_admin' : me.role;
  const isSpa = tenant.vertical === 'spa';

  const groups: { title: string; items: Item[] }[] = [
    {
      title: '',
      items: [{ to: '/app', key: 'dashboard', icon: LayoutDashboard, end: true }],
    },
    {
      title: t('g_growth'),
      items: [
        { to: '/app/marketing', key: 'marketing', icon: Megaphone, mod: 'marketing' },
        { to: '/app/leads', key: 'leads', icon: Funnel, mod: 'crm', badge: fresh },
        { to: '/app/automations', key: 'automations', icon: Workflow, mod: 'automations' },
      ],
    },
    {
      title: t('g_clinic'),
      items: [
        { to: '/app/calendar', key: 'calendar', icon: CalendarDays, mod: 'appointments' },
        { to: '/app/patients', key: isSpa ? 'clients' : 'patients', icon: ContactRound, mod: 'crm' },
        { to: '/app/inventory', key: 'inventory', icon: Boxes, mod: 'inventory' },
      ],
    },
    {
      title: t('g_money'),
      items: [
        { to: '/app/pos', key: 'pos', icon: CreditCard, mod: 'pos' },
        { to: '/app/invoices', key: 'invoices', icon: ReceiptText, mod: 'pos' },
        { to: '/app/packages', key: 'packages', icon: Gift, mod: 'packages' },
        { to: '/app/finance', key: 'finance', icon: Wallet, mod: 'finance' },
      ],
    },
    {
      title: t('g_team'),
      items: [
        { to: '/app/reports', key: 'reports', icon: BarChart3, mod: 'reports' },
        { to: '/app/staff', key: 'staff', icon: Users, mod: 'staff' },
        { to: '/app/settings', key: 'settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex min-h-full">
      <aside className={cx('fixed inset-y-0 start-0 z-40 flex w-60 flex-col bg-ink-900 p-3 transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0')}>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: tenant.brandColor }}>
            {tenant.name[0]}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{tenant.name}</div>
            <div className="truncate text-[11px] text-ink-400">{tenant.city}</div>
          </div>
        </div>
        <nav className="scrollbar-thin mt-3 flex-1 space-y-4 overflow-y-auto">
          {groups.map((g) => {
            const items = g.items.filter((i) => !i.mod || canAccess(role, i.mod, tenant.modules));
            if (!items.length) return null;
            return (
              <div key={g.title}>
                {g.title && <div className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">{g.title}</div>}
                <div className="space-y-0.5">
                  {items.map(({ to, key, icon: I, end, badge }) => (
                    <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => cx('nav-link', isActive && 'active')}>
                      <I size={16} />
                      <span className="flex-1">{t(key)}</span>
                      {!!badge && <span className="rounded-full bg-coral-500 px-1.5 text-[10px] font-semibold text-white">{badge}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2 px-2">
            <Avatar name={me.name} color="#3a5050" size={28} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-white">{session.impersonating ? 'Clinqo HQ' : me.name}</div>
              <div className="text-[10px] text-ink-400">{ROLE_LABEL[role]}</div>
            </div>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="rounded bg-white/10 px-1 py-0.5 text-[11px] text-ink-200" aria-label="Language">
              <option value="en">EN</option>
              <option value="ar">ع</option>
              <option value="fr">FR</option>
            </select>
          </div>
          <button
            className="nav-link mt-2 w-full"
            onClick={() => {
              if (session.impersonating) {
                exitTenant();
                nav('/admin/tenants/' + tenant.id);
              } else {
                logout();
                nav('/login');
              }
            }}
          >
            {session.impersonating ? <ShieldCheck size={16} /> : <LogOut size={16} />}
            {session.impersonating ? t('back_admin') : t('logout')}
          </button>
          <div className="mt-2 px-2.5">
            <Logo light size={16} />
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden" onClick={() => setOpen(false)} />}
      <main className="min-w-0 flex-1 lg:ms-60">
        {session.impersonating && (
          <div className="no-print flex items-center justify-center gap-2 bg-coral-500 px-4 py-1.5 text-xs font-medium text-white">
            <ShieldCheck size={14} /> {t('viewing_as')}: {tenant.name}
          </div>
        )}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink-100 bg-sand-50/90 px-4 py-3 backdrop-blur lg:hidden">
          <button className="btn-ghost btn-sm" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={18} />
          </button>
          <span className="font-semibold text-ink-800">{tenant.name}</span>
        </div>
        <div className="mx-auto max-w-7xl p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

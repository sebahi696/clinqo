import { Activity, Building2, LayoutGrid, LogOut, Megaphone, Menu, Plus, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDB } from '../store/db';
import { cx } from '../lib/utils';
import Logo from './Logo';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { to: '/admin/growth', label: 'Growth (ads)', icon: TrendingUp },
  { to: '/admin/meta', label: 'Meta ad accounts', icon: Megaphone },
  { to: '/admin/activity', label: 'Activity log', icon: Activity },
];

export default function AdminLayout() {
  const logout = useDB((s) => s.logout);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-full">
      <aside className={cx('fixed inset-y-0 start-0 z-40 flex w-60 flex-col bg-ink-900 p-4 transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0')}>
        <div className="px-2 pb-1 pt-1">
          <Logo light />
        </div>
        <span className="mx-2 mb-6 mt-2 w-fit rounded bg-coral-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-coral-400">Super admin</span>
        <nav className="space-y-0.5">
          {NAV.map(({ to, label, icon: I, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => cx('nav-link', isActive && 'active')}>
              <I size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => nav('/admin/tenants/new')} className="btn mt-5 w-full bg-brand-600 text-white hover:bg-brand-500">
          <Plus size={15} /> New tenant
        </button>
        <button
          className="nav-link mt-auto"
          onClick={() => {
            logout();
            nav('/login');
          }}
        >
          <LogOut size={16} /> Log out
        </button>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden" onClick={() => setOpen(false)} />}
      <main className="min-w-0 flex-1 lg:ms-60">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink-100 bg-sand-50/90 px-4 py-3 backdrop-blur lg:hidden">
          <button className="btn-ghost btn-sm" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={18} />
          </button>
          <Logo size={22} />
        </div>
        <div className="mx-auto max-w-7xl p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

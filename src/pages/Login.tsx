import { ArrowRight, Building2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { Badge } from '../components/ui';
import { ROLE_LABEL } from '../lib/modules';
import { useDB } from '../store/db';

export default function Login() {
  const users = useDB((s) => s.users);
  const tenants = useDB((s) => s.tenants);
  const login = useDB((s) => s.login);
  const reset = useDB((s) => s.resetDemo);
  const nav = useNavigate();
  const go = (id: string, admin: boolean) => {
    login(id);
    nav(admin ? '/admin' : '/app');
  };
  const superAdmin = users.find((u) => u.role === 'super_admin')!;

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col">
        <Logo light />
        <div className="mt-auto max-w-md">
          <p className="font-display text-4xl font-semibold leading-[1.1]">
            The operating system for clinics &amp; spas, <span className="text-coral-400">with the growth team built in.</span>
          </p>
          <p className="mt-5 text-ink-300">Meta lead ads straight into the CRM, booking, POS and finance, in one record per patient.</p>
          <div className="mt-8 flex flex-wrap gap-2 text-xs text-ink-200">
            {['USD + LBP', 'Whish & OMT', 'Arabic · English · Français', 'Multi-tenant'].map((x) => (
              <span key={x} className="rounded-full border border-white/15 px-3 py-1">
                {x}
              </span>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute -end-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-700/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 end-10 h-72 w-72 rounded-full bg-coral-500/20 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1 className="mt-8 font-display text-2xl font-semibold text-ink-900 lg:mt-0">Sign in to the test build</h1>
          <p className="mt-1 text-sm text-ink-500">Pick a demo account. Data is stored in this browser only.</p>

          <button onClick={() => go(superAdmin.id, true)} className="card mt-6 flex w-full items-center gap-3 p-4 text-start transition hover:border-brand-300 hover:shadow-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-900 text-white">
              <ShieldCheck size={18} />
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-ink-900">Clinqo super admin</span>
              <span className="text-xs text-ink-500">Tenants, feature switches, Meta ad accounts, marketing plans</span>
            </span>
            <ArrowRight size={16} className="text-ink-400 rtl:rotate-180" />
          </button>

          <p className="mb-2 mt-7 text-xs font-semibold uppercase tracking-wide text-ink-400">Clinic & spa accounts</p>
          <div className="space-y-2">
            {tenants.map((t) => (
              <div key={t.id} className="card p-3">
                <div className="flex items-center gap-2">
                  <Building2 size={15} style={{ color: t.brandColor }} />
                  <span className="text-sm font-semibold text-ink-800">{t.name}</span>
                  <Badge>{t.vertical}</Badge>
                  {t.status !== 'active' && <Badge className="bg-amber-50 text-amber-700 ring-amber-200">{t.status}</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {users
                    .filter((u) => u.tenantId === t.id)
                    .map((u) => (
                      <button key={u.id} onClick={() => go(u.id, false)} className="btn-secondary btn-sm">
                        {u.name} · <span className="text-ink-400">{ROLE_LABEL[u.role]}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-6 text-xs text-ink-400 underline-offset-2 hover:underline"
            onClick={() => {
              if (confirm('Reset all demo data in this browser?')) reset();
            }}
          >
            Reset demo data
          </button>
        </div>
      </div>
    </div>
  );
}

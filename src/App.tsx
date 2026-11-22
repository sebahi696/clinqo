import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import TenantLayout from './components/TenantLayout';
import { useI18n } from './i18n';
import { canAccess } from './lib/modules';
import type { ModuleKey } from './lib/types';
import Login from './pages/Login';
import AdminActivity from './pages/admin/Activity';
import AdminMeta from './pages/admin/Meta';
import AdminOverview from './pages/admin/Overview';
import TenantDetail from './pages/admin/TenantDetail';
import TenantNew from './pages/admin/TenantNew';
import Tenants from './pages/admin/Tenants';
import Automations from './pages/tenant/Automations';
import Calendar from './pages/tenant/Calendar';
import Dashboard from './pages/tenant/Dashboard';
import Finance from './pages/tenant/Finance';
import Inventory from './pages/tenant/Inventory';
import Invoices from './pages/tenant/Invoices';
import Leads from './pages/tenant/Leads';
import Marketing from './pages/tenant/Marketing';
import Packages from './pages/tenant/Packages';
import PatientProfile from './pages/tenant/PatientProfile';
import Patients from './pages/tenant/Patients';
import POS from './pages/tenant/POS';
import Reports from './pages/tenant/Reports';
import Settings from './pages/tenant/Settings';
import StaffPage from './pages/tenant/Staff';
import { useDB, useMe, useTenant } from './store/db';

function Gate({ mod, children }: { mod: ModuleKey; children: ReactNode }) {
  const me = useMe();
  const tenant = useTenant();
  if (!me || !tenant) return null;
  const role = useDB.getState().session.impersonating ? 'super_admin' : me.role;
  if (!canAccess(role, mod, tenant.modules))
    return (
      <div className="card mx-auto mt-16 max-w-md p-8 text-center">
        <p className="font-display text-xl font-semibold text-ink-900">This module is not active</p>
        <p className="mt-2 text-sm text-ink-500">
          {tenant.modules[mod] ? 'Your role does not have access to it. Ask the clinic owner.' : 'It is not part of your Clinqo plan. Contact your Clinqo account manager to switch it on.'}
        </p>
      </div>
    );
  return <>{children}</>;
}

export default function App() {
  const me = useMe();
  const tenantId = useDB((s) => s.session.tenantId);
  const { dir, lang } = useI18n();

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const home = !me ? '/login' : tenantId ? '/app' : me.role === 'super_admin' ? '/admin' : '/login';

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={me?.role === 'super_admin' ? <AdminLayout /> : <Navigate to="/login" />}>
        <Route index element={<AdminOverview />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="tenants/new" element={<TenantNew />} />
        <Route path="tenants/:id" element={<TenantDetail />} />
        <Route path="meta" element={<AdminMeta />} />
        <Route path="activity" element={<AdminActivity />} />
      </Route>
      <Route path="/app" element={me && tenantId ? <TenantLayout /> : <Navigate to={home === '/app' ? '/login' : home} />}>
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<Gate mod="crm"><Leads /></Gate>} />
        <Route path="patients" element={<Gate mod="crm"><Patients /></Gate>} />
        <Route path="patients/:id" element={<Gate mod="crm"><PatientProfile /></Gate>} />
        <Route path="calendar" element={<Gate mod="appointments"><Calendar /></Gate>} />
        <Route path="pos" element={<Gate mod="pos"><POS /></Gate>} />
        <Route path="invoices" element={<Gate mod="pos"><Invoices /></Gate>} />
        <Route path="packages" element={<Gate mod="packages"><Packages /></Gate>} />
        <Route path="inventory" element={<Gate mod="inventory"><Inventory /></Gate>} />
        <Route path="finance" element={<Gate mod="finance"><Finance /></Gate>} />
        <Route path="marketing" element={<Gate mod="marketing"><Marketing /></Gate>} />
        <Route path="automations" element={<Gate mod="automations"><Automations /></Gate>} />
        <Route path="reports" element={<Gate mod="reports"><Reports /></Gate>} />
        <Route path="staff" element={<Gate mod="staff"><StaffPage /></Gate>} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}

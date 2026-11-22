import type { ModuleKey, PlanKey, Role } from './types';

export interface ModuleMeta {
  key: ModuleKey;
  label: string;
  description: string;
  group: 'Growth' | 'Front desk' | 'Clinic' | 'Money' | 'Team & insight';
}

export const MODULES: ModuleMeta[] = [
  { key: 'marketing', label: 'Marketing & Meta Ads', description: 'Clinqo-managed campaigns, ad spend, cost per patient, ROAS', group: 'Growth' },
  { key: 'inbox', label: 'Unified inbox', description: 'WhatsApp, Instagram and Messenger conversations in one place', group: 'Growth' },
  { key: 'automations', label: 'Automations', description: 'Reminders, recalls, follow-ups and review requests', group: 'Growth' },
  { key: 'crm', label: 'CRM', description: 'Leads pipeline and patient/client 360 profiles', group: 'Front desk' },
  { key: 'appointments', label: 'Appointments', description: 'Calendar by provider, booking, deposits, statuses', group: 'Front desk' },
  { key: 'clinical', label: 'Clinical records', description: 'Treatment notes, consent forms, dental chart', group: 'Clinic' },
  { key: 'inventory', label: 'Inventory', description: 'Products, consumables, lots and expiry', group: 'Clinic' },
  { key: 'pos', label: 'POS & sales', description: 'Checkout, invoices, USD/LBP payments, Whish & OMT', group: 'Money' },
  { key: 'packages', label: 'Packages & gift cards', description: 'Session packages, memberships, gift cards', group: 'Money' },
  { key: 'finance', label: 'Finance', description: 'Expenses, P&L, cash drawer by currency', group: 'Money' },
  { key: 'staff', label: 'Staff', description: 'Team, schedules, commissions', group: 'Team & insight' },
  { key: 'reports', label: 'Reports', description: 'Revenue, utilisation, retention analytics', group: 'Team & insight' },
];

const all = (v: boolean) => Object.fromEntries(MODULES.map((m) => [m.key, v])) as Record<ModuleKey, boolean>;

export const PRESETS: Record<PlanKey, { label: string; description: string; modules: Record<ModuleKey, boolean>; fee: number }> = {
  growth: {
    label: 'Growth suite',
    description: 'Everything: Clinqo runs the ads and the clinic runs on Clinqo',
    modules: all(true),
    fee: 249,
  },
  operations: {
    label: 'Operating system',
    description: 'For clinics with their own agency: CRM, POS, sales, clinic ops. No ad management.',
    modules: { ...all(true), marketing: false },
    fee: 149,
  },
  marketing: {
    label: 'Marketing only',
    description: 'Ads + lead inbox + CRM pipeline, no POS or clinical',
    modules: {
      ...all(false),
      marketing: true,
      inbox: true,
      crm: true,
      appointments: true,
      automations: true,
      reports: true,
    },
    fee: 199,
  },
  custom: {
    label: 'Custom',
    description: 'Hand-picked modules for this client',
    modules: all(true),
    fee: 0,
  },
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super admin',
  owner: 'Owner',
  manager: 'Manager',
  reception: 'Reception',
  provider: 'Doctor / therapist',
  accountant: 'Accountant',
};

// Which modules each tenant role can open (on top of what the tenant has enabled)
export const ROLE_ACCESS: Record<Exclude<Role, 'super_admin'>, ModuleKey[] | 'all'> = {
  owner: 'all',
  manager: 'all',
  reception: ['inbox', 'crm', 'appointments', 'pos', 'packages', 'automations', 'clinical'],
  provider: ['appointments', 'crm', 'clinical'],
  accountant: ['pos', 'finance', 'reports', 'inventory', 'packages'],
};

export function canAccess(role: Role, mod: ModuleKey, enabled: Record<ModuleKey, boolean>): boolean {
  if (!enabled[mod]) return false;
  if (role === 'super_admin') return true;
  const access = ROLE_ACCESS[role];
  return access === 'all' || access.includes(mod);
}

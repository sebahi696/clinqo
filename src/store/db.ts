// Client-side "backend" for the GitHub Pages test build.
// All data lives in localStorage behind this one store, so swapping it for a
// real API (Supabase / Postgres with row-level security per tenant) later only
// touches this file.
import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PRESETS } from '../lib/modules';
import { buildSeed, DB_VERSION, FORM_QUESTIONS, starterCatalog, type DB } from '../lib/seed';
import type {
  Appointment,
  Invoice,
  Lang,
  Lead,
  LeadForm,
  LeadStage,
  OptimizationLog,
  ModuleKey,
  Patient,
  Payment,
  PlanKey,
  Tenant,
} from '../lib/types';
import { uid } from '../lib/utils';

type Tables = Omit<DB, 'version' | 'meta'>;
export type TableKey = keyof Tables;
type Row<K extends TableKey> = Tables[K][number];

interface Session {
  userId: string | null;
  tenantId: string | null; // tenant currently open
  impersonating: boolean; // super admin viewing a tenant
  lang: Lang;
}

interface Store extends DB {
  session: Session;
  // session
  login: (userId: string) => void;
  logout: () => void;
  openTenant: (tenantId: string) => void;
  exitTenant: () => void;
  setLang: (l: Lang) => void;
  // generic
  insert: <K extends TableKey>(table: K, row: Row<K>) => void;
  patch: <K extends TableKey>(table: K, id: string, data: Partial<Row<K>>) => void;
  remove: <K extends TableKey>(table: K, id: string) => void;
  log: (text: string, tenantId?: string) => void;
  // platform
  createTenant: (t: Omit<Tenant, 'id' | 'createdAt'>) => string;
  updateTenant: (id: string, data: Partial<Tenant>) => void;
  toggleModule: (id: string, key: ModuleKey) => void;
  applyPreset: (id: string, plan: PlanKey) => void;
  connectMeta: (businessName: string) => void;
  disconnectMeta: () => void;
  syncMeta: () => void;
  addAdAccount: (a: { id: string; name: string; currency: string; tenantId?: string }) => string | null;
  assignAdAccount: (tenantId: string, accountId: string | undefined) => void;
  syncForms: (tenantId: string) => number;
  importCampaigns: (tenantId: string) => number;
  logOpt: (e: Omit<OptimizationLog, 'id' | 'at' | 'author'>) => void;
  // tenant ops
  moveLead: (id: string, stage: LeadStage) => void;
  convertLead: (leadId: string) => string;
  importLeads: (rows: (Omit<Lead, 'id' | 'tenantId' | 'stage' | 'createdAt'> & { createdAt?: string })[]) => number;
  book: (a: Omit<Appointment, 'id' | 'tenantId'>) => string;
  setAppointmentStatus: (id: string, status: Appointment['status']) => void;
  checkout: (inv: Omit<Invoice, 'id' | 'tenantId' | 'number' | 'createdAt' | 'status'>) => Invoice;
  importPatients: (rows: Partial<Patient>[]) => number;
  resetDemo: () => void;
}

const fresh = () => buildSeed();

export const useDB = create<Store>()(
  persist(
    (set, get) => {
      const tid = () => get().session.tenantId!;
      const actor = () => get().users.find((u) => u.id === get().session.userId)?.name ?? 'System';
      return {
        ...fresh(),
        session: { userId: null, tenantId: null, impersonating: false, lang: 'en' },

        login: (userId) => {
          const u = get().users.find((x) => x.id === userId);
          set({ session: { ...get().session, userId, tenantId: u?.tenantId ?? null, impersonating: false } });
        },
        logout: () => set({ session: { ...get().session, userId: null, tenantId: null, impersonating: false } }),
        openTenant: (tenantId) => set({ session: { ...get().session, tenantId, impersonating: true } }),
        exitTenant: () => set({ session: { ...get().session, tenantId: null, impersonating: false } }),
        setLang: (lang) => set({ session: { ...get().session, lang } }),

        insert: (table, row) => set({ [table]: [row, ...(get()[table] as unknown[])] } as Partial<Store>),
        patch: (table, id, data) =>
          set({
            [table]: (get()[table] as { id: string }[]).map((r) => (r.id === id ? { ...r, ...data } : r)),
          } as Partial<Store>),
        remove: (table, id) =>
          set({ [table]: (get()[table] as { id: string }[]).filter((r) => r.id !== id) } as Partial<Store>),
        log: (text, tenantId) =>
          set({ activity: [{ id: uid('ac'), at: new Date().toISOString(), actor: actor(), text, tenantId }, ...get().activity].slice(0, 300) }),

        createTenant: (t) => {
          const id = uid('t_');
          set({ tenants: [...get().tenants, { ...t, id, createdAt: new Date().toISOString() }] });
          set({
            users: [
              ...get().users,
              { id: uid('u'), tenantId: id, name: t.ownerName, email: t.ownerEmail, role: 'owner' },
              { id: uid('u'), tenantId: id, name: 'Front desk', email: `desk@${id}.clinqo.app`, role: 'reception' },
            ],
          });
          const cat = starterCatalog(id, t.vertical, t.ownerName);
          set({ services: [...get().services, ...cat.services], staff: [...get().staff, ...cat.staff], automations: [...get().automations, ...cat.automations] });
          if (t.modules.marketing)
            set({
              plans: [
                ...get().plans,
                { tenantId: id, goal: '', monthlyBudget: 300, targetCPL: 6, targetBookings: 20, offers: [], audiences: [], channels: ['Meta lead form ads (Facebook + Instagram)'], approvedByClient: false, phase: 'plan', updatedAt: new Date().toISOString() },
              ],
            });
          get().log(`Created tenant ${t.name} (${PRESETS[t.plan].label})`, id);
          return id;
        },
        updateTenant: (id, data) => set({ tenants: get().tenants.map((t) => (t.id === id ? { ...t, ...data } : t)) }),
        toggleModule: (id, key) => {
          const t = get().tenants.find((x) => x.id === id)!;
          const on = !t.modules[key];
          get().updateTenant(id, { modules: { ...t.modules, [key]: on }, plan: 'custom' });
          get().log(`${on ? 'Enabled' : 'Disabled'} ${key} for ${t.name}`, id);
        },
        applyPreset: (id, plan) => {
          const t = get().tenants.find((x) => x.id === id)!;
          get().updateTenant(id, { plan, modules: { ...PRESETS[plan].modules }, monthlyFeeUSD: PRESETS[plan].fee || t.monthlyFeeUSD, hasOwnAgency: plan === 'operations' });
          get().log(`Applied ${PRESETS[plan].label} preset to ${t.name}`, id);
        },
        connectMeta: (businessName) => {
          set({
            meta: {
              connected: true,
              businessName,
              businessId: String(Math.floor(1e12 + Math.random() * 9e12)),
              connectedAt: new Date().toISOString(),
              adAccounts: get().meta.adAccounts.length
                ? get().meta.adAccounts
                : [
                    { id: 'act_' + Math.floor(1e9 + Math.random() * 9e9), name: 'Ad account 1', currency: 'USD' },
                    { id: 'act_' + Math.floor(1e9 + Math.random() * 9e9), name: 'Ad account 2', currency: 'USD' },
                  ],
            },
          });
          get().log(`Connected Meta Business Manager "${businessName}"`);
        },
        disconnectMeta: () => {
          set({ meta: { ...get().meta, connected: false } });
          get().log('Disconnected Meta Business Manager');
        },
        syncMeta: () => {
          // Simulates a daily insights pull: adds one day of spend to active campaigns
          set({
            campaigns: get().campaigns.map((c) => {
              if (c.status !== 'ACTIVE') return c;
              const s = Math.round(c.dailyBudget * (0.85 + Math.random() * 0.2));
              return { ...c, spend: c.spend + s, impressions: c.impressions + s * 110, clicks: c.clicks + Math.round(s * 2.6) };
            }),
          });
          // ...and pulls new lead-form submissions into each tenant's CRM
          const names = ['Nour Saad', 'Karim Fares', 'Lea Haddad', 'Ali Itani', 'Rita Khoury', 'Tala Aoun', 'Jad Bitar', 'Maya Chamoun'];
          const fresh: Lead[] = get()
            .campaigns.filter((c) => c.status === 'ACTIVE')
            .map((c) => {
              const svcs = get().services.filter((x) => x.tenantId === c.tenantId);
              const svc = svcs[Math.floor(Math.random() * svcs.length)];
              const form = get().leadForms.find((f) => f.campaignId === c.id && f.status === 'ACTIVE');
              return {
                id: uid('ld'),
                tenantId: c.tenantId,
                name: names[Math.floor(Math.random() * names.length)],
                phone: `+961 7${Math.floor(Math.random() * 9)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`,
                source: 'meta_ads' as const,
                campaignId: c.id,
                interest: svc?.name ?? '',
                stage: 'new' as const,
                value: svc?.price ?? 0,
                createdAt: new Date().toISOString(),
                formName: form?.name ?? `${c.name} – form`,
                formId: form?.id,
                answers: { 'What are you interested in?': svc?.name ?? '', 'Best time to call?': 'Morning', Area: 'Beirut' },
              };
            });
          set({ leads: [...fresh, ...get().leads] });
          get().log(`Synced Meta ad insights and ${fresh.length} new lead-form leads (simulated)`);
        },

        addAdAccount: ({ id, name, currency, tenantId }) => {
          const digits = id.trim().replace(/^act_/i, '');
          if (!/^\d{6,20}$/.test(digits)) return 'Enter the ad account ID: the number shown in Ads Manager (with or without "act_").';
          const actId = 'act_' + digits;
          if (get().meta.adAccounts.some((a) => a.id === actId)) return 'This ad account is already in the list.';
          const nm = name.trim() || `Ad account ${digits.slice(-4)}`;
          set({ meta: { ...get().meta, adAccounts: [...get().meta.adAccounts, { id: actId, name: nm, currency }] } });
          get().log(`Added ad account ${nm} (${actId})`);
          if (tenantId) get().assignAdAccount(tenantId, actId);
          return null;
        },
        assignAdAccount: (tenantId, accountId) => {
          get().updateTenant(tenantId, { metaAdAccountId: accountId });
          get().log(`${accountId ? `Connected ad account ${accountId} to` : 'Disconnected the ad account from'} ${get().tenants.find((t) => t.id === tenantId)?.name}`, tenantId);
        },
        importCampaigns: (tenantId) => {
          // Simulates reading campaigns from the tenant's ad account (Marketing API: GET /act_x/campaigns)
          const t = get().tenants.find((x) => x.id === tenantId);
          if (!t?.metaAdAccountId) return 0;
          const svc = get().services.find((x) => x.tenantId === tenantId);
          const c = {
            id: uid('cp'),
            tenantId,
            metaCampaignId: '23851' + Math.floor(1e8 + Math.random() * 9e8),
            name: `${svc?.name ?? 'New offer'} – lead form – ${new Date().toLocaleDateString('en-GB', { month: 'short' })}`,
            objective: 'LEADS' as const,
            status: 'ACTIVE' as const,
            dailyBudget: 10,
            spend: 0,
            impressions: 0,
            clicks: 0,
            startDate: new Date().toISOString().slice(0, 10),
          };
          set({ campaigns: [...get().campaigns, c] });
          get().log(`Found new campaign in Ads Manager: ${c.name}`, tenantId);
          get().syncForms(tenantId);
          return 1;
        },
        syncForms: (tenantId) => {
          // Simulates reading the page's instant forms used by the tenant's lead campaigns
          const missing = get().campaigns.filter((c) => c.tenantId === tenantId && !get().leadForms.some((f) => f.campaignId === c.id));
          const forms: LeadForm[] = missing.map((c) => ({
            id: uid('lf'),
            tenantId,
            metaFormId: String(Math.floor(1e14 + Math.random() * 8e14)),
            name: `${c.name} – form`,
            campaignId: c.id,
            questions: [...FORM_QUESTIONS],
            interestQuestion: 'What are you interested in?',
            visibleQuestions: ['What are you interested in?', 'Best time to call?'],
            status: 'ACTIVE',
          }));
          set({ leadForms: [...get().leadForms, ...forms] });
          if (forms.length) get().log(`Synced ${forms.length} lead form(s)`, tenantId);
          return forms.length;
        },
        logOpt: (e) => set({ optLogs: [{ ...e, id: uid('ol'), at: new Date().toISOString(), author: actor() }, ...get().optLogs] }),

        moveLead: (id, stage) => {
          const l = get().leads.find((x) => x.id === id);
          if (l && l.stage === 'new' && stage !== 'new' && l.firstResponseMins === undefined) {
            const now = new Date();
            get().patch('leads', id, { stage, contactedAt: now.toISOString(), firstResponseMins: Math.max(1, Math.round((now.getTime() - new Date(l.createdAt).getTime()) / 60000)) });
          } else get().patch('leads', id, { stage });
        },
        convertLead: (leadId) => {
          const l = get().leads.find((x) => x.id === leadId)!;
          if (l.patientId) return l.patientId;
          const existing = get().patients.find((p) => p.tenantId === l.tenantId && p.phone === l.phone);
          const pid = existing?.id ?? uid('pt');
          if (!existing) {
            const [firstName, ...rest] = l.name.split(' ');
            get().insert('patients', {
              id: pid,
              tenantId: l.tenantId,
              firstName,
              lastName: rest.join(' '),
              phone: l.phone,
              gender: 'female',
              source: l.source,
              campaignId: l.campaignId,
              tags: [],
              notes: `Interested in ${l.interest}`,
              marketingConsent: true,
              createdAt: new Date().toISOString(),
            });
          }
          get().patch('leads', leadId, { patientId: pid });
          return pid;
        },
        importLeads: (rows) => {
          const now = new Date().toISOString();
          const existing = new Set(get().leads.filter((l) => l.tenantId === tid()).map((l) => l.phone.replace(/\D/g, '')));
          const fresh = rows.filter((r) => r.phone && !existing.has(r.phone.replace(/\D/g, '')));
          set({ leads: [...fresh.map((r) => ({ ...r, id: uid('ld'), tenantId: tid(), stage: 'new' as const, createdAt: r.createdAt || now })), ...get().leads] });
          get().log(`Imported ${fresh.length} leads`, tid());
          return fresh.length;
        },
        book: (a) => {
          const id = uid('ap');
          get().insert('appointments', { ...a, id, tenantId: tid() });
          // move the matching lead forward in the pipeline
          const p = get().patients.find((x) => x.id === a.patientId);
          const lead = get().leads.find((l) => l.tenantId === tid() && (l.patientId === a.patientId || l.phone === p?.phone) && ['new', 'contacted'].includes(l.stage));
          if (lead) get().patch('leads', lead.id, { stage: 'consult_booked', patientId: a.patientId });
          return id;
        },
        setAppointmentStatus: (id, status) => {
          get().patch('appointments', id, { status });
          const a = get().appointments.find((x) => x.id === id)!;
          if (status === 'completed' || status === 'arrived') {
            const lead = get().leads.find((l) => l.patientId === a.patientId && l.stage === 'consult_booked');
            if (lead) get().patch('leads', lead.id, { stage: 'attended' });
          }
        },
        checkout: (data) => {
          const t = get().tenants.find((x) => x.id === tid())!;
          const count = get().invoices.filter((i) => i.tenantId === t.id).length;
          const paid = data.payments.reduce((s: number, p: Payment) => s + p.amountUSD, 0);
          const inv: Invoice = {
            ...data,
            id: uid('in'),
            tenantId: t.id,
            number: `${t.name.slice(0, 2).toUpperCase()}-${2000 + count}`,
            createdAt: new Date().toISOString(),
            status: paid + 0.01 >= data.total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
          };
          get().insert('invoices', inv);
          // side effects: stock, packages, gift cards, appointment, lead
          for (const it of inv.items) {
            if (it.kind === 'product') {
              const pr = get().products.find((p) => p.id === it.refId);
              if (pr) get().patch('products', pr.id, { stock: Math.max(0, pr.stock - it.qty) });
            }
            if ((it.kind === 'package' || it.kind === 'membership') && inv.patientId) {
              const def = get().packageDefs.find((d) => d.id === it.refId)!;
              const exp = new Date();
              exp.setDate(exp.getDate() + def.validityDays);
              get().insert('patientPackages', { id: uid('pp'), tenantId: t.id, patientId: inv.patientId, packageId: def.id, remaining: def.sessions, expires: exp.toISOString().slice(0, 10), purchasedAt: inv.createdAt });
            }
            if (it.kind === 'gift_card') {
              get().insert('giftCards', { id: uid('gc'), tenantId: t.id, code: `GC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10 + Math.random() * 89)}`, initial: it.price, balance: it.price, buyer: inv.patientId ? undefined : 'Walk-in', createdAt: inv.createdAt });
            }
          }
          if (inv.appointmentId) get().patch('appointments', inv.appointmentId, { status: 'completed', invoiceId: inv.id });
          if (inv.patientId) {
            const lead = get().leads.find((l) => l.patientId === inv.patientId && ['consult_booked', 'attended', 'contacted', 'new'].includes(l.stage));
            if (lead) get().patch('leads', lead.id, { stage: 'won' });
          }
          get().log(`Invoice ${inv.number} – $${inv.total}`, t.id);
          return inv;
        },
        importPatients: (rows) => {
          const now = new Date().toISOString();
          const list: Patient[] = rows
            .filter((r) => r.firstName && r.phone)
            .map((r) => ({
              id: uid('pt'),
              tenantId: tid(),
              firstName: r.firstName!,
              lastName: r.lastName ?? '',
              phone: r.phone!,
              email: r.email,
              gender: r.gender === 'male' ? 'male' : 'female',
              dob: r.dob,
              source: (r.source as Patient['source']) ?? 'import',
              tags: r.tags ?? [],
              notes: r.notes ?? '',
              marketingConsent: true,
              createdAt: now,
            }));
          set({ patients: [...list, ...get().patients] });
          get().log(`Imported ${list.length} patients`, tid());
          return list.length;
        },
        resetDemo: () => set({ ...fresh() }),
      };
    },
    {
      name: 'clinqo-db',
      version: DB_VERSION,
      migrate: () => ({ ...fresh(), session: { userId: null, tenantId: null, impersonating: false, lang: 'en' } }) as unknown as Store,
    },
  ),
);

// ───────── selectors ─────────
export const useSession = () => useDB((s) => s.session);
export const useMe = () => useDB((s) => s.users.find((u) => u.id === s.session.userId));
export const useTenant = () => useDB((s) => s.tenants.find((t) => t.id === s.session.tenantId));

/** rows of a table that belong to the open tenant */
export function useT<K extends TableKey>(table: K): Row<K>[] {
  const tenantId = useDB((s) => s.session.tenantId);
  const rows = useDB((s) => s[table]) as Row<K>[];
  return useMemoFilter(rows, tenantId);
}

function useMemoFilter<T>(rows: T[], tenantId: string | null): T[] {
  return useMemo(() => rows.filter((r) => (r as { tenantId?: string }).tenantId === tenantId), [rows, tenantId]);
}


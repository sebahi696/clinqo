import { useDB } from '../store/db';
import type { Lang } from '../lib/types';

// Interface strings for navigation and common actions.
// Lebanon launch: English, Arabic (RTL) and French.
const dict = {
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم', fr: 'Tableau de bord' },
  inbox: { en: 'Inbox', ar: 'الرسائل', fr: 'Messagerie' },
  leads: { en: 'Leads', ar: 'العملاء المحتملون', fr: 'Prospects' },
  patients: { en: 'Patients', ar: 'المرضى', fr: 'Patients' },
  clients: { en: 'Clients', ar: 'العملاء', fr: 'Clients' },
  calendar: { en: 'Calendar', ar: 'المواعيد', fr: 'Agenda' },
  pos: { en: 'Point of sale', ar: 'نقطة البيع', fr: 'Caisse' },
  invoices: { en: 'Invoices', ar: 'الفواتير', fr: 'Factures' },
  packages: { en: 'Packages & gifts', ar: 'الباقات والهدايا', fr: 'Forfaits & cadeaux' },
  inventory: { en: 'Inventory', ar: 'المخزون', fr: 'Stock' },
  finance: { en: 'Finance', ar: 'المالية', fr: 'Finances' },
  marketing: { en: 'Marketing', ar: 'التسويق', fr: 'Marketing' },
  automations: { en: 'Automations', ar: 'الأتمتة', fr: 'Automatisations' },
  reports: { en: 'Reports', ar: 'التقارير', fr: 'Rapports' },
  staff: { en: 'Staff', ar: 'الفريق', fr: 'Équipe' },
  settings: { en: 'Settings', ar: 'الإعدادات', fr: 'Paramètres' },
  g_growth: { en: 'Growth', ar: 'النمو', fr: 'Croissance' },
  g_clinic: { en: 'Clinic', ar: 'العيادة', fr: 'Clinique' },
  g_money: { en: 'Sales & money', ar: 'المبيعات والمال', fr: 'Ventes & argent' },
  g_team: { en: 'Team & insight', ar: 'الفريق والتحليلات', fr: 'Équipe & analyses' },
  logout: { en: 'Log out', ar: 'تسجيل الخروج', fr: 'Déconnexion' },
  search: { en: 'Search', ar: 'بحث', fr: 'Rechercher' },
  new_booking: { en: 'New booking', ar: 'حجز جديد', fr: 'Nouveau RDV' },
  today: { en: 'Today', ar: 'اليوم', fr: "Aujourd'hui" },
  save: { en: 'Save', ar: 'حفظ', fr: 'Enregistrer' },
  cancel: { en: 'Cancel', ar: 'إلغاء', fr: 'Annuler' },
  revenue: { en: 'Revenue', ar: 'الإيرادات', fr: 'Chiffre d’affaires' },
  back_admin: { en: 'Back to super admin', ar: 'العودة للإدارة', fr: 'Retour super admin' },
  viewing_as: { en: 'Viewing tenant as Clinqo admin', ar: 'تتصفح كمسؤول كلينكو', fr: 'Vue client en tant qu’admin Clinqo' },
} satisfies Record<string, Record<Lang, string>>;

export type TKey = keyof typeof dict;

export function useI18n() {
  const lang = useDB((s) => s.session.lang);
  return {
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    t: (k: TKey) => dict[k][lang],
  };
}

// ───────────────────────── Core domain model ─────────────────────────
// Every record below the platform level carries a tenantId. The store keeps
// one table per entity, filtered by tenant in selectors, which mirrors how a
// real multi-tenant backend (e.g. Postgres + row-level security) will work.

export type ModuleKey =
  | 'marketing' // Meta ads, campaigns, ad ROI (Clinqo-managed growth)
  | 'crm' // leads pipeline + patients/clients 360
  | 'appointments' // calendar & booking
  | 'clinical' // charts, notes, consent, dental chart
  | 'pos' // checkout, invoices, payments
  | 'packages' // packages, memberships, gift cards
  | 'inventory' // products, stock, lots & expiry
  | 'finance' // expenses, P&L, cash drawer
  | 'staff' // team, commissions
  | 'automations' // reminder, recall & follow-up lists (click-to-send, no messaging API)
  | 'reports'; // analytics

export type Vertical = 'dental' | 'aesthetic' | 'spa' | 'medical';
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'onboarding';
export type Lang = 'en' | 'ar' | 'fr';

export interface Tenant {
  id: string;
  name: string;
  vertical: Vertical;
  country: string;
  city: string;
  currency: 'USD';
  secondaryCurrency: 'LBP';
  exchangeRate: number; // LBP per 1 USD
  vatRate: number; // percent
  plan: PlanKey;
  status: TenantStatus;
  modules: Record<ModuleKey, boolean>;
  businessModel: string; // free text written by super admin
  hasOwnAgency: boolean; // client runs marketing with an outside agency
  ownerName: string;
  ownerEmail: string;
  phone: string;
  brandColor: string;
  metaAdAccountId?: string;
  metaPageName?: string; // Facebook page that runs the lead forms
  leadDisplay: LeadDisplay; // what the clinic sees about ad leads (set by the Clinqo marketer)
  monthlyFeeUSD: number;
  createdAt: string;
  limits: { users: number; branches: number };
}

export type PlanKey = 'growth' | 'operations' | 'marketing' | 'custom';

export type Role = 'super_admin' | 'owner' | 'manager' | 'reception' | 'provider' | 'accountant';

export interface User {
  id: string;
  tenantId?: string; // undefined for platform users
  name: string;
  email: string;
  role: Role;
}

export interface Staff {
  id: string;
  tenantId: string;
  name: string;
  title: string;
  color: string;
  commissionRate: number; // percent of service revenue
  active: boolean;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  duration: number; // minutes
  price: number; // USD
  recallDays?: number;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  lowStock: number;
  lot?: string;
  expiry?: string;
  retail: boolean;
}

export type LeadSource =
  | 'meta_ads'
  | 'instagram'
  | 'whatsapp'
  | 'referral'
  | 'walk_in'
  | 'import'
  | 'loyal'
  | 'website';

export interface Patient {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  gender: 'female' | 'male';
  dob?: string;
  source: LeadSource;
  campaignId?: string;
  tags: string[];
  notes: string;
  marketingConsent: boolean;
  allergies?: string;
  createdAt: string;
  teeth?: Record<string, ToothState>;
}

export type ToothState = 'healthy' | 'caries' | 'filled' | 'crown' | 'missing' | 'implant' | 'root_canal' | 'planned';

export type LeadStage = 'new' | 'contacted' | 'consult_booked' | 'attended' | 'won' | 'lost';

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  source: LeadSource;
  campaignId?: string;
  interest: string;
  stage: LeadStage;
  value: number;
  createdAt: string;
  firstResponseMins?: number;
  patientId?: string;
  ownerId?: string;
  note?: string;
  formName?: string; // Meta lead form the lead came from
  formId?: string;
  answers?: Record<string, string>; // answers to the lead form questions
  contactedAt?: string;
}

export type AppointmentStatus = 'booked' | 'confirmed' | 'arrived' | 'completed' | 'no_show' | 'cancelled';

export interface Appointment {
  id: string;
  tenantId: string;
  patientId: string;
  serviceId: string;
  staffId: string;
  start: string; // ISO
  duration: number;
  status: AppointmentStatus;
  notes?: string;
  deposit?: number;
  invoiceId?: string;
}

export type PaymentMethod = 'cash_usd' | 'cash_lbp' | 'card' | 'whish' | 'omt' | 'bank' | 'gift_card' | 'package';

export interface Payment {
  method: PaymentMethod;
  amount: number; // in the currency of the method
  currency: 'USD' | 'LBP';
  amountUSD: number;
}

export interface InvoiceItem {
  kind: 'service' | 'product' | 'package' | 'gift_card' | 'membership';
  refId: string;
  name: string;
  qty: number;
  price: number;
  staffId?: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  number: string;
  patientId?: string;
  appointmentId?: string;
  items: InvoiceItem[];
  discount: number;
  vat: number;
  total: number;
  payments: Payment[];
  status: 'paid' | 'partial' | 'unpaid' | 'refunded';
  createdAt: string;
}

export interface PackageDef {
  id: string;
  tenantId: string;
  name: string;
  serviceId: string;
  sessions: number;
  price: number;
  validityDays: number;
  kind: 'package' | 'membership';
}

export interface PatientPackage {
  id: string;
  tenantId: string;
  patientId: string;
  packageId: string;
  remaining: number;
  expires: string;
  purchasedAt: string;
}

export interface GiftCard {
  id: string;
  tenantId: string;
  code: string;
  initial: number;
  balance: number;
  buyer?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  tenantId: string;
  category: string;
  vendor: string;
  amount: number;
  date: string;
  note?: string;
}

export interface ClinicalNote {
  id: string;
  tenantId: string;
  patientId: string;
  staffId: string;
  date: string;
  title: string;
  body: string;
}

export interface ConsentRecord {
  id: string;
  tenantId: string;
  patientId: string;
  form: string;
  signedAt?: string;
}

export interface Campaign {
  id: string;
  tenantId: string;
  metaCampaignId: string;
  name: string;
  objective: 'LEADS' | 'MESSAGES' | 'TRAFFIC' | 'AWARENESS';
  status: 'ACTIVE' | 'PAUSED';
  dailyBudget: number;
  spend: number;
  impressions: number;
  clicks: number;
  startDate: string;
}

export interface LeadDisplay {
  showCampaign: boolean; // campaign & form names on lead cards
  showAnswers: boolean; // lead form answers (only questions marked visible on the form)
  sourceLabel: string; // how ad leads are labelled for the clinic, e.g. "Online ad"
}

export interface LeadForm {
  id: string;
  tenantId: string;
  metaFormId: string;
  name: string;
  campaignId?: string;
  questions: string[];
  interestQuestion?: string; // answer used as the lead's "interested in"
  visibleQuestions: string[]; // answers the clinic can see
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface OptimizationLog {
  id: string;
  tenantId: string;
  at: string;
  author: string;
  kind: 'budget' | 'creative' | 'audience' | 'offer' | 'pause' | 'launch' | 'note';
  campaignId?: string;
  text: string;
}

export interface MarketingPlan {
  tenantId: string;
  goal: string;
  monthlyBudget: number;
  targetCPL: number;
  targetBookings: number;
  offers: string[];
  audiences: string[];
  channels: string[];
  approvedByClient: boolean;
  phase: 'plan' | 'configuration' | 'ad_spend' | 'optimizing';
  updatedAt: string;
}

export interface Automation {
  id: string;
  tenantId: string;
  name: string;
  trigger: string;
  message: string;
  enabled: boolean;
  sent: number;
}

export interface MetaConnection {
  connected: boolean;
  businessName: string;
  businessId: string;
  connectedAt?: string;
  adAccounts: { id: string; name: string; currency: string }[];
}

export interface ActivityLog {
  id: string;
  tenantId?: string;
  at: string;
  actor: string;
  text: string;
}

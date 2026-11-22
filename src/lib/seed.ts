// Demo data for testing on GitHub Pages. Everything is generated relative to
// "now" so the calendar, dashboards and reports always look current.
import { PRESETS } from './modules';
import type {
  ActivityLog,
  Appointment,
  AppointmentStatus,
  Automation,
  Campaign,
  ClinicalNote,
  ConsentRecord,
  Conversation,
  Expense,
  GiftCard,
  Invoice,
  Lead,
  LeadSource,
  LeadStage,
  MarketingPlan,
  MetaConnection,
  PackageDef,
  Patient,
  PatientPackage,
  PaymentMethod,
  Product,
  Service,
  Staff,
  Tenant,
  ToothState,
  User,
  Vertical,
} from './types';

// Small deterministic RNG so every fresh demo looks the same
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export interface DB {
  version: number;
  tenants: Tenant[];
  users: User[];
  staff: Staff[];
  services: Service[];
  products: Product[];
  patients: Patient[];
  leads: Lead[];
  conversations: Conversation[];
  appointments: Appointment[];
  invoices: Invoice[];
  packageDefs: PackageDef[];
  patientPackages: PatientPackage[];
  giftCards: GiftCard[];
  expenses: Expense[];
  notes: ClinicalNote[];
  consents: ConsentRecord[];
  campaigns: Campaign[];
  plans: MarketingPlan[];
  automations: Automation[];
  meta: MetaConnection;
  activity: ActivityLog[];
}

export const DB_VERSION = 4;

const FEMALE = ['Maya', 'Rita', 'Nour', 'Lara', 'Yasmine', 'Cynthia', 'Joelle', 'Rania', 'Hiba', 'Lea', 'Carla', 'Tala', 'Sara', 'Dana', 'Mira', 'Zeina', 'Christelle', 'Layal'];
const MALE = ['Karim', 'Ziad', 'Elie', 'Georges', 'Hadi', 'Ali', 'Omar', 'Rami', 'Fadi', 'Charbel', 'Marc', 'Jad', 'Hassan', 'Tony', 'Wael', 'Nabil'];
const LAST = ['Khoury', 'Haddad', 'Saad', 'Nassar', 'Abou Jaoude', 'Mansour', 'Fares', 'Hajj', 'Aoun', 'Chamoun', 'Daher', 'Karam', 'Salameh', 'Itani', 'Sleiman', 'Zein', 'Bitar', 'Hamdan', 'Gemayel', 'Moussa'];
const PREFIX = ['70', '71', '76', '78', '81', '03'];

type ServiceSeed = [name: string, category: string, duration: number, price: number, recallDays?: number];

const SERVICES: Record<Vertical, ServiceSeed[]> = {
  dental: [
    ['Consultation & X-ray', 'Diagnostics', 30, 40],
    ['Scaling & polishing', 'Hygiene', 45, 70, 180],
    ['Composite filling', 'Restorative', 45, 90],
    ['Root canal treatment', 'Endodontics', 90, 350],
    ['Zirconia crown', 'Prosthetics', 60, 450],
    ['Single implant', 'Implants', 90, 1200],
    ['Teeth whitening', 'Cosmetic', 60, 300, 365],
    ['Clear aligners consult', 'Orthodontics', 30, 50],
    ['Kids check-up', 'Pediatric', 30, 35, 180],
    ['Extraction', 'Surgery', 30, 80],
  ],
  aesthetic: [
    ['Consultation', 'Consult', 30, 30],
    ['Botox (per area)', 'Injectables', 30, 180, 120],
    ['Dermal filler 1ml', 'Injectables', 45, 320, 270],
    ['Laser hair removal – legs', 'Laser', 60, 120, 35],
    ['HydraFacial', 'Skin', 60, 150, 30],
    ['Chemical peel', 'Skin', 45, 110, 30],
    ['PRP hair therapy', 'Hair', 60, 250, 30],
    ['Microneedling', 'Skin', 60, 160, 30],
    ['Skin booster', 'Injectables', 45, 280, 90],
  ],
  spa: [
    ['Swedish massage 60′', 'Massage', 60, 65, 30],
    ['Deep tissue 90′', 'Massage', 90, 95, 30],
    ['Moroccan hammam', 'Hammam', 60, 55, 30],
    ['Signature facial', 'Facial', 60, 85, 30],
    ['Hot stone massage', 'Massage', 75, 90],
    ['Couples massage', 'Massage', 60, 160],
    ['Mani & pedi', 'Nails', 60, 40, 21],
    ['Body scrub & wrap', 'Body', 60, 60],
    ['Aromatherapy', 'Massage', 60, 75],
  ],
  medical: [
    ['Consultation', 'Consult', 30, 50],
    ['Follow-up', 'Consult', 20, 30],
    ['Skin biopsy', 'Procedure', 30, 150],
    ['Mole check', 'Diagnostics', 30, 70, 365],
  ],
};

type ProductSeed = [name: string, category: string, price: number, cost: number, stock: number, retail: boolean, lot?: string, expiryDays?: number];

const PRODUCTS: Record<Vertical, ProductSeed[]> = {
  dental: [
    ['Home whitening kit', 'Retail', 45, 18, 22, true],
    ['Electric toothbrush', 'Retail', 70, 38, 9, true],
    ['Articaine cartridges (50)', 'Consumable', 0, 32, 14, false, 'ART-2411', 220],
    ['Composite resin A2', 'Consumable', 0, 55, 6, false, 'CR-0925', 300],
    ['Implant fixture 4.0×10', 'Implants', 0, 210, 5, false, 'IMP-7781', 900],
    ['Fluoride mouthwash', 'Retail', 12, 5, 40, true],
  ],
  aesthetic: [
    ['Botulinum toxin 100U vial', 'Injectables', 0, 220, 7, false, 'BTX-55A1', 120],
    ['Hyaluronic filler 1ml', 'Injectables', 0, 115, 18, false, 'HA-90311', 400],
    ['SPF 50 fluid', 'Retail', 38, 16, 25, true],
    ['Vitamin C serum', 'Retail', 55, 22, 3, true],
    ['Numbing cream 30g', 'Consumable', 0, 14, 11, false, 'NUM-221', 60],
    ['Hydrating mask', 'Retail', 18, 6, 30, true],
  ],
  spa: [
    ['Argan massage oil 1L', 'Consumable', 0, 24, 8, false],
    ['Black soap (hammam)', 'Consumable', 0, 9, 16, false],
    ['Cedar candle', 'Retail', 28, 9, 19, true],
    ['Body lotion 250ml', 'Retail', 32, 11, 4, true],
    ['Bath robe', 'Retail', 65, 30, 10, true],
  ],
  medical: [['Medical sunscreen', 'Retail', 30, 12, 15, true]],
};

const STAFF: Record<Vertical, [string, string][]> = {
  dental: [
    ['Dr. Nadine Khoury', 'Dentist – owner'],
    ['Dr. Joe Haddad', 'Implantologist'],
    ['Rima Saad', 'Hygienist'],
  ],
  aesthetic: [
    ['Dr. Lina Fares', 'Aesthetic physician'],
    ['Mira Daher', 'Laser technician'],
    ['Christelle Aoun', 'Skin therapist'],
  ],
  spa: [
    ['Leila Mansour', 'Senior therapist'],
    ['Sami Nassar', 'Massage therapist'],
    ['Yara Itani', 'Facialist'],
    ['Hiba Zein', 'Hammam attendant'],
  ],
  medical: [['Dr. Karim Karam', 'Dermatologist']],
};

const COLORS = ['#1f9880', '#e46a48', '#6366f1', '#d97706', '#0ea5e9', '#a855f7'];

const CAMPAIGNS: Record<Vertical, [string, Campaign['objective'], number][]> = {
  dental: [
    ['Implants – Free consult – Beirut 30km', 'MESSAGES', 25],
    ['Whitening summer offer', 'LEADS', 15],
    ['Aligners – Instagram reels', 'MESSAGES', 12],
  ],
  aesthetic: [
    ['Botox first visit offer', 'MESSAGES', 20],
    ['Laser packages – women 22–45', 'LEADS', 18],
  ],
  spa: [
    ['Couples massage – weekends', 'MESSAGES', 12],
    ['Hammam & facial bundle', 'LEADS', 10],
    ['Gift cards – Mother’s Day', 'TRAFFIC', 8],
  ],
  medical: [],
};

const INTEREST: Record<Vertical, string[]> = {
  dental: ['Implants', 'Whitening', 'Aligners', 'Check-up', 'Crown', 'Kids dentist'],
  aesthetic: ['Botox', 'Filler', 'Laser hair removal', 'HydraFacial', 'PRP'],
  spa: ['Couples massage', 'Hammam', 'Facial', 'Gift card', 'Membership'],
  medical: ['Consultation'],
};

const FIRST_MSG: Record<Vertical, string[]> = {
  dental: ['Hi, how much is an implant?', 'Is the free consultation still available?', 'Bonjour, je voudrais un rendez-vous pour un détartrage', 'مرحبا، قديش سعر تبييض الأسنان؟', 'Do you do clear aligners?'],
  aesthetic: ['Hello, price for botox please', 'Is the laser package still on offer?', 'مرحبا بدي موعد فيلر', 'Do you have an appointment this week for a HydraFacial?'],
  spa: ['Hi! Couples massage available Saturday?', 'How much is the hammam?', 'I want to buy a gift card for my mom', 'مرحبا، عندكم مواعيد اليوم؟'],
  medical: ['Hello, I need a consultation'],
};

export function buildSeed(): DB {
  const r = rng(42);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const int = (a: number, b: number) => Math.floor(a + r() * (b - a + 1));
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const daysAgo = (n: number, h = 10, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(h, m, 0, 0);
    return d;
  };
  // same as daysAgo but never in the future (for things that already happened)
  const pastAgo = (n: number, h = 10, m = 0) => {
    const d = daysAgo(n, h, m);
    return d > now ? new Date(now.getTime() - (5 + Math.floor(r() * 300)) * 60000) : d;
  };
  let idc = 0;
  const id = (p: string) => `${p}_${(++idc).toString(36)}`;

  const db: DB = {
    version: DB_VERSION,
    tenants: [],
    users: [{ id: 'u_super', name: 'Clinqo HQ', email: 'admin@clinqo.app', role: 'super_admin' }],
    staff: [],
    services: [],
    products: [],
    patients: [],
    leads: [],
    conversations: [],
    appointments: [],
    invoices: [],
    packageDefs: [],
    patientPackages: [],
    giftCards: [],
    expenses: [],
    notes: [],
    consents: [],
    campaigns: [],
    plans: [],
    automations: [],
    meta: {
      connected: true,
      businessName: 'Clinqo Agency (Business Manager)',
      businessId: '1849302215573',
      connectedAt: iso(daysAgo(70)),
      adAccounts: [
        { id: 'act_2203911844', name: 'Smile Studio – Ads', currency: 'USD' },
        { id: 'act_2203911851', name: 'Cedar Spa – Ads', currency: 'USD' },
        { id: 'act_2203911877', name: 'Karam Derm – Ads', currency: 'USD' },
        { id: 'act_2203911902', name: 'Unassigned account', currency: 'USD' },
      ],
    },
    activity: [],
  };

  const tenantSeeds: {
    t: Omit<Tenant, 'modules' | 'monthlyFeeUSD' | 'createdAt' | 'limits' | 'currency' | 'secondaryCurrency' | 'exchangeRate' | 'vatRate'>;
    patients: number;
    days: number;
    created: number;
  }[] = [
    {
      t: {
        id: 't_smile',
        name: 'Smile Studio Dental',
        vertical: 'dental',
        country: 'Lebanon',
        city: 'Beirut – Achrafieh',
        plan: 'growth',
        status: 'active',
        businessModel: 'Premium dental clinic. Growth via implants and whitening offers on Meta. WhatsApp is the main booking channel.',
        hasOwnAgency: false,
        ownerName: 'Dr. Nadine Khoury',
        ownerEmail: 'nadine@smilestudio.lb',
        phone: '+961 1 201 445',
        brandColor: '#1f9880',
        metaAdAccountId: 'act_2203911844',
        whatsappNumber: '+961 76 220 145',
        instagramHandle: '@smilestudio.lb',
      },
      patients: 70,
      days: 45,
      created: 75,
    },
    {
      t: {
        id: 't_lumiere',
        name: 'Lumière Aesthetic Clinic',
        vertical: 'aesthetic',
        country: 'Lebanon',
        city: 'Jounieh',
        plan: 'operations',
        status: 'active',
        businessModel: 'Has its own marketing agency. Uses Clinqo only as the operating system: CRM, booking, POS, packages, inventory.',
        hasOwnAgency: true,
        ownerName: 'Dr. Lina Fares',
        ownerEmail: 'lina@lumiere.lb',
        phone: '+961 9 640 118',
        brandColor: '#a855f7',
        whatsappNumber: '+961 71 640 118',
        instagramHandle: '@lumiere.clinic',
      },
      patients: 55,
      days: 40,
      created: 50,
    },
    {
      t: {
        id: 't_cedar',
        name: 'Cedar Wellness Spa',
        vertical: 'spa',
        country: 'Lebanon',
        city: 'Beirut – Downtown',
        plan: 'growth',
        status: 'active',
        businessModel: 'Day spa with hammam. Weekend couples demand, gift cards around holidays, memberships for regulars.',
        hasOwnAgency: false,
        ownerName: 'Rana Hamdan',
        ownerEmail: 'rana@cedarspa.lb',
        phone: '+961 1 990 312',
        brandColor: '#d97706',
        metaAdAccountId: 'act_2203911851',
        whatsappNumber: '+961 78 990 312',
        instagramHandle: '@cedar.spa',
      },
      patients: 60,
      days: 40,
      created: 60,
    },
    {
      t: {
        id: 't_karam',
        name: 'Karam Dermatology',
        vertical: 'medical',
        country: 'Lebanon',
        city: 'Zahle',
        plan: 'marketing',
        status: 'onboarding',
        businessModel: 'New client. Marketing plan in review; ad account assigned, waiting for client approval before ad spend.',
        hasOwnAgency: false,
        ownerName: 'Dr. Karim Karam',
        ownerEmail: 'karim@karamderm.lb',
        phone: '+961 8 812 004',
        brandColor: '#0ea5e9',
        metaAdAccountId: 'act_2203911877',
      },
      patients: 0,
      days: 0,
      created: 4,
    },
  ];

  for (const ts of tenantSeeds) {
    const preset = PRESETS[ts.t.plan];
    const tenant: Tenant = {
      ...ts.t,
      currency: 'USD',
      secondaryCurrency: 'LBP',
      exchangeRate: 89500,
      vatRate: 11,
      modules: { ...preset.modules },
      monthlyFeeUSD: preset.fee,
      createdAt: iso(daysAgo(ts.created)),
      limits: { users: 10, branches: 1 },
    };
    db.tenants.push(tenant);
    const tid = tenant.id;
    const v = tenant.vertical;

    db.users.push(
      { id: id('u'), tenantId: tid, name: tenant.ownerName, email: tenant.ownerEmail, role: 'owner' },
      { id: id('u'), tenantId: tid, name: 'Front desk', email: `desk@${tid.slice(2)}.lb`, role: 'reception' },
    );

    const staff = STAFF[v].map(([name, title], i) => ({
      id: id('st'),
      tenantId: tid,
      name,
      title,
      color: COLORS[i % COLORS.length],
      commissionRate: i === 0 ? 0 : 15 + i * 5,
      active: true,
    }));
    db.staff.push(...staff);
    const services: Service[] = SERVICES[v].map(([name, category, duration, price, recallDays]) => ({
      id: id('sv'),
      tenantId: tid,
      name,
      category,
      duration,
      price,
      recallDays,
    }));
    db.services.push(...services);
    db.products.push(
      ...PRODUCTS[v].map(([name, category, price, cost, stock, retail, lot, exp]) => ({
        id: id('pr'),
        tenantId: tid,
        name,
        sku: name.slice(0, 3).toUpperCase() + '-' + int(100, 999),
        category,
        price,
        cost,
        stock,
        lowStock: 5,
        retail,
        lot,
        expiry: exp ? iso(daysAgo(-exp)).slice(0, 10) : undefined,
      })) as Product[],
    );

    // Marketing plan & campaigns
    const campaigns: Campaign[] = tenant.modules.marketing
      ? CAMPAIGNS[v].map(([name, objective, daily], i) => {
          const days = Math.min(ts.days, 40 - i * 8);
          const spend = Math.round(daily * days * (0.85 + r() * 0.2));
          return {
            id: id('cp'),
            tenantId: tid,
            metaCampaignId: '23851' + int(100000000, 999999999),
            name,
            objective,
            status: i === 2 && r() > 0.5 ? 'PAUSED' : 'ACTIVE',
            dailyBudget: daily,
            spend,
            impressions: spend * int(90, 140),
            clicks: Math.round(spend * (2.2 + r())),
            startDate: iso(daysAgo(days)).slice(0, 10),
          } as Campaign;
        })
      : [];
    db.campaigns.push(...campaigns);
    if (tenant.modules.marketing) {
      db.plans.push({
        tenantId: tid,
        goal:
          v === 'dental'
            ? 'Fill implant and whitening chairs: 40 new patients per month'
            : v === 'spa'
              ? 'Sell weekend couples slots and 120 gift cards before the holidays'
              : 'Launch: 25 new consultations per month in Zahle and Bekaa',
        monthlyBudget: v === 'medical' ? 450 : campaigns.reduce((s, c) => s + c.dailyBudget * 30, 0),
        targetCPL: v === 'dental' ? 6 : 5,
        targetBookings: v === 'dental' ? 40 : v === 'spa' ? 60 : 25,
        offers:
          v === 'dental'
            ? ['Free implant consultation + 3D scan', 'Whitening $249 (instead of $300)']
            : v === 'spa'
              ? ['Couples massage + hammam $199', 'Gift card bonus: $20 on $100']
              : ['First consultation $35', 'Free mole check for new patients in March'],
        audiences: ['Beirut + 30km, 25–55', 'Lookalike of paying patients', 'Instagram engagers 365d'],
        channels: ['Meta Ads (FB + IG)', 'Click-to-WhatsApp', 'Instagram content'],
        approvedByClient: v !== 'medical',
        phase: v === 'medical' ? 'plan' : 'optimizing',
        updatedAt: iso(daysAgo(v === 'medical' ? 1 : 12)),
      });
    }
    if (ts.patients === 0) continue;

    // Packages
    const pkgDefs: PackageDef[] = [
      { id: id('pk'), tenantId: tid, name: `6 × ${services[v === 'dental' ? 1 : 3].name}`, serviceId: services[v === 'dental' ? 1 : 3].id, sessions: 6, price: Math.round(services[v === 'dental' ? 1 : 3].price * 6 * 0.8), validityDays: 365, kind: 'package' },
      { id: id('pk'), tenantId: tid, name: v === 'spa' ? 'Monthly ritual membership' : 'Care club membership', serviceId: services[v === 'spa' ? 0 : 1].id, sessions: 1, price: v === 'spa' ? 59 : 49, validityDays: 30, kind: 'membership' },
    ];
    db.packageDefs.push(...pkgDefs);

    // Patients
    const patients: Patient[] = [];
    for (let i = 0; i < ts.patients; i++) {
      const female = v === 'dental' ? r() > 0.45 : r() > 0.15;
      const roll = r();
      let source: LeadSource;
      if (tenant.modules.marketing) source = roll < 0.38 ? 'meta_ads' : roll < 0.5 ? 'instagram' : roll < 0.6 ? 'whatsapp' : roll < 0.72 ? 'referral' : roll < 0.85 ? 'loyal' : roll < 0.93 ? 'import' : 'walk_in';
      else source = roll < 0.25 ? 'instagram' : roll < 0.45 ? 'referral' : roll < 0.7 ? 'loyal' : roll < 0.85 ? 'import' : 'walk_in';
      const created = source === 'loyal' || source === 'import' ? ts.created : int(0, ts.days + 5);
      const p: Patient = {
        id: id('pt'),
        tenantId: tid,
        firstName: female ? pick(FEMALE) : pick(MALE),
        lastName: pick(LAST),
        phone: `+961 ${pick(PREFIX)} ${int(100, 999)} ${int(100, 999)}`,
        gender: female ? 'female' : 'male',
        dob: `${int(1965, 2004)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
        source,
        campaignId: source === 'meta_ads' && campaigns.length ? pick(campaigns).id : undefined,
        tags: r() > 0.8 ? ['VIP'] : r() > 0.85 ? ['Price sensitive'] : [],
        notes: '',
        marketingConsent: r() > 0.2,
        allergies: r() > 0.9 ? 'Penicillin' : undefined,
        createdAt: iso(pastAgo(created, int(9, 18))),
      };
      p.email = `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase().replace(/\s/g, '')}@gmail.com`;
      if (v === 'dental') {
        const teeth: Record<string, ToothState> = {};
        const states = ['caries', 'filled', 'crown', 'missing', 'root_canal', 'planned'] as const;
        const n = int(0, 5);
        for (let k = 0; k < n; k++) teeth[String(pick([11, 12, 14, 16, 17, 21, 24, 26, 27, 36, 37, 46, 47, 45, 35]))] = pick([...states]);
        p.teeth = teeth;
      }
      patients.push(p);
    }
    db.patients.push(...patients);

    // Appointments + invoices
    let invNo = 1000;
    const methods: PaymentMethod[] = ['cash_usd', 'cash_usd', 'card', 'whish', 'cash_lbp', 'omt'];
    for (let d = ts.days; d >= -7; d--) {
      const day = daysAgo(d);
      if (day.getDay() === 0 && d !== 0) continue; // closed Sundays (today always open so the demo has a live day)
      for (const s of staff) {
        let hour = 9;
        let minute = r() > 0.5 ? 30 : 0;
        const count = int(2, v === 'spa' ? 5 : 4);
        for (let k = 0; k < count && hour < 18; k++) {
          const svc = pick(services);
          const pt = pick(patients);
          if (new Date(pt.createdAt) > day && d > 0) continue;
          const start = daysAgo(d, hour, minute);
          let status: AppointmentStatus;
          if (d > 0) status = r() < 0.08 ? 'no_show' : r() < 0.06 ? 'cancelled' : 'completed';
          else if (d === 0) status = start < now ? (r() < 0.8 ? 'completed' : 'arrived') : r() < 0.6 ? 'confirmed' : 'booked';
          else status = r() < 0.45 ? 'confirmed' : 'booked';
          const appt: Appointment = {
            id: id('ap'),
            tenantId: tid,
            patientId: pt.id,
            serviceId: svc.id,
            staffId: s.id,
            start: iso(start),
            duration: svc.duration,
            status,
            deposit: svc.price >= 300 && r() > 0.4 ? 50 : undefined,
          };
          if (status === 'completed' && tenant.modules.pos) {
            const items: Invoice['items'] = [{ kind: 'service', refId: svc.id, name: svc.name, qty: 1, price: svc.price, staffId: s.id }];
            const retail = db.products.filter((x) => x.tenantId === tid && x.retail);
            if (r() > 0.75 && retail.length) {
              const pr = pick(retail);
              items.push({ kind: 'product', refId: pr.id, name: pr.name, qty: 1, price: pr.price });
            }
            const sub = items.reduce((a, b) => a + b.price * b.qty, 0);
            const discount = r() > 0.85 ? Math.round(sub * 0.1) : 0;
            const total = sub - discount;
            const m = pick(methods);
            const inv: Invoice = {
              id: id('in'),
              tenantId: tid,
              number: `${tid.slice(2, 4).toUpperCase()}-${++invNo}`,
              patientId: pt.id,
              appointmentId: appt.id,
              items,
              discount,
              vat: 0,
              total,
              payments: [
                {
                  method: m,
                  currency: m === 'cash_lbp' ? 'LBP' : 'USD',
                  amount: m === 'cash_lbp' ? total * tenant.exchangeRate : total,
                  amountUSD: total,
                },
              ],
              status: 'paid',
              createdAt: iso(new Date(start.getTime() + svc.duration * 60000)),
            };
            appt.invoiceId = inv.id;
            db.invoices.push(inv);
          }
          db.appointments.push(appt);
          minute += svc.duration + (r() > 0.5 ? 30 : 0);
          hour += Math.floor(minute / 60);
          minute = minute % 60;
        }
      }
    }

    // Leads
    const leadCount = tenant.modules.marketing ? Math.round(campaigns.reduce((a, c) => a + c.spend, 0) / 6.5) : 22;
    for (let i = 0; i < leadCount; i++) {
      const age = int(0, Math.min(ts.days, 35));
      const stage: LeadStage = age < 1 ? pick(['new', 'new', 'contacted'] as LeadStage[]) : pick(['contacted', 'contacted', 'contacted', 'lost', 'lost', 'lost', 'lost', 'consult_booked', 'attended', 'won', 'won'] as LeadStage[]);
      const female = r() > 0.35;
      const src: LeadSource = tenant.modules.marketing ? pick(['meta_ads', 'meta_ads', 'meta_ads', 'meta_ads', 'meta_ads', 'meta_ads', 'instagram', 'whatsapp', 'website']) : pick(['instagram', 'whatsapp', 'referral', 'website']);
      const interest = pick(INTEREST[v]);
      const svc = services.find((s) => s.name.toLowerCase().includes(interest.toLowerCase().split(' ')[0])) ?? pick(services);
      const matched = stage === 'won' || stage === 'attended' ? pick(patients.filter((p) => p.source === 'meta_ads' || p.source === 'instagram' || p.source === 'whatsapp')) : undefined;
      db.leads.push({
        id: id('ld'),
        tenantId: tid,
        name: matched ? `${matched.firstName} ${matched.lastName}` : `${female ? pick(FEMALE) : pick(MALE)} ${pick(LAST)}`,
        phone: matched?.phone ?? `+961 ${pick(PREFIX)} ${int(100, 999)} ${int(100, 999)}`,
        source: src,
        campaignId: src === 'meta_ads' && campaigns.length ? (matched?.campaignId ?? pick(campaigns).id) : undefined,
        interest,
        stage,
        value: svc.price,
        createdAt: iso(pastAgo(age, int(8, 22), int(0, 59))),
        firstResponseMins: stage === 'new' ? undefined : int(1, 95),
        patientId: matched?.id,
      });
    }

    // Conversations (most recent leads)
    const recent = db.leads.filter((l) => l.tenantId === tid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 9);
    recent.forEach((l, i) => {
      const t0 = new Date(l.createdAt);
      const msgs: Conversation['messages'] = [{ id: id('m'), from: 'contact', text: pick(FIRST_MSG[v]), at: iso(t0) }];
      if (l.stage !== 'new') {
        msgs.push({ id: id('m'), from: 'bot', text: `Hi ${l.name.split(' ')[0]}! Thanks for reaching ${tenant.name}. Which day suits you best for a visit?`, at: iso(new Date(t0.getTime() + 60000)) });
        msgs.push({ id: id('m'), from: 'contact', text: pick(['Saturday morning if possible', 'Any day after 5pm', 'Tomorrow?', 'شو الأسعار؟']), at: iso(new Date(t0.getTime() + 6 * 60000)) });
        if (l.stage !== 'contacted') msgs.push({ id: id('m'), from: 'staff', text: 'You are booked ✅ We will send you a reminder the day before. Location: ' + tenant.city, at: iso(new Date(t0.getTime() + 15 * 60000)) });
      }
      db.conversations.push({
        id: id('cv'),
        tenantId: tid,
        channel: l.source === 'instagram' ? 'instagram' : i % 4 === 3 ? 'messenger' : 'whatsapp',
        contactName: l.name,
        phone: l.phone,
        leadId: l.id,
        patientId: l.patientId,
        campaignId: l.campaignId,
        messages: msgs,
        unread: l.stage === 'new' ? 1 : l.stage === 'contacted' ? 1 : 0,
        status: l.stage === 'lost' ? 'closed' : 'open',
      });
    });

    // Packages sold, gift cards
    for (let i = 0; i < 8; i++) {
      const def = pick(pkgDefs);
      const p = pick(patients);
      db.patientPackages.push({ id: id('pp'), tenantId: tid, patientId: p.id, packageId: def.id, remaining: int(1, def.sessions), expires: iso(daysAgo(-int(20, def.validityDays))).slice(0, 10), purchasedAt: iso(daysAgo(int(5, 40))) });
    }
    for (let i = 0; i < 5; i++) {
      const initial = pick([50, 100, 150, 200]);
      db.giftCards.push({ id: id('gc'), tenantId: tid, code: `GC-${int(1000, 9999)}-${int(10, 99)}`, initial, balance: r() > 0.5 ? initial : Math.round(initial * r()), buyer: `${pick(FEMALE)} ${pick(LAST)}`, createdAt: iso(daysAgo(int(1, 40))) });
    }

    // Expenses (3 months)
    for (let mth = 0; mth < 3; mth++) {
      const base = daysAgo(mth * 30 + 2);
      const add = (category: string, vendor: string, amount: number) =>
        db.expenses.push({ id: id('ex'), tenantId: tid, category, vendor, amount, date: iso(base).slice(0, 10) });
      add('Rent', 'Landlord', v === 'spa' ? 3200 : 2200);
      add('Salaries', 'Payroll', v === 'spa' ? 5200 : 4300);
      add('Generator subscription', 'Neighbourhood generator', int(180, 260));
      add('Electricity (EDL)', 'EDL', int(60, 120));
      add('Supplies', v === 'dental' ? 'Dental supplier' : 'Medical supplier', int(600, 1400));
      add('Internet & phone', 'Ogero / Alfa', 85);
      if (tenant.modules.marketing) add('Clinqo subscription', 'Clinqo', tenant.monthlyFeeUSD);
    }
    // Ad spend as an expense line (pulled from Meta)
    if (campaigns.length) {
      db.expenses.push({ id: id('ex'), tenantId: tid, category: 'Meta ad spend', vendor: 'Meta Platforms', amount: campaigns.reduce((s, c) => s + c.spend, 0), date: iso(daysAgo(1)).slice(0, 10), note: 'Synced from Meta Marketing API' });
    }

    // Clinical notes and consents
    for (let i = 0; i < 25; i++) {
      const p = pick(patients);
      const s = pick(staff);
      db.notes.push({
        id: id('cn'),
        tenantId: tid,
        patientId: p.id,
        staffId: s.id,
        date: iso(daysAgo(int(1, ts.days))),
        title: pick(services).name,
        body:
          v === 'dental'
            ? pick(['Local anaesthesia, 1 carpule articaine. Procedure uneventful. Review in 6 months.', 'Patient reports sensitivity on 26. Advised desensitising paste.', 'Impression taken for crown. Temporary placed.'])
            : v === 'aesthetic'
              ? pick(['20U glabella, 12U forehead. Lot BTX-55A1. Review in 2 weeks.', 'Session 3/6, fluence increased. No adverse reaction.', '1ml HA lips, lot HA-90311. Ice applied.'])
              : pick(['Prefers medium pressure, no oils on face.', 'Lower back tension, focus area. Recommended monthly.', 'Sensitive skin – used fragrance-free products.']),
      });
    }
    const forms = v === 'dental' ? ['Treatment consent', 'Implant surgery consent', 'X-ray consent'] : v === 'aesthetic' ? ['Botulinum toxin consent', 'Filler consent', 'Laser consent', 'Photo consent'] : ['Massage health questionnaire', 'Hammam consent'];
    for (const p of patients.slice(0, 30)) {
      db.consents.push({ id: id('cs'), tenantId: tid, patientId: p.id, form: pick(forms), signedAt: r() > 0.2 ? iso(daysAgo(int(1, 30))) : undefined });
    }

    // Automations
    const autos: [string, string, string][] = [
      ['Appointment reminder', '24h before appointment', 'Hi {first_name}, reminder of your {service} tomorrow at {time} at {clinic}. Reply 1 to confirm, 2 to reschedule.'],
      ['Enquiry not booked', 'Lead with no booking after 2h', 'Hi {first_name}, still interested in {interest}? We have slots this week, want me to book one?'],
      ['No-show follow-up', 'Appointment marked no-show', 'We missed you today {first_name}! Want to pick a new time?'],
      ['Post-visit review', '2h after completed visit', 'Thank you for visiting {clinic} ✨ Could you rate your visit? {review_link}'],
      ['Recall due', 'Service recall date reached', 'Hi {first_name}, it’s time for your next {service}. Book here: {booking_link}'],
      ['Birthday offer', 'Patient birthday', 'Happy birthday {first_name}! 🎉 Enjoy 15% off your next visit this month.'],
    ];
    autos.forEach(([name, trigger, message], i) =>
      db.automations.push({ id: id('au'), tenantId: tid, name, trigger, channel: 'whatsapp', message, enabled: i < 5, sent: int(20, 400) }),
    );
  }

  db.activity.push(
    { id: id('ac'), at: iso(daysAgo(0, 9, 12)), actor: 'Clinqo HQ', text: 'Synced Meta ad spend for 2 tenants' },
    { id: id('ac'), tenantId: 't_karam', at: iso(daysAgo(1, 16, 4)), actor: 'Clinqo HQ', text: 'Marketing plan sent to Karam Dermatology for approval' },
    { id: id('ac'), tenantId: 't_lumiere', at: iso(daysAgo(3, 11, 40)), actor: 'Clinqo HQ', text: 'Disabled Marketing module for Lumière (client has own agency)' },
  );

  return db;
}

/** Starter catalog applied to every new tenant so they are usable on day one */
export function starterCatalog(tenantId: string, vertical: Vertical, ownerName: string) {
  const rid = () => Math.random().toString(36).slice(2, 9);
  const services: Service[] = SERVICES[vertical].map(([name, category, duration, price, recallDays]) => ({
    id: 'sv_' + rid(),
    tenantId,
    name,
    category,
    duration,
    price,
    recallDays,
  }));
  const staff: Staff[] = [{ id: 'st_' + rid(), tenantId, name: ownerName, title: 'Owner', color: COLORS[0], commissionRate: 0, active: true }];
  const automations: Automation[] = [
    ['Appointment reminder', '24h before appointment', 'Hi {first_name}, reminder of your {service} tomorrow at {time}. Reply 1 to confirm, 2 to reschedule.'],
    ['Enquiry not booked', 'Lead with no booking after 2h', 'Hi {first_name}, still interested in {interest}? We have slots this week.'],
    ['Post-visit review', '2h after completed visit', 'Thank you for visiting {clinic}! Could you rate your visit? {review_link}'],
  ].map(([name, trigger, message]) => ({ id: 'au_' + rid(), tenantId, name, trigger, channel: 'whatsapp' as const, message, enabled: true, sent: 0 }));
  return { services, staff, automations };
}

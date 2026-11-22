# Clinqo

The operating system for clinics and spas, with the growth team built in.
Meta lead ads straight into the CRM, booking, clinical records, POS, packages, inventory and finance, all in one record per patient.

**Test build:** https://sebahi696.github.io/clinqo/

> This is the **test build** for GitHub Pages. It runs entirely in the browser: data is demo data saved in your browser's localStorage, and the Meta connection is simulated. Use "Reset demo data" on the sign-in page to start over.

## How to test

1. Open the test build and sign in as **Clinqo super admin**.
2. Look at the platform overview, then open **Tenants**.
3. Create a tenant with **New tenant**. Tick "Client already has a marketing agency" to get the Operating system plan (CRM, POS, sales, clinic ops, no ad management).
4. On a tenant, use **Features & plan** to switch modules on or off. The tenant's menu changes instantly.
5. Press **Open as tenant** to see the clinic's view. Press **Back to super admin** to return.
6. Sign out and sign in as a clinic user (owner or front desk) to test roles. Front desk does not see Finance or Reports.

Demo tenants (Lebanon):

| Tenant | Type | Plan | What it shows |
| --- | --- | --- | --- |
| Smile Studio Dental | Dental | Growth suite | Meta lead ad → call → booking → POS, dental chart |
| Lumière Aesthetic Clinic | Aesthetic | Operating system | Client with own agency: no Marketing module |
| Cedar Wellness Spa | Spa | Growth suite | Packages, memberships, gift cards, couples |
| Karam Dermatology | Medical | Marketing only | Onboarding: plan waiting for client approval |

## What is in the build

**Super admin (Clinqo HQ)**
- Platform overview: tenants, MRR, managed ad spend, leads, ROAS per tenant, onboarding pipeline
- Tenants: create (4-step wizard), edit profile, status, fee, user and branch limits
- Feature switches per tenant with presets: Growth suite, Operating system, Marketing only, Custom
- Meta Business Manager connection, ad account list, assign one ad account (and Facebook page) per tenant, sync of spend and lead-form leads
- Marketing plan per tenant: goal, budget, target CPL, offers, audiences, phase (plan → configuration → ad spend → optimizing), client approval
- Tenant users and roles; activity log; open any tenant as admin

**Tenant (clinic / spa)** — each module can be switched off by the super admin
- Dashboard: today's schedule, revenue, new leads, unread messages, ad performance, stock alerts
- Marketing: growth plan, ad funnel (spend → leads → booked → attended → paying → revenue), campaigns with CPL, cost per patient, ROAS, monthly report
- Leads: Meta lead-form leads arrive with campaign, form and answers; call or WhatsApp in one tap (click-to-chat, no API); drag-and-drop pipeline; time to first contact; add by hand; import a Meta Leads Center CSV or any sheet; export
- Patients / clients: 360 profile with timeline, appointments, dental chart (FDI), clinical notes, consent forms, packages, invoices; CSV import from Excel or old systems
- Calendar: day view by provider, week strip, click a slot to book, statuses, deposits, WhatsApp reminder, checkout
- POS: services, products, packages, gift cards; USD + LBP; Cash USD, Cash LBP, card, Whish, OMT, bank, gift card; split payments; package session redemption; VAT toggle; printable receipt
- Invoices: filters, settle balances, refunds, export for accountant
- Packages, memberships and gift cards, with unused-session liability
- Inventory: retail and consumables, lot numbers and expiry, low stock alerts
- Finance: monthly P&L (revenue, cost of products, commissions, expenses incl. generator and Meta ad spend), cash drawer by currency, expenses, commissions
- Follow-ups: tomorrow's reminders, recalls due, no-shows and review requests as lists; one click opens WhatsApp with the template filled in (no messaging API)
- Reports: revenue by service, provider utilisation, payment mix, lead source conversion
- Staff, settings (exchange rate, VAT, service catalog), English / العربية (RTL) / Français

## Develop

```bash
npm install
npm run dev      # http://localhost:5173/clinqo/
npm run build    # outputs dist/
```

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.
In the repo settings, **Pages → Source** must be set to **GitHub Actions**.

## Structure

```
src/
  lib/types.ts       domain model (every record carries tenantId)
  lib/modules.ts     modules, plan presets, role access
  lib/seed.ts        Lebanon demo data + starter catalog for new tenants
  lib/metrics.ts     ad funnel / ROAS and revenue calculations
  store/db.ts        the client-side "backend" (zustand + localStorage)
  components/        layouts, UI kit, booking modal, tooth chart
  pages/admin/       super admin panel
  pages/tenant/      clinic / spa app
```

## Going live: what the test build stands in for

`src/store/db.ts` is the only place that stores data, so it can be swapped for a real API without touching the pages.

1. **Backend + auth:** Postgres (e.g. Supabase) with row-level security on `tenant_id`, real logins per user and role.
2. **Meta (ads only):** one Meta app for Clinqo with `ads_read` (spend and results per campaign) and `leads_retrieval` (Lead Ads webhook delivers each lead-form submission into the right tenant). The marketer keeps working in Ads Manager. Meta restricts health data, so no treatment names are ever sent back to Meta.
3. **No messaging APIs:** no WhatsApp, Instagram or Messenger integration and no per-clinic business verification. Staff contact leads by phone or WhatsApp click-to-chat links.
4. **Payments:** Whish, OMT and card references recorded at checkout.
5. **Hosting** for the live app (GitHub Pages stays as the test build).

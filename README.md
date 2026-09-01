# Aviation Incident Investigation Assistant

A self-contained, keyless web application that guides a user through the full lifecycle of
investigating an aviation occurrence — from initial notification through data collection, causal
analysis, corrective/preventive action tracking, independent review, and final report generation.

Built as a portfolio-grade demonstration of applied domain modeling, disciplined spec-driven
software engineering, and a responsible pattern for "AI-adjacent" decision-support tooling that
requires **no external API key, no paid service, and no external AI provider** of any kind.

> **Status**: implementation in progress. Phases 1–4 of a 16-phase plan are built — project
> foundation, database schema, authentication and layout, and investigation creation/list/detail/
> assignment — plus a production-hardening pass (security headers, error boundaries, health check)
> pulled forward ahead of its normal place in the sequence. See [§Key Features](#key-features) below
> for exactly what's implemented versus specified-but-not-yet-built, and
> [`specs/implementation-plan.md`](specs/implementation-plan.md) for the full phase breakdown.

---

## Table of Contents

1. [Purpose](#purpose)
2. [Problem Being Solved](#problem-being-solved)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [Architecture](#architecture)
6. [Database](#database)
7. [Investigation Workflow](#investigation-workflow)
8. [Rule-Based Investigation Support Engine](#rule-based-investigation-support-engine)
9. [Screenshots](#screenshots)
10. [Local Installation](#local-installation)
11. [Environment Configuration](#environment-configuration)
12. [Database Setup](#database-setup)
13. [Testing](#testing)
14. [Deployment](#deployment)
15. [Disclaimer](#disclaimer)
16. [Future Enhancements](#future-enhancements)
17. [Specification Index](#specification-index)

---

## Purpose

The Aviation Incident Investigation Assistant guides a user through the full lifecycle of
investigating an aviation occurrence: initial notification, structured data collection (occurrence,
aircraft, flight, location, persons, witnesses, evidence), occurrence classification, hazard/risk
assessment, systematic root-cause analysis (contributing factors, 5 Whys), corrective/preventive
action tracking, independent review, and a professional investigation report — loosely inspired by
ICAO Annex 13 / NTSB-style investigation methodology, built entirely on simulated, fictional data.

It exists to demonstrate three things together: a credible aviation-safety domain model, disciplined
spec-driven engineering practice (every requirement traced to a written specification before any
code was written — see [`/specs`](specs/)), and a responsible approach to AI-adjacent product
features that never depends on, or pretends to be, an external AI service.

## Problem Being Solved

Two related problems motivate this project:

- **Domain problem (simulated)**: real investigation tooling is typically expensive, closed,
  enterprise Safety Management System (SMS) software. This project demonstrates that the
  *investigation workflow itself* — structured data capture, systematic root-cause methodology,
  risk-rated hazard tracking, and corrective/preventive action tracking with independent review —
  can be modeled cleanly and delivered as a lightweight, self-hosted web application.
- **Portfolio problem (real)**: it's easy to demonstrate a CRUD app; it's harder to demonstrate
  disciplined requirements work, a credible domain model, *and* a responsible approach to
  "AI-flavored" product features. This project's actual deliverable is proof of that combination —
  including proof that useful decision-support features don't require an external AI vendor, and
  that generated suggestions can be integrated without overstating their authority.

## Key Features

Organized by what's actually running today versus what's fully specified and scheduled. Nothing
below is claimed as built unless it is — see [`specs/implementation-plan.md`](specs/implementation-plan.md)
for the phase each item belongs to.

**✅ Implemented (Phases 1–4)**

- Role-based authentication (5 roles: Administrator, Investigation Manager, Investigator, Reviewer,
  Viewer) with server-side session re-validation on every request, database-backed login
  rate-limiting, and a transparent "Continue as Viewer" public-demo path
- Investigation creation, with a collision-free per-year sequential reference number
  (`INC-YYYY-NNNN`)
- Role-scoped investigation list with free-text search, status/date filtering, sortable columns, and
  pagination
- Investigation detail view with a 13-section workspace stepper and completeness indicators
- Investigator assignment and reassignment, including mid-review reassignment
- Full audit history logging (every lifecycle event recorded, append-only)
- The "Ops Board" dark-by-default visual identity, responsive down to 375px, with WCAG AA-targeted
  contrast and full keyboard navigability

**📋 Specified, not yet built (Phases 5–16)**

- Occurrence, aircraft, flight, location, persons, witness, and evidence data capture
- Occurrence classification and the configurable risk-scoring engine
- Contributing-factor analysis, 5 Whys, and root-cause documentation
- Corrective and preventive action tracking, with a portfolio-wide Action Tracker
- Independent review and closure workflow, with a closure gate on incomplete required actions
- The rule-based Investigation Support Engine (see below)
- The operations dashboard (7 stat tiles, 6 charts, combinable filters)
- Full report generation (24-section structure, print/PDF export, JSON export)
- Full accessibility/responsive/cross-browser automated test suite

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Server Components/Actions) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4, custom "Ops Board" design tokens |
| Database | PostgreSQL — [Neon](https://neon.tech) (serverless, free tier) |
| ORM | [Prisma](https://www.prisma.io) 7, native Postgres enums, driver-adapter (`@prisma/adapter-pg`) |
| Validation | [Zod](https://zod.dev) |
| Auth | [Auth.js](https://authjs.dev) v5, Credentials provider, JWT sessions with database re-validation |
| Testing | [Vitest](https://vitest.dev) (unit/integration); [Playwright](https://playwright.dev) planned for E2E |
| Hosting (planned) | [Vercel](https://vercel.com) (Hobby tier) |

No dependency in this stack requires an API key, a paid tier, or a call to an external AI/ML
service — verified explicitly in [`specs/technical-architecture.md`](specs/technical-architecture.md) §2.

## Architecture

- **Server Components by default** for every read-heavy view (investigation list, detail) — data is
  fetched directly via Prisma inside the component, no client-side fetch round-trip.
- **Client Components** only where interaction requires it (forms, filter bars, the collapsible
  mobile nav) — mutations go through **Server Actions**, which get Next.js's built-in same-origin
  CSRF protection.
- **A single authorization boundary** (`requireRole`, `lib/auth/requireRole.ts`) re-reads the
  current user's role and active status from the database on every Server Action and Route Handler
  — a JWT session carries only a stable identity claim, never a trusted role, so a deactivated
  account or a role change takes effect on the very next request.
- **A thin edge proxy** (`proxy.ts`) gates unauthenticated access to protected routes; the real
  authorization check always happens server-side at the data layer, never only in the UI.
- Repository layout:

  ```
  app/                  Next.js App Router — pages, layouts, Server Actions, Route Handlers
  components/           Shared UI primitives and feature components
  lib/
    actions/            Server Actions (mutations)
    auth/                Auth.js config, requireRole, getCurrentUser
    services/            Business logic — framework-agnostic, unit-testable
    validation/          Zod schemas
    data/                Static/local reference data
  prisma/                Schema, migrations, seed script
  specs/                 The full specification set (see below)
  tests/
    unit/  integration/  e2e/
  ```

Full detail — including several real discoveries made while implementing against a genuinely
current toolchain (Next.js 16's `middleware.ts` → `proxy.ts` rename, Prisma 7's config changes, an
Auth.js production-mode host-trust requirement invisible in dev) — is documented in
[`specs/technical-architecture.md`](specs/technical-architecture.md).

## Database

PostgreSQL via Prisma, with native enum types for every status/category field. The full entity
model — 20+ entities in the complete design, growing incrementally with each implementation phase —
covers the investigation record itself and every child record (occurrence, aircraft, flight,
location, persons, witnesses, evidence, hazards, contributing factors, root causes,
corrective/preventive actions, reviews, and an append-only history log).

Currently implemented: `User`, `Investigation`, `Occurrence` (initial slice), `InvestigationHistory`,
`LoginAttempt`, `ReferenceNumberSequence`, plus the Auth.js adapter tables. The schema grows one
migration per phase — see [`specs/data-model.md`](specs/data-model.md) for the complete design and
[`specs/implementation-plan.md`](specs/implementation-plan.md) for the phase-by-phase build order.

Migrations are committed to the repository (`prisma/migrations/`) and applied via
`prisma migrate deploy` as an explicit release step — never automatically inside a build, so a
schema change is always a deliberate, reviewed action.

## Investigation Workflow

A 6-state lifecycle — `Draft → Open → Under Investigation → Analysis → Review → Closed` — built
around one principle: **section editing is always non-linear; the *stage* is a computed progress
marker, not a lock.** Any data section can be opened and edited regardless of the current stage,
right up until the investigation reaches `Review` or `Closed`.

- The first three transitions are **automatic**: the system advances the stage the moment its
  information gate is satisfied, with a visible notice — no button click required.
- The last two transitions are **manual ceremony actions** — submit for review, and the review
  decision — since they involve a person other than the investigator and carry real consequences
  (locking the record, formal sign-off).
- Two backward transitions exist: `Review → Analysis` (request changes) and
  `Closed → Under Investigation` (reopen, with a required justification).

Full detail, including the complete 16-step sequence, the state diagram, and every edge case
considered, is in [`specs/investigation-workflow.md`](specs/investigation-workflow.md).

## Rule-Based Investigation Support Engine

**📋 Specified in full; scheduled for Phase 11 — not yet implemented.**

The application is designed around a firm constraint: decision-support features must never depend
on an external AI provider. The planned Investigation Support Engine delivers eight capabilities —
suggested classification, potential contributing-factor suggestions, recommended 5-Whys follow-up
questions, missing-information warnings, an investigation completeness score, risk warnings,
corrective-action reminders, and report quality checks — using only ordinary, auditable,
human-authored rule evaluation and keyword matching against the investigation's own recorded data
and a small bundled knowledge base. No trained model, local or hosted; no network call to any AI/ML
service, ever.

Every output will be visibly labeled **"Investigation Support"** plus a specific sub-label
("Suggested Classification," "Potential Contributing Factor," "Recommended Follow-up," etc.),
styled distinctly from confirmed data, and require explicit human confirmation before becoming part
of the investigation record — never phrased as official, regulatory, or authoritative. Full design
— inputs, rules, outputs, confidence handling, and safety constraints — is in
[`specs/assistance-engine.md`](specs/assistance-engine.md).

## Screenshots

*Screenshots will be added here as each phase's UI is completed.* Currently implemented: the login
page (Ops Board split-screen identity with demo-credential hints), the investigation list (search,
filter, sort, pagination), and the investigation creation/detail views.

## Local Installation

Requires Node.js 20+ and npm.

```bash
git clone <repository-url>
cd aviation-incident-investigation-assistant
npm install
```

`npm install` also runs `prisma generate` automatically (via `postinstall`), so the generated Prisma
Client is always in sync with the schema.

## Environment Configuration

Copy the example file and fill in real values in your own **`.env.local`** (git-ignored) —
**never** in `.env.example`, which is committed and must only ever contain variable names:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection string — used for all runtime queries |
| `DIRECT_URL` | Unpooled Postgres connection string — used only by Prisma Migrate |
| `NEXTAUTH_SECRET` | Auth.js session/token signing secret — generate with `npx auth secret` |
| `NEXTAUTH_URL` | Canonical app URL (e.g. `http://localhost:3000` locally) |
| `NODE_ENV` | Standard Node/Next.js environment flag |

That list is exhaustive — no AI provider key, no paid third-party API key, and no other external
service credential is ever required to run this application, in development or production.

## Database Setup

A free [Neon](https://neon.tech) Postgres project is the recommended provider (see
[`specs/technical-architecture.md`](specs/technical-architecture.md) §5.1 for why), but any
Postgres-compatible connection string works. With `DATABASE_URL`/`DIRECT_URL` set in `.env.local`:

```bash
npx prisma migrate deploy   # applies the committed migrations to your database
npx prisma db seed          # seeds 5 fictional demo user accounts
```

### Demo Accounts (fictional, seeded by `prisma/seed.ts`)

All five accounts share the same demo password. These are intentionally public demo credentials for
entirely fictional accounts — no real data or real access is protected by them.

| Role | Email | Password |
|---|---|---|
| Administrator | `a.whitfield@investigations.example` | `Demo!Pass2026` |
| Investigation Manager | `m.delacroix@investigations.example` | `Demo!Pass2026` |
| Investigator | `r.okafor@investigations.example` | `Demo!Pass2026` |
| Reviewer | `j.bramwell@investigations.example` | `Demo!Pass2026` |
| Viewer | `viewer@investigations.example` | `Demo!Pass2026` |

Once the database is set up:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm run test        # Vitest — unit and integration tests
npm run typecheck    # TypeScript, strict mode
npm run lint          # ESLint
npm run build           # Production build
```

Unit tests (Zod validation schemas) run with no external dependency. Integration tests exercise
real Server Actions and services against a live database and are skipped automatically
(`describe.skipIf`) when no `DATABASE_URL` is configured, rather than failing — they're written and
ready to run the moment one is available. A Playwright end-to-end suite is planned for Phase 14; see
[`specs/testing-spec.md`](specs/testing-spec.md) for the full test plan (54 scenarios across 11
categories, both positive and negative coverage for every feature area).

## Deployment

**Not yet deployed.** The target architecture is Vercel (Hobby tier) with Neon Postgres, chosen
specifically because neither requires a credit card or paid tier for this project's scale, and both
integrate natively (one-click provisioning, per-preview-deployment database branching). Planned
deployment steps: connect the GitHub repository to Vercel, configure the environment variables above
per-environment, run `prisma migrate deploy` as an explicit release step before promoting each
deployment, and seed the production database with the same fictional demo dataset. Full detail in
[`specs/technical-architecture.md`](specs/technical-architecture.md) §10 and
[`specs/implementation-plan.md`](specs/implementation-plan.md) Phase 16.

## Disclaimer

> This application uses simulated, fictional aviation incident data for demonstration purposes only.
> It is not affiliated with any aviation authority and must not be used for real safety
> investigations or regulatory reporting.

Every named airline, airport, aircraft registration, flight number, and individual anywhere in this
project — including the demo dataset — is entirely fictional and does not knowingly resemble any
real organization or person. No occurrence classification, risk rating, or root-cause suggestion
produced by this application represents an official, regulatory, or authoritative determination
under any real aviation safety framework (ICAO Annex 13, NTSB, EASA, or otherwise).

## Future Enhancements

The remaining 12 phases of [`specs/implementation-plan.md`](specs/implementation-plan.md), in order:
occurrence/aircraft/flight/location/persons data capture, evidence and witness management,
occurrence classification, the configurable risk-assessment engine, contributing-factor analysis,
5 Whys, root-cause documentation, corrective/preventive action tracking, the rule-based Investigation
Support Engine, the operations dashboard, full report generation, a complete automated test suite
(including accessibility and cross-browser coverage), production hardening, and first deployment.

Beyond the current specification set, plausible longer-term directions include: a real OAuth/SSO
provider (the auth architecture is deliberately built to make this a configuration change, not a
rewrite), an object-storage-backed evidence provider swapped in behind the existing
`StorageProvider` interface, and expanding the fictional demo dataset for a richer portfolio
walkthrough.

## Specification Index

This project was built via Spec-Driven Development: every requirement and architectural decision is
documented in `/specs` before any code is written.

| Document | Contents |
|---|---|
| [product-spec.md](specs/product-spec.md) | Vision, scope, assumptions register, "AI without external APIs" positioning |
| [functional-requirements.md](specs/functional-requirements.md) | Every capability (FR-IDs), roles & permissions |
| [non-functional-requirements.md](specs/non-functional-requirements.md) | Tech constraints, performance, security, deployability (superseded in part by `technical-architecture.md`) |
| [data-model.md](specs/data-model.md) | Entities, ER diagram, enumerations, risk matrix |
| [ui-spec.md](specs/ui-spec.md) | Screens, navigation, components, design system |
| [investigation-workflow.md](specs/investigation-workflow.md) | Status state machine, completeness gates, review flow |
| [report-spec.md](specs/report-spec.md) | Final report structure and export approach |
| [technical-architecture.md](specs/technical-architecture.md) | Stack, deployment architecture, and implementation-discovered corrections |
| [assistance-engine.md](specs/assistance-engine.md) | Rule-based Investigation Support engine design (no external AI API) |
| [demo-data.md](specs/demo-data.md) | Fictional demonstration dataset |
| [edge-cases.md](specs/edge-cases.md) | Edge-case analysis and expected behavior |
| [security-spec.md](specs/security-spec.md) | Security requirements and binding non-negotiable rules |
| [testing-spec.md](specs/testing-spec.md) | Test categories, acceptance criteria, test scenarios |
| [spec-review.md](specs/spec-review.md) | Cross-specification consistency review and findings |
| [implementation-plan.md](specs/implementation-plan.md) | 16-phase implementation plan, currently in progress |

See also [`CONTRIBUTING.md`](CONTRIBUTING.md) for the conventions this project follows.

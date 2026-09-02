# Technical Architecture Specification — Aviation Incident Investigation Assistant

This is the first Technical Architecture Specification for this project. Every prior spec
(`product-spec.md`, `functional-requirements.md`, `data-model.md`, `ui-spec.md`,
`investigation-workflow.md`, `report-spec.md`, `non-functional-requirements.md`) was written
stack-agnostically or against an earlier assumed stack (React+Vite / Express / SQLite / Docker,
`product-spec.md` A1–A3, A9). This document **supersedes those stack assumptions** with a concrete,
modern, Vercel-native architecture. See §15 for exactly what that changes and what still needs a
follow-up alignment pass elsewhere.

## 1. Stack Summary

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js** (App Router) | Unifies frontend and backend in one deployable unit — no separate Express server, deploys natively to Vercel |
| Language | **TypeScript** (strict mode) | End-to-end type safety from the database to the UI |
| Styling | **Tailwind CSS** | Utility-first, pairs naturally with the "Ops Board" design tokens (`ui-spec.md` §1) via a custom theme config |
| Database | **PostgreSQL-compatible** — **Neon** (see §5.1) | Free serverless Postgres with native Vercel integration and connection pooling built in |
| ORM | **Prisma** | Type-safe queries, first-class migrations, native Postgres `enum` support (an upgrade over the CHECK-constrained VARCHAR convention `data-model.md` DM-5 used for portability) |
| Validation | **Zod** | Runtime validation at every server boundary, colocated with and derived from the same types Prisma generates |
| Auth | **Auth.js (NextAuth.js)**, Credentials provider | Free, well-established, fills the "auth middleware layer" `product-spec.md` §8.3 already specified abstractly |
| Source control | **GitHub** | Required; also Vercel's native deployment trigger |
| Hosting | **Vercel** (Hobby/free tier) | Zero-config Next.js deployment, automatic HTTPS, preview deployments per PR |
| Testing | **Vitest** (unit/integration) + **Playwright** (E2E) | Modern, fast, first-class TypeScript/Next.js support |

Nothing in this stack requires an API key, a paid tier, or a call to an external AI service —
verified explicitly against each constraint in §2.

## 2. Constraint Verification

| Constraint | How this architecture satisfies it |
|---|---|
| No external API keys | Every dependency below is either bundled code (Next.js, Zod, Tailwind) or a service authenticated by a connection string/secret **the project itself provisions** (Neon, Auth.js session secret) — never a third-party API key for a product feature. The Investigation Support engine (product-spec §11) is local rule-based code, not an API call. |
| No paid APIs | Neon free tier, Vercel Hobby tier, Auth.js (open source, free), Prisma (open source). §5.1 and §10 name the specific free-tier limits assumed. |
| No dependency on an external AI service | Unchanged from `product-spec.md` §6.2/§11 — reaffirmed here at the infrastructure level: no LLM provider, no external inference endpoint exists anywhere in this architecture. |
| Public internet deployment | Vercel serves the app over HTTPS on a public URL by default. |
| GitHub source control | Vercel deploys are Git-triggered from a GitHub repository (§10). |
| Persistent database | Neon Postgres — durable, backed up, independent of the application's compute lifecycle (important precisely *because* Vercel's compute is not persistent — see §9). |
| Responsive web interface | Tailwind's responsive utilities implement the breakpoints already defined in `ui-spec.md` §6. |
| Secure handling of application data | §8 (Security Architecture) — parameterized queries via Prisma, hashed credentials, HttpOnly/Secure cookies, server-side authorization, the file-type allowlist from `data-model.md` §6.11. |

## 3. Frontend Architecture

### 3.1 Routing (App Router)

Routes map directly onto `ui-spec.md`'s pages:

```
app/
  (auth)/login/page.tsx                    → Login/Welcome (ui-spec §1)
  dashboard/page.tsx                       → Dashboard (§2)
  investigations/page.tsx                  → Investigations list (§3)
  investigations/new/page.tsx              → New Investigation (§4)
  investigations/[id]/
    layout.tsx                             → Workspace shell + Section Stepper (§2.3)
    page.tsx                               → Overview (§5)
    occurrence/page.tsx                    → Occurrence Details (§6)
    aircraft-flight/page.tsx               → Aircraft & Flight (§7)
    evidence/page.tsx                      → Evidence (§8)
    witnesses/page.tsx                     → Witnesses (§9)
    findings/page.tsx                      → Investigation Findings (§10)
    hazards/page.tsx                       → Hazard Analysis (§11)
    contributing-factors/page.tsx          → Contributing Factors (§12)
    five-whys/page.tsx                     → 5 Whys (§13)
    root-cause/page.tsx                    → Root Cause Analysis (§14)
    actions/page.tsx                       → Corrective/Preventive Actions (§15)
    review/page.tsx                        → Investigation Review (§16)
    report/page.tsx                        → Report Preview (§17) — no workspace shell, print-styled
  actions-tracker/page.tsx                 → Action Tracker (§19)
  settings/page.tsx                        → Settings/About (§18)
  api/                                     → Route Handlers (§4.2)
```

### 3.2 Server vs. Client Components

- **Server Components by default** for every read-heavy view: Dashboard, Investigations list, Action
  Tracker, Report Preview, and the read-only rendering of any workspace page. These fetch data
  directly via Prisma inside the component (no client-side fetch round-trip), which is both faster
  and keeps the database client off the client bundle entirely.
- **Client Components** (`"use client"`) only where interaction requires it: every edit form, the
  Hazard risk-matrix widget (live-updating as Likelihood/Severity are picked), the 5 Whys chain
  builder, the Dashboard/Investigations/Action Tracker filter bars (need client state for immediate
  UI feedback before the URL/search-params update triggers a server refetch), and the
  SuggestionChip accept/dismiss interactions.
- **Data mutation** goes through **Server Actions** (§4.1), invoked directly from Client Component
  forms via `useTransition`/`useActionState` — no hand-rolled `fetch` + JSON parsing for the common
  case.

### 3.3 Styling

- Tailwind CSS configured with a custom theme extending the default palette with the Ops Board
  design tokens (`ui-spec.md` §1.2): CSS custom properties for the amber/teal accents and the
  status/severity/risk/priority color mappings, switched via Tailwind's `dark:` variant plus a
  `data-theme` attribute for the explicit light/dark toggle (`ui-spec.md` §1.1).
- Shared UI primitives (StatusBadge, RiskBadge, SuggestionChip, DataTable, etc. — `ui-spec.md` §4)
  are implemented once as a small internal component library under `components/ui/`, imported
  everywhere rather than re-styled per page.
- Monospace/sans font pairing (`ui-spec.md` §1.3) loaded via `next/font` (self-hosted, zero external
  font-CDN requests at runtime — consistent with "no external dependency" beyond what's strictly
  needed).

### 3.4 Client-Side Data/State

- No global client state library. Server state lives in Postgres and is read via Server Components
  or Server Actions; ephemeral UI state (open/closed panels, in-progress form fields, active filter
  selections before they're committed to the URL) uses plain React `useState`/`useReducer`.
- Filters (Dashboard §1.0.4, Investigations FR-060, Action Tracker FR-070) are encoded in the URL
  search params (`ui-spec.md` already specifies this — "persist in the URL"), read via
  `useSearchParams` and applied server-side on the next render — this makes filtered views
  bookmarkable/shareable for free and avoids needing a client cache layer.

## 4. Backend Architecture

### 4.1 Server Actions (primary mutation path)

Every form-driven mutation in `functional-requirements.md` (creating/editing/deleting an
Occurrence, Hazard, RootCause, Action, etc.) is implemented as a Next.js Server Action, colocated
with the form that calls it (e.g. `app/investigations/[id]/hazards/actions.ts`). Server Actions are
preferred over hand-written API routes for this project's own mutations because:

- Next.js applies CSRF protection to Server Actions automatically (origin-check), which a
  hand-rolled `POST /api/...` route handler does not get for free (§8.2).
- No manual `fetch`/JSON-serialization boilerplate between form and handler.
- A Server Action's return value can be a typed result object consumed directly by the calling
  Client Component for inline error display (§7).

### 4.2 Route Handlers (`app/api/**`)

Reserved for the cases Server Actions don't fit:

- `GET /api/health` — uptime check (NFR-8.3).
- `GET /api/investigations/[id]/attachments/[attachmentId]` — streams file bytes (FR-024); needs
  Route Handler semantics (custom `Content-Type`/`Content-Disposition` headers, streaming response).
- `POST /api/investigations/[id]/evidence/[evidenceId]/attachments` — file upload (FR-023);
  `multipart/form-data` handling is more natural as a Route Handler than a Server Action.
- `GET /api/investigations/[id]/export` — JSON export (FR-058); a plain downloadable file response.
- `POST /api/auth/[...nextauth]` — Auth.js's own required route.

### 4.3 Service Layer

Business logic is never written directly inside a Server Action or Route Handler body — each calls
into a service module under `lib/services/`, keeping the handler itself a thin
parse-validate-call-respond shim. This is what makes the logic unit-testable (§12) independent of
the Next.js request/response machinery:

- `lib/services/riskEngine.ts` — the Likelihood × Severity formula and `RiskBandConfiguration`
  lookup (`data-model.md` §6.3–§6.4), shared by Hazard and Occurrence risk computation.
- `lib/services/classificationSuggestion.ts` — the local rule-based Investigation Support engine
  (product-spec §11), reading from static keyword data (§3.5/§13).
- `lib/services/investigationWorkflow.ts` — the state-machine transition rules
  (`investigation-workflow.md` §6–§7), the single place that enforces which `(from, to)` status
  pairs are valid, called by every Server Action that might change `Investigation.status`.
- `lib/services/actionLifecycle.ts` — the Corrective/Preventive Action status transition rules and
  closure-gate check (`data-model.md` §6.9).
- `lib/services/dashboardMetrics.ts` — the metric dictionary (`functional-requirements.md` §1.0),
  one function per tile/chart, each a pure query-and-aggregate function.
- `lib/auth/authorize.ts` — a `requireRole(session, allowedRoles[])` helper called at the top of
  every Server Action/Route Handler, since Next.js has no Express-style global middleware chain for
  Server Actions — authorization must be explicit per-action, and this helper exists specifically so
  it's the same one-line call everywhere rather than reimplemented per handler (NFR-4.7).

### 4.4 Auth

- **Auth.js Credentials provider**, checking email + bcrypt-hashed password against `User`
  (`data-model.md` §3.1). Session strategy: **JWT** — see the addendum immediately below for why
  this corrects this section's original "database sessions" statement.
- `product-spec.md` §8.3's extensibility requirement is satisfied directly: swapping in a real OAuth
  provider later is an Auth.js provider-config change, not a rewrite — `authorize()`'s shape and
  every downstream `requireRole` call are unaffected by which provider authenticated the session.
  The Prisma adapter (`Account`/`Session`/`VerificationToken`, `data-model.md` §2) stays configured
  for exactly this reason even though the Credentials flow below does not populate `Session` rows
  today — it is what a future OAuth provider would need on day one.

**Addendum (Phase 3 implementation, discovered during `implementation-plan.md` Phase 3)**: this
section originally specified database sessions specifically so a deactivated account is locked out
on its very next request. During implementation this proved not to be a supported combination —
Auth.js does not officially support the Credentials provider with the `database` session strategy;
a database `Session` row is normally created only for adapter-driven (OAuth) sign-ins. Making it
work with Credentials requires an undocumented workaround (overriding the library's internal JWT
`encode`/`decode` functions to smuggle a raw session token through the session cookie, then manually
calling the adapter's `createSession`), which has open community-reported reliability issues
(sessions intermittently resolving to null) — not a foundation this project should build every later
phase's authorization on.

**Resolution**: JWT session strategy (Auth.js's standard, fully-supported path for Credentials),
combined with the fact that `requireRole` (§4.3) already queries the database on every single
Server Action and Route Handler before doing anything else (NFR-4.7 — UI-level hiding is never the
security boundary, so no request is ever authorized on a cached claim alone). `requireRole` re-reads
the current `User.isActive` and `User.role` from the database on every call, using only the `userId`
carried in the JWT as a stable identity claim — never trusting the JWT's own (necessarily stale)
copy of role/active-status. This delivers the identical behavioral guarantee `security-spec.md` §5
and `edge-cases.md` EC-25 require — deactivation and role changes take effect on the very next
request — through the authorization layer that already existed for other reasons, rather than
through the session-storage mechanism. No requirement changes; only the mechanism does.
`security-spec.md` §5 carries the matching correction.

**Addendum (production-readiness pass, discovered testing `next start` rather than `next dev`)**:
every request to any Auth.js route failed with `UntrustedHost` under a production build, despite
`NEXTAUTH_URL` being set correctly — invisible in `next dev`, which trusts `localhost` automatically
regardless of this setting. Auth.js auto-trusts the host only when it detects Vercel's own `VERCEL`
environment variable, and that auto-detection is documented as unreliable in some Vercel
configurations, and absent entirely on any other host. **Resolution**: `trustHost: true` set
explicitly in `lib/auth/config.ts` (the shared edge-safe config, so it covers both the full config
and `proxy.ts`'s own session check) rather than relying on auto-detection. Safe specifically because
`NEXTAUTH_URL` is always set explicitly (§11) — this is not blindly trusting an arbitrary incoming
`Host` header, only confirming the one already configured. This is exactly the kind of defect that
only surfaces once production-mode behavior is actually exercised, not just `next dev` — worth
flagging prominently since nothing about earlier phases' dev-mode testing could have caught it.

## 5. Database Architecture

### 5.1 Provider — Neon

**Neon** is the recommended Postgres provider: serverless (scales to zero when idle, so a portfolio
project with intermittent traffic costs nothing), a free tier sufficient for this project's scale
(`non-functional-requirements.md` NFR-3.1's "tens to low hundreds of records"), native branching
(a free branch-per-environment/per-PR pattern useful for §12's test database), and first-party
Vercel integration (one-click provisioning, environment variables wired automatically). **Vercel
Postgres** (built on Neon) is an equally valid alternative if provisioning directly from the Vercel
dashboard is preferred — the architecture below is identical either way, since both expose a
standard Postgres connection string Prisma consumes the same way. Either choice keeps the database
provider-portable: Prisma's `postgresql` provider works against any Postgres-compatible endpoint, so
self-hosting or migrating providers later is a connection-string change, not a schema change.

- **Connection pooling matters here specifically**: serverless functions (Vercel) open a new
  database connection per invocation far more often than a long-running server would, and
  unpooled Postgres has a hard connection-count ceiling. Neon's pooled connection string (PgBouncer
  transaction-mode compatible) is used for `DATABASE_URL` (runtime queries); Neon's **unpooled**
  direct connection string is used for `DIRECT_URL` (Prisma Migrate needs a direct connection for
  schema changes). This is the standard, documented Prisma+Neon pattern and requires no paid
  add-on — **Prisma Accelerate** (Prisma's own paid pooling/caching product) is deliberately *not*
  used, precisely to honor "no paid APIs."

### 5.2 Prisma Schema

`prisma/schema.prisma` is a direct translation of `data-model.md` §3, entity for entity. Two
concrete improvements fall out of moving from SQLite to Postgres:

- **Native `enum` types**: every `CHECK`-constrained `VARCHAR` in `data-model.md` (DM-5's documented
  portability compromise) becomes a real Prisma/Postgres `enum` — `InvestigationStatus`,
  `RiskSeverity`, `ActionStatus`, `OccurrenceCategory`, etc. This is strictly safer than the
  SQLite-era `CHECK` approach (the database itself rejects an invalid value at the type level, not
  just via a constraint expression) and requires no compromise, since Postgres has native enum
  support.
- **`Bytes` column for attachment content**: see §9 — this replaces the "local disk under
  `DATA_DIR/attachments`" language in `data-model.md` §3.10/§6.10, which does not work under
  Vercel's serverless filesystem model (§9 explains why and what changes).
- `RiskBandConfiguration` and `OccurrenceSubcategoryOption` (`data-model.md` §3.3.1, §6.4) are
  ordinary Prisma models, seeded (§5.4) rather than hardcoded — this is what makes the risk bands
  genuinely configurable at runtime (FR-069) rather than a compile-time constant.

**Addendum (Phase 2 implementation, discovered during `implementation-plan.md` Phase 2)**: Prisma 7
(the current stable release as of implementation) removed the `datasource.url`/`directUrl` fields
this section originally assumed `schema.prisma` would carry directly, along with the default
`prisma-client-js` generator. This is a mechanism change in the tool, not a change to any actual
requirement: `DATABASE_URL` (pooled) and `DIRECT_URL` (unpooled) are unchanged, Neon is unchanged,
and the pooled/direct split described in §5.1 is unchanged. What changed is *where* the connection
is wired up:

- `schema.prisma`'s `datasource` block no longer takes a `url`; the generator block now requires an
  explicit `output` path (`prisma/generated/prisma` in this project) rather than emitting into
  `node_modules/@prisma/client`.
- A new `prisma.config.ts` at the repository root supplies the CLI (migrate, studio, `db seed`) with
  its connection — using `DIRECT_URL`, preserving this section's original reasoning that
  schema-changing operations need a direct, unpooled connection.
- The application's own runtime connection (`lib/db.ts`) is no longer implicit — Prisma 7 requires
  instantiating a driver adapter explicitly and passing it to `new PrismaClient({ adapter })`. This
  project uses **`@prisma/adapter-pg`** (the generic `node-postgres` adapter) rather than
  `@prisma/adapter-neon` (Neon's proprietary WebSocket-based driver), specifically to preserve this
  document's TA-2 provider-portability promise — `@prisma/adapter-pg` works against any standard
  Postgres connection string, not only Neon's, since nothing about this application's runtime
  requires Neon's edge/WebSocket transport (the app runs in the Node.js runtime, not Edge Runtime).

No requirement in this document changes as a result — this addendum exists so a reader following
§5.1–§5.2's original wording doesn't attempt a `datasource.url` field that the installed tool
version will reject.

### 5.3 Migrations

**Prisma Migrate** replaces the previously-generic "versioned migrations" language
(`non-functional-requirements.md` NFR-5.3). `prisma migrate dev` generates and applies migrations
locally during development (committed to `prisma/migrations/` in Git); `prisma migrate deploy` runs
the already-generated migrations against the production database as an explicit release step (§10) —
never auto-generated at deploy time, so production schema changes are always reviewed in a PR first.

### 5.4 Seeding

`prisma/seed.ts` (run via `prisma db seed`) populates: the fictional demo dataset described
throughout this spec set (the `INC-2026-00xx` example investigations, `data-model.md` §10), the
default `RiskBandConfiguration` rows (§6.4's seeded bands), the full `OccurrenceSubcategoryOption`
taxonomy (§6.6's category/subcategory pairs), and the five seeded demo `User` accounts (one per
role, `functional-requirements.md` §0.2). The seed script is idempotent (checks for existing rows
before inserting) so it is safe to run against an already-seeded database (NFR-8.4).

## 6. Validation Architecture

- **One Zod schema per Server Action/Route Handler input**, colocated under `lib/validation/` and
  named after the operation it guards (e.g. `createHazardSchema`, `verifyActionSchema`). Every
  field-level rule already specified in `data-model.md`'s per-entity Validation columns has a direct
  Zod equivalent (`z.string().min(20)`, `z.date().max(new Date())`, etc.); cross-field rules use
  `.refine()`/`.superRefine()` — e.g. the "exactly one of `ownerUserId`/`ownerExternalName`" rule
  (`data-model.md` §3.19) and the "Potential Outcome ≥ Actual Outcome" rule
  (`functional-requirements.md` FR-066).
- **Shared enums are defined once** and reused between Zod and Prisma: Zod schemas import Prisma's
  generated enum objects (`z.nativeEnum(RiskSeverity)` etc.) rather than re-declaring the value list
  a second time, eliminating an entire class of drift between the two layers.
- **Two validation boundaries, one source of truth**: the same Zod schema runs client-side (for
  immediate inline feedback, e.g. via `useActionState`'s pending/error state) and server-side inside
  the Server Action itself (authoritative — NFR-4.7's "never trust client validation alone"
  principle, restated at the stack level). A request that reaches the server having skipped or
  tampered with client validation is still fully re-validated; nothing is ever accepted on the
  strength of having passed client-side checks alone.
- Validation failures produce a structured field-error map (`{ field: string, message: string }[]`)
  that Client Components render as the inline red helper text already specified in `ui-spec.md` §4's
  ErrorBanner/field-error pattern — one shape, reused everywhere, rather than each form inventing its
  own error-display convention.

## 7. Error Handling Architecture

- **Server Actions return a typed result, they do not throw for expected failures**:
  `{ ok: true, data: T } | { ok: false, error: string, fieldErrors?: FieldError[] }`. This avoids
  Next.js's generic, non-descriptive error digest that results from an uncaught throw inside a
  Server Action, and lets the calling Client Component render a precise inline message.
- **A small `AppError` hierarchy** (`ValidationError`, `AuthorizationError`, `NotFoundError`,
  `ConflictError`, `TransitionError`) is thrown *inside* service-layer functions (§4.3) and caught at
  the Server Action/Route Handler boundary, where it is mapped to the typed result shape above (for
  Server Actions) or an HTTP status + JSON envelope `{ error: { code, message } }` (for Route
  Handlers). This keeps the mapping-to-HTTP concern in exactly one place per handler type, rather
  than scattered through service code.
- **Route Handlers** (§4.2) use conventional HTTP status codes: 400 (validation), 401
  (unauthenticated), 403 (authorization), 404 (not found), 409 (conflict — e.g. a stale-state
  transition attempt, `investigation-workflow.md` §7), 500 (unexpected).
- **React error boundaries** (`error.tsx` per route segment, per Next.js App Router convention)
  catch unexpected render-time exceptions and show the ErrorBanner-styled fallback already specified
  in `ui-spec.md`, scoped to the failing segment rather than crashing the whole page (e.g. one broken
  Dashboard chart doesn't take down the stat tiles above it — `functional-requirements.md` §1.0.3's
  "isolated inline error" requirement, now mapped onto a concrete mechanism).
- **Logging**: unhandled exceptions are logged server-side as structured JSON to stdout (captured by
  Vercel's log pipeline, no external logging service required — NFR-10.1) with the stack trace never
  forwarded to the client response (NFR-10.2).

## 8. Security Architecture

- **Credentials**: bcrypt-hashed passwords (NFR-4.1), Auth.js database sessions with `HttpOnly` and
  `Secure` cookies in production (NFR-4.4).
- **SQL injection**: structurally prevented — Prisma's query builder never interpolates raw strings
  into SQL (NFR-4.2 satisfied by construction, not by discipline).
- **XSS**: React's default JSX escaping (NFR-4.3); no `dangerouslySetInnerHTML` anywhere in the
  codebase (enforced via an ESLint rule, `no-danger`).
- **CSRF**: Server Actions get Next.js's built-in same-origin protection for free (§4.1); the file
  upload/download Route Handlers (§4.2) require an authenticated session and re-check investigation
  view-access on every request rather than trusting a previously-issued link.
- **Authorization**: every Server Action and Route Handler calls `requireRole` (§4.3) before doing
  anything else — there is no reliance on UI-level hiding as a security boundary (NFR-4.7).
- **File upload security**: the allowlist/size-cap/filename-sanitization rules from `data-model.md`
  §6.11 are enforced in `lib/services/evidenceStorage.ts` (§9) before any byte is persisted.
- **Rate limiting**: implemented via a small `LoginAttempt`/`UploadAttempt` tracking table in
  Postgres (checked and incremented inside the relevant Server Action/Route Handler) rather than an
  external rate-limiting service (e.g. Upstash) — deliberately avoiding a new third-party dependency
  and its own API-key/token requirement, at the accepted cost of somewhat coarser granularity than a
  dedicated edge rate-limiter would provide. This satisfies NFR-4.6 without adding an external
  service beyond the database the project already requires.
- **Secrets**: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET` live only in Vercel's encrypted
  environment variable store (§11) and local `.env.local` (git-ignored) — never committed, never
  logged.

## 9. Evidence Storage Architecture (Vercel-Specific Adaptation)

`data-model.md` §6.10 specified a `StorageProvider` abstraction with a `LocalDiskStorageProvider`
implementation writing to `DATA_DIR/attachments`. **That implementation does not work on Vercel**:
Vercel's serverless functions run on an ephemeral, effectively read-only filesystem — anything
written to disk during one invocation is not guaranteed to exist for the next, and is never shared
across the multiple concurrent instances a real deployment runs. This is exactly the kind of
deployment-target conflict this document exists to catch before implementation starts.

**Resolution**: the `StorageProvider` *interface* (`save`/`retrieve`/`delete`) is unchanged — only
the v1 implementation changes. The new v1 implementation is a **`PostgresBlobStorageProvider`**,
storing attachment bytes in a `Bytes` (Postgres `bytea`) column directly on `Attachment`
(`data-model.md` §3.10). This:

- Requires no new external service and no new API key — the database the project already
  provisions is the storage.
- Is entirely consistent with the existing size limits (10MB/file, 100MB/investigation, NFR-4.5),
  which were already small enough to make DB storage reasonable.
- Keeps the `isSimulated` flag and its bundled-placeholder-file behavior (`data-model.md` §6.10.2)
  working exactly as designed — the placeholder's bytes are simply seeded into the same column.
- Preserves the explicit extensibility goal: a future `VercelBlobStorageProvider` or
  `S3StorageProvider` implementing the identical interface (backed by object storage instead of a DB
  column) remains a swap-in change, not a rewrite — `storagePath` becomes an object key instead of
  being unused, and every caller (FR-023/FR-024) is unaffected either way.

This is documented as **TA-1** in §14 and flagged in §15 as a required amendment to
`data-model.md` §3.10/§6.10's "local disk"/`DATA_DIR` language.

## 10. Deployment Architecture

- **Source control**: GitHub repository, `main` branch protected (require PR review before merge —
  a repo-configuration recommendation, not something this spec set enforces in code).
- **Hosting**: Vercel, connected to the GitHub repo via Vercel's native Git integration.
  - Every push to `main` triggers a production deployment.
  - Every pull request gets an automatic **preview deployment** on its own URL, backed by its own
    Neon database branch (§5.1's branching feature) seeded independently — a reviewer can click
    through a real, isolated instance of the change before merging, at no cost.
  - Vercel Hobby (free) tier is sufficient: this project has no requirement that exceeds its serverless
    function execution-time or bandwidth limits at the scale described throughout
    `non-functional-requirements.md`.
- **Build**: `next build`, with `prisma generate` run automatically via a `postinstall` script (so
  the generated Prisma Client is always in sync with `schema.prisma` on every install).
- **Migrations at release time**: `prisma migrate deploy` is run as an explicit step **before**
  promoting a production deployment (a Vercel deploy hook or a manual/CI-triggered step) — never
  automatically inside the Next.js build itself, so a schema change is never silently applied by a
  build that happens to run concurrently with another one (avoids a migration race between two
  in-flight deployments).
- **No container, no Docker**: this supersedes `product-spec.md` A9's "single-container Docker
  deployment" — Vercel builds and runs the Next.js output directly; there is no Dockerfile in this
  architecture (§15).
- **Health check**: `GET /api/health` (§4.2) queries the database with a trivial `SELECT 1` and
  returns 200/503 accordingly — useful for external uptime monitors even without Vercel requiring
  one itself.
- **HTTPS**: automatic and free via Vercel for both the production domain and every preview URL.

## 11. Environment Configuration

| Variable | Purpose | Where set |
|---|---|---|
| `DATABASE_URL` | Pooled Neon connection string — runtime queries | Vercel project env vars (per environment: production/preview/development) |
| `DIRECT_URL` | Unpooled Neon connection string — Prisma Migrate only | Same |
| `NEXTAUTH_SECRET` | Session/token signing secret for Auth.js | Same, generated once, never reused across environments |
| `NEXTAUTH_URL` | Canonical app URL (Auth.js requirement) | Same, differs per environment (production domain vs. preview URL) |
| `NODE_ENV` | Standard Next.js/Node environment flag | Set automatically by Vercel/Next.js |

Notably absent from this list, by design: **any AI provider key, any paid third-party API key, or
any external service credential** — the full environment surface above is exactly what's needed to
run the app and nothing more, a direct, checkable confirmation of the "no external API keys" and "no
paid APIs" constraints (§2).

- **Local development**: `.env.local` (git-ignored) points at a personal Neon branch (or a local
  Postgres instance via Docker Compose, for a fully offline option) — `prisma migrate dev` and
  `prisma db seed` run against it exactly as production does against its own database.
- **`.env.example`** is committed to the repo, listing every variable name above with a placeholder
  value and a one-line comment — so a new contributor knows exactly what to configure without
  guessing, and without any real secret ever being committed.

## 12. Testing Architecture

The concrete scenario catalog (54 numbered TS-### scenarios across 11 categories, acceptance
criteria per feature area, and the CI-gate/coverage rules) lives in `testing-spec.md`, not here —
this section only fixes the tooling choices (Vitest/Playwright/GitHub Actions) and the ephemeral-
per-run Neon branch strategy those scenarios run against.

- **Unit tests (Vitest)**: every service module under `lib/services/` (§4.3) is tested in isolation
  with plain function calls and fixture data — the risk engine's formula and band resolution
  (`data-model.md` §6.3–§6.4), the classification suggestion engine's keyword matching, the
  investigation workflow's transition validator (`investigation-workflow.md` §7.2's validity
  matrix), and the action lifecycle's status-transition and closure-gate logic
  (`data-model.md` §6.9). These are pure-function-shaped and require no database or network access,
  so they run fast and are the majority of the test suite by count.
- **Validation tests (Vitest)**: every Zod schema (§6) is tested directly with `safeParse` against
  known-good and known-bad fixtures, including the cross-field `.refine()` rules — this is
  independent of any UI or database concern.
- **Integration tests (Vitest)**: Server Actions and Route Handlers are tested against a real
  ephemeral database — a dedicated Neon test branch created per CI run (§10's branching feature),
  migrated and seeded fresh each time, torn down after. This exercises the actual Prisma queries,
  not a mock, catching schema/query mismatches unit tests can't.
- **Component tests (Vitest + React Testing Library)**: the shared UI primitives (§3.3) and the more
  interactive Client Components (the risk-matrix widget, the 5 Whys chain builder) are tested for
  correct rendering and interaction behavior in isolation.
- **End-to-end tests (Playwright)**: a small set of critical-path scenarios run against a full
  preview deployment or local dev server — login, create an investigation, progress it through the
  6-state workflow, submit for review, approve, and generate the report — covering the seams between
  frontend, Server Actions, and the database that lower-level tests can't.
- **CI (GitHub Actions)**: on every pull request — install, `tsc --noEmit` (typecheck), ESLint,
  Vitest (unit/validation/integration/component), and Playwright (E2E, against a preview deployment
  once one exists). A red CI run blocks merge; this is the automated counterpart to the "PR review
  before merge" branch-protection recommendation in §10.

## 13. Repository Structure

```
/
├── app/                     # Next.js App Router — pages, layouts, Server Actions, Route Handlers
├── components/
│   └── ui/                  # Shared primitives (StatusBadge, RiskBadge, DataTable, ...)
├── lib/
│   ├── services/            # Business logic (§4.3) — framework-agnostic, unit-testable
│   ├── validation/          # Zod schemas (§6)
│   ├── auth/                # Auth.js config, requireRole helper
│   └── data/                # Static/local knowledge data (§3.5) — classification keyword lists,
│                             #   similar-incident corpus, any other bundled reference content
├── prisma/
│   ├── schema.prisma        # §5.2
│   ├── migrations/          # §5.3, committed to Git
│   ├── generated/           # §5.2 addendum — generated Prisma Client, git-ignored
│   └── seed.ts              # §5.4
├── prisma.config.ts         # §5.2 addendum — CLI connection config (Prisma 7)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── specs/                   # This specification set
├── .env.example
└── package.json
```

## 14. Assumptions Specific to Technical Architecture

- **TA-1**: Evidence attachment storage is implemented as Postgres `Bytes` columns
  (`PostgresBlobStorageProvider`), not local disk, because Vercel's serverless filesystem cannot
  durably persist uploaded files across invocations (§9). This is a required correction to
  `data-model.md`'s local-disk framing, not an optional alternative.
- **TA-2**: Neon (or Vercel Postgres, functionally identical for this architecture's purposes) is
  the assumed Postgres provider; any Postgres-compatible alternative works unchanged, since nothing
  in this document or in `data-model.md`'s schema is Neon-specific beyond the pooled/direct
  connection-string pattern in §5.1, which is a standard serverless-Postgres pattern, not a
  proprietary one.
- **TA-3**: Server Actions are the default mutation mechanism; Route Handlers are used only where
  Server Actions are a poor fit (file streaming, multipart upload, non-page JSON export, Auth.js's
  own required route) — this is a consistency convention for implementation, not a hard technical
  requirement, and is worth restating explicitly so the eventual implementation doesn't drift into
  using both patterns interchangeably for the same kind of operation.
- **TA-4**: Rate limiting is implemented via a database-backed attempt counter rather than an
  external rate-limiting service, to avoid introducing a new third-party dependency (and its own
  credential) solely for this purpose (§8). This is an accepted, documented trade-off of granularity
  for constraint compliance, not an oversight.
- **TA-5**: Prisma Accelerate is deliberately not used (§5.1) — Neon's own free pooled connection
  string satisfies the same serverless-connection-pooling need without a paid add-on.

## 15. Consistency Notes — Required Follow-Up Elsewhere

This document was scoped to `technical-architecture.md` only for this pass, per the request, so the
following files still reflect the **prior, now-superseded** stack assumptions and should be aligned
in a follow-up pass:

- `product-spec.md` **A1** (React+Vite), **A2** (Node.js+Express), **A3** (SQLite/`better-sqlite3`),
  and **A9** (single-container Docker deployment) are all superseded by §1 of this document
  (Next.js/Postgres-via-Neon/Vercel, no Docker) and should be updated to reference this file rather
  than restating a conflicting stack.
- `data-model.md` §1 ("Target RDBMS... SQLite") and §3.10/§6.10 (`DATA_DIR/attachments`, local disk)
  are superseded by §5 and §9 of this document respectively (Postgres via Prisma; `Bytes`-column
  storage instead of local disk) — §9's `PostgresBlobStorageProvider` is a **required** correction,
  not an optional one, since the local-disk design does not function on the mandated deployment
  target.
- `non-functional-requirements.md`'s references to "the container," `DATA_DIR`, and SQLite-specific
  language throughout §2 and §8 should be revised to match this document's serverless/Postgres
  architecture.
- `report-spec.md` §2 and `ui-spec.md` do not name a specific stack and require no changes as a
  result of this document.

Independent of this pass, `functional-requirements.md`'s old 5-state status names (§0.3, FR-011,
FR-049–FR-054) and `report-spec.md`'s partially-resolved `InvestigationHistory`/`InvestigationReview`
timeline interleaving (its own §9) remain outstanding from earlier revisions, unaffected by this one.

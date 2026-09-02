# Non-Functional Requirements — Aviation Incident Investigation Assistant

## 1. Technology Constraints (hard requirements from project brief)

- **NFR-1.1** The application shall require no external API keys of any kind (no LLM providers, no
  weather APIs, no mapping APIs, no third-party auth providers).
- **NFR-1.2** *(superseded by `technical-architecture.md` §5.1 — see the note at the end of this
  document)* The application shall run entirely against a free-tier, zero-additional-credential
  database service (Postgres via Neon) rather than local/static application data, satisfying the
  same "no paid/managed dependency" spirit assumption A3 originally stated for a local SQLite file.
- **NFR-1.3** All aviation incident data shall be simulated/fictional (assumption A8); no real
  registries, real people, or real airline names.
- **NFR-1.4** *(superseded — see note)* The application shall be deployable to the public internet
  with no dependency on a paid external service to function; deployment is to Vercel (zero-config
  for this stack) rather than a self-managed container.

## 2. Architecture

- **NFR-2.1** *(superseded — see note)* Frontend: React + TypeScript, server-rendered and
  hydrated by Next.js (App Router) rather than built as a standalone static SPA bundle.
- **NFR-2.2** *(superseded — see note)* Backend: Next.js Server Actions and Route Handlers,
  TypeScript, running in the same process as the frontend — no separate Express/REST API service.
- **NFR-2.3** *(superseded — see note)* Database: PostgreSQL (Neon, serverless), accessed via
  Prisma, with schema managed through versioned migrations checked into the repo.
- **NFR-2.4** The application shall run as a single deployable Next.js project with no separate
  frontend/backend deployment step (simplifies public deployment — no CORS configuration, one
  Vercel project).
- **NFR-2.5** *(superseded — see note)* File attachments (evidence) shall be stored as `Bytes`
  columns in Postgres via a `StorageProvider` abstraction (`data-model.md` §6.10.1,
  `technical-architecture.md` §9) rather than on a local filesystem — Vercel's serverless
  filesystem cannot durably persist an uploaded file across invocations, so local-disk storage was
  never a viable option for the mandated deployment target.

## 3. Performance

- **NFR-3.1** List and dashboard endpoints shall respond in under 300ms server-side at the seeded
  data scale (tens to low hundreds of incidents) on modest hosting (1 vCPU / 512MB class instance).
- **NFR-3.2** The frontend initial bundle shall be code-split so the dashboard and report views do not
  block the initial incident-list load.
- **NFR-3.3** Report generation (HTML render) shall complete in under 1 second for a single incident.

## 4. Security

- **NFR-4.1** Passwords shall be stored hashed (bcrypt or equivalent), never in plain text.
- **NFR-4.2** All database access shall use parameterized queries; no string-concatenated SQL.
- **NFR-4.3** All user-supplied text rendered in the UI shall be safely escaped to prevent XSS (React's
  default JSX escaping satisfies this; any `dangerouslySetInnerHTML` usage is disallowed).
- **NFR-4.4** Session cookies shall be `HttpOnly` and, in production (HTTPS), `Secure`.
- **NFR-4.5** File upload handling (evidence attachments) shall validate MIME type and enforce a
  per-file size limit (default 10MB) and a per-incident storage cap (default 100MB) to bound disk
  usage on a public deployment. The accepted-type allowlist (JPEG, PNG, PDF, plain text) deliberately
  excludes video/audio, macro-capable office formats, and executables — full rationale and the
  `StorageProvider` abstraction behind it are in `data-model.md` §6.10–§6.11.
- **NFR-4.6** Basic request rate limiting shall be applied to the login endpoint and to evidence
  upload endpoints, to slow brute-force attempts and storage-exhaustion abuse respectively.
- **NFR-4.7** Role-based authorization shall be enforced server-side on every mutating endpoint, not
  only hidden in the UI (see FR-1.5).
- **NFR-4.8** *(new)* Evidence attachment content shall never depend on an external document storage
  service; all file operations shall go through a single `StorageProvider` interface
  (`data-model.md` §6.10.1) so a real object-storage backend can be substituted later without
  changing any functional requirement's behavior. Seed/demo data shall use clearly-labeled simulated
  attachments (`isSimulated = TRUE`) rather than fabricated binary content per fictional evidence
  item.

## 5. Reliability & Data Integrity

- **NFR-5.1** Referential integrity between incident sub-records (aircraft, flight info, persons,
  evidence, actions, etc.) shall be enforced via foreign keys with cascade delete scoped to a single
  incident.
- **NFR-5.2** *(superseded — see note)* Backup/recovery is Neon's own point-in-time recovery
  (included on its free tier, `technical-architecture.md` §5.1/§7) rather than a documented
  file-copy procedure — there is no local database file to back up.
- **NFR-5.3** *(corrected to match `security-spec.md` §16, which supersedes this)* Schema changes
  shall go through versioned migrations, applied via an explicit `prisma migrate deploy` release
  step before a deployment is promoted — never automatically at application startup. Running
  migrations implicitly on every cold start would apply a schema change as an incidental side
  effect of an unrelated deploy, exactly what `security-spec.md` §16 and spec-review.md SR-018
  require avoiding.

## 6. Usability & Accessibility

- **NFR-6.1** The UI shall target WCAG 2.1 AA color contrast and keyboard navigability for all forms
  and interactive controls.
- **NFR-6.2** The guided incident workflow shall show clear progress/section indicators so a
  first-time user understands where they are in the investigation process without prior training.
- **NFR-6.3** The application shall be responsive down to a 375px-wide viewport (mobile), with the
  data-entry forms remaining usable (not just the marketing/dashboard pages).

## 7. Compatibility

- **NFR-7.1** The application shall support the latest two major versions of Chrome, Firefox, Edge,
  and Safari.
- **NFR-7.2** No browser plugins or extensions shall be required (report export uses native
  print-to-PDF, per assumption A7).

## 8. Deployability & Operations

- **NFR-8.1** *(superseded — see note)* The application shall build and deploy as a single Next.js
  project to Vercel — no `Dockerfile`/container image; Vercel builds and runs the Next.js
  application directly.
- **NFR-8.2** All runtime configuration shall be via environment variables with sane defaults where
  one is meaningful (`security-spec.md` §8's list — `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`,
  `NEXTAUTH_URL`, `NODE_ENV`); none shall be a third-party API key.
- **NFR-8.3** The application shall expose a lightweight `/api/health` endpoint for uptime checks by
  the hosting platform.
- **NFR-8.4** *(corrected to match NFR-5.3/`security-spec.md` §16)* Migrations are applied as an
  explicit `prisma migrate deploy` release step, never automatically at startup; on a genuinely empty
  database, `prisma db seed` populates the fictional demo dataset as its own explicit step
  (idempotent — upsert-by-email/unique-key, so it will not duplicate seed data if run again).

## 9. Maintainability

- **NFR-9.1** Backend and frontend code shall be written in TypeScript with strict type checking
  enabled.
- **NFR-9.2** The codebase shall include automated tests: unit tests for service-layer business
  logic (classification suggestion, risk matrix, status transitions) and integration tests for
  Server Actions/Route Handlers (`technical-architecture.md` §12, `testing-spec.md`).
- **NFR-9.3** *(corrected — Prettier was never adopted)* Linting (ESLint) shall be configured and
  enforced in CI, per `.github/workflows/ci.yml`.

## 10. Observability

- **NFR-10.1** The backend shall log structured request/error logs to stdout (container-friendly;
  no external logging service required).
- **NFR-10.2** Unhandled server errors shall return a generic 500 response to the client while logging
  full detail server-side (no stack traces leaked to the client).

## 11. Explicit Non-Goals (tie-back to product-spec §4.2)

- No horizontal-scaling concerns beyond what Vercel's serverless model already handles
  transparently (superseded — the original "SQLite is single-writer" rationale no longer applies
  now that the database is Postgres via Neon, which supports concurrent connections/writers
  natively; the non-goal itself — no custom multi-instance session-sharing infrastructure — still
  holds, just for a different, simpler reason: there is nothing bespoke to build).
- No real-time multi-user concurrent editing conflict resolution beyond "last write wins" with an
  `updatedAt` optimistic check that surfaces a conflict message, for per-investigation edits.
  **`RiskBandConfiguration`** (a global, non-investigation-scoped table, FR-069) is explicitly
  simpler still: plain last-write-wins with **no** conflict check at all — acceptable given how
  rarely an Administrator edits it, and a stated decision rather than a silent gap
  (spec-review.md SR-017).

---

**Consistency note**: NFR-1.2, NFR-1.4, NFR-2.1–NFR-2.3, NFR-2.5, NFR-5.2, NFR-8.1 above were
written against the project's original stack assumption (React+Vite SPA / Node.js+Express /
SQLite / Docker, `product-spec.md` A1–A3, A9) and are corrected here to match
`technical-architecture.md` §1, which is the authoritative stack decision — see that document's
§15 for the full list of files this same correction was flagged against.

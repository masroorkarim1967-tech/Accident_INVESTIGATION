# Non-Functional Requirements — Aviation Incident Investigation Assistant

## 1. Technology Constraints (hard requirements from project brief)

- **NFR-1.1** The application shall require no external API keys of any kind (no LLM providers, no
  weather APIs, no mapping APIs, no third-party auth providers).
- **NFR-1.2** The application shall run entirely against local/static application data and a local
  database (SQLite, embedded — see assumption A3).
- **NFR-1.3** All aviation incident data shall be simulated/fictional (assumption A8); no real
  registries, real people, or real airline names.
- **NFR-1.4** The application shall be deployable to the public internet as a standard containerized
  web service, with no dependency on a paid/managed external service to function.

## 2. Architecture

- **NFR-2.1** Frontend: React + TypeScript, built as a static SPA bundle (assumption A1).
- **NFR-2.2** Backend: Node.js + Express + TypeScript, exposing a REST JSON API consumed by the
  frontend (assumption A2).
- **NFR-2.3** Database: SQLite via an embedded driver (`better-sqlite3`), with schema managed through
  versioned migrations checked into the repo.
- **NFR-2.4** The backend shall serve the built frontend bundle directly in production, so the whole
  application runs as a single deployable process/container (simplifies public deployment — no CORS
  configuration, single port).
- **NFR-2.5** File attachments (evidence) shall be stored on the local filesystem under a configurable
  data directory, separate from the SQLite file, both included in backup/volume guidance.

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
- **NFR-5.2** The SQLite database file shall be included in the documented backup procedure (simple
  file copy) since there is no external managed database.
- **NFR-5.3** Schema changes shall go through migrations; the app shall run pending migrations
  automatically at startup so a fresh deployment initializes correctly.

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

- **NFR-8.1** The application shall build and run via a single `Dockerfile` producing one image
  containing both API and static frontend.
- **NFR-8.2** All runtime configuration shall be via environment variables with sane defaults (e.g.
  `PORT`, `SESSION_SECRET`, `DATA_DIR`); none shall be a third-party API key.
- **NFR-8.3** The application shall expose a lightweight `/health` endpoint for uptime checks by the
  hosting platform.
- **NFR-8.4** Startup shall auto-run migrations and, on a genuinely empty database, auto-seed the
  fictional demo dataset (idempotent — will not duplicate seed data on restart).

## 9. Maintainability

- **NFR-9.1** Backend and frontend code shall be written in TypeScript with strict type checking
  enabled.
- **NFR-9.2** The codebase shall include automated tests: unit tests for backend business logic
  (classification suggestion, risk matrix, status transitions) and at least smoke-level integration
  tests for the REST API.
- **NFR-9.3** Linting/formatting (ESLint + Prettier) shall be configured and enforced in CI (if/when
  CI is added) or at minimum via a documented local command.

## 10. Observability

- **NFR-10.1** The backend shall log structured request/error logs to stdout (container-friendly;
  no external logging service required).
- **NFR-10.2** Unhandled server errors shall return a generic 500 response to the client while logging
  full detail server-side (no stack traces leaked to the client).

## 11. Explicit Non-Goals (tie-back to product-spec §4.2)

- No horizontal scaling / multi-instance session sharing (SQLite is single-writer; acceptable for a
  portfolio-scale demo).
- No real-time multi-user concurrent editing conflict resolution beyond "last write wins" with an
  `updatedAt` optimistic check that surfaces a conflict message.

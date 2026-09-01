# Implementation Plan — Aviation Incident Investigation Assistant

## 0. Purpose and How to Read This Document

This plan sequences implementation into 16 phases, each small enough to build and verify on its
own before the next begins. It is a planning document only — **no application code is written as
part of producing this plan**, and no phase should begin until this document and the underlying
specs it points to have been reviewed.

Each phase specifies:

- **Requirements implemented** — the exact FR-IDs / spec sections it delivers.
- **Files expected to change** — by path, against the repository structure defined in
  `technical-architecture.md` §13.
- **Database changes** — the Prisma models/migrations introduced or altered in that phase. The
  schema is built incrementally, one migration per phase that needs one, rather than as a single
  upfront migration — this keeps each phase independently verifiable against a running database.
- **Tests required** — the specific `testing-spec.md` scenario IDs (TS-###) that apply, plus any
  phase-local tests not already enumerated there.
- **Acceptance criteria** — concrete, observable conditions that must hold before the phase is
  considered done.
- **Dependencies** — which earlier phases must be complete first.

### 0.1 This Plan Assumes the Critical Spec-Review Corrections, Not the Stale Text They Replace

`spec-review.md` identified two **Critical** issues that must not be built as originally worded:

- **SR-001 / SR-002**: `functional-requirements.md` FR-023/FR-055 and `data-model.md`'s `Attachment`
  entity still describe/require a local-disk storage provider that `technical-architecture.md` §9
  already proved does not run on Vercel. This plan builds evidence storage as
  `PostgresBlobStorageProvider` against a `Bytes` column from the start (Phase 6) — the corrected
  design, not the stale one. The corresponding text in `functional-requirements.md` and
  `data-model.md` should be corrected before or during Phase 6 so the specs and the code agree;
  this plan does not treat that correction as optional.

Several **High**-priority findings are likewise treated as resolved-by-plan rather than
resolved-by-code-workaround: the 5-state/old-entity-name terminology in `functional-requirements.md`
Modules 21–22 is corrected before Phase 10 begins (this plan builds the 6-state model throughout,
per `investigation-workflow.md`); FR-066's outcome-severity enum is corrected to match
`data-model.md`'s canonical `Negligible/Minor/Moderate/Major/Catastrophic` before Phase 5; the
missing Investigation Findings functional requirements (SR-008) are authored as part of Phase 10,
using `data-model.md` §3.21 and `ui-spec.md` §10 as the source of truth since they already fully
specify the feature; the missing `LoginAttempt` entity (SR-010) is added to the schema in Phase 2;
the stale ERD (SR-020) is corrected in Phase 2 as part of finalizing the schema documentation.
Medium/Low findings are resolved within the phase where the affected feature is built, noted inline
below where relevant, or deferred to Phase 15 (Production Hardening) where explicitly stated.

### 0.2 Phase-to-Module Overview

| Phase | Name | Primary FR Modules / Spec Sections |
|---|---|---|
| 1 | Project foundation | `technical-architecture.md` §1–§3, §11, §13 |
| 2 | Database | `data-model.md` (schema), Modules — (no FRs; infra) |
| 3 | Core layout/navigation | `ui-spec.md` §1–§2, Auth (`technical-architecture.md` §4.4) |
| 4 | Investigation management | Modules 2, 3, 4, 24 (FR-005–011, FR-059–061) |
| 5 | Occurrence information | Modules 5–9, 12, 13 (FR-012–018, FR-025–028, FR-066–067) |
| 6 | Evidence and witnesses | Modules 10, 11 (FR-019–024, FR-071) |
| 7 | Risk assessment | Module 14 (FR-029–030, FR-068–069) |
| 8 | Root cause analysis | Modules 15–17 (FR-031–039) |
| 9 | Corrective/preventive actions | Modules 18–20 (FR-040–048, FR-045a/b, FR-070) |
| 10 | Investigation review | Modules 21–22, 25 + new Findings FRs (FR-049–055, FR-062–064) |
| 11 | Assistance engine | `assistance-engine.md` full capability set |
| 12 | Dashboard | Module 1 (FR-001–004, FR-065) |
| 13 | Report generation | Modules 23 (FR-056–058), `report-spec.md` |
| 14 | Testing | `testing-spec.md` full suite |
| 15 | Production hardening | `security-spec.md`, `non-functional-requirements.md`, remaining edge cases |
| 16 | Deployment | `technical-architecture.md` §10–§11 |

---

## Phase 1 — Project Foundation

### Requirements Implemented
No FR-IDs (infrastructure phase). Implements `technical-architecture.md` §1 (Stack Summary), §2
(Constraint Verification), §3 (Frontend Architecture), §11 (Environment Configuration), §13
(Repository Structure), and `non-functional-requirements.md` §1 (Technology Constraints).

### Files Expected to Change
- `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`
- `app/layout.tsx` (root layout shell, no real content yet)
- `app/globals.css` (Tailwind base + Ops Board design tokens per `ui-spec.md` §1)
- `.env.example` (documents required variables without real values, per `security-spec.md` §8–§9)
- `.gitignore` (confirms `.env*` excluded)
- `README.md` (project overview, setup instructions)
- `lib/` directory scaffold (empty `lib/services/`, `lib/validation/`, `lib/utils/`)
- `.github/dependabot.yml` (per `security-spec.md` §17 follow-up, pulled forward since it costs
  nothing to add now)

### Database Changes
None. No database connection is established in this phase.

### Tests Required
- A smoke test confirming the app builds (`next build`) and boots (`next dev`) with no runtime
  errors on an empty placeholder home page. Not a numbered TS scenario — a build-health gate that
  precedes all others.

### Acceptance Criteria
- `npm run build` and `npm run dev` succeed with zero TypeScript errors under `strict: true`.
- Tailwind classes render correctly on a placeholder page using the Ops Board color tokens.
- No secrets exist anywhere in the repository; `.env.example` contains only variable names.
- Repository structure matches `technical-architecture.md` §13.

### Dependencies
None — this is the starting phase.

---

## Phase 2 — Database

### Requirements Implemented
No FR-IDs directly (infrastructure phase), but establishes the schema referenced by every
subsequent phase's FRs. Implements `data-model.md` §1 (Conventions, corrected to name Postgres, not
SQLite — closing the stale reference `technical-architecture.md` §15 flagged), the `User` entity
(§3.1), `Investigation` entity (§3.2) and `InvestigationHistory` entity (§3.24), plus the new
`LoginAttempt` entity this plan adds to close **SR-010**. Also implements `technical-architecture.md`
§5 (Database Architecture) and §4.4 (Auth's database-session requirement, which needs the Auth.js
adapter tables).

### Files Expected to Change
- `prisma/schema.prisma` (initial models: `User`, `Investigation`, `InvestigationHistory`,
  `LoginAttempt`, plus Auth.js adapter models — `Account`, `Session`, `VerificationToken` — per the
  standard Prisma adapter schema)
- `prisma/migrations/0001_init/` (generated)
- `prisma/seed.ts` (skeleton only — seeds the 5 demo user accounts from `demo-data.md` §1.4; full
  investigation data is seeded incrementally as later phases add the tables it depends on)
- `lib/db.ts` (Prisma Client singleton, per Next.js/serverless connection-reuse guidance)
- `.env.example` (adds `DATABASE_URL`, `DIRECT_URL`)
- `data-model.md` — corrective edits: §1 Target RDBMS corrected to Postgres/Neon; §2 ERD updated
  with the three missing relationship lines identified in **SR-020**
  (`EVIDENCE }o--o{ INVESTIGATION_FINDING`, `CORRECTIVE_ACTION }o--o| HAZARD`,
  `PREVENTIVE_ACTION }o--o| ROOT_CAUSE`); new `LoginAttempt` entity added to close **SR-010**.

### Database Changes
- New Neon Postgres project provisioned (development branch).
- Migration `0001_init`: `User`, `Account`, `Session`, `VerificationToken`, `Investigation`,
  `InvestigationHistory`, `LoginAttempt`.
- Seed data: 5 demo user accounts (Administrator, Investigation Manager, Investigator, Reviewer,
  Guest Viewer) with bcrypt-hashed passwords, per `demo-data.md` §1.4.

### Tests Required
- TS-012 – TS-016 (Database Tests) to the extent they apply to `User`/`Investigation` at this
  stage — specifically constraint tests for unique email, cascade-on-delete behavior for
  `InvestigationHistory`, and referential integrity for the nullable
  `assignedInvestigatorUserId`.
- A migration-round-trip test: `prisma migrate reset` followed by `prisma migrate deploy` succeeds
  cleanly against a fresh database.

### Acceptance Criteria
- `prisma migrate dev` runs cleanly against the Neon development branch.
- `prisma db seed` populates exactly 5 users with the roles and credentials specified in
  `demo-data.md` §1.4, and no plaintext password is ever logged or persisted.
- Connecting via `DATABASE_URL` (pooled) and `DIRECT_URL` (unpooled, for migrations) both work as
  described in `technical-architecture.md` §5.1.
- The corrected ERD in `data-model.md` §2 is verified to include every relationship referenced by
  the entity tables below it (closing SR-020 as a documentation task, tracked here since the schema
  work makes it easy to verify at the same time).

### Dependencies
Phase 1 (project scaffold must exist to hold `prisma/` and `lib/db.ts`).

---

## Phase 3 — Core Layout/Navigation

### Requirements Implemented
Implements `ui-spec.md` §1 (Login/Welcome Page), §2 (Global Layout & Navigation Shell — App Header
Bar, Disclaimer Ribbon, Investigation Workspace Shell), §18 (Settings/About, layout only — content
deferred), and the authentication portion of `technical-architecture.md` §4.4. No numbered FRs are
dedicated solely to layout, but this phase implements the role-based route protection that
`functional-requirements.md`'s per-FR "User" fields all assume, and resolves **SR-011** (the
"Continue as Viewer" mechanism) by making it an explicit, documented sign-in as the seeded Guest
Viewer account rather than a genuinely anonymous code path.

### Files Expected to Change
- `app/(auth)/login/page.tsx`
- `app/(auth)/layout.tsx`
- `app/api/auth/[...nextauth]/route.ts` (Auth.js route handler)
- `lib/auth.ts` (Auth.js configuration, Credentials provider, `requireRole` helper)
- `app/(workspace)/layout.tsx` (App Header Bar, Disclaimer Ribbon, nav shell — wraps all
  authenticated pages)
- `components/layout/AppHeader.tsx`, `components/layout/DisclaimerRibbon.tsx`,
  `components/layout/NavShell.tsx`
- `components/ui/` shared component scaffolding referenced by `ui-spec.md` §4 (Badge, ConfirmDialog,
  EmptyState, etc. — created as empty/typed shells here, filled in as each later phase needs them)
- `proxy.ts` (route protection — Next.js 16 renamed `middleware.ts` to `proxy.ts`, discovered during
  implementation; see `technical-architecture.md` §4.4's addendum)

### Database Changes
None new — consumes `User`/`Session`/`LoginAttempt` from Phase 2. Login attempts are now written to
`LoginAttempt` as part of implementing `security-spec.md` §14's rate-limiting design.

### Tests Required
- TS-050 (Security: authentication) and the login-specific negative tests it implies (wrong
  password, rate-limited after N failed attempts, deactivated account rejected).
- Integration test: each of the 5 seeded roles can log in and lands on the Dashboard shell with the
  correct nav items visible/hidden per `product-spec.md` §8.2's permission matrix.
- Integration test: an unauthenticated request to any workspace route redirects to `/login`.
- Integration test: "Continue as Viewer" signs the visitor in as the seeded Guest Viewer account
  (verifying the SR-011 resolution) rather than serving pages with no session at all.

### Acceptance Criteria
- All 5 roles can authenticate; role is available via `session.user.role` in Server Components,
  Server Actions, and Route Handlers.
- The Disclaimer Ribbon (per `product-spec.md` §11.2) renders on every authenticated page.
- Rate limiting per `security-spec.md` §14 measurably blocks a 6th failed login attempt within its
  configured window.
- No page renders investigation data yet — this phase is shell-only, verified by the absence of any
  data-fetching beyond the session/user check.

### Dependencies
Phases 1–2.

---

## Phase 4 — Investigation Management

### Requirements Implemented
FR-005, FR-006 (Module 2 — Investigation Creation), FR-007, FR-008 (Module 3 — Investigation List),
FR-009, FR-010, FR-011 (Module 4 — Investigation Detail shell and read-only enforcement), FR-059,
FR-060, FR-061 (Module 24 — Search and Filtering, implemented here since it operates entirely on
the Investigation List built in this same phase). Resolves **SR-012** (Reporter field ambiguity) by
implementing it as free text only, matching `ui-spec.md` §4's resolution, with FR-005 corrected to
match. Resolves **SR-013** (reference-number year-rollover) by implementing the sequence as a
database-level per-year sequence, documented explicitly in `data-model.md` §3.2 as part of this
phase's work.

### Files Expected to Change
- `app/(workspace)/dashboard/page.tsx` (placeholder redirect target only; full Dashboard is Phase 12)
- `app/(workspace)/investigations/page.tsx` (List, search, filter, pagination)
- `app/(workspace)/investigations/new/page.tsx` (Create)
- `app/(workspace)/investigations/[id]/page.tsx` (Detail shell — section stepper, no section content
  yet beyond a placeholder per section)
- `lib/actions/investigation.ts` (Server Actions: create, assign/reassign, list query, search/filter)
- `lib/validation/investigation.ts` (Zod schemas)
- `lib/services/referenceNumber.ts` (per-year sequential reference number generation)
- `lib/services/investigationHistory.ts` (shared history-logging service, used by every mutating
  action from this phase onward)
- `components/investigations/InvestigationCard.tsx`, `SectionStepper.tsx`,
  `CompletenessIndicator.tsx`

### Database Changes
- Migration `0002_occurrence_date_and_sequence`: adds `Occurrence` — **minimal slice only**
  (`investigationId`, `occurrenceDateUtc`) — since FR-005 needs somewhere to persist the initial
  occurrence date before Phase 5 builds the rest of that table's fields (`data-model.md` §3.3's
  Phase 4 addendum); and `ReferenceNumberSequence` (`year`, `nextValue`), backing the per-year
  reference-number generator (`data-model.md` §3.2's DM-16 addendum, closing SR-013). `Investigation`
  itself needed no new fields here — Phase 2 already created its full field set.
- `InvestigationHistory` rows begin being written by every Server Action in this phase.

### Tests Required
- TS-001 – TS-006 (Unit) for the reference-number generator and Zod validation schemas.
- TS-007 – TS-011 (Integration) for create/list/assign flows.
- TS-017 – TS-021 (Form Validation) for the New Investigation form.
- TS-022 – TS-026 (Workflow) to the extent they cover Draft→Open and read-only-by-status (FR-011).
- EC-01 (Empty Investigation), EC-02 (Missing Required Fields), EC-03 (Duplicate Investigation),
  EC-04/EC-05 (Invalid/Future Dates) — all exercised against this phase's Create form.

### Acceptance Criteria
- A new investigation can be created, receives a correctly-formatted, collision-free reference
  number even under concurrent creation in the same year (verified per TS-005-equivalent
  concurrency test), and starts in `Draft` status.
- The Investigation List supports search, filter, sort, and pagination together (FR-061) without
  requiring a full page reload.
- FR-011's read-only enforcement is verifiable: attempting a mutation via a Server Action on a
  `Review` or `Closed` investigation as a non-Admin role is rejected server-side, not just hidden in
  the UI.
- Every create/assign action produces a corresponding `InvestigationHistory` row.

### Dependencies
Phases 1–3.

---

## Phase 5 — Occurrence Information

### Requirements Implemented
FR-012 (Occurrence), FR-013 (Aircraft), FR-014 (Flight), FR-015 (Location), FR-016/017/018 (Persons
Involved + injury summary), FR-025/026 (Immediate Actions), FR-027 (Occurrence Classification),
FR-028 (Suggested Classification — implemented here as a simple inline rule, formalized into the
shared engine architecture in Phase 11), FR-066 (Actual/Potential Outcome — implemented with the
**corrected** severity enum per SR-004, i.e. `Negligible/Minor/Moderate/Major/Catastrophic`, not the
stale `Hazardous` value FR-066 currently lists), FR-067 (Risk Score/Band/Investigation Priority).
This phase introduces the shared risk-calculation engine (`data-model.md` §6.1–§6.5) since Occurrence
risk is the first consumer of it; Phase 7 (Hazard) reuses the same engine rather than duplicating it.

### Files Expected to Change
- `app/(workspace)/investigations/[id]/occurrence/page.tsx`
- `app/(workspace)/investigations/[id]/aircraft/page.tsx`
- `app/(workspace)/investigations/[id]/flight/page.tsx`
- `app/(workspace)/investigations/[id]/location/page.tsx`
- `app/(workspace)/investigations/[id]/persons/page.tsx`
- `app/(workspace)/investigations/[id]/immediate-actions/page.tsx`
- `lib/actions/occurrence.ts`, `aircraft.ts`, `flight.ts`, `location.ts`, `person.ts`,
  `immediateAction.ts`
- `lib/validation/occurrence.ts` (and siblings per entity)
- `lib/services/riskEngine.ts` (shared `calculateRiskScore`, `resolveRiskBand`,
  `resolveInvestigationPriority` functions, consuming seeded `RiskBandConfiguration`)
- `lib/services/suggestClassification.ts` (FR-028's inline rule, later absorbed into Phase 11's
  engine module without changing its external behavior)
- `components/occurrence/ClassificationForm.tsx`, `OutcomeFields.tsx`, `RiskBadge.tsx`,
  `PriorityBadge.tsx`

### Database Changes
- Migration `0003_occurrence_and_related`: **`ALTER TABLE Occurrence`** (adding every field beyond
  the `investigationId`/`occurrenceDateUtc` slice Phase 4 already created — data-model.md §3.3's
  Phase 4 addendum), plus new tables `OccurrenceSubcategoryOption` (seeded lookup table, 14
  categories per `data-model.md` §6.6), `Aircraft`, `Flight`, `Location`, `Person`,
  `ImmediateAction`, `RiskBandConfiguration` (seeded with the default Low/Moderate/High/Critical
  bands; the Administrator-facing edit UI for this table is Phase 7's FR-069, not this phase's).
- `functional-requirements.md` FR-066 corrected to the canonical severity enum as part of this
  phase's work (closing SR-004).

### Tests Required
- TS-001 – TS-006 (Unit) for `riskEngine.ts` — this is the highest-value unit-test target in the
  whole app, since every risk/priority number downstream depends on it.
- TS-027 – TS-031 (Risk Calculation Tests) in full.
- TS-017 – TS-021 (Form Validation) for each new form.
- EC-07 (Multiple Aircraft) — verifies the one-to-many relaxation if applicable, or confirms the
  one-Aircraft-per-Investigation assumption is enforced as documented.
- EC-21 (Very Long Descriptions) against `Occurrence.narrativeDescription` specifically, verifying
  the 10,000-character tier from `edge-cases.md` EC-21 is enforced — closing **SR-014** for this
  field as it's built, rather than leaving it for a later sweep.

### Acceptance Criteria
- Risk Score = Likelihood × Severity computes correctly for all 25 (Likelihood, Severity)
  combinations and resolves to the correct configured band.
- Investigation Priority correctly applies the category-floor rule (Dangerous Goods /
  Security-Related occurrences never resolve below Elevated), per `data-model.md` §6.5.
- The Suggested Classification chip is visibly labeled "Investigation Support · Suggested
  Classification," requires explicit accept/reject, and is never auto-applied.
- Actual Outcome and Potential Outcome are recorded as visibly distinct fields, both feeding the
  correct half of the risk calculation per the documented rule.

### Dependencies
Phases 1–4.

---

## Phase 6 — Evidence and Witnesses

### Requirements Implemented
FR-019/020 (Module 10 — Witness Management), FR-021/022/023/024 (Module 11 — Evidence Management),
FR-071 (Link Evidence to a Finding). **This phase is where SR-001 and SR-002 are closed**: evidence
attachments are implemented against `PostgresBlobStorageProvider` and a `Bytes` column from the
start — the local-disk approach in the stale FR-023/FR-055 text is not built.

### Files Expected to Change
- `app/(workspace)/investigations/[id]/witnesses/page.tsx`
- `app/(workspace)/investigations/[id]/evidence/page.tsx`
- `app/api/evidence/[id]/attachment/route.ts` (Route Handler — file upload/download, per
  `technical-architecture.md` §4.2's rule that streaming/upload uses Route Handlers, not Server
  Actions)
- `lib/actions/witness.ts`, `evidence.ts`
- `lib/services/storage/StorageProvider.ts` (interface), `PostgresBlobStorageProvider.ts`
  (implementation)
- `lib/validation/evidence.ts` (file type/size validation per `security-spec.md` §13)
- `components/evidence/AttachmentUploader.tsx`, `EvidenceTypeSelect.tsx`, `SimulatedTag.tsx`

### Database Changes
- Migration `0004_evidence_and_witnesses`: `Witness`, `Evidence`, `Attachment` — with `Attachment`
  including the `fileBytes Bytes` column this plan adds to close **SR-002** (in place of/alongside
  `storagePath`, per the resolution recorded in `spec-review.md` §3.1 SR-002).
- `data-model.md` §3.10 updated to reflect the added `fileBytes` field as part of this phase's work.

### Tests Required
- TS-012 – TS-016 (Database) for cascade-delete of `Attachment` rows with an investigation.
- Integration tests for upload (accepted types/sizes per `security-spec.md` §13) and download
  round-trip byte-for-byte integrity.
- EC-10 (No Evidence), EC-11 (Evidence Unrelated to Findings), EC-26 (Attachment Storage Cap
  Reached) — all specified in `edge-cases.md`.
- Negative test: uploading a disallowed MIME type or oversized file is rejected server-side (not
  just client-side), per `security-spec.md` §13.

### Acceptance Criteria
- An uploaded file's bytes are stored in and served from Postgres, not the filesystem — verified by
  a test that the app still serves a previously uploaded attachment correctly after a full
  redeploy (simulating Vercel's ephemeral filesystem by asserting no reliance on local disk paths
  survives a process restart).
- Every attachment is visibly tagged `isSimulated` where applicable, per `ui-spec.md`'s
  `SimulatedTag` component.
- Evidence can be linked to a Finding via FR-071's UI, even though Finding *creation* itself is not
  built until Phase 10 — this phase's linking UI operates against Findings seeded directly for
  testing purposes if needed, or is deferred to integrate fully once Phase 10 lands (tracked
  explicitly, not silently skipped).

### Dependencies
Phases 1–5.

---

## Phase 7 — Risk Assessment

### Requirements Implemented
FR-029 (Add/Edit Hazard with Initial Risk), FR-068 (Existing Controls and Residual Risk), FR-069
(Configure Risk Bands — Administrator), FR-030 (Remove Hazard — implemented with the **corrected**
reference, `CorrectiveAction.hazardId`/`PreventiveAction.hazardId`, closing **SR-005**, rather than
the stale unified `Action.hazardId`).

### Files Expected to Change
- `app/(workspace)/investigations/[id]/hazards/page.tsx`
- `app/(workspace)/settings/risk-bands/page.tsx` (Administrator-only)
- `lib/actions/hazard.ts`, `riskBandConfiguration.ts`
- `lib/validation/hazard.ts`
- Reuses `lib/services/riskEngine.ts` from Phase 5 without modification — this phase is the proof
  that the shared engine generalizes correctly to a second consumer.
- `components/hazard/InitialRiskForm.tsx`, `ResidualRiskForm.tsx`, `RiskBandEditor.tsx`

### Database Changes
- Migration `0005_hazard`: `Hazard` table (initial + residual risk fields).
- No changes to `RiskBandConfiguration`'s schema (created in Phase 5) — this phase only adds the
  Administrator-facing CRUD UI against it.
- `functional-requirements.md` FR-030 corrected as part of this phase's work (closing SR-005).

### Tests Required
- TS-027 – TS-031 (Risk Calculation) re-run against Hazard's initial/residual risk to confirm the
  shared engine produces identical results to Occurrence's usage of it.
- EC-27 (Risk Bands Reconfigured While Historical Data Exists) — verifies that changing
  `RiskBandConfiguration` does not retroactively alter previously-stored risk band labels on
  existing Hazards/Occurrences (denormalized-label design per `data-model.md` §6.4).
- Integration test: FR-069's band edits are atomic (all rows save together or none do).

### Acceptance Criteria
- Existing Controls can be recorded and Residual Risk computed independently of Initial Risk.
- An Administrator can edit risk bands; a non-Administrator cannot (enforced server-side).
- Removing a Hazard correctly clears both `CorrectiveAction.hazardId` and
  `PreventiveAction.hazardId` references pointing to it, with no runtime error referencing a
  nonexistent unified `Action` table.

### Dependencies
Phases 1–5 (specifically needs `riskEngine.ts` from Phase 5).

---

## Phase 8 — Root Cause Analysis

### Requirements Implemented
FR-031/032/033 (Module 15 — Contributing Factors, including FR-033's Potential Contributing Factor
suggestions), FR-034/035/036/037 (Module 16 — 5 Whys Analysis, including FR-036's Recommended
Follow-up Question suggestion), FR-038/039 (Module 17 — Root-Cause Analysis).

### Files Expected to Change
- `app/(workspace)/investigations/[id]/contributing-factors/page.tsx`
- `app/(workspace)/investigations/[id]/five-whys/page.tsx`
- `app/(workspace)/investigations/[id]/root-causes/page.tsx`
- `lib/actions/contributingFactor.ts`, `fiveWhys.ts`, `rootCause.ts`
- `lib/validation/contributingFactor.ts`, `fiveWhys.ts`, `rootCause.ts`
- `lib/services/suggestContributingFactor.ts`, `suggestFollowUpQuestion.ts` (inline rules, later
  absorbed into Phase 11's engine module)
- `components/rootcause/ConfidenceLevelBadge.tsx`, `WhyEntryList.tsx`,
  `SupportingEvidencePicker.tsx`

### Database Changes
- Migration `0006_root_cause_analysis`: `ContributingFactor`, `ContributingFactorHazardLink`,
  `FiveWhysAnalysis`, `FiveWhysEntry` (capped at 5 per analysis), `RootCause`,
  `RootCauseContributingFactorLink`.

### Tests Required
- TS-022 – TS-026 (Workflow) for the "stop before 5 Whys" and "multiple root causes" behaviors.
- EC-12 (Multiple Root Causes), EC-13 (No Root Cause Established) — both specified in
  `edge-cases.md`.
- Unit test confirming the UI/label layer never renders the words "Root Cause," "Confirmed Cause,"
  or "Determination" without the "Potential" / "Investigator Assessment" qualifiers, per
  `product-spec.md` §11.6.

### Acceptance Criteria
- A 5 Whys analysis can be stopped at any point between 1 and 5 entries.
- Multiple Root Causes can be recorded per investigation, each independently linked to zero or more
  Contributing Factors.
- `RootCause.supportingEvidence` and `confidenceLevel` are structurally required fields, not
  optional UI conventions — attempting to save a Root Cause without them is rejected server-side.
- Report-facing language for this module (verified here even though the Report itself is Phase 13)
  consistently uses "Potential Root Cause" / "Investigator Assessment."

### Dependencies
Phases 1–5, 7 (Contributing Factors link to Hazards from Phase 7).

---

## Phase 9 — Corrective/Preventive Actions

### Requirements Implemented
FR-040/041 (Module 18 — Corrective Actions), FR-042/043 (Module 19 — Preventive Actions), FR-044,
FR-045a, FR-045b, FR-046, FR-047, FR-048 (Module 20 — Action Tracking), FR-070 (Portfolio-Wide
Action Tracker page).

### Files Expected to Change
- `app/(workspace)/investigations/[id]/actions/page.tsx`
- `app/(workspace)/action-tracker/page.tsx` (portfolio-wide, cross-investigation)
- `lib/actions/correctiveAction.ts`, `preventiveAction.ts`
- `lib/validation/correctiveAction.ts`, `preventiveAction.ts`
- `lib/services/overdueComputation.ts` (derived-only `Overdue` status, never stored, per
  `data-model.md` §6.9.2)
- `components/actions/ActionStatusBadge.tsx`, `ActionPriorityBadge.tsx`, `OverdueIndicator.tsx`,
  `VerificationForm.tsx`

### Database Changes
- Migration `0007_actions`: `CorrectiveAction`, `PreventiveAction` — each with the reciprocal
  `hazardId`/`rootCauseId` fields per DM-14 (both tables carry both optional links, matching the
  corrected ERD from Phase 2).

### Tests Required
- TS-022 – TS-026 (Workflow) for the 7-status action lifecycle and the Verified-requires-different-
  person-than-owner rule (FR-045b).
- EC-14 (Corrective Action Without Owner), EC-15 (Overdue Corrective Action) — both specified in
  `edge-cases.md`.
- Unit test for `overdueComputation.ts` confirming `Overdue` is never written to the database, only
  computed at read time.
- Test confirming SR-016's gap is closed here if addressed: an action cannot be verified by its own
  owner, and reassigning an action to a deactivated user is either blocked or visibly flagged
  (resolving the parallel concern raised for Investigator assignment in SR-016 — implemented here
  first since Action ownership is where `edge-cases.md` EC-14 originally specified the pattern).

### Acceptance Criteria
- `requiredForClosure` defaults to `TRUE` for Corrective and `FALSE` for Preventive actions, exactly
  as specified, and is editable only by roles permitted to do so.
- The portfolio-wide Action Tracker (FR-070) correctly aggregates actions across all investigations
  the viewing role is permitted to see.
- Overdue actions are visually flagged without any batch job — the flag is computed at query time
  from `dueDate` and current status.

### Dependencies
Phases 1–5, 7, 8 (actions link to Hazards and Root Causes from those phases).

---

## Phase 10 — Investigation Review

### Requirements Implemented
FR-049/050/051/052 (Module 21 — Investigation Review), FR-053/054/055 (Module 22 — Investigation
Closure), FR-062/063/064 (Module 25 — Audit/History viewing UI; the underlying logging service was
built in Phase 4), and **new FRs for Investigation Findings** (data-model.md §3.21, ui-spec.md §10)
authored during this phase to close **SR-008** — since `functional-requirements.md` currently has
no module for this fully-designed feature, this phase's first deliverable is writing that module
(proposed IDs FR-072–FR-074: Add/Edit Finding, Remove Finding with renumbering, Cite
Hazard/Contributing-Factor/Root-Cause) before implementing it. This phase also implements the
**corrected** 6-state terminology throughout (closing **SR-003** for Modules 21–22) and the
**corrected** report cross-references in FR-062/063 (closing **SR-006**).

### Files Expected to Change
- `functional-requirements.md` — Module 21/22 rewritten to the 6-state model and current entity
  names; new Investigation Findings module added; FR-062/063's citations corrected.
- `app/(workspace)/investigations/[id]/findings/page.tsx`
- `app/(workspace)/investigations/[id]/review/page.tsx`
- `app/(workspace)/investigations/[id]/history/page.tsx`
- `lib/actions/finding.ts`, `review.ts`, `closure.ts`
- `lib/validation/finding.ts`
- `lib/services/closureGate.ts` (checks `requiredForClosure` actions before allowing `Review →
  Closed`, including the ADMIN override path)
- `components/findings/FindingCard.tsx`, `CitationPicker.tsx`
- `components/review/ReviewDecisionForm.tsx`, `AuditHistoryTimeline.tsx`

### Database Changes
- Migration `0008_findings_and_review`: `InvestigationFinding`, its finding-link join tables
  (Hazard/ContributingFactor/RootCause citations), `EvidenceFindingLink` (retroactively connecting
  Phase 6's evidence-linking UI to real Findings for the first time), `InvestigationReview`.

### Tests Required
- TS-022 – TS-026 (Workflow) for every transition in the 6-state model, specifically Under
  Investigation→Analysis→Review→Closed and the two backward transitions (Review→Analysis,
  Closed→UnderInvestigation).
- EC-06 (Investigation Reopened After Closure), EC-24 (Report Generated With Missing Information —
  partially exercised here, fully in Phase 13).
- Test resolving **SR-021**: verify the ADMIN "Override and Close" control and the ordinary
  Reviewer-approval path are each explicitly scoped to only fire from `Review` status, and that
  their relationship (same action vs. two distinct escalations) is implemented exactly as clarified
  during this phase's design work.
- Test resolving **SR-022**: verify whether investigator reassignment is permitted during `Review`
  status, per the explicit rule this phase adds to FR-006.

### Acceptance Criteria
- A Reviewer can Approve or Request Changes; only an Administrator can override the closure gate
  when required actions are incomplete, and doing so requires the justification field
  `data-model.md` §6.9.3 specifies.
- Closing an investigation with incomplete `requiredForClosure` actions is blocked for every role
  except the documented ADMIN override path.
- Investigation Findings can be added, cited against Hazards/Contributing Factors/Root Causes, and
  removed with automatic renumbering, using the newly-authored FRs.
- The Audit/History page correctly interleaves `InvestigationHistory` entries with
  `InvestigationReview` decisions in chronological order.

### Dependencies
Phases 1–9 (Review/Closure depends on every substantive module having something to review).

---

## Phase 11 — Assistance Engine

### Requirements Implemented
Formalizes `assistance-engine.md` in full. Three capabilities already exist as inline rules from
earlier phases (FR-028 Suggested Classification, Phase 5; FR-033 Potential Contributing Factors,
Phase 8; FR-036 Recommended Follow-up Questions, Phase 8) and are refactored into a single coherent
service layer here without changing their observed behavior. Six **new** capabilities are built for
the first time, closing **SR-009**: Investigation Checklist Suggestions, Missing-Information
Warnings, Investigation Completeness Score, Risk Warnings, Corrective-Action Reminders, and Report
Quality Checks (`assistance-engine.md` §4.1, §4.2, §4.4, §4.6, §4.7, §4.8). New FRs are authored for
these six (proposed IDs FR-075–FR-080) as part of this phase, per the same reasoning applied to
Findings in Phase 10.

### Files Expected to Change
- `functional-requirements.md` — new FRs FR-075–FR-080 added for the six new capabilities.
- `lib/services/investigationSupportEngine/` (new directory, per `technical-architecture.md` §4.3's
  own note that the bespoke single-file design needs generalizing): `index.ts`,
  `checklistSuggestions.ts`, `missingInfoWarnings.ts`, `completenessScore.ts`,
  `suggestClassification.ts` (moved from Phase 5), `suggestContributingFactor.ts` and
  `suggestFollowUpQuestion.ts` (moved from Phase 8), `riskWarnings.ts`, `actionReminders.ts`,
  `reportQualityChecks.ts`, `confidence.ts` (shared Definite/Inferential handling), `labels.ts`
  (the exact mandated label strings, centralized so no capability can drift from them).
- `components/support/SuggestionChip.tsx`, `AdvisoryBanner.tsx`, `CompletenessScoreGauge.tsx`
  (shared components consumed across many pages built in earlier phases)

### Database Changes
None. Per `assistance-engine.md` §2/§3.3, Category A (advisory) results are never persisted, and
Category B (content suggestion) results only ever populate fields already defined on existing
tables via their existing `wasSuggestionAccepted`-style flags (Occurrence, ContributingFactor). This
phase adds no new tables — the "no schema change" outcome here is itself a check that the engine's
non-persistence design was followed correctly in Phases 5 and 8.

### Tests Required
- TS-032 – TS-036 (Assistance-Engine Tests) in full.
- Unit tests confirming every capability's output carries the correct mandated label string
  (`labels.ts`) and confidence category (Definite vs. Inferential), and that Category A output is
  never written to the database under any code path.
- Regression tests confirming FR-028/033/036's externally-observed behavior is unchanged after the
  Phase-11 refactor moves their implementation into the new service directory.

### Acceptance Criteria
- All 8 capabilities are reachable from the UI locations specified in `assistance-engine.md` §6.
- No capability ever calls an external API — verified by a static check (no `fetch` to any
  non-relative URL anywhere under `lib/services/investigationSupportEngine/`).
- Investigation Completeness Score correctly aggregates presence/absence across every module built
  in Phases 5–10.
- Every suggestion in the UI is visibly labeled "Investigation Support · [Capability Name]" and
  never presented as a determination.

### Dependencies
Phases 1–10 (the engine reads across nearly every entity built by then).

---

## Phase 12 — Dashboard

### Requirements Implemented
FR-001, FR-002, FR-003, FR-004, FR-065 (Module 1), using the metric definitions in
`functional-requirements.md` §1.0.

### Files Expected to Change
- `app/(workspace)/dashboard/page.tsx` (replaces the Phase 4 placeholder with the full dashboard)
- `lib/actions/dashboard.ts` (aggregation queries for the 7 tiles, 6 charts)
- `lib/services/dashboardMetrics.ts` (pure functions implementing §1.0's metric definitions,
  independently unit-testable from the queries that feed them)
- `components/dashboard/SummaryTile.tsx`, `TrendChart.tsx`, `SeverityBreakdownChart.tsx`,
  `ActionStatusSummary.tsx`, `DashboardFilters.tsx`

### Database Changes
None — the Dashboard is read-only aggregation over existing tables. Query performance is verified
against the indexes established across Phases 2–10 (`data-model.md` §8, Index Summary); this phase
adds any index found missing during load testing, but does not introduce new entities.

### Tests Required
- Unit tests for every metric definition in §1.0 against the `demo-data.md` fictional dataset,
  checked against the worked example in `functional-requirements.md` §1.1 for an exact-match
  regression test.
- Integration test for FR-065's 6 filters, individually and combined.
- Responsive tests (TS-042 – TS-045) specifically for the dashboard's chart layout at mobile width.

### Acceptance Criteria
- All 7 tiles and 6 charts render correct values against the seeded demo dataset, matching the
  worked example in `functional-requirements.md` §1.1 exactly.
- Filters apply consistently across every tile/chart simultaneously (no tile left showing
  unfiltered totals).
- Dashboard load time meets the performance target in `non-functional-requirements.md` §3.

### Dependencies
Phases 1–9 (needs real data across every module to have meaningful metrics; Phase 10/11 not
strictly required but recommended complete first since Action-related tiles reference
`requiredForClosure` status introduced in Phase 9 and completeness scoring from Phase 11 may inform
a future tile).

---

## Phase 13 — Report Generation

### Requirements Implemented
FR-056, FR-057, FR-058 (Module 23), and the full `report-spec.md` (§3 FACTS/ASSESSMENT/
RECOMMENDATIONS banner system, §4 Not-provided/Not-established rule, §5.0–§5.20's 24 items, §6
Appendices).

### Files Expected to Change
- `app/(workspace)/investigations/[id]/report/page.tsx` (on-screen preview)
- `app/api/investigations/[id]/report/pdf/route.ts` (print-optimized route, per
  `technical-architecture.md` §4.2 — export uses a Route Handler, not a Server Action)
- `app/api/investigations/[id]/report/json/route.ts` (FR-058's JSON export)
- `lib/services/reportComposer.ts` (assembles all 24 sections; enforces RPT-5's rule that
  Established Facts and Investigation Conclusion are strictly system-composed recaps, never
  free-typed fields)
- `components/report/ReportSection.tsx`, `SectionBanner.tsx` (renders the FACTS/ASSESSMENT/
  RECOMMENDATIONS/ADMINISTRATIVE RECORD banners in-place, no reordering)

### Database Changes
None — the report is a read-time composition over every entity built in Phases 4–10. No report
content is persisted separately from its source data.

### Tests Required
- TS-037 – TS-041 (Report-Generation Tests) in full.
- EC-24 (Report Generated With Missing Information) — verifies "Not provided" vs. "Not established"
  are applied correctly and no field is ever fabricated.
- Regression test against `demo-data.md`'s 10 seeded investigations: each of the 24 report sections
  renders without error across every investigation, including the deliberately incomplete ones.
- Print/PDF layout test confirming the report is printable per FR-057 without relying on a
  server-side rendering service (honoring the "no Puppeteer" assumption).

### Acceptance Criteria
- Every one of the 24 numbered report items renders, tagged with its correct FACTS/ASSESSMENT/
  RECOMMENDATIONS/ADMINISTRATIVE RECORD banner.
- A field with no recorded value renders exactly "Not provided" (descriptive) or "Not established"
  (analytical), never blank, never a fabricated placeholder.
- JSON export (FR-058) produces valid JSON that round-trips the investigation's full data.
- The report is available only at the statuses `report-spec.md` §8 specifies.

### Dependencies
Phases 1–10 (needs every FACTS/ASSESSMENT/RECOMMENDATIONS-bearing module complete).

---

## Phase 14 — Testing

### Requirements Implemented
Formal execution of `testing-spec.md` in full: TS-001–TS-054 across all 11 categories, the
Acceptance Criteria table (§2), and the Coverage Targets/CI gates (§5). Phases 1–13 each already
specify their own relevant TS scenarios as they're built (test-as-you-go); this phase is where the
suite is completed, wired into CI, and enforced as a merge gate — it is not the first time tests are
written.

### Files Expected to Change
- `vitest.config.ts`, `playwright.config.ts`
- `.github/workflows/ci.yml` (runs unit/integration/E2E on every PR, enforces coverage gate)
- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**` (any scenarios not already created
  incrementally in earlier phases; this phase's primary job is filling gaps, not starting from zero)
- `tests/accessibility/**` (TS-046–TS-049, using axe or equivalent)
- `tests/security/**` (TS-050–TS-054)

### Database Changes
None to the application schema. A dedicated test database (or per-test-run migration reset)
strategy is finalized here for CI, per `technical-architecture.md` §12.

### Tests Required
This phase's deliverable *is* the test suite; the "tests required" are the full TS-001–TS-054 set
verified complete and green, plus the two categories least likely to have been fully covered
incrementally: TS-042–TS-045 (Responsive UI) and TS-046–TS-049 (Accessibility), which are easiest to
defer and therefore worth an explicit dedicated pass.

### Acceptance Criteria
- All 54 test scenarios pass in CI.
- Coverage targets from `testing-spec.md` §5 are met and enforced as a CI gate (a PR that drops
  below the threshold fails).
- Accessibility commitments from `ui-spec.md` §5 are verified automatically, not just by manual
  review.
- CI runs on every pull request and blocks merge on failure.

### Dependencies
Phases 1–13 (there is nothing meaningful to test end-to-end before every feature module exists).

---

## Phase 15 — Production Hardening

### Requirements Implemented
The remaining `security-spec.md` sections not already covered incrementally: §3 (CSP — implemented
**without** the Google Fonts hedge, closing **SR-019**, since `next/font` self-hosting was already
committed to in Phase 1), §4 (CSRF/Origin-header verification for Route Handlers), §7 (least-
privilege database role), §16 (production deployment security checklist), §17's remaining items
(GitHub secret scanning, branch protection). Also closes remaining Medium/Low spec-review items not
tied to a specific feature phase: **SR-015** (RiskBandConfiguration colorHint validation),
**SR-017** (RiskBandConfiguration concurrency policy), **SR-018** (migration-failure behavior),
**SR-019** (password/session-timeout policy — session lifetime configured, minimum password length
enforced on the seed script and any future credential-set flow). Implements the remaining
`non-functional-requirements.md` reliability items and `edge-cases.md`'s infrastructure-level cases:
EC-17 (Browser Refresh During Form Entry — `beforeunload` warning), EC-18 (Network Interruption —
transactional multi-row writes), EC-19 (Database Failure — graceful error pages).

### Files Expected to Change
- `next.config.js` (security headers: CSP, X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy)
- `proxy.ts` (Origin-header verification for state-changing Route Handlers — renamed from
  `middleware.ts` in Phase 3, Next.js 16)
- `lib/db.ts` (confirms connection uses the least-privilege application role, not a superuser role)
- `app/error.tsx`, `app/global-error.tsx` (graceful degradation for EC-19)
- `hooks/useUnsavedChangesWarning.ts` (EC-17)
- `lib/services/riskBandConfiguration.ts` (adds the colorHint enum validation, closing SR-015, and
  states/implements the concurrency policy for global config edits, closing SR-017)
- `.github/settings.yml` or repository settings (branch protection, secret scanning enabled — a
  configuration change, not application code)
- `security-spec.md`, `non-functional-requirements.md` — corrected to remove remaining stale-stack
  references (Docker/SQLite/Express) flagged since `technical-architecture.md` was introduced

### Database Changes
- A least-privilege Postgres role is created in Neon for the application's runtime connection
  (`GRANT` statements, not a Prisma migration).
- No new application tables.

### Tests Required
- TS-050 – TS-054 (Security Tests) re-verified against the hardened configuration specifically
  (headers present, Origin check rejects cross-origin state-changing requests).
- Test confirming a simulated database outage renders the graceful error page rather than an
  unhandled exception (EC-19).
- Test confirming an in-progress multi-row write either fully commits or fully rolls back under a
  simulated interruption (EC-18).

### Acceptance Criteria
- Security headers are present and correctly configured on every response, verified via an
  automated header-inspection test.
- The application's database connection uses a role with only the privileges it needs — verified by
  attempting (and failing) a schema-altering statement over that connection in a test.
- GitHub secret scanning and push protection are enabled on the repository.
- Every spec-review finding not already closed by an earlier phase is either resolved here or
  explicitly deferred with a documented reason in `spec-review.md`'s findings list (updated to
  reflect final disposition).

### Dependencies
Phases 1–14 (hardening applies across the whole surface area; must follow full feature completeness
and the test suite that verifies hardening didn't break anything).

---

## Phase 16 — Deployment

### Requirements Implemented
`technical-architecture.md` §10 (Deployment Architecture) and §11 (Environment Configuration) in
full; `product-spec.md` §13 (Public Deployment Considerations).

### Files Expected to Change
- `vercel.json` (if any non-default configuration is needed)
- `.env.production` values set directly in the Vercel project dashboard (never committed)
- `README.md` (finalized with live deployment URL, portfolio write-up, and the 5 demo account
  credentials clearly labeled as fictional/demo-only)
- `package.json` (build/deploy scripts finalized, e.g. `postinstall` running `prisma generate`)

### Database Changes
- A production Neon Postgres branch/project is provisioned, separate from the development branch
  used in Phases 2–15.
- `prisma migrate deploy` is run against production for the first time, applying all migrations
  `0001` through the final one from Phase 15 in sequence.
- `prisma db seed` is run against production to populate the `demo-data.md` dataset (10
  investigations, 5 users, fictional personnel/airlines/airports) — appropriate here since this is a
  portfolio deployment meant to be explored by visitors, not a real operational system.

### Tests Required
- A post-deploy smoke test: log in as each of the 5 seeded roles against the live production URL
  and confirm the Dashboard, Investigation List, and one full investigation's Report all render
  correctly.
- Verification that no environment variable or secret is exposed client-side (checked via the
  deployed bundle, not just source).

### Acceptance Criteria
- The application is reachable at a public Vercel URL with no API keys or paid services required to
  run it, satisfying the project's founding constraint.
- All 5 demo roles can log in and exercise a full investigation lifecycle end-to-end on the live
  deployment.
- The GitHub repository's `main` branch is what Vercel deploys from, with preview deployments for
  pull requests per standard Vercel/GitHub integration.
- The Disclaimer Ribbon and every "Investigation Support" label are visibly present and correctly
  worded on the live deployment — a final visual confirmation that the safety/non-authoritative
  requirements survived all the way to production.

### Dependencies
Phases 1–15 (deployment is the final phase; nothing follows it).

---

## Closing Note

This plan resolves both Critical spec-review findings (SR-001, SR-002) within Phase 6, all but one
High finding within the phase where the affected feature is naturally built (SR-003 in Phase 10,
SR-004 in Phase 5, SR-005 in Phase 7, SR-006 in Phase 10, SR-008 in Phase 10, SR-020 in Phase 2),
and defers only SR-010 to Phase 2 explicitly as a schema addition. Every Medium/Low finding is
either closed inline in its natural phase (SR-012, SR-013, SR-014, SR-016, SR-021, SR-022 as noted
above) or consolidated into Phase 15 (SR-009's engine work lands in Phase 11 rather than Phase 15;
SR-011, SR-015, SR-017, SR-018, SR-019, SR-023 land in Phase 15 as infrastructure/hardening
concerns). No phase in this plan should begin with a Critical or High finding it depends on still
unresolved from an earlier phase.

No application code has been written in producing this plan.

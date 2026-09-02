# Product Specification — Aviation Incident Investigation Assistant

> **Note on structure**: this document is organized around the 13 topics required for this
> specification pass. Supporting material (assumptions register, cross-document index) is kept in
> the appendices at the end so the numbered sections map cleanly to those 13 topics.
>
> **Note on section numbering**: this revision reorders and expands the original product spec.
> Other spec files (`functional-requirements.md`, `investigation-workflow.md`, `report-spec.md`,
> `ui-spec.md`) contain a small number of cross-references to the *previous* section numbers (old
> §7 "AI/IT Positioning", old §8 "Disclaimer"). Those references, and the 4-role model those files
> currently describe, are now stale against this revision (which introduces a 5th role,
> **Investigation Manager**, and moves disclaimer/AI-positioning content to §11). This is flagged
> here rather than silently patched, since only `product-spec.md` was in scope for this update —
> see the chat response for a proposed follow-up.

## 1. Product Vision

The Aviation Incident Investigation Assistant is a self-contained web application that guides a user
through the full lifecycle of investigating an aviation occurrence — from initial notification through
data collection, analysis, corrective/preventive action tracking, independent review, and final report
generation.

It is built as a **portfolio-grade demonstration project** showing applied domain modeling (aviation
safety investigation methodology, loosely inspired by ICAO Annex 13 / NTSB-style processes), structured
software engineering practice (spec-driven development), and a responsible pattern for AI-adjacent
"decision-support" tooling that is explicitly **not** dependent on any external AI/API provider and
**never presents itself as an authority** — see §11.

## 2. Target Users

This is a demonstration product; "users" are read in that light:

- **Portfolio reviewers** — recruiters, hiring managers, and engineering peers evaluating the author's
  full-stack, domain-modeling, and product-thinking skills.
- **The author** — as a working demonstration of aviation-safety domain knowledge combined with
  full-stack and applied-AI/IT engineering.
- **Illustrative in-world personas** — the application is designed *as if* used by real aviation
  safety personnel (investigators, safety managers, reviewers), so its workflows and role model read
  as credible, even though no real operational use is intended. See §7 and §11.

Not a target user: anyone seeking a tool for an actual, real-world aviation safety investigation —
see §11.

## 3. Primary Use Cases

1. An **Investigator** logs a newly reported occurrence and works section-by-section through
   occurrence, aircraft, flight, location, persons, witnesses, and evidence data capture.
2. An **Investigation Manager** triages an incoming incident and assigns it to an Investigator, then
   monitors the portfolio for stalled investigations and overdue actions.
3. An **Investigator** uses Investigation Support suggestions (§11) — a suggested classification, a
   potential contributing factor surfaced from similar past incidents, a recommended next 5-Whys
   question — to work faster, while remaining the one who confirms or overrides every suggestion.
4. A **Reviewer**, independent of the investigating team, opens a submitted investigation, reviews it
   end-to-end, and either approves it (closing the incident) or requests changes with comments.
5. An **Investigation Manager** or **Administrator** reviews the dashboard to track corrective and
   preventive action completion, and overdue items, across the whole incident portfolio.
6. An **Administrator** manages user accounts and role assignments.
7. A **Viewer** (an unauthenticated or read-only visitor, e.g. a portfolio reviewer) browses the
   dashboard and a closed sample investigation's report without needing an account.

## 4. Problem Being Solved

Two related problems motivate this project:

- **Domain problem (simulated)**: real investigation tooling is typically expensive, closed,
  enterprise Safety Management System (SMS) software. This project demonstrates that the
  *investigation workflow itself* — structured data capture, systematic root-cause methodology
  (5 Whys), risk-rated hazard tracking, and corrective/preventive action tracking with independent
  review — can be modeled cleanly and delivered as a lightweight, self-hosted web application.
- **Portfolio problem (real)**: it is easy to demonstrate a CRUD app; it is harder to demonstrate
  disciplined requirements work, a credible domain model, *and* a responsible approach to
  "AI-flavored" product features. This project's actual deliverable is proof of that combination —
  including proof that useful decision-support features do not require an external AI vendor, and
  that generated suggestions can be integrated without overstating their authority (§11).

## 5. Project Objectives

- Deliver a working, publicly deployable demonstration covering the entire investigation lifecycle
  named in the project brief (creation through report generation).
- Demonstrate spec-driven development: every non-trivial requirement and decision traceable to a
  spec document before implementation.
- Demonstrate a responsible pattern for AI-adjacent decision support: fast and useful, fully local,
  transparent about being rule-based, and never phrased as an authoritative or regulatory conclusion.
- Demonstrate realistic role-based workflow modeling reflecting genuine organizational separation of
  duties: assignment/oversight (Investigation Manager), execution (Investigator), independent
  sign-off (Reviewer), and system administration (Administrator) are kept as distinct concerns.
- Keep the entire system deployable with zero external API keys or paid services, on modest hosting.

## 6. Scope

### 6.1 In-Scope Functional Areas

- Full incident investigation data model and guided workflow (see `investigation-workflow.md` and
  `data-model.md`): occurrence, aircraft, flight, location/conditions, persons involved, witnesses,
  evidence, immediate actions, classification, hazards, contributing factors, 5 Whys, root causes,
  corrective/preventive actions with ownership and status tracking, review, and reporting.
- Local, seeded, fictional incident data — no connection to real occurrences, real aircraft, or real
  people (§12).
- A local, rule-based **Investigation Support** feature set assisting the investigator — see §11 for
  scope and the mandatory non-authoritative wording policy.
- A dashboard with investigation statistics and charts, computed from live local data.
- A professional, exportable/printable investigation report per incident (see `report-spec.md`).
- Role-based access control across (at least) four roles — Investigator, Investigation Manager,
  Reviewer, Administrator — sufficient to demonstrate the full workflow end-to-end (§8).
- Deployment as a single self-contained container/service suitable for public internet hosting (e.g.
  Render, Railway, Fly.io, a VPS) with no external API dependencies (§13).

### 6.2 Investigation Support Scope

The application's "AI/IT" character is delivered entirely as local, deterministic, explainable logic
(keyword/phrase matching, a fixed risk matrix, local text similarity, templated prompting) — never a
call to an external LLM or AI API, and never labeled as one. Full behavior is specified in §11 and in
`product-spec.md`'s companion files; this is a scope boundary, not an implementation detail: no
feature in this product may depend on an externally-hosted AI service.

### 6.3 Deployment Scope

Single container, embedded local database, local file storage for evidence attachments, environment
variable configuration only. See §13.

## 7. Explicitly Out-of-Scope Functionality

- Integration with real aviation data sources (ADS-B feeds, real ADREP/ECCAIRS taxonomies, real
  aircraft/operator registries).
- Generative-AI / LLM-backed narrative writing, chat, or "ask a question about this incident"
  features — would require an external API key, which is disallowed (§11 explains the alternative
  approach taken).
- Any feature or claim that positions system output as an **official, regulatory, or certified
  investigation finding** — see §11. This is a hard boundary, not a "may add later" item.
- Multi-tenant organizations, billing, or public self-registration.
- Real-time collaboration (concurrent multi-user editing of the same incident record).
- Native mobile apps (the web app is responsive; no dedicated mobile app is built).
- Regulatory submission or interoperability with real safety reporting systems (ECCAIRS, ASRS, etc.).
- Automated virus/malware scanning of uploaded evidence files (would require an external service);
  mitigated instead by strict type/size validation (§12).
- Password-reset-via-email or any outbound email/SMS capability (no external mail/SMS provider).

## 8. User Roles

### 8.1 Role Definitions

At least four roles are required; a fifth (Viewer) is included to support unauthenticated/read-only
public browsing of the portfolio demo without weakening the other roles' separation of duties.

| Role | Description | Real-world analogue |
|---|---|---|
| **Administrator** | System administration: user accounts, role assignment, system-level configuration. Not an investigative authority in itself. | IT/system administrator |
| **Investigation Manager** | Oversees the incident portfolio: triages new occurrences, assigns/reassigns an Investigator to an incident, monitors progress and overdue items across all incidents, may create incidents and edit for oversight purposes. Does **not** perform the independent review sign-off (kept separate from execution, per real SMS practice). | Safety manager / head of investigations |
| **Investigator** | Performs the hands-on data capture and analysis for incidents assigned to them: occurrence through root-cause analysis, and proposes corrective/preventive actions. Submits completed investigations for review. | Safety investigator |
| **Reviewer** | Independent of the investigating team. Reviews a submitted investigation end-to-end and either approves (closing it) or requests changes with comments. Cannot edit source investigation data — preserves independence of the review. | Independent safety reviewer / accountable manager |
| **Viewer** | Read-only. Can browse the dashboard and non-draft incident reports. No account required to reach this experience on the public deployment (see §13). | Public/portfolio visitor |

### 8.2 Permission Matrix

| Capability | Administrator | Investigation Manager | Investigator | Reviewer | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|
| Manage user accounts & roles | ✓ | | | | |
| Create incident | ✓ | ✓ | ✓ | | |
| Assign/reassign Investigator to an incident | ✓ | ✓ | | | |
| Edit incident data sections | ✓ | ✓ | ✓ (own/assigned) | | |
| Run Investigation Support suggestions | ✓ | ✓ | ✓ | | |
| Submit incident for review | ✓ | ✓ | ✓ | | |
| Approve / request changes (review decision) | | | | ✓ | |
| Reopen a closed incident | ✓ | ✓ | | | |
| Delete a draft incident | ✓ | | | | |
| Assign/reassign action item owners | ✓ | ✓ | ✓ (own incidents) | | |
| View dashboard & statistics | ✓ | ✓ | ✓ | ✓ | ✓ |
| View / generate an incident report | ✓ | ✓ | ✓ | ✓ | ✓ (closed only) |
| View incident list & detail | ✓ (all) | ✓ (all) | ✓ (own/assigned) | ✓ (all, for review) | non-draft only |

### 8.3 Authentication — Simplified for This Portfolio Version, Extensible by Design

For this portfolio build, authentication is intentionally simplified (assumption A5, updated below):
seeded demo accounts, one per role, using a plain session-based login (email/username + password,
server-side session, `HttpOnly`/`Secure` cookies). There is no self-registration, no email-based
password reset, and no third-party identity provider — all consistent with the "no external API
keys" constraint.

The architecture must nonetheless keep authentication **swappable**, so a more robust scheme (OAuth/
SSO, MFA, real user self-registration with email verification) could be introduced later without
reshaping the rest of the system:

- All authorization checks (the permission matrix in §8.2) are enforced against an abstract
  `currentUser.role`, resolved once per request by an auth middleware layer — never by ad hoc checks
  scattered through business logic.
- The session/identity mechanism is isolated behind that middleware boundary; replacing
  "seeded-account session login" with "OAuth provider" later is a localized change, not a rewrite.
- The `User` entity (`data-model.md`) already carries the fields a real auth upgrade would need
  (unique email, hashed credential, role) so no data-model migration is implied by a future auth
  upgrade.

## 9. Core Workflows

Full state-machine detail lives in `investigation-workflow.md`; this section is the product-level
narrative of how the roles above move an incident through the system.

1. **Intake & Assignment** — an Investigation Manager (or an Investigator directly, for a simpler
   flow) creates an incident from a minimal initial report. The Investigation Manager assigns an
   Investigator as owner.
2. **Data Collection** — the Investigator works through occurrence, aircraft, flight, location,
   persons, witnesses, evidence, and immediate-action sections at their own pace (guided, non-linear
   stepper).
3. **Classification & Analysis** — the Investigator classifies the occurrence, identifies hazards and
   contributing factors, and works through 5 Whys and root-cause analysis, optionally accelerated by
   Investigation Support suggestions (§11), each requiring explicit human confirmation.
4. **Action Planning** — the Investigator (or Investigation Manager) defines corrective and
   preventive actions, each with an owner and due date, tracked to completion.
5. **Submission & Independent Review** — once minimum completeness is met, the Investigator submits
   the incident for review. A Reviewer, uninvolved in the data capture, approves (closing the
   incident) or requests changes (returning it for further work).
6. **Report Generation** — a professional, print/PDF-ready report can be generated at any point,
   clearly marked draft until the incident is closed.
7. **Portfolio Monitoring** — at any time, Investigation Managers, Administrators, and (in read form)
   Reviewers and Viewers use the dashboard to see aggregate status, severity, and action-completion
   trends across the incident portfolio.

## 10. Success Criteria

- A user can create an incident and be guided, section by section, through every investigation topic
  named in the project brief, without prior knowledge of the methodology.
- The four core roles (plus Viewer) produce visibly different, correctly restricted experiences of
  the same incident — e.g., a Reviewer can approve or reject a submitted incident but cannot edit its
  source data; an Investigation Manager can see cross-incident overdue actions from the dashboard
  without opening each incident individually.
- Every Investigation Support suggestion is visually distinguishable from confirmed data and requires
  an explicit human action before it is treated as part of the investigation record (§11).
- A completed, closed incident produces a coherent, professional, print/PDF-ready investigation
  report with no missing or silently-skipped sections.
- The dashboard gives an at-a-glance statistical view of the (seeded) incident portfolio, computed
  from live data.
- The application deploys to Vercel from a `git push` with no environment variables required beyond
  `security-spec.md` §8's fixed list (database connection strings, session secret, canonical URL) —
  no API keys of any kind.
- The specs and codebase are clean enough to walk a technical reviewer through the design in an
  interview setting.

## 11. Safety and Disclaimer Requirements

This section is binding on every other spec and on implementation; it is the most important
correctness requirement in the product, ahead of any individual feature.

### 11.1 Core Rule: Never Present Generated Content as an Authoritative Determination

**The application must never present generated or suggested content — classification, contributing
factors, root-cause candidates, or follow-up prompts — as an official, regulatory, or otherwise
authoritative conclusion.** All such content is investigator-facing *support*, always subject to
human review, override, and confirmation before it becomes part of the investigation record.

This is enforced through mandatory, consistent product terminology. Generated/suggested content must
always be introduced with one of the following labels (not paraphrased, not replaced with stronger
language such as "Finding," "Determination," "Cause," or "Official Result"):

| Label | Used for |
|---|---|
| **"Investigation Support"** | The umbrella name for the local rule-based assistance feature area as a whole (product-facing branding — replaces any "AI" or "AI-powered" labeling in the UI). |
| **"Suggested Classification"** | The rule engine's proposed occurrence category/severity, prior to investigator confirmation. |
| **"Potential Contributing Factor"** | Any system-surfaced candidate contributing factor (e.g., derived from keyword analysis or similar-past-incident matching), prior to investigator confirmation. |
| **"Recommended Follow-up"** | Any system-suggested next step, such as a proposed next 5-Whys question or a suggested action-item starting point. |

Implementation rules that follow from this:

- Every piece of generated content is visually tagged (badge/label) with its exact term from the
  table above, distinct in styling from confirmed investigator-entered data.
- No generated content is persisted as authoritative investigation data until an explicit human
  confirmation action is taken (already modeled in `data-model.md` via `Occurrence
  .wasSuggestionAccepted`; the same confirm-before-persist pattern applies to any other Investigation
  Support output introduced later, e.g. potential contributing factors or recommended follow-ups).
- The final investigation report (`report-spec.md`) must show, for every accepted suggestion, that it
  was reviewed and confirmed by a named human investigator — never presenting it as system-authored
  fact.
- No UI surface, report section, or copy may use "Official Finding," "Determination," "Certified,"
  "Regulatory Conclusion," or equivalent language in connection with any system-generated content.

`functional-requirements.md` and `ui-spec.md` currently use only "suggested classification" wording;
per the numbering note at the top of this document, they should be updated in a follow-up pass to
adopt the full terminology table above (including "Investigation Support," "Potential Contributing
Factor," and "Recommended Follow-up" for the corresponding features).

### 11.2 Persistent Disclaimer

The application displays a persistent banner/footer on every page:

> *"This application uses simulated, fictional aviation incident data for demonstration purposes
> only. It is not affiliated with any aviation authority and must not be used for real safety
> investigations or regulatory reporting."*

The generated investigation report additionally states, on its cover page, that it is not an official
accident/incident investigation report under any real regulatory framework (e.g. ICAO Annex 13,
NTSB, EASA), and that any accepted Investigation Support content was human-reviewed (§11.1).

### 11.3 Data Realism

No real aircraft registrations, real airline/operator names, or real people are used anywhere in seed
data or documentation examples (see §12, assumption A8).

### 11.4 Taxonomy Regulator-Neutrality Disclaimer

The occurrence classification taxonomy (category, subcategory, severity, risk, and priority scales —
defined fully in `data-model.md` §6.6) is an **internally-defined structure created for this
application**, not an adoption of any external body's official classification system. The
application must never claim, imply, or present this taxonomy as the official classification scheme
of ICAO, a National Aviation Authority, IATA, or any other regulatory or industry body, unless a
specific value is explicitly and separately labeled as such in that exact context. Where a
category/subcategory name resembles established safety-reporting terminology (e.g. "Runway
Excursion," "Controlled Flight Into Terrain"), that reflects vocabulary in common industry use, not
regulatory adoption. This rule is binding on all UI copy, report copy, and documentation that
presents the taxonomy — the same standard already applied to Investigation Support wording in §11.1.

### 11.5 Risk Assessment Model Disclaimer

The application's risk scoring (Likelihood × Severity, configurable risk bands, and the derived
Investigation Priority — defined fully in `data-model.md` §6) is a **simplified, configurable,
educational risk model** built for this application's demonstration purposes. The application must
never claim, imply, or present this model as an official regulatory risk assessment methodology —
including but not limited to ICAO Safety Risk Management, an FAA or EASA Safety Management System
risk matrix, or any national aviation authority's prescribed model — unless a specific value is
explicitly and separately labeled as such. This warning must be visible wherever risk scores,
Initial/Residual risk, or risk bands are displayed (`ui-spec.md` §11), not only in a general
disclaimer footer. This rule is binding in the same way as §11.1 and §11.4.

### 11.6 Root Cause Non-Declaration Principle

Distinct from §11.1 (which governs *system-generated* Investigation Support content), this rule
governs **investigator-authored** analytical conclusions: the application must never present a
recorded root cause as an established, proven fact, regardless of who wrote it. Root cause analysis
is inherently interpretive; a human investigator's conclusion is their professional assessment, not
a court-established or scientifically-proven determination, and the product must not imply
otherwise. This is enforced through mandatory terminology and structure:

- A recorded conclusion is always labeled **"Potential Root Cause"** in the UI and report — never
  "Root Cause," "Confirmed Cause," or "Determination."
- The surrounding analysis (confidence level, notes, evidentiary basis) is presented under an
  **"Investigator Assessment"** heading, framing the whole conclusion as a professional judgment
  rather than an established fact.
- Evidence cited in support of a conclusion is labeled **"Supporting Evidence"** and is a required
  part of the record — a root cause may not be recorded as a bare assertion; it must always state
  its evidentiary basis (or explicitly acknowledge insufficient evidence) and the investigator's own
  confidence level, per `data-model.md` §6.8.
- This principle applies to every recorded root cause, not only ones an investigator flags as
  uncertain — even a "High confidence" root cause is still presented as an assessment, not a fact.

## 12. Data Privacy Considerations

All data in the system is fictional (§11.3), so no real personal data is ever collected — but the
system is designed as though it handled sensitive investigation data, both because that is the
realistic domain behavior and because it demonstrates sound practice:

- Witness contact information and statement content are treated as restricted/sensitive in the UI and
  in the generated report (a muted, clearly-labeled section), matching real investigation-report
  handling conventions even though the underlying data carries no real risk.
- Passwords are stored hashed (never in plain text); session cookies are `HttpOnly` and `Secure` in
  production.
- No data is shared with, or transmitted to, any third party — a direct consequence of the
  no-external-API-calls constraint (§6.2), not just a policy statement.
- No third-party analytics or tracking scripts are included, so no visitor behavioral data leaves the
  system either.
- Uploaded evidence files are validated by type and size only; no external virus/malware scanning
  service is used (§7), which is an accepted limitation for a portfolio deployment and is documented
  as such rather than silently omitted.
- Because this is a public demo, an Administrator-only reset/reseed capability exists to restore the
  fictional demo dataset to a known-good state (leverages the JSON export/import capability defined
  in `functional-requirements.md`), so that public read/write exploration by visitors does not
  permanently degrade the demo for others.

## 13. Public Deployment Considerations

- **One Vercel project, one free-tier Neon database, no other external services**: the app deploys
  as a single Next.js project (frontend and backend unified, no separate container/API service),
  configured entirely through environment variables, with no API keys of any kind (ties to
  NFR-1.1–1.4, NFR-8.1–8.2).
- **Demo credential exposure is a deliberate, documented trade-off**: because there is no
  self-registration, demo credentials for each role are shown on the login screen so any visitor can
  explore the full role-based workflow (`ui-spec.md` UI-2). This makes periodic dataset reset
  important (§12) and means the demo must never contain real or sensitive data by construction.
- **Search-engine visibility**: the deployment includes `robots.txt`/meta `noindex` directives so the
  fictional demo is not indexed by search engines in a way that could be mistaken for a real
  aviation-incident data source. The application title and footer are clearly labeled "Demo /
  Portfolio Project" for the same reason.
- **Abuse protection**: basic rate limiting on the login endpoint and on write endpoints generally,
  since the deployment is open to public traffic without a registration gate (ties to NFR-4.6).
- **Resource sizing**: *(superseded by `technical-architecture.md` §1/§5.1)* Vercel's Hobby tier
  plus Neon's free-tier Postgres is sufficient at demo scale (tens to low hundreds of incidents).
  The system is explicitly not designed for high-concurrency, multi-tenant production load (ties to
  NFR §11 non-goals).
- **Operational health**: a lightweight `/api/health` endpoint supports uptime checks by the hosting
  platform (ties to NFR-8.3).

## Appendix A: Assumptions Register

Per project rules, any requirement not explicitly specified is resolved here with a reasonable,
documented assumption rather than left as hidden/invented behavior. IDs are stable across spec
revisions so other documents can reference them; A5 and A8 are updated in place by this revision,
and new IDs (A11+) are added rather than renumbering existing ones.

| # | Area | Assumption | Rationale |
|---|------|------------|-----------|
| A1 | Frontend stack | *(superseded by `technical-architecture.md` §1)* Next.js (App Router), React + TypeScript — not a standalone Vite SPA | Unifies frontend and backend in one deployable Vercel project; industry-standard, strong portfolio signal |
| A2 | Backend stack | *(superseded — see A1)* Next.js Server Actions and Route Handlers, TypeScript — no separate Express/REST service | Pairs naturally with the Next.js frontend; no CORS/separate-deploy overhead |
| A3 | Database | *(superseded — see A1)* PostgreSQL via Neon (free serverless tier), not SQLite | Zero-cost managed Postgres with native Vercel integration; satisfies "no paid/managed external service" the same way the original SQLite choice intended |
| A4 | "AI" feature interpretation | Local, deterministic, rule-based decision-support (no LLM, no external API), branded in-product as "Investigation Support" | User explicitly forbids external API keys; see §11 for the mandatory wording policy |
| A5 | Authentication | Simplified seeded-account, session-based login across 5 roles (Administrator, Investigation Manager, Investigator, Reviewer, Viewer), with authorization enforced behind an abstract role-check middleware so a stronger auth mechanism can be substituted later without touching business logic | Needed to demonstrate role-based, separation-of-duties workflow on a public deployment; explicitly required to remain extensible per this revision |
| A6 | File/evidence attachments | *(corrected by `technical-architecture.md` §9, a **required** correction, not optional — local disk does not function on Vercel's serverless filesystem)* Stored as `Bytes` columns in Postgres, referenced by an opaque storage key, accessed only through a `StorageProvider` abstraction; seed/demo data uses labeled simulated attachments rather than fabricated binary content (`data-model.md` §6.10) | No external object storage (e.g. S3) permitted without API keys; the abstraction keeps a future real-storage backend a configuration change, not a rewrite |
| A7 | Report export | Print-optimized HTML report (browser "Save as PDF") as primary export; server-side PDF generation noted as optional future enhancement | Avoids fragile headless-browser deployment dependencies (e.g. Puppeteer) on constrained hosts |
| A8 | Data realism | All seed data is fictional; aircraft registrations, names, and locations are invented and clearly non-real; no real aviation, regulatory, or personal data anywhere in the system | Required by project rules (simulated/fictional data only) and by §11's authoritativeness boundary |
| A9 | Deployment target | *(superseded — see A1)* Vercel (zero-config Next.js hosting); no Docker/container image, no persistent volume — the database lives in Neon, not on the app server | Matches "no external services", "public internet deployable" |
| A10 | Localization | English only, single timezone display (UTC, with local-time field alongside) | Keeps scope bounded; aviation incident timestamps are conventionally recorded in UTC |
| A11 | Role model | Five roles: Administrator, Investigation Manager, Investigator, Reviewer, Viewer — Investigation Manager and Reviewer are kept distinct to model real separation of duties (assignment/oversight vs. independent sign-off) | Explicit requirement of this revision; supersedes the earlier 4-role (Admin/Investigator/Reviewer/Viewer) model used in `functional-requirements.md` pending its follow-up update |
| A12 | Suggestion terminology | All generated/assisted content must use exactly one of: "Investigation Support," "Suggested Classification," "Potential Contributing Factor," "Recommended Follow-up" — never "Finding," "Determination," or similar authoritative language | Explicit requirement of this revision; see §11.1 |
| A13 | Public demo data integrity | Administrator-only reset/reseed capability restores fictional demo data to a known-good state | Demo credentials are intentionally public (UI-2); dataset drift from visitor edits must be recoverable |
| A14 | Search indexing | `robots.txt` / meta `noindex` applied to the public deployment | Prevents the fictional demo data from being indexed as if it were a real aviation data source |

## Appendix B: Related Documents

- `functional-requirements.md`
- `non-functional-requirements.md`
- `data-model.md`
- `ui-spec.md`
- `investigation-workflow.md`
- `report-spec.md`

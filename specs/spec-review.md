# Specification Review — Aviation Incident Investigation Assistant

## 1. Methodology

Every file in `/specs` was read in full for this review: `product-spec.md`,
`functional-requirements.md`, `non-functional-requirements.md`, `data-model.md`, `ui-spec.md`,
`investigation-workflow.md`, `report-spec.md`, `technical-architecture.md`, `assistance-engine.md`,
`demo-data.md`, `edge-cases.md`, `security-spec.md`, `testing-spec.md` (13 files). Each was checked
against the 13 categories requested: contradictions, missing requirements, duplicate requirements,
ambiguous requirements, missing validation, missing edge cases, missing error handling, missing
security requirements, missing database relationships, missing workflow transitions, features
present in one spec but absent from another, requirements unimplementable with the selected
architecture, and accidental dependency on external APIs.

Many individual files already carry their own "Consistency Notes" sections flagging follow-up work
against other files — this review does not simply repeat those (though it verifies and consolidates
the ones still genuinely outstanding). Its main value is the issues that **no single file's own
consistency-notes section could have caught**, because they only become visible by cross-referencing
two or more documents directly against each other, line by line.

## 2. Verdict

**Not yet internally consistent enough to begin implementation without a remediation pass first**,
per the explicit instruction accompanying this review. The spec set is, on the whole, unusually
mature and cross-referenced — the large majority of issues found are polish-level (stale cross-section
references, one unresolved wording ambiguity, a couple of missing validation rules). However, **two
Critical issues (§3, SR-001 and SR-002) mean that implementing `functional-requirements.md` and
`data-model.md` exactly as currently written would produce evidence storage that does not function
on the mandated Vercel architecture.** These two must be resolved before implementation starts, not
discovered during it. A handful of High-priority issues (SR-003 through SR-007) should also be
resolved first, since they affect core status handling and an entire missing feature area
(Investigation Findings has no functional requirements at all). Medium/Low issues can reasonably be
resolved during implementation, tracked, but should not block starting.

## 3. Findings

Issues are grouped under the review category they most directly represent; several genuinely span
more than one category, and are cross-referenced accordingly rather than duplicated.

### 3.1 Contradictions

#### SR-001 — Storage provider contradiction: FR-023/FR-055 specify an implementation the architecture spec says does not work
- **Description**: `functional-requirements.md` FR-023's Outputs state the attachment is saved "via
  the active `StorageProvider` (**v1: `LocalDiskStorageProvider`, writing under
  `DATA_DIR/attachments`**, assumption A6)," and FR-055's edge case says deleting a draft
  "also removes those files **from disk**." But `technical-architecture.md` §9 explicitly states:
  *"That implementation does not work on Vercel: Vercel's serverless functions run on an ephemeral,
  effectively read-only filesystem... This is exactly the kind of deployment-target conflict this
  document exists to catch before implementation starts,"* and mandates a `PostgresBlobStorageProvider`
  instead (§9, TA-1, "a required correction, not an optional one"). `functional-requirements.md` was
  never revisited after that correction was made, so it still names the disproven approach as
  current v1 behavior.
- **Affected specifications**: `functional-requirements.md` (FR-023, FR-055), `technical-architecture.md`
  (§9, TA-1).
- **Recommended resolution**: Update FR-023's Outputs to reference the `PostgresBlobStorageProvider`
  and remove the `DATA_DIR`/"writing under" language; update FR-055's edge case to say attachment
  content is removed from the database, not "from disk." Audit the rest of
  `functional-requirements.md` for any other `DATA_DIR`/disk references missed by the same gap.
- **Priority**: **Critical** — this is a requirement that, implemented literally, would not run on
  the mandated deployment target.

#### SR-002 — `Attachment` entity is missing the field the mandated storage architecture requires
- **Description**: `technical-architecture.md` §9/TA-1 mandates storing attachment bytes in a
  Postgres `Bytes` column directly on `Attachment`. `data-model.md` §3.10's `Attachment` entity was
  never updated to add this column — it still lists only `fileName`, `mimeType`, `fileSizeBytes`,
  `storagePath`, `isSimulated`, `uploadedByUserId`, `uploadedAt`. Under the mandated architecture,
  there is currently no field anywhere in the data model to hold the actual file content.
- **Affected specifications**: `data-model.md` (§3.10), `technical-architecture.md` (§9).
- **Recommended resolution**: Add a `fileBytes BYTEA` (or equivalent `Bytes`) field to `Attachment`
  in `data-model.md` §3.10, and clarify `storagePath`'s role given it (e.g., repurposed as a
  human-readable/legacy reference, or removed if genuinely redundant under the Bytes-column design).
- **Priority**: **Critical** — directly blocks implementing evidence storage as specified.

#### SR-003 — `functional-requirements.md` still uses the retired 5-state model and entity names
- **Description**: `functional-requirements.md` §0.3 states the status model as `DRAFT → OPEN →
  UNDER_REVIEW → CLOSED` with `CHANGES_REQUESTED`, and FR-011, FR-049 through FR-064 use these names
  throughout (e.g., FR-051: *"Outputs: `ReviewLog` entry... investigation status → `CLOSED`"*;
  FR-053: *"`Incident.status = CLOSED`"*). Every other spec file (`data-model.md`,
  `investigation-workflow.md`, `ui-spec.md`, `report-spec.md`, `technical-architecture.md`,
  `edge-cases.md`, `assistance-engine.md`, `demo-data.md`) uses the current 6-state model (`Draft`,
  `Open`, `UnderInvestigation`, `Analysis`, `Review`, `Closed`, no stored `CHANGES_REQUESTED`) and the
  renamed entities (`Investigation`, `InvestigationReview`). This has been self-flagged as an
  outstanding item at the end of at least seven other spec files across multiple revisions, but never
  actually corrected.
- **Affected specifications**: `functional-requirements.md` (§0.3, FR-011, FR-049–FR-064 — primary);
  referenced as outstanding by `data-model.md`, `investigation-workflow.md`, `ui-spec.md`,
  `technical-architecture.md`, `assistance-engine.md`, `edge-cases.md`, `security-spec.md`,
  `testing-spec.md`.
- **Recommended resolution**: A dedicated pass through `functional-requirements.md` §0.3 and every
  FR from FR-049 onward, replacing the 5-state names/entity names with the current 6-state
  names/entities, and removing `CHANGES_REQUESTED` in favor of the `Review → Analysis` transition
  already defined in `investigation-workflow.md` §6.
- **Priority**: **High** — this is the single most-referenced outstanding item across the entire
  spec set and affects the review/closure workflow's core requirements.

#### SR-004 — Duplicate, drifted definition of the outcome-severity scale
- **Description**: `data-model.md` DM-12 explicitly redefined `RiskSeverity` from
  `Negligible/Minor/Major/Hazardous/Catastrophic` to `Negligible/Minor/Moderate/Major/Catastrophic`
  (replacing `Hazardous` with `Moderate` at a different position) during the risk-assessment-module
  revision. `functional-requirements.md` FR-066 — written in an earlier revision and never revisited
  — still lists Actual/Potential Outcome Severity as *"(`Negligible`/`Minor`/`Major`/`Hazardous`/
  `Catastrophic`)"*, the old value set. This is the same concept (outcome severity) independently
  specified in two places that have since diverged — exactly the pattern the "duplicate
  requirements" review category exists to catch.
- **Affected specifications**: `functional-requirements.md` (FR-066), `data-model.md` (§5, §6.2,
  DM-12).
- **Recommended resolution**: Update FR-066's Inputs line to read `Negligible/Minor/Moderate/Major
  /Catastrophic`, matching the canonical `RiskSeverity` enum.
- **Priority**: **High** — a literal enum-value mismatch that would produce a validation schema
  inconsistent with the database's `CHECK`/enum constraint if implemented as currently written.

#### SR-005 — `Action.hazardId` reference in FR-030 predates the CorrectiveAction/PreventiveAction split
- **Description**: FR-030 (Remove Hazard)'s Outputs state: *"any `ContributingFactorHazardLink` or
  `Action.hazardId` references are cleared."* There is no unified `Action` table — it was split into
  `CorrectiveAction` and `PreventiveAction` (data-model.md DM-2), each now with its own `hazardId`
  (both tables, per DM-14's reciprocal-link addition). The corrective/preventive redesign pass's own
  revision note for Module 18 explicitly says it fixed "a stale reference to the pre-DM-2 unified
  `Action` table" in FR-040–FR-043 — but FR-030, in a different module (14), was missed by that same
  fix.
- **Affected specifications**: `functional-requirements.md` (FR-030), `data-model.md` (§3.19–§3.20).
- **Recommended resolution**: Update FR-030 to read "any `ContributingFactorHazardLink`,
  `CorrectiveAction.hazardId`, or `PreventiveAction.hazardId` references are cleared."
- **Priority**: **Medium** — narrow in scope, but the exact class of drift already found and fixed
  once elsewhere in the same document.

#### SR-006 — Broken section cross-references from `functional-requirements.md` into `report-spec.md`
- **Description**: FR-062 cites *"the report's Appendix C (`report-spec.md` §3.19)"* and FR-063
  cites *"the report (`report-spec.md` §3.18)."* `report-spec.md`'s current structure (after its full
  rewrite) places Appendix C under §6, and Reviewer Comments under §5.18 — §3 in the current
  `report-spec.md` is a short section describing the FACTS/ASSESSMENT/RECOMMENDATIONS banner scheme
  and has no subsections numbered §3.18 or §3.19. These cross-references were valid against an
  earlier `report-spec.md` revision and became stale when that document was renumbered.
- **Affected specifications**: `functional-requirements.md` (FR-062, FR-063), `report-spec.md` (§5.18,
  §6).
- **Recommended resolution**: Update the citations to `report-spec.md` §5.18 (FR-063) and §6,
  Appendix C (FR-062).
- **Priority**: **Medium** — misleading for anyone using the FRs as a map into the report structure,
  though not implementation-blocking on its own.

#### SR-007 — Widespread stale "report-spec.md still needs updating" trailer notes
- **Description**: At least six files — `ui-spec.md` (Appendix B), `data-model.md` (§12),
  `technical-architecture.md` (§15), `assistance-engine.md` (§8), `edge-cases.md` (§5), and
  `security-spec.md` (§17), plus `testing-spec.md` (§7) — each carry a boilerplate trailing note
  along the lines of *"`report-spec.md` does not yet have a 'Findings' section reflecting the
  `InvestigationFinding` entity... from the last N revisions."* `report-spec.md` was subsequently
  fully rewritten specifically to close this gap (its own header states: *"This revision replaces the
  previous report specification in full... brings the report current with the classification, risk,
  root-cause, action, and evidence redesigns"*). None of the six-plus files carrying the old trailer
  note were updated to reflect that `report-spec.md` has since caught up.
- **Affected specifications**: `ui-spec.md`, `data-model.md`, `technical-architecture.md`,
  `assistance-engine.md`, `edge-cases.md`, `security-spec.md`, `testing-spec.md`.
- **Recommended resolution**: A single sweep removing or updating this specific trailer note
  everywhere it appears verbatim — it is the same root cause repeated seven times, so it should be
  fixed as one coordinated edit rather than seven independent ones.
- **Priority**: **Medium** — purely a documentation-currency issue (the underlying content gap it
  refers to is actually closed), but repeated across enough files that it risks misleading a future
  reader into re-doing work that's already done.

### 3.2 Missing Requirements / Features Present in One Spec but Absent from Another

#### SR-008 — Investigation Findings has no functional requirements at all
- **Description**: `data-model.md` §3.21 fully specifies the `InvestigationFinding` entity, and
  `ui-spec.md` §10 fully specifies its own dedicated page (add/edit form, numbered card list,
  citation picker, remove-with-renumbering behavior). `functional-requirements.md`, however, has
  **no module or FR for Investigation Findings at all** — its 25-module index runs from "Evidence
  Management" straight to "Immediate Actions" with nothing for Findings. The only related
  requirement, FR-071 ("Link Evidence to a Finding"), presumes Findings already exist; there is no
  FR anywhere for creating, editing, numbering, or removing one. This is a fully-designed feature,
  present in two specs, entirely absent from the one that is supposed to enumerate every capability.
- **Affected specifications**: `functional-requirements.md` (missing module), `data-model.md` (§3.21),
  `ui-spec.md` (§10).
- **Recommended resolution**: Add a new module to `functional-requirements.md` (e.g. "Investigation
  Findings," next available FR IDs) covering Add/Edit Finding, Remove Finding (with contiguous
  renumbering), and citation linking to Hazards/Contributing Factors/Root Causes — mirroring the
  detail level already given to every other module.
- **Priority**: **High** — an entire feature area with no functional specification at all.

#### SR-009 — Six Assistance Engine capabilities have no functional requirements
- **Description**: `assistance-engine.md` §4 fully designs Investigation Checklist Suggestions,
  Missing-Information Warnings, Investigation Completeness Score, Risk Warnings, Corrective-Action
  Reminders, and Report Quality Checks — each with inputs, rules, outputs, and edge cases. None of
  the six has a corresponding FR in `functional-requirements.md`. This is self-flagged in
  `assistance-engine.md` §8 ("next available IDs are FR-072 onward") but remains genuinely open.
- **Affected specifications**: `functional-requirements.md` (missing FRs), `assistance-engine.md`
  (§4, §8).
- **Recommended resolution**: Add FR-072 through FR-077 (or a dedicated new module) covering the six
  capabilities, cross-referencing `assistance-engine.md` §4 for full rule detail rather than
  duplicating it.
- **Priority**: **Medium** — already self-flagged with a clear remediation path; not blocking core
  workflow implementation, since these are all Category A advisory features layered on top of
  already-specified data.

#### SR-010 — `LoginAttempt`/`UploadAttempt` referenced but never defined as data-model entities
- **Description**: `technical-architecture.md` §8 and `security-spec.md` §14 both describe rate
  limiting via *"a small `LoginAttempt`/`UploadAttempt` tracking table in Postgres"* — named as if
  already part of the schema. `data-model.md` has no such entity anywhere: not in the ERD, not in
  the entity list, no fields, no constraints. This is also a **missing database relationship** (§3.4
  of this review) and a **missing security requirement** in the sense that the rate-limiting
  mechanism security-spec.md relies on has no schema to actually implement it against.
- **Affected specifications**: `data-model.md` (missing entity), `technical-architecture.md` (§8),
  `security-spec.md` (§14, §17 — which itself already flags this as needing "formalized as a small
  addition to `data-model.md`").
- **Recommended resolution**: Add a `LoginAttempt` (and/or combined `SecurityAttempt`) entity to
  `data-model.md` with fields such as `id`, `emailOrIdentifier`, `ipAddress`, `attemptType`
  (Login/Upload), `succeeded`, `attemptedAt`, plus the index needed to efficiently count recent
  attempts per identifier.
- **Priority**: **High** — a security control described in two files as if it already has a schema,
  when it does not.

### 3.3 Ambiguous Requirements

#### SR-011 — Unreconciled "Continue as Viewer" anonymous-access mechanism
- **Description**: `ui-spec.md` §1 (Login/Welcome Page) offers a pre-authentication *"Continue as
  Viewer"* link for unauthenticated read-only access, consistent with `product-spec.md` §13's stated
  intent that "no account [is] required" for the Viewer experience. But
  `technical-architecture.md` §4.3/§4.4 describes authorization as uniformly built around a
  `requireRole(session, allowedRoles[])` check against an Auth.js session, and
  `demo-data.md` §1.4 lists "Guest Viewer" as one of the five **seeded, logged-in** demo accounts.
  No document reconciles these: does "Continue as Viewer" create/use a real (if generic) session for
  the seeded Guest Viewer account, or is there a genuinely session-less code path that `requireRole`
  must special-case? The mechanism is described from two different angles (a UI shortcut vs. a
  seeded login account) that were never connected.
- **Affected specifications**: `ui-spec.md` (§1), `product-spec.md` (§13), `technical-architecture.md`
  (§4.3–§4.4), `demo-data.md` (§1.4).
- **Recommended resolution**: State explicitly (most likely in `technical-architecture.md` §4.4)
  that "Continue as Viewer" transparently authenticates as the seeded Guest Viewer account rather
  than bypassing authentication — this is almost certainly the intended design given the rest of the
  architecture, but it is currently only implied, never stated.
- **Priority**: **Medium** — affects how `requireRole`/session middleware needs to be designed; worth
  resolving before auth implementation begins.

#### SR-012 — "Reporter" field: free text, a user-picker, or both, left unresolved between two files
- **Description**: `functional-requirements.md` FR-005 describes the Reporter input as *"defaults to
  current user, editable free text **or** user-picker"* — an unresolved either/or. `ui-spec.md` §4
  (New Investigation page) resolves this differently and silently, describing only *"Reporter
  (defaults to current user, editable text)"* — dropping the user-picker option entirely without
  cross-referencing or acknowledging the FR's ambiguity.
- **Affected specifications**: `functional-requirements.md` (FR-005), `ui-spec.md` (§4).
- **Recommended resolution**: Update FR-005 to match `ui-spec.md`'s resolution (free text only) if
  that is the intended final design, removing the "or user-picker" alternative — or, if a picker is
  genuinely still wanted, update `ui-spec.md` §4 to include it.
- **Priority**: **Medium** — small in scope, but a clean example of the same field being resolved two
  different ways in two files with no cross-reference.

#### SR-013 — Reference number year-rollover behavior implied, not specified
- **Description**: `data-model.md` §3.2 defines `referenceNumber` format as `INC-YYYY-NNNN`,
  "sequential per year," and `testing-spec.md` TS-005 tests concurrency "in the same calendar year" —
  but no document specifies the exact rollover mechanism at a year boundary (does the counter reset
  to `0001` on January 1st server time? Is that race-safe the same way same-year concurrent creation
  is explicitly tested to be?).
- **Affected specifications**: `data-model.md` (§3.2), `functional-requirements.md` (FR-005),
  `testing-spec.md` (TS-005).
- **Recommended resolution**: Add an explicit sentence to `data-model.md` §3.2 or FR-005 describing
  the rollover rule (e.g., "the per-year sequence is derived from a database sequence keyed by year;
  the first investigation created in a new year begins that year's sequence at 0001") and add a
  corresponding test scenario for the boundary case itself.
- **Priority**: **Low** — a real gap, but narrow and unlikely to matter until the application has run
  for more than one calendar year.

### 3.4 Missing Validation

#### SR-014 — Text field maximum lengths not folded back into `data-model.md`
- **Description**: `edge-cases.md` EC-21 defines specific tiered maximum lengths for free-text fields
  (10,000 characters for narrative/analytical text, 5,000 for notes/comments) as a genuine gap-closer
  — but this was, by its own admission, scoped only to `edge-cases.md`. `data-model.md`'s per-field
  Validation columns for the affected `TEXT` fields (`narrativeDescription`, `supportingEvidence`,
  `investigatorNotes`, etc.) still show only minimums, with no maximum recorded anywhere in the
  canonical schema document.
- **Affected specifications**: `data-model.md` (multiple `TEXT` field Validation columns),
  `edge-cases.md` (EC-21, already self-flagged as needing this follow-up in its own §5).
- **Recommended resolution**: Add the specific maximum to each affected field's Validation column in
  `data-model.md`, rather than leaving the rule to exist only in prose in `edge-cases.md`.
- **Priority**: **Medium** — a security-relevant validation gap (unbounded resource consumption) that
  has been correctly identified but not yet propagated into the authoritative schema document.

#### SR-015 — `RiskBandConfiguration.colorHint` has no format constraint
- **Description**: `data-model.md` §6.4 describes `colorHint` as *"UI color token (e.g.
  `green`/`amber`/`orange`/`red`)"* but places no validation rule restricting it to that set (or any
  fixed set). FR-069 lets an Administrator edit this field directly. Without a constraint, an
  Administrator could enter an arbitrary string the UI's badge components have no defined rendering
  for.
- **Affected specifications**: `data-model.md` (§6.4), `functional-requirements.md` (FR-069).
- **Recommended resolution**: Add a `CHECK`/enum constraint (or a fixed dropdown in the FR-069 UI) restricting
  `colorHint` to the specific tokens the shared badge components actually implement.
- **Priority**: **Low** — a real but narrow gap, affecting only Administrator-facing configuration,
  not end-user data.

#### SR-016 — No validation prevents `assignedInvestigatorUserId`'s referenced User from later losing eligibility
- **Description**: `data-model.md` DM-9 states the constraint "`assignedInvestigatorUserId` must
  reference a User whose role is Investigator" is enforced at the application layer — but only at
  assignment time (FR-006). Nothing prevents that invariant from being silently violated afterward if
  the assigned user's role changes (e.g., promoted to Investigation Manager) or their account is
  deactivated. This is the same class of gap `edge-cases.md` EC-14 closed for Corrective/Preventive
  Action owners (adding a "deactivated owner" UI flag and reassignment expectation) but never
  extended to investigator assignment specifically.
- **Affected specifications**: `data-model.md` (§3.2, DM-9), `functional-requirements.md` (FR-006),
  `edge-cases.md` (EC-14, EC-25 — adjacent but not covering this exact case).
- **Recommended resolution**: Add an edge case (or extend EC-14/EC-25) explicitly covering an assigned
  Investigator whose role changes or account is deactivated mid-investigation, with the same
  "visible flag + expected reassignment" pattern already used for action owners.
- **Priority**: **Medium** — a genuine, previously unaddressed data-integrity/UX gap surfaced only by
  cross-referencing two already-existing edge cases against a third, un-covered scenario.

### 3.5 Missing Error Handling

#### SR-017 — No concurrency rule specified for `RiskBandConfiguration` edits
- **Description**: `non-functional-requirements.md` §11 states the general optimistic-concurrency
  principle ("last write wins with an `updatedAt` check") only in the context of per-investigation
  edits. `RiskBandConfiguration` is a global, non-investigation-scoped table that FR-069 allows an
  Administrator to edit as a set; no document addresses what happens if two Administrators attempt to
  save conflicting band configurations simultaneously.
- **Affected specifications**: `non-functional-requirements.md` (§11), `functional-requirements.md`
  (FR-069), `data-model.md` (§6.4).
- **Recommended resolution**: Either extend the general optimistic-concurrency principle explicitly
  to cover global configuration tables, or state that `RiskBandConfiguration` edits use a simple
  last-write-wins-without-a-conflict-check policy (acceptable given how rarely this table would be
  edited, but should be a stated decision, not a silent gap).
- **Priority**: **Low** — a narrow, low-frequency scenario, but currently entirely unaddressed.

#### SR-018 — No behavior specified for a failed `prisma migrate deploy` during release
- **Description**: `technical-architecture.md` §10 specifies that migrations run "as an explicit step
  before promoting a production deployment," but does not address what happens if that step itself
  fails (e.g., a migration that cannot apply cleanly against existing data) — whether the deployment
  is automatically blocked, rolled back, or requires manual intervention.
- **Affected specifications**: `technical-architecture.md` (§10).
- **Recommended resolution**: Add a sentence stating the expected behavior on migration failure
  (typically: the deploy hook fails, the new deployment is never promoted, and the previous
  deployment continues serving traffic unaffected — Vercel's standard behavior for a failed build/
  release step, worth stating explicitly rather than assuming).
- **Priority**: **Low** — an operational/DevOps edge case rather than an application-logic one, but
  still a genuine unaddressed failure mode.

### 3.6 Missing Security Requirements

#### SR-019 — No password strength policy or session timeout policy specified
- **Description**: `security-spec.md` is otherwise thorough, but two common security requirements are
  absent from the entire spec set: (1) no minimum password strength/complexity rule for the seeded
  demo accounts or for any future self-service credential change, and (2) no session idle-timeout or
  absolute-lifetime policy for Auth.js database sessions — it is not stated whether a session remains
  valid indefinitely until explicit logout, or expires after some period.
- **Affected specifications**: `security-spec.md` (§5, Authentication Architecture — where these
  would naturally belong), `data-model.md` (§3.1, `User.passwordHash`).
- **Recommended resolution**: Add a minimum password length/complexity note (low stakes given there
  is no self-registration, but still worth stating for the seed script and any future Administrator
  "Add User" flow), and an explicit session lifetime/idle-timeout policy.
- **Priority**: **Medium** — genuine gaps in an otherwise comprehensive security document.

### 3.7 Missing Database Relationships

*(SR-010, already listed in §3.2, is the primary finding for this category — `LoginAttempt`
referenced but never modeled.)*

#### SR-020 — Entity-Relationship Diagram has not been updated across two revisions
- **Description**: `data-model.md` §2's Mermaid ERD is missing three relationships that its own §3/§4
  text sections confirm exist: (1) `Evidence ↔ InvestigationFinding` via `EvidenceFindingLink` (added
  in the evidence management redesign, confirmed present in §3.22's join-table list and §4.3's
  many-to-many summary, but absent from the §2 diagram); (2) `CorrectiveAction ↔ Hazard` (the
  reciprocal link added in DM-14, confirmed in §3.19's field table, absent from the diagram, which
  still shows only the original `CorrectiveAction }o--o| RootCause` line); (3) `PreventiveAction ↔
  RootCause` (the reciprocal link added in DM-14, confirmed in §3.20, absent from the diagram, which
  still shows only the original `PreventiveAction }o--o| Hazard` line). The diagram reflects an
  earlier state of the schema than the entity tables below it.
- **Affected specifications**: `data-model.md` (§2, vs. §3.19, §3.20, §3.22, §4.3).
- **Recommended resolution**: Add the three missing relationship lines to the §2 Mermaid diagram:
  `EVIDENCE }o--o{ INVESTIGATION_FINDING`, `CORRECTIVE_ACTION }o--o| HAZARD`, and
  `PREVENTIVE_ACTION }o--o| ROOT_CAUSE`.
- **Priority**: **High** — the ERD is the primary at-a-glance reference for the schema; it is
  materially incomplete relative to the entity definitions it is meant to visualize.

### 3.8 Missing Workflow Transitions

#### SR-021 — Ambiguous scope of the ADMIN "Override and Close" control relative to the Reviewer-approval override
- **Description**: `investigation-workflow.md` §6's transition table lists a single row — "Review →
  Closed: Reviewer approves (ADMIN override)" — treating the Reviewer-role override as one
  undifferentiated allowance. `ui-spec.md` §16, however, presents two visually and functionally
  distinct controls: a Reviewer/Admin "Approve" button, and a separate ADMIN-only "Override and
  Close" button specifically for bypassing the `requiredForClosure` gate (per `data-model.md`
  §6.9.3). Neither document states whether these are the same underlying action described two
  different ways, or genuinely two different escalation paths — and if the latter, whether "Override
  and Close" is still restricted to firing only when the investigation is already in `Review` status
  (as the transition validity matrix in `investigation-workflow.md` §7.2 would otherwise require).
- **Affected specifications**: `investigation-workflow.md` (§6, §7.2, §9.6), `ui-spec.md` (§16),
  `data-model.md` (§6.9.3).
- **Recommended resolution**: Clarify in `investigation-workflow.md` §6 that there are two distinct
  ADMIN-usable escalations from `Review` — the ordinary role-override (ADMIN acting in place of
  Reviewer) and the closure-gate override (bypassing `requiredForClosure`, available to ADMIN even
  when acting as/alongside a Reviewer) — and confirm both are scoped to firing only from `Review`,
  consistent with §7.2's transition matrix.
- **Priority**: **Medium** — a real ambiguity in a security/process-sensitive control (bypassing a
  closure gate), worth resolving precisely before implementation.

#### SR-022 — Investigator reassignment not cross-checked against the read-only-during-Review/Closed rule
- **Description**: FR-006 (Assign/Reassign Investigator) states only that reassignment is blocked
  when an investigation is `Closed` "without first being reopened" — it does not address whether
  reassignment is permitted while an investigation is `Review` status (locked for ordinary editing
  per FR-011) but not yet `Closed`. Is reassigning the investigator considered an administrative
  action exempt from the general read-only lock, or is it blocked like every other edit during
  Review?
- **Affected specifications**: `functional-requirements.md` (FR-006, FR-011).
- **Recommended resolution**: Add an explicit rule to FR-006 stating whether reassignment is
  permitted during `Review` (a reasonable real-world need — e.g., the assigned Investigator becomes
  unavailable mid-review) and, if so, confirm it does not itself unlock any other section for
  editing.
- **Priority**: **Medium** — a plausible real-world scenario with no defined behavior either way.

### 3.9 Accidental Dependency on External APIs

#### SR-023 — CSP guidance in `security-spec.md` hedges on an external font dependency already ruled out
- **Description**: `security-spec.md` §3's recommended Content-Security-Policy permits *"the
  application's own origin **plus Google Fonts' two required hosts if self-hosted fonts... are not
  used instead**"* — a conditional that reopens a question `technical-architecture.md` §3.3 had
  already settled: *"Monospace/sans font pairing loaded via `next/font` (self-hosted, **zero external
  font-CDN requests at runtime**)."* The hedge is unnecessary and, if followed literally by an
  implementer reading `security-spec.md` in isolation, could reintroduce an external dependency
  (Google's font CDN) that the architecture document had deliberately eliminated.
- **Affected specifications**: `security-spec.md` (§3), `technical-architecture.md` (§3.3).
- **Recommended resolution**: Remove the Google Fonts hedge from `security-spec.md` §3's CSP
  guidance; state the CSP as `default-src 'self'` with no font-host exception, consistent with the
  self-hosted-font decision already made.
- **Priority**: **Low** — a documentation hedge, not an active dependency, but exactly the kind of
  loose wording this review category exists to catch before it becomes a real one.

## 4. Summary Table

| ID | Category | Priority | One-line description |
|---|---|---|---|
| SR-001 | Contradiction / Unimplementable | **Critical** | FR-023/FR-055 specify `LocalDiskStorageProvider`, which does not work on Vercel |
| SR-002 | Unimplementable / Missing field | **Critical** | `Attachment` entity missing the `Bytes` column the architecture requires |
| SR-003 | Contradiction | **High** | `functional-requirements.md` still uses the retired 5-state model/entity names |
| SR-004 | Contradiction / Duplicate | **High** | FR-066's outcome-severity enum still lists retired value `Hazardous` |
| SR-005 | Contradiction | **Medium** | FR-030 references retired unified `Action.hazardId` |
| SR-006 | Contradiction | **Medium** | FR-062/FR-063 cite non-existent `report-spec.md` §3.18/§3.19 |
| SR-007 | Contradiction | **Medium** | Seven files carry a stale "report-spec.md not updated" note |
| SR-008 | Missing requirement / Feature gap | **High** | Investigation Findings has no functional requirements |
| SR-009 | Missing requirement | **Medium** | Six Assistance Engine capabilities have no FRs |
| SR-010 | Missing DB relationship | **High** | `LoginAttempt`/`UploadAttempt` referenced but never modeled |
| SR-011 | Ambiguous / Feature gap | **Medium** | "Continue as Viewer" mechanism unreconciled with session-based auth |
| SR-012 | Ambiguous | **Medium** | "Reporter" field resolved two different ways in two files |
| SR-013 | Ambiguous | **Low** | Reference-number year-rollover behavior only implied |
| SR-014 | Missing validation | **Medium** | Text field max-lengths not folded back into `data-model.md` |
| SR-015 | Missing validation | **Low** | `RiskBandConfiguration.colorHint` has no format constraint |
| SR-016 | Missing validation / edge case | **Medium** | No handling for assigned Investigator losing role eligibility |
| SR-017 | Missing error handling | **Low** | No concurrency rule for `RiskBandConfiguration` edits |
| SR-018 | Missing error handling | **Low** | No behavior specified for failed `prisma migrate deploy` |
| SR-019 | Missing security requirement | **Medium** | No password policy or session timeout policy specified |
| SR-020 | Missing DB relationship | **High** | ERD diagram missing three relationships present in the entity tables |
| SR-021 | Missing workflow transition | **Medium** | ADMIN "Override and Close" scope vs. Reviewer-approval override ambiguous |
| SR-022 | Missing workflow transition | **Medium** | Investigator reassignment not checked against Review-lock rule |
| SR-023 | External API dependency | **Low** | CSP guidance hedges on a Google Fonts dependency already ruled out |

## 5. Recommended Remediation Order

1. **Before any implementation work begins**: SR-001, SR-002 (Critical — evidence storage as
   currently specified would not run on the mandated architecture).
2. **Before implementing the workflow/review/closure modules**: SR-003 (the 5-state/entity-name
   sweep) and SR-020 (ERD update), since both affect how a developer would read the data model while
   building exactly those modules.
3. **Before implementing Investigation Findings or the Assistance Engine**: SR-008, SR-009 (no FRs
   exist yet for these feature areas).
4. **Before implementing rate limiting**: SR-010 (no schema exists for it yet).
5. **Everything else** (SR-004 through SR-007, SR-011 through SR-023): genuine issues, all worth
   fixing, but none individually blocks starting implementation of an unrelated module — track and
   resolve during the relevant module's implementation pass rather than as a prerequisite to all of
   them.

## 6. What Was Checked and Found Sound

Worth stating explicitly, since a review that only lists problems can read as more alarming than
warranted: the vast majority of this specification set is **internally consistent**. Every major
redesign pass (classification, risk assessment, root-cause analysis, corrective/preventive actions,
evidence management) correctly propagated its changes across `data-model.md`,
`functional-requirements.md`, `ui-spec.md`, and `investigation-workflow.md` in the vast majority of
places — the issues found above are the specific, narrow places where a propagation was missed, not
evidence of a systemically unreliable process. The non-authoritative wording policy
(product-spec §11), the six-state workflow's transition rules, the risk-band configurability design,
the evidence storage abstraction's *interface* (as opposed to its now-corrected v1 implementation,
SR-001), and the security architecture's core controls all check out as consistent across every file
that touches them. No instance of a genuinely new, undocumented external API dependency was found
beyond the one documentation hedge in SR-023.

## 7. Resolution Status (updated during implementation)

This review is a point-in-time snapshot from before implementation began (§1). It is not
continuously rewritten as items are resolved — but leaving resolved items listed as open,
indefinitely, would make this document actively misleading rather than merely stale. This section
records what a 2026 final-review pass (`Phases 1-5` complete) confirmed against the current
codebase, without editing the findings above, so both the original review and its current status
are visible together.

**Confirmed resolved:**

- **SR-003** (5-state model / retired entity names) — `functional-requirements.md` now uses the
  six-state model throughout (`Draft → Open → UnderInvestigation → Analysis → Review → Closed`,
  confirmed at §0.3 and every FR-011/FR-049–FR-064 reference checked), matching `data-model.md`,
  `investigation-workflow.md`, and the `InvestigationStatus` Prisma enum.
- **SR-004** (duplicate/drifted severity scale) — resolved directly in `functional-requirements.md`
  FR-066 with an inline note closing this item; `RiskSeverity` now reads
  `Negligible/Minor/Moderate/Major/Catastrophic` everywhere, including the Prisma enum and the
  seeded `RiskBandConfiguration` rows.
- **SR-010** (`LoginAttempt`/`UploadAttempt` referenced but undefined) — `LoginAttempt` was
  formalized as a `data-model.md` §3.25 entity during Phase 2; `security-spec.md`'s own consistency
  notes already record this closure. `UploadAttempt` remains undefined, correctly, since evidence
  upload (Phase 6) is not yet implemented — not a re-opening of this item, just its unimplemented
  half.
- **SR-011** ("Continue as Viewer" anonymous-access mechanism) — resolved exactly as this review's
  own recommended resolution proposed: it authenticates as the seeded Guest Viewer account through
  a real Auth.js session (`app/(auth)/login/actions.ts`'s `continueAsViewerAction`, which cites this
  item by ID in its own comment) rather than bypassing authentication.

**Still genuinely open** (accurately so, not stale): every other item, most directly because the
phases they depend on — Evidence/Witnesses (SR-001, SR-002), Investigation Findings (SR-008), the
Assistance Engine (SR-009), Root Cause Analysis and Corrective/Preventive Actions (SR-005, SR-021,
SR-022), and Report Generation (SR-006, SR-007) — have not been implemented yet. These should be
re-checked against this same section as each phase lands, not assumed resolved by the passage of
time alone.

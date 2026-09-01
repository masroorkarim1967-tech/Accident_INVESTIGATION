# Edge Case Analysis — Aviation Incident Investigation Assistant

## 1. Purpose & Methodology

This document is a systematic edge-case pass across the entire application, covering the 24 cases
named for this task plus a small number of additional cases found while doing that pass (§3). For
each, this document either **synthesizes** behavior already specified elsewhere (cross-referenced
precisely, not restated loosely) or **defines new behavior** for a genuine gap this pass uncovered.
Every entry is explicitly tagged:

- **[Specified]** — behavior already fully defined elsewhere; this entry cross-references it.
- **[New]** — no prior spec addressed this; behavior is defined here for the first time.
- **[Extended]** — partially specified elsewhere; this entry closes a gap in that existing coverage.

Nothing here is implementation — every "Expected System Behavior" is a requirement statement for a
future implementation pass to satisfy, consistent with every other document in this set.

## 2. Edge Cases

### EC-01 — Empty Investigation **[Specified]**

**Scenario**: A `Draft` investigation exists with only Title, Occurrence Date, and Reporter set
(FR-005) — nothing else recorded.

**Expected Behavior**: All 13 workspace sections show "Not Started" (`ui-spec.md` §2.3's
CompletenessDot); the Investigation Overview's Section Completeness overview reflects this
(`ui-spec.md` §5). It counts toward the Dashboard's Total and Open Investigations tiles
(`functional-requirements.md` §1.0.2) like any other record. If a report is generated at this stage,
every section beyond the Cover Page renders its explicit "No … recorded"/"Not provided"/"Not
established" placeholder (`report-spec.md` §4, §5) — the report is never blocked from generating,
only marked with the `DRAFT` watermark (`report-spec.md` §5.0). No stage transition is possible yet;
`Draft → Open` requires Occurrence Details to be complete and an Investigator assigned
(`investigation-workflow.md` §8).

### EC-02 — Missing Required Fields **[Specified, consolidated]**

**Scenario**: A user attempts to save a section, or advance a stage, with a required field empty.

**Expected Behavior**: Two distinct failure modes, never confused with each other:
1. **Field-level validation** (saving a single section): rejected inline at the field, server-side
   authoritative regardless of client-side pre-checks (`non-functional-requirements.md` NFR-4.7,
   `technical-architecture.md` §6) — the specific required-field list is defined per entity
   throughout `data-model.md`'s "Req." column and each FR's "Validation Rules."
2. **Stage-gate validation** (attempting to submit for review or otherwise advance): rejected with
   the specific unmet items listed and linked, **disabled** rather than merely warned
   (`investigation-workflow.md` §7.1, §8) — a user can have every *currently visited* section fully
   valid yet still be blocked from advancing because a *different, not-yet-required-until-now*
   field (e.g. Confidence Level on a Root Cause) is missing.

### EC-03 — Duplicate Investigation **[New]**

**Scenario**: Two records are created for what is actually the same real-world occurrence — either
because two different users independently report it, or because a user double-clicks "Create"
before the page navigates away.

**Expected Behavior**:
- **Accidental double-submission** (same user, same click): the "Create Investigation" button
  disables itself the instant it is pressed (`ui-spec.md` §4), and the underlying Server Action is
  idempotent per request — a second rapid submission before navigation completes must not produce a
  second `Investigation` row. This is a client-side UX guard backed by a server-side check, not
  either alone.
- **Genuine duplicate content** (two different reports of the same occurrence, created independently
  by two different users): the system does **not** silently merge or block these — merging
  investigation records is a significant, deliberate action with real audit implications, not
  something to automate. Instead, **Investigation Checklist Suggestions**
  (`assistance-engine.md` §4.1) gains one additional rule: when a new investigation's Occurrence
  Date, Aircraft registration, and Location are all a close match to another investigation created
  within the same 24-hour window, show an **Investigation Support · Suggested Next Step** advisory —
  *"This looks similar to INC-2026-00XX, created recently — check whether this is a duplicate
  report before continuing."* This is Category A (advisory only, per `assistance-engine.md` §3.3):
  it never blocks creation and never auto-merges; the Investigation Manager or Administrator decides
  whether the second record should instead be closed as a duplicate via ordinary means (e.g. marking
  it `Cancelled`-equivalent is not currently modeled — the practical resolution is to leave both
  records and cross-reference one from the other's Narrative or Investigator Notes, since no formal
  investigation-to-investigation link exists in this version).

### EC-04 — Invalid Dates **[Specified, consolidated]**

**Scenario**: A date field receives a malformed, out-of-range, or logically inconsistent value.

**Expected Behavior**: Every date field is validated by a Zod schema at the server boundary
(`technical-architecture.md` §6), never trusting a native `<input type="date">`'s client-side
constraints alone. Specific rules already defined and consolidated here: Occurrence Date not in the
future (EC-05); Evidence Date Obtained not in the future (`data-model.md` §3.9); Action Completion
Date not in the future and required once `Completed` (`data-model.md` §3.19); Immediate Action
timestamp must be ≥ the Occurrence's own date/time (`data-model.md` §3.11); a new (not edited)
Corrective/Preventive Action's Target Date must be today or later (`functional-requirements.md`
FR-040). A malformed date string (fails Zod's date parsing entirely) is rejected as a standard field
validation error (EC-02), not specially handled. Leap-year/timezone edge values (e.g. Feb 29,
DST-transition local times) are handled by storing everything in UTC (`data-model.md` DM-4) and
treating the optional local-time fields as pure display convenience, never used in comparisons.

### EC-05 — Future Occurrence Date **[Specified]**

**Scenario**: A user attempts to set the Occurrence Date to a date after today.

**Expected Behavior**: Rejected at creation (FR-005) and on every subsequent edit of
`Occurrence.occurrenceDateUtc` (`data-model.md` §3.3, "Not in the future") — an investigation cannot
exist for an occurrence that has not happened yet. Rejected inline with a clear message; no
investigation is created and no section save succeeds with this value.

### EC-06 — Investigation Reopened After Closure **[Specified, extended]**

**Scenario**: A `Closed` investigation is reopened.

**Expected Behavior**: Requires a reason (min 10 characters), moves status directly to
`Under Investigation` (never back through `Review`), and does not clear any prior data
(`investigation-workflow.md` §6, §9.7, FR-054). **Extension for this pass**: the previously-final
report immediately loses its "final" presentation the next time it is viewed or regenerated — since
the report is always rendered live from current data (`report-spec.md` RPT-2) and the `DRAFT`
watermark is keyed purely off `status ≠ Closed` (`report-spec.md` §5.0/§8), reopening automatically
and correctly re-marks the report as draft with no special-case logic required; this is a direct,
previously-unstated consequence of how those two rules already compose. The investigation must pass
through `Under Investigation → Analysis → Review` again to close a second time
(`investigation-workflow.md` §7.1); every reopen event is permanently logged
(`data-model.md` §3.24, `HistoryEventType.Reopened`) and shown interleaved with review history in
both the app (`ui-spec.md` §5) and the report (`report-spec.md` §5.19).

### EC-07 — Multiple Aircraft **[New]**

**Scenario**: A real-world occurrence genuinely involves more than one aircraft (e.g. a ramp
collision between two aircraft, or a near-miss between two taxiing aircraft).

**Expected Behavior**: The data model supports exactly one `Aircraft` record per `Investigation` by
design (`data-model.md` DM-1) — this is a scope boundary, not an oversight, and this pass defines
the resolution explicitly rather than leaving it implicit: **a genuinely multi-aircraft occurrence
is documented as separate investigations, one per aircraft**, each recording that aircraft's own
damage/involvement, with the relationship between them described in free text (each investigation's
Narrative Description or Investigator Notes references the other's reference number) since no formal
investigation-to-investigation link exists in this version (same limitation noted in EC-03). A
second aircraft that is merely *contextually* involved without being itself investigated (e.g. "wake
turbulence from a departing aircraft contributed to this occurrence") does **not** need its own
investigation — that involvement is recorded as a Contributing Factor or in the Narrative of the one
investigation that exists, which is the already-supported, ordinary case.

### EC-08 — Multiple Witnesses **[Specified]**

**Scenario**: More than one witness is recorded for an investigation.

**Expected Behavior**: Fully supported by design — `Witness` is one-to-many per `Investigation`
with no upper bound (`data-model.md` §4.2). Displayed ordered by Statement Date, most recent first,
undated entries last (`functional-requirements.md` FR-019). Conflicting witness statements are
simply recorded as separate entries; the system does not attempt to reconcile them
(`functional-requirements.md` FR-019 edge case) — reconciliation is investigator analysis, not a
data-entry concern.

### EC-09 — No Witnesses **[Specified]**

**Scenario**: An investigation has zero witness records.

**Expected Behavior**: Optional section; shows "No witnesses recorded" with an explicit "acknowledge
— no witnesses" action distinguishing "genuinely none" from "not yet checked"
(`investigation-workflow.md` §9.3, `functional-requirements.md` FR-019). Does not block any stage
transition. The report shows the same "No witnesses recorded" line rather than omitting the section
(`report-spec.md` §5.7, §7).

### EC-10 — No Evidence **[Specified]**

**Scenario**: An investigation has zero evidence records.

**Expected Behavior**: Same pattern as EC-09 — an explicit "No evidence currently available"
acknowledgment (`investigation-workflow.md` §9.2), never a forced fabricated entry, does not block
the `Under Investigation → Analysis` transition once acknowledged (`investigation-workflow.md` §8).

### EC-11 — Evidence Unrelated to Findings **[Extended]**

**Scenario**: One or more Evidence items exist but are never linked to any `InvestigationFinding` via
`EvidenceFindingLink`.

**Expected Behavior**: This is **fully valid, not an error** — not every piece of collected evidence
turns out to support a formal finding, and the system must not force an artificial link to make an
evidence item "useful." An unlinked evidence item shows "Not yet linked to a finding"
(`functional-requirements.md` FR-071) and is otherwise complete on its own terms (its Relevance and
Reliability Assessment fields are the investigator's own judgment, independent of whether a formal
link exists). **Extension for this pass**: Report Quality Checks (`assistance-engine.md` §4.8) does
**not** flag unlinked evidence as a defect — doing so would pressure investigators toward
manufacturing links that don't reflect real analytical relationships. If a future capability wants
to surface this pattern, it should be a neutral observation ("3 of 5 evidence items are not linked
to a finding"), never phrased as something requiring correction.

### EC-12 — Multiple Root Causes **[Specified]**

**Scenario**: An investigation records more than one Potential Root Cause.

**Expected Behavior**: Fully supported and expected for investigations with independent causal
branches — `RootCause` is one-to-many per `Investigation`, each optionally paired with its own
concluded 5 Whys analysis (`data-model.md` §6.8). The Analysis → Review gate requires only *at
least* one (`investigation-workflow.md` §8); there is no upper bound and no requirement that
multiple root causes be reconciled into a single statement.

### EC-13 — No Root Cause Established **[Specified, consolidated]**

**Scenario**: An investigation has zero `RootCause` records at the point of attempting to submit for
review.

**Expected Behavior**: Two sub-cases, handled differently:
1. **Mid-investigation, simply not yet reached**: this is normal and expected; the
   Analysis → Review gate blocks submission until a Potential Root Cause is recorded **or** the
   inconclusive override is used (`investigation-workflow.md` §8) — not an error state, just an
   incomplete one.
2. **Genuinely inconclusive after full investigation**: the "root cause could not be conclusively
   identified" override exists precisely for this (`investigation-workflow.md` §9.5,
   `data-model.md` §3.17) — a mandatory justification (min 20 characters) substitutes for a
   Root Cause entry and satisfies the gate.

If a report is generated before either condition is met, §5.13 shows "Not established"
(`report-spec.md` §5.13); §5.17's Investigation Conclusion likewise shows "Not established" when no
Finding or Root Cause exists yet (`report-spec.md` §5.17).

### EC-14 — Corrective Action Without Owner **[Extended]**

**Scenario**: An attempt to save a Corrective (or Preventive) Action with no Responsible Person set;
separately, an already-saved action whose owner is later deactivated.

**Expected Behavior**:
- **At creation/edit**: rejected — exactly one of `ownerUserId`/`ownerExternalName` is required
  (`data-model.md` §3.19–§3.20, `functional-requirements.md` FR-040) — an action without an
  accountable owner cannot be saved at all, by design (there is no such thing as an unowned action
  in this system).
- **Extension for this pass — owner later deactivated**: `User.isActive = FALSE` does not cascade
  or clear `ownerUserId` (`data-model.md` §7's `User` row is `RESTRICT`, never deleted). An action
  can therefore end up pointing at a deactivated user. The UI must visibly flag this ("Owner account
  deactivated") wherever the action is shown, since a deactivated person cannot realistically be
  expected to complete or verify anything — this is a **new** requirement this pass adds: an
  Administrator or Manager reassigning the action (FR-047) is the expected resolution, and the
  flag exists specifically to make that need visible rather than silently discoverable only when
  someone tries and fails to act on it.

### EC-15 — Overdue Corrective Action **[Specified, consolidated]**

**Scenario**: A Corrective or Preventive Action's Target Date has passed while it is still
`Open`/`Assigned`/`InProgress`.

**Expected Behavior**: `Overdue` is computed and displayed in place of the stored status wherever
the action appears — investigation view, Dashboard, Action Tracker, report
(`data-model.md` §6.9.2, `functional-requirements.md` FR-046) — never stored, always recomputed live.
It contributes to the Dashboard's "Overdue Corrective Actions" tile (`functional-requirements.md`
§1.0.2) and, when `requiredForClosure = TRUE`, **hard-blocks** the `Review → Closed` transition until
resolved; when `requiredForClosure = FALSE`, it requires only a Reviewer acknowledgment, not a hard
block (`data-model.md` §6.9.3, `investigation-workflow.md` §9.6). `Completed`, `Verified`, and
`Cancelled` actions are never Overdue regardless of date.

### EC-16 — Deleted Investigation **[Extended]**

**Scenario**: An investigation is deleted; separately, a user has it open in another tab/session at
the moment of deletion.

**Expected Behavior**: Deletion is possible **only** while `status = Draft`
(`functional-requirements.md` FR-055) — this is a hard restriction, not merely a permission check,
because deleting anything past Draft would destroy real investigative work and its audit trail.
Deletion cascades to every child record (`data-model.md` §7) and any attached files (as blob columns
under the current storage design, `technical-architecture.md` §9). **Extension for this pass**: a
second user (or the same user in another tab) who already had the now-deleted investigation loaded
and attempts to view or save against it receives the same "This investigation is no longer
available" treatment already defined for a similar dashboard race (`functional-requirements.md`
FR-004's edge case, generalized here to apply to any stale reference to a deleted record, not only a
dashboard link) — never a raw server error, and never a silent no-op that leaves the user unsure
whether their action took effect.

### EC-17 — Browser Refresh During Form Entry **[New]**

**Scenario**: A user is mid-edit on an unsaved form (any section uses explicit Save, per `ui-spec.md`
UI-1) and refreshes the browser, closes the tab, or navigates away.

**Expected Behavior**: Three layers, each with an honestly-documented limit:
1. **In-app navigation** (clicking another Section Stepper item or a nav link) already triggers a
   custom confirmation dialog when leaving a section with unsaved changes (`functional-requirements.md`
   FR-009).
2. **Browser-level refresh/tab-close**: a `beforeunload` handler is registered whenever a form has
   unsaved changes, triggering the browser's own native "Leave site? Changes you made may not be
   saved" dialog. Browsers do not allow a custom message here for security reasons, so the wording is
   generic, not app-specific — this is a browser platform limitation, not a gap in this application's
   design.
3. **Actual crash, power loss, or a refresh confirmed past the warning**: unsaved data is genuinely
   lost. This is an **accepted, documented limitation** directly following from the explicit-Save
   design choice (`ui-spec.md` UI-1's stated rationale: "implementation simplicity and predictable
   behavior") rather than autosave — the trade-off is stated plainly here rather than left implicit,
   so it is a known and reviewable decision, not a discovered gap.

### EC-18 — Network Interruption **[New]**

**Scenario**: A Server Action or Route Handler call fails mid-flight due to a dropped connection.

**Expected Behavior**: The client never clears the form on a failed submission — entered values
remain exactly as typed so the user can retry without re-entering anything. The failure surfaces as
an inline "Unable to save — check your connection and try again" message (the same ErrorBanner
pattern used for other failures, `ui-spec.md` §4), not a blank page or a silent failure. Every
multi-row write (e.g. saving a Hazard's computed risk fields alongside the Hazard row itself, or
cascading a delete across child tables) is wrapped in a single database transaction
(`technical-architecture.md` §4.3's service-layer pattern implies this; stated explicitly here as a
cross-cutting rule) — a network interruption mid-operation can never leave the database in a
partially-written, inconsistent state; the operation either fully committed before the interruption
or did not happen at all.

### EC-19 — Database Failure **[Extended]**

**Scenario**: The Postgres database (Neon) is unreachable or returns an error.

**Expected Behavior**: `GET /api/health` reflects the failure (503) for external monitoring
(`technical-architecture.md` §10). A page whose Server Component data-fetch fails renders that
segment's `error.tsx` boundary with a generic "Something went wrong — please try again" message,
scoped to the failing segment where possible rather than crashing the whole page
(`technical-architecture.md` §7, extending `functional-requirements.md` §1.0.3's "isolated inline
error" principle from dashboard charts to the whole application). No stack trace or connection
string ever reaches the client (NFR-10.2); the full error is logged server-side as structured JSON
(NFR-10.1). **Related but distinct nuance worth naming**: Neon's serverless "scale to zero" behavior
means an idle database's *first* query after a period of inactivity has extra cold-start latency —
this is not a failure and should complete well within acceptable response times at this project's
scale (`non-functional-requirements.md` NFR-3.1), but is worth distinguishing from an actual outage
when interpreting a slow (not failed) request.

### EC-20 — Invalid User Input **[Specified, consolidated]**

**Scenario**: Malformed, malicious, or semantically-empty input is submitted.

**Expected Behavior**: Every input is Zod-validated server-side regardless of what the client sent
(`technical-architecture.md` §6); SQL injection is structurally prevented by Prisma's query builder
(NFR-4.2); XSS is prevented by React's default JSX escaping, with `dangerouslySetInnerHTML` banned
outright via lint rule (NFR-4.3, `technical-architecture.md` §8). **Consolidated rule for this
pass**: whitespace-only text (e.g. a narrative consisting only of spaces/newlines) is treated as
empty for validation purposes across **every** text field, not only the Narrative Description where
this was first stated (`functional-requirements.md` FR-012 edge case, generalized here as a
standing, cross-cutting rule rather than a one-field special case).

### EC-21 — Very Long Descriptions **[New]**

**Scenario**: A user pastes an extremely long value into a free-text field (a narrative, a note, an
evidence description) — whether accidentally or as a stress/abuse case.

**Expected Behavior**: This was a genuine gap — prior specs defined **minimum** lengths for many
text fields (e.g. narrative ≥ 20 chars) but no **maximum**, and Postgres `TEXT` columns are
technically unbounded. This pass closes it: every free-text field gets an explicit maximum, enforced
by the same Zod schema that enforces its minimum (`technical-architecture.md` §6), tiered by the
field's purpose rather than one blanket number:

| Field category | Examples | Maximum |
|---|---|---|
| Short free-text (already `VARCHAR`-bounded) | Brief Description (240), titles, names | Unchanged — already capped in `data-model.md` |
| Narrative/analytical text | Narrative Description, Root Cause Supporting Evidence/Investigator Notes, Finding Description, Custody Notes | 10,000 characters |
| Short notes/comments | Reliability Notes, Investigator Comments, Verification Notes, review Comments | 5,000 characters |

A submission exceeding its field's maximum is rejected the same way as any other validation failure
(EC-02), with the specific limit stated in the message; the UI shows a live character counter once
within 10% of the limit, consistent with the existing inline-validation pattern rather than a
separate mechanism. This bounds both accidental pastes and deliberate resource-exhaustion attempts
without materially constraining any legitimate use of these fields.

### EC-22 — Mobile Screen **[Specified, extended]**

**Scenario**: The application is used on a small viewport (down to 375px, `non-functional-requirements.md`
NFR-6.3).

**Expected Behavior**: The Section Stepper collapses to a "Jump to section" dropdown, the right rail
becomes an expandable section, forms go single-column, wide content (tables, the risk matrix)
scrolls horizontally inside its own container rather than the page body scrolling sideways
(`ui-spec.md` §6). **Extensions for this pass, not previously stated**: (1) every interactive
element (buttons, badges used as controls, table row actions) maintains a minimum touch-target size
consistent with standard accessibility guidance, extending NFR-6.1's WCAG AA commitment specifically
to touch interaction, not only keyboard/contrast; (2) the Hazard risk-matrix widget's 5×5 grid
(`ui-spec.md` §11) does not attempt to compress to fit 375px width — it scrolls horizontally inside
its own bordered container like any other wide content, rather than shrinking cells to illegibility.

### EC-23 — Concurrent Edits **[Extended]**

**Scenario**: Two users (or one user in two tabs) edit data on the same investigation at
overlapping times.

**Expected Behavior**: `non-functional-requirements.md` §11 already establishes the non-goal
("no real-time collaboration... last write wins with an optimistic `updatedAt` check that surfaces a
conflict message") — this pass makes that concrete:
- **Same section, same row, overlapping edits**: each section fetch carries the record's current
  `updatedAt`. On save, the server compares the submitted `updatedAt` against the current database
  value; a mismatch is rejected (HTTP 409-equivalent) with *"This section was updated by someone
  else since you loaded it — reload to see their changes before saving yours."* There is no merge
  UI — the user reloads (discarding their pending edit) and re-applies it against current data, or
  abandons it. This is a deliberate simplicity choice consistent with the stated non-goal, not an
  oversight.
- **Different sections of the same investigation, overlapping edits**: no conflict at all — each
  section is its own table/row (`data-model.md` §3), so simultaneous edits to, say, Aircraft and
  Hazards never collide.
- **A stage-changing action (e.g. Reviewer approval) happens while another user is mid-edit**: the
  investigation becomes read-only the instant its status changes to `Review`/`Closed` (FR-011); a
  pending edit from before that moment fails the same optimistic-concurrency check above when
  submitted, surfacing as a conflict rather than silently succeeding against a now-locked record.

### EC-24 — Report Generated With Missing Information **[Specified]**

**Scenario**: A report is generated for an investigation that has gaps at any stage of completion.

**Expected Behavior**: This is the core design principle of `report-spec.md`, not a special case
layered on top of it: every section renders even when its underlying data is incomplete, using the
exact fixed placeholder — **"Not provided"** for an unset descriptive field, **"Not established"**
for an analytical conclusion not yet reached (`report-spec.md` §4) — never a fabricated or inferred
value. A whole empty list-section shows its explicit "No … recorded" line rather than being omitted
(`report-spec.md` §7). The two synthesis sections (Established Facts, Investigation Conclusion) are
system-composed strictly from what is actually on record, so they cannot contain more than what
genuinely exists (`report-spec.md` §5.8, §5.17, RPT-5) — a report can never accidentally read as more
complete than the investigation actually is.

## 3. Additional Edge Cases Found During This Pass

Not on the original list, but surfaced naturally while working through it — included for
completeness rather than silently left out:

### EC-25 — User Role Changed or Deactivated Mid-Session **[New]**

**Scenario**: An Administrator changes a user's role, or deactivates their account, while that user
has an active session.

**Expected Behavior**: Because Auth.js database sessions are used specifically so a deactivated
account is locked out immediately rather than waiting for a token to expire
(`technical-architecture.md` §4.4), the next request from that session re-checks `isActive` and the
current role — a deactivated user's next action is rejected as unauthenticated (forcing re-login,
which then fails), and a role-downgraded user's next action is checked against their *new* role, not
whichever role their session was originally issued under. This is a direct consequence of the
already-chosen session strategy, made explicit here as a requirement rather than left as an implied
side effect.

### EC-26 — Evidence Attachment Storage Cap Reached Mid-Investigation **[Specified]**

**Scenario**: An investigation's cumulative attachment size approaches or exceeds its 100MB cap
(NFR-4.5) mid-investigation, not at first upload.

**Expected Behavior**: Already specified (`functional-requirements.md` FR-023) — a breach shows
"This investigation's attachment storage limit has been reached" with current usage shown, and the
specific upload is rejected before any bytes are persisted (consistent with the `Bytes`-column
storage design, `technical-architecture.md` §9, which makes a rejected upload trivially clean — no
partial file to clean up on a filesystem, unlike a disk-based design would risk).

### EC-27 — Risk Bands Reconfigured While Historical Data Exists **[Specified]**

**Scenario**: An Administrator edits `RiskBandConfiguration` (FR-069) after hazards/occurrences have
already been scored against the previous configuration.

**Expected Behavior**: Already specified (`data-model.md` §6.4, `functional-requirements.md`
FR-069) — stored `riskBand`/`initialRiskBand`/`residualRiskBand` values are **not** retroactively
recomputed; a reconfiguration applies to future scoring only, and the Settings screen states this
explicitly so an Administrator is not surprised that historical reports don't visibly change.

## 4. Assumptions Specific to This Pass

- **EDG-1**: Where an edge case's resolution required a genuinely new rule (duplicate detection,
  browser-refresh handling, network-interruption UX, the text-length maximums, the deactivated-owner
  flag, concurrent-edit conflict messaging), that rule is treated as a real addition to the
  specification set, not merely illustrative prose — a future functional-requirements pass should
  assign FR IDs to each (§5).
- **EDG-2**: Several "New" resolutions deliberately choose the simplest behavior consistent with
  this project's existing non-goals (no real-time collaboration, no investigation-to-investigation
  linking, no automated merging) rather than introducing new capability scope — e.g. EC-03 and EC-07
  both resolve to "handle this with existing free-text fields, not a new relational feature,"
  matching the project's established preference for bounded scope over speculative flexibility.

## 5. Consistency Notes — Required Follow-Up Elsewhere

This document was scoped to `edge-cases.md` only. The following newly-defined rules are not yet
reflected as formal FRs or data-model fields and should be in a follow-up pass:

- **Text field maximum lengths** (EC-21) should be added to `data-model.md`'s per-field Validation
  columns for every affected `TEXT` field, and to the corresponding Zod schemas once
  `technical-architecture.md` §6 is implemented.
- **Deactivated-owner visual flag** (EC-14) should be added to `ui-spec.md` §15's Corrective/Preventive
  Actions page and the Action Tracker (§19).
- **Duplicate-investigation advisory rule** (EC-03) should be added to `assistance-engine.md` §4.1 as
  a named rule under Investigation Checklist Suggestions, and a corresponding FR added to
  `functional-requirements.md` Module 2.
- **`beforeunload`/unsaved-changes handling** (EC-17) and the **transactional multi-row write
  guarantee** (EC-18) should be added to `technical-architecture.md` §3.4/§4.3 respectively as
  explicit implementation requirements, not left implicit.
- **Concurrent-edit conflict messaging** (EC-23) should be added to `functional-requirements.md` as
  a cross-cutting requirement (it currently exists only as a non-goal statement in
  `non-functional-requirements.md` §11, without a corresponding positive behavior specification).

Independent of this pass, the previously-flagged outstanding items remain unaffected:
`functional-requirements.md`'s old 5-state status names (§0.3, FR-011, FR-049–FR-054), and
`report-spec.md`'s partially-resolved `InvestigationHistory`/`InvestigationReview` timeline
interleaving.

# Investigation Support Engine Specification

This document is the authoritative design for the **Investigation Support Engine** — the umbrella
name for every local, rule-based assistance feature in the application. It consolidates the three
capabilities already specified elsewhere (Suggested Classification, Potential Contributing Factor,
Recommended Follow-up — `functional-requirements.md` FR-028/FR-033/FR-036) alongside six newly
designed capabilities, under one coherent architecture, one labeling policy, and one set of safety
constraints. It does not replace those FRs' field-level detail; it gives the whole family a single
place where its rules, guarantees, and boundaries are defined once.

## 1. Purpose & Positioning

The engine exists to make investigators faster and more thorough **without** requiring — or ever
appearing to require — any external AI service. Every one of its outputs is produced by ordinary,
auditable, human-authored code running inside the application's own process, evaluated against the
investigation's own recorded data and a small bundled knowledge base. It is a decision-support tool,
never a decision-maker: every output either offers information the investigator can act on, or
proposes content the investigator must explicitly confirm before it becomes part of the record.

## 2. Non-Negotiable Constraints

These are absolute, not preferences, and take precedence over any convenience an implementation
might otherwise be tempted to introduce:

- **No external AI API of any kind.** Explicitly and permanently excluded: the OpenAI API, the
  Anthropic API, the Google Gemini API, and any other paid or free third-party AI/ML inference
  service. No network call to any such service exists anywhere in this engine's design.
- **No machine learning model, local or hosted.** The engine is deterministic rule evaluation and
  simple text/keyword matching over a bundled knowledge base — not a trained model of any kind,
  local or remote. This is a stronger guarantee than "no external API": there is no model file, no
  embedding index, no statistical inference step at all.
- **Every output is labeled "Investigation Support"** (the umbrella term) plus one of the specific
  sub-labels defined in §3.3 — never shown unlabeled, never styled to look like confirmed
  investigator-entered data (product-spec §11.1).
- **Never phrased as official, regulatory, or authoritative.** No output may use words like
  "official," "certified," "regulatory," "verified," "guaranteed," or "confirmed by the system."
  This engine's outputs additionally inherit and must not contradict three other binding disclaimer
  policies already established: the classification taxonomy is not a regulator's official scheme
  (product-spec §11.4), the risk model is educational and configurable (product-spec §11.5), and a
  root cause is never declared as fact regardless of who or what proposed it (product-spec §11.6).
- **The engine informs; it does not enforce.** `investigation-workflow.md` §8's completeness gates
  are the sole authoritative mechanism for blocking a stage transition. This engine's outputs (e.g.
  a missing-information warning about the same gap a gate also checks) are advisory context shown
  earlier and more conversationally — they must never be implemented as, or mistaken for, a second
  enforcement mechanism. If the two ever appear to disagree, the workflow gate is correct by
  definition and the engine's rule should be reviewed.

## 3. Shared Framework

### 3.1 Inputs

Every capability reads from the same two sources, and only these two:

- **The current investigation's own recorded data** — every section already defined in
  `data-model.md` (Occurrence, Aircraft, Flight, Location, Person, Witness, Evidence,
  ImmediateAction, Hazard, ContributingFactor, FiveWhysAnalysis/Entry, RootCause,
  CorrectiveAction/PreventiveAction, InvestigationFinding, InvestigationReview,
  InvestigationHistory), plus the current server date/time (UTC) for anything date-relative
  (overdue windows, reminder thresholds).
- **A small, bundled, static knowledge base** — plain TypeScript/JSON data shipped with the
  application (`technical-architecture.md` §13's `lib/data/`), never fetched from a network source
  at runtime: classification keyword-to-category/subcategory mappings, a similar-incident corpus
  (drawn from the application's own closed investigations, not an external dataset), checklist rule
  definitions, a curated "valuable but optional" field list, risk-warning and action-reminder
  thresholds, and follow-up question templates.

Some capabilities (Potential Contributing Factor) also read **other investigations'** already-closed
records within the same application instance for similarity comparison — this is still entirely
local data, never a call outside the process.

### 3.2 Rule Evaluation Model

- Every rule is an ordinary, explicit conditional — `if <condition over investigation data and/or
  knowledge base> then propose <output>` — implemented as a plain function. There is no scoring
  model, no weighting learned from data, no randomness.
- Rules are small and independent: one rule produces zero or one output object, and a capability is
  simply the set of rules registered under it. Adding a new check is adding one new rule function,
  never modifying a shared black-box.
- Two invocation modes:
  - **On-demand** (Category B, §3.3): triggered by an explicit user action (a button click), never
    run silently in the background, because its output proposes content that could be accepted into
    the record.
  - **Passive/always-computed** (Category A, §3.3): recomputed fresh on every relevant page load
    from current data — never cached as a stored "suggestion" row, because there is nothing to
    accept and therefore nothing that should ever be allowed to go stale.

### 3.3 Outputs & Labeling

Every output is one of two categories, and the category determines how it behaves, not just how it
looks:

| | **Category A — Advisory** | **Category B — Content Suggestion** |
|---|---|---|
| Capabilities | Checklist Suggestions, Missing-Information Warnings, Completeness Score, Risk Warnings, Action Reminders, Report Quality Checks | Suggested Classification, Potential Contributing Factor, Suggested Follow-up Question |
| Persisted? | Never — always recomputed live | Only after explicit human acceptance (into the normal field it pre-fills) |
| Has Accept/Dismiss? | No — informational only | Yes — required before it becomes investigation data |
| Can it go stale? | No (never stored) | The suggestion itself can be superseded by a fresh run, but an *accepted* value is never silently overwritten (FR-028's existing rule, generalized to all of Category B) |

Every output carries an exact label built from the umbrella term plus its specific sub-label —
never paraphrased, never abbreviated to just "Investigation Support" alone:

| Capability | Exact label |
|---|---|
| Investigation Checklist Suggestions | "Investigation Support · Suggested Next Step" |
| Missing-Information Warnings | "Investigation Support · Missing Information" |
| Potential Contributing-Factor Suggestions | "Investigation Support · Potential Contributing Factor" *(existing, FR-033)* |
| Investigation Completeness Score | "Investigation Support · Completeness Score" |
| Suggested Follow-up Questions | "Investigation Support · Recommended Follow-up" *(existing, FR-036)* |
| Risk Warnings | "Investigation Support · Risk Warning" |
| Corrective-Action Reminders | "Investigation Support · Action Reminder" |
| Report Quality Checks | "Investigation Support · Report Quality Check" |
| *(Occurrence classification, listed for completeness)* | "Investigation Support · Suggested Classification" *(existing, FR-028)* |

### 3.4 Confidence Handling

Not every output is the same *kind* of claim, so not every output uses a confidence scale:

- **Definite outputs** (structural): the underlying check is a plain fact about the data — a field
  is empty or it isn't, a date has passed or it hasn't, a rule's threshold is crossed or it isn't.
  These carry no confidence tier at all, because there is no uncertainty to express — they are
  correct by construction whenever they fire. Checklist Suggestions, Missing-Information Warnings,
  Risk Warnings, Action Reminders, and Report Quality Checks are all Definite.
- **Inferential outputs** (pattern-matching): the underlying check is a judgment about text
  similarity or keyword strength, which is genuinely uncertain. These carry a three-tier
  **Low / Medium / High** confidence label, shown alongside the output, never hidden. Suggested
  Classification, Potential Contributing Factor, and Suggested Follow-up Question are Inferential.
  An Inferential capability that finds nothing above a minimum confidence threshold returns an
  explicit "no confident suggestion available" result rather than forcing out a low-quality guess
  (the existing FR-028/FR-033 rule, restated as an engine-wide principle).
- **The Completeness Score is neither** — it is a precise, deterministic percentage (a coverage
  calculation, §4.4), not an inference, so "confidence" does not apply to it in either sense; what
  it needs instead is a constant disclaimer that it measures *coverage*, not *quality* (§4.4).

### 3.5 Explainability

No output is ever a black box. Every output includes, alongside its message, the specific evidence
behind it:

- **Definite outputs** name the exact rule and the exact field/record: *"Serial Number is not
  recorded for this aircraft"* points directly at `Aircraft.serialNumber`, not a vague "aircraft
  info incomplete."
- **Inferential outputs** show their working: Suggested Classification lists the matched keywords
  from the narrative; Potential Contributing Factor names the specific past investigation(s) it drew
  from, by reference number; Suggested Follow-up Question shows which prior answer it transformed
  and how.
- This mirrors the understated, non-magical iconography already chosen for Investigation Support
  features (`ui-spec.md` §1.4) — the design goal and the explainability requirement are the same
  idea expressed twice, once visually and once functionally.

### 3.6 Safety Constraints (consolidated)

1. No external AI/ML service or model, local or hosted (§2).
2. Always labeled with the exact umbrella + sub-label pair (§3.3) — never unlabeled.
3. Never phrased as official/regulatory/authoritative; inherits product-spec §11.4/§11.5/§11.6 where
   applicable (§2).
4. Advisory only — never a second enforcement mechanism alongside `investigation-workflow.md` §8's
   gates (§2).
5. Category B content is never persisted without explicit human acceptance; Category A content is
   never persisted at all (§3.3).
6. Absence of sufficient data produces an explicit "nothing to report" result, never a fabricated or
   guessed output (§3.4, and generalized from FR-028/FR-033 to every capability).
7. An accepted Category B value is never silently overwritten by a later re-run (§3.3).
8. The engine must not block, delay, or gate any user action by itself — at most it recommends.

### 3.7 Edge Cases (engine-wide)

- **Near-empty investigation (fresh Draft)**: most capabilities produce sparse or no output — this
  is correct behavior, not a malfunction. Checklist Suggestions is the exception, since guiding a
  brand-new investigation is exactly its purpose.
- **Conflicting or overlapping outputs**: a gap can legitimately be surfaced by more than one
  capability (e.g. a missing Root Cause might appear in both Missing-Information Warnings and Report
  Quality Checks). Outputs are not required to be mutually exclusive, but the presentation layer
  should avoid showing the same gap three separate times without any cross-reference — a follow-up
  UI concern (§6), not a rule-design one.
- **Read access during Review/Closed**: Category B outputs (which require an accept action into
  now-locked data) are not offered at all once an investigation is `Review` or `Closed`, consistent
  with FR-011's read-only rule. Category A outputs remain visible read-only — they are informational
  and harmless to show even when nothing can be edited, and a Reviewer benefits from seeing the
  Completeness Score and Report Quality Checks exactly as the investigator saw them.
- **Performance at scale**: Potential Contributing Factor's similarity scan is the only capability
  that reads beyond the current investigation. It is bounded to closed investigations only and
  capped at a fixed maximum candidate count (consistent with `non-functional-requirements.md`
  NFR-3.1's portfolio-scale assumption of tens to low hundreds of records) — this is a simple
  keyword/TF-IDF-style comparison, not a heavy computation, but the cap keeps it bounded regardless.
- **Knowledge base gaps**: a category with no defined keywords yet, or a rule with no applicable
  threshold configured, simply produces no output for that specific check — never an error, never a
  placeholder guess.

## 4. The Capabilities

### 4.1 Investigation Checklist Suggestions *(new)*

- **Purpose**: an active, prioritized short list of next steps, more directive than the passive
  Section Completeness Dots already in the UI (`ui-spec.md` §2.3).
- **Inputs**: `Investigation.status`, the populated/unpopulated state of each of the 13 workspace
  sections, the current stage's gate requirements (`investigation-workflow.md` §8).
- **Rules**: the same gate criteria already defined for each stage transition, restated as an
  imperative suggestion (e.g. the Under Investigation → Analysis gate's "Aircraft minimum fields"
  requirement becomes *"Complete Aircraft Information — registration, model, and damage level are
  not yet recorded"*), plus a small number of best-practice suggestions beyond the minimum gate
  (e.g. *"Consider adding Investigator Notes to strengthen this Potential Root Cause's traceability"*).
  Gate-relevant suggestions are always prioritized above best-practice ones.
- **Outputs**: up to 5 suggestions at a time, each linking directly to the relevant section.
- **Confidence**: Definite.
- **Edge cases**: nothing outstanding for the current stage → *"No further steps suggested for this
  stage"* rather than an empty, unexplained list. `Closed` investigations show none (§3.7).

### 4.2 Missing-Information Warnings *(new)*

- **Purpose**: field-level gap-flagging, one level more granular than the checklist's
  section-level guidance — surfaces specific *optional-but-valuable* fields left blank within a
  section the investigator has already started.
- **Inputs**: a curated knowledge-base list of "valuable but optional" fields per entity (e.g.
  `Aircraft.serialNumber`, `Location.weatherVisibility`, `RootCause.investigatorNotes`,
  `CorrectiveAction.department`), and each field's current value.
- **Rules**: for each listed field, warn only if (a) the field is empty, **and** (b) the section it
  belongs to is otherwise in-progress or complete (never warn about a section nobody has touched
  yet — that is the checklist's job, not this one), **and** (c) no explicit "not applicable"
  acknowledgment already covers it (e.g. `noPersonsInvolvedConfirmed = TRUE` suppresses any
  Persons-related warning entirely).
- **Outputs**: one warning per gap, naming the exact field.
- **Confidence**: Definite.
- **Edge cases**: a section with every valuable-but-optional field populated produces zero warnings
  for that section — silence is the expected, positive outcome, not a fallback state needing its own
  message (unlike the checklist and report-quality checks, which do show an explicit all-clear — see
  the rationale for that difference in §4.8).

### 4.3 Potential Contributing-Factor Suggestions *(existing — FR-033)*

Fully specified in `functional-requirements.md` FR-033 and `data-model.md` §6.7; restated here only
to place it correctly in the shared framework: **Category B, Inferential** confidence, drawn from
local text-similarity against this application's own closed investigations (never an external
corpus), always requiring an explicit "Add to this investigation" action before persisting.

### 4.4 Investigation Completeness Score *(new)*

- **Purpose**: a single percentage summarizing how much of the *expected* structured data has been
  captured for the investigation's current stage. This is explicitly and unavoidably a **coverage**
  metric — it says nothing about whether the investigation's conclusions are correct, well-reasoned,
  or high-quality, and every presentation of this score must carry that caveat visibly, not just
  once in a help tooltip.
- **Inputs**: presence/absence of every field the completeness gate (`investigation-workflow.md`
  §8) and the best-practice field list (§4.2) care about, each with a knowledge-base-defined weight
  (gate-required fields weighted higher than optional best-practice fields).
- **Rules**: `score = (sum of weights of populated expected fields) / (sum of weights of all fields
  expected at the current stage) × 100`, computed only against fields relevant to the investigation's
  *current* stage — a `Draft` investigation is never penalized for lacking Root Cause data that
  isn't relevant yet.
- **Outputs**: a percentage plus a per-section breakdown, always paired with the fixed caption
  *"Reflects data completeness only — not investigation quality or correctness."*
- **Confidence**: Not applicable (§3.4) — this is a precise calculation, not an inference.
- **Edge cases**: a low score on a freshly-created investigation is normal and expected; copy should
  contextualize rather than alarm (e.g. *"54% complete — on track for the Draft stage"* rather than
  a bare, unqualified number).

### 4.5 Suggested Follow-up Questions *(existing — FR-036)*

Fully specified in `functional-requirements.md` FR-036; restated here for framework placement:
**Category B**, and — per §3.4's distinction — treated as a light form of Inferential confidence
(High when a specific phrasing pattern matches the prior answer, Low when the generic *"Why did this
happen?"* fallback is used), never persisted without the ordinary FR-035 save step.

### 4.6 Risk Warnings *(new)*

- **Purpose**: flag risk-related conditions that deserve attention before they're overlooked — e.g.
  a high-risk hazard with no mitigating action, or an occurrence sitting at `Immediate` priority
  without movement.
- **Inputs**: `Hazard` initial/residual risk bands, `Occurrence` risk score/band/priority, linked
  Corrective/Preventive Actions, `Investigation.status` and its time in that status.
- **Rules** (examples, each independently configurable in the knowledge base): a `High`/`Critical`
  residual risk band with no linked Preventive Action; an `Immediate` Investigation Priority with the
  investigation still `Open` after a configurable threshold (default 48 hours); a Hazard with
  Initial Risk recorded but no Residual assessment while the investigation is already in `Analysis`.
- **Outputs**: one warning per matched rule, referencing the specific Hazard/Occurrence.
- **Confidence**: Definite (each rule is a clear threshold condition, not a judgment call).
- **Every Risk Warning restates, in miniature, the risk-model disclaimer** (product-spec §11.5) —
  a warning about risk is not a regulatory risk determination.
- **Edge cases**: warnings remain visible (read-only, present tense) after closure — a closed
  investigation's risk picture is still useful historical context, not something to hide.

### 4.7 Corrective-Action Reminders *(new)*

- **Purpose**: proactive, time-based nudges about actions approaching or past their target date —
  more specific than the Overdue badge (FR-046) alone, and specifically calling out actions that are
  both time-sensitive *and* required for closure.
- **Inputs**: `CorrectiveAction`/`PreventiveAction` `targetDate`, `status`, `requiredForClosure`, and
  `Investigation.status`.
- **Rules**: an action due within a configurable window (default 7 days) and not yet `Completed`
  produces a reminder; an Overdue **and** `requiredForClosure = TRUE` action on an investigation
  already in `Review` produces an escalated reminder; an action with no owner assigned at all
  produces a distinct "no responsible person assigned" reminder.
- **Outputs**: one reminder per matched rule, linking to the action.
- **Confidence**: Definite.
- **Edge cases**: `Completed`, `Verified`, and `Cancelled` actions never generate reminders,
  regardless of date (mirrors FR-046's Overdue exclusion rule exactly).

### 4.8 Report Quality Checks *(new)*

- **Purpose**: a pre-flight list of every gap the generated report (`report-spec.md`) would itself
  render as **"Not provided"** or **"Not established"** — surfaced proactively, in one consolidated
  place, rather than only discoverable by reading the entire rendered report end to end.
- **Inputs**: the same 24-section report content defined in `report-spec.md` §5, evaluated at
  generation/preview time.
- **Rules**: this capability deliberately does **not** invent a parallel gap-detection mechanism — it
  enumerates every placeholder occurrence that `report-spec.md` §4 already defines, and reports each
  one as a checkable item (e.g. *"'Potential Root Cause #1' — Confidence Level not established"*).
  It explicitly does **not** perform any writing-quality, grammar, or narrative-tone assessment —
  that would require exactly the kind of text-quality judgment this engine is built to avoid implying
  it can make; scope is strictly structural completeness and consistency.
- **Outputs**: a consolidated list, each item linking to the relevant section.
- **Confidence**: Definite.
- **Edge cases**: a report with no gaps produces an explicit **"No report quality issues found"**
  positive confirmation — unlike Missing-Information Warnings (§4.2), silence alone would be
  ambiguous here (has it been checked and found clean, or not checked at all?), so this capability
  always renders a result, positive or negative.

## 5. Data Model Implications

**None required.** Every Category A capability is computed live and never stored, and every
Category B capability's persistence was already fully specified when it was originally designed
(`Occurrence.suggestedCategory`/`wasSuggestionAccepted` for Classification; the `ContributingFactor`
row itself once accepted; the `FiveWhysEntry` row itself once saved). This entire specification is
additive service-layer logic on top of the existing schema — zero new tables, zero new columns,
zero migrations.

One **optional, non-required** future enhancement is worth naming rather than silently omitting: a
`DismissedSupportNotice(userId, investigationId, noticeKey, dismissedAt)` table would let a user
dismiss a specific recurring Category A notice (e.g. a particular Risk Warning they've already
considered and decided not to act on yet) without it reappearing every page load. This is explicitly
out of scope for this pass — v1 always recomputes and always shows Category A output fresh, which is
simpler and has no staleness risk (§3.3) — but is flagged here so it isn't rediscovered as a surprise
gap later.

## 6. Where Results Surface (UI Placement — Recommendations Only)

This document does not modify `ui-spec.md`; the following are placement recommendations for that
follow-up pass (§8):

- Checklist Suggestions, Missing-Information Warnings, and the Completeness Score fit naturally on
  Investigation Overview (`ui-spec.md` §5) and the workspace shell's right-rail "Investigation
  Support" panel (`ui-spec.md` §2.3).
- Risk Warnings fit on Hazard Analysis (§11) and the Occurrence Details Classification tab (§6).
- Action Reminders fit on Corrective/Preventive Actions (§15) and the Action Tracker (§19).
- Report Quality Checks fit as a pre-flight panel on Report Preview (§17), most valuably surfaced
  *before* Submit for Review, so gaps are visible while they're still cheap to fix.

## 7. Assumptions Specific to This Engine

- **AE-1**: The Category A / Category B split (§3.3) is the organizing principle for every current
  and future Investigation Support capability — a new capability proposed later should be assigned
  to one of the two before anything else about it is designed.
- **AE-2**: No new data-model entities are required by this specification (§5); if a future
  enhancement (e.g. dismissible notices) changes that, it should be scoped and reviewed as its own
  data-model change, not folded silently into this engine's logic.
- **AE-3**: The knowledge base (§3.1) is static, developer-maintained content shipped in the
  codebase — **not** exposed through a runtime admin UI in this version, unlike
  `RiskBandConfiguration` (`data-model.md` §6.4), which *is* runtime-configurable. Updating a
  keyword list or a reminder threshold is a code change reviewed through the normal PR process, not
  a Settings-page edit.
- **AE-4**: The specific numeric thresholds named in §4.6/§4.7 (48 hours, 7 days) are reasonable
  v1 defaults, not tuned values — they are called out explicitly as knowledge-base constants
  specifically so they're easy to find and adjust later without hunting through rule logic.

## 8. Consistency Notes — Required Follow-Up Elsewhere

This document was scoped to `assistance-engine.md` only, per the request. The following follow-up
work is implied but not performed here:

- `functional-requirements.md` needs new FR entries for the six newly-designed capabilities
  (Checklist Suggestions, Missing-Information Warnings, Completeness Score, Risk Warnings, Action
  Reminders, Report Quality Checks) — Module 1 (Dashboard) and Module 20 (Action Tracking) are the
  most likely homes for a couple of these, but a dedicated module may be cleaner given there are six
  new, related requirements; next available IDs are FR-072 onward.
- `ui-spec.md` needs the placements recommended in §6 actually specified with full page-section
  detail (forms/tables/buttons/empty states), not just named.
- `technical-architecture.md` §4.3 currently names only `lib/services/classificationSuggestion.ts`;
  a follow-up pass should generalize this to a small `lib/services/investigationSupportEngine/`
  directory (one module per capability, sharing the label/confidence/explainability conventions
  defined here) so the existing and new capabilities live under one consistent implementation
  structure rather than one bespoke file plus five newly-scattered ones.

Independent of this pass, the previously-flagged outstanding items remain unaffected:
`functional-requirements.md`'s old 5-state status names (§0.3, FR-011, FR-049–FR-054), and
`report-spec.md`'s partially-resolved `InvestigationHistory`/`InvestigationReview` timeline
interleaving.

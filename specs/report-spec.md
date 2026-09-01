# Report Specification — Aviation Incident Investigation Assistant

This revision replaces the previous report specification in full. It is the first pass to bring
the report current with the classification, risk, root-cause, action, and evidence redesigns from
the last five specification revisions (see §9's consistency note) and adds the explicit
FACTS / INVESTIGATOR ASSESSMENT / RECOMMENDATIONS structure and the "no fabrication" placeholder
rule required for this pass.

## 1. Purpose

Every investigation can produce a single, coherent, professional report compiling all recorded
data. The report is the primary "portfolio deliverable" artifact of the application — it should
read like a credible, if simplified and clearly labeled as non-official, aviation occurrence
investigation report (product-spec §11.2, §11.4, §11.5).

## 2. Delivery Mechanism (assumption A7 — unchanged)

- **Primary**: a print-optimized HTML view at a dedicated route (e.g. `/investigations/:id/report`),
  styled with print CSS (`@media print`) so the browser's native "Print → Save as PDF" produces a
  clean multi-page PDF with page numbers, headers, and no UI chrome. No server-side rendering
  service and no external API of any kind is used to produce it (NFR-1.1).
- **Secondary**: raw JSON export of the full investigation record (FR-058), for data portability and
  to support resetting/reseeding demo data.
- **Rejected alternative**: server-side headless-browser PDF generation (e.g. Puppeteer). Noted as a
  possible future enhancement but excluded from v1 to avoid brittle headless-Chromium dependencies on
  constrained/free-tier hosting (ties to NFR deployability goals) — see RPT-1.

## 3. The FACTS / INVESTIGATOR ASSESSMENT / RECOMMENDATIONS Structure

This is the report's central organizing requirement, binding on every section below. Every section
from §5.5 onward (the body of the report) carries one explicit classification banner at its top,
rendered as a full-width colored label distinct from ordinary headings:

| Banner | Meaning | Color (per `ui-spec.md` §1.2 language) |
|---|---|---|
| **FACTS** | Directly recorded, objective data — what was observed, measured, or reported, with no interpretation | Slate/neutral |
| **INVESTIGATOR ASSESSMENT** | The investigating team's professional judgment, analysis, or synthesis — always attributable to a human investigator, never presented as proven or official (product-spec §11.1, §11.6) | Violet |
| **RECOMMENDATIONS** | Actions proposed or in progress as a result of the assessment | Amber |
| **ADMINISTRATIVE RECORD** | Process/procedural record-keeping — review decisions, closure, and standing legal notices — neither a fact about the occurrence nor an analytical judgment about it | Blue |

Sections are **not** physically reordered or regrouped to cluster by classification — they appear in
the exact sequence requested (§5), each individually and unambiguously labeled. This was a
deliberate choice: relabeling every section in place is a more literal, lower-risk implementation of
"clearly distinguish X from Y from Z" than silently reordering the document into implicit parts, and
it keeps the numbered section order exactly as specified. A handful of sections are internally mixed
(e.g. Evidence Reviewed logs objective items but also carries investigator-assigned Relevance/
Reliability judgments) — in those cases, the section banner reflects its *primary* content and the
assessment-carrying columns/fields carry their own inline "Assessment" sub-label so the distinction
holds even within one table.

## 4. Missing-Information Placeholders (No Fabrication)

The report **never** invents, infers, or approximates a value to fill a gap — no generated filler
text, no "TBD," no plausible-sounding guess. Exactly one of two fixed strings is shown, chosen by
what kind of gap it is:

- **"Not provided"** — a descriptive/factual field that was simply never entered (e.g. PIC License
  Number, Alternate Aerodrome, Serial Number, Department, Verification Notes, Investigator Notes).
  The data *could* exist but nobody recorded it.
- **"Not established"** — an analytical conclusion that has not yet been reached (e.g. Risk
  Score/Band before Actual/Potential Outcome are recorded, a Root Cause before one is identified
  *or* the inconclusive override is used, an Effectiveness Result before an action is Verified, the
  Investigation Conclusion before any Finding or Root Cause exists). The gap is in *judgment*, not
  in a data-entry field.

A whole list-type section with zero rows (e.g. no Immediate Actions logged) uses the existing
explicit "No … recorded" wording already established for on-screen empty states
(`investigation-workflow.md` §9, `ui-spec.md` per-page Empty States) — consistent phrasing between
the live app and the generated report, so nothing reads as if it were dropped rather than genuinely
absent.

## 5. Report Structure

### 5.0 Cover Page (front matter — items 1–4)

- **1. Report Title**: fixed heading **"Aviation Occurrence Investigation Report"** followed by the
  investigation's own `Investigation.title`.
- **2. Investigation Number**: `Investigation.referenceNumber` (e.g. `INC-2026-0031`).
- **3. Date**: shown as two distinct, separately labeled dates to avoid ambiguity — **Occurrence
  Date** (`Occurrence.occurrenceDateUtc`) and **Report Generated** (the current UTC timestamp at
  render time, since the report is always regenerated live, not stored — RPT-2).
- **4. Investigation Status**: the current 6-state status (`Draft`/`Open`/`Under Investigation`
  /`Analysis`/`Review`/`Closed`) as a StageBadge-equivalent. A prominent **"DRAFT"** watermark
  appears on every page while status is not `Closed` (§8, carried forward from the prior revision).
- Category/severity/priority badges (Occurrence Category, Severity, Investigation Priority) for
  at-a-glance triage — full detail follows in §5.1 and §5.3.
- The short disclaimer banner (product-spec §11.2) reproduced in full; the complete consolidated
  disclaimer is item 24 (§5.20).
- A brief auto-generated table of contents listing all 24 items in order.

### 5.1 Occurrence Summary — item 5 — **[FACTS]**

Occurrence Date/Time (UTC + local if provided), Phase of Flight, Occurrence Category and
Subcategory (`data-model.md` §6.6 — footnoted with the regulator-neutrality disclaimer, product-spec
§11.4), Brief Description, full Narrative Description, and **Actual Outcome** (`actualOutcomeSeverity`
+ `actualOutcomeDescription`) — the realized consequence is a fact about what happened, not a
judgment, so it belongs here rather than in Risk Assessment (§5.13). Missing Subcategory or Actual
Outcome fields show "Not provided."

### 5.2 Aircraft Information — item 6 — **[FACTS]**

All `Aircraft` fields (registration, manufacturer, model, serial number, year, operator, engine
type/count, damage level). Optional fields absent show "Not provided."

### 5.3 Flight Information — item 7 — **[FACTS]**

All `Flight` fields (flight number, flight rules, departure/destination/alternate, PIC name/license,
crew complement). "Not provided" for optional gaps (e.g. no Flight Number, no Alternate Aerodrome).

### 5.4 Location — item 8 — **[FACTS]**

All `Location` fields (location description, coordinates, aerodrome code, weather, runway, lighting,
terrain). Weather/runway/terrain fields are individually optional and show "Not provided" when
absent, rather than omitting the row.

### 5.5 Persons Involved — item 9 — **[FACTS]**

Table: Name, Role, License Number, Nationality, Injury Level, Notes. Injury summary counts
(FR-018) shown as a header line above the table. If `noPersonsInvolvedConfirmed = TRUE`, the section
reads "No persons were involved in this occurrence" instead of an empty table (distinguishing
confirmed-zero from not-yet-recorded, per FR-016).

### 5.6 Immediate Actions — item 10 — **[FACTS]**

Table: Description, Taken By, Date/Time, Action Type. "No immediate actions recorded" if empty.

### 5.7 Evidence Reviewed — item 11 — **[FACTS, with inline ASSESSMENT columns]**

- **Evidence log** (primary content, FACTS): Evidence ID, Type (`data-model.md` §6.10's 10-category
  taxonomy), Description, Source, Collected By, Date Obtained. "Not provided" for optional gaps
  (e.g. no Collected By).
- **Assessment columns** (inline-labeled "Investigator Assessment," not a separate section):
  Relevance, Reliability Assessment (+ Reliability Notes), Investigator Notes. "Not established" if
  Relevance/Reliability were never set (should not normally occur, since both are required at entry
  per FR-021, but defensively specified).
- **Related Findings**: each evidence row cross-references the Finding number(s) it supports
  (`EvidenceFindingLink`), or "Not yet linked to a finding."
- **Witness statements** (RPT-4 — see §9): included as a labeled subsection here rather than as a
  separate top-level item, since witness testimony is evidentiary in nature even though `Witness` is
  a distinct entity from `Evidence` in the data model. Table: Name, Witness Type, Statement Summary,
  Statement Date, Reliability Assessment. Contact information is deliberately **not** shown here —
  see Appendix B (§6).
- Attachments are referenced (file name, type, size, and a visible **"Simulated attachment"** label
  when `isSimulated = TRUE`, `data-model.md` §6.10.2) rather than embedded, keeping report generation
  fast (NFR-3.3) and never presenting placeholder content as if it were genuine (§6.11).

### 5.8 Established Facts — item 12 — **[FACTS — synthesis]**

A concise, numbered recap of the key facts already recorded in §5.1–§5.7, **system-composed by
restating stored field values** — never independently authored free text. This guarantees the
section can never contain anything beyond what is already on record (the same "cannot fabricate"
guarantee applies here by construction, not just by instruction). Example composition rule: one line
per populated key fact (occurrence date/category, aircraft type and damage, injury summary,
immediate actions taken, evidence count) — a fact with no underlying data simply does not produce a
line, rather than producing a placeholder line, since this section is a *recap*, not a checklist.

### 5.9 Hazard Assessment — item 13 — **[INVESTIGATOR ASSESSMENT]**

Table per Hazard: Description, Category, Initial Likelihood/Severity/Score/Band, Existing Controls,
Residual Likelihood/Severity/Score/Band (`data-model.md` §3.12, §6.9). A hazard with no residual
assessment yet shows "Not established" in the residual columns, not the initial ones. The risk-model
disclaimer (product-spec §11.5) is footnoted once at the top of this section and again at §5.10,
since both sections use the same scoring model.

### 5.10 Risk Assessment — item 14 — **[INVESTIGATOR ASSESSMENT]**

Occurrence-level risk, distinct from per-hazard risk (§5.9) — this section covers the classification
risk model (`data-model.md` §6.5–§6.6): Potential Outcome (severity + description), Likelihood of
Recurrence, computed **Severity** (with a "Computed" or "Overridden" badge and, if overridden, its
justification), computed **Risk Score/Band** (with the same badge treatment), computed
**Investigation Priority** (noting if the Dangerous Goods/Security category floor applied). Any of
these show "Not established" until Actual/Potential Outcome and Likelihood of Recurrence are
recorded (FR-066/FR-067).

### 5.11 Contributing Factors — item 15 — **[INVESTIGATOR ASSESSMENT]**

List grouped by the 10-category framework (`data-model.md` §6.7), with linked Hazards noted per
factor. "No contributing factors identified" if empty (joint completeness rule with Hazards,
`investigation-workflow.md` §8).

### 5.12 5 Whys — item 16 — **[INVESTIGATOR ASSESSMENT]**

Each `FiveWhysAnalysis` rendered as its Problem Statement followed by its Why-chain (Why #1 through
however many entries were recorded — up to 5, early stopping shown exactly as recorded, never padded
with placeholder entries to reach 5). "No 5 Whys analyses recorded" if none exist — this is
explicitly optional and does not itself indicate a gap in the investigation (a Root Cause may be
recorded without one, `data-model.md` §6.8).

### 5.13 Root-Cause Analysis — item 17 — **[INVESTIGATOR ASSESSMENT]**

Each `RootCause` entry, always headed **"Potential Root Cause"** (never "Root Cause" or "Confirmed
Cause") under an **"Investigator Assessment"** sub-heading, per the binding non-declaration principle
(product-spec §11.6): Description, Category, linked 5 Whys analysis and/or Contributing Factors,
**Supporting Evidence**, **Investigator Notes**, and **Confidence Level** (Low/Medium/High, shown as
a visible badge). An entry using the inconclusive override instead shows "Root cause could not be
conclusively identified" with its justification, styled distinctly (muted, not a normal conclusion
card). If no root cause is recorded at all and no override is used, this section shows "Not
established."

### 5.14 Investigation Findings — item 18 — **[INVESTIGATOR ASSESSMENT — synthesis]**

Each `InvestigationFinding`, numbered (Finding 1, Finding 2, …) with its Finding Type
(Cause/Contributing Factor/Risk Observation/Other), Description, and cited Hazards/Contributing
Factors/Root Causes/Evidence (via the four link tables, `data-model.md` §3.22). Always
human-authored (DM-7) — never subject to the Investigation Support confirm-before-persist rule,
since it is never system-generated. "No findings recorded yet" if empty — Findings are
encouraged but not gating (`ui-spec.md` UI-6).

### 5.15 Corrective Actions — item 19 — **[RECOMMENDATIONS]**

Table: Action ID, Description, Root Cause/Hazard Addressed, Responsible Person, Department,
Priority, Target Date, Status (including derived Overdue), Completion Date, Verification Method,
Effectiveness Result, Investigator Comments, Required-for-Closure indicator (`data-model.md` §3.19,
§6.9). "Not established" for Verification Method/Effectiveness Result before an action reaches
`Verified`; "Not provided" for an unset Department or Investigator Comments. "No corrective actions
defined" if empty.

### 5.16 Preventive Actions — item 20 — **[RECOMMENDATIONS]**

Same table shape as §5.15, drawn from `PreventiveAction`. "No preventive actions defined" if empty.

### 5.17 Investigation Conclusion — item 21 — **[INVESTIGATOR ASSESSMENT — synthesis]**

A closing synthesis, **system-composed from recorded Findings and Root Causes** (§5.13–§5.14) —
never a free-typed narrative field, for the same no-fabrication reason as Established Facts (§5.8).
Composition rule: if one or more Findings exist, list them; otherwise if one or more Root Causes
exist, summarize them; otherwise show **"Not established"**. Wording always frames the content as
the investigating team's assessment (e.g. "The investigation identified the following potential
root cause(s)…"), never as a proven determination, consistent with product-spec §11.6 — this
section is a recap of prior assessment content, not a new, separately-authored conclusion that could
drift from or overstate what was actually recorded.

### 5.18 Reviewer Comments — item 22 — **[ADMINISTRATIVE RECORD]**

Full `InvestigationReview` history — reviewer name, decision (Approved/Changes Requested), comments,
timestamp — in chronological order, interleaved with any `InvestigationHistory` reopen events so the
full review-and-rework cycle reads as one timeline (per the still-outstanding `InvestigationHistory`
integration noted in §9). "No review decisions yet" if the investigation has never been submitted.

### 5.19 Closure Information — item 23 — **[ADMINISTRATIVE RECORD]**

`closedAt` (or "Not established" if never closed), `reopenReason` and full reopen history if
applicable, and — when closure occurred while required actions were incomplete — the ADMIN override
justification recorded at that time (`data-model.md` §6.9.3), shown explicitly rather than hidden,
since a bypassed gate is exactly the kind of thing a report reader should be able to see.

### 5.20 Disclaimer — item 24 — **[Standing Notice]**

The full consolidated disclaimer, combining every binding disclaimer rule established across this
specification set — not a fragment of one, since this is the one section whose entire purpose is
being the complete statement:

> *"This report was generated by the Aviation Incident Investigation Assistant using simulated,
> fictional data for demonstration purposes only. It is not affiliated with any aviation authority
> and must not be used for real safety investigations or regulatory reporting (product-spec §11.2).
> The occurrence classification taxonomy, risk scoring model, and investigation priority scheme used
> in this report are internally-defined structures created for this application; they do not
> represent, and must not be presented as, the official classification or risk-assessment
> methodology of ICAO, any National Aviation Authority, IATA, or any other regulatory or industry
> body (product-spec §11.4, §11.5). Any content labeled 'Suggested,' 'Potential,' or 'Recommended'
> was generated by a local, rule-based decision-support feature and was reviewed and confirmed (or
> overridden) by a human investigator before being included here (product-spec §11.1). Every
> statement in the Investigator Assessment sections of this report, including every item labeled
> 'Potential Root Cause,' reflects the investigating team's professional judgment based on available
> evidence at the time of writing — it is not a proven, official, or legally binding determination
> of cause (product-spec §11.6)."*

## 6. Appendices (supplementary, not among the 24 numbered items)

- **Appendix A — Evidence & Attachment Index**: full attachment list (file name, type, size,
  uploader, simulated/real status) across every evidence item, for quick reference separate from the
  narrative evidence log in §5.7.
- **Appendix B — Witness Contact Index** *(sensitive — muted callout box)*: witness contact
  information, deliberately separated from §5.7's statement content and from the main body, mirroring
  real investigation-report handling practice for witness PII (carried forward from the prior
  revision; no real privacy risk exists since all data is fictional, product-spec A8).
- **Appendix C — Full Audit Metadata**: `Investigation.createdAt`/`updatedAt`/`closedAt`,
  `assignedInvestigatorUserId` history, and involved user names — the complete `InvestigationHistory`
  timeline (module 25), for a reader who wants the full procedural record beyond §5.18–§5.19's
  narrative summary.

## 7. Formatting Rules

- Each of the 24 items (plus the Cover Page and Appendices) starts on a clear visual break; the
  Cover Page, each Part-equivalent transition (Facts → Assessment → Recommendations, by content, not
  by physical reordering — §3), and each Appendix start on a new printed page via CSS page-break
  rules.
- The classification banner (§3) renders identically in both screen and print CSS — it is core
  content, not a screen-only UI affordance.
- Consistent badge styling for status/severity/risk/priority carries over from the screen UI
  (`ui-spec.md` §1.2, §4) so the report is visually consistent with the app.
- Empty sections render their explicit "No … recorded" line (§4) rather than being silently omitted,
  so the report is always structurally complete and reviewable — a reader can distinguish "checked,
  found nothing" from "never checked."
- A running footer includes: reference number, page number, and "SIMULATED DATA — DEMONSTRATION
  PURPOSES ONLY."

## 8. Report Availability by Status (unchanged mechanism)

Per FR-056: the report can be generated/viewed at any investigation status, always reflecting live
data until `Closed`. While not `Closed`, the cover page displays a prominent "DRAFT" watermark/badge
(§5.0). Once `Closed`, the watermark is removed and the report is presented as the final record
(still regenerated from live data on each view, but the underlying data is no longer editable per
the workflow state machine, so it is effectively frozen — RPT-2).

## 9. Assumptions Specific to Reporting

- **RPT-1**: No server-side PDF rendering dependency (avoids Puppeteer/Chromium in the deployment
  image, and avoids any external rendering API) — browser print-to-PDF is sufficient for a portfolio
  demonstration and keeps the container small and reliable.
- **RPT-2**: Report content is always derived live from current data rather than stored as an
  immutable snapshot row, even for closed investigations — simpler implementation, and acceptable
  since closed investigations are read-only at the data layer (`investigation-workflow.md` §3).
- **RPT-3**: Attachments are referenced (linked/listed), never inlined as embedded images, keeping
  report generation fast (NFR-3.3) and the HTML payload small — this applies equally to simulated
  and real attachments.
- **RPT-4 (this revision)**: Witness statements are included as a labeled subsection of "Evidence
  Reviewed" (§5.7) rather than as a separate top-level report item, since the 24-item list for this
  revision does not name a standalone Witnesses section, and testimonial content is evidentiary in
  nature. This is an editorial placement decision only — no data-model change, and witness contact
  information is still kept separate (Appendix B) from statement content for the same
  privacy-practice reasons as before.
- **RPT-5 (this revision)**: "Established Facts" (§5.8) and "Investigation Conclusion" (§5.17) are
  both system-composed recaps of already-recorded structured data, never free-typed fields — this is
  the specific mechanism that satisfies "the system must not fabricate missing information" for two
  sections that could otherwise be mistaken for open narrative fields.

**Consistency note**: this revision finally addresses the report-spec follow-up flagged across the
last five specification passes (classification/risk fields, enriched root-cause fields, expanded
action fields, evidence fields, and the `InvestigationFinding` entity are now all reflected). One
item remains only partially resolved: §5.18's "interleaved with `InvestigationHistory` reopen
events" describes the intended combined timeline, but `ui-spec.md` §17 (Report Preview) and
`investigation-workflow.md` have not yet been cross-checked against this exact interleaving
description — worth a follow-up pass focused specifically on that timeline presentation. This
document was explicitly scoped to `report-spec.md` only for this pass, so no other file was
modified.

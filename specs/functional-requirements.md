# Functional Requirements — Aviation Incident Investigation Assistant

This document supersedes the previous functional-requirements.md in full. It is derived from the
approved `product-spec.md` (5-role model, §8; non-authoritative wording policy, §11) and replaces the
prior 4-role (Admin/Investigator/Reviewer/Viewer) requirement set.

**Revision note**: this pass expands Module 1 (Dashboard) with a full metric dictionary (§1.0), a
richer set of tiles/visualizations, and a new dashboard-wide filter capability (FR-065). FR-001–FR-004
are updated in place (not renumbered, per §0.1); FR-065 is newly added. This also does **not** update
the 5-state references elsewhere in this document (§0.3 and FR-011/FR-040–FR-054 still reflect the
prior workflow model) — see `data-model.md` §12 for that still-outstanding follow-up.

**Revision note (occurrence classification pass)**: Module 13 is redesigned around the 14-category
taxonomy, the actual/potential outcome distinction, and computed risk-level/priority fields defined
in `data-model.md` §3.3/§6.5/§6.6. FR-027–FR-028 updated in place; FR-066–FR-067 newly added.

**Revision note (risk assessment module pass)**: Module 14 is redesigned around the numeric
Likelihood×Severity formula and configurable risk bands in `data-model.md` §6, with Initial and
Residual risk assessment. FR-029 updated in place; FR-068–FR-069 newly added. The dashboard's
High-Risk Findings tile (§1.0.2) now reads `Hazard.residualRiskBand` (falling back to
`initialRiskBand`) instead of the retired `riskRating` field.

**Revision note (root cause analysis module pass)**: Module 16's 5 Whys chain is capped at 5 entries
(was 10); Module 17's Root Cause is enriched with Supporting Evidence, Investigator Notes, and
Confidence Level, always labeled "Potential Root Cause" under an "Investigator Assessment" heading
per product-spec §11.6; Module 15's Contributing Factor category now uses the 10-value framework in
`data-model.md` §6.7 (was 5 values). FR-031/FR-035 updated in place; FR-038/FR-039 substantially
rewritten. The dashboard's Contributing-Factor Distribution chart (§1.0.3) now shows all 10
categories.

**Revision note (corrective/preventive action module pass)**: Modules 18–20 are redesigned around
the expanded field set and status lifecycle in `data-model.md` §3.19–§3.20/§6.9 — `targetDate`
(renamed from `dueDate`), Department, Verification Method, Effectiveness Result, Investigator
Comments, Required for Closure, and reciprocal Root Cause/Hazard links on both action types. The
status set grows from 4 to 6 stored values (`Assigned`, `Verified` added), with `Verified` requiring
independent confirmation by someone other than the action's owner (FR-045b). FR-040–FR-043 updated
in place (also correcting a stale reference to the pre-DM-2 unified `Action` table); FR-044/FR-046
–FR-048 updated in place; FR-045 split into FR-045a/FR-045b; FR-070 newly added for a
portfolio-wide Action Tracker. The investigation-closure hard gate on `requiredForClosure` actions
is defined in `data-model.md` §6.9.3 and `investigation-workflow.md` §9.6, not duplicated here.

**Revision note (evidence management system pass)**: Module 11 is redesigned around the 10-category
evidence taxonomy, the expanded field set (Source, Date Obtained, Relevance, Reliability Assessment,
Investigator Notes), the `EvidenceFindingLink` relationship, and the `StorageProvider` abstraction
that keeps "simulated attachments now, real storage later" concrete rather than aspirational
(`data-model.md` §3.9–§3.10, §6.10–§6.11). FR-021–FR-024 updated in place; FR-071 newly added.

## 0. Conventions

### 0.1 Requirement IDs
Each requirement has a unique, sequential ID (`FR-001`, `FR-002`, …) independent of module grouping.
IDs are permanent once assigned; a future requirement removed in a later revision is marked
**Deprecated**, never reused or renumbered. When one requirement is later split into two closely
related ones (e.g. FR-045 → FR-045a/FR-045b), a lettered suffix is used instead of a new number, to
preserve the lineage back to the original requirement.

### 0.2 Role Shorthand
Per `product-spec.md` §8:

| Shorthand | Role |
|---|---|
| ADMIN | Administrator |
| MANAGER | Investigation Manager |
| INVESTIGATOR | Investigator |
| REVIEWER | Reviewer |
| VIEWER | Viewer |

**Blanket rules** (not repeated in every FR): **ADMIN** can perform every action in this document
unless a requirement explicitly restricts it (e.g., review approval is intentionally reserved to
REVIEWER for independence, per product-spec §8.1 — ADMIN retains an emergency override noted where
relevant). **VIEWER** may perform any *view-only* action on non-draft investigations without being
listed explicitly on write-oriented requirements.

### 0.3 Investigation Status Recap
**Corrected during Phase 4 implementation (spec-review.md SR-003) to the current 6-state model** —
this recap previously described a retired 5-state model. Current model, per `data-model.md` §3.2
and `investigation-workflow.md` §3: `Draft → Open → UnderInvestigation → Analysis → Review →
Closed`. The first three transitions are automatic (gate-satisfied); the last two are manual
ceremony actions (submit for review; review decision). Two backward transitions exist:
`Review → Analysis` (Request Changes) and `Closed → UnderInvestigation` (Reopen). There is no
stored `CHANGES_REQUESTED` status — "changes requested" is a review *decision*, not an investigation
status. Full state machine: `investigation-workflow.md`.

Modules 21–22 (FR-049–FR-064) still use the retired names in their own text and are corrected in
Phase 10 (implementation-plan.md), when those modules are rebuilt — this recap is corrected now
because Phase 4 (FR-005–FR-011, FR-059–FR-061) needs the exact stored enum values from day one.

### 0.4 Investigation Support Terminology Policy (binding — product-spec §11.1)
Any requirement that generates or suggests content must use exactly one of: **"Investigation
Support"** (feature-area label), **"Suggested Classification"**, **"Potential Contributing Factor"**,
**"Recommended Follow-up"**. No such requirement may persist its output as confirmed investigation
data without an explicit human confirmation step, and no such output may be worded or styled as an
authoritative finding.

### 0.5 Terminology Note
**Corrected during Phase 4 implementation**: `data-model.md` renamed the entity `Incident` →
`Investigation` in its own subsequent revision — there is no `Incident` table. `Investigation` is
the canonical name both in prose and as the data-model entity/table name; `investigationId` is the
FK field name. FR text still reading `Incident`/`incidentId` outside Phase 4's modules (2, 3, 4, 24)
is corrected in Phase 10 alongside the status-name cleanup in §0.3.

### 0.6 Open Follow-Up Flagged By This Revision
**Resolved**: `Investigation.assignedInvestigatorUserId` was added to `data-model.md` §3.2 (Phase 2
of `implementation-plan.md`), formally defined with its validation rule (must reference a User with
role Investigator, enforced at the application layer — data-model.md DM-9). No longer an open
follow-up.

### 0.7 Module Index

| # | Module | Requirement IDs |
|---|---|---|
| 1 | Dashboard | FR-001 – FR-004, FR-065 |
| 2 | Investigation Creation | FR-005 – FR-006 |
| 3 | Investigation List | FR-007 – FR-008 |
| 4 | Investigation Detail | FR-009 – FR-011 |
| 5 | Occurrence Information | FR-012 |
| 6 | Aircraft Information | FR-013 |
| 7 | Flight Information | FR-014 |
| 8 | Location Information | FR-015 |
| 9 | Persons Involved | FR-016 – FR-018 |
| 10 | Witness Management | FR-019 – FR-020 |
| 11 | Evidence Management | FR-021 – FR-024, FR-071 |
| 12 | Immediate Actions | FR-025 – FR-026 |
| 13 | Occurrence Classification | FR-027 – FR-028, FR-066 – FR-067 |
| 14 | Hazard Identification | FR-029 – FR-030, FR-068 – FR-069 |
| 15 | Contributing Factors | FR-031 – FR-033 |
| 16 | 5 Whys Analysis | FR-034 – FR-037 |
| 17 | Root-Cause Analysis | FR-038 – FR-039 |
| 18 | Corrective Actions | FR-040 – FR-041 |
| 19 | Preventive Actions | FR-042 – FR-043 |
| 20 | Action Tracking | FR-044, FR-045a – FR-045b, FR-046 – FR-048, FR-070 |
| 21 | Investigation Review | FR-049 – FR-052 |
| 22 | Investigation Closure | FR-053 – FR-055 |
| 23 | Report Generation | FR-056 – FR-058 |
| 24 | Search and Filtering | FR-059 – FR-061 |
| 25 | Audit/History Information | FR-062 – FR-064 |

---

## 1. Dashboard

### 1.0 Dashboard Metric Definitions (authoritative — referenced by FR-001–FR-003, FR-065)

All dashboard numbers are computed live, server-side, over a **filtered investigation set** (§1.0.1).
Every tile, chart, and the Recent Investigations list operate over the *same* filtered set, so the
dashboard is always internally consistent (e.g., the four stage tiles always sum to the Total tile).

#### 1.0.1 The Filtered Investigation Set

```
FilteredInvestigations =
  SELECT i.* FROM Investigation i
  LEFT JOIN Occurrence o  ON o.investigationId = i.id
  LEFT JOIN Aircraft  ac  ON ac.investigationId = i.id
  LEFT JOIN Location  loc ON loc.investigationId = i.id
  WHERE (:dateFrom IS NULL OR o.occurrenceDateUtc >= :dateFrom)
    AND (:dateTo   IS NULL OR o.occurrenceDateUtc <= :dateTo)
    AND (:statusFilter    IS EMPTY OR i.status IN :statusFilter)
    AND (:categoryFilter  IS EMPTY OR o.occurrenceCategory IN :categoryFilter)
    AND (:aerodromeFilter IS EMPTY OR loc.aerodromeCode IN :aerodromeFilter)
    AND (:aircraftFilter  IS EMPTY OR ac.model IN :aircraftFilter)
    AND (:severityFilter  IS EMPTY OR o.severity IN :severityFilter)
```

`LEFT JOIN` is used throughout (not `INNER JOIN`) so an investigation with not-yet-populated
Aircraft/Location data (e.g. a brand-new `Draft`) is still included whenever no filter targets that
dimension — it simply won't match if such a filter *is* applied, which is the correct behavior. With
no filters applied (the default state on page load), `FilteredInvestigations` = every investigation
in the system.

#### 1.0.2 Tile Definitions

| Tile | Formula | Notes |
|---|---|---|
| **Total Investigations** | `COUNT(*)` over `FilteredInvestigations` | Includes every status, `Draft` included. |
| **Open Investigations** | `COUNT(*)` WHERE `status IN ('Draft','Open')` | Grouped: pre-fact-finding stages. |
| **Under Investigation** | `COUNT(*)` WHERE `status IN ('UnderInvestigation','Analysis')` | Grouped: active fact-finding and causal-analysis stages. |
| **Awaiting Review** | `COUNT(*)` WHERE `status = 'Review'` | Single stage. |
| **Closed Investigations** | `COUNT(*)` WHERE `status = 'Closed'` | Single stage. |
| **Overdue Corrective Actions** | `COUNT(*)` from `CorrectiveAction` joined to `FilteredInvestigations` WHERE `targetDate < CURRENT_DATE AND status IN ('Open','Assigned','InProgress')` | Scoped to `CorrectiveAction` only, per this specification — `PreventiveAction` overdue items are visible on the Corrective/Preventive Actions page (`ui-spec.md` §15) and the portfolio-wide Action Tracker (FR-070) but are not part of this tile. |
| **High-Risk Findings** | `COUNT(*)` from `Hazard` joined to `FilteredInvestigations` WHERE `residualRiskBand IN ('High','Critical') AND status <> 'Closed'` (falls back to `initialRiskBand` for a hazard with no residual assessment yet recorded) | **Terminology note**: this label uses "finding" in the common safety-reporting sense (a high-risk item surfaced by the investigation), not the `InvestigationFinding` entity, which carries no risk score in `data-model.md`. **Uses residual risk, not initial** — residual reflects current real-world exposure after existing controls, which is the more actionable number for a portfolio-level "needs attention" metric (`data-model.md` §3.12). Scoped to non-`Closed` investigations for the same reason; a smaller secondary label may show the all-time total (including closed) alongside it. |
| **Recent Investigations** | `FilteredInvestigations` ORDER BY `createdAt DESC` LIMIT 8 | Now respects the active dashboard filters (§1.0.1) — a behavior change from the prior revision, where this list was always unfiltered. |

**Invariant**: Open Investigations + Under Investigation + Awaiting Review + Closed Investigations =
Total Investigations, always (every status maps to exactly one of the four buckets).

#### 1.0.3 Visualization Definitions

| Visualization | Formula | Notes |
|---|---|---|
| **Investigations by Status** | `GROUP BY status, COUNT(*)` over `FilteredInvestigations` | All 6 statuses shown, including zero-count ones — not collapsed into the 4 tile buckets. |
| **Investigations by Occurrence Category** | `GROUP BY COALESCE(o.occurrenceCategory, 'Unclassified'), COUNT(*)` | An investigation not yet classified (`Occurrence.occurrenceCategory IS NULL`) falls into an explicit "Unclassified" bucket rather than being dropped. |
| **Incidents by Location** | `GROUP BY COALESCE(loc.aerodromeCode, 'Unspecified'), COUNT(*)`, ranked descending, top 10 shown with the remainder summed into "Other" | Rendered as a ranked horizontal bar chart, **not** a geographic map — a real map would need an external mapping/tile provider and an API key, which `non-functional-requirements.md` NFR-1.1 disallows. This is a deliberate substitution, not an oversight. |
| **Contributing-Factor Distribution** | `GROUP BY category, COUNT(*)` over `ContributingFactor` joined to `FilteredInvestigations` | All 10 fixed categories shown (`data-model.md` §6.7), including zero-count ones — full distribution, not a "top N". |
| **Corrective-Action Status** | Bucketed over `CorrectiveAction` joined to `FilteredInvestigations`: `Completed`, `Verified`, `Cancelled` (direct `status` match), `Overdue` (`targetDate<today AND status IN ('Open','Assigned','InProgress')`), `Open`/`Assigned`/`InProgress` (direct `status` match, excluding rows already counted as Overdue) | 7 segments total, matching the full `ActionStatus` set (`data-model.md` §6.9). Mirrors the FR-046 display rule exactly — a stored `Open`/`Assigned`/`InProgress` row that is past due appears **only** in the `Overdue` bucket, never double-counted. |
| **Monthly Investigation Trend** | `GROUP BY strftime('%Y-%m', o.occurrenceDateUtc), COUNT(*)`, zero-filled for missing months | Default window: trailing 12 months ending the current month. If a Date Range filter (§1.0.1) is active, the chart instead buckets by month across the selected range (capped at 24 months; a wider range shows a note to narrow it for readability). |

**Change from the prior revision**: the previous "Investigations by Severity" chart is superseded —
Severity is now a filter dimension (§1.0.4) instead of a standalone chart, matching the exact 6
visualizations required for this pass. It can be reinstated as a 7th chart later without conflicting
with anything here, if a standalone severity breakdown is still wanted alongside filtering.

#### 1.0.4 Filters

| Filter | Applies to | Values |
|---|---|---|
| Date Range | `Occurrence.occurrenceDateUtc` | From/To date pickers, both optional |
| Status | `Investigation.status` | Multi-select over the 6-state enum |
| Occurrence Category | `Occurrence.occurrenceCategory` | Multi-select over the fixed category enum |
| Airport/Location | `Location.aerodromeCode` | Multi-select, options populated from distinct values present in the data |
| Aircraft Type | `Aircraft.model` | Multi-select, options populated from distinct values present in the data |
| Investigation Severity | `Occurrence.severity` | Multi-select over the fixed severity enum |

All filters combine with **AND** logic (§1.0.1); an investigation with no value for a filtered
dimension (e.g., no Aircraft recorded yet) is excluded once that dimension's filter is active — this
is correct, expected behavior, not a bug. Filters persist in the URL (shareable/bookmarkable, same
pattern as FR-061) and apply uniformly to every tile, every chart, and the Recent Investigations list.

### FR-001 — View Dashboard Summary Statistics
- **Purpose**: Give any user an immediate, actionable overview of investigation activity across the
  portfolio.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: None required (page load); the active filter set from FR-065, if any.
- **Outputs**: 7 stat tiles per §1.0.2 — Total Investigations, Open Investigations, Under
  Investigation, Awaiting Review, Closed Investigations, Overdue Corrective Actions, High-Risk
  Findings.
- **Validation Rules**: N/A (read-only, server-computed per §1.0.1–§1.0.2).
- **Success Behavior**: Tiles render with live counts computed from current database state and the
  active filters on every page load/filter change (not cached beyond the request).
- **Error Behavior**: If statistics computation fails server-side, the dashboard shows a non-blocking
  inline error on the affected tile(s) only ("Unable to load this statistic") rather than failing the
  whole page.
- **Empty State**: With zero investigations matching the active filters, all tiles show `0`.
- **Edge Cases**: The Open/Under Investigation/Awaiting Review/Closed tiles always sum to the Total
  tile (§1.0.2 invariant) — a mismatch would indicate a status value outside the defined enum, which
  should never occur given `data-model.md`'s `CHECK` constraint.

### FR-002 — View Dashboard Visualizations
- **Purpose**: Visualize the distribution, geography, causal patterns, and trend of investigations
  and their actions for portfolio-level insight.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: None required (page load); the active filter set from FR-065.
- **Outputs**: The 6 visualizations defined in §1.0.3 — Investigations by Status, Investigations by
  Occurrence Category, Incidents by Location, Contributing-Factor Distribution, Corrective-Action
  Status, Monthly Investigation Trend.
- **Validation Rules**: N/A.
- **Success Behavior**: Charts render from live server-aggregated data reflecting active filters;
  hovering/focusing a chart segment shows the exact count and, for category/location bars, the
  underlying label.
- **Error Behavior**: A chart that fails to load renders an inline "Chart unavailable" placeholder
  without blocking the other charts or tiles.
- **Empty State**: With no data for a given chart under the active filters, the chart area shows a
  centered "No data matches the current filters" message instead of an empty/broken chart canvas.
- **Edge Cases**: Months with zero investigations still appear on the trend line as a zero point
  (not skipped); the Incidents by Location chart's "Other" bucket only appears once more than 10
  distinct locations are present under the active filters.

### FR-003 — View Corrective-Action Status Summary
- **Purpose**: Surface corrective-action health across the (filtered) portfolio, not just within a
  single investigation.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: None required (page load); the active filter set from FR-065.
- **Outputs**: The Corrective-Action Status visualization (§1.0.3) and the Overdue Corrective Actions
  tile (§1.0.2).
- **Validation Rules**: N/A.
- **Success Behavior**: Counts match the derived-Overdue logic in FR-046 exactly (no discrepancy
  between dashboard and per-investigation views).
- **Error Behavior**: Same pattern as FR-001 — isolated inline error on failure, page remains usable.
- **Empty State**: Zero corrective actions under the active filters renders all buckets as `0`, with
  a short "No corrective actions recorded" note.
- **Edge Cases**: A `Cancelled` action never counts as Overdue even if its due date has passed (per
  §1.0.3's bucket definitions).

### FR-004 — Navigate to Investigation from Dashboard
- **Purpose**: Let a user jump directly from an aggregate view into the underlying record.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: Click/selection on a "Recent Investigations" row or a chart segment (drill-down).
- **Outputs**: Navigation to the selected investigation's detail view (FR-009), or to the
  Investigations list (FR-007) pre-filtered to match the clicked segment, carrying forward any
  dashboard filters already active (FR-065).
- **Validation Rules**: The target investigation must exist and be visible to the current role
  (VIEWER cannot land on a `Draft` investigation — see FR-007).
- **Success Behavior**: Navigation completes and the target view loads with correct data.
- **Error Behavior**: If the target investigation was deleted/no longer accessible between dashboard
  load and click, show a "This investigation is no longer available" message and remain on the
  dashboard.
- **Empty State**: "Recent Investigations" list shows an empty-state row ("No investigations yet —
  create one to get started", with a create link for MANAGER/INVESTIGATOR/ADMIN only) when there are
  none matching the active filters.
- **Edge Cases**: A VIEWER clicking a chart segment that resolves only to draft investigations sees a
  filtered list correctly showing zero results, not an error.

### FR-065 — Apply Dashboard Filters
- **Purpose**: Let a user narrow the entire dashboard (every tile, every chart, and the Recent
  Investigations list) to a specific slice of the portfolio.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: Any combination of the 6 filters in §1.0.4 (Date Range, Status, Occurrence Category,
  Airport/Location, Aircraft Type, Investigation Severity).
- **Outputs**: A re-computed `FilteredInvestigations` set (§1.0.1); every tile (FR-001), every chart
  (FR-002, FR-003), and the Recent Investigations list (FR-004) update to reflect it.
- **Validation Rules**: Date Range "from" must be ≤ "to" when both are provided, rejected inline
  otherwise (same rule as FR-060). Multi-select filter options for Airport/Location and Aircraft Type
  are populated dynamically from distinct values actually present in the data (not a fixed list,
  since these are free-text fields).
- **Success Behavior**: Filters combine with AND logic and apply uniformly across the whole page in a
  single re-fetch; the active filter combination is reflected in the URL so it survives a page
  refresh or can be shared/bookmarked.
- **Error Behavior**: An invalid date range shows an inline message and does not apply until
  corrected; a filter-fetch failure leaves the previously-rendered dashboard state visible with a
  retry affordance rather than clearing it.
- **Empty State**: A filter combination matching zero investigations shows the empty states defined
  per-tile/per-chart above (§1.0.2/§1.0.3), plus a page-level "No investigations match these filters —
  Clear filters" affordance.
- **Edge Cases**: Clearing all filters returns to the full-portfolio default state; selecting a
  Status filter value does not exclude that status from the "Investigations by Status" chart — the
  chart simply reflects the filtered set as-is (e.g., filtering to `Closed` produces a chart that is
  100% `Closed`, which is expected, not a bug).

### 1.1 Worked Example (Simulated Data)

A small fictional dataset illustrating the calculations in §1.0, with no filters applied. All data is
invented per `product-spec.md` A8; the "today" reference date for Overdue calculations is 2026-09-01.

**Investigations**

| Ref | Status | Category | Severity | Aerodrome | Aircraft | Occurrence Month |
|---|---|---|---|---|---|---|
| INC-2026-0001 | Closed | RunwayExcursion | SeriousIncident | ZZFI | AV-320 | 2025-10 |
| INC-2026-0002 | Closed | BirdWildlifeStrike | Incident | ZZFC | AV-200 | 2025-11 |
| INC-2026-0003 | Closed | GroundHandling | Occurrence | ZZFI | AV-320 | 2025-11 |
| INC-2026-0004 | Review | SystemComponentFailure | Incident | ZZFM | AV-450 | 2025-12 |
| INC-2026-0005 | Review | CFIT | Accident | ZZFC | AV-320 | 2026-01 |
| INC-2026-0006 | Analysis | LossOfControlInFlight | SeriousIncident | ZZFI | AV-200 | 2026-02 |
| INC-2026-0008 | UnderInvestigation | GroundHandling | Occurrence | ZZFM | AV-320 | 2026-03 |
| INC-2026-0009 | UnderInvestigation | AirspaceInfringement | Incident | ZZFI | AV-450 | 2026-04 |
| INC-2026-0010 | Open | SystemComponentFailure | Incident | ZZFC | AV-320 | 2026-05 |
| INC-2026-0011 | Open | Other | Occurrence | ZZFI | AV-200 | 2026-05 |
| INC-2026-0012 | Draft | *(unset)* | *(unset)* | *(unset)* | *(unset)* | 2026-06 |
| INC-2026-0013 | Closed | RunwayExcursion | Accident | ZZFC | AV-450 | 2025-09 |
| INC-2026-0014 | Closed | BirdWildlifeStrike | Incident | ZZFI | AV-320 | 2025-12 |
| INC-2026-0031 | Analysis | BirdWildlifeStrike | Incident | ZZFC | AV-320 | 2026-06 |

(INC-2026-0031 is the same fictional Skylark Air bird-strike investigation used as the example in
`data-model.md` §10.)

**Resulting tiles**: Total = 14. Open Investigations (Draft+Open) = 3 (0012, 0010, 0011). Under
Investigation (UnderInvestigation+Analysis) = 4 (0006, 0008, 0009, 0031). Awaiting Review = 2 (0004,
0005). Closed = 5 (0001, 0002, 0003, 0013, 0014). Check: 3+4+2+5 = 14 ✓.

**Investigations by Status**: Draft=1, Open=2, UnderInvestigation=2, Analysis=2, Review=2, Closed=5.

**By Occurrence Category**: RunwayExcursion=2, BirdWildlifeStrike=3, GroundHandling=2,
SystemComponentFailure=2, CFIT=1, LossOfControlInFlight=1, AirspaceInfringement=1, Other=1,
Unclassified=1 (sum=14).

**Incidents by Location**: ZZFI=6, ZZFC=5, ZZFM=2, Unspecified=1 (sum=14).

**By Aircraft Type** (informational, not a chart in this revision but usable for the Aircraft Type
filter's option list): AV-320=7, AV-200=3, AV-450=3, Unspecified=1.

**Monthly Investigation Trend** (2025-07 through 2026-06, zero-filled): Jul=0, Aug=0, Sep=1, Oct=1,
Nov=2, Dec=2, Jan=1, Feb=1, Mar=1, Apr=1, May=2, Jun=2 (sum=14).

**Sample Hazards** (feeding High-Risk Findings; none of these have a residual assessment recorded
yet, so the tile falls back to `initialRiskBand` for each, per §1.0.2): INC-0005 has two —
"Unstabilized approach in mountainous terrain at night" (initial Likelihood Likely=4 × Severity
Catastrophic=5 = 20 → **Critical**) and "GPWS nuisance-alert history delayed crew response" (initial
Possible=3 × Major=4 = 12 → **High**). INC-0006 has "Autopilot disconnect in turbulence without
adequate crew briefing" (Likely=4 × Major=4 = 16 → **High**). INC-0031 has "Flock of migratory birds
crossing the approach path" (Likely=4 × Major=4 = 16 → **High**, matching `data-model.md` §10's
worked Hazard example). INC-0001 (Closed) has a Moderate-band hazard (Possible=3 × Minor=2 = 6),
excluded both by band and by its Closed status. **High-Risk Findings tile = 4** (0005 ×2, 0006 ×1,
0031 ×1; all in non-Closed investigations).

**Sample Corrective Actions** (today = 2026-09-01; target dates use the renamed `targetDate` field,
`data-model.md` §3.19): INC-0001 "Repaint runway centerline markings" (target 2025-11-01, **Verified**
— verificationMethod=FollowUpInspection, effectivenessResult=Effective); INC-0002 "Inspect wildlife
strike damage" (target 2025-12-01, Completed); INC-0004 "Replace faulty pressure sensor" (target
2026-08-15, Open → **Overdue**, past target date); INC-0005 "Conduct GPWS system audit fleet-wide"
(target 2026-07-01, InProgress → **Overdue**); INC-0006 "Issue autopilot disconnect procedure
bulletin" (target 2026-09-15, **Assigned** — owner set, not yet started, not overdue); INC-0008
"Repair ground equipment guardrail" (target 2026-06-01, Cancelled → never Overdue); INC-0031
"Inspect and repair engine fan blades on G-FICT2" (target 2026-07-01, Open → **Overdue**, matches
`data-model.md` §10); INC-0013 "Runway excursion barrier system upgrade" (target 2025-10-01,
Completed).

**Corrective-Action Status chart**: Completed=2, Verified=1, Cancelled=1, Overdue=3, Open=0,
Assigned=1, InProgress=0 (sum=8). **Overdue Corrective Actions tile = 3**.

**Sample Contributing Factors** (feeding the distribution chart, re-mapped to the 10-category
framework in `data-model.md` §6.7): Procedures=4 (INC-0005's missing terrain-awareness briefing
requirement, INC-0031's wildlife-patrol procedure gap, INC-0001's ambiguous braking-action reporting
procedure, INC-0009's unenforced navigation database update process), Human Factors=1 (INC-0005's
crew fatigue from a short turnaround schedule), Training=1 (INC-0006's inadequate simulator training
for autopilot failure modes), Equipment=1 (INC-0004's sensor maintenance interval misaligned with
the manufacturer bulletin). **Contributing-Factor Distribution: Procedures=4, Human Factors=1,
Training=1, Equipment=1, Environment=0, Supervision=0, Communication=0, Organization=0,
Management=0, External Factors=0** (all 10 categories shown, sum=7 — same total as before the
re-mapping, since these are the same underlying factors reclassified under the new taxonomy).

---

## 2. Investigation Creation

### FR-005 — Create New Investigation
- **Purpose**: Start a new investigation record from a minimal initial report.
- **User**: ADMIN, MANAGER, INVESTIGATOR.
- **Inputs**: Title (text, required), Initial Occurrence Date (date, required), Reporter (defaults to
  current user, editable free text — **corrected Phase 4 to close spec-review.md SR-012**; this line
  previously left free-text-vs-user-picker unresolved, while `ui-spec.md` §4 already specified free
  text only).
- **Outputs**: A new `Investigation` record in `Draft` status with an auto-generated, unique
  reference number (format `INC-YYYY-NNNN`, sequential per year — see DM-16 for the exact rollover
  mechanism, added Phase 4 to close spec-review.md SR-013); redirect into the investigation's
  Occurrence Details section (FR-012).
- **Validation Rules**: Title 1–200 characters. Occurrence Date cannot be in the future (an
  investigation cannot be opened for an occurrence that has not happened yet). Reference number
  generation must be collision-free even under concurrent creation (server-side atomic sequence).
- **Success Behavior**: Record is created, reference number assigned and displayed immediately,
  `createdByUserId`/`createdAt` set to the acting user/current time, status set to `Draft`.
- **Error Behavior**: Validation failures are shown inline per field, no partial record is created. A
  server error surfaces a generic retry message; no orphan/partial `Investigation` row is left behind
  (creation is a single atomic operation).
- **Empty State**: N/A (this is itself the empty-state remedy for module 3).
- **Edge Cases**: Two users submitting "Create" at the same instant both succeed with distinct,
  correctly-sequential reference numbers (no duplicate numbers, no gap-dependent logic that could
  race).

### FR-006 — Assign / Reassign Investigator to Investigation
- **Purpose**: Let a Manager route an investigation to the Investigator who will perform the
  hands-on work, and reassign it later if needed (illness, workload rebalancing, etc.).
- **User**: ADMIN, MANAGER.
- **Inputs**: Target investigation, selected Investigator (from users with role INVESTIGATOR).
- **Outputs**: `Investigation.assignedInvestigatorUserId` updated (data-model.md §3.2); the assigned
  Investigator gains edit access to the investigation (product-spec §8.2, "own/assigned").
- **Validation Rules**: The selected user must currently hold the INVESTIGATOR role and be active
  (`User.isActive = TRUE` — closes spec-review.md SR-016's gap: assigning new work to a deactivated
  account is blocked, the same way `edge-cases.md` EC-14 already blocks it for action ownership). An
  investigation in `Closed` status cannot be reassigned without first being reopened (FR-054).
  Reassignment **is** permitted while an investigation is in `Review` status (closes spec-review.md
  SR-022) — the assigned Investigator becoming unavailable mid-review is a plausible real-world need;
  reassigning does not itself unlock any other section for editing, which remains governed solely by
  FR-011's status-based read-only rule.
- **Success Behavior**: Assignment is saved immediately; the investigation now appears in the newly
  assigned Investigator's "my investigations" view and no longer grants default edit access to the
  previous assignee (their prior contributions remain attributed to them via existing audit fields).
- **Error Behavior**: Selecting a non-Investigator user is rejected with an inline error before
  submission is possible (picker is pre-filtered to valid users, so this is primarily a
  defense-in-depth server-side check).
- **Empty State**: If no INVESTIGATOR-role users exist yet, the assignment picker shows "No
  investigators available — add one from User Management" (ADMIN-only link).
- **Edge Cases**: Reassigning an investigation mid-analysis does not alter any already-entered data;
  it only changes future edit-permission and "my investigations" grouping.

---

## 3. Investigation List

### FR-007 — View Investigation List
- **Purpose**: Provide a scannable overview of all investigations visible to the current user.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: None required (optional filter/sort/search params — see module 24).
- **Outputs**: Table of investigations — Reference #, Title, Status (badge), Severity (badge),
  Occurrence Date, Created By, Updated At — each row linking to FR-009.
- **Validation Rules**: N/A (read).
- **Success Behavior**: List reflects role-scoped visibility exactly per product-spec §8.2: ADMIN and
  MANAGER see all investigations; INVESTIGATOR sees investigations they created or are assigned to;
  REVIEWER sees all (needed for review duties); VIEWER sees non-`Draft` investigations only.
- **Error Behavior**: A failed list load shows a retry affordance; it does not silently render an
  empty list (which would be indistinguishable from FR's empty state).
- **Empty State**: "No investigations to show" with contextual copy — for INVESTIGATOR with zero
  assigned/owned investigations: "You have no assigned investigations yet"; for a filtered VIEWER: "No
  closed investigations match this view yet".
- **Edge Cases**: An INVESTIGATOR who is both the creator and later unassigned from an investigation
  still sees it in their list (creation grants permanent visibility; assignment grants edit access —
  these are tracked independently).

### FR-008 — Paginate Investigation List
- **Purpose**: Keep the list usable as the portfolio grows beyond a single screen.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: Page number/size (default page size 25).
- **Outputs**: Paged subset of the list plus total count and page controls.
- **Validation Rules**: Requested page number must be within range `[1, ceil(total/pageSize)]`;
  out-of-range values clamp to the nearest valid page rather than erroring.
- **Success Behavior**: Navigating pages preserves any active filter/sort/search state (module 24).
- **Error Behavior**: A page-fetch failure keeps the previously-loaded page visible and shows a
  non-blocking retry notice, rather than clearing the table.
- **Empty State**: Fewer than one page's worth of results hides pagination controls entirely.
- **Edge Cases**: Deleting the only investigation on the last page (see FR-055) automatically moves
  the view back one page rather than showing an empty final page.

---

## 4. Investigation Detail

### FR-009 — View Investigation Detail (Section Stepper)
- **Purpose**: Central working view for an investigation, organized into the **13 workspace pages**
  defined in `ui-spec.md` §2.3/§3 — **corrected Phase 4**; this previously said "17 sections" citing
  `investigation-workflow.md` §2, which actually defines 16 *workflow steps*, a related but distinct
  count from the stepper's 13 *pages* (several FR modules share one page — e.g. Persons Involved and
  Immediate Actions both fold into Occurrence Details, per `ui-spec.md` §3's explicit mapping table).
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER (per role-scoped visibility, FR-007).
- **Inputs**: Investigation reference/ID (route parameter); section selection (stepper navigation).
- **Outputs**: Selected section's form/view rendered in the main panel; a summary card (status,
  severity, key dates) in the right rail.
- **Validation Rules**: The requesting user must have view access to this investigation (FR-007's
  scoping rules) or a 403/redirect occurs.
- **Success Behavior**: Navigating between sections does not lose unsaved changes silently — an
  unsaved-changes prompt appears if the user attempts to leave a section with an active edit (see
  UI-1, explicit-save model).
- **Error Behavior**: An invalid/nonexistent investigation ID shows a 404-style "Investigation not
  found" page rather than a blank/broken layout.
- **Empty State**: A freshly created (`Draft`) investigation shows every section other than Occurrence
  Details as "Not started".
- **Edge Cases**: Deep-linking directly to a specific section (e.g. shared URL to the Hazards section)
  works identically to stepper navigation, including permission checks.

### FR-010 — View Section Completeness Indicators
- **Purpose**: Show progress through the guided workflow without enforcing strict ordering.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: None (derived from stored data).
- **Outputs**: Per-section badge: Not Started / In Progress / Complete, per the field-population rules
  in `investigation-workflow.md` §4 and `data-model.md` DM-3.
- **Validation Rules**: N/A (derived, read-only).
- **Success Behavior**: Badges update immediately after any section save, without a full page reload.
- **Error Behavior**: If completeness cannot be computed (e.g., transient error), the badge shows a
  neutral "—" rather than a misleading status.
- **Empty State**: All badges show "Not Started" on a brand-new investigation except Occurrence
  Details, which is "In Progress" once the creation form's fields are saved.
- **Edge Cases**: A list-type section (e.g. Witnesses) with zero required entries by policy (witnesses
  are optional) shows "Complete" once visited/acknowledged rather than perpetually "Not Started" — see
  FR-019 empty-state handling for the precise rule.

### FR-011 — Read-Only Enforcement by Status and Role
- **Purpose**: Prevent edits that would violate the investigation lifecycle or a user's permissions.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: Current investigation status, current user's role and assignment relationship to the
  investigation.
- **Outputs**: Every section renders in read-only mode (disabled controls, no Save buttons) when
  status is `Review` or `Closed`, or when the current user lacks edit permission for this
  investigation.
- **Validation Rules**: Server-side enforcement is authoritative; UI disabling is a convenience, not
  the security boundary (NFR-4.7).
- **Success Behavior**: A user without edit rights sees identical layout/content to an editor, only
  with controls disabled — no information is hidden, only mutation is blocked.
- **Error Behavior**: A blocked write attempt reaching the server (e.g., via a stale open form) is
  rejected with HTTP 403 and a clear "This investigation is read-only in its current state" message.
- **Empty State**: N/A.
- **Edge Cases**: A REVIEWER viewing an investigation they are actively reviewing sees all data
  sections read-only but their own Review section (FR-050) remains actionable.

---

## 5. Occurrence Information

### FR-012 — Record / Update Occurrence Details
- **Purpose**: Capture the core facts of what happened and when.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Occurrence Date (UTC), Occurrence Time (UTC, and optional Local), Phase of Flight
  (enum, `data-model.md` §2.3), Brief Description (≤240 chars), Narrative Description (long text).
- **Outputs**: Persisted `OccurrenceDetails` record; section completeness updates to "Complete" once
  all fields are populated.
- **Validation Rules**: Occurrence Date required, not in the future. Phase of Flight required, must be
  a valid enum value. Brief Description required, ≤240 characters. Narrative required, minimum 20
  characters (prevents a throwaway one-word placeholder from counting as "Complete").
- **Success Behavior**: Save persists all fields atomically; the Brief Description subsequently
  appears in list views (FR-007) and dashboard drill-downs.
- **Error Behavior**: Field-level validation errors block save and are shown inline; a save conflict
  (investigation closed/locked by another action mid-edit) shows "This investigation can no longer be
  edited" and discards the pending change without corrupting stored data.
- **Empty State**: All fields blank on a new investigation; the section badge (FR-010) shows "In
  Progress" as soon as any one field is saved, "Complete" only once all are populated.
- **Edge Cases**: Occurrence Time entered without a corresponding Local Time is valid (Local is
  optional per `data-model.md` §2.3); a Narrative pasted with only whitespace is treated as empty for
  validation purposes.

---

## 6. Aircraft Information

### FR-013 — Record / Update Aircraft Information
- **Purpose**: Capture identifying and damage information for the aircraft involved.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Registration, Manufacturer, Model, Serial Number, Year of Manufacture (optional),
  Operator Name, Engine Type, Engine Count, Damage Level (enum: None/Minor/Substantial/Destroyed).
- **Outputs**: Persisted `Aircraft` record (1:1 with investigation).
- **Validation Rules**: Registration, Manufacturer, Model, Operator Name, Damage Level required for
  the section to count as "Complete" (matches the review completeness gate in
  `investigation-workflow.md` §4, which only mandates registration/model/damage). Year of Manufacture,
  if provided, must be a 4-digit year not later than the current year. Engine Count must be a positive
  integer.
- **Success Behavior**: Save persists all fields; damage level feeds the Classification section's
  contextual summary (FR-027).
- **Error Behavior**: Same pattern as FR-012 — inline field errors, no partial save on validation
  failure.
- **Empty State**: Blank form on a new investigation.
- **Edge Cases**: A registration value is stored as free text (fictional formats vary); no format
  regex is enforced beyond non-empty, since real-world registration formats vary by country and the
  data is fictional regardless (ties to product-spec A8).

---

## 7. Flight Information

### FR-014 — Record / Update Flight Information
- **Purpose**: Capture the flight context of the occurrence.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Flight Number (optional), Flight Rules (VFR/IFR), Departure Aerodrome, Destination
  Aerodrome, Alternate Aerodrome (optional), PIC Name, PIC License Number (optional), Crew
  Complement.
- **Outputs**: Persisted `FlightInformation` record (1:1 with investigation).
- **Validation Rules**: Flight Rules, Departure Aerodrome, Destination Aerodrome, PIC Name, Crew
  Complement required. Crew Complement must be a positive integer. Departure and Destination may be
  identical (valid for local/training flights that return to origin).
- **Success Behavior**: Save persists all fields.
- **Error Behavior**: Same inline-validation pattern as FR-012/FR-013.
- **Empty State**: Blank form on a new investigation.
- **Edge Cases**: Flight Number left blank is valid (e.g., general aviation flights without a
  commercial flight number).

---

## 8. Location Information

### FR-015 — Record / Update Location & Operational Conditions
- **Purpose**: Capture where the occurrence happened and the environmental conditions at the time.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Location Description, Latitude/Longitude (optional), Aerodrome Code (optional), Weather
  Visibility, Wind Speed/Direction, Cloud Cover, Temperature, Precipitation, Runway in Use, Lighting
  Conditions (Day/Night/Dusk/Dawn), Terrain Type.
- **Outputs**: Persisted `LocationConditions` record (1:1 with investigation).
- **Validation Rules**: Location Description and Lighting Conditions required; all weather/runway/
  terrain fields optional (not every occurrence has full METAR-equivalent data available). Latitude
  must be in [-90, 90], Longitude in [-180, 180] when provided.
- **Success Behavior**: Save persists all fields.
- **Error Behavior**: Out-of-range coordinates are rejected inline with the valid range shown; other
  fields follow the standard inline-validation pattern.
- **Empty State**: Blank form on a new investigation.
- **Edge Cases**: Latitude provided without Longitude (or vice versa) is flagged as an inline warning
  ("both coordinates are needed to plot a location") but does not block save, since the field is
  optional overall.

---

## 9. Persons Involved

### FR-016 — Add / Edit Person Involved
- **Purpose**: Record every person relevant to the occurrence and their outcome.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Name, Role Type (enum, `data-model.md` §2.7), License Number (optional), Nationality
  (optional), Injury Level (None/Minor/Serious/Fatal), Notes (optional).
- **Outputs**: New or updated `PersonInvolved` row; list re-renders with the new/changed entry;
  injury summary (FR-018) recalculates.
- **Validation Rules**: Name and Role Type required; Injury Level required (defaults to "None" on
  the add form rather than left blank, to avoid an ambiguous unset state).
- **Success Behavior**: Entry is added/updated in place without leaving the section; the list is
  sorted by Role Type then Name for consistent reading order.
- **Error Behavior**: Inline validation on the row/modal form; failed save leaves the list unchanged
  and the form open with the error shown.
- **Empty State**: "No persons recorded yet" with an "Add Person" call to action; this section is
  treated as "Complete" once at least one person is recorded (an occurrence with literally zero
  persons involved, e.g. an unmanned ground equipment incident, is an edge case handled by an explicit
  "No persons were involved" checkbox that also satisfies completeness — see Edge Cases).
- **Edge Cases**: An occurrence with genuinely no persons involved (e.g., unoccupied aircraft ground
  damage) uses an explicit "No persons were involved in this occurrence" toggle instead of forcing a
  fabricated entry; this toggle and at least one person entry are mutually exclusive.

### FR-017 — Remove Person Involved
- **Purpose**: Correct data-entry mistakes or remove a person mistakenly added.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Selected person entry, confirmation.
- **Outputs**: Row removed from `PersonInvolved`; injury summary (FR-018) recalculates.
- **Validation Rules**: Removal requires confirmation (FR-21.2-equivalent rule, NFR-driven).
- **Success Behavior**: Entry disappears immediately after confirmation; no soft-delete/undo in v1
  (documented limitation, consistent with the rest of the data model).
- **Error Behavior**: A failed delete (e.g., referenced elsewhere unexpectedly) shows an error and
  leaves the entry in place.
- **Empty State**: N/A (only shown when at least one entry exists).
- **Edge Cases**: Removing the last remaining person reverts the section to its empty state (FR-016).

### FR-018 — View Injury Summary
- **Purpose**: Give a quick, accurate roll-up of injury severity across all persons involved.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: None (derived from `PersonInvolved` rows).
- **Outputs**: Counts by Injury Level (e.g. "1 Serious, 0 Fatal, 3 None"), shown on the Persons
  section and echoed on the Classification section (FR-027) and the report (FR-056).
- **Validation Rules**: N/A (derived).
- **Success Behavior**: Recomputes live on every add/edit/remove without requiring a page refresh.
- **Error Behavior**: N/A (pure derivation from already-validated data).
- **Empty State**: With zero persons recorded (and the "no persons involved" toggle not set), the
  summary shows "Not yet recorded" rather than "0 of everything", to distinguish "unknown" from
  "confirmed zero".
- **Edge Cases**: The "no persons involved" toggle (FR-016) displays the summary as "No persons
  involved in this occurrence" rather than a set of zero-counts.

---

## 10. Witness Management

### FR-019 — Add / Edit Witness
- **Purpose**: Record witness statements relevant to the investigation.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Name, Contact Info (optional), Witness Type (enum), Statement Summary, Statement Date
  (optional), Reliability Assessment (High/Medium/Low) with optional justification notes.
- **Outputs**: New or updated `Witness` row.
- **Validation Rules**: Name, Witness Type, Statement Summary, Reliability Assessment required.
  Statement Summary minimum 10 characters (avoids a placeholder entry).
- **Success Behavior**: Entry added/updated in place; list ordered by Statement Date (most recent
  first), undated entries last.
- **Error Behavior**: Standard inline-validation pattern.
- **Empty State**: "No witnesses recorded" — this section is optional by design (not every occurrence
  has witnesses) and is treated as "Complete" as soon as the investigator has visited it (a "Mark as
  reviewed — no witnesses" acknowledgment), not left permanently "Not Started".
- **Edge Cases**: Two witnesses giving materially conflicting statements is expected and simply
  recorded as two separate entries; the system does not attempt to reconcile them (that is
  investigator analysis, out of scope for the data-entry layer).

### FR-020 — Remove Witness
- **Purpose**: Correct data-entry mistakes.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Selected witness entry, confirmation.
- **Outputs**: Row removed from `Witness`.
- **Validation Rules**: Confirmation required.
- **Success Behavior**: Immediate removal after confirmation.
- **Error Behavior**: Failed delete shows an error, entry remains.
- **Empty State**: N/A.
- **Edge Cases**: Same as FR-017 pattern.

---

## 11. Evidence Management

**Revision note (evidence management system pass)**: this module is redesigned around the
10-category evidence taxonomy, the expanded field set (Source, Date Obtained, Relevance,
Reliability Assessment, Investigator Notes, Related Finding), and the `StorageProvider` abstraction
in `data-model.md` §3.9–§3.10, §6.10–§6.11. FR-021–FR-024 updated in place; FR-071 newly added for
linking evidence to findings.

### FR-021 — Add / Edit Evidence Item
- **Purpose**: Log evidence collected in support of the investigation, with enough structured
  context (source, relevance, reliability) to weigh it during analysis, not just describe it.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Evidence Type (`Photographs`/`Documents`/`Statements`/`CCTV Reference`/`Flight
  Records`/`Maintenance Records`/`Ground Handling Records`/`Training Records`/`Emails`/`Other`,
  `data-model.md` §6.10), Description, Source, Collected By (optional), Date Obtained (optional),
  Relevance (High/Medium/Low), Reliability Assessment (High/Medium/Low) + Reliability Notes
  (optional), Investigator Notes (optional), Chain-of-Custody Notes (optional).
- **Outputs**: New or updated `Evidence` row (attachments handled separately, FR-023/FR-024; finding
  links handled separately, FR-071).
- **Validation Rules**: Evidence Type, Description, Source, Relevance, and Reliability Assessment are
  required. Date Obtained, if set, cannot be in the future.
- **Success Behavior**: Entry added/updated; list groupable by Evidence Type or filterable by
  Relevance/Reliability.
- **Error Behavior**: Standard inline-validation pattern.
- **Empty State**: "No evidence logged yet"; optional section, same "acknowledge empty" completeness
  pattern as FR-019.
- **Edge Cases**: An evidence item can exist with no attached file (e.g., a `CCTVReference` item,
  which by design references footage retained elsewhere rather than an uploaded video —
  `data-model.md` §3.9) — attachment is optional per item regardless of type.

### FR-022 — Remove Evidence Item
- **Purpose**: Correct data-entry mistakes.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Selected evidence entry, confirmation.
- **Outputs**: `Evidence` row removed; any associated `Attachment` rows and their files are removed as
  well, and any `EvidenceFindingLink` rows are cleared (cascade, per `data-model.md` §7).
- **Validation Rules**: Confirmation required; the confirmation dialog explicitly warns that attached
  files will also be deleted and that any linked findings will lose this citation.
- **Success Behavior**: Row and its files removed together, atomically.
- **Error Behavior**: If file deletion fails after the database row is removed, the orphaned file is
  logged server-side for cleanup rather than surfaced as a user-facing error (the record itself is
  correctly gone from the user's perspective).
- **Empty State**: N/A.
- **Edge Cases**: Deleting the last evidence item reverts the section to its empty state (FR-021).

### FR-023 — Upload Evidence Attachment
- **Purpose**: Attach supporting files (photos, documents, scanned records) to an evidence item,
  through the `StorageProvider` abstraction rather than a hardcoded storage mechanism
  (`data-model.md` §6.10.1) — so a future switch to real document storage is a configuration change,
  not a rewrite of this requirement.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: File (from an existing `Evidence` item's context), MIME type inferred from the file.
- **Outputs**: New `Attachment` row with `isSimulated = FALSE`; file saved via the active
  `StorageProvider` (v1: `PostgresBlobStorageProvider`, storing bytes in `Attachment.fileBytes`,
  a Postgres `Bytes` column — `technical-architecture.md` §9, TA-1; **not** local disk, which does
  not survive across Vercel's ephemeral serverless invocations); `uploadedByUserId`/`uploadedAt`
  recorded. Closes spec-review.md SR-001.
- **Validation Rules**: Accepted types restricted to images (JPEG/PNG), PDF, and plain text
  (NFR-4.5) — deliberately excluding video/audio, macro-capable office formats, and executables
  (`data-model.md` §6.11). This is why `CCTVReference` evidence cannot carry an uploaded video and
  why `Emails` evidence should be attached as an exported PDF/plain-text copy, not a raw
  `.eml`/`.msg` file. Per-file size limit 10MB. Per-investigation cumulative attachment size cap
  100MB. Filename sanitized server-side before storage (no path traversal, no executable extensions
  regardless of declared MIME type).
- **Success Behavior**: Upload completes, attachment appears in the evidence item's file list
  immediately with file name, size, and uploader, clearly distinguished from any simulated
  attachments already present (§ Empty State below).
- **Error Behavior**: Oversized or wrong-type files are rejected before upload begins (client-side
  pre-check) and re-validated server-side (authoritative check, NFR-4.5); a per-investigation cap
  breach shows "This investigation's attachment storage limit has been reached" with the current
  usage shown.
- **Empty State**: An evidence item with no attachments shows "No files attached" plus an "Upload"
  control.
- **Edge Cases**: A file upload interrupted mid-transfer leaves no partial `Attachment` row (the
  record is only created after the file is fully and successfully written via the `StorageProvider`).
  Seed/demo data instead populates `isSimulated = TRUE` attachments directly (no upload flow
  involved) resolving to a bundled placeholder file, per `data-model.md` §6.10.2 — these are visibly
  labeled "Simulated attachment" wherever shown (FR-024, `ui-spec.md` §8) and are never presented as
  if they were genuinely uploaded content.

### FR-024 — View / Download Evidence Attachment
- **Purpose**: Let an authorized user retrieve an attached file (real or simulated).
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER (all with view access to the investigation);
  VIEWER on non-draft investigations.
- **Inputs**: Selected attachment.
- **Outputs**: File served for inline view (images/PDF) or download (other allowed types), retrieved
  through the active `StorageProvider`'s `retrieve` operation (`data-model.md` §6.10.1) — the caller
  never touches the underlying storage mechanism directly.
- **Validation Rules**: The requesting user must have view access to the parent investigation
  (same rule as FR-009); the resolved storage handle must stay within the `StorageProvider`'s
  managed namespace (defense against path traversal even though `storagePath` is server-generated,
  not user-supplied, at request time).
- **Success Behavior**: File streams to the browser with correct `Content-Type` and `Content-
  Disposition`. A **simulated** attachment (`isSimulated = TRUE`) is preceded by a visible
  "Simulated attachment — placeholder for demonstration" label before the file opens/downloads, so a
  viewer is never misled into treating placeholder content as genuine evidence.
- **Error Behavior**: A missing file (should not normally occur, for either a real file or the
  bundled placeholder) returns a clear "File unavailable" error rather than a raw server error.
- **Empty State**: N/A (only reachable when an attachment exists).
- **Edge Cases**: N/A beyond those covered above.

### FR-071 — Link Evidence to a Finding ("Related Finding")
- **Purpose**: Let an investigator record which evidence items support which formal Findings
  (`InvestigationFinding`, module 10), preserving a many-to-many relationship since one item often
  supports several findings and vice versa.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Selected Evidence item, one or more `InvestigationFinding` selections from the same
  investigation (multi-select).
- **Outputs**: New/removed `EvidenceFindingLink` rows.
- **Validation Rules**: Both the evidence item and every selected finding must belong to the same
  investigation.
- **Success Behavior**: The link appears on both sides — the Evidence item shows its related
  finding(s), and the Finding (`ui-spec.md` §10) shows its supporting evidence as reference chips.
- **Error Behavior**: Standard inline-validation pattern.
- **Empty State**: "Not yet linked to a finding" on an evidence item with no links; this is optional,
  not gating — an evidence item is fully valid on its own without a finding link.
- **Edge Cases**: Removing a Finding (module 10) clears its `EvidenceFindingLink` rows without
  deleting the evidence itself, and vice versa (`data-model.md` §7).

---

## 12. Immediate Actions

### FR-025 — Add / Edit Immediate Action
- **Purpose**: Record actions taken at or immediately after the occurrence, before formal analysis.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Description, Taken By, Date/Time, Action Type (Safety/Operational/Notification).
- **Outputs**: New or updated `ImmediateAction` row.
- **Validation Rules**: Description, Taken By, Date/Time, Action Type required. Date/Time cannot be
  earlier than the investigation's Occurrence Date/Time (an immediate action cannot precede the
  occurrence it responds to).
- **Success Behavior**: Entry added/updated; list ordered chronologically.
- **Error Behavior**: Standard inline-validation pattern, including the date-ordering rule above shown
  as a specific inline message ("must be on or after the occurrence date/time").
- **Empty State**: "No immediate actions recorded"; optional section, same acknowledge-empty pattern
  as FR-019.
- **Edge Cases**: An immediate action logged at the exact same timestamp as the occurrence itself is
  valid (e.g., an automated system response).

### FR-026 — Remove Immediate Action
- **Purpose**: Correct data-entry mistakes.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Selected entry, confirmation.
- **Outputs**: Row removed.
- **Validation Rules**: Confirmation required.
- **Success Behavior**: Immediate removal after confirmation.
- **Error Behavior**: Failed delete shows an error, entry remains.
- **Empty State**: N/A.
- **Edge Cases**: Same pattern as FR-017.

---

## 13. Occurrence Classification

**Revision note**: this module is redesigned around the 14-category taxonomy, the actual/potential
outcome distinction, and the computed risk-level/priority fields defined in `data-model.md` §3.3 and
§6.5–§6.6. FR-027 and FR-028 are updated in place; FR-066 and FR-067 are newly added.

### FR-027 — Record / Update Occurrence Classification
- **Purpose**: Formally classify the occurrence by category and subcategory for portfolio-level
  reporting and analysis, using an internally-defined taxonomy (`data-model.md` §6.6) — see the
  regulator-neutrality disclaimer requirement in `product-spec.md` §11.4.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Occurrence Category (one of the 14 values in `data-model.md` §6.6), Subcategory
  (dependent picker, populated from `OccurrenceSubcategoryOption` filtered to the selected category).
- **Outputs**: Persisted `occurrenceCategory`/`occurrenceSubcategoryId` on `Occurrence`;
  `classifiedByUserId`/`classifiedAt` recorded.
- **Validation Rules**: Category required for the section to count "Complete"; Subcategory required
  once a Category is selected (the picker has no valid empty state once a category with
  subcategories is chosen — every category has at least an "Other …" catch-all subcategory).
  Changing the Category clears any previously selected Subcategory (it may no longer be valid under
  the new category).
- **Success Behavior**: Save persists the classification; the injury/damage summary (FR-018,
  Aircraft damage level) is shown alongside the form for context, per `ui-spec.md` §6.
- **Error Behavior**: Standard inline-validation pattern; selecting a Subcategory that does not
  belong to the currently-selected Category (should not be reachable via the UI's dependent picker)
  is rejected server-side per `data-model.md` §3.3.1's invariant.
- **Empty State**: Category/Subcategory unset on a new investigation; the section shows the
  injury/damage summary even before classification is chosen, since that data may already exist.
- **Edge Cases**: A user may classify manually without ever invoking FR-028's suggestion — the
  suggestion is an accelerator, never a requirement to reach a valid classification. Severity, Risk
  Level, and Investigation Priority are **not** set here — they are computed from Actual/Potential
  Outcome (FR-066) and Likelihood of Recurrence, not from Category/Subcategory directly (FR-067).

### FR-028 — Generate Suggested Classification (Investigation Support)
- **Purpose**: Speed up category/subcategory selection using local, transparent, rule-based text
  analysis — see product-spec §11.1; this is the canonical implementation of the "Suggested
  Classification" label. This suggestion covers **category and subcategory only** — severity, risk
  level, and priority are computed values (FR-067), never narrative-suggested, since they must stay
  traceable to the structured Actual/Potential Outcome fields rather than free-text inference.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: The investigation's Narrative Description (FR-012); user clicks "Suggest
  Classification".
- **Outputs**: A **Suggested Classification** (category + subcategory), visually tagged as a
  suggestion and distinct from confirmed data, with the matched keywords/phrases shown for
  transparency (so the suggestion is explainable, not a black box).
- **Validation Rules**: Requires a non-empty Narrative Description (FR-012) to run; the button is
  disabled with a tooltip explanation otherwise. The suggestion is never auto-saved — it requires an
  explicit "Accept Suggestion" action from the user before it is written to `Occurrence` (mirrors
  `wasSuggestionAccepted` in `data-model.md` §3.3).
- **Success Behavior**: Suggestion appears within the Classification form; accepting it populates
  the Category/Subcategory fields (still requiring the normal Save, per FR-027) and records
  `suggestedCategory`/`suggestedSubcategoryId`/`wasSuggestionAccepted = true`. The user may instead
  edit the fields manually after seeing the suggestion, which records `wasSuggestionAccepted = false`.
- **Error Behavior**: If the local rule engine finds no confident match, it returns an explicit "No
  confident suggestion available — please classify manually" state rather than guessing; this is not
  treated as an error, just a null result.
- **Empty State**: Before the button is clicked, no suggestion is shown (the form looks identical to
  FR-027's blank state).
- **Edge Cases**: Re-running the suggestion after the narrative is edited produces a fresh suggestion
  that replaces the prior one; a previously *accepted* classification is not silently overwritten —
  re-suggesting after acceptance requires the user to explicitly re-accept before it changes the saved
  classification.

### FR-066 — Record Actual and Potential Outcome
- **Purpose**: Capture the required distinction between what actually happened and what could
  plausibly have happened — the basis for this occurrence's computed risk level and investigation
  priority (`data-model.md` §6.6).
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Actual Outcome Severity (`Negligible`/`Minor`/`Moderate`/`Major`/`Catastrophic` —
  **corrected Phase 5 to close spec-review.md SR-004**; this line previously listed the retired
  `Hazardous` value data-model.md DM-12 replaced with `Moderate`) + Actual Outcome Description
  (text); Potential Outcome Severity (same scale) + Potential Outcome Description (text); Likelihood
  of Recurrence (`Rare`…`AlmostCertain`).
- **Outputs**: Persisted `actualOutcomeSeverity`/`actualOutcomeDescription`/
  `potentialOutcomeSeverity`/`potentialOutcomeDescription`/`likelihoodOfRecurrence` on `Occurrence`;
  triggers recomputation of `severity`, `riskScore`/`riskBand`, and `investigationPriority` (FR-067).
- **Validation Rules**: All five fields required for the section to count "Complete". Potential
  Outcome Severity must be **greater than or equal to** Actual Outcome Severity on the shared scale —
  the credible worst case cannot be milder than what actually happened; a value violating this is
  rejected inline with an explanation. Descriptions, when the corresponding severity is set, are
  required (min 10 characters) — a bare severity rating without the reasoning behind it is not
  accepted.
- **Success Behavior**: Saving recomputes `severity` (= the more severe of the two, unless previously
  overridden — see FR-067) live, so the investigator sees the consequence of their entries
  immediately.
- **Error Behavior**: Standard inline-validation pattern, plus the Potential-≥-Actual rule above.
- **Empty State**: All fields blank on a new investigation; this section is optional at the data
  layer until Analysis but is required before the Open → Under Investigation stage transition can
  occur automatically (`investigation-workflow.md` §8, updated by this revision).
- **Edge Cases**: A `NearMiss`-category occurrence very often has Actual Outcome = `Negligible` and a
  much higher Potential Outcome — this is expected and is exactly the scenario this distinction
  exists to capture (`data-model.md` §6.6), not an inconsistency to flag.

### FR-067 — Determine Risk Score/Band and Investigation Priority
- **Purpose**: Compute the occurrence's risk score/band and operational triage priority from
  structured inputs, using the shared risk assessment module (`data-model.md` §6), with transparent,
  justified override capability — never a freely-typed, unaccountable value.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning) for override; all viewing roles see the
  result.
- **Inputs**: Derived automatically from `likelihoodOfRecurrence` × `potentialOutcomeSeverity`
  (Risk Score/Band, via the formula and configurable bands in `data-model.md` §6.3–§6.4) and from
  `severity` × `riskBand` (Investigation Priority, via the matrix in `data-model.md` §6.5, including
  the Dangerous Goods/Security category floor rule). Optional manual input: an override value plus a
  required justification (min 20 characters) for either field.
- **Outputs**: `Occurrence.riskScore`, `Occurrence.riskBand`, `Occurrence.investigationPriority`, and
  (if overridden) `severityOverridden`/`severityOverrideJustification` or `priorityOverridden`/
  `priorityOverrideJustification`.
- **Validation Rules**: Cannot compute Risk Score/Band until FR-066's fields are populated; cannot
  compute Investigation Priority until `severity` is set (computed or overridden). An override's
  justification is mandatory — the override control itself is disabled until the field is filled.
- **Success Behavior**: Both values display live, with a visible badge distinguishing "Computed" from
  "Overridden" — never silently indistinguishable from each other (mirrors the transparency
  principle already applied to Suggested Classification, product-spec §11.1).
- **Error Behavior**: An override attempt without a justification is blocked inline; recomputation
  after an upstream field changes (e.g., editing Potential Outcome Severity after Risk Level was
  already overridden) does **not** silently discard the override — the override is preserved and a
  non-blocking notice ("Inputs changed since this was overridden — review?") is shown instead.
- **Empty State**: Both fields show "Not yet determined" until FR-066 is complete.
- **Edge Cases**: The Dangerous Goods/Security priority floor (`data-model.md` §6.5) can raise a
  computed `Routine` result to `Elevated` automatically; this floor is applied **before** any
  override is offered, so an investigator overriding priority is always overriding the
  floor-adjusted value, not the raw matrix result.

---

## 14. Hazard Identification

**Revision note (risk assessment module pass)**: this module now implements the full risk
assessment module defined in `data-model.md` §6 — a numeric Likelihood(1–5) × Severity(1–5) formula
resolved against configurable risk bands (§6.4), with distinct Initial and Residual assessments.
FR-029 is updated in place; FR-068 is newly added for Existing Controls / Residual Risk.

### FR-029 — Add / Edit Hazard (with Initial Risk Computation)
- **Purpose**: Identify hazards relevant to the occurrence and score their risk **before any
  existing controls are considered**, using the shared risk assessment module (`data-model.md` §6).
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Description, Hazard Category (enum), Initial Likelihood (Rare(1)…AlmostCertain(5)),
  Initial Severity (Negligible(1)…Catastrophic(5)).
- **Outputs**: New or updated `Hazard` row; `initialRiskScore` (Likelihood × Severity, 1–25) and
  `initialRiskBand` (resolved against the active `RiskBandConfiguration`, `data-model.md` §6.4)
  computed live and **displayed visually** as a highlighted cell on a 5×5 Likelihood/Severity grid
  plus a color-coded band badge, per `ui-spec.md` §11.
- **Validation Rules**: Description, Category, Initial Likelihood, Initial Severity all required.
  `initialRiskScore`/`initialRiskBand` are system-computed and not directly editable (prevents an
  inconsistent likelihood/severity/score combination).
- **Success Behavior**: Entry added/updated; list sortable by computed Initial Risk Band (highest
  first by default).
- **Error Behavior**: Standard inline-validation pattern.
- **Empty State**: "No hazards identified yet"; this section counts toward the review completeness
  gate jointly with Contributing Factors (`investigation-workflow.md` §8 — at least one of the two is
  required, not both).
- **Edge Cases**: Changing Initial Likelihood or Severity on an existing hazard recomputes and
  updates `initialRiskScore`/`initialRiskBand` immediately, including anywhere already referenced
  (e.g., a linked Action's displayed context, FR-042). If an Administrator reconfigures the risk
  bands (FR-069) after this hazard was scored, the **stored** band label is not silently
  recalculated — see FR-069's edge cases.

### FR-068 — Record Existing Controls and Residual Risk
- **Purpose**: Capture what mitigations are already in place and re-score the hazard's risk after
  accounting for them — the standard initial-vs-residual risk assessment pattern this module is
  built around.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Existing Controls (text, optional), Residual Likelihood (same 1–5 scale), Residual
  Severity (same 1–5 scale).
- **Outputs**: `Hazard.existingControls`, `residualRiskScore` (computed), `residualRiskBand`
  (computed) — displayed visually alongside the Initial Risk grid (`ui-spec.md` §11) so the
  before/after risk reduction is visible at a glance, ideally with the two points plotted on one
  shared 5×5 grid connected by an arrow.
- **Validation Rules**: Residual Likelihood and Residual Severity must both be set together (not
  one without the other). Not required for a hazard to be saved (FR-029 already persists a valid
  hazard with Initial Risk alone) but **is** required, for every recorded hazard, before the
  investigation can satisfy the Analysis → Review completeness gate (`investigation-workflow.md`
  §8) — a residual assessment is what distinguishes a completed risk assessment from an initial
  triage note.
- **Success Behavior**: Saving recomputes `residualRiskScore`/`residualRiskBand` live.
- **Error Behavior**: Standard inline-validation pattern. If `residualRiskScore >
  initialRiskScore`, the save still succeeds but shows a non-blocking inline warning ("Residual risk
  is higher than initial risk — please confirm this is intentional") — unusual but not invalid, e.g.
  a control later found ineffective.
- **Empty State**: "Residual risk not yet assessed" shown on the hazard card until this FR's fields
  are completed.
- **Edge Cases**: A hazard with no meaningful existing controls (Existing Controls left blank) may
  still have Residual Likelihood/Severity recorded identical to the Initial values — this is valid
  and simply means the investigator's assessment is that nothing currently in place reduces the
  risk (as in the worked example in `data-model.md` §10, where daylight-only patrols do not address
  a dusk-hours hazard).

### FR-069 — Configure Risk Bands (Administrator)
- **Purpose**: Let an Administrator adjust the qualitative risk-band thresholds without a code or
  schema change — this is what makes the risk matrix "configurable" in practice, not just in
  principle.
- **User**: ADMIN only.
- **Inputs**: For each `RiskBandConfiguration` row: Min Score, Max Score, Band Label, Color, Display
  Order, Active flag. Reached from Settings (`ui-spec.md` §18).
- **Outputs**: Updated `RiskBandConfiguration` table (`data-model.md` §6.4).
- **Validation Rules**: Active bands must collectively cover 1–25 with no gaps and no overlaps
  (`data-model.md` §6.4's integrity rule); a save that would violate this is rejected with the
  specific conflicting range shown. Band Label must be unique among active rows.
- **Success Behavior**: New band configuration takes effect immediately for all **future**
  risk-score computations.
- **Error Behavior**: A gap/overlap violation blocks save with an inline explanation; band edits are
  otherwise atomic (all rows save together or none do, to avoid a momentarily-invalid configuration
  being visible to other users).
- **Empty State**: N/A — the table is always seeded with the default 4-band configuration
  (`data-model.md` §6.4) and cannot be left empty.
- **Edge Cases**: Reconfiguring bands does **not** retroactively recompute `initialRiskBand`/
  `residualRiskBand` on existing `Hazard`/`Occurrence` rows (`data-model.md` §6.4 — stored, not a
  live join), so historical reports remain stable; a banner on this settings screen states this
  explicitly so an Administrator isn't surprised that past records don't visibly change.

### FR-030 — Remove Hazard
- **Purpose**: Correct data-entry mistakes.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Selected hazard, confirmation.
- **Outputs**: `Hazard` row removed; any `ContributingFactorHazardLink`, `CorrectiveAction.hazardId`,
  or `PreventiveAction.hazardId` references are cleared (link removed, not a cascading delete of the
  linked factor/action).
- **Validation Rules**: Confirmation required; the confirmation dialog notes if the hazard is
  currently linked to one or more contributing factors or actions, so the user understands the link
  will be cleared.
- **Success Behavior**: Hazard removed; linked records remain, now unlinked.
- **Error Behavior**: Failed delete shows an error, entry remains.
- **Empty State**: N/A.
- **Edge Cases**: Removing a hazard that is the sole reason the completeness gate (§ FR-029 Empty
  State) is satisfied re-opens that gate if no contributing factor exists either.

---

## 15. Contributing Factors

**Revision note (root cause analysis module pass)**: Category now uses the 10-value framework in
`data-model.md` §6.7 (was 5 values). FR-031 updated in place.

### FR-031 — Add / Edit Contributing Factor
- **Purpose**: Record factors that contributed to the occurrence, optionally linked to hazards.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Description, Category (Human Factors/Equipment/Environment/Procedures/Training
  /Supervision/Communication/Organization/Management/External Factors — `data-model.md` §6.7),
  optional link to one or more existing Hazards.
- **Outputs**: New or updated `ContributingFactor` row, plus `ContributingFactorHazardLink` rows for
  any selected hazards.
- **Validation Rules**: Description and Category required. Linked hazards, if any, must belong to the
  same investigation.
- **Success Behavior**: Entry added/updated; list grouped by Category.
- **Error Behavior**: Standard inline-validation pattern.
- **Empty State**: "No contributing factors identified yet"; joint completeness rule with Hazards, per
  FR-029.
- **Edge Cases**: A contributing factor can be linked to multiple hazards, and a hazard can be linked
  from multiple contributing factors (many-to-many, per `data-model.md` §2.15).

### FR-032 — Remove Contributing Factor
- **Purpose**: Correct data-entry mistakes.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Selected entry, confirmation.
- **Outputs**: Row and its hazard links removed; any `RootCauseContributingFactorLink` references are
  cleared (link removed, root cause itself remains).
- **Validation Rules**: Confirmation required, with a note if the factor is linked to a root cause.
- **Success Behavior**: Removal completes; linked root cause remains, now unlinked from this factor.
- **Error Behavior**: Failed delete shows an error, entry remains.
- **Empty State**: N/A.
- **Edge Cases**: Same joint-completeness interaction as FR-030.

### FR-033 — Generate Potential Contributing Factors (Investigation Support)
- **Purpose**: Surface candidate contributing factors by comparing this investigation's narrative
  against closed investigations' narratives — the canonical implementation of the "Potential
  Contributing Factor" label (product-spec §11.1).
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: The investigation's Narrative Description; user clicks "Find Potential Contributing
  Factors".
- **Outputs**: A ranked list of **Potential Contributing Factor** suggestions, each derived from the
  contributing factors recorded on similar closed investigations (local text-similarity, product-spec
  §6.2), each tagged with which past investigation it was drawn from (transparency).
- **Validation Rules**: Requires a non-empty Narrative Description. Suggestions are never auto-added
  to `ContributingFactor` — each requires an explicit "Add to this investigation" action, which then
  routes through FR-031's normal save path (pre-filled, still editable before saving).
- **Success Behavior**: Suggestions list renders below the confirmed Contributing Factors list, kept
  visually and structurally distinct at all times.
- **Error Behavior**: No similar closed investigations found (e.g., very early in the system's life,
  or a narrative with no meaningful overlap) returns an explicit "No similar past investigations
  found" state, not an error.
- **Empty State**: Before the button is clicked, no suggestions are shown.
- **Edge Cases**: A suggestion drawn from a since-deleted source investigation (should not normally
  occur, since investigations are not hard-deleted once past `DRAFT` — FR-055) is defensively excluded
  from results rather than causing a broken reference in the UI.

---

## 16. 5 Whys Analysis

**Revision note (root cause analysis module pass)**: the chain is now capped at 5 entries (Why #1
through Why #5), down from the prior 10, matching the requested structure exactly. Stopping before
Why #5 once a root cause is established was already allowed and remains so. FR-035 updated in place.

### FR-034 — Start New 5 Whys Analysis
- **Purpose**: Begin a structured root-cause drill-down from a specific problem statement.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Problem Statement (text).
- **Outputs**: New `FiveWhysAnalysis` record, empty of `FiveWhysEntry` rows, ready for FR-035.
- **Validation Rules**: Problem Statement required, minimum 10 characters.
- **Success Behavior**: New analysis card appears in the section; user is prompted to add the first
  "Why".
- **Error Behavior**: Standard inline-validation pattern.
- **Empty State**: "No 5 Whys analyses started yet" with a "Start Analysis" call to action; optional
  section for completeness purposes (root cause, not 5 Whys itself, is the completeness-gating item
  per `investigation-workflow.md` §4).
- **Edge Cases**: Multiple independent analyses may exist for one investigation (e.g., separate
  causal branches for a mechanical issue and a procedural issue) — see FR-14.4/data-model §2.16.

### FR-035 — Add / Edit Why Entry
- **Purpose**: Record each step of the why-chain, "Why #1" through "Why #5".
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Question (text), Answer (text), Sequence Number (auto-assigned, next in order).
- **Outputs**: New or updated `FiveWhysEntry` row under the parent analysis.
- **Validation Rules**: Question and Answer required. At least one entry (Why #1) is required before
  the analysis can be concluded with a root cause (FR-038); beyond that, the investigator may stop at
  any point — there is no minimum entry count enforced, only the maximum below.
- **Success Behavior**: Entry appended to the chain in sequence; editing an existing entry's answer
  does not automatically regenerate downstream entries (the user re-runs FR-036 manually if they want
  an updated follow-up suggestion). After each entry, a "Root cause established — conclude analysis"
  action is always available, so stopping early is a first-class action, not a workaround.
- **Error Behavior**: Standard inline-validation pattern.
- **Empty State**: A newly started analysis (FR-034) shows zero Why entries with a prompt to add the
  first one.
- **Edge Cases**: Attempting to add a 6th entry to a single analysis is blocked with a message
  suggesting the analysis be split into a second, more specific 5 Whys branch (FR-034), or that the
  current chain be concluded with a root cause (FR-038) — the 5-entry cap (`data-model.md` §3.16) is
  a hard limit, not a soft recommendation.

### FR-036 — Generate Recommended Follow-up Question (Investigation Support)
- **Purpose**: Speed up the why-chain using a templated prompt derived from the previous answer —
  the canonical implementation of the "Recommended Follow-up" label (product-spec §11.1).
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: The most recent `FiveWhysEntry.answer` in the active analysis; user clicks "Suggest Next
  Question".
- **Outputs**: A **Recommended Follow-up** question pre-filled into a new entry's Question field
  (e.g., turning "the checklist step was skipped" into "Why was the checklist step skipped?"),
  clearly tagged as a suggestion, Answer left blank for the user to complete.
- **Validation Rules**: Requires at least one existing `FiveWhysEntry` in the analysis. The suggested
  question is fully editable before save and is not distinguished from a manually-typed question once
  saved (no permanent "was suggested" flag on individual why-entries — unlike Classification, this is
  a lightweight phrasing aid, not a substantive determination, so no acceptance audit trail is
  required here per product-spec §11.1's confirm-before-persist rule, which this satisfies via the
  ordinary FR-035 save step still being required).
- **Success Behavior**: A new entry row appears, pre-filled, uncommitted until FR-035's save is
  invoked.
- **Error Behavior**: If the previous answer is too short/ambiguous to template meaningfully, the
  system returns a generic fallback ("Why did this happen?") rather than a nonsensical
  auto-generated sentence.
- **Empty State**: The button is disabled (with tooltip) until at least one Why entry exists.
- **Edge Cases**: Running the suggestion twice in a row without saving the first suggestion replaces
  the pending draft rather than creating two pending entries.

### FR-037 — Remove Why Entry / Delete Analysis
- **Purpose**: Correct data-entry mistakes or discard an unproductive analysis branch.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Selected entry or whole analysis, confirmation.
- **Outputs**: Entry removed (subsequent entries' sequence numbers shift down to stay contiguous), or
  the whole `FiveWhysAnalysis` and all its entries removed.
- **Validation Rules**: Confirmation required in both cases; deleting a whole analysis warns how many
  entries will be lost. Any `RootCause.fiveWhysAnalysisId` referencing a deleted analysis has that
  link cleared (root cause itself remains).
- **Success Behavior**: Removal completes; sequence numbers remain contiguous starting at 1.
- **Error Behavior**: Failed delete shows an error, no partial removal occurs.
- **Empty State**: N/A.
- **Edge Cases**: Removing the only entry in an analysis leaves the analysis in its "started, no
  entries" state (FR-034's empty condition), not auto-deleted.

---

## 17. Root-Cause Analysis

**Revision note (root cause analysis module pass)**: this module is redesigned around the full
requested field set — Potential Root Cause, Supporting Evidence, Investigator Notes, and Confidence
Level (`data-model.md` §3.17, §6.8) — and the required non-declaration wording (product-spec §11.6).
FR-038/FR-039 updated in place.

### FR-038 — Add / Edit Root Cause (Potential Root Cause, with Investigator Assessment)
- **Purpose**: Record the investigator's assessed root cause(s) of the occurrence — always framed as
  an assessment, never an established fact (product-spec §11.6) — with traceability to the
  supporting 5 Whys analysis and evidentiary basis.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Potential Root Cause description, Category (the 10-value framework in `data-model.md`
  §6.7), Supporting Evidence (text), Investigator Notes (text, optional), Confidence Level
  (Low/Medium/High), optional link to one 5 Whys analysis, optional links to one or more Contributing
  Factors.
- **Outputs**: New or updated `RootCause` row, plus `RootCauseContributingFactorLink` rows for any
  selected factors. Reachable two ways: a standalone "Add Root Cause" action, or a "Conclude
  Analysis" action on a specific `FiveWhysAnalysis` card (FR-034), which pre-fills
  `fiveWhysAnalysisId` and requires at least one `FiveWhysEntry` (Why #1) to already exist on that
  analysis.
- **Validation Rules**: Description, Category, Supporting Evidence, and Confidence Level are all
  required together (unless using the inconclusive override, `investigation-workflow.md` §9.5, in
  which case none of the four are required but `inconclusiveJustification` is). Supporting Evidence
  minimum 10 characters — an explicit "No direct supporting evidence identified yet" is an accepted
  value, but the field may not be left blank (this is what prevents a bare, unsupported assertion).
  Linked 5 Whys analysis and contributing factors, if any, must belong to the same investigation. A
  given `FiveWhysAnalysis` may be linked from at most one `RootCause` (`data-model.md` §3.17) — the
  "Conclude Analysis" action is disabled on an analysis that already has a linked root cause, with a
  link to edit the existing one instead.
- **Success Behavior**: Entry added/updated, always displayed under the "Potential Root Cause" /
  "Investigator Assessment" labeling (product-spec §11.6, `ui-spec.md` §14); at least one Root Cause
  (or an inconclusive override) satisfies the review completeness gate
  (`investigation-workflow.md` §8).
- **Error Behavior**: Standard inline-validation pattern; attempting to save without Supporting
  Evidence or Confidence Level (when not using the inconclusive override) is blocked with a message
  explaining why both are required.
- **Empty State**: "No potential root causes recorded yet" — this is the one analysis section that is
  **mandatory** (not "acknowledge empty," unless using the inconclusive override) for submission, per
  the completeness gate.
- **Edge Cases**: A root cause may be recorded with no 5-Whys or Contributing Factor links at all
  (traceability links are optional aids, not a hard requirement — not every investigation runs a
  full 5 Whys for every root cause). Multiple root causes are fully supported and expected for
  investigations with more than one independent causal branch (`data-model.md` §6.8) — each may
  optionally pair with its own concluded 5 Whys analysis.

### FR-039 — Remove Root Cause
- **Purpose**: Correct data-entry mistakes.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Selected entry, confirmation.
- **Outputs**: Row removed; any `CorrectiveAction.rootCauseId` references are cleared (action
  remains, unlinked); the linked `FiveWhysAnalysis`, if any, is not deleted and becomes available
  again for a new "Conclude Analysis" action (FR-038).
- **Validation Rules**: Confirmation required, with a note if the root cause is linked to one or more
  corrective actions or a 5 Whys analysis.
- **Success Behavior**: Removal completes.
- **Error Behavior**: Failed delete shows an error, entry remains.
- **Empty State**: N/A.
- **Edge Cases**: Removing the last root cause re-opens the completeness gate if the investigation was
  otherwise ready for submission.

---

## 18. Corrective Actions

**Revision note (corrective/preventive action module pass)**: this module and modules 19–20 are
redesigned around the full field set and 6-status lifecycle in `data-model.md` §3.19–§3.20, §6.9.
This also corrects a stale artifact from an earlier revision: FR-040–FR-043 previously still
described a unified `Action` table with an `actionKind` discriminator, even though `data-model.md`
had already split it into separate `CorrectiveAction`/`PreventiveAction` tables (DM-2) — that
inconsistency is fixed here.

### FR-040 — Add / Edit Corrective Action
- **Purpose**: Define actions that address a root cause (and/or hazard) that already caused this
  occurrence.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Description, Priority (Low/Medium/High/Critical), Target Date, Responsible Person
  (registered user or external free-text name), Department (free text, optional), optional link to a
  Root Cause and/or a Hazard, Required for Closure (boolean, defaults `TRUE`).
- **Outputs**: New or updated `CorrectiveAction` row.
- **Validation Rules**: Description, Priority, Target Date, and a Responsible Person (one of
  user-owner or external-name, mutually exclusive) required. Target Date must be today or later at
  creation time (an action cannot be created already overdue — see Edge Cases for the one
  exception).
- **Success Behavior**: Entry added/updated; appears on the Corrective sub-tab (`ui-spec.md` §15) and
  the portfolio-wide Action Tracker (FR-070).
- **Error Behavior**: Standard inline-validation pattern.
- **Empty State**: "No corrective actions defined yet"; at least one action (Corrective or
  Preventive) satisfies the review completeness gate.
- **Edge Cases**: Editing an existing action's Target Date to a past date is permitted (the
  investigation may legitimately be behind schedule) — the future-date restriction applies only to a
  **new** action's initial Target Date, not to later edits. Leaving Required for Closure at its
  default (`TRUE`) means this action will block investigation closure until resolved
  (`data-model.md` §6.9.3) — an investigator may uncheck it for an action known to extend beyond the
  investigation's own timeline.

### FR-041 — Remove Corrective Action
- **Purpose**: Correct data-entry mistakes.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Selected action, confirmation.
- **Outputs**: `CorrectiveAction` row removed.
- **Validation Rules**: Confirmation required. An action already marked `Completed` or `Verified` may
  still be deleted by ADMIN/MANAGER only (correcting historical mistakes), not by INVESTIGATOR
  (prevents quietly erasing completed-work history) — INVESTIGATOR may delete only
  Open/Assigned/InProgress actions they created.
- **Success Behavior**: Removal completes.
- **Error Behavior**: An INVESTIGATOR attempting to delete a Completed or Verified action is blocked
  with an explanatory message and a suggestion to contact a Manager/Admin.
- **Empty State**: N/A.
- **Edge Cases**: Same as above.

---

## 19. Preventive Actions

### FR-042 — Add / Edit Preventive Action
- **Purpose**: Define actions that address an identified hazard (and/or root cause) to prevent
  future occurrences.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Description, Priority, Target Date, Responsible Person, Department (optional), optional
  link to a Hazard and/or a Root Cause, Required for Closure (boolean, defaults `FALSE`).
- **Outputs**: New or updated `PreventiveAction` row.
- **Validation Rules**: Identical shape to FR-040.
- **Success Behavior**: Entry added/updated; appears on the Preventive sub-tab.
- **Error Behavior**: Standard inline-validation pattern (same as FR-040).
- **Empty State**: "No preventive actions defined yet"; joint completeness rule with Corrective, per
  FR-040.
- **Edge Cases**: Same Target Date rule as FR-040. Required for Closure defaults `FALSE` here (unlike
  Corrective's `TRUE` default) since preventive measures often involve longer-term, system-level
  changes that reasonably extend past the investigation's own closure (`data-model.md` §3.20) — an
  investigator may still flag a specific preventive action `TRUE` when it genuinely must land first.

### FR-043 — Remove Preventive Action
- **Purpose**: Correct data-entry mistakes.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: Selected action, confirmation.
- **Outputs**: `PreventiveAction` row removed.
- **Validation Rules**: Identical to FR-041.
- **Success Behavior**: Removal completes.
- **Error Behavior**: Identical to FR-041.
- **Empty State**: N/A.
- **Edge Cases**: Identical to FR-041.

---

## 20. Action Tracking

### FR-044 — Update Action Status
- **Purpose**: Reflect real-world progress on a corrective or preventive action through its full
  lifecycle.
- **User**: Per the transition rules in `data-model.md` §6.9.1 — varies by transition (e.g. any
  status change up to and including `Completed` is available to ADMIN, MANAGER, or the action's
  owner; the `Completed → Verified` transition specifically excludes the action's own owner — see
  FR-045b).
- **Inputs**: Selected action, new Status (`Open`/`Assigned`/`InProgress`/`Completed`/`Verified`
  /`Cancelled` — "Overdue" is never directly settable, see FR-046).
- **Outputs**: Updated `status` (and any status-specific required fields, per FR-045a/FR-045b).
- **Validation Rules**: Only the transitions listed in `data-model.md` §6.9.1 are valid; any other
  `(from, to)` pair is rejected. `Open → Assigned` additionally happens **automatically** the instant
  an owner is set on an `Open` action (no manual status step needed for that specific transition).
  Moving `Completed`/`Verified` back to `InProgress` (reopening) requires a confirmation ("this will
  clear the completion/verification record") and is restricted to ADMIN/MANAGER.
- **Success Behavior**: Status updates immediately; dashboard/portfolio counts (FR-003) and the
  Action Tracker (FR-070) reflect the change on next load.
- **Error Behavior**: An invalid transition attempt (should not normally be reachable via the UI) is
  rejected server-side with a clear message naming the specific rule violated.
- **Empty State**: N/A.
- **Edge Cases**: Reopening a `Completed` or `Verified` action back to `InProgress` clears
  `completedDate`, `verificationMethod`, `effectivenessResult`, and `verificationNotes` (they are
  re-entered if the action is completed and verified again later).

### FR-045a — Mark Action Complete
- **Purpose**: Record completion of an action's underlying work — a distinct, earlier step from
  confirming it was effective (FR-045b).
- **User**: ADMIN, MANAGER, the action's assigned owner.
- **Inputs**: Completion Date.
- **Outputs**: `status = Completed`, `completedDate` set.
- **Validation Rules**: Only valid from `Open`/`Assigned`/`InProgress` (§6.9.1). Completion Date
  required, cannot be in the future; no minimum-duration check against Target Date (an action can
  legitimately be completed early or late).
- **Success Behavior**: Action moves to `Completed` everywhere it is displayed and becomes eligible
  for verification (FR-045b).
- **Error Behavior**: Standard inline-validation pattern.
- **Empty State**: N/A.
- **Edge Cases**: Marking complete an action that was already Overdue (derived status) simply
  resolves the Overdue display, since `Completed` is never Overdue (§6.9.2) — no separate "late
  completion" flag is tracked in v1 (documented limitation).

### FR-045b — Verify Action Effectiveness
- **Purpose**: Independently confirm that a completed action actually achieved its intended effect —
  a deliberate second step, not folded into completion, mirroring the Investigator/Reviewer
  separation already used for investigation review (product-spec §8.1).
- **User**: ADMIN, MANAGER, REVIEWER — **explicitly excluding** the action's own
  `ownerUserId`/whoever is logged in if they are that owner (`data-model.md` §6.9.1). An
  INVESTIGATOR who is not the action's owner may not verify it either — verification is reserved to
  the three roles above regardless of ownership.
- **Inputs**: Verification Method (FollowUpInspection/DataReview/Audit/Retest/StakeholderInterview
  /Other), Effectiveness Result (Effective/PartiallyEffective/NotEffective/TooEarlyToAssess),
  Verification Notes (text, optional).
- **Outputs**: `status = Verified`, `verificationMethod`, `effectivenessResult`, `verificationNotes`
  set.
- **Validation Rules**: Only valid from `Completed`. Verification Method and Effectiveness Result
  both required.
- **Success Behavior**: Action moves to `Verified`, its terminal successful state; counts toward the
  closure gate as resolved (`data-model.md` §6.9.3).
- **Error Behavior**: An attempt by the action's own owner is rejected with "This action must be
  verified by someone other than its owner." An attempt from any status other than `Completed` is
  rejected with a message to complete the action first.
- **Empty State**: A `Completed` action awaiting verification shows "Awaiting independent
  verification" rather than appearing indistinguishable from a fully-closed item.
- **Edge Cases**: `NotEffective` or `PartiallyEffective` results do not automatically reopen the
  action or create a new one — the investigator reviews the result and manually decides whether to
  reopen this action (FR-044) or record a new one addressing the residual gap; this keeps the
  historical verification record intact either way.

### FR-046 — View Overdue Action Indicator
- **Purpose**: Make schedule risk visible without requiring a separate manual status update — this
  is the concrete mechanism behind "the system automatically identifies overdue actions."
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: None (derived: `targetDate < today AND status IN (Open, Assigned, InProgress)` —
  `data-model.md` §6.9.2).
- **Outputs**: "Overdue" badge shown in place of (not in addition to) the stored
  Open/Assigned/InProgress status, everywhere the action appears (investigation view, dashboard,
  Action Tracker, report).
- **Validation Rules**: N/A (pure derivation, computed consistently server-side so all views agree —
  `data-model.md` §6.9.2).
- **Success Behavior**: Badge appears/disappears automatically as the current date crosses the target
  date, with no user action required.
- **Error Behavior**: N/A.
- **Empty State**: N/A.
- **Edge Cases**: An action due exactly "today" is not yet Overdue (strictly `targetDate < today`).
  `Completed`, `Verified`, and `Cancelled` actions are never Overdue regardless of date.

### FR-047 — Reassign Action Owner
- **Purpose**: Move ownership of an action between people as responsibilities change.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning the parent investigation).
- **Inputs**: Selected action, new Responsible Person (registered user or external free-text name),
  optionally a new Department.
- **Outputs**: Updated `ownerUserId`/`ownerExternalName`/`department`.
- **Validation Rules**: Exactly one of user-owner or external-name must be set (mutually exclusive,
  same as FR-040).
- **Success Behavior**: Ownership updates immediately; the action moves between "my actions" groupings
  for the affected users; an `Open` action reassigned to a new owner immediately (re-)triggers the
  automatic `Open → Assigned` transition if not already past it.
- **Error Behavior**: Standard inline-validation pattern.
- **Empty State**: N/A.
- **Edge Cases**: Reassigning a Completed or Verified action's owner is permitted (corrects
  historical attribution) and does not alter its status, completion, or verification record.

### FR-048 — View Action Summary Counts on Investigation
- **Purpose**: Give a quick per-investigation rollup without opening the full Actions section.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: None (derived).
- **Outputs**: Counts by status (all 6 stored values plus derived Overdue) shown on the
  investigation's summary card (`ui-spec.md` §2) and Overview section, with a separate count of
  Required-for-Closure actions not yet resolved.
- **Validation Rules**: N/A.
- **Success Behavior**: Updates live alongside FR-044/FR-045a/FR-045b/FR-046.
- **Error Behavior**: N/A.
- **Empty State**: "No actions defined yet" when both Corrective and Preventive lists are empty.
- **Edge Cases**: N/A.

### FR-070 — View Portfolio-Wide Action Tracker
- **Purpose**: Give a cross-investigation view of every corrective and preventive action, so a
  Manager or Administrator can track action health across the whole portfolio rather than opening
  each investigation individually.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER (read-only role-scoping matches FR-007 —
  an INVESTIGATOR sees actions on investigations they own/are assigned to, a VIEWER sees actions on
  non-`Draft` investigations only).
- **Inputs**: Optional filters (below); reached from a new top-level "Action Tracker" nav item
  (`ui-spec.md` §19).
- **Outputs**: A single DataTable spanning `CorrectiveAction` and `PreventiveAction` across all
  visible investigations — Action ID, Description, Type (Corrective/Preventive), Investigation
  Reference, Responsible Person, Department, Priority, Target Date, Status (incl. derived Overdue),
  Required for Closure.
- **Validation Rules**: Same role-scoped visibility as FR-007, applied via each action's parent
  investigation.
- **Filters**:
  - **Owner** — registered user or external name, multi-select, dynamic options from actions
    currently visible to the requesting role.
  - **Status** — multi-select over the 6 stored values plus `Overdue` (selecting `Overdue` filters
    on the derived condition, not a stored value).
  - **Priority** — multi-select (Low/Medium/High/Critical).
  - **Target Date** — from/to date range.
  - **Investigation** — multi-select by reference number/title, dynamic options.
  - All filters combine with AND logic and persist in the URL, matching the pattern established for
    the Investigations list (FR-059–FR-061) and the Dashboard (FR-065).
- **Success Behavior**: Table updates live as filters change; each row links to its parent
  investigation's Corrective/Preventive Actions page (`ui-spec.md` §15).
- **Error Behavior**: A failed load shows a retry affordance; the previous successful result set (if
  any) remains visible.
- **Empty State**: "No actions match these filters" with a "Clear filters" affordance; "No actions
  recorded across any investigation yet" when the portfolio has none at all.
- **Edge Cases**: An action whose parent investigation is `Draft` is excluded for VIEWER (matching
  FR-007) but included for all other roles with visibility into that investigation.

---

## 21. Investigation Review

### FR-049 — Submit Investigation for Review
- **Purpose**: Move a sufficiently complete investigation into independent review.
- **User**: ADMIN, MANAGER, INVESTIGATOR (assigned/owning).
- **Inputs**: None beyond the submit action itself (the system evaluates current stored data).
- **Outputs**: Status transitions `OPEN`/`CHANGES_REQUESTED` → `UNDER_REVIEW`.
- **Validation Rules**: The completeness gate in `investigation-workflow.md` §4 must be fully
  satisfied; unmet items block submission entirely (not a warning — see `investigation-workflow.md`
  §4's explicit "disabled, not merely warned" rule) and are listed with direct links to the relevant
  section.
- **Success Behavior**: Status updates; the investigation becomes read-only for the
  investigator (FR-011); a notification-equivalent (in-app indicator) surfaces it to REVIEWER-role
  users' list views.
- **Error Behavior**: Attempting to submit with unmet gate items is blocked client-side and
  re-validated server-side (defense in depth); a race where data changes between page-load and submit
  is caught server-side with a fresh unmet-items list returned.
- **Empty State**: N/A.
- **Edge Cases**: A REVIEWER cannot submit (submission is investigator/manager/admin-only, per
  product-spec §8.2's separation of duties).

### FR-050 — View Submitted Investigation (Reviewer)
- **Purpose**: Give the Reviewer full visibility into an investigation awaiting decision.
- **User**: REVIEWER (also visible read-only to ADMIN/MANAGER).
- **Inputs**: None (navigation to the Review section of an `UNDER_REVIEW` investigation).
- **Outputs**: Read-only rendering of every data section (identical layout to the investigator's view,
  per `ui-spec.md` §3.10) plus the Review section's comment/decision controls.
- **Validation Rules**: Only reachable for investigations in `UNDER_REVIEW` status; a REVIEWER opening
  an `OPEN`/`DRAFT` investigation sees the standard read-only view with no decision controls (nothing
  to decide yet).
- **Success Behavior**: All data renders identically to how the investigator entered it — no
  reviewer-specific data transformation, to avoid any discrepancy between what was submitted and what
  is reviewed.
- **Error Behavior**: N/A beyond FR-009's general error handling.
- **Empty State**: N/A.
- **Edge Cases**: N/A.

### FR-051 — Approve Investigation
- **Purpose**: Formally close out an investigation as satisfactorily completed.
- **User**: REVIEWER (ADMIN retains an emergency override per §0.2).
- **Inputs**: Optional comment.
- **Outputs**: `ReviewLog` entry (`reviewStatus = Approved`); investigation status → `CLOSED`;
  `closedAt` set (see FR-053).
- **Validation Rules**: Only valid from `UNDER_REVIEW` status. Comment is optional but recommended
  (UI nudge, not a hard requirement) since approval is generally less contentious than a rejection.
- **Success Behavior**: Investigation closes; report (FR-056) is now presented as final, no longer
  draft-watermarked.
- **Error Behavior**: Attempting to approve an investigation not in `UNDER_REVIEW` (e.g., a stale
  page) is rejected with a clear message and the page refreshes to the current state.
- **Empty State**: N/A.
- **Edge Cases**: An ADMIN using the emergency override records the same `ReviewLog` entry, attributed
  to that ADMIN, so the audit trail (module 25) always shows who actually approved it.

### FR-052 — Request Changes
- **Purpose**: Send an investigation back to the investigator with specific, recorded feedback.
- **User**: REVIEWER (ADMIN retains an emergency override).
- **Inputs**: Comment (required).
- **Outputs**: `ReviewLog` entry (`reviewStatus = ChangesRequested`); investigation status →
  `CHANGES_REQUESTED`.
- **Validation Rules**: Only valid from `UNDER_REVIEW` status. Comment required, minimum 10
  characters (a rejection with no substantive feedback is not useful to the investigator).
- **Success Behavior**: Status updates; the investigator sees the comment prominently and an explicit
  "Resume Editing" action to move back to `OPEN` (`investigation-workflow.md` §5, step 3 — an explicit
  button, not an automatic transition on first edit, to keep the review record unambiguous).
- **Error Behavior**: Missing/too-short comment blocks submission with an inline message.
- **Empty State**: N/A.
- **Edge Cases**: Multiple review cycles (submit → changes requested → resubmit → …) are all recorded
  as separate `ReviewLog` entries, giving a complete history in the final report (module 25).

---

## 22. Investigation Closure

### FR-053 — Close Investigation (System Behavior on Approval)
- **Purpose**: Define exactly what "closed" means and guarantees for the record.
- **User**: System-triggered by FR-051 (no independent user-initiated "close" action exists outside
  of approval, by design — closure is always the outcome of a review decision, never a shortcut).
- **Inputs**: N/A (triggered by FR-051).
- **Outputs**: `Incident.status = CLOSED`, `closedAt` timestamp set.
- **Validation Rules**: Only reachable via FR-051.
- **Success Behavior**: All data sections become read-only (FR-011); the report (FR-056) is presented
  as final.
- **Error Behavior**: N/A (this is a derived consequence of FR-051, which carries its own error
  handling).
- **Empty State**: N/A.
- **Edge Cases**: N/A.

### FR-054 — Reopen Closed Investigation
- **Purpose**: Allow further investigation after closure (new evidence, identified error, etc.).
- **User**: ADMIN, MANAGER, INVESTIGATOR.
- **Inputs**: Reopen Reason (required, free text).
- **Outputs**: `Incident.status = OPEN`, `Incident.reopenReason` set, a corresponding audit/history
  entry recorded (module 25).
- **Validation Rules**: Only valid from `CLOSED` status. Reopen Reason required, minimum 10
  characters.
- **Success Behavior**: Data sections become editable again (FR-011); the investigation must be
  resubmitted through FR-049 to close again — reopening never returns directly to `UNDER_REVIEW`
  (`investigation-workflow.md` §6).
- **Error Behavior**: Missing/too-short reason blocks the action with an inline message.
- **Empty State**: N/A.
- **Edge Cases**: Reopening does not clear any previously recorded data — it only unlocks editing; all
  prior `ReviewLog` history remains visible in the report.

### FR-055 — Delete Draft Investigation
- **Purpose**: Remove an investigation that was created in error or abandoned before any real work
  began.
- **User**: ADMIN.
- **Inputs**: Selected investigation, confirmation.
- **Outputs**: `Incident` row and all child records permanently removed (cascade, per `data-model.md`
  §1).
- **Validation Rules**: Only permitted while status is `DRAFT` (FR-2.7's rationale: once an
  investigation has moved past Draft, deletion would destroy real investigative work and audit
  history — reopening/closing is used instead of deletion for anything beyond Draft).
- **Success Behavior**: Investigation disappears from all lists immediately; reference number is not
  reused.
- **Error Behavior**: Attempting to delete a non-Draft investigation is rejected with an explanation
  and no partial deletion occurs.
- **Empty State**: N/A.
- **Edge Cases**: Deleting a draft investigation with uploaded evidence attachments also removes
  their `fileBytes` from the database via cascade (same pattern as FR-022) — not "from disk"; closes
  spec-review.md SR-001's other flagged instance of this language.

---

## 23. Report Generation

### FR-056 — Generate / View Investigation Report
- **Purpose**: Compile the full investigation record into the professional report structure defined
  in `report-spec.md`.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER; VIEWER (closed investigations only).
- **Inputs**: None beyond navigating to the report route.
- **Outputs**: Print-optimized HTML report reflecting current saved data (`report-spec.md` §3),
  including a disclaimer and, per product-spec §11.2, a statement that any accepted Investigation
  Support suggestions were human-reviewed.
- **Validation Rules**: The requesting user must have view access to the investigation (FR-007's
  scoping); VIEWER is blocked from `DRAFT`/`OPEN`/`UNDER_REVIEW`/`CHANGES_REQUESTED` reports.
- **Success Behavior**: Report renders in under 1 second (NFR-3.3) and always reflects live data,
  except that once `CLOSED` the underlying data cannot change (FR-011), so the report is effectively
  stable from that point on.
- **Error Behavior**: A rendering failure for one section (e.g., malformed data from a legacy import)
  shows that section as "Unable to render this section" rather than failing the whole report.
- **Empty State**: Every section renders even when empty, using explicit "No … recorded" text
  (`report-spec.md` §4), so the report is always structurally complete.
- **Edge Cases**: A `DRAFT`/`OPEN`/`UNDER_REVIEW`/`CHANGES_REQUESTED` investigation's report shows a
  prominent "DRAFT" watermark/badge (`report-spec.md` §6); this disappears only once `CLOSED`.

### FR-057 — Export Report to PDF (Print)
- **Purpose**: Produce a portable, offline-viewable copy of the report.
- **User**: Same as FR-056.
- **Inputs**: "Print / Save as PDF" toolbar action (FR-056's view).
- **Outputs**: The browser's native print dialog, targeting the print-optimized CSS layout
  (`report-spec.md` §2, §4) — no server-side rendering involved (assumption A7/RPT-1).
- **Validation Rules**: N/A (delegates to browser capability).
- **Success Behavior**: Printed/PDF output omits all UI chrome (toolbar, nav) and includes page
  numbers and the running footer defined in `report-spec.md` §4.
- **Error Behavior**: N/A (browser-native functionality; no server-side failure mode).
- **Empty State**: N/A.
- **Edge Cases**: N/A.

### FR-058 — Export Investigation Data as JSON
- **Purpose**: Provide a portable, machine-readable export of the full investigation record.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER; VIEWER (closed investigations only) — same
  scoping as FR-056.
- **Inputs**: "Export JSON" action.
- **Outputs**: A single JSON document containing every entity associated with the investigation
  (`data-model.md` §2), attachment file references by path/name (not embedded binary content).
- **Validation Rules**: Same view-access scoping as FR-056.
- **Success Behavior**: Download begins immediately with a filename derived from the reference number
  (e.g. `INC-2026-0001.json`).
- **Error Behavior**: A failed export shows a retry affordance; no partial file is left for the user
  to download.
- **Empty State**: N/A (an investigation always has at least its core record).
- **Edge Cases**: Fields not yet populated (e.g., a `DRAFT` investigation with no Aircraft data yet)
  are serialized as `null`/empty structures rather than omitted, so the JSON shape is always
  predictable for downstream tooling.

---

## 24. Search and Filtering

### FR-059 — Free-Text Search Across Investigations
- **Purpose**: Let a user quickly locate an investigation by title or reference number.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: Search text (applies to Title and Reference Number).
- **Outputs**: Investigation list (FR-007) filtered to matches, combinable with FR-060's filters.
- **Validation Rules**: Search is case-insensitive substring matching; minimum 1 character to trigger
  (no minimum-length gate beyond non-empty).
- **Success Behavior**: Results update as the user types (debounced), respecting the same role-scoped
  visibility as FR-007.
- **Error Behavior**: A search backend failure shows a retry notice and preserves the last successful
  result set rather than clearing it.
- **Empty State**: No matches shows "No investigations match '<query>'" with a one-click "Clear
  search" action.
- **Edge Cases**: Searching by a full or partial reference number (e.g. "2026-0007" or just "0007")
  matches correctly regardless of the `INC-` prefix being included.

### FR-060 — Filter Investigations by Attributes
- **Purpose**: Narrow the investigation list by structured criteria.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: Status, Severity, Occurrence Category, Date Range (occurrence date).
- **Outputs**: Investigation list (FR-007) filtered accordingly; the dashboard's chart drill-down
  (FR-004) lands here with the relevant filter pre-applied.
- **Validation Rules**: Date Range "from" must be ≤ "to" when both are provided; an invalid range is
  rejected inline before the filter is applied.
- **Success Behavior**: Multiple filters combine with AND logic (e.g., Status=OPEN AND
  Severity=Accident); filters persist across pagination (FR-008).
- **Error Behavior**: An invalid date range shows an inline message and does not apply until
  corrected.
- **Empty State**: No results under the current filter combination shows "No investigations match
  these filters" with a "Clear filters" action.
- **Edge Cases**: A VIEWER applying a Status=Draft filter simply yields zero results (drafts are
  excluded from VIEWER visibility regardless of filter selection) rather than the filter option being
  hidden, keeping the control set consistent across roles.

### FR-061 — Combine Search, Filter, and Sort
- **Purpose**: Ensure the three mechanisms compose predictably rather than each resetting the others.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER, VIEWER.
- **Inputs**: Any combination of FR-059's search text, FR-060's filters, and a sort column/direction
  (Reference #, Occurrence Date, Updated At).
- **Outputs**: A single consistently-ordered, filtered, searched result set with pagination (FR-008)
  applied last.
- **Validation Rules**: N/A beyond the individual mechanisms' own rules.
- **Success Behavior**: Changing one control (e.g., sort) does not clear the others (e.g., an active
  search term); the current combination is reflected in the URL so it survives a page refresh/share.
- **Error Behavior**: N/A beyond the individual mechanisms' own error handling.
- **Empty State**: Same combined empty-state message as FR-060, adapted to name whichever
  combination is active (e.g., "No investigations match '<query>' with the selected filters").
- **Edge Cases**: Clearing search while filters remain active correctly falls back to filter-only
  results (not an accidental full reset).

---

## 25. Audit/History Information

### FR-062 — View Investigation Audit Metadata
- **Purpose**: Show who did what and when at the investigation level.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER (all with view access); VIEWER on non-draft
  investigations.
- **Inputs**: None (derived from stored fields).
- **Outputs**: Created By/At, Last Updated At, Closed At (if applicable), Assigned Investigator,
  displayed on the Overview section and included in the report's Appendix C (`report-spec.md` §3.19).
- **Validation Rules**: N/A (read-only, derived).
- **Success Behavior**: Reflects the true current values at all times, updated on every relevant
  mutation.
- **Error Behavior**: N/A.
- **Empty State**: `closedAt` shows "—" for an investigation never closed.
- **Edge Cases**: An investigation closed and later reopened shows its most recent `closedAt` as
  historical (not cleared) alongside the reopen event in FR-064, so the full history remains legible.

### FR-063 — View Review & Decision History
- **Purpose**: Provide a chronological account of every review decision for accountability and for
  the final report's sign-off section.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER (all with view access); VIEWER on non-draft
  investigations.
- **Inputs**: None (derived from `ReviewLog`).
- **Outputs**: Timeline of entries — reviewer name, decision (Approved/Changes Requested), comment,
  timestamp — newest first, shown on the Review section (FR-050) and the report (`report-spec.md`
  §3.18).
- **Validation Rules**: N/A (read-only).
- **Success Behavior**: Every FR-051/FR-052 action appears here immediately and permanently (no
  edit/delete capability on review history, by design — it is an audit record).
- **Error Behavior**: N/A.
- **Empty State**: "No review decisions yet" for an investigation never submitted.
- **Edge Cases**: Multiple review cycles on the same investigation all appear, in order, giving a
  complete negotiation history between investigator and reviewer.

### FR-064 — View Reopen History
- **Purpose**: Make visible every time a closed investigation was reopened and why.
- **User**: ADMIN, MANAGER, INVESTIGATOR, REVIEWER (all with view access); VIEWER on non-draft
  investigations.
- **Inputs**: None (derived).
- **Outputs**: List of reopen events (timestamp, acting user, reason) interleaved chronologically with
  the review history (FR-063) in both the Review section and the report, so the full lifecycle reads
  as one coherent timeline rather than two disconnected logs.
- **Validation Rules**: N/A (read-only).
- **Success Behavior**: Every FR-054 action appears here immediately and permanently.
- **Error Behavior**: N/A.
- **Empty State**: No entry shown when an investigation has never been reopened (not an explicit "no
  reopens" line, to avoid cluttering the common case).
- **Edge Cases**: An investigation reopened multiple times over its life shows every cycle, so a
  reader can see the full back-and-forth between closure and continued investigation.

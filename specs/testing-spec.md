# Testing Specification — Aviation Incident Investigation Assistant

This document defines *what* must be tested and *what counts as passing*. `technical-architecture.md`
§12 already defines the testing *architecture* (Vitest for unit/integration/component, Playwright
for E2E, GitHub Actions for CI, ephemeral Neon branches per test run) — this document does not
redefine those tools; it specifies the concrete test scenarios and acceptance criteria that run on
top of them.

## 1. Test Category Overview

| # | Category (this pass) | Maps to `technical-architecture.md` §12 as | Primary target |
|---|---|---|---|
| 1 | Unit tests | Unit tests (Vitest) | Pure service-layer functions not covered by §6/§7 below |
| 2 | Integration tests | Integration tests (Vitest, ephemeral DB) | Server Actions/Route Handlers end-to-end |
| 3 | Database tests | A focused subset of integration tests | Schema constraints, cascade/RESTRICT/SET NULL behavior |
| 4 | Form validation tests | Validation tests (Vitest) | Zod schemas (`security-spec.md` §1) |
| 5 | Workflow tests | Integration tests | The 6-state machine (`investigation-workflow.md` §6–§7) |
| 6 | Risk calculation tests | Unit tests | The risk engine (`data-model.md` §6.3–§6.5) |
| 7 | Assistance-engine tests | Unit tests | `assistance-engine.md`'s rule capabilities |
| 8 | Report-generation tests | Integration/snapshot tests | `report-spec.md`'s 24-section structure |
| 9 | Responsive UI tests | Playwright (viewport variation) | `ui-spec.md` §6 breakpoints |
| 10 | Accessibility tests | Playwright + axe-core | WCAG AA commitments (NFR-6.1) |
| 11 | Security tests | Unit + integration | `security-spec.md`'s controls |

**Every scenario below is tagged Positive (valid input/expected-success path) or Negative
(invalid input, unauthorized access, or expected-failure path)** — both are required for every
feature area; a feature with only positive coverage is considered incompletely tested.

## 2. Acceptance Criteria by Feature Area

One row per `functional-requirements.md` module. Each is a plain-language acceptance statement,
cross-referenced to the FR(s) it covers and the test scenario(s) (§4) that verify it.

| Module | Acceptance Criteria | FRs | Verified by |
|---|---|---|---|
| 1. Dashboard | All 7 tiles and 6 charts reflect exactly the live counts defined in the metric dictionary; applying any filter recomputes every tile/chart consistently with no discrepancy between them | FR-001–004, FR-065 | TS-010 |
| 2. Investigation Creation | Valid input creates a Draft with a unique sequential reference number; a future Occurrence Date is rejected | FR-005–006 | TS-007, TS-017 |
| 3. Investigation List | Only investigations visible per role-scoping appear, correctly paginated and filterable | FR-007–008 | — (covered by role tests in §11) |
| 4. Investigation Detail | The Section Stepper, summary card, and read-only/editable state render correctly for every status × role combination | FR-009–011 | TS-052 |
| 5. Occurrence Information | Required fields gate section completeness; a missing required field blocks save | FR-012 | TS-017 |
| 6. Aircraft Information | Required fields (registration, model, damage level) gate section completeness | FR-013 | — |
| 7. Flight Information | Required fields gate section completeness | FR-014 | — |
| 8. Location Information | Only Location Description and Lighting are required; all else optional | FR-015 | — |
| 9. Persons Involved | At least one Person or the "no persons involved" toggle satisfies completeness; injury summary recomputes live | FR-016–018 | — |
| 10. Witness Management | A Witness may have Name = "Unknown/Unidentified"; Reliability Assessment is required | FR-019–020 | — |
| 11. Evidence Management | A valid 10-category Evidence Type plus required Source/Relevance/Reliability saves; `CCTVReference` never exposes an upload control | FR-021–024, FR-071 | TS-008 |
| 12. Immediate Actions | A timestamp before the Occurrence's own date/time is rejected | FR-025–026 | — |
| 13. Occurrence Classification | Category+Subcategory and Actual/Potential Outcome/Likelihood compute Severity/Risk/Priority correctly and are overridable with justification | FR-027–028, FR-066–067 | TS-027–031 |
| 14. Hazard Identification | Initial Risk computes on save; Residual is optional at creation but required before the Analysis→Review gate | FR-029, FR-068–069 | TS-027, TS-030 |
| 15. Contributing Factors | A Category from the 10-value framework and optional Hazard links save correctly | FR-031–033 | — |
| 16. 5 Whys Analysis | 1–5 Why entries are accepted; a 6th is rejected; conclusion is possible at any point ≥1 entry | FR-034–037 | — |
| 17. Root-Cause Analysis | Description+Category+Supporting Evidence+Confidence Level (or the inconclusive override) is required to save; multiple root causes per investigation are supported | FR-038–039 | TS-020–021 |
| 18. Corrective Actions | Exactly one owner and a non-past Target Date are required; Verified requires prior Completed and excludes the owner as verifier | FR-040–041 | TS-018–019, TS-011 |
| 19. Preventive Actions | Same shape as Corrective Actions | FR-042–043 | — |
| 20. Action Tracking | Overdue displays consistently everywhere; Required-for-Closure actions hard-block Review→Closed until resolved | FR-044–048, FR-070 | TS-012–016 (indirectly) |
| 21. Investigation Review | Submit for Review is disabled until the completeness gate is met; Approve/Request Changes is restricted to REVIEWER (+ADMIN override) | FR-049–052 | TS-009, TS-026 |
| 22. Investigation Closure | Approval sets `Closed`/`closedAt`; closure is blocked by incomplete required actions without a justified ADMIN override | FR-053–055 | TS-006 |
| 23. Report Generation | Every section renders for every investigation state, using the correct placeholder for any gap, with the correct classification banner | FR-056–058 | TS-037–041 |
| 24. Search and Filtering | A filter/search combination returns exactly matching results and persists across pagination and page refresh | FR-059–061 | — |
| 25. Audit/History Information | Every lifecycle event appends exactly one `InvestigationHistory` row, never subsequently altered | FR-062–064 | TS-012 (indirectly) |

## 3. Positive/Negative Testing Principle

Every feature area above is tested from **both directions**:

- **Positive**: valid input, authorized user, expected preconditions met → the operation succeeds
  and produces the specified result.
- **Negative**: invalid input, unauthorized user, or an unmet precondition → the operation is
  rejected, with the specific error/validation message the relevant FR defines, and **no partial
  side effect occurs** (no half-written row, no silent success, no misleading generic error where a
  specific one is defined).

A feature is not considered adequately specified for testing purposes until both directions have at
least one scenario — this is why §4 below deliberately balances positive and negative scenarios in
every category rather than defaulting to "happy path only."

## 4. Test Scenarios

54 scenarios across the 11 requested categories (exceeding the minimum of 30). IDs are permanent
once assigned, following the same convention as `functional-requirements.md`'s FR-IDs.

### 4.1 Unit Tests (TS-001 – TS-006)

| ID | Type | Scenario | Expected Result |
|---|---|---|---|
| TS-001 | Positive | Workflow transition validator called with `Draft → Open` when the gate is met | Returns valid; no exception |
| TS-002 | Negative | Workflow transition validator called with `Draft → Analysis` (skips two stages) | Returns invalid, naming the specific rule violated (`investigation-workflow.md` §7.1) |
| TS-003 | Positive | Action lifecycle validator called with `Completed → Verified` where the caller is a Reviewer who is not the action's owner | Returns valid |
| TS-004 | Negative | Action lifecycle validator called with `Completed → Verified` where the caller **is** the action's owner | Returns invalid — "must be verified by someone other than its owner" |
| TS-005 | Positive | Reference-number generator invoked 50 times concurrently (simulated) in the same calendar year | All 50 results are unique and sequential; no collisions |
| TS-006 | Negative | Closure-gate check run against an investigation with one `requiredForClosure = TRUE` action still `Open` | Returns blocked, naming that specific action |

### 4.2 Integration Tests (TS-007 – TS-011)

| ID | Type | Scenario | Expected Result |
|---|---|---|---|
| TS-007 | Positive | Call the create-investigation Server Action with valid input against a seeded test database | A new `Investigation` row exists with `status = Draft`, a unique `referenceNumber`, and an `InvestigationHistory` row of type `Created` |
| TS-008 | Positive | Upload a valid JPEG to an Evidence item, then immediately download it | Downloaded bytes are byte-identical to the upload; `Content-Type` matches; response is not labeled "Simulated" |
| TS-009 | Negative | Call the submit-for-review Server Action on an investigation missing a Root Cause | Rejected; the returned unmet-items list names Root Cause specifically, not a generic failure |
| TS-010 | Positive | Query the dashboard metrics function against a fixture matching `functional-requirements.md` §1.1's worked example | Every tile/chart value matches the worked example's stated numbers exactly |
| TS-011 | Negative | Call the verify-action Server Action as the action's own owner (session user = `ownerUserId`) | Rejected with an authorization error; `status` remains `Completed`, not `Verified` |

### 4.3 Database Tests (TS-012 – TS-016)

| ID | Type | Scenario | Expected Result |
|---|---|---|---|
| TS-012 | Positive | Delete a `Draft` investigation with at least one row in every child table | Every child row (Occurrence, Aircraft, Hazard, Evidence, Attachment, etc.) is gone; no orphaned rows remain in any table |
| TS-013 | Negative | Attempt to delete an investigation with `status = Open` | Rejected at the application layer before any `DELETE` reaches the database |
| TS-014 | Negative | Attempt to insert an `Occurrence` row with `occurrenceCategory = 'NotARealCategory'` | Rejected by the database's enum constraint |
| TS-015 | Positive | Delete a `Hazard` that is referenced by a `PreventiveAction.hazardId` | The `PreventiveAction` row still exists with `hazardId = NULL`; it is not deleted |
| TS-016 | Negative | Attempt to delete a `User` row referenced as `Investigation.createdByUserId` | Rejected (`RESTRICT`) |

### 4.4 Form Validation Tests (TS-017 – TS-021)

| ID | Type | Scenario | Expected Result |
|---|---|---|---|
| TS-017 | Negative | Validate a create-investigation payload with `occurrenceDate` set to tomorrow | Zod validation fails on that field specifically |
| TS-018 | Negative | Validate a Corrective Action payload with both `ownerUserId` and `ownerExternalName` set | Rejected — mutual-exclusivity `.refine()` fails |
| TS-019 | Positive | Validate the same payload with only `ownerUserId` set | Passes |
| TS-020 | Negative | Validate a Root Cause payload with `isInconclusive = false` and `supportingEvidence`/`confidenceLevel` omitted | Rejected — both are conditionally required |
| TS-021 | Positive | Validate a Root Cause payload with `isInconclusive = true` and only `inconclusiveJustification` populated | Passes |

### 4.5 Workflow Tests (TS-022 – TS-026)

| ID | Type | Scenario | Expected Result |
|---|---|---|---|
| TS-022 | Positive | A `Draft` investigation has complete Occurrence Details and gets an Investigator assigned | Status automatically becomes `Open` with no explicit user action required |
| TS-023 | Negative | Attempt to set `status = Review` directly on an `Open` investigation via a crafted request | Rejected — not a valid transition (`investigation-workflow.md` §7.2) |
| TS-024 | Positive | Reopen a `Closed` investigation with a 25-character reason | Status becomes `Under Investigation`; a `Reopened` history event is recorded |
| TS-025 | Negative | Reopen a `Closed` investigation with a 5-character reason | Rejected — below the 10-character minimum |
| TS-026 | Negative | An `INVESTIGATOR` calls the Approve action on a `Review`-status investigation they submitted themselves | Rejected — Approve is restricted to `REVIEWER`/`ADMIN` |

### 4.6 Risk Calculation Tests (TS-027 – TS-031)

| ID | Type | Scenario | Expected Result |
|---|---|---|---|
| TS-027 | Positive | Compute risk for Likelihood `Likely`(4) × Severity `Major`(4) under the seeded default bands | Score = 16, Band = `High` |
| TS-028 | Negative (boundary) | Compute risk for scores exactly 4 and exactly 5 under the seeded default bands | Score 4 → `Low`; Score 5 → `Moderate` (confirms band boundaries are inclusive/exclusive as specified, not off-by-one) |
| TS-029 | Positive | Compute Investigation Priority for a `DangerousGoodsIncident` occurrence whose raw matrix result is `Routine` | Result is floored up to at least `Elevated` |
| TS-030 | Negative (soft) | Save a Hazard with Residual Risk Score higher than Initial Risk Score | Save succeeds; a non-blocking warning is returned/displayed — it is not rejected |
| TS-031 | Positive | Change `RiskBandConfiguration`'s bands, then re-fetch a Hazard scored before the change | The Hazard's stored `initialRiskBand` is unchanged from its original value |

### 4.7 Assistance-Engine Tests (TS-032 – TS-036)

| ID | Type | Scenario | Expected Result |
|---|---|---|---|
| TS-032 | Positive | Run Suggested Classification against a narrative strongly matching a `RunwayExcursion` keyword rule | Returns `AircraftIncident`/`Runway Excursion` with High confidence and the matched keywords listed |
| TS-033 | Negative | Run Suggested Classification against a narrative with no keyword matches at all | Returns an explicit "no confident suggestion available" result, never a low-confidence guess |
| TS-034 | Positive | Run Missing-Information Warnings on a Persons section where `noPersonsInvolvedConfirmed = TRUE` | No Persons-related warning is produced |
| TS-035 | Positive | Compute the Completeness Score for a `Draft` investigation with only creation fields populated | Returns a score reflecting only `Draft`-stage-relevant fields, not penalized for later-stage fields |
| TS-036 | Positive | Run Report Quality Checks against a fixture investigation with 3 known "Not established" gaps in the would-be report | Returns exactly 3 items, each matching one gap, with no extras and no omissions |

### 4.8 Report-Generation Tests (TS-037 – TS-041)

| ID | Type | Scenario | Expected Result |
|---|---|---|---|
| TS-037 | Positive | Generate the report for a fully-populated `Closed` investigation | All 24 sections render with real data; no `DRAFT` watermark |
| TS-038 | Positive | Generate the report for a brand-new `Draft` investigation | All 24 sections render using only the defined placeholders; `DRAFT` watermark present; no error is thrown |
| TS-039 | Negative | Generate Established Facts and Investigation Conclusion for a fixture, then diff their content against the fixture's stored fields | No text appears in either section that does not trace to an actual stored value |
| TS-040 | Positive | Generate a report and inspect each section's classification banner | Every section's banner matches its assignment in `report-spec.md` §3/§5 exactly |
| TS-041 | Positive | Generate the JSON export for an investigation with several unpopulated optional fields | Those fields serialize as `null`, not omitted from the JSON structure |

### 4.9 Responsive UI Tests (TS-042 – TS-045)

| ID | Type | Scenario | Expected Result |
|---|---|---|---|
| TS-042 | Positive | Load Investigation Detail at a 375px viewport | Section Stepper renders as a "Jump to section" dropdown, not a left rail |
| TS-043 | Positive | Load Hazard Analysis at a 375px viewport with a hazard scored | The risk-matrix grid is reachable via horizontal scroll inside its own container, at full legible size |
| TS-044 | Positive | Load Investigation Detail at a 900px viewport | The right rail collapses into a toggleable drawer |
| TS-045 | Negative | Load every page in `ui-spec.md`'s page list at 375px, 768px, 1024px, and 1440px | No page produces horizontal scroll of the page body itself at any width tested |

### 4.10 Accessibility Tests (TS-046 – TS-049)

| ID | Type | Scenario | Expected Result |
|---|---|---|---|
| TS-046 | Positive | Run an automated axe-core scan against Dashboard, Investigation Detail, and Report Preview | Zero critical/serious violations reported |
| TS-047 | Positive | Complete "create investigation → save Occurrence Details" using only Tab/Enter/Arrow keys | Task completes with no mouse input; a visible focus indicator is present at every interactive element throughout |
| TS-048 | Positive | Run automated contrast checking on every StatusBadge/SeverityBadge/RiskBadge/PriorityBadge in both light and dark themes | All meet WCAG AA contrast ratios |
| TS-049 | Negative (mutation) | Remove an icon-only button's `aria-label` in a test fixture, then re-run TS-046's scan against that fixture | The scan now fails, confirming the check genuinely detects a missing accessible label rather than passing regardless |

### 4.11 Security Tests (TS-050 – TS-054)

| ID | Type | Scenario | Expected Result |
|---|---|---|---|
| TS-050 | Negative | Submit `'; DROP TABLE "Investigation"; --` as a Narrative Description | Stored verbatim as inert text; the `Investigation` table and all other data remain fully intact |
| TS-051 | Negative | Submit `<script>alert(1)</script>` as a Narrative Description, then render it in the UI | Displayed as literal escaped text; no script executes |
| TS-052 | Negative | A `VIEWER`-role session calls the create-Hazard Server Action directly (bypassing the UI) | Rejected with an authorization error; no `Hazard` row is created |
| TS-053 | Negative | Send a file-upload request to the Route Handler with an `Origin` header not matching the application's own origin | Rejected before the file is processed |
| TS-054 | Negative | Attempt a correct-password login for an account that has just exceeded the failed-attempt threshold | Rejected with a generic "too many attempts" message, even though the password is correct |

## 5. Coverage Targets and CI Gates

- **Unit + Form Validation + Risk Calculation + Assistance-Engine tests** (categories 1, 4, 6, 7):
  run on every pull request; a failure blocks merge (`technical-architecture.md` §12).
- **Integration + Database + Workflow tests** (categories 2, 3, 5): run on every pull request against
  a fresh ephemeral Neon branch; a failure blocks merge.
- **Report-Generation tests** (category 8): run on every pull request; a failure blocks merge, since
  a report defect (fabricated content, wrong placeholder) is a correctness issue, not a
  nice-to-have.
- **Responsive UI + Accessibility tests** (categories 9, 10): run via Playwright on every pull
  request against a preview deployment; a failure blocks merge for the specific pages/viewports
  affected.
- **Security tests** (category 11): run on every pull request; any failure is treated as a
  release-blocking severity, never deferred.
- No specific numeric coverage percentage is mandated by this document — the acceptance-criteria
  table (§2) is the completeness bar: every major feature area must have at least one passing
  positive and one passing negative test before it is considered done, which is a stronger guarantee
  for this project's purposes than an arbitrary line-coverage percentage would be.

## 6. Assumptions Specific to This Pass

- **TST-1**: Test scenario IDs (`TS-###`) are permanent once assigned, following the same convention
  established for `FR-###` (`functional-requirements.md` §0.1) — a removed scenario is marked
  Deprecated, never renumbered or reused.
- **TST-2**: This document specifies scenarios at the level of "what must be true," not literal test
  code — the eventual Vitest/Playwright implementation may split, combine, or parametrize these as
  fits the tooling, as long as every acceptance criterion in §2 remains independently verifiable.
- **TST-3**: The 54 scenarios in §4 are a required minimum baseline, not an exhaustive list — modules
  without a directly-listed `TS-###` in §2's "Verified by" column (e.g. modules 3, 6–10, 12, 15–16,
  19, 24) are still expected to receive equivalent positive/negative coverage during implementation,
  following the same pattern demonstrated for the modules that do have explicit scenarios here.

## 7. Consistency Notes — Required Follow-Up Elsewhere

This document was scoped to `testing-spec.md` only. No other spec file requires a change as a
direct result of this pass — this document is purely additive, testing behavior already specified
elsewhere. One item is worth flagging for the eventual implementation pass: `technical-architecture.md`
§12 should reference this document by name once it exists, so a future reader of the architecture
spec knows where the concrete scenario catalog lives rather than only the tooling choice.

Independent of this pass, the previously-flagged outstanding items remain unaffected:
`functional-requirements.md`'s old 5-state status names (§0.3, FR-011, FR-049–FR-054), and
`report-spec.md`'s partially-resolved `InvestigationHistory`/`InvestigationReview` timeline
interleaving.

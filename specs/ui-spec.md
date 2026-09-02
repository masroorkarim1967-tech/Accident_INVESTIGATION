# UI/UX Specification — Aviation Incident Investigation Assistant

This revision replaces the previous UI spec in full, adopts an **aviation operations/control-center**
visual identity (the "Ops Board" design language, §1), and re-specifies the application as the 18
named pages required for this pass. Several functional modules from `functional-requirements.md` do
not get a dedicated page here — §3 maps every module onto the page that actually hosts it, so nothing
from the approved functional requirements is silently dropped.

## 1. Visual Identity — the "Ops Board" Design Language

The application should read like the software running in an airline operations center or an ATC
support console: dense but orderly, dark by default, monospace data readouts, restrained color used
purposefully (never decoratively), and a permanent live UTC clock — because aviation runs on Zulu
time and showing it is both authentic and quietly reassuring to anyone who knows the domain.

### 1.1 Theme
- **Dark theme is the default and primary identity** — deep charcoal-navy backgrounds, panels one
  step lighter with a thin hairline border, evoking an instrument console rather than a consumer web
  app.
- **A light theme is available** (toggle in Settings, §18) for users who prefer it and for
  accessibility; both meet WCAG 2.1 AA contrast (NFR-6.1) — accent colors are tuned at
  implementation time to hit at least 4.5:1 against their background in both themes.
- **The Report Preview page always renders light/print-styled** regardless of the active app theme
  (`report-spec.md` requires a clean printable page); this is a deliberate, documented exception, not
  an inconsistency.

### 1.2 Color Language
Color is never decorative — every color in the system maps to a specific meaning, applied
consistently:

| Purpose | Color | Notes |
|---|---|---|
| Primary accent / primary actions | Amber | Evokes runway and instrument-panel lighting; used for the single primary button on any page |
| Secondary accent / interactive links | Teal/cyan | "Radar" accent; used for secondary actions, links, active nav state |
| Nominal / complete / success | Green | Closed investigations, Completed actions, success toasts, Low risk |
| Caution / in-progress | Amber (darker/muted variant) | Analysis stage, Medium risk, In Progress actions |
| Warning / elevated concern | Orange | High risk, Major/Hazardous severity |
| Critical / overdue / error | Red | **Reserved exclusively** for Overdue actions, Fatal injury, Catastrophic severity, Extreme risk, and error states — never used for an ordinary lifecycle stage, so a red badge always means "pay attention now" |
| Informational / neutral stage | Blue / Slate | Open and Draft stages, informational banners |
| Pending decision | Violet | Review stage only — deliberately distinct from amber/red so "awaiting a human decision" never reads as an alarm |

Investigation stage colors specifically: **Draft** = slate, **Open** = blue, **Under Investigation** =
teal, **Analysis** = amber, **Review** = violet, **Closed** = green.

### 1.3 Typography
- **Data/technical values** (reference numbers, timestamps, coordinates, statuses, the UTC clock,
  table cell values that are numbers/codes/dates) render in a monospace face (e.g. an IBM Plex
  Mono / JetBrains Mono–style stack) — reinforces the instrument-readout feel and improves scanability
  of tabular data.
- **Headings and body copy** render in a clean geometric sans-serif (e.g. an Inter / IBM Plex
  Sans–style stack) for readability.
- Both are system-font-stack fallback safe (no external font loading required beyond an optional
  self-hosted webfont — no external CDN dependency, consistent with `non-functional-requirements.md`
  NFR-1.1).

### 1.4 Iconography
A restrained line-icon set themed on the domain: aircraft silhouette, radar sweep, control tower,
headset, magnifying glass, clipboard/checklist, warning triangle, wrench, shield. Investigation
Support features use a deliberately **understated** icon (a small circuit/node glyph) rather than a
sparkle/magic-wand — visually reinforcing that these are rule-based aids, not "magic AI"
(product-spec §11.1).

### 1.5 Surfaces & Structure
- Panels look like instrument bezels: a flat dark fill, a thin 1px border in a muted slate/teal, a
  small-caps or letter-spaced panel header.
- Stat tiles render their headline number in large monospace type, like a digital gauge readout.
- Motion is minimal and purposeful — short, subtle transitions only (panel expand/collapse, toast
  in/out). The one deliberately decorative touch is a slow, subtle radar-sweep animation on the
  Login/Welcome page's hero panel (§4) — confined to that one page, not used elsewhere, so it reads
  as an identity moment rather than a distraction.

## 2. Global Layout & Navigation Shell

### 2.1 App Header Bar (every page)
Dark console strip, present on every page:
- **Left**: app wordmark + radar-sweep icon.
- **Center-right**: a live, continuously-updating UTC clock in monospace (`14:32:07Z`) — a signature
  "Ops Board" touch, purely informational.
- **Right**: primary nav (Dashboard · Investigations · Action Tracker · + New Investigation), a role badge (colored by
  role, e.g. Administrator=violet, Investigation Manager=teal, Investigator=amber, Reviewer=blue,
  Viewer=slate), user menu (name, Settings, Log out).

### 2.2 Disclaimer Ribbon (every page)
A slim amber-on-dark ribbon directly beneath the header: *"This application uses simulated,
fictional aviation incident data for demonstration purposes only. It is not affiliated with any
aviation authority and must not be used for real safety investigations or regulatory reporting."*
Dismissible per session (reappears on next login) — never fully removable, per product-spec §11.2.

### 2.3 Investigation Workspace Shell (pages 5–17)
Pages 5 through 17 (Investigation Overview through Report Preview) share a common shell:
- **Left rail — Section Stepper**: a fixed vertical list of the investigation's 13 workspace pages,
  each row showing its name and a **Completeness Dot** (hollow gray = Not Started, half-filled amber
  = In Progress, filled green = Complete). Always fully navigable regardless of the investigation's
  current stage — non-linear editing (`investigation-workflow.md` §1).
- **Top strip within the shell**: breadcrumb (`Investigations / INC-2026-0031 / Occurrence Details`),
  the investigation's **Stage Badge** (§1.2 colors) and **Severity Badge**, and a compact summary
  (reference number, title, assigned Investigator).
- **Main panel**: the active page's content.
- **Right rail** (collapsible ≥1200px, drawer below that): quick facts card (aircraft registration,
  occurrence date, injury summary) and an "Investigation Support" panel where relevant (§1.4).

## 3. Page-to-Module Mapping

Five modules from `functional-requirements.md` have no page of their own in this 18-page list; each
is folded into the page that most naturally hosts it. This is a UI-spec-level consolidation decision
(not a data-model or functional-requirements change) and is called out here rather than silently
applied:

| Functional module (not separately paged) | Hosted on page |
|---|---|
| Persons Involved (module 9) | **Occurrence Details** (§6), as a tab |
| Immediate Actions (module 12) | **Occurrence Details** (§6), as a tab |
| Location Information (module 8) | **Aircraft & Flight** (§7), as a third tab |
| Investigation Closure (module 22) | **Investigation Review** (§16) — approval *is* closure; reopen control also surfaces on Investigation Overview when status is Closed |
| Action Tracking (module 20) | **Corrective/Preventive Actions** (§15, per-investigation) and the new **Action Tracker** (§19, portfolio-wide — added this revision, beyond the original 18-page list, per FR-070) |
| Search and Filtering (module 24) | **Investigations** (§3) |
| Audit/History Information (module 25) | **Investigation Overview** (§5, History tab) and **Report Preview** (§17, full timeline) |

## 4. Shared Component Library

Defined once here; page sections below reference these by name rather than re-describing them.

- **StageBadge**: pill with a small colored "lamp" dot + label, colored per §1.2.
- **SeverityBadge** *(updated to the shared outcome scale, `data-model.md` §6.6)*: Negligible=slate,
  Minor=blue, Major=orange, Hazardous=orange (darker), Catastrophic=red.
- **RiskBadge** *(band names updated — `Medium`→`Moderate`, `Extreme`→`Critical`, `data-model.md`
  §6.4)*: Low=green, Moderate=amber, High=orange, Critical=red. Renders the score alongside the
  label (e.g. "16 · High") so the underlying number is never hidden behind the qualitative badge.
- **PriorityBadge**: Routine=slate, Elevated=amber, Urgent=orange, Immediate=red — this is the
  **Investigation Priority** scale (`data-model.md` §6.5). Not to be confused with **Action
  Priority** (Low/Medium/High/Critical, a distinct field on Corrective/Preventive actions,
  `data-model.md` §3.19) — rendered with its own badge, **ActionPriorityBadge**: Low=slate,
  Medium=blue, High=orange, Critical=red.
- **ActionStatusBadge** *(new)*: one pill per stored status — Open=slate, Assigned=blue,
  InProgress=amber, Completed=teal, Verified=green, Cancelled=slate (struck-through label) — plus
  OverdueBadge (below) shown in its place when derived-overdue.
- **OverdueBadge**: red pill + warning-triangle icon; appears only in place of an action's status
  when derived-overdue (FR-046) — visually distinct from any StageBadge/ActionStatusBadge so it
  never reads as an ordinary lifecycle state.
- **CompletenessDot**: see §2.3.
- **PrimaryButton**: solid amber fill — the one primary action per page (Save, Submit for Review,
  Approve).
- **SecondaryButton**: teal outline — Add, Export, Cancel.
- **DestructiveButton**: red outline — Delete/Remove; always paired with **ConfirmDialog**.
- **TextLink / GhostButton**: tertiary actions (view, expand, "Suggest Classification").
- **DataTable**: dense console-style table; monospace for numeric/ID/date columns; sortable column
  headers; sticky header; hairline row dividers (no zebra striping); subtle teal row-hover highlight;
  built-in pagination footer (FR-008).
- **StatTile**: large monospace headline number, small caption label, small icon — a "gauge readout."
- **ChartCard**: bordered panel, chart + legend, matches §1.5 bezel styling.
- **EmptyStatePanel**: centered icon, one-line message, optional CTA button. Copy always names what's
  missing (e.g., "No witnesses recorded") rather than a generic "Nothing here."
- **ErrorBanner**: red-bordered inline panel with a warning-triangle icon, page/section-scoped
  errors. Field-level errors render as red helper text under the field plus a red input outline.
- **SuccessToast**: transient green toast, top-right, auto-dismisses after ~4s; paired with an inline
  green confirmation line for major state changes (e.g., "Submitted for review").
- **ConfirmDialog**: focus-trapped modal, Escape-closable, used for every destructive/irreversible
  action (NFR/FR-21.2-equivalent rule).
- **SuggestionChip** ("Investigation Support" outputs, product-spec §11.1): dashed-border chip in
  teal/violet with the understated circuit-glyph icon (§1.4) and the exact label — **"Suggested
  Classification,"** **"Potential Contributing Factor,"** or **"Recommended Follow-up"** — plus
  inline **Accept** / **Dismiss** actions. Never styled to resemble confirmed data.
- **SimulatedTag** *(new)*: a small slate-outlined pill reading "Simulated" attached to any
  placeholder attachment (`Attachment.isSimulated = TRUE`, `data-model.md` §6.10.2) — visually
  distinct from a real file's plain file-chip styling, and always present before the file is
  opened/downloaded (FR-024), never only on hover, so it can't be missed.

## 5. Accessibility Commitments

- WCAG 2.1 AA color contrast in both themes (§1.2); status/severity/risk meaning is always carried by
  icon + text label, never color alone.
- Every form input has an associated `<label>`; icon-only buttons carry `aria-label`.
- Full keyboard navigability; visible focus rings (a thin teal outline, consistent with the accent
  language); modals trap focus and close on Escape.
- The live UTC clock (§2.1) updates via an `aria-live="off"` region (a constantly-updating clock is
  not announced to screen readers on every tick — it is available on request via a "Copy current UTC
  time" action instead, to avoid a very literal but unhelpful streaming announcement).

## 6. Responsive Behavior

- **Desktop (≥1200px)**: full three-column workspace shell (stepper + main + right rail); header nav
  fully expanded.
- **Tablet (768–1199px)**: right rail collapses into a toggle drawer; stepper remains visible as a
  narrower icon+label rail; tables scroll horizontally within their own container rather than
  breaking the page layout.
- **Mobile (<768px)**: stepper collapses into a "Jump to section" dropdown at the top of the main
  panel; right rail content moves into an expandable section beneath the main content; forms go
  single-column; header nav collapses into a menu.
- Wide content (tables, the risk matrix grid, the report) always scrolls horizontally inside its own
  container — the page body itself never scrolls sideways.

---

## Page Specifications

## 1. Login / Welcome Page

- **Purpose**: First-touch identity moment and authentication entry point; establishes the Ops Board
  visual identity immediately.
- **Layout**: Split screen. Left (desktop/tablet) — dark hero panel: wordmark, one-line tagline
  ("A guided aviation incident investigation workflow — portfolio demonstration"), the subtle
  radar-sweep animation (§1.5), and a link to About (§18). Right — a bordered login card. On mobile,
  the hero collapses to a compact header above the login card.
- **Navigation**: None (pre-authentication); a "Continue as Viewer" link/button offers unauthenticated
  read-only access per product-spec §13's public-demo intent.
- **Components**: Login card, demo-credentials hint box (one row per role, per UI-2), disclaimer
  ribbon (§2.2, shown here too).
- **Forms**: Email/username + password fields, "Sign in" PrimaryButton.
- **Tables**: N/A.
- **Cards**: Demo-credentials hint card listing all 5 seeded role logins.
- **Filters**: N/A.
- **Buttons**: PrimaryButton "Sign in"; GhostButton "Continue as Viewer."
- **Empty States**: N/A.
- **Error States**: Invalid credentials show an ErrorBanner above the form ("Incorrect email or
  password") without indicating which field was wrong (standard credential-enumeration hygiene); a
  disabled account shows "This account is inactive — contact an Administrator."
- **Success Messages**: None shown here — successful login navigates directly to the Dashboard.

## 2. Dashboard

- **Purpose**: Give an investigator (or any role) an immediate, filterable overview of investigation
  activity across the whole portfolio — the application's "ops overview" screen. All calculations
  referenced below are defined authoritatively in `functional-requirements.md` §1.0.
- **Layout**: Header strip ("Operations Overview"), a **Filter Bar** immediately beneath it, a row of
  7 StatTiles, a 3×2 grid of ChartCards, a Recent Investigations DataTable at the bottom. On tablet,
  the StatTile row wraps to 4+3; on mobile, tiles and charts stack in a single column.
- **Navigation**: Reached from the header nav; every StatTile with a natural drill-down, every chart
  segment, and every Recent Investigations row link onward — chart/tile drill-downs land on the
  Investigations page (§3) pre-filtered to match, carrying forward any dashboard filters already
  active.
- **Components**:
  - **StatTile ×7**: Total Investigations, Open Investigations, Under Investigation, Awaiting
    Review, Closed Investigations, Overdue Corrective Actions, High-Risk Findings. The Open/Under
    Investigation/Awaiting Review/Closed tiles use their respective StageBadge accent color (§1.2) on
    a thin top border, visually reinforcing that they partition the Total tile. High-Risk Findings
    uses the RiskBadge "High" color; Overdue Corrective Actions uses the OverdueBadge red.
  - **ChartCard ×6**: Investigations by Status (donut, all 6 stage colors), Investigations by
    Occurrence Category (bar, includes an "Unclassified" segment), Incidents by Location (ranked
    horizontal bar — **not a map**; see note below), Contributing-Factor Distribution (bar, all 10
    categories always shown — `data-model.md` §6.7), Corrective-Action Status (stacked/grouped bar:
    Completed, Verified, Cancelled, Overdue, Open, Assigned, In Progress — all 7 segments of the
    `ActionStatus` set, `functional-requirements.md` §1.0.3), Monthly Investigation Trend (line, 12
    months, zero-filled).
  - **Filter Bar**: a horizontal bar of 6 controls (§ Filters below), a "Clear filters" GhostButton,
    and an active-filter-count indicator when any are applied.
- **Forms**: N/A (filter controls are selects/date pickers, applied live — not a submitted form).
- **Tables**: Recent Investigations (last 8 matching active filters) — Reference #, Title,
  StageBadge, SeverityBadge, Occurrence Date.
- **Cards**: The 7 StatTiles and 6 ChartCards, per §1.5 bezel styling.
- **Filters**: Date Range (from/to), Status (multi-select, 6-state enum), Occurrence Category
  (multi-select), Airport/Location (multi-select, dynamic options), Aircraft Type (multi-select,
  dynamic options), Investigation Severity (multi-select). All combine with AND logic and apply to
  every tile, chart, and the Recent Investigations table uniformly (FR-065); the combination persists
  in the URL.
- **Buttons**: GhostButton "Clear filters" (Filter Bar); SecondaryButton "View all investigations"
  beneath the Recent Investigations table.
- **Note on Incidents by Location**: rendered as a ranked bar chart (top 10 + "Other"), not an
  interactive map — a real geographic map would require an external mapping/tile provider and an API
  key, which is disallowed (`non-functional-requirements.md` NFR-1.1). This is a deliberate,
  documented substitution.
- **Empty States**: With no investigations matching the active filters, all tiles show `0`; each
  ChartCard shows "No data matches the current filters" centered; Recent Investigations shows an
  EmptyStatePanel with a "Create investigation" CTA (role-gated) when there are literally zero
  investigations, or "No investigations match these filters — Clear filters" when filters are the
  cause.
- **Error States**: A failed tile/chart shows its own inline "Unable to load this statistic"/"Chart
  unavailable" without blocking the rest of the page; an invalid Date Range (from > to) shows an
  inline error on the Filter Bar and does not apply until corrected.
- **Success Messages**: N/A (read-only page); applying/clearing filters updates the page silently
  (no toast needed for a non-destructive, instantly-reversible action).

## 3. Investigations

- **Purpose**: The searchable, filterable master list of every investigation visible to the current
  role (FR-007, FR-059–FR-061).
- **Layout**: Filter/search bar across the top, DataTable below, pagination footer.
- **Navigation**: Reached from header nav; each row opens Investigation Overview (§5).
- **Components**: Search input, filter controls, DataTable, pagination.
- **Forms**: N/A (filter controls are selects/date pickers, not a submitted form).
- **Tables**: Reference #, Title, StageBadge, SeverityBadge, Occurrence Date, Created By, Updated At
  — sortable columns.
- **Filters**: Free-text search (title/reference); Stage; Severity; Occurrence Category; Date range.
  All combine with AND logic and persist across pagination and in the URL (FR-061).
- **Buttons**: PrimaryButton "+ New Investigation" (top-right, role-gated); SecondaryButton "Clear
  filters."
- **Empty States**: No results under current filters/search shows an EmptyStatePanel: "No
  investigations match these filters" + "Clear filters" button; a Viewer or Investigator with
  genuinely zero visible investigations sees role-specific copy ("You have no assigned investigations
  yet").
- **Error States**: A failed list load shows an ErrorBanner with a Retry button; the previous
  successful result set (if any) remains visible underneath rather than being cleared.
- **Success Messages**: N/A.

## 4. New Investigation

- **Purpose**: Minimal-friction entry point to start a new investigation (FR-005).
- **Layout**: Centered modal (desktop/tablet) or full-screen form (mobile) — intentionally short, a
  single small form, not a stepper.
- **Navigation**: Opened from the "+ New Investigation" button (header or Investigations page);
  successful submission navigates directly into the new investigation's Occurrence Details page
  (§6).
- **Components**: Form card only.
- **Forms**: Title (text, required), Occurrence Date (date picker, required, not future), Reporter
  (defaults to current user, editable text).
- **Tables**: N/A.
- **Cards**: N/A.
- **Filters**: N/A.
- **Buttons**: PrimaryButton "Create Investigation"; GhostButton "Cancel."
- **Empty States**: N/A.
- **Error States**: Inline field validation (required Title, non-future date); a submission failure
  shows an ErrorBanner at the top of the form and preserves entered values.
- **Success Messages**: A brief SuccessToast ("Investigation INC-2026-00xx created") fires as the app
  navigates to the new record.

## 5. Investigation Overview

- **Purpose**: The workspace "home" for a single investigation — a hub summarizing status and
  progress, plus the audit history timeline.
- **Layout**: Workspace shell (§2.3). Main panel is tabbed: **Summary** | **History**.
- **Navigation**: Default landing page when opening an investigation from any list/link; first item
  in the Section Stepper.
- **Components**: Summary tab — key-facts card grid (aircraft, flight, occurrence date/category,
  assigned Investigator), Section Completeness overview (all 13 stepper items with their
  CompletenessDot in one place), Action summary counts (FR-048). History tab — a chronological
  timeline built from `InvestigationHistory` and `InvestigationReview` (module 25), each entry
  showing event type, actor, timestamp, and (for review events) the decision/comment.
- **Forms**: Title is editable inline here (the only field editable directly on Overview); all other
  data is edited on its own page.
- **Tables**: N/A (timeline is a vertical list, not a table).
- **Cards**: Key-facts cards; Action summary card.
- **Filters**: History tab has a simple event-type filter (All / Stage changes / Reviews / Reopens).
- **Buttons**: PrimaryButton varies by role/stage — "Assign Investigator" (MANAGER/ADMIN, if
  unassigned), "Reopen Investigation" (if Closed, role-gated per workflow §10). SecondaryButton
  "View Report."
- **Empty States**: History tab with no events yet (a brand-new Draft) shows "No history yet — this
  investigation was just created."
- **Error States**: ErrorBanner if summary data fails to load; individual key-facts cards degrade to
  "Not yet recorded" rather than blocking the page.
- **Success Messages**: Inline title edit shows a small green checkmark on save.

## 6. Occurrence Details

- **Purpose**: Capture what happened, how it is classified (category, subcategory, actual/potential
  outcome, computed risk and priority), who was involved, and what was done immediately afterward
  (§3 mapping: Occurrence Information, Occurrence Classification, Persons Involved, Immediate
  Actions).
- **Layout**: Workspace shell; main panel tabbed: **Narrative** | **Classification** | **Persons
  Involved** | **Immediate Actions** — Classification is now its own tab (split out from Narrative)
  given the fuller classification model (`data-model.md` §3.3, §6.5–§6.6).
- **Navigation**: Second item in the Section Stepper.
- **Components**: Narrative tab — occurrence form. Classification tab — category/subcategory picker
  with SuggestionChip("Suggested Classification"), Actual/Potential Outcome form, a small visual
  panel showing the reused risk matrix (same visual treatment as the Hazard Analysis page, §11) for
  Risk Score/Band, and a Priority readout — each of Severity/Risk Score/Priority shows a "Computed" or
  "Overridden" badge, never ambiguous between the two. Persons tab — list of PersonInvolved
  cards/rows + injury summary tile. Immediate Actions tab — chronological list.
- **Forms**: Narrative tab — Occurrence Date/Time (UTC + optional local), Phase of Flight (select),
  Brief Description, Narrative Description (textarea). Classification tab — Category (select, 14
  values), Subcategory (dependent select, populated once Category is chosen), Actual Outcome
  Severity (select) + Description (textarea), Potential Outcome Severity (select) + Description
  (textarea), Likelihood of Recurrence (select); Severity/Risk Score-Band/Priority display as computed
  read-outs with an "Override" GhostButton each (opens a small form: override value + required
  justification). Persons tab — per-entry form (Name, Role Type, License #, Nationality, Injury
  Level, Notes) plus a "No persons involved" toggle. Immediate Actions tab — per-entry form
  (Description, Taken By, Date/Time, Action Type).
- **Tables**: Persons list and Immediate Actions list render as compact DataTables on desktop/tablet,
  stacked cards on mobile.
- **Cards**: Injury/damage summary card (visible on the Classification tab, mirrors FR-018/FR-027);
  a small disclaimer note card on the Classification tab reproducing the regulator-neutrality
  statement (`product-spec.md` §11.4) so it's visible right where the taxonomy is used, not just in
  the footer.
- **Filters**: N/A.
- **Buttons**: PrimaryButton "Save" (per tab); SecondaryButton "Add Person" / "Add Immediate Action";
  GhostButton "Suggest Classification" (opens the SuggestionChip flow, FR-028); GhostButton
  "Override" (Severity/Risk Score-Band/Priority, FR-067); DestructiveButton "Remove" per row.
- **Empty States**: Classification tab shows "Not yet classified" for Category/Subcategory and "Not
  yet determined" for Severity/Risk Score-Band/Priority until FR-066's fields are complete. Persons tab
  empty → EmptyStatePanel ("No persons recorded yet") unless "No persons involved" is toggled, in
  which case the tab shows that confirmed state instead. Immediate Actions tab empty →
  EmptyStatePanel with an "acknowledge — none taken" option consistent with
  `investigation-workflow.md` optional-section handling.
- **Error States**: Field-level inline errors; Potential Outcome Severity rated below Actual Outcome
  Severity is rejected inline with an explanation (FR-066); an override submitted without a
  justification is blocked inline (FR-067); a stale-data save conflict (record locked mid-edit) shows
  an ErrorBanner: "This investigation can no longer be edited in its current state."
- **Success Messages**: Inline green "Saved" confirmation per tab on successful save; accepting a
  Suggested Classification shows "Classification accepted — you can still edit it below" (keeps the
  non-authoritative framing visible even at the moment of acceptance).

## 7. Aircraft & Flight

- **Purpose**: Capture the aircraft, the flight it was operating, and the location/conditions at the
  time (§3 mapping: Aircraft Information, Flight Information, Location Information).
- **Layout**: Workspace shell; main panel tabbed: **Aircraft** | **Flight** | **Location &
  Conditions**.
- **Navigation**: Third item in the Section Stepper.
- **Components**: Three simple single-record forms (each 1:1 with the investigation).
- **Forms**: Aircraft — Registration, Manufacturer, Model, Serial Number, Year, Operator, Engine
  Type/Count, Damage Level. Flight — Flight Number, Flight Rules, Departure/Destination/Alternate,
  PIC Name/License, Crew Complement. Location — Location Description, Lat/Long, Aerodrome Code,
  weather fields, Runway, Lighting Conditions, Terrain Type.
- **Tables**: N/A.
- **Cards**: N/A (plain forms; the workspace right-rail quick-facts card already surfaces the
  aircraft registration once saved).
- **Filters**: N/A.
- **Buttons**: PrimaryButton "Save" per tab.
- **Empty States**: Blank forms on a new investigation (no separate empty-state panel needed — an
  unfilled form is its own empty state here).
- **Error States**: Inline field validation (e.g., latitude/longitude range, positive crew count,
  year not in the future); standard ErrorBanner on save failure.
- **Success Messages**: Inline green "Saved" confirmation per tab.

## 8. Evidence

- **Purpose**: Log and manage evidence items, their reliability/relevance assessment, their finding
  links, and their file attachments — real or simulated (FR-021–FR-024, FR-071).
- **Layout**: Workspace shell; main panel is a list of Evidence cards, each expandable to show its
  attachments and linked findings.
- **Navigation**: Fourth item in the Section Stepper.
- **Components**: Evidence card list, per-card Attachment file list with upload control, per-card
  "Related Findings" chip list with a linker.
- **Forms**: Add/Edit Evidence — Evidence Type (select: Photographs, Documents, Statements, CCTV
  Reference, Flight Records, Maintenance Records, Ground Handling Records, Training Records, Emails,
  Other), Description, Source, Collected By, Date Obtained, Relevance (select), Reliability
  Assessment (select) + Reliability Notes, Investigator Notes, Custody Notes; Related Finding
  multi-select (FR-071); file upload control (drag-and-drop + browse) on each evidence card — hidden
  entirely (not just disabled) for a `CCTVReference` item, which records a text reference instead
  (`data-model.md` §3.9).
- **Tables**: Evidence list can toggle to a compact DataTable view for scanning many items
  (Type, Source, Relevance, Reliability); attachments within a card render as a small file-chip list
  (name, size, uploader, download icon), each chip carrying a distinct "Simulated" tag when
  `isSimulated = TRUE` — never visually identical to a genuinely uploaded file.
- **Cards**: Evidence card = one card per item, grouped by Evidence Type; header shows RelevanceBadge
  and a reliability indicator (High/Medium/Low, same visual language as WitnessType's reliability
  display, `ui-spec.md` §9) side by side.
- **Filters**: Filter by Evidence Type, Relevance, or Reliability Assessment.
- **Buttons**: PrimaryButton "Add Evidence"; SecondaryButton "Upload File" (per card, hidden for
  `CCTVReference`); SecondaryButton "Link Finding"; DestructiveButton "Remove" (item and per-file).
- **Empty States**: EmptyStatePanel "No evidence logged yet" with an "acknowledge — none currently
  available" option (workflow §9.2); a card with zero attachments shows "No files attached" (or, for
  `CCTVReference`, no such prompt at all, since attachment is not applicable to that type); a card
  with no finding links shows "Not yet linked to a finding."
- **Error States**: Oversized/wrong-type file rejected inline before upload starts, with the
  size/type limit and the accepted-type list stated in the message (images, PDF, plain text only —
  no video, no raw email files, `data-model.md` §6.11); a storage-cap breach shows an ErrorBanner
  with current usage.
- **Success Messages**: SuccessToast "File uploaded" / "Evidence item added" / "Finding linked."

## 9. Witnesses

- **Purpose**: Record witness statements (FR-019–FR-020).
- **Layout**: Workspace shell; main panel is a DataTable/card list ordered by statement date.
- **Navigation**: Fifth item in the Section Stepper.
- **Components**: Witness list, add/edit form (modal or inline row).
- **Forms**: Name, Contact Info, Witness Type (select), Statement Summary (textarea), Statement
  Date, Reliability Assessment (select) + notes.
- **Tables**: DataTable on desktop/tablet (Name, Type, Reliability, Statement Date), stacked cards on
  mobile.
- **Cards**: Individual witness detail expands to a card showing the full statement.
- **Filters**: Filter by Witness Type or Reliability.
- **Buttons**: PrimaryButton "Add Witness"; DestructiveButton "Remove."
- **Empty States**: EmptyStatePanel "No witnesses recorded" with an "acknowledge — no witnesses"
  option.
- **Error States**: Standard inline field validation; a witness Name may legitimately be "Unknown /
  Unidentified" (workflow §9.3) — not flagged as an error.
- **Success Messages**: Inline "Saved" confirmation.

## 10. Investigation Findings

- **Purpose**: Author the formal, numbered Findings that will appear in the final report — distinct
  from the underlying Hazard/Contributing Factor/Root Cause analysis records (`data-model.md` §3.21).
- **Layout**: Workspace shell; main panel is a numbered, ordered list of Finding cards.
- **Navigation**: Sixth item in the Section Stepper.
- **Components**: Finding card list (auto-numbered `Finding 1`, `Finding 2`, …), add/edit form,
  citation picker.
- **Forms**: Finding Type (select: Cause / Contributing Factor / Risk Observation / Other),
  Description (textarea, min 20 characters), optional multi-select "Cite related analysis" pulling
  from this investigation's recorded Hazards, Contributing Factors, and Root Causes (via the
  respective link tables).
- **Tables**: N/A (card list, since order/numbering matters more than tabular scanning here).
- **Cards**: Each Finding renders as a card headed by its number and type badge, with its cited
  items shown as small reference chips underneath.
- **Filters**: Filter by Finding Type.
- **Buttons**: PrimaryButton "Add Finding"; DestructiveButton "Remove" (renumbers subsequent
  findings automatically to stay contiguous).
- **Empty States**: EmptyStatePanel "No findings recorded yet" — this section is optional at the data
  layer but strongly encouraged before submission, called out with a non-blocking hint rather than a
  hard gate (Findings are not part of the Analysis → Review gate in `investigation-workflow.md` §8,
  since the gate is satisfied by Root Cause/Hazard/Contributing Factor records; Findings are the
  human-authored synthesis layered on top).
- **Error States**: Description-too-short inline error; removing a cited Hazard/Factor/Root Cause
  elsewhere does not delete the Finding, but its citation chip updates to show "(removed)" rather
  than silently disappearing.
- **Success Messages**: Inline "Saved" confirmation; SuccessToast on add/remove.

## 11. Hazard Analysis

- **Purpose**: Identify hazards and score both their **Initial Risk** (before controls) and
  **Residual Risk** (after existing controls) using the shared risk assessment module (FR-029,
  FR-068–FR-069, `data-model.md` §6).
- **Layout**: Workspace shell; main panel is a Hazard list plus, per hazard, an expandable risk
  assessment panel showing Initial Risk, Existing Controls, and Residual Risk.
- **Navigation**: Seventh item in the Section Stepper.
- **Components**: Hazard list (sortable by RiskBadge, highest first by default; shows both Initial
  and Residual band badges side by side in the row, e.g. `Initial: High → Residual: Moderate`).
  Add/edit form with **one shared 5×5 Likelihood/Severity grid** (axes numbered 1–5 with their word
  labels) that plots **two markers** — an Initial Risk marker and a Residual Risk marker — connected
  by a short arrow when they differ, so the risk-reduction effect of existing controls is visible at
  a glance rather than requiring the viewer to compare two separate numbers. Each marker shows its
  numeric score (e.g. "16") and resolves to a RiskBadge-colored cell.
- **Forms**: Description, Hazard Category (select); **Initial Risk** — Initial Likelihood (select,
  1–5 with labels), Initial Severity (select, 1–5 with labels), Initial Risk Score/Band (computed,
  read-only); **Existing Controls** — free-text description of mitigations already in place;
  **Residual Risk** — Residual Likelihood (select), Residual Severity (select), Residual Risk
  Score/Band (computed, read-only). A residual score higher than the initial score shows a
  non-blocking inline warning rather than being blocked (FR-068).
- **Tables**: Hazard list as DataTable (Description, Category, Initial RiskBadge, Residual
  RiskBadge) with the shared grid as a separate visual panel alongside the form.
- **Cards**: The risk-matrix panel itself is a bordered card matching §1.5 bezel styling; a compact
  disclaimer note ("Configurable educational risk model — not an official regulatory risk matrix
  unless explicitly stated," per `product-spec.md` §11.5) is pinned to this card, not just the
  page-level footer, since this is the page where the model is most directly used.
- **Filters**: Filter by Hazard Category, Initial RiskBadge level, or Residual RiskBadge level.
- **Buttons**: PrimaryButton "Add Hazard"; DestructiveButton "Remove" (confirmation notes any linked
  Contributing Factors/Findings, per FR-030).
- **Empty States**: EmptyStatePanel "No hazards identified yet" (joint completeness rule with
  Contributing Factors, workflow §8); a hazard with Initial Risk recorded but no Residual assessment
  yet shows "Residual risk not yet assessed" in place of the second marker on the grid.
- **Error States**: Standard inline validation; removing a Hazard that is the sole reason the
  Analysis → Review gate is met shows a non-blocking inline note that the gate will need
  Contributing Factors instead.
- **Success Messages**: Inline "Saved" confirmation.

## 12. Contributing Factors

- **Purpose**: Record contributing factors and optionally link them to hazards; surface Investigation
  Support candidates (FR-031–FR-033).
- **Layout**: Workspace shell; main panel is a Contributing Factor list grouped by category, with a
  separate "Potential Contributing Factors" panel below the confirmed list.
- **Navigation**: Eighth item in the Section Stepper.
- **Components**: Factor list, add/edit form with a hazard multi-select linker, SuggestionChip
  ("Potential Contributing Factor") list.
- **Forms**: Description, Category (select), linked Hazards (multi-select).
- **Tables**: N/A (grouped card list reads better than a flat table for this content).
- **Cards**: One card per factor, grouped under category headers.
- **Filters**: Filter by Category (10 values — Human Factors, Equipment, Environment, Procedures,
  Training, Supervision, Communication, Organization, Management, External Factors —
  `data-model.md` §6.7, expanded from the prior 5-category set).
- **Buttons**: PrimaryButton "Add Contributing Factor"; SecondaryButton "Find Potential Contributing
  Factors" (runs the Investigation Support lookup); per-suggestion GhostButton "Add to this
  investigation"; DestructiveButton "Remove."
- **Empty States**: EmptyStatePanel "No contributing factors identified yet" (joint rule with
  Hazards); suggestion panel before running shows nothing, after running with no matches shows "No
  similar past investigations found."
- **Error States**: Standard inline validation; a suggestion whose source investigation no longer
  exists is excluded defensively rather than shown broken.
- **Success Messages**: Inline "Saved" confirmation; "Added from suggestion" toast when accepting a
  Potential Contributing Factor.

## 13. 5 Whys

- **Purpose**: Structured root-cause drill-down via sequential why-chains, capped at 5 levels with
  early stopping always available (FR-034–FR-037).
- **Layout**: Workspace shell; main panel lists each 5 Whys analysis as a card containing its
  sequential chain of Why entries.
- **Navigation**: Ninth item in the Section Stepper.
- **Components**: Analysis card list, "Start New Analysis" form, per-analysis chain of Why-entry
  rows labeled "Why #1" through "Why #5", SuggestionChip ("Recommended Follow-up"), a
  "Root cause established — conclude analysis" action after every entry that routes into the Root
  Cause Analysis page's add form (§14) pre-filled with this analysis linked.
- **Forms**: New analysis — Problem Statement (textarea). Each Why entry — Question, Answer.
- **Tables**: N/A (sequential chain reads as a vertical stepper-like list, not a table).
- **Cards**: One card per FiveWhysAnalysis, numbered "Why #1"… up to "Why #5" internally; a card
  whose analysis has already been concluded shows its linked Potential Root Cause summary inline,
  and its "conclude analysis" action becomes "View Potential Root Cause" instead.
- **Filters**: N/A.
- **Buttons**: PrimaryButton "Start New Analysis"; SecondaryButton "Add Why" / "Suggest Next
  Question" / "Conclude Analysis"; DestructiveButton "Remove Entry" / "Delete Analysis."
- **Empty States**: EmptyStatePanel "No 5 Whys analyses started yet"; a started analysis with zero
  entries shows "Add the first Why to begin."
- **Error States**: Minimum-length validation on Problem Statement/Answer; attempting a 6th entry is
  blocked with a message suggesting the chain be concluded (§14) or split into a second analysis
  (FR-035 edge case — the 5-entry cap is hard, not a soft recommendation).
- **Success Messages**: Inline "Saved" confirmation per entry.

## 14. Root Cause Analysis

- **Purpose**: Record the investigator's assessed root cause(s) — always presented as a **Potential
  Root Cause** under an **Investigator Assessment**, never as an established fact (product-spec
  §11.6) — with Supporting Evidence, Investigator Notes, and a stated Confidence Level, optionally
  traceable to a 5 Whys analysis and Contributing Factors, or an explicit inconclusive override
  (FR-038–FR-039, `investigation-workflow.md` §9.5).
- **Layout**: Workspace shell; main panel is a Potential Root Cause card list.
- **Navigation**: Tenth item in the Section Stepper.
- **Components**: Potential Root Cause card list, add/edit form with linkers to a 5 Whys analysis
  and Contributing Factors, an "inconclusive" toggle with mandatory justification field.
- **Forms**: Potential Root Cause description (required unless Inconclusive), Category (the 10-value
  framework, §12), linked 5 Whys analysis (optional single-select, disabled for an analysis already
  linked elsewhere), linked Contributing Factors (optional multi-select) — grouped under an
  **"Investigator Assessment"** subheading: Supporting Evidence (textarea, required unless
  Inconclusive), Investigator Notes (textarea, optional), Confidence Level (Low/Medium/High select,
  required unless Inconclusive); "Root cause could not be conclusively identified" toggle +
  Justification (textarea, min 20 characters, required when toggled).
- **Tables**: N/A (card list).
- **Cards**: One card per root cause, headed "Potential Root Cause" (never "Root Cause" or
  "Confirmed Cause") with a Confidence Level badge (Low/Medium/High) and its Category; the
  Investigator Assessment (Supporting Evidence, Notes) renders in a distinct sub-panel within the
  card. An inconclusive entry renders visually distinct (a muted amber-outlined card labeled
  "Inconclusive") rather than looking like a normal conclusion.
- **Filters**: Filter by Category (10 values, §12) or Confidence Level.
- **Buttons**: PrimaryButton "Add Potential Root Cause"; DestructiveButton "Remove."
- **Empty States**: EmptyStatePanel "No potential root causes recorded yet" — this is the one
  analysis section that is mandatory (or must use the inconclusive override) before submission for
  review.
- **Error States**: Justification-too-short inline error when Inconclusive is toggled; a save
  attempted without Supporting Evidence or Confidence Level (when not Inconclusive) is blocked with
  an inline explanation of why both are required; standard validation otherwise.
- **Success Messages**: Inline "Saved" confirmation.

## 15. Corrective/Preventive Actions

- **Purpose**: Define, assign, and track corrective and preventive actions through their full
  lifecycle — including independent effectiveness verification (FR-040–FR-048, FR-045a–FR-045b; §3
  mapping folds in Action Tracking).
- **Layout**: Workspace shell; main panel has two sub-tabs: **Corrective** | **Preventive**, each a
  DataTable.
- **Navigation**: Eleventh item in the Section Stepper.
- **Components**: Two DataTables (identical column shape), add/edit form per tab, status-update
  control, reassignment control, verification form (distinct from the completion form).
- **Forms**: Description, Priority (select), Target Date, Responsible Person (registered-user picker
  or external name — mutually exclusive), Department (free text), linked Root Cause and/or Hazard
  (both optional on either tab, `data-model.md` §6.9), Required for Closure (checkbox, defaulting
  checked on Corrective / unchecked on Preventive). Completion sub-form: Completion Date. Separate
  Verification sub-form (only offered once `Completed`, and only to a user who is not the action's
  own owner): Verification Method (select), Effectiveness Result (select), Verification Notes
  (textarea). Investigator Comments (textarea, always available, independent of the above).
- **Tables**: Action ID, Description, ActionPriorityBadge, Responsible Person, Department, Target
  Date, Status (ActionStatusBadge, or OverdueBadge when derived-overdue), Required-for-Closure
  indicator.
- **Cards**: A small action-summary card at the top of the page (counts by status across both kinds,
  including a distinct "awaiting verification" count and an "N required actions not yet resolved"
  count, FR-048).
- **Filters**: Filter by Status (incl. Overdue), Priority, Owner. (Target Date range and
  cross-investigation filtering live on the portfolio-wide Action Tracker, §19.)
- **Buttons**: PrimaryButton "Add Corrective/Preventive Action" (per active tab); SecondaryButton
  "Mark Complete" (opens the completion form); SecondaryButton "Verify Effectiveness" (opens the
  verification form — hidden entirely, not merely disabled, for the action's own owner, since they
  are not an eligible verifier); SecondaryButton "Reassign"; DestructiveButton "Remove" (disabled
  with an explanatory tooltip for Completed/Verified actions when the current role is Investigator,
  per FR-041).
- **Empty States**: EmptyStatePanel "No corrective actions defined yet" / "No preventive actions
  defined yet" (joint completeness rule — at least one of either kind is required before submission);
  a `Completed` action with no verification yet shows "Awaiting independent verification" in place of
  a Verify button for its own owner.
- **Error States**: Standard inline validation (owner mutual-exclusivity, target-date-not-in-past on
  creation); an Investigator's blocked delete attempt on a Completed/Verified action shows an inline
  message suggesting they contact a Manager/Admin; an owner attempting to verify their own action
  (should not be reachable via the hidden button, but checked server-side too) shows "This action
  must be verified by someone other than its owner."
- **Success Messages**: SuccessToast "Action marked complete" / "Effectiveness verified" / "Owner
  reassigned."

## 16. Investigation Review

- **Purpose**: Submission and independent review decision — the ceremony transitions in the workflow
  (FR-049–FR-052; §3 folds in Investigation Closure and part of Audit/History).
- **Layout**: Workspace shell; main panel differs by role and stage — a submission checklist (before
  submission), a read-only review view + decision controls (during Review, for Reviewer), or a
  decision-history timeline (after decision).
- **Navigation**: Twelfth item in the Section Stepper.
- **Components**: Completeness checklist (unmet items link directly to their section), decision
  panel (Reviewer only), InvestigationReview history list.
- **Forms**: Reviewer decision form — Decision (Approve / Request Changes, radio or two large
  buttons), Comments (textarea, required for Request Changes, optional for Approve).
- **Tables**: N/A (checklist and history render as lists, not tables).
- **Cards**: Completeness checklist card; each history entry as a compact card (reviewer, decision,
  comment, timestamp).
- **Filters**: N/A.
- **Buttons**: PrimaryButton "Submit for Review" (Investigator/Manager/Admin, enabled only once the
  checklist is fully satisfied); PrimaryButton "Approve" (Reviewer/Admin, **disabled** — not merely
  warned — while any Required-for-Closure action remains unresolved, per `investigation-workflow.md`
  §9.6, with the blocking actions listed and linked) and DestructiveButton "Request Changes"
  (Reviewer/Admin); GhostButton "Acknowledge non-required open actions" (must be checked before
  Approve enables, when any non-required action is still open); ADMIN-only GhostButton "Override and
  Close" (requires a mandatory justification, `data-model.md` §6.9.3); SecondaryButton
  "Resume Editing" (after Changes Requested); SecondaryButton "Reopen Investigation" (after Closed).
- **Empty States**: "No review decisions yet" before first submission.
- **Error States**: "Submit for Review" is disabled (not just warned) while checklist items remain
  unmet, per `investigation-workflow.md` §7.1; "Approve" is disabled (not just warned) while
  Required-for-Closure actions remain unresolved, per §9.6; an out-of-stage decision attempt (stale
  page) shows an ErrorBanner and refreshes to current state.
- **Success Messages**: SuccessToast "Submitted for review" / "Investigation approved and closed" /
  "Changes requested" / "Investigation reopened."

## 17. Report Preview

- **Purpose**: View and export the compiled, professional investigation report (FR-056–FR-058;
  structure defined in `report-spec.md`).
- **Layout**: A light, print-styled document view (§1.1 exception) inside a toolbar chrome; no
  workspace stepper rail on the print-target content itself, though the page is still reached via the
  Section Stepper.
- **Navigation**: Thirteenth (last) item in the Section Stepper; toolbar "Back to Investigation"
  returns to Overview.
- **Components**: Toolbar (Print/Save as PDF, Export JSON, Back), the report document per
  `report-spec.md` §3 (now including the Findings section sourced from `InvestigationFinding` and a
  combined Review + Reopen history timeline sourced from `InvestigationReview` +
  `InvestigationHistory` — see `data-model.md` §12 follow-up note).
- **Forms**: N/A.
- **Tables**: As defined per report section in `report-spec.md` (Persons, Evidence, Hazards, Actions,
  etc.).
- **Cards**: N/A (document layout, not card-based).
- **Filters**: N/A.
- **Buttons**: SecondaryButton "Print / Save as PDF"; SecondaryButton "Export JSON"; GhostButton
  "Back to Investigation."
- **Empty States**: Every report section renders even when empty, with explicit "No … recorded" text
  (`report-spec.md` §4) — never silently omitted.
- **Error States**: A section that fails to render shows "Unable to render this section" inline
  without failing the whole report.
- **Success Messages**: N/A (view/export page; JSON export triggers a browser download rather than an
  in-app message).

## 18. Settings / About

- **Purpose**: Personal preferences, Administrator user management, risk-band configuration, and
  product/portfolio context.
- **Layout**: Tabbed page: **My Settings** | **User Management** (Administrator only) | **Risk Band
  Configuration** (Administrator only, new — FR-069) | **About**.
- **Navigation**: Reached from the header user menu.
- **Components**: My Settings — profile display (name, email, role — read-only in this version, no
  self-service edit), theme toggle (dark/light, §1.1). User Management — user DataTable + add/edit
  role form. **Risk Band Configuration** — a small editable table of the active `RiskBandConfiguration`
  rows (Min Score, Max Score, Band Label, Color, Display Order, Active), a live preview of the
  resulting 1–25 coverage as a colored strip so a gap/overlap is visible before saving, and a
  persistent notice that this is a configurable educational model, not a regulatory standard
  (`product-spec.md` §11.5). About — product description, disclaimer (full text, not just the
  ribbon), tech-stack and spec-driven-development note, version/build info, link back to the public
  spec index.
- **Forms**: User Management — Add/Edit User (Name, Email, Role select); no self-service password
  reset in this version (product-spec §7 — no outbound email capability). Risk Band Configuration —
  inline-editable rows, validated as a set on save (FR-069).
- **Tables**: User Management — Name, Email, Role, Active status. Risk Band Configuration — Min
  Score, Max Score, Band Label, Color swatch, Active.
- **Cards**: About tab content renders as a few short info cards rather than one long text block.
- **Filters**: User Management — filter by Role.
- **Buttons**: PrimaryButton "Add User" (Administrator); SecondaryButton "Deactivate" /
  "Reactivate" per row (no hard delete, per `data-model.md` §3.1); PrimaryButton "Save Bands" (Risk
  Band Configuration tab).
- **Empty States**: N/A (at least the current user always exists; Risk Band Configuration is always
  seeded, `data-model.md` §6.4).
- **Error States**: Duplicate-email inline error on Add/Edit User; a gap/overlap in the risk-band
  coverage blocks save with the specific conflicting range shown (FR-069); standard ErrorBanner on
  save failure.
- **Success Messages**: SuccessToast "User added" / "Role updated" / "Theme preference saved" /
  "Risk bands updated — applies to future assessments only."

## 19. Action Tracker *(new page, this revision — beyond the original 18-page list, per FR-070)*

- **Purpose**: A portfolio-wide, cross-investigation view of every corrective and preventive action —
  what a Manager or Administrator opens to track action health across the whole portfolio rather
  than paging through investigations one at a time.
- **Layout**: Top-level page (not part of the investigation workspace shell): filter bar across the
  top, a single DataTable spanning both action types beneath.
- **Navigation**: Reached from the header nav, alongside Dashboard and Investigations (§2.1); each
  row links to its parent investigation's Corrective/Preventive Actions page (§15).
- **Components**: Filter bar (5 filters, below), DataTable.
- **Forms**: N/A (filter controls only; actions are edited on their parent investigation's page, not
  here — this page is a tracking/triage view, not an editing surface).
- **Tables**: Action ID, Description, Type (Corrective/Preventive badge), Investigation (reference +
  title, linked), Responsible Person, Department, Priority, Target Date, Status (incl. OverdueBadge),
  Required-for-Closure indicator.
- **Cards**: N/A.
- **Filters**: Owner (multi-select, dynamic), Status (multi-select, 6 stored values + Overdue),
  Priority (multi-select), Target Date (from/to range), Investigation (multi-select, dynamic). AND
  logic, persisted in the URL — same pattern as the Dashboard (§2) and Investigations (§3).
- **Buttons**: GhostButton "Clear filters."
- **Empty States**: "No actions match these filters — Clear filters"; "No actions recorded across any
  investigation yet" when the portfolio has none at all.
- **Error States**: A failed load shows an ErrorBanner with a Retry button; the previous successful
  result set (if any) remains visible underneath.
- **Success Messages**: N/A (read-only tracking view).

---

## Appendix A: UI-Spec-Specific Assumptions

- **UI-1**: Explicit Save (not autosave) per section/tab, for implementation simplicity and
  predictable behavior (carried forward from the prior revision).
- **UI-2**: Demo credentials are visibly displayed on the Login/Welcome page, since this is a public,
  keyless portfolio deployment with no self-registration.
- **UI-3**: No dedicated mobile app; responsive web only.
- **UI-4** *(new)*: Persons Involved and Immediate Actions are hosted as tabs on the Occurrence
  Details page, and Location Information as a tab on the Aircraft & Flight page, since the required
  18-page list does not give these functional modules their own page (§3).
- **UI-5** *(new)*: Dark theme is the default identity (Ops Board), with a light theme available for
  accessibility/preference; the Report Preview page is always light/print-styled regardless of the
  active app theme.
- **UI-6** *(new)*: Investigation Findings (§10) is treated as encouraged-but-not-gating: it does not
  participate in the Analysis → Review completeness gate, since that gate is already satisfied by the
  underlying Root Cause/Hazard/Contributing Factor records — Findings are the human-authored synthesis
  layered on top, per `data-model.md` §3.21.
- **UI-7** *(new, risk assessment module pass)*: Initial and Residual risk are plotted as two markers
  on one shared 5×5 grid (rather than two separate grids) so risk reduction from existing controls
  reads as a single visual, not a side-by-side comparison the viewer has to do mentally (§11).
- **UI-8** *(new, root cause analysis module pass)*: "Conclude Analysis" is surfaced directly on the
  5 Whys page (§13) rather than requiring the investigator to separately navigate to Root Cause
  Analysis and manually pick the analysis to link — the pairing between a why-chain and the
  conclusion it produced is the more natural point of action.
- **UI-9** *(new, corrective/preventive action module pass)*: the portfolio-wide Action Tracker (§19)
  is a **read-only tracking view** — editing always happens on the action's parent investigation
  page (§15), never inline on the tracker. This keeps a single edit surface per action rather than
  two forms that could drift out of sync.
- **UI-10** *(new, corrective/preventive action module pass)*: the "Verify Effectiveness" button is
  **hidden**, not merely disabled, for an action's own owner — disabling it would still show a
  verification form the owner isn't allowed to submit, which is more confusing than not offering it
  at all.
- **UI-11** *(new, evidence management system pass)*: the file-upload control is hidden (not
  disabled) on `CCTVReference` evidence items, since that type structurally never takes an
  attachment (`data-model.md` §3.9) — same reasoning as UI-10, applied to a different control.

## Appendix B: Consistency Notes for Other Spec Files

This revision aligns `ui-spec.md` to the current 6-state workflow (`Draft/Open/Under
Investigation/Analysis/Review/Closed`), the separate `CorrectiveAction`/`PreventiveAction` tables
with their expanded 6-status lifecycle, the 14-category classification taxonomy with computed
severity/risk/priority, the Initial/Residual risk assessment module with configurable risk bands,
the enriched Root Cause Analysis module (Potential Root Cause / Investigator Assessment / Supporting
Evidence / Confidence Level), the 10-category Contributing Factors framework, and (this pass) the
expanded action field set (Department, Verification Method, Effectiveness Result, Required for
Closure) with a portfolio-wide Action Tracker page, and (this pass) the redesigned evidence
management system (10-category taxonomy, Source/Relevance/Reliability, Related Finding, simulated
attachments) — all in `data-model.md`. The `product-spec.md` §11.1 stale field reference has also
been corrected (now `Occurrence.wasSuggestionAccepted`).

**Resolved since this note was written** (Phase 15, closing spec-review.md SR-007's copy of this
finding for this file): `functional-requirements.md`'s old 5-state status names were rewritten to
the 6-state model in Phase 10 for Modules 21–22 (§0.3's own note confirms this) and, found still
stale in Modules 23–24 (FR-056/FR-058/FR-060's own examples) during this pass, corrected here too.
`report-spec.md` was fully rewritten (its own revision note says so) to cover the Findings section,
the classification/risk fields, the enriched Root Cause fields, the expanded action fields, and the
evidence fields this note originally flagged as missing — nothing here is still outstanding.

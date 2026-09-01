# Demonstration Dataset Specification — Aviation Incident Investigation Assistant

This document specifies the canonical seed/demonstration dataset for the application: a reusable
fictional aviation world (§1) and ten fully fictional investigation profiles (§2) spanning the
scenario types requested for this pass. It supersedes the earlier, lighter-weight illustrative
examples used purely for calculation purposes in `data-model.md` §10 and
`functional-requirements.md` §1.1 (the Skylark Air bird-strike example and the 14-row dashboard
worked-example table) — those remain valid as calculation illustrations and use consistent fictional
entities (Skylark Air, Aeroventure, ZZFI/ZZFC/ZZFM), but this document is the authoritative,
complete seed-data source a `prisma/seed.ts` implementation should draw from (`technical-architecture.md`
§5.4).

> **No real personal information appears anywhere in this document.** Every airline, airport,
> aircraft registration, flight number, and named individual below is invented for this project and
> does not refer to, or knowingly resemble, any real organization or person (product-spec A8). Named
> individuals use initials-plus-surname in a deliberately generic, internationally-mixed style
> specifically to avoid resembling any identifiable real person.

## 1. Fictional World Reference

Reused consistently across all ten investigations below (and consistent with the entities already
established in `data-model.md` §10) so the dataset reads as one coherent fictional aviation
environment rather than ten disconnected vignettes.

### 1.1 Airlines / Operators

| Operator | Character |
|---|---|
| **Skylark Air** | Established mid-size national carrier *(already used in `data-model.md` §10)* |
| **Northbridge Airways** | Larger international-leaning carrier |
| **Coastal Wings Regional** | Small regional/commuter carrier |
| **Vanguard Cargo** | Dedicated cargo carrier |

### 1.2 Aircraft Manufacturer & Models

**Aeroventure** *(already established)* — fictional manufacturer, models `AV-200` (small regional),
`AV-320` (narrow-body mainline), `AV-450` (larger narrow-body/regional-cargo).

### 1.3 Airports

| Code | Name | Character |
|---|---|---|
| ZZFI | Fictional International | Large hub *(already established)* |
| ZZFC | Fictional Coastal | Medium coastal airport *(already established)* |
| ZZFM | Fictional Metro | Medium metropolitan airport *(already established)* |
| ZZFH | Fictional Highlands | Smaller regional airport *(new)* |
| ZZFD | Fictional Downtown | Busy short-haul/domestic hub *(new)* |

### 1.4 System User Accounts (seeded demo accounts, one per role)

| Role | Name |
|---|---|
| Administrator | A. Whitfield |
| Investigation Manager | M. Delacroix |
| Investigator | R. Okafor *(already established)*, T. Lindqvist, S. Amara |
| Reviewer | J. Bramwell |
| Viewer | Guest Viewer (public demo account, no personal name) |

### 1.5 Recurring Operational Personnel (fictional, referenced within investigations)

D. Fontaine (Ramp Supervisor, ZZFI), K. Osei (Ramp Supervisor, ZZFD), M. Torres (Baggage Handler),
L. Nakamura (Baggage Handler), P. Kowalski (Ground Equipment Operator), S. Devereux (Maintenance
Engineer), A. Lindgren (Maintenance Engineer), Capt. R. Halvorsen, Capt. E. Mwangi, FO T. Bianchi,
J. Okonkwo (Cabin Crew), Ctrl. B. Sundqvist (Ground Control), H. Van Dijk (Dangerous Goods/Security
Officer), C. Reyes (Fueling Technician). Passengers are referenced generically ("Passenger, name
withheld") consistent with real investigation-report privacy practice, not because any real person
exists to protect.

## 2. Investigation Profiles

Reference numbers `INC-2026-0040`–`INC-2026-0049`, distinct from the earlier illustrative examples.
Dates span 2025-11 through 2026-08 for a realistic trend spread on the Dashboard (`functional-requirements.md`
§1.0.3).

---

### 2.1 Ramp Vehicle Incident — `INC-2026-0040`

- **Scenario**: Ramp vehicle incident (right-of-way violation)
- **Classification**: `RampSafetyIncident` → *Ramp Vehicle Right-of-Way Violation*; Severity
  **Major**; Risk Band **High**; Priority **Urgent**
- **Status**: `Closed`
- **Context**: Northbridge Airways, Aeroventure AV-320 reg. `N-NBA118`, Flight NB204, ZZFI, gate
  stand B14, occurrence date 2025-11-08
- **Narrative**: A baggage tug operated by ground handling staff failed to yield at a marked
  give-way line and struck the trailing edge of the aircraft's left wingtip during pushback
  preparation. No injuries; wingtip sustained minor structural damage requiring inspection.
- **Persons Involved**: P. Kowalski (Ground Equipment Operator, no injury), D. Fontaine (Ramp
  Supervisor, no injury)
- **Hazard**: "Ramp give-way markings at stand B14 are faded and difficult to see in low light" —
  Initial: Likely × Major = 16 (**High**); Existing Controls: "Standard ramp lighting only, no
  additional markings"; Residual: Likely × Major = 16 (**High**, unchanged — lighting alone does not
  address marking visibility)
- **Contributing Factor**: "Ramp marking repainting was overdue per the facility maintenance
  schedule" — category **Supervision**
- **Root Cause** *(Potential Root Cause, Investigator Assessment)*: "Ramp marking inspection and
  repainting at ZZFI is not enforced against a tracked schedule, allowing visibility degradation to
  go unaddressed" — category **Supervision**; Supporting Evidence: "Facility maintenance log shows
  no repainting recorded for stand B14 in over 18 months against a 12-month standard"; Confidence
  **High**
- **Corrective Action**: "Repaint give-way markings at stand B14" — Northbridge Ground Ops
  Department, Priority High, Completed and **Verified** (Effectiveness: Effective)
- **Preventive Action**: "Implement quarterly ramp-marking inspection schedule, all ZZFI stands" —
  Northbridge Ground Ops Department, Priority Medium, **Verified** (Effectiveness: Effective)
- **Review**: Approved by J. Bramwell, no changes requested

---

### 2.2 Baggage Handling Incident — `INC-2026-0041`

- **Scenario**: Baggage handling incident (conveyor malfunction)
- **Classification**: `BaggageIncident` → *Baggage Belt/Conveyor Incident*; Severity **Minor**;
  Risk Band **Low**; Priority **Routine**
- **Status**: `Closed`
- **Context**: Skylark Air, Aeroventure AV-200 reg. `G-SKY07`, Flight SK115, ZZFD, occurrence date
  2025-12-14
- **Narrative**: An outbound baggage conveyor belt jammed mid-load, causing several bags to fall
  from the belt onto the ramp surface. One bag sustained cosmetic damage; no injuries.
- **Persons Involved**: M. Torres (Baggage Handler, no injury)
- **Hazard**: "Conveyor belt drive roller shows visible wear beyond manufacturer service interval" —
  Initial: Possible × Minor = 6 (**Moderate**); Existing Controls: "Routine visual check only, no
  scheduled roller replacement"; Residual: Unlikely × Minor = 4 (**Low**, improved once corrective
  action below is factored in)
- **Contributing Factor**: "Conveyor preventive maintenance interval had not accounted for
  higher-than-designed usage rate at this stand" — category **Equipment**
- **Root Cause**: "The conveyor's maintenance interval was set at manufacturer default and never
  adjusted for this stand's actual usage volume" — category **Equipment**; Supporting Evidence:
  "Maintenance log vs. usage counter comparison shows the roller exceeded its rated duty cycle by
  approximately 40%"; Confidence **Medium** (usage counter data was only partially available)
- **Corrective Action**: "Replace worn drive roller, stand D6 conveyor" — Facilities Maintenance
  Department, Priority Medium, Completed, **Verified** (Effectiveness: **PartiallyEffective** — a
  follow-up inspection found a second roller nearing the same wear threshold, prompting the
  preventive action below)
- **Preventive Action**: "Revise conveyor maintenance intervals fleet-wide based on measured usage,
  not manufacturer default" — Facilities Maintenance Department, Priority Medium, **InProgress**
- **Review**: Approved by J. Bramwell

---

### 2.3 Aircraft Ground Damage — `INC-2026-0042`

- **Scenario**: Aircraft ground damage (ground equipment contact)
- **Classification**: `GroundHandlingIncident` → *Aircraft Ground Damage (Contact with Ground
  Equipment)*; Severity **Major**; Risk Band **High**; Priority **Urgent**
- **Status**: `Analysis` (active — root cause tentatively assessed, not yet finalized)
- **Context**: Coastal Wings Regional, Aeroventure AV-200 reg. `C-CWR22`, Flight CW340, ZZFH,
  occurrence date 2026-07-22
- **Narrative**: A catering truck made contact with the aircraft's aft fuselage while positioning
  at the service door, causing a visible dent requiring structural assessment before further
  flight.
- **Persons Involved**: Catering Operator (name not yet obtained — evidence collection ongoing)
- **Hazard**: "Catering truck positioning at the AV-200 aft door has limited operator visibility of
  the fuselage curvature" — Initial: Possible × Major = 12 (**High**); Residual assessment **not
  established** (Existing Controls not yet fully documented — investigation still in Analysis)
- **Contributing Factor**: "No ground marshaller was assigned to guide catering truck approach at
  this stand" — category **Communication**
- **Root Cause** *(tentative — Investigator Assessment, not yet confirmed)*: "Catering truck
  positioning at ZZFH's smaller stands relies on operator judgment alone, with no marshalling
  requirement" — category **Communication**; Supporting Evidence: "Interview with catering operator
  and comparison against ZZFI's marshalling procedure, which does require this step"; Confidence
  **Medium** (investigation ongoing — this reflects current assessment, not a final conclusion)
- **Actions**: Not yet finalized — pending root cause confirmation
- **Review**: Not yet submitted

---

### 2.4 Dangerous Goods Discrepancy — `INC-2026-0043`

- **Scenario**: Dangerous goods discrepancy
- **Classification**: `DangerousGoodsIncident` → *Undeclared Dangerous Goods*; Severity
  **Catastrophic** (computed from Potential Outcome); Risk Band **Critical**; Priority
  **Immediate** *(both the computed matrix result and the category floor rule, `data-model.md`
  §6.5, point to Immediate here — a good demonstration that the floor rule and the computed result
  can agree, not just override a lower one)*
- **Status**: `UnderInvestigation` (fact-finding — too early for a root cause; Actual/Potential
  Outcome recorded, deeper analysis not yet begun)
- **Context**: Vanguard Cargo, Aeroventure AV-450 reg. `V-VGC501`, Flight VG9081 (cargo), ZZFI,
  occurrence date 2026-08-10
- **Narrative**: A routine cargo screening at ZZFI identified a shipment containing lithium-ion
  batteries that was not declared as dangerous goods on the accompanying manifest. The shipment was
  intercepted before loading; no batteries were damaged and no release occurred.
- **Actual Outcome**: **Minor** — "Shipment intercepted before loading; no damage or release
  occurred"
- **Potential Outcome**: **Catastrophic** — "Undeclared lithium battery shipment loaded and
  subjected to in-flight temperature/pressure changes could plausibly result in thermal runaway
  during flight"
- **Persons Involved**: H. Van Dijk (Dangerous Goods/Security Officer, identified the discrepancy)
- **Hazards/Root Cause**: Not yet recorded — investigation is still in the fact-finding stage
  (`Not established`)
- **Actions**: Not yet defined
- **Review**: Not yet submitted

---

### 2.5 Passenger Boarding Incident — `INC-2026-0044`

- **Scenario**: Passenger boarding incident
- **Classification**: `PassengerHandlingIncident` → *Passenger Injury (Boarding/Deplaning)*;
  classification recorded, deeper fields not yet started
- **Status**: `Open` (just classified; fact-finding not yet begun)
- **Context**: Skylark Air, Aeroventure AV-320 reg. `G-SKY14`, Flight SK220, ZZFC, occurrence date
  2026-08-25
- **Narrative**: A passenger slipped while boarding via airstairs during light rain, sustaining a
  minor ankle injury. First aid was administered on-site.
- **Persons Involved**: Passenger (name withheld), J. Okonkwo (Cabin Crew, assisted, no injury)
- **Status of remaining sections**: Aircraft/Flight/Location and further analysis **not yet
  recorded** — this profile deliberately represents an early-lifecycle investigation, demonstrating
  the dataset's status variety at the opposite end from the closed examples above.

---

### 2.6 Fueling-Related Occurrence — `INC-2026-0045`

- **Scenario**: Fueling-related occurrence
- **Classification**: `GroundHandlingIncident` → *Fueling Incident*; Severity **Major**; Risk Band
  **Moderate**; Priority **Urgent**
- **Status**: `Review` (submitted, awaiting Reviewer decision)
- **Context**: Northbridge Airways, Aeroventure AV-450 reg. `N-NBA330`, Flight NB512, ZZFM,
  occurrence date 2026-05-30
- **Narrative**: A fuel quantity discrepancy was discovered during pre-departure checks — the
  fueler had recorded the wrong tank configuration, resulting in an under-fueled aircraft. The
  discrepancy was caught before departure; no fuel-exhaustion risk materialized in flight.
- **Persons Involved**: C. Reyes (Fueling Technician), Capt. R. Halvorsen (PIC, caught the
  discrepancy during pre-departure checks)
- **Hazard**: "Fuel order communication between flight crew and fueling technician relies on a
  verbal handoff with no written confirmation step" — Initial: Likely × Major = 16 (**High**);
  Existing Controls: "Verbal read-back only"; Residual: Possible × Major = 12 (**High**, modest
  improvement expected from the corrective action below, not yet fully realized)
- **Contributing Factor**: "New fueling technician had not yet completed tank-configuration
  training for the AV-450" — category **Training**
- **Root Cause**: "Fueling technician training on AV-450 tank configuration is not completed before
  technicians are assigned to service that aircraft type independently" — category **Training**;
  Supporting Evidence: "Training records confirm the technician's AV-450-specific module was
  scheduled but not yet completed at the time of the occurrence"; Confidence **High**
- **Corrective Action**: "Complete AV-450 tank-configuration training for all fueling staff
  currently assigned without it" — Fuel Services Department, Priority Critical, **Completed**,
  pending verification
- **Preventive Action**: "Require written fuel-order confirmation (not verbal-only) for all
  aircraft types" — Fuel Services Department, Priority High, **Assigned**
- **Review**: Pending — submitted by T. Lindqvist, awaiting J. Bramwell's decision

---

### 2.7 Near Miss — `INC-2026-0046`

- **Scenario**: Near miss (ground vehicle / taxiway incursion)
- **Classification**: `NearMiss` → *Near Miss — Runway/Taxiway Incursion*; **Actual Outcome:
  Negligible**, **Potential Outcome: Catastrophic** — the dataset's clearest demonstration of the
  actual-vs-potential distinction (`data-model.md` §6.6); Severity **Catastrophic** (computed as the
  more severe of the two); Risk Band **Critical**; Priority **Immediate**
- **Status**: `Closed`
- **Context**: Coastal Wings Regional, Aeroventure AV-200 reg. `C-CWR09`, Flight CW118, ZZFH,
  occurrence date 2026-03-03
- **Narrative**: A ground vehicle crossed onto an active taxiway boundary while a Coastal Wings
  AV-200 was taxiing for departure. The aircraft crew observed the vehicle and stopped; the vehicle
  driver then reversed clear. No contact occurred and no injuries resulted.
- **Persons Involved**: FO T. Bianchi (observed and reported the incursion), Ctrl. B. Sundqvist
  (Ground Control, on duty)
- **Hazard**: "Ground vehicle drivers at ZZFH are not required to monitor ground control frequency
  while operating near taxiway boundaries" — Initial: Likely × Catastrophic = 20 (**Critical**);
  Existing Controls: "Painted boundary markings only, no radio-monitoring requirement"; Residual:
  Unlikely × Catastrophic = 10 (**High**, meaningfully reduced by the preventive action below)
- **Contributing Factor**: "No standard operating procedure requires ground vehicles to confirm
  clearance before approaching an active taxiway boundary at ZZFH" — category **Procedures**
- **Root Cause**: "ZZFH's ground vehicle operating procedures do not require radio-frequency
  monitoring or explicit clearance confirmation near active taxiway boundaries, unlike ZZFI's
  procedure for the same situation" — category **Procedures**; Supporting Evidence: "Direct
  comparison of ZZFH and ZZFI ground vehicle operating manuals; incident radio log confirms the
  vehicle driver was not monitoring the ground control frequency at the time"; Confidence **High**
- **Corrective Action**: "Issue an immediate safety notice to all ZZFH ground vehicle operators
  restating taxiway boundary clearance requirements" — ZZFH Airside Operations, Priority Critical,
  **Verified** (Effectiveness: Effective)
- **Preventive Action**: "Update ZZFH ground vehicle operating procedure to require radio-frequency
  monitoring near active taxiway boundaries, aligned with ZZFI's procedure" — ZZFH Airside
  Operations, Priority High, **Verified** (Effectiveness: Effective)
- **Review**: Approved by J. Bramwell — reviewer comment: "A strong example of why potential
  outcome, not actual outcome, should drive the risk rating here."

---

### 2.8 Equipment Failure — `INC-2026-0047`

- **Scenario**: Equipment failure (ground support equipment)
- **Classification**: Not yet started
- **Status**: `Draft` (just reported, preliminary information only)
- **Context**: Skylark Air, Aeroventure AV-320 reg. `G-SKY31`, Flight SK078, ZZFI, occurrence date
  2026-08-29
- **Narrative** (preliminary): "Pushback tug hydraulic failure during pushback; aircraft pushback
  halted, no contact with aircraft. Full details pending investigator assignment."
- **Status of remaining sections**: Everything beyond the initial report is **not yet provided** —
  this profile represents the earliest possible lifecycle point in the dataset, seeded intentionally
  so the demo always has at least one Draft-stage example.

---

### 2.9 Maintenance-Related Incident — `INC-2026-0048`

- **Scenario**: Maintenance-related incident
- **Classification**: `MaintenanceRelatedOccurrence` → *Post-Maintenance System Failure*; Severity
  **Major**; Risk Band **High**; Priority **Urgent**
- **Status**: `Closed` — a complete, fully-worked example demonstrating the full happy path
- **Context**: Northbridge Airways, Aeroventure AV-450 reg. `N-NBA275`, Flight NB640, ZZFM,
  occurrence date 2026-02-17
- **Narrative**: Following a scheduled maintenance check, an access panel on the AV-450's lower
  fuselage was found improperly secured during the subsequent pre-flight inspection, before
  departure. No flight occurred with the panel unsecured.
- **Persons Involved**: A. Lindgren (Maintenance Engineer, performed the check), S. Devereux
  (Maintenance Engineer, performed the pre-flight inspection that caught the discrepancy)
- **Immediate Action**: "Aircraft grounded pending panel re-inspection and fastener replacement" —
  logged by S. Devereux
- **Hazard**: "Task card for this access panel does not specify a torque value, relying on
  technician judgment" — Initial: Likely × Major = 16 (**High**); Existing Controls: "Visual
  post-task inspection only"; Residual: Unlikely × Major = 8 (**Moderate**, meaningfully reduced by
  the corrective action below)
- **Contributing Factor**: "Task card revision adding a specified torque value had been drafted but
  not yet disseminated to the maintenance team" — category **Management**
- **Root Cause**: "A task card revision specifying the required torque value for this access panel
  was approved but not distributed to line maintenance staff before this occurrence" — category
  **Management**; Supporting Evidence: "Task card revision log shows approval three weeks prior to
  the occurrence, with no corresponding distribution record"; Confidence **High**
- **Corrective Action**: "Distribute the approved torque-value task card revision to all
  maintenance staff immediately" — Maintenance Engineering Department, Priority Critical,
  **Verified** (Effectiveness: Effective)
- **Preventive Action**: "Implement a mandatory acknowledgment step in the task card distribution
  process so a revision cannot be considered 'issued' until every technician has confirmed receipt"
  — Maintenance Engineering Department, Priority High, **Verified** (Effectiveness: Effective)
- **Review**: Approved by J. Bramwell

---

### 2.10 Ground Staff Safety Incident — `INC-2026-0049`

- **Scenario**: Ground staff safety incident
- **Classification**: `OccupationalSafetyIncident` → *Employee Slip/Trip/Fall*; Severity
  **Moderate**; Risk Band **Moderate**; Priority **Elevated**
- **Status**: `Closed` — demonstrates the **inconclusive root cause override**
  (`investigation-workflow.md` §9.5)
- **Context**: Vanguard Cargo, Aeroventure AV-320 reg. `V-VGC112`, Flight VG450, ZZFD, occurrence
  date 2026-04-19
- **Narrative**: A ground crew member slipped on a wet section of the ramp surface near stand D3,
  sustaining a minor wrist injury. The source of the wetness (rainfall runoff vs. a fluid leak from
  nearby equipment) could not be conclusively determined after the fact.
- **Persons Involved**: K. Osei (Ramp Supervisor, on duty, minor injury from the slip)
- **Hazard**: "Stand D3's drainage grating is positioned such that runoff can pool near the walking
  path in moderate rain" — Initial: Possible × Moderate = 9 (**Moderate**); Existing Controls: "None
  specific — standard ramp drainage only"; Residual: Possible × Moderate = 9 (**Moderate**,
  unchanged — no control has yet been implemented to address the pooling specifically)
- **Contributing Factor**: "Weather at the time (light rain) reduced ramp surface visibility of
  wet/dry boundaries" — category **Environment**
- **Root Cause**: **Inconclusive** — "Investigators could not conclusively determine whether the
  wet surface resulted from rainfall runoff or a separate equipment fluid leak; both weather records
  and equipment inspection logs were consistent with either explanation, and no fluid sample was
  collected at the time." (justification, per the inconclusive-override rule, minimum 20 characters)
- **Corrective Action**: "Place temporary hazard signage and non-slip matting at stand D3 pending
  drainage assessment" — Ground Operations Department, Priority High, **Completed** (this is
  `requiredForClosure = TRUE`, and was resolved before closure)
- **Preventive Action**: "Assess and, if warranted, redesign stand D3 drainage grating to eliminate
  pooling near the walking path" — Facilities Department, Priority Medium, **Open**
  (`requiredForClosure = FALSE` — a longer-term facilities project correctly does not block this
  investigation's closure, per `data-model.md` §3.20's default rationale, and is exactly the kind of
  case that default was designed for)
- **Review**: Approved by J. Bramwell — reviewer comment: "Root cause appropriately marked
  inconclusive rather than guessed; preventive action correctly left open post-closure."

## 3. Variety Summary

Confirms the dataset spans the required dimensions rather than clustering on one value:

| Dimension | Coverage across the 10 profiles |
|---|---|
| **Status** | `Draft`(1) → `Open`(1) → `UnderInvestigation`(1) → `Analysis`(1) → `Review`(1) → `Closed`(5) — all 6 states represented |
| **Severity** | Minor(1), Moderate(2), Major(4), Catastrophic(2, both via computed Potential Outcome), plus 1 not-yet-classified |
| **Risk Band** | Low(1), Moderate(3), High(4), Critical(2) |
| **Priority** | Routine(1), Elevated(2), Urgent(4), Immediate(2), plus 1 not-yet-computed |
| **Root Cause Category** | Supervision, Equipment, Communication, Training, Procedures, Management, and one explicit **Inconclusive** — 6 of the 10 `FactorCategory` values plus the override, deliberately not all 10 (forcing every category into 10 short examples would read as artificial) |
| **Action Effectiveness** | Effective (majority), one **PartiallyEffective** (§2.2), several still `Open`/`Assigned`/`InProgress`/pending verification — not every action is a clean success story |
| **Priority-floor rule demonstration** | `INC-2026-0043` (Dangerous Goods) shows the category floor and the computed result agreeing at `Immediate` |
| **Actual-vs-Potential showcase** | `INC-2026-0046` (Near Miss) is the dataset's clearest example — Negligible actual outcome, Catastrophic potential outcome |

## 4. Assumptions Specific to This Dataset

- **DD-1**: This dataset is additive to, and consistent with, the fictional entities already
  established in `data-model.md` §10 (Skylark Air, Aeroventure, ZZFI/ZZFC/ZZFM) — it does not
  rename or contradict them, only extends the roster (§1) and adds ten new reference numbers
  (`INC-2026-0040`–`0049`) distinct from the earlier illustrative examples.
- **DD-2**: Investigations are deliberately left at varying levels of completion (§2.4, §2.5, §2.7's
  Draft example, §2.3's mid-Analysis example) rather than all ten being fully closed — a demo
  consisting only of neat, finished investigations would not exercise the incomplete-data
  ("Not provided"/"Not established," `report-spec.md` §4) and completeness-gate
  (`investigation-workflow.md` §8) behavior the application is built to demonstrate.
- **DD-3**: Not every `FactorCategory`/`OccurrenceCategory` value is used across only ten profiles —
  full taxonomy coverage was judged less valuable than realistic variety at this scale; a larger
  seed set (beyond this pass's minimum of ten) could extend coverage further without contradicting
  anything specified here.
- **DD-4**: Named individuals recur across profiles where organizationally sensible (e.g. D. Fontaine
  as ZZFI's Ramp Supervisor appears only in `INC-2026-0040`, but the roster in §1.5 is built to be
  reused by a future, larger seed set) — this is a world-building choice for realism, not a
  data-model requirement.

## 5. Consistency Notes — Required Follow-Up Elsewhere

This document was scoped to `demo-data.md` only. Turning it into an actual seed script is
implementation work (explicitly out of scope — "do not implement yet"), but the following mapping
work is implied for that eventual pass: each profile above maps directly onto
`prisma/seed.ts`'s expected shape (`technical-architecture.md` §5.4) — `Investigation`, `Occurrence`,
`Aircraft`, `Flight`, `Location`, `Person`, `Hazard`, `ContributingFactor`, `RootCause`,
`CorrectiveAction`/`PreventiveAction`, and `InvestigationReview` rows per investigation, plus the
five `User` accounts and recurring personnel names in §1 as either `User` rows (for the five system
accounts) or plain text fields (for operational personnel referenced only within `Person`/evidence
records, who are not application users).

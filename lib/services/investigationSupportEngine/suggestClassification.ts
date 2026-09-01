import { OccurrenceCategory } from "@/prisma/generated/prisma/client";
import type { ConfidenceTier } from "./confidence";

/**
 * FR-028 — Generate Suggested Classification (Investigation Support).
 * Local, transparent, rule-based keyword matching — no external AI service,
 * no trained model (assistance-engine.md §2, product-spec.md §11.1).
 * Category B, Inferential (assistance-engine.md §3.3/§3.4). Moved here
 * from lib/services/suggestClassification.ts as part of Phase 11's
 * consolidation (implementation-plan.md Phase 11) — category/subcategory
 * matching logic is identical to the Phase 5 original; this pass adds the
 * `confidence` tier the original never computed, closing a real gap
 * against §3.4's "every Inferential output carries a confidence tier,
 * shown alongside the output, never hidden" requirement (also required by
 * testing-spec.md TS-032).
 *
 * Category/subcategory only — severity, risk, and priority are always
 * computed from structured fields (FR-067), never narrative-suggested.
 */

interface CategoryRule {
  category: OccurrenceCategory;
  subcategory: string;
  keywords: string[];
}

// A representative rule per data-model.md §6.6 category — matched against
// the investigation's Narrative Description. Not exhaustive; a genuine
// "no confident match" result is expected and correct for many narratives.
const RULES: CategoryRule[] = [
  { category: "AircraftIncident", subcategory: "Runway Excursion", keywords: ["runway excursion", "veered off the runway", "departed the runway"] },
  { category: "AircraftIncident", subcategory: "Bird/Wildlife Strike", keywords: ["bird strike", "bird ingestion", "wildlife strike"] },
  { category: "AircraftIncident", subcategory: "Turbulence Encounter", keywords: ["turbulence", "clear air turbulence"] },
  { category: "GroundHandlingIncident", subcategory: "Aircraft Ground Damage (Contact with Ground Equipment)", keywords: ["ground equipment", "gpu", "belt loader", "contacted the aircraft"] },
  { category: "GroundHandlingIncident", subcategory: "Pushback/Towing Incident", keywords: ["pushback", "towing", "tug"] },
  { category: "GroundHandlingIncident", subcategory: "Fueling Incident", keywords: ["fueling", "fuel spill", "refueling"] },
  { category: "RampSafetyIncident", subcategory: "Foreign Object Debris (FOD) Event", keywords: ["fod", "foreign object debris"] },
  { category: "RampSafetyIncident", subcategory: "Ramp Vehicle Right-of-Way Violation", keywords: ["ramp vehicle", "right-of-way"] },
  { category: "BaggageIncident", subcategory: "Mishandled/Lost Baggage", keywords: ["lost baggage", "mishandled baggage", "misrouted bag"] },
  { category: "BaggageIncident", subcategory: "Baggage Belt/Conveyor Incident", keywords: ["baggage belt", "conveyor"] },
  { category: "CargoIncident", subcategory: "Cargo Shift In-Flight", keywords: ["cargo shift", "shifted in flight"] },
  { category: "DangerousGoodsIncident", subcategory: "Undeclared Dangerous Goods", keywords: ["undeclared dangerous goods", "undeclared hazmat"] },
  { category: "DangerousGoodsIncident", subcategory: "Dangerous Goods Spill/Leak", keywords: ["dangerous goods", "hazmat spill", "chemical leak"] },
  { category: "PassengerHandlingIncident", subcategory: "Passenger Injury (Boarding/Deplaning)", keywords: ["passenger injury", "slipped while boarding", "fell while deplaning"] },
  { category: "PassengerHandlingIncident", subcategory: "Passenger Medical Event", keywords: ["medical emergency", "passenger collapsed", "medical event"] },
  { category: "SecurityRelatedOccurrence", subcategory: "Unauthorized Access to Restricted Area", keywords: ["unauthorized access", "restricted area breach"] },
  { category: "SecurityRelatedOccurrence", subcategory: "Suspicious Item/Behavior Report", keywords: ["suspicious item", "suspicious behavior"] },
  { category: "OccupationalSafetyIncident", subcategory: "Employee Slip/Trip/Fall", keywords: ["slipped and fell", "tripped and fell", "slip/trip/fall"] },
  { category: "EquipmentVehicleIncident", subcategory: "Ground Support Equipment (GSE) Malfunction", keywords: ["gse malfunction", "equipment malfunction"] },
  { category: "EquipmentVehicleIncident", subcategory: "Ground Vehicle Collision", keywords: ["vehicle collision", "vehicles collided"] },
  { category: "MaintenanceRelatedOccurrence", subcategory: "Post-Maintenance System Failure", keywords: ["post-maintenance", "after maintenance"] },
  { category: "MaintenanceRelatedOccurrence", subcategory: "Maintenance Error Leading to Occurrence", keywords: ["maintenance error"] },
  { category: "EnvironmentalOccurrence", subcategory: "Fuel/Fluid Spill", keywords: ["fluid spill", "oil spill"] },
  { category: "NearMiss", subcategory: "Near Miss — Aircraft-to-Vehicle/Equipment", keywords: ["near miss", "narrowly avoided", "almost collided"] },
  { category: "NearMiss", subcategory: "Near Miss — Runway/Taxiway Incursion", keywords: ["runway incursion", "taxiway incursion"] },
];

export interface ClassificationSuggestion {
  category: OccurrenceCategory;
  subcategory: string;
  matchedKeywords: string[];
  confidence: ConfidenceTier;
}

/** Two or more matched keywords is a strong signal; one is weaker, scaled by how specific that single phrase is. */
function confidenceFor(matched: string[]): ConfidenceTier {
  if (matched.length >= 2) return "High";
  const wordCount = matched[0].split(" ").length;
  return wordCount >= 3 ? "Medium" : "Low";
}

/**
 * Returns null (never a low-confidence guess) when no rule matches —
 * FR-028's "no confident suggestion available" is an explicit, expected
 * outcome, not an error.
 */
export function suggestClassification(narrativeDescription: string): ClassificationSuggestion | null {
  const normalized = narrativeDescription.toLowerCase();

  let bestMatch: { rule: CategoryRule; matched: string[] } | null = null;

  for (const rule of RULES) {
    const matched = rule.keywords.filter((keyword) => normalized.includes(keyword));
    if (matched.length > 0 && (!bestMatch || matched.length > bestMatch.matched.length)) {
      bestMatch = { rule, matched };
    }
  }

  if (!bestMatch) {
    return null;
  }

  return {
    category: bestMatch.rule.category,
    subcategory: bestMatch.rule.subcategory,
    matchedKeywords: bestMatch.matched,
    confidence: confidenceFor(bestMatch.matched),
  };
}

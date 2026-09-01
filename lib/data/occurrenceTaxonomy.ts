// Relative import (not the "@/*" alias) so this file resolves correctly
// both from Next.js app code and from prisma/seed.ts, which runs via tsx
// and does not resolve that alias the same way Next.js's bundler does.
import { OccurrenceCategory } from "../../prisma/generated/prisma/client";

/**
 * data-model.md §6.6 — the seed content for OccurrenceSubcategoryOption.
 * Regulator-neutrality disclaimer applies (product-spec.md §11.4): this is
 * an internally-defined taxonomy, not any regulator's official scheme.
 */
export const OCCURRENCE_TAXONOMY: Record<OccurrenceCategory, string[]> = {
  AircraftIncident: [
    "Runway Excursion",
    "Controlled Flight Into Terrain (CFIT)",
    "Loss of Control In-Flight",
    "Bird/Wildlife Strike",
    "Airspace Infringement",
    "System/Component Failure (Flight-Critical)",
    "Turbulence Encounter",
    "Other Aircraft Incident",
  ],
  GroundHandlingIncident: [
    "Aircraft Ground Damage (Contact with Ground Equipment)",
    "Pushback/Towing Incident",
    "De-icing/Anti-icing Incident",
    "Fueling Incident",
    "Loading/Unloading Incident",
    "Other Ground Handling Incident",
  ],
  RampSafetyIncident: [
    "Foreign Object Debris (FOD) Event",
    "Jet Blast/Prop Wash Incident",
    "Ramp Vehicle Right-of-Way Violation",
    "Aircraft-to-Aircraft Ramp Proximity Event",
    "Ramp Personnel Struck/Contact Incident",
    "Other Ramp Safety Incident",
  ],
  BaggageIncident: [
    "Mishandled/Lost Baggage",
    "Baggage Damage",
    "Baggage Belt/Conveyor Incident",
    "Baggage Cart Incident",
    "Other Baggage Incident",
  ],
  CargoIncident: [
    "Cargo Damage",
    "Cargo Shift In-Flight",
    "Cargo Loading Error (Weight & Balance)",
    "Cargo Documentation Discrepancy",
    "Other Cargo Incident",
  ],
  DangerousGoodsIncident: [
    "Undeclared Dangerous Goods",
    "Dangerous Goods Packaging Failure",
    "Dangerous Goods Spill/Leak",
    "Dangerous Goods Documentation Error",
    "Other Dangerous Goods Incident",
  ],
  PassengerHandlingIncident: [
    "Passenger Injury (Boarding/Deplaning)",
    "Passenger Medical Event",
    "Passenger Disruptive Behavior",
    "Passenger with Reduced Mobility (PRM) Handling Incident",
    "Other Passenger Handling Incident",
  ],
  SecurityRelatedOccurrence: [
    "Unauthorized Access to Restricted Area",
    "Screening Process Failure",
    "Suspicious Item/Behavior Report",
    "Security Breach Involving Aircraft",
    "Other Security-Related Occurrence",
  ],
  OccupationalSafetyIncident: [
    "Employee Slip/Trip/Fall",
    "Manual Handling Injury",
    "Exposure to Hazardous Substance",
    "Noise/Hearing-Related Incident",
    "Other Occupational Safety Incident",
  ],
  EquipmentVehicleIncident: [
    "Ground Support Equipment (GSE) Malfunction",
    "Ground Vehicle Collision",
    "Equipment Fire",
    "Equipment Rollaway",
    "Other Equipment/Vehicle Incident",
  ],
  MaintenanceRelatedOccurrence: [
    "Maintenance Error Leading to Occurrence",
    "Missing/Incorrect Maintenance Documentation",
    "Unapproved Part or Repair",
    "Post-Maintenance System Failure",
    "Other Maintenance-Related Occurrence",
  ],
  EnvironmentalOccurrence: [
    "Fuel/Fluid Spill",
    "Noise Complaint/Exceedance",
    "Wildlife Habitat Disturbance",
    "Waste/Hazmat Disposal Non-Compliance",
    "Other Environmental Occurrence",
  ],
  NearMiss: [
    "Near Miss — Aircraft-to-Aircraft",
    "Near Miss — Aircraft-to-Vehicle/Equipment",
    "Near Miss — Personnel",
    "Near Miss — Runway/Taxiway Incursion",
    "Other Near Miss",
  ],
  Other: ["Unclassified/Other"],
};

/** data-model.md §6.4 — seeded default risk bands. */
export const DEFAULT_RISK_BANDS = [
  { minScore: 1, maxScore: 4, bandLabel: "Low", colorHint: "green", displayOrder: 1 },
  { minScore: 5, maxScore: 9, bandLabel: "Moderate", colorHint: "amber", displayOrder: 2 },
  { minScore: 10, maxScore: 16, bandLabel: "High", colorHint: "orange", displayOrder: 3 },
  { minScore: 17, maxScore: 25, bandLabel: "Critical", colorHint: "red", displayOrder: 4 },
];

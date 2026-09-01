import { db } from "@/lib/db";
import { SUPPORT_LABELS } from "./labels";

/**
 * assistance-engine.md §4.2 — Missing-Information Warnings. Category A,
 * Definite. Field-level gap-flagging for a curated "valuable but optional"
 * field per entity — one level more granular than Checklist Suggestions.
 * Only warns when the section is already in progress (i.e. the row already
 * exists — a section with zero rows is the Checklist's job, not this
 * one) and the specific field is empty. A section with every curated field
 * populated produces zero warnings — silence is the expected, positive
 * outcome (§4.2's edge case), not a fallback state needing its own message.
 */
export interface MissingInfoWarning {
  message: string;
  href: string;
}

export interface MissingInfoWarningsResult {
  label: string;
  warnings: MissingInfoWarning[];
}

function href(investigationId: number, section: string): string {
  return `/investigations/${investigationId}/${section}`;
}

export async function getMissingInformationWarnings(investigationId: number): Promise<MissingInfoWarningsResult> {
  const [aircraft, flight, location, hazards, rootCauses, correctiveActions, preventiveActions, evidence, witnesses, persons] =
    await Promise.all([
      db.aircraft.findUnique({ where: { investigationId } }),
      db.flight.findUnique({ where: { investigationId } }),
      db.location.findUnique({ where: { investigationId } }),
      db.hazard.findMany({ where: { investigationId } }),
      db.rootCause.findMany({ where: { investigationId } }),
      db.correctiveAction.findMany({ where: { investigationId } }),
      db.preventiveAction.findMany({ where: { investigationId } }),
      db.evidence.findMany({ where: { investigationId } }),
      db.witness.findMany({ where: { investigationId } }),
      db.person.findMany({ where: { investigationId } }),
    ]);

  const warnings: MissingInfoWarning[] = [];

  // §4.2(c): suppressed automatically whenever noPersonsInvolvedConfirmed is
  // set, since that flag can only be TRUE when zero Person rows exist —
  // there is nothing here to warn about in that case, by construction.
  for (const person of persons) {
    if ((person.roleType === "PIC" || person.roleType === "FirstOfficer") && !person.licenseNumber) {
      warnings.push({
        message: `License Number is not recorded for ${person.name}.`,
        href: href(investigationId, "occurrence"),
      });
    }
  }

  if (aircraft && !aircraft.serialNumber) {
    warnings.push({ message: "Serial Number is not recorded for this aircraft.", href: href(investigationId, "aircraft-flight") });
  }
  if (flight && !flight.picLicenseNumber) {
    warnings.push({ message: "PIC License Number is not recorded for this flight.", href: href(investigationId, "aircraft-flight") });
  }
  if (location && !location.weatherVisibility) {
    warnings.push({ message: "Weather Visibility is not recorded for this location.", href: href(investigationId, "aircraft-flight") });
  }

  for (const hazard of hazards) {
    if (!hazard.existingControls) {
      warnings.push({
        message: `Existing Controls is not recorded for hazard "${hazard.description.slice(0, 60)}".`,
        href: href(investigationId, "hazards"),
      });
    }
  }

  for (const rootCause of rootCauses) {
    if (!rootCause.isInconclusive && !rootCause.investigatorNotes) {
      warnings.push({
        message: `Investigator Notes is not recorded for this Potential Root Cause.`,
        href: href(investigationId, "root-causes"),
      });
    }
  }

  for (const action of correctiveActions) {
    if (!action.department) {
      warnings.push({
        message: `Department is not recorded for corrective action "${action.description.slice(0, 60)}".`,
        href: href(investigationId, "actions"),
      });
    }
  }
  for (const action of preventiveActions) {
    if (!action.department) {
      warnings.push({
        message: `Department is not recorded for preventive action "${action.description.slice(0, 60)}".`,
        href: href(investigationId, "actions"),
      });
    }
  }

  for (const item of evidence) {
    if (!item.investigatorNotes) {
      warnings.push({
        message: `Investigator Notes is not recorded for evidence item "${item.description.slice(0, 60)}".`,
        href: href(investigationId, "evidence"),
      });
    }
  }

  for (const witness of witnesses) {
    if (!witness.reliabilityNotes) {
      warnings.push({
        message: `Reliability Notes is not recorded for witness "${witness.name}".`,
        href: href(investigationId, "witnesses"),
      });
    }
  }

  return { label: SUPPORT_LABELS.missingInformationWarning, warnings };
}

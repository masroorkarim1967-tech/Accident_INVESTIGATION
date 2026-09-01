"use client";

import { useMemo, useState } from "react";
import type { Hazard } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { InitialRiskForm } from "./InitialRiskForm";
import { ResidualRiskForm } from "./ResidualRiskForm";
import { RiskGrid, type RiskGridBand } from "./RiskGrid";
import { removeHazardAction } from "@/lib/actions/hazard";

const HAZARD_CATEGORY_LABELS: Record<string, string> = {
  HumanFactors: "Human Factors",
  Technical: "Technical",
  Environmental: "Environmental",
  Organizational: "Organizational",
  Other: "Other",
};

function HazardCard({
  investigationId,
  hazard,
  bands,
  readOnly,
  onEdit,
  onRemove,
}: {
  investigationId: number;
  hazard: Hazard;
  bands: RiskGridBand[];
  readOnly: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const initial = { likelihood: hazard.initialLikelihood, severity: hazard.initialSeverity, score: hazard.initialRiskScore };
  const residual =
    hazard.residualLikelihood && hazard.residualSeverity && hazard.residualRiskScore != null
      ? { likelihood: hazard.residualLikelihood, severity: hazard.residualSeverity, score: hazard.residualRiskScore }
      : null;

  return (
    <li className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{hazard.description}</p>
          <p className="text-xs text-muted">{HAZARD_CATEGORY_LABELS[hazard.hazardCategory]}</p>
        </div>
        {!readOnly && (
          <div className="flex flex-shrink-0 gap-2">
            <button type="button" onClick={onEdit} className="text-xs text-teal hover:underline">Edit</button>
            <button type="button" onClick={onRemove} className="text-xs text-red hover:underline">Remove</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-[11px] uppercase text-muted">Initial Risk</p>
          <RiskBadge score={hazard.initialRiskScore} band={hazard.initialRiskBand} />
        </div>
        <div>
          <p className="text-[11px] uppercase text-muted">Residual Risk</p>
          <RiskBadge score={hazard.residualRiskScore} band={hazard.residualRiskBand} />
        </div>
      </div>

      <RiskGrid bands={bands} initial={initial} residual={residual} />

      {!readOnly && <ResidualRiskForm investigationId={investigationId} hazard={hazard} />}
    </li>
  );
}

export function HazardPanel({
  investigationId,
  hazards,
  bands,
  readOnly,
}: {
  investigationId: number;
  hazards: Hazard[];
  bands: RiskGridBand[];
  readOnly: boolean;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);

  // ui-spec.md §11: sortable by RiskBadge, highest first by default —
  // residual score once assessed, falling back to initial score.
  const sorted = useMemo(
    () => [...hazards].sort((a, b) => (b.residualRiskScore ?? b.initialRiskScore) - (a.residualRiskScore ?? a.initialRiskScore)),
    [hazards],
  );

  async function handleRemove(hazardId: number) {
    await removeHazardAction(investigationId, hazardId);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No hazards identified yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((hazard) => (
            <HazardCard
              key={hazard.id}
              investigationId={investigationId}
              hazard={hazard}
              bands={bands}
              readOnly={readOnly}
              onEdit={() => setEditingId(hazard.id)}
              onRemove={() => handleRemove(hazard.id)}
            />
          ))}
        </ul>
      )}

      {!readOnly && editingId !== "new" && (
        <div>
          <Button type="button" variant="secondary" onClick={() => setEditingId("new")}>+ Add Hazard</Button>
        </div>
      )}

      {!readOnly && editingId === "new" && (
        <InitialRiskForm investigationId={investigationId} hazard={null} onDone={() => setEditingId(null)} />
      )}
      {!readOnly && typeof editingId === "number" && (
        <InitialRiskForm
          investigationId={investigationId}
          hazard={hazards.find((h) => h.id === editingId) ?? null}
          onDone={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

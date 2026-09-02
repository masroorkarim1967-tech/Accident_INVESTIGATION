"use client";

import { useState } from "react";
import type {
  Occurrence,
  Person,
  ImmediateAction,
  OccurrenceSubcategoryOption,
} from "@/prisma/generated/prisma/client";
import { NarrativeForm } from "./NarrativeForm";
import { ClassificationPanel } from "./ClassificationPanel";
import { PersonsPanel } from "./PersonsPanel";
import { ImmediateActionsPanel } from "./ImmediateActionsPanel";

const TABS = ["Narrative", "Classification", "Persons Involved", "Immediate Actions"] as const;
type Tab = (typeof TABS)[number];

export function OccurrenceTabs({
  investigationId,
  occurrence,
  persons,
  immediateActions,
  subcategories,
  readOnly,
}: {
  investigationId: number;
  occurrence: Occurrence;
  persons: Person[];
  immediateActions: ImmediateAction[];
  subcategories: OccurrenceSubcategoryOption[];
  readOnly: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Narrative");

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 whitespace-nowrap px-3 py-2 text-sm ${
              activeTab === tab ? "border-b-2 border-amber text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {activeTab === "Narrative" && (
          <NarrativeForm investigationId={investigationId} occurrence={occurrence} readOnly={readOnly} />
        )}
        {activeTab === "Classification" && (
          <ClassificationPanel
            investigationId={investigationId}
            occurrence={occurrence}
            subcategories={subcategories}
            readOnly={readOnly}
          />
        )}
        {activeTab === "Persons Involved" && (
          <PersonsPanel
            investigationId={investigationId}
            persons={persons}
            noPersonsInvolvedConfirmed={occurrence.noPersonsInvolvedConfirmed}
            readOnly={readOnly}
          />
        )}
        {activeTab === "Immediate Actions" && (
          <ImmediateActionsPanel investigationId={investigationId} entries={immediateActions} readOnly={readOnly} />
        )}
      </div>
    </div>
  );
}

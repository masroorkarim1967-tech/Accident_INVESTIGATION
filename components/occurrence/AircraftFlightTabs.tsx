"use client";

import { useState } from "react";
import type { Aircraft, Flight, Location } from "@/prisma/generated/prisma/client";
import { AircraftForm } from "./AircraftForm";
import { FlightForm } from "./FlightForm";
import { LocationForm } from "./LocationForm";

const TABS = ["Aircraft", "Flight", "Location & Conditions"] as const;
type Tab = (typeof TABS)[number];

export function AircraftFlightTabs({
  investigationId,
  aircraft,
  flight,
  location,
  readOnly,
}: {
  investigationId: number;
  aircraft: Aircraft | null;
  flight: Flight | null;
  location: Location | null;
  readOnly: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Aircraft");

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
        {activeTab === "Aircraft" && <AircraftForm investigationId={investigationId} aircraft={aircraft} readOnly={readOnly} />}
        {activeTab === "Flight" && <FlightForm investigationId={investigationId} flight={flight} readOnly={readOnly} />}
        {activeTab === "Location & Conditions" && (
          <LocationForm investigationId={investigationId} location={location} readOnly={readOnly} />
        )}
      </div>
    </div>
  );
}

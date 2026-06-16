"use client";

import { useState } from "react";
import { FillupForm } from "@/components/FillupForm";
import { Readout } from "@/components/ui";
import { fmtMpg, fmtMiles } from "@/lib/calc";
import type { Vehicle } from "@/lib/calc";

type VehicleStats = {
  lastOdometer: number | null;
  lastMpg: number | null;
  lastStation: string | null;
};

export function LogPageClient({
  vehicles,
  vehicleStats,
  stationNames,
  stationLocations,
}: {
  vehicles: Vehicle[];
  vehicleStats: Record<string, VehicleStats>;
  stationNames: string[];
  stationLocations: string[];
}) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    vehicles[0]?.id ?? null,
  );

  const stats = selectedVehicleId ? (vehicleStats[selectedVehicleId] ?? null) : null;
  const hasStats = stats && (stats.lastOdometer !== null || stats.lastMpg !== null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Log a fill-up</h1>
        <p className="mt-1 text-sm text-ink/55">
          Enter what you paid at the pump. MPG fills in once two fills bracket an interval.
        </p>
      </div>

      {hasStats && (
        <div className="grid grid-cols-2 gap-2">
          <Readout
            label="Last odometer"
            value={fmtMiles(stats.lastOdometer)}
            sub={stats.lastStation ?? undefined}
          />
          <Readout
            label="Last MPG"
            value={fmtMpg(stats.lastMpg)}
            tone={stats.lastMpg === null ? "muted" : "default"}
            sub={stats.lastMpg === null ? "needs another fill" : undefined}
          />
        </div>
      )}

      <div className="rounded-2xl border border-hairline bg-paper p-4 shadow-card">
        <FillupForm
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onVehicleChange={setSelectedVehicleId}
          stationNames={stationNames}
          stationLocations={stationLocations}
        />
      </div>
    </div>
  );
}

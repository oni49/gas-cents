import Link from "next/link";
import { getFillups, getVehicles } from "@/lib/data";
import { deriveRowsByVehicle, stationLabel } from "@/lib/calc";
import { LogPageClient } from "@/app/(app)/LogPageClient";

export default async function LogPage() {
  const [fillups, vehicles] = await Promise.all([getFillups(), getVehicles()]);

  if (vehicles.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Log a fill-up</h1>
          <p className="mt-1 text-sm text-ink/55">Add a vehicle first, then start logging fill-ups.</p>
        </div>
        <div className="rounded-2xl border border-dashed border-hairline bg-paper/60 px-5 py-10 text-center">
          <p className="font-display text-base font-semibold text-ink">No vehicles yet</p>
          <p className="mt-2 text-sm text-ink/55">Add your car in Settings to get started.</p>
          <Link
            href="/settings"
            className="mt-4 inline-block rounded-lg bg-petrol px-5 py-2 text-sm font-semibold text-white shadow-card hover:bg-petrol-deep"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  const stationNames = [
    ...new Set(fillups.map((f) => f.station_name.trim()).filter(Boolean)),
  ].sort();
  const stationLocations = [
    ...new Set(fillups.map((f) => (f.station_location ?? "").trim()).filter(Boolean)),
  ].sort();

  const allDerived = deriveRowsByVehicle(fillups);
  const vehicleStats: Record<string, { lastOdometer: number | null; lastMpg: number | null; lastStation: string | null }> = {};
  for (const v of vehicles) {
    const rows = allDerived.get(v.id) ?? [];
    const last = rows.length > 0 ? rows[rows.length - 1] : null;
    vehicleStats[v.id] = {
      lastOdometer: last?.odometer ?? null,
      lastMpg: last?.intervalMpg ?? null,
      lastStation: last ? stationLabel(last.station_name, last.station_location) : null,
    };
  }

  return (
    <LogPageClient
      vehicles={vehicles}
      vehicleStats={vehicleStats}
      stationNames={stationNames}
      stationLocations={stationLocations}
    />
  );
}

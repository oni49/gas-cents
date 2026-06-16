import { getFillups } from "@/lib/data";
import { FillupForm } from "@/components/FillupForm";
import { deriveRows, fmtMpg, fmtMiles, stationLabel } from "@/lib/calc";
import { Readout } from "@/components/ui";

export default async function LogPage() {
  const fillups = await getFillups();
  const stationNames = [...new Set(fillups.map((f) => f.station_name.trim()).filter(Boolean))].sort();
  const stationLocations = [
    ...new Set(fillups.map((f) => (f.station_location ?? "").trim()).filter(Boolean)),
  ].sort();

  const rows = deriveRows(fillups);
  const last = rows[rows.length - 1];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Log a fill-up</h1>
        <p className="mt-1 text-sm text-ink/55">Enter what you paid at the pump. MPG fills in once two fills bracket an interval.</p>
      </div>

      {last && (
        <div className="grid grid-cols-2 gap-2">
          <Readout label="Last odometer" value={fmtMiles(last.odometer)} sub={stationLabel(last.station_name, last.station_location)} />
          <Readout
            label="Last MPG"
            value={fmtMpg(last.intervalMpg)}
            tone={last.intervalMpg === null ? "muted" : "default"}
            sub={last.intervalMpg === null ? "needs another fill" : undefined}
          />
        </div>
      )}

      <div className="rounded-2xl border border-hairline bg-paper p-4 shadow-card">
        <FillupForm stationNames={stationNames} stationLocations={stationLocations} />
      </div>
    </div>
  );
}

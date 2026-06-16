"use client";

import { useMemo, useState, useTransition } from "react";
import {
  deriveRows,
  stationKey,
  stationLabel,
  fmtMpg,
  fmtPricePerGallon,
  fmtCostPerMile,
  fmtMiles,
  fmtMoney,
  type Fillup,
} from "@/lib/calc";
import { deleteFillup } from "@/app/(app)/actions";
import { useDismissedSkips } from "@/lib/useDismissedSkips";
import { FillupForm } from "@/components/FillupForm";
import { Readout, Badge, Stat } from "@/components/ui";

export function FillupList({ fillups }: { fillups: Fillup[] }) {
  const { dismissed, toggle } = useDismissedSkips();
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => deriveRows(fillups), [fillups]);
  // Most recent first for reading.
  const display = useMemo(() => [...rows].reverse(), [rows]);

  const labelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of fillups) m.set(stationKey(f.station_name, f.station_location), stationLabel(f.station_name, f.station_location));
    return m;
  }, [fillups]);

  const stationNames = useMemo(
    () => [...new Set(fillups.map((f) => f.station_name.trim()).filter(Boolean))].sort(),
    [fillups],
  );
  const stationLocations = useMemo(
    () => [...new Set(fillups.map((f) => (f.station_location ?? "").trim()).filter(Boolean))].sort(),
    [fillups],
  );

  if (fillups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline bg-paper/60 px-5 py-10 text-center">
        <p className="font-display text-base font-semibold text-ink">No fill-ups yet</p>
        <p className="mt-1 text-sm text-ink/55">Log one on the Log tab. After your second fill, MPG starts showing here.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {display.map((r) => {
        const creditLabel = r.mpgCreditStationKey ? labelByKey.get(r.mpgCreditStationKey) : null;
        const skipActive = r.suspectedSkip && !dismissed.has(r.id);

        if (editing === r.id) {
          return (
            <li key={r.id} className="rounded-xl border border-petrol/30 bg-paper p-4 shadow-card">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-petrol">Edit fill-up</p>
              <FillupForm
                mode="edit"
                fillup={r}
                stationNames={stationNames}
                stationLocations={stationLocations}
                onDone={() => setEditing(null)}
              />
            </li>
          );
        }

        return (
          <li key={r.id} className="rounded-xl border border-hairline bg-paper p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-semibold leading-tight text-ink">
                  {stationLabel(r.station_name, r.station_location)}
                </p>
                <p className="text-xs text-ink/50">{formatDate(r.filled_at)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditing(r.id)}
                  className="rounded-md border border-hairline px-2.5 py-1 text-xs text-ink/60 hover:text-ink"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this fill-up? Metrics will recompute.")) {
                      startTransition(() => deleteFillup(r.id));
                    }
                  }}
                  disabled={pending}
                  className="rounded-md border border-hairline px-2.5 py-1 text-xs text-flag/80 hover:text-flag disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Readout
                label="MPG"
                value={fmtMpg(r.intervalMpg)}
                tone={r.intervalMpg === null ? "muted" : "default"}
                sub={creditLabel ? `${creditLabel}'s gas` : r.intervalMpg === null ? "no interval yet" : undefined}
              />
              <Readout label="$/gal" value={fmtPricePerGallon(r.pricePerGallon)} />
              <Readout label="$/mile" value={fmtCostPerMile(r.costPerMile)} tone={r.costPerMile === null ? "muted" : "default"} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <Stat label="Odometer" value={fmtMiles(r.odometer)} />
              <Stat label="Miles" value={fmtMiles(r.intervalMiles)} />
              <Stat label="Gallons" value={r.gallons.toFixed(3)} />
              <Stat label="Cost" value={fmtMoney(r.total_cost)} />
            </div>

            {(r.flags.length > 0 || !r.filled_to_full) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {!r.filled_to_full && <Badge tone="info">Partial fill</Badge>}
                {r.approximate && <Badge tone="info">Approximate MPG</Badge>}
                {r.invalid && <Badge tone="warn">Check odometer</Badge>}
                {r.dateOutOfOrder && <Badge tone="warn">Date / odometer mismatch</Badge>}
                {skipActive && <Badge tone="warn">Possible skipped log</Badge>}
                {r.suspectedSkip && dismissed.has(r.id) && <Badge tone="neutral">Skip dismissed</Badge>}
              </div>
            )}

            {r.suspectedSkip && (
              <button
                onClick={() => toggle(r.id)}
                className="mt-2 text-xs font-medium text-petrol underline-offset-2 hover:underline"
              >
                {dismissed.has(r.id) ? "Re-flag as possible skip" : "This entry is fine — dismiss"}
              </button>
            )}

            {r.flags.length > 0 && (
              <ul className="mt-2 space-y-1">
                {r.flags.map((f, i) => (
                  <li key={i} className="text-xs leading-snug text-ink/55">
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

"use client";

import { useMemo, useState } from "react";
import {
  leaderboardByMpg,
  leaderboardByPrice,
  fmtMpg,
  fmtPricePerGallon,
  fmtCostPerMile,
  type Fillup,
  type LeaderboardEntry,
} from "@/lib/calc";
import { useDismissedSkips } from "@/lib/useDismissedSkips";

export function Leaderboards({ fillups }: { fillups: Fillup[] }) {
  const { dismissed } = useDismissedSkips();
  const [includePartials, setIncludePartials] = useState(false);

  const opts = useMemo(
    () => ({ includePartials, dismissedSkipIds: dismissed }),
    [includePartials, dismissed],
  );
  const mpgBoard = useMemo(() => leaderboardByMpg(fillups, opts), [fillups, opts]);
  const priceBoard = useMemo(() => leaderboardByPrice(fillups, opts), [fillups, opts]);

  if (fillups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline bg-paper/60 px-5 py-10 text-center">
        <p className="font-display text-base font-semibold text-ink">Nothing to rank yet</p>
        <p className="mt-1 text-sm text-ink/55">Log a few fill-ups and your stations will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <label className="flex items-center justify-between rounded-lg border border-hairline bg-paper px-3 py-2.5 text-sm">
        <span className="text-ink/75">Include partial-fill intervals</span>
        <input
          type="checkbox"
          checked={includePartials}
          onChange={(e) => setIncludePartials(e.target.checked)}
          className="h-4 w-4 rounded border-hairline accent-petrol"
        />
      </label>

      <Board
        title="Best mileage"
        subtitle="Mean of the interval MPGs each station's gas delivered"
        entries={mpgBoard}
        format={(v) => fmtMpg(v)}
        unit="mpg"
        countNoun="interval"
        emptyHint="MPG needs at least two consecutive full fills."
      />

      <Board
        title="Cheapest gas"
        subtitle="Mean price per gallon paid at each station"
        entries={priceBoard}
        format={(v) => fmtPricePerGallon(v)}
        unit="/gal"
        countNoun="fill"
        emptyHint="Log a fill-up to start this ranking."
      />

      <p className="text-xs leading-relaxed text-ink/45">
        Ties break by lowest cost per mile, then the station with the oldest entry. Counts are honest:
        a station&apos;s most recent fill has a price but no closed MPG interval yet, so its two counts can differ.
      </p>
    </div>
  );
}

function Board({
  title,
  subtitle,
  entries,
  format,
  unit,
  countNoun,
  emptyHint,
}: {
  title: string;
  subtitle: string;
  entries: LeaderboardEntry[];
  format: (v: number) => string;
  unit: string;
  countNoun: string;
  emptyHint: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold text-petrol">{title}</h2>
      </div>
      <p className="mb-3 text-xs text-ink/50">{subtitle}</p>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline px-3 py-4 text-sm text-ink/50">{emptyHint}</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((e, i) => (
            <li
              key={e.stationKey}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-paper p-3 shadow-card"
            >
              <span
                className={`readout-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
                  i === 0 ? "bg-amber text-petrol-deep" : "bg-ink/8 text-ink/60"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{e.stationLabel}</p>
                <p className="text-xs text-ink/45">
                  {e.count} {countNoun}
                  {e.count === 1 ? "" : "s"}
                  {e.meanCostPerMile !== null && (
                    <> · {fmtCostPerMile(e.meanCostPerMile)}/mi</>
                  )}
                </p>
              </div>
              <div className="readout-tile shrink-0 text-right">
                <span className="text-xl font-bold text-petrol">{format(e.value)}</span>
                <span className="ml-1 text-xs text-ink/40">{unit}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

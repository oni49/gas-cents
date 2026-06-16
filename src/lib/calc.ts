// ---------------------------------------------------------------------------
// calc.ts — pure fuel-efficiency derivation logic.
//
// This module holds the ENTIRE calculation model. It is intentionally free of
// React, Next, and Supabase so it can be unit-tested in isolation (see
// test/calc.test.mjs). Nothing here is stored in the database; every metric is
// derived from the raw `fillups` rows on each render.
//
// Model (consecutive fills N-1 -> N, ordered by odometer):
//   interval_miles    = odo_N - odo_{N-1}
//   interval_mpg      = interval_miles / gallons_N      (credited to station N-1)
//   price_per_gallon  = cost_N / gallons_N              (credited to station N)
//   cost_per_mile     = cost_N / interval_miles
//
// MPG attribution: the gas burned over an interval was bought at the PREVIOUS
// fill, so that interval's MPG is credited to the previous station — it measures
// how far that station's gas took you.
// ---------------------------------------------------------------------------

export type Fillup = {
  id: string;
  filled_at: string; // 'YYYY-MM-DD'
  station_name: string;
  station_location: string | null;
  odometer: number;
  gallons: number;
  total_cost: number;
  filled_to_full: boolean;
  created_at?: string | null;
};

export type DerivedRow = Fillup & {
  intervalMiles: number | null;
  intervalMpg: number | null;
  pricePerGallon: number; // always defined
  costPerMile: number | null;
  mpgCreditStationKey: string | null; // previous station (earns the MPG)
  approximate: boolean; // interval touches a partial fill
  suspectedSkip: boolean; // MPG outlier vs running median (heuristic)
  dateOutOfOrder: boolean; // filled_at disagrees with odometer order
  invalid: boolean; // odometer <= previous (non-positive interval)
  flags: string[];
};

export type LeaderboardEntry = {
  stationKey: string;
  stationLabel: string;
  value: number; // mean MPG (board A) or mean price/gal (board B)
  count: number; // sample size behind the average
  meanCostPerMile: number | null; // tiebreaker datum
  earliestDate: string; // oldest entry for this station (tiebreaker datum)
};

export type LeaderboardOptions = {
  includePartials?: boolean; // include approximate intervals (default false)
  dismissedSkipIds?: Set<string>; // rows the user marked "not a skip"
};

// --- helpers ---------------------------------------------------------------

export function stationKey(name: string, location: string | null): string {
  const n = (name || "").trim().toLowerCase().replace(/\s+/g, " ");
  const l = (location || "").trim().toLowerCase().replace(/\s+/g, " ");
  return l ? `${n}\u241F${l}` : n;
}

export function stationLabel(name: string, location: string | null): string {
  const n = (name || "").trim();
  const l = (location || "").trim();
  return l ? `${n} \u00B7 ${l}` : n;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Outlier thresholds for the skipped-log heuristic. A skipped/unlogged fill
// makes an interval cover more than one tank, inflating MPG; a far-too-low MPG
// is also suspicious. Heuristic only — surfaced as a dismissible flag.
const SKIP_HIGH = 1.6; // mpg > median * 1.6
const SKIP_LOW = 0.5; // mpg < median * 0.5

// --- core ------------------------------------------------------------------

/**
 * Order fills by odometer (physical source of truth), tie-broken by date then
 * insertion order, and compute every per-interval metric and flag.
 */
export function deriveRows(fillups: Fillup[]): DerivedRow[] {
  const sorted = [...fillups].sort((a, b) => {
    if (a.odometer !== b.odometer) return a.odometer - b.odometer;
    if (a.filled_at !== b.filled_at) return a.filled_at < b.filled_at ? -1 : 1;
    const ca = a.created_at || "";
    const cb = b.created_at || "";
    if (ca !== cb) return ca < cb ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

  const rows: DerivedRow[] = sorted.map((f, i) => {
    const pricePerGallon = f.total_cost / f.gallons;
    const row: DerivedRow = {
      ...f,
      intervalMiles: null,
      intervalMpg: null,
      pricePerGallon,
      costPerMile: null,
      mpgCreditStationKey: null,
      approximate: false,
      suspectedSkip: false,
      dateOutOfOrder: false,
      invalid: false,
      flags: [],
    };

    if (i === 0) {
      row.flags.push("First logged fill — no prior odometer, so MPG can't be computed yet.");
      return row;
    }

    const prev = sorted[i - 1];
    const miles = f.odometer - prev.odometer;

    if (miles <= 0) {
      row.invalid = true;
      row.intervalMiles = miles;
      row.flags.push("Odometer is not greater than the previous reading — check the entry.");
      return row;
    }

    row.intervalMiles = miles;
    row.intervalMpg = miles / f.gallons;
    row.costPerMile = f.total_cost / miles;
    row.mpgCreditStationKey = stationKey(prev.station_name, prev.station_location);

    if (!prev.filled_to_full || !f.filled_to_full) {
      row.approximate = true;
      row.flags.push("Approximate — a partial fill is involved, so this MPG isn't exact.");
    }

    // date vs odometer disorder
    if (f.filled_at < prev.filled_at) {
      row.dateOutOfOrder = true;
      row.flags.push("Date is earlier than the previous fill but the odometer is higher — double-check the date.");
    }

    return row;
  });

  // Second pass: skipped-log heuristic against the median of valid MPGs.
  const validMpgs = rows
    .filter((r) => r.intervalMpg !== null && !r.invalid)
    .map((r) => r.intervalMpg as number);
  const med = median(validMpgs);
  if (med !== null && med > 0) {
    for (const r of rows) {
      if (r.intervalMpg === null || r.invalid) continue;
      if (r.intervalMpg > med * SKIP_HIGH || r.intervalMpg < med * SKIP_LOW) {
        r.suspectedSkip = true;
        r.flags.push("Unusual MPG vs your typical — possible skipped/unlogged fill. Dismiss if this entry is fine.");
      }
    }
  }

  return rows;
}

// Per-station oldest entry + display label, from raw fills (all of them).
function stationMeta(fillups: Fillup[]): Map<string, { label: string; earliest: string }> {
  const m = new Map<string, { label: string; earliest: string }>();
  for (const f of fillups) {
    const key = stationKey(f.station_name, f.station_location);
    const label = stationLabel(f.station_name, f.station_location);
    const cur = m.get(key);
    if (!cur) {
      m.set(key, { label, earliest: f.filled_at });
    } else if (f.filled_at < cur.earliest) {
      cur.earliest = f.filled_at;
    }
  }
  return m;
}

function includeForLeaderboard(r: DerivedRow, opts: LeaderboardOptions): boolean {
  if (r.invalid) return false;
  if (r.approximate && !opts.includePartials) return false;
  if (r.suspectedSkip && !(opts.dismissedSkipIds?.has(r.id))) return false;
  return true;
}

/**
 * Leaderboard A — stations ranked by the arithmetic MEAN of the per-interval
 * MPGs credited to them (the intervals their gas powered). Best first.
 * Tiebreak: higher mean MPG -> lower mean cost/mile (same intervals) -> oldest
 * station entry -> name.
 */
export function leaderboardByMpg(fillups: Fillup[], opts: LeaderboardOptions = {}): LeaderboardEntry[] {
  const rows = deriveRows(fillups);
  const meta = stationMeta(fillups);
  const groups = new Map<string, { mpgs: number[]; cpms: number[] }>();

  for (const r of rows) {
    if (r.intervalMpg === null || r.mpgCreditStationKey === null) continue;
    if (!includeForLeaderboard(r, opts)) continue;
    const key = r.mpgCreditStationKey;
    const g = groups.get(key) || { mpgs: [], cpms: [] };
    g.mpgs.push(r.intervalMpg);
    if (r.costPerMile !== null) g.cpms.push(r.costPerMile);
    groups.set(key, g);
  }

  const entries: LeaderboardEntry[] = [];
  for (const [key, g] of groups) {
    if (g.mpgs.length === 0) continue;
    const info = meta.get(key);
    entries.push({
      stationKey: key,
      stationLabel: info?.label ?? key,
      value: mean(g.mpgs),
      count: g.mpgs.length,
      meanCostPerMile: g.cpms.length ? mean(g.cpms) : null,
      earliestDate: info?.earliest ?? "9999-12-31",
    });
  }

  entries.sort(rankMpg);
  return entries;
}

/**
 * Leaderboard B — stations ranked by the arithmetic MEAN of the price/gallon
 * paid there. Cheapest first.
 * Tiebreak: lower mean price -> lower mean cost/mile (that station's own fills)
 * -> oldest station entry -> name.
 */
export function leaderboardByPrice(fillups: Fillup[], opts: LeaderboardOptions = {}): LeaderboardEntry[] {
  const rows = deriveRows(fillups);
  const meta = stationMeta(fillups);
  const groups = new Map<string, { prices: number[]; cpms: number[] }>();

  for (const r of rows) {
    const key = stationKey(r.station_name, r.station_location);
    const g = groups.get(key) || { prices: [], cpms: [] };
    g.prices.push(r.pricePerGallon); // price is always defined for every fill
    if (r.costPerMile !== null && includeForLeaderboard(r, opts)) g.cpms.push(r.costPerMile);
    groups.set(key, g);
  }

  const entries: LeaderboardEntry[] = [];
  for (const [key, g] of groups) {
    if (g.prices.length === 0) continue;
    const info = meta.get(key);
    entries.push({
      stationKey: key,
      stationLabel: info?.label ?? key,
      value: mean(g.prices),
      count: g.prices.length,
      meanCostPerMile: g.cpms.length ? mean(g.cpms) : null,
      earliestDate: info?.earliest ?? "9999-12-31",
    });
  }

  entries.sort(rankPrice);
  return entries;
}

function byCostPerMileThenDateThenName(a: LeaderboardEntry, b: LeaderboardEntry): number {
  // lower cost/mile wins; a null cost/mile ranks last among ties
  const ca = a.meanCostPerMile;
  const cb = b.meanCostPerMile;
  if (ca !== cb) {
    if (ca === null) return 1;
    if (cb === null) return -1;
    return ca - cb;
  }
  if (a.earliestDate !== b.earliestDate) return a.earliestDate < b.earliestDate ? -1 : 1;
  return a.stationLabel.localeCompare(b.stationLabel);
}

function rankMpg(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (b.value !== a.value) return b.value - a.value; // higher MPG first
  return byCostPerMileThenDateThenName(a, b);
}

function rankPrice(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (a.value !== b.value) return a.value - b.value; // cheaper first
  return byCostPerMileThenDateThenName(a, b);
}

// --- display formatters ----------------------------------------------------

export function fmtMpg(v: number | null): string {
  return v === null ? "\u2014" : v.toFixed(1);
}
export function fmtMoney(v: number | null): string {
  return v === null ? "\u2014" : `$${v.toFixed(2)}`;
}
export function fmtPricePerGallon(v: number | null): string {
  return v === null ? "\u2014" : `$${v.toFixed(3)}`;
}
export function fmtCostPerMile(v: number | null): string {
  return v === null ? "\u2014" : `$${v.toFixed(3)}`;
}
export function fmtMiles(v: number | null): string {
  return v === null ? "\u2014" : v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

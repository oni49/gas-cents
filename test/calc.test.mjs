// Unit tests for the pure derivation logic.
// Run with: npm test    (Node >= 22.18, uses built-in type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveRows,
  deriveRowsByVehicle,
  leaderboardByMpg,
  leaderboardByPrice,
  stationKey,
} from "../src/lib/calc.ts";

const f = (over) => ({
  id: Math.random().toString(36).slice(2),
  vehicle_id: null,
  filled_at: "2026-01-01",
  station_name: "Shell",
  station_location: null,
  odometer: 0,
  gallons: 10,
  total_cost: 30,
  filled_to_full: true,
  created_at: null,
  ...over,
});

test("first fill has no MPG but has a price", () => {
  const rows = deriveRows([f({ id: "a", odometer: 1000, gallons: 10, total_cost: 35 })]);
  assert.equal(rows[0].intervalMpg, null);
  assert.equal(rows[0].intervalMiles, null);
  assert.equal(rows[0].pricePerGallon, 3.5);
});

test("interval MPG, price/gal and cost/mile are correct", () => {
  const rows = deriveRows([
    f({ id: "a", odometer: 1000, gallons: 10, total_cost: 30 }),
    f({ id: "b", odometer: 1300, gallons: 10, total_cost: 40 }), // 300 mi on 10 gal
  ]);
  const b = rows.find((r) => r.id === "b");
  assert.equal(b.intervalMiles, 300);
  assert.equal(b.intervalMpg, 30); // 300 / 10
  assert.equal(b.pricePerGallon, 4); // 40 / 10
  assert.equal(b.costPerMile, 40 / 300); // cost_this / interval_miles
});

test("MPG is credited to the PREVIOUS station", () => {
  const rows = deriveRows([
    f({ id: "a", station_name: "Costco", odometer: 1000 }),
    f({ id: "b", station_name: "Shell", odometer: 1300 }),
  ]);
  const b = rows.find((r) => r.id === "b");
  assert.equal(b.mpgCreditStationKey, stationKey("Costco", null));
});

test("rows are ordered by odometer regardless of input order", () => {
  const rows = deriveRows([
    f({ id: "late", odometer: 2000 }),
    f({ id: "early", odometer: 1000 }),
    f({ id: "mid", odometer: 1500 }),
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["early", "mid", "late"]);
});

test("odometer <= previous is flagged invalid, not crashed", () => {
  const rows = deriveRows([
    f({ id: "a", odometer: 1000 }),
    f({ id: "b", odometer: 1000 }), // same reading
  ]);
  const b = rows.find((r) => r.id === "b");
  assert.equal(b.invalid, true);
  assert.equal(b.intervalMpg, null);
});

test("partial fills mark the interval approximate", () => {
  const rows = deriveRows([
    f({ id: "a", odometer: 1000, filled_to_full: true }),
    f({ id: "b", odometer: 1300, filled_to_full: false }),
  ]);
  assert.equal(rows.find((r) => r.id === "b").approximate, true);
});

test("date earlier than previous (by odometer) is flagged", () => {
  const rows = deriveRows([
    f({ id: "a", odometer: 1000, filled_at: "2026-02-01" }),
    f({ id: "b", odometer: 1300, filled_at: "2026-01-15" }),
  ]);
  assert.equal(rows.find((r) => r.id === "b").dateOutOfOrder, true);
});

test("MPG leaderboard ranks by mean of interval MPGs, best first", () => {
  // Costco gas -> 30 mpg interval; Shell gas -> 20 mpg interval
  const board = leaderboardByMpg([
    f({ id: "1", station_name: "Costco", odometer: 1000, gallons: 10 }),
    f({ id: "2", station_name: "Shell", odometer: 1300, gallons: 10 }), // 300/10 = 30 -> Costco
    f({ id: "3", station_name: "Costco", odometer: 1500, gallons: 10 }), // 200/10 = 20 -> Shell
  ]);
  assert.equal(board[0].stationLabel, "Costco");
  assert.equal(board[0].value, 30);
  assert.equal(board[0].count, 1);
  assert.equal(board[1].stationLabel, "Shell");
  assert.equal(board[1].value, 20);
});

test("partial-fill intervals are excluded from MPG board unless included", () => {
  const data = [
    f({ id: "1", station_name: "Costco", odometer: 1000 }),
    f({ id: "2", station_name: "Shell", odometer: 1300, filled_to_full: false }), // approximate -> Costco interval
  ];
  assert.equal(leaderboardByMpg(data).length, 0); // excluded by default
  assert.equal(leaderboardByMpg(data, { includePartials: true }).length, 1);
});

test("price leaderboard ranks cheapest mean price/gal first", () => {
  const board = leaderboardByPrice([
    f({ id: "1", station_name: "Pricey", odometer: 1000, gallons: 10, total_cost: 50 }), // $5.000
    f({ id: "2", station_name: "Cheap", odometer: 1300, gallons: 10, total_cost: 30 }), // $3.000
  ]);
  assert.equal(board[0].stationLabel, "Cheap");
  assert.equal(board[0].value, 3);
  assert.equal(board[1].stationLabel, "Pricey");
});

test("price board counts every fill; MPG board count can be one fewer", () => {
  // Two fills at the same station: 2 prices, but only the first earns an MPG
  // (the interval after it). The most recent has price, no closed interval yet.
  const data = [
    f({ id: "1", station_name: "Solo", odometer: 1000 }),
    f({ id: "2", station_name: "Solo", odometer: 1300 }),
  ];
  const price = leaderboardByPrice(data);
  assert.equal(price[0].count, 2);
  const mpg = leaderboardByMpg(data);
  assert.equal(mpg[0].count, 1); // only the first Solo fill's gas has been "closed"
});

// --- per-vehicle grouping ---

test("deriveRowsByVehicle groups fills by vehicle_id with no cross-vehicle intervals", () => {
  const fills = [
    f({ id: "a1", vehicle_id: "v1", odometer: 1000 }),
    f({ id: "a2", vehicle_id: "v1", odometer: 1300 }),
    f({ id: "b1", vehicle_id: "v2", odometer: 500 }),
    f({ id: "b2", vehicle_id: "v2", odometer: 800 }),
  ];
  const grouped = deriveRowsByVehicle(fills);

  assert.equal(grouped.size, 2);
  const v1 = grouped.get("v1");
  const v2 = grouped.get("v2");

  const a2 = v1.find((r) => r.id === "a2");
  assert.equal(a2.intervalMiles, 300); // 1300 - 1000, not cross-vehicle

  const b2 = v2.find((r) => r.id === "b2");
  assert.equal(b2.intervalMiles, 300); // 800 - 500, not cross-vehicle
});

test("null-vehicle fills form their own isolated group", () => {
  const fills = [
    f({ id: "n1", vehicle_id: null, odometer: 100 }),
    f({ id: "n2", vehicle_id: null, odometer: 200 }),
    f({ id: "v1", vehicle_id: "car-1", odometer: 150 }),
  ];
  const grouped = deriveRowsByVehicle(fills);

  assert.equal(grouped.size, 2);
  const nullGroup = grouped.get(null);
  assert.equal(nullGroup.length, 2);
  // n2's interval should only see n1 as predecessor, not car-1 at odo 150
  const n2 = nullGroup.find((r) => r.id === "n2");
  assert.equal(n2.intervalMiles, 100); // 200 - 100
});

test("leaderboard MPG intervals never cross vehicle boundaries", () => {
  const fills = [
    f({ id: "v1a", vehicle_id: "v1", station_name: "Costco", odometer: 1000, gallons: 10 }),
    f({ id: "v1b", vehicle_id: "v1", station_name: "Shell", odometer: 1300, gallons: 10 }),
    f({ id: "v2a", vehicle_id: "v2", station_name: "BP", odometer: 500, gallons: 10 }),
    f({ id: "v2b", vehicle_id: "v2", station_name: "Mobil", odometer: 800, gallons: 10 }),
  ];
  const board = leaderboardByMpg(fills);

  const costco = board.find((e) => e.stationLabel === "Costco");
  assert.equal(costco.value, 30); // 300/10 from v1
  assert.equal(costco.count, 1);

  const bp = board.find((e) => e.stationLabel === "BP");
  assert.equal(bp.value, 30); // 300/10 from v2
  assert.equal(bp.count, 1);
});

test("price leaderboard aggregates across vehicles without cross-vehicle cost/mile", () => {
  const fills = [
    f({ id: "1", vehicle_id: "v1", station_name: "Cheap", odometer: 1000, gallons: 10, total_cost: 30 }),
    f({ id: "2", vehicle_id: "v1", station_name: "Cheap", odometer: 1300, gallons: 10, total_cost: 30 }),
    f({ id: "3", vehicle_id: "v2", station_name: "Cheap", odometer: 500, gallons: 10, total_cost: 30 }),
  ];
  const board = leaderboardByPrice(fills);
  assert.equal(board.length, 1);
  assert.equal(board[0].count, 3); // all 3 fills at same station, across vehicles
  assert.equal(board[0].value, 3); // $30 / 10 gal
});

test("skipped-log heuristic flags an inflated-MPG outlier", () => {
  // steady ~30 mpg, then one interval at ~75 mpg (a skipped fill)
  const data = [
    f({ id: "1", odometer: 1000, gallons: 10 }),
    f({ id: "2", odometer: 1300, gallons: 10 }), // 30
    f({ id: "3", odometer: 1600, gallons: 10 }), // 30
    f({ id: "4", odometer: 1900, gallons: 10 }), // 30
    f({ id: "5", odometer: 2650, gallons: 10 }), // 75 -> outlier
  ];
  const rows = deriveRows(data);
  assert.equal(rows.find((r) => r.id === "5").suspectedSkip, true);
});

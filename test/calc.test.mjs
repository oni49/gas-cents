// Unit tests for the pure derivation logic.
// Run with: npm test    (Node >= 22.18, uses built-in type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveRows,
  leaderboardByMpg,
  leaderboardByPrice,
  stationKey,
} from "../src/lib/calc.ts";

const f = (over) => ({
  id: Math.random().toString(36).slice(2),
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

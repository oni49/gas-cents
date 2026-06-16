import { createClient } from "@/lib/supabase/server";
import type { Fillup, Vehicle } from "@/lib/calc";

const FILLUP_COLUMNS =
  "id, vehicle_id, filled_at, station_name, station_location, odometer, gallons, total_cost, filled_to_full, created_at";

// Fetch the signed-in user's fill-ups. RLS guarantees only their own rows.
// Postgres `numeric` comes back as strings (to preserve precision) — coerce here.
export async function getFillups(): Promise<Fillup[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fillups")
    .select(FILLUP_COLUMNS)
    .order("odometer", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((d) => ({
    id: d.id as string,
    vehicle_id: (d.vehicle_id as string | null) ?? null,
    filled_at: d.filled_at as string,
    station_name: d.station_name as string,
    station_location: (d.station_location as string | null) ?? null,
    odometer: Number(d.odometer),
    gallons: Number(d.gallons),
    total_cost: Number(d.total_cost),
    filled_to_full: Boolean(d.filled_to_full),
    created_at: (d.created_at as string | null) ?? null,
  }));
}

const VEHICLE_COLUMNS = "id, make, model, year, odometer, vin, created_at";

export async function getVehicles(): Promise<Vehicle[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select(VEHICLE_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((d) => ({
    id: d.id as string,
    make: d.make as string,
    model: d.model as string,
    year: Number(d.year),
    odometer: Number(d.odometer),
    vin: (d.vin as string | null) ?? null,
    created_at: (d.created_at as string | null) ?? null,
  }));
}

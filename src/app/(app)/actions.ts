"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; error?: string; resetKey?: number };

// --- Fill-up types & validation ---

type FillupInput = {
  vehicle_id: string | null;
  filled_at: string;
  station_name: string;
  station_location: string | null;
  odometer: number;
  gallons: number;
  total_cost: number;
  filled_to_full: boolean;
};

type VehicleInput = {
  make: string;
  model: string;
  year: number;
  odometer: number;
  vin: string | null;
};

type ValidationResult<T> = { values: T } | { error: string };

function num(v: FormDataEntryValue | null): number {
  return typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
}

function validateFillup(formData: FormData, requireVehicle: boolean): ValidationResult<FillupInput> {
  const vehicle_id = String(formData.get("vehicle_id") || "").trim();
  const filled_at = String(formData.get("filled_at") || "").trim();
  const station_name = String(formData.get("station_name") || "").trim();
  const station_location = String(formData.get("station_location") || "").trim();
  const odometer = num(formData.get("odometer"));
  const gallons = num(formData.get("gallons"));
  const total_cost = num(formData.get("total_cost"));
  const filled_to_full = formData.get("filled_to_full") === "on";

  if (requireVehicle && !vehicle_id) return { error: "Select a vehicle." };
  if (!filled_at || Number.isNaN(Date.parse(filled_at))) return { error: "Pick a valid date." };
  if (!station_name) return { error: "Enter a station name." };
  if (Number.isNaN(odometer) || odometer < 0) return { error: "Odometer must be a number of 0 or more." };
  if (Number.isNaN(gallons) || gallons <= 0) return { error: "Gallons must be greater than 0." };
  if (Number.isNaN(total_cost) || total_cost <= 0) return { error: "Total cost must be greater than 0." };

  return {
    values: {
      vehicle_id: vehicle_id || null,
      filled_at,
      station_name,
      station_location: station_location || null,
      odometer,
      gallons,
      total_cost,
      filled_to_full,
    },
  };
}

type SupaClient = ReturnType<typeof createClient>;

// Recomputes a vehicle's stored odometer as MAX(odometer) across its fill-ups.
async function syncVehicleOdometer(supabase: SupaClient, vehicleId: string): Promise<void> {
  const { data } = await supabase
    .from("fillups")
    .select("odometer")
    .eq("vehicle_id", vehicleId)
    .order("odometer", { ascending: false })
    .limit(1);
  const maxOdometer = data?.[0] ? Number(data[0].odometer) : 0;
  await supabase.from("vehicles").update({ odometer: maxOdometer }).eq("id", vehicleId);
}

export async function addFillup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = validateFillup(formData, true);
  if ("error" in result) return { ok: false, error: result.error };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out. Log in again." };

  const { error: dbError } = await supabase
    .from("fillups")
    .insert({ ...result.values, user_id: user.id });
  if (dbError) return { ok: false, error: dbError.message };

  if (result.values.vehicle_id) {
    await syncVehicleOdometer(supabase, result.values.vehicle_id);
  }

  revalidatePath("/", "layout");
  return { ok: true, resetKey: Date.now() };
}

export async function updateFillup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Missing record id." };

  const result = validateFillup(formData, false);
  if ("error" in result) return { ok: false, error: result.error };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out. Log in again." };

  // Capture old vehicle_id before updating so we can sync it too on reassignment.
  const { data: oldData } = await supabase
    .from("fillups")
    .select("vehicle_id")
    .eq("id", id)
    .single();
  const oldVehicleId = (oldData?.vehicle_id as string | null) ?? null;

  const { error: dbError } = await supabase.from("fillups").update(result.values).eq("id", id);
  if (dbError) return { ok: false, error: dbError.message };

  const toSync = new Set<string>();
  if (oldVehicleId) toSync.add(oldVehicleId);
  if (result.values.vehicle_id) toSync.add(result.values.vehicle_id);
  for (const vid of toSync) await syncVehicleOdometer(supabase, vid);

  revalidatePath("/", "layout");
  return { ok: true, resetKey: Date.now() };
}

export async function deleteFillup(id: string): Promise<void> {
  const supabase = createClient();

  const { data } = await supabase.from("fillups").select("vehicle_id").eq("id", id).single();
  const vehicleId = (data?.vehicle_id as string | null) ?? null;

  await supabase.from("fillups").delete().eq("id", id);

  if (vehicleId) await syncVehicleOdometer(supabase, vehicleId);

  revalidatePath("/", "layout");
}

// --- Vehicle validation ---

const VIN_RE = /^[A-HJ-NPR-Z0-9]+$/i;

function validateVehicle(formData: FormData): ValidationResult<VehicleInput> {
  const make = String(formData.get("make") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const year = parseInt(String(formData.get("year") || ""), 10);
  const odometer = num(formData.get("odometer"));
  const vin = String(formData.get("vin") || "").trim();

  if (!make || make.length > 100) return { error: "Enter a valid make (max 100 characters)." };
  if (!model || model.length > 100) return { error: "Enter a valid model (max 100 characters)." };
  if (isNaN(year) || year < 1885 || year > 2100) return { error: "Enter a valid year (1885–2100)." };
  if (isNaN(odometer) || odometer < 0) return { error: "Odometer must be 0 or more." };
  if (vin && (vin.length > 17 || !VIN_RE.test(vin))) {
    return { error: "VIN must be up to 17 alphanumeric characters (no I, O, or Q)." };
  }

  return { values: { make, model, year, odometer, vin: vin || null } };
}

export async function addVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = validateVehicle(formData);
  if ("error" in result) return { ok: false, error: result.error };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out. Log in again." };

  const { error: dbError } = await supabase
    .from("vehicles")
    .insert({ ...result.values, user_id: user.id });
  if (dbError) return { ok: false, error: dbError.message };

  revalidatePath("/", "layout");
  return { ok: true, resetKey: Date.now() };
}

export async function updateVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Missing vehicle id." };

  const result = validateVehicle(formData);
  if ("error" in result) return { ok: false, error: result.error };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out. Log in again." };

  const { error: dbError } = await supabase.from("vehicles").update(result.values).eq("id", id);
  if (dbError) return { ok: false, error: dbError.message };

  revalidatePath("/", "layout");
  return { ok: true, resetKey: Date.now() };
}

export async function deleteVehicle(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();

  const { count } = await supabase
    .from("fillups")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", id);

  if (count && count > 0) {
    return {
      ok: false,
      error: `This vehicle has ${count} fill-up${count === 1 ? "" : "s"} logged. Remove them first before deleting the vehicle.`,
    };
  }

  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; error?: string; resetKey?: number };

function num(v: FormDataEntryValue | null): number {
  return typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
}

function validate(formData: FormData): { values?: Record<string, unknown>; error?: string } {
  const filled_at = String(formData.get("filled_at") || "").trim();
  const station_name = String(formData.get("station_name") || "").trim();
  const station_location = String(formData.get("station_location") || "").trim();
  const odometer = num(formData.get("odometer"));
  const gallons = num(formData.get("gallons"));
  const total_cost = num(formData.get("total_cost"));
  const filled_to_full = formData.get("filled_to_full") === "on";

  if (!filled_at || Number.isNaN(Date.parse(filled_at))) return { error: "Pick a valid date." };
  if (!station_name) return { error: "Enter a station name." };
  if (Number.isNaN(odometer) || odometer < 0) return { error: "Odometer must be a number of 0 or more." };
  if (Number.isNaN(gallons) || gallons <= 0) return { error: "Gallons must be greater than 0." };
  if (Number.isNaN(total_cost) || total_cost <= 0) return { error: "Total cost must be greater than 0." };

  return {
    values: {
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

export async function addFillup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { values, error } = validate(formData);
  if (error) return { ok: false, error };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out. Log in again." };

  const { error: dbError } = await supabase.from("fillups").insert({ ...values, user_id: user.id });
  if (dbError) return { ok: false, error: dbError.message };

  revalidatePath("/", "layout");
  return { ok: true, resetKey: Date.now() };
}

export async function updateFillup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Missing record id." };

  const { values, error } = validate(formData);
  if (error) return { ok: false, error };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out. Log in again." };

  // RLS also enforces ownership; the eq() keeps the statement scoped.
  const { error: dbError } = await supabase.from("fillups").update(values).eq("id", id);
  if (dbError) return { ok: false, error: dbError.message };

  revalidatePath("/", "layout");
  return { ok: true, resetKey: Date.now() };
}

export async function deleteFillup(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("fillups").delete().eq("id", id);
  revalidatePath("/", "layout");
}

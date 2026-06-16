"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { addFillup, updateFillup, type ActionState } from "@/app/(app)/actions";
import type { Fillup, Vehicle } from "@/lib/calc";

const initial: ActionState = { ok: false };

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function FillupForm({
  mode = "add",
  fillup,
  vehicles,
  selectedVehicleId,
  onVehicleChange,
  stationNames,
  stationLocations,
  onDone,
}: {
  mode?: "add" | "edit";
  fillup?: Fillup;
  vehicles: Vehicle[];
  selectedVehicleId?: string | null;
  onVehicleChange?: (id: string) => void;
  stationNames: string[];
  stationLocations: string[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const action = mode === "edit" ? updateFillup : addFillup;
  const [state, formAction] = useFormState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const lastReset = useRef<number | undefined>(undefined);

  // In add mode the parent controls selectedVehicleId; in edit mode we own it locally.
  const initialVehicleId =
    selectedVehicleId !== undefined
      ? (selectedVehicleId ?? "")
      : (fillup?.vehicle_id ?? (vehicles[0]?.id ?? ""));
  const [vehicleId, setVehicleId] = useState(initialVehicleId);

  // Stay in sync with parent-controlled selectedVehicleId (add mode only).
  useEffect(() => {
    if (selectedVehicleId !== undefined) setVehicleId(selectedVehicleId ?? "");
  }, [selectedVehicleId]);

  useEffect(() => {
    if (state.ok && state.resetKey && state.resetKey !== lastReset.current) {
      lastReset.current = state.resetKey;
      if (mode === "add") {
        formRef.current?.reset();
        // Preserve the selected vehicle after reset.
        setVehicleId(selectedVehicleId ?? vehicles[0]?.id ?? "");
      }
      onDone?.();
    }
  }, [state, mode, onDone, selectedVehicleId, vehicles]);

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__new__") {
      router.push("/settings");
      return;
    }
    setVehicleId(val);
    onVehicleChange?.(val);
  };

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {mode === "edit" && <input type="hidden" name="id" value={fillup?.id} />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Vehicle" className="col-span-2">
          <select
            name="vehicle_id"
            value={vehicleId}
            onChange={handleVehicleChange}
            className={`${inputCls} cursor-pointer`}
          >
            {vehicles.length === 0 && <option value="">No vehicles — add one in Settings</option>}
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.year} {v.make} {v.model}
              </option>
            ))}
            <option value="__new__">Add new vehicle →</option>
          </select>
        </Field>

        <Field label="Date" className="col-span-2">
          <input
            type="date"
            name="filled_at"
            required
            defaultValue={fillup?.filled_at ?? todayISO()}
            className={inputCls}
          />
        </Field>

        <Field label="Station" className="col-span-2">
          <input
            type="text"
            name="station_name"
            required
            list="station-names"
            placeholder="Costco, Shell, …"
            defaultValue={fillup?.station_name ?? ""}
            className={inputCls}
            autoComplete="off"
          />
          <datalist id="station-names">
            {stationNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>

        <Field label="Location (optional)" className="col-span-2">
          <input
            type="text"
            name="station_location"
            list="station-locations"
            placeholder="Main St, ZIP, exit…"
            defaultValue={fillup?.station_location ?? ""}
            className={inputCls}
            autoComplete="off"
          />
          <datalist id="station-locations">
            {stationLocations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>

        <Field label="Odometer">
          <input
            type="number"
            name="odometer"
            required
            inputMode="decimal"
            step="0.1"
            min="0"
            placeholder="miles"
            defaultValue={fillup?.odometer ?? ""}
            className={`${inputCls} readout-tile`}
          />
        </Field>

        <Field label="Gallons">
          <input
            type="number"
            name="gallons"
            required
            inputMode="decimal"
            step="0.001"
            min="0.001"
            placeholder="gal"
            defaultValue={fillup?.gallons ?? ""}
            className={`${inputCls} readout-tile`}
          />
        </Field>

        <Field label="Total cost">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">$</span>
            <input
              type="number"
              name="total_cost"
              required
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              defaultValue={fillup?.total_cost ?? ""}
              className={`${inputCls} readout-tile pl-7`}
            />
          </div>
        </Field>

        <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink/80">
          <input
            type="checkbox"
            name="filled_to_full"
            defaultChecked={fillup ? fillup.filled_to_full : true}
            className="h-4 w-4 rounded border-hairline accent-petrol"
          />
          Filled to full
        </label>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-flag/10 px-3 py-2 text-sm text-flag">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <SubmitButton mode={mode} />
        {mode === "edit" && (
          <button
            type="button"
            onClick={() => onDone?.()}
            className="rounded-lg border border-hairline px-4 py-2.5 text-sm font-medium text-ink/70"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function SubmitButton({ mode }: { mode: "add" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 rounded-lg bg-petrol px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-petrol-deep disabled:opacity-60"
    >
      {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Add fill-up"}
    </button>
  );
}

const inputCls =
  "w-full rounded-lg border border-hairline bg-paper px-3 py-2.5 text-base text-ink placeholder:text-ink/30 focus:border-petrol focus:outline-none";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
        {label}
      </span>
      {children}
    </label>
  );
}

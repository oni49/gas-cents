"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addVehicle, updateVehicle, type ActionState } from "@/app/(app)/actions";
import type { Vehicle } from "@/lib/calc";

const initial: ActionState = { ok: false };

export function VehicleForm({
  mode = "add",
  vehicle,
  onDone,
}: {
  mode?: "add" | "edit";
  vehicle?: Vehicle;
  onDone?: () => void;
}) {
  const action = mode === "edit" ? updateVehicle : addVehicle;
  const [state, formAction] = useFormState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const lastReset = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.ok && state.resetKey && state.resetKey !== lastReset.current) {
      lastReset.current = state.resetKey;
      if (mode === "add") formRef.current?.reset();
      onDone?.();
    }
  }, [state, mode, onDone]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {mode === "edit" && <input type="hidden" name="id" value={vehicle?.id} />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Make">
          <input
            type="text"
            name="make"
            required
            placeholder="Toyota"
            defaultValue={vehicle?.make ?? ""}
            className={inputCls}
            autoComplete="off"
          />
        </Field>

        <Field label="Model">
          <input
            type="text"
            name="model"
            required
            placeholder="Camry"
            defaultValue={vehicle?.model ?? ""}
            className={inputCls}
            autoComplete="off"
          />
        </Field>

        <Field label="Year">
          <input
            type="number"
            name="year"
            required
            inputMode="numeric"
            min="1885"
            max="2100"
            step="1"
            placeholder={String(new Date().getFullYear())}
            defaultValue={vehicle?.year ?? ""}
            className={`${inputCls} readout-tile`}
          />
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
            defaultValue={vehicle?.odometer ?? ""}
            className={`${inputCls} readout-tile`}
          />
        </Field>

        <Field label="VIN (optional)" className="col-span-2">
          <input
            type="text"
            name="vin"
            placeholder="Up to 17 characters"
            defaultValue={vehicle?.vin ?? ""}
            maxLength={17}
            className={inputCls}
            autoComplete="off"
          />
        </Field>
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
      {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Add vehicle"}
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

"use client";

import { useState, useTransition } from "react";
import { deleteVehicle } from "@/app/(app)/actions";
import { VehicleForm } from "@/components/VehicleForm";
import type { Vehicle } from "@/lib/calc";

function vehicleLabel(v: Vehicle) {
  return `${v.year} ${v.make} ${v.model}`;
}

export function VehicleManager({ vehicles }: { vehicles: Vehicle[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleDelete = (id: string, label: string) => {
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteVehicle(id);
      if (!result.ok) setDeleteError(result.error ?? "Could not delete vehicle.");
    });
  };

  return (
    <div className="space-y-3">
      {deleteError && (
        <p role="alert" className="rounded-md bg-flag/10 px-3 py-2 text-sm text-flag">
          {deleteError}
        </p>
      )}

      {vehicles.length === 0 && !adding && (
        <p className="text-sm text-ink/55">No vehicles added yet.</p>
      )}

      {vehicles.length > 0 && (
        <ul className="space-y-2">
          {vehicles.map((v) => {
            const label = vehicleLabel(v);
            if (editing === v.id) {
              return (
                <li key={v.id} className="rounded-xl border border-petrol/30 bg-paper p-4 shadow-card">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-petrol">Edit vehicle</p>
                  <VehicleForm mode="edit" vehicle={v} onDone={() => setEditing(null)} />
                </li>
              );
            }
            return (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-xl border border-hairline bg-paper p-3.5 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{label}</p>
                  <p className="text-xs text-ink/45">
                    {v.odometer.toLocaleString(undefined, { maximumFractionDigits: 0 })} mi
                    {v.vin && <> · {v.vin}</>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => {
                      setEditing(v.id);
                      setAdding(false);
                    }}
                    className="rounded-md border border-hairline px-2.5 py-1 text-xs text-ink/60 hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v.id, label)}
                    disabled={pending}
                    className="rounded-md border border-hairline px-2.5 py-1 text-xs text-flag/80 hover:text-flag disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div className="rounded-2xl border border-hairline bg-paper p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-petrol">Add vehicle</p>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-xs text-ink/50 hover:text-ink"
            >
              Cancel
            </button>
          </div>
          <VehicleForm onDone={() => setAdding(false)} />
        </div>
      ) : (
        <button
          onClick={() => {
            setAdding(true);
            setEditing(null);
          }}
          className="w-full rounded-lg border border-dashed border-petrol/40 py-2.5 text-sm font-medium text-petrol hover:border-petrol hover:bg-petrol/5"
        >
          + Add vehicle
        </button>
      )}
    </div>
  );
}

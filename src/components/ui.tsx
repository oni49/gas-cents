import type { ReactNode } from "react";

// The signature element: a mechanical odometer/pump-style numeric readout.
export function Readout({
  label,
  value,
  tone = "default",
  sub,
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "muted";
  sub?: string;
}) {
  const valueCls =
    tone === "muted" ? "text-amber-soft/40" : tone === "good" ? "text-readout" : "text-amber-soft";
  return (
    <div className="rounded-lg bg-petrol-deep px-3 py-2 shadow-readout">
      <div className="readout-tile text-[10px] uppercase tracking-widest text-amber-soft/70">
        {label}
      </div>
      <div className={`readout-tile text-xl font-bold leading-tight ${valueCls}`}>{value}</div>
      {sub && <div className="readout-tile text-[10px] text-amber-soft/50">{sub}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warn" | "info";
}) {
  const cls =
    tone === "warn"
      ? "bg-flag/10 text-flag"
      : tone === "info"
        ? "bg-petrol/10 text-petrol"
        : "bg-ink/8 text-ink/60";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-ink/45">{label}</span>
      <span className="readout-tile text-sm text-ink/90">{value}</span>
    </div>
  );
}

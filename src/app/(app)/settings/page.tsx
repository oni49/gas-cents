import type { Metadata } from "next";
import Link from "next/link";
import { getVehicles } from "@/lib/data";
import { VehicleManager } from "@/components/VehicleManager";

export const metadata: Metadata = {
  title: "Settings — GasCents",
};

const items = [
  {
    href: "/settings/install",
    label: "Add to Home Screen",
    description: "Install GasCents as an app on iPhone or Android",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  },
];

export default async function SettingsPage() {
  const vehicles = await getVehicles();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Settings</h1>

      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold text-ink">Vehicles</h2>
        <VehicleManager vehicles={vehicles} />
      </section>

      <ul className="rounded-2xl border border-hairline bg-paper shadow-card divide-y divide-hairline overflow-hidden">
        {items.map(({ href, label, description, icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink/[0.03] active:bg-ink/[0.06]"
            >
              <span className="text-petrol">{icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-ink">{label}</span>
                <span className="block text-xs text-ink/50">{description}</span>
              </span>
              <ChevronRight />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}


function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-ink/25">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

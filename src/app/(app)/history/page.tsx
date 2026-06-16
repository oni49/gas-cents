import { getFillups, getVehicles } from "@/lib/data";
import { FillupList } from "@/components/FillupList";

export default async function HistoryPage() {
  const [fillups, vehicles] = await Promise.all([getFillups(), getVehicles()]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">History</h1>
        <p className="mt-1 text-sm text-ink/55">
          Every fill-up, newest first. MPG is credited to the station whose gas powered that stretch.
        </p>
      </div>
      <FillupList fillups={fillups} vehicles={vehicles} />
    </div>
  );
}

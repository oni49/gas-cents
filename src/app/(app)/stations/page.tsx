import { getFillups } from "@/lib/data";
import { Leaderboards } from "@/components/Leaderboards";

export default async function StationsPage() {
  const fillups = await getFillups();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Stations</h1>
        <p className="mt-1 text-sm text-ink/55">Which stations stretch your gas furthest, and which cost least.</p>
      </div>
      <Leaderboards fillups={fillups} />
    </div>
  );
}

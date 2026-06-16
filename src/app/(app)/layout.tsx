import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TabNav } from "@/components/TabNav";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already gates this, but never render the shell without a user.
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-hairline bg-forecourt/90 px-4 py-3 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-bold tracking-tight text-petrol">
            Gas<span className="text-amber">Cents</span>
          </span>
          <span className="readout-tile text-[10px] uppercase tracking-widest text-ink/40">
            mpg / station
          </span>
        </div>
        <SignOutButton email={user.email ?? ""} />
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <TabNav />
    </div>
  );
}

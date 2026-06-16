"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ email }: { email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-xs text-ink/60 transition-colors hover:text-ink disabled:opacity-50"
      title={email}
    >
      <span className="hidden max-w-[9rem] truncate sm:inline">{email}</span>
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

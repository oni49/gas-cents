"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { createClient } from "@/lib/supabase/client";

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

function LoginInner() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | undefined>();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    params.get("error") ? "error" : "idle",
  );
  const [message, setMessage] = useState(
    params.get("error") ? "That sign-in link didn't work. Request a new one." : "",
  );
  const captchaRef = useRef<HCaptcha>(null);

  async function sendLink() {
    if (!email.trim()) {
      setStatus("error");
      setMessage("Enter your email address.");
      return;
    }
    if (SITE_KEY && !token) {
      setStatus("error");
      setMessage("Complete the verification check first.");
      return;
    }

    setStatus("sending");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/confirm`,
        captchaToken: token,
      },
    });

    // hCaptcha tokens are single-use — always reset after an attempt.
    captchaRef.current?.resetCaptcha();
    setToken(undefined);

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <p className="font-display text-3xl font-bold tracking-tight text-petrol">
          Gas<span className="text-amber">Cents</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Track real fuel efficiency by station. Log a fill-up, see which gas takes you furthest, and find
          the cheapest pump.
        </p>
      </div>

      {status === "sent" ? (
        <div className="rounded-2xl border border-readout/30 bg-readout/5 p-5">
          <p className="font-display text-lg font-semibold text-ink">Check your inbox</p>
          <p className="mt-1 text-sm text-ink/60">
            We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. Open it on this
            device or your phone to finish signing in.
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-4 text-sm font-medium text-petrol underline-offset-2 hover:underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-hairline bg-paper p-5 shadow-card">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendLink()}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-hairline bg-forecourt px-3 py-2.5 text-base text-ink placeholder:text-ink/30 focus:border-petrol focus:outline-none"
            />
          </label>

          {SITE_KEY ? (
            <HCaptcha
              ref={captchaRef}
              sitekey={SITE_KEY}
              onVerify={(t) => setToken(t)}
              onExpire={() => setToken(undefined)}
            />
          ) : (
            <p className="rounded-md bg-flag/10 px-3 py-2 text-xs text-flag">
              Captcha not configured. Set NEXT_PUBLIC_HCAPTCHA_SITE_KEY to enable sign-in protection.
            </p>
          )}

          {message && (
            <p role="alert" className="text-sm text-flag">
              {message}
            </p>
          )}

          <button
            onClick={sendLink}
            disabled={status === "sending"}
            className="w-full rounded-lg bg-petrol px-4 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-petrol-deep disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>

          <p className="text-center text-xs text-ink/40">No password needed.</p>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

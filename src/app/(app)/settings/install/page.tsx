import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add to Home Screen — GasCents",
};

export default function InstallPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Add to home screen</h1>
        <p className="mt-1 text-sm text-ink/55">
          Install GasCents as an app for quick access without the browser bar.
        </p>
      </div>

      {/* iPhone */}
      <section className="space-y-4 rounded-2xl border border-hairline bg-paper p-4 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <PhoneIcon />
          iPhone
        </h2>
        <p className="text-xs text-ink/45">Safari only — Chrome and other browsers cannot install PWAs on iOS.</p>
        <ol className="space-y-3">
          <Step n={1}>Open this page in <strong className="text-ink">Safari</strong>.</Step>
          <Step n={2}>
            Tap the <strong className="text-ink">Share</strong> button{" "}
            <ShareIcon />{" "}
            at the bottom of the screen.
          </Step>
          <Step n={3}>
            Scroll down and tap <strong className="text-ink">Add to Home Screen</strong>.
          </Step>
          <Step n={4}>
            Tap <strong className="text-ink">Add</strong> in the top-right corner.
          </Step>
        </ol>
      </section>

      {/* Android */}
      <section className="space-y-4 rounded-2xl border border-hairline bg-paper p-4 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <PhoneIcon />
          Android
        </h2>
        <p className="text-xs text-ink/45">Works in Chrome and Firefox. Chrome may show an install prompt automatically after a few visits.</p>
        <ol className="space-y-3">
          <Step n={1}>Open this page in <strong className="text-ink">Chrome</strong> or <strong className="text-ink">Firefox</strong>.</Step>
          <Step n={2}>
            Tap the <strong className="text-ink">⋮</strong> menu in the top-right corner.
          </Step>
          <Step n={3}>
            Tap <strong className="text-ink">Add to Home screen</strong> or{" "}
            <strong className="text-ink">Install app</strong>.
          </Step>
          <Step n={4}>
            Tap <strong className="text-ink">Add</strong> or{" "}
            <strong className="text-ink">Install</strong> to confirm.
          </Step>
        </ol>
      </section>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-petrol text-[11px] font-bold text-white">
        {n}
      </span>
      <p className="text-sm leading-relaxed text-ink/80">{children}</p>
    </li>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-petrol"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="inline-block align-middle text-ink/70"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

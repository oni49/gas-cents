import type { Config } from "tailwindcss";

// GasCents — "service-station instrument panel" identity.
// Warm concrete forecourt base, deep petrol-green enamel, sodium-amber readout.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forecourt: "#ECEAE3", // warm concrete base
        ink: "#16140F",
        petrol: { DEFAULT: "#103D34", deep: "#0B2C26" }, // instrument green
        amber: { DEFAULT: "#F2A20C", soft: "#FBE4B0" }, // pump readout
        readout: "#1E915E", // positive / good MPG
        flag: "#C2410C", // warnings
        paper: "#FBFAF6", // card surface
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderColor: {
        hairline: "rgba(22,20,15,0.12)",
      },
      boxShadow: {
        readout: "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(11,44,38,0.35)",
        card: "0 1px 2px rgba(22,20,15,0.06), 0 1px 1px rgba(22,20,15,0.04)",
      },
    },
  },
  plugins: [],
};
export default config;

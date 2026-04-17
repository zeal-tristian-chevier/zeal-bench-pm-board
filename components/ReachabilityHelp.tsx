"use client";

import { useState } from "react";
import type { Reachability } from "@/lib/useSupabaseReachability";

/* ──────────────────────────────────────────────────────────────────────────
 * Banner — the red "can't reach auth service" alert that appears inline when
 * the preflight probe fails. Self-contained: also opens the Troubleshooter
 * panel on click via the `onOpenHelp` callback.
 * ────────────────────────────────────────────────────────────────────────── */
export function ReachabilityBanner({
  variant = "login",
  onOpenHelp,
}: {
  variant?: "login" | "app";
  onOpenHelp: () => void;
}) {
  const headline =
    variant === "login"
      ? "Can’t reach auth service"
      : "Lost connection to the server";
  const body =
    variant === "login"
      ? "Your browser can’t contact the Supabase server. This is almost always a VPN, DNS, or ad-blocker issue on your device — not the app itself."
      : "Your changes won’t save until the connection comes back. This is usually a VPN, DNS, or network issue on your device.";

  return (
    <div
      role="alert"
      style={{
        padding: "12px 14px",
        borderRadius: "var(--radius)",
        background: "var(--error-container)",
        display: "grid",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--secondary)",
        }}
      >
        {headline}
      </div>
      <div
        style={{
          fontSize: 12.5,
          lineHeight: 1.45,
          color: "var(--on-primary-fixed)",
        }}
      >
        {body}{" "}
        <button
          type="button"
          onClick={onOpenHelp}
          style={{
            appearance: "none",
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--secondary)",
            fontWeight: 700,
            textDecoration: "underline",
          }}
        >
          Show fixes
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Troubleshoot panel — collapsible 5-step self-service fix list.
 * ────────────────────────────────────────────────────────────────────────── */
export function TroubleshootPanel({
  open,
  onToggle,
  reachability,
}: {
  open: boolean;
  onToggle: () => void;
  reachability: Reachability;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          appearance: "none",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--on-surface-variant)",
        }}
      >
        <Chevron open={open} />
        <span>Having trouble signing in?</span>
        {reachability === "ok" ? (
          <span
            aria-label="Auth service reachable"
            title="Auth service reachable"
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--success)",
            }}
          />
        ) : null}
        {reachability === "unreachable" ? (
          <span
            aria-label="Auth service unreachable"
            title="Auth service unreachable"
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--secondary)",
            }}
          />
        ) : null}
      </button>

      {open ? (
        <div
          style={{
            marginTop: 12,
            padding: "14px 16px",
            borderRadius: "var(--radius)",
            background: "var(--surface-low)",
            boxShadow: "inset 0 0 0 1px var(--ghost-border)",
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "var(--on-primary-fixed)",
            display: "grid",
            gap: 10,
          }}
        >
          <Step
            num={1}
            title="Disconnect any VPN"
            body="ProtonVPN, NordVPN, Mullvad, Cloudflare WARP, corporate VPN — disconnect and try again. VPN DNS resolvers frequently fail on Supabase hostnames."
          />
          <Step
            num={2}
            title="Try a different browser"
            body="Chrome, Firefox, or Safari. If one works, your usual browser has a stale DNS cache or a blocking extension (ad-blocker, privacy tool)."
          />
          <Step
            num={3}
            title="Use mobile data / phone hotspot"
            body="If sign-in works on your phone's hotspot, your home router or ISP is filtering DNS. Set your device's DNS to 1.1.1.1 and 1.0.0.1 to bypass it."
          />
          <Step
            num={4}
            title="Disable extensions in an incognito window"
            body="Run an incognito/private window (extensions are off by default). If sign-in works there, an extension is the culprit — usually an ad-blocker or privacy tool."
          />
          <Step
            num={5}
            title="Flush your DNS cache"
            body="macOS: sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder. Windows: ipconfig /flushdns."
          />
          <div
            style={{
              marginTop: 4,
              paddingTop: 10,
              borderTop: "1px solid var(--ghost-border)",
              fontSize: 11.5,
              color: "var(--on-surface-subtle)",
            }}
          >
            Still stuck? Send a support note with your browser, whether a VPN
            is active, and the URL in your address bar when it fails.
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Combined surface for use inside the main app (board). Shows the banner
 * only when unreachable, and expands inline with the troubleshooting panel.
 * ────────────────────────────────────────────────────────────────────────── */
export function AppConnectivityAlert({
  reachability,
}: {
  reachability: Reachability;
}) {
  const [open, setOpen] = useState(false);
  if (reachability !== "unreachable") return null;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <ReachabilityBanner variant="app" onOpenHelp={() => setOpen(true)} />
      <TroubleshootPanel
        open={open}
        onToggle={() => setOpen((v) => !v)}
        reachability={reachability}
      />
    </div>
  );
}

/* ─── Small atoms ─── */

function Step({
  num,
  title,
  body,
}: {
  num: number;
  title: string;
  body: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10 }}>
      <div
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "var(--surface-lowest)",
          boxShadow: "inset 0 0 0 1px var(--ghost-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--on-primary-fixed)",
        }}
      >
        {num}
      </div>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>
        <div style={{ color: "var(--on-surface-variant)" }}>{body}</div>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden
      style={{
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.15s ease",
      }}
    >
      <path
        d="M3 1.5L7 5L3 8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

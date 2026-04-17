"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Reachability = "checking" | "ok" | "unreachable";

type Options = {
  /** Abort the probe if it hasn't replied within this many ms. */
  timeoutMs?: number;
  /** Re-probe on this interval while the component stays mounted. */
  intervalMs?: number | null;
  /** Send a telemetry beacon on first unreachable result. */
  report?: boolean;
  /** Short label for where the probe fired from (e.g. "login", "board"). */
  context?: string;
};

/**
 * Pings the Supabase auth health endpoint from the browser to prove the user's
 * network can actually reach the project. Surfaces connectivity issues (VPN,
 * DNS filters, ad-blockers) before the user hits a dead sign-in spinner.
 *
 * Returns `"ok"` for HTTP 200 AND HTTP 401 — the health endpoint requires the
 * apikey header for 200, but a 401 still proves the TLS handshake + routing
 * worked, which is the thing we actually care about.
 */
export function useSupabaseReachability({
  timeoutMs = 8000,
  intervalMs = null,
  report = true,
  context = "unknown",
}: Options = {}) {
  const [state, setState] = useState<Reachability>("checking");
  const reportedRef = useRef(false);

  const probe = useCallback(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !apiKey) {
      setState("unreachable");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = performance.now();

    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: apiKey },
        signal: controller.signal,
        cache: "no-store",
      });
      const reachable = res.ok || res.status === 401;
      setState(reachable ? "ok" : "unreachable");

      if (!reachable && report && !reportedRef.current) {
        reportedRef.current = true;
        sendBeacon({
          context,
          kind: "bad_status",
          status: res.status,
          duration_ms: Math.round(performance.now() - started),
        });
      }
    } catch (err) {
      setState("unreachable");
      if (report && !reportedRef.current) {
        reportedRef.current = true;
        sendBeacon({
          context,
          kind: err instanceof Error && err.name === "AbortError"
            ? "timeout"
            : "network_error",
          duration_ms: Math.round(performance.now() - started),
        });
      }
    } finally {
      clearTimeout(timer);
    }
  }, [timeoutMs, report, context]);

  useEffect(() => {
    void probe();
    if (!intervalMs) return;
    const id = setInterval(() => void probe(), intervalMs);
    return () => clearInterval(id);
  }, [probe, intervalMs]);

  return { state, recheck: probe };
}

function sendBeacon(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    ...payload,
    user_agent: navigator.userAgent,
    language: navigator.language,
    online: navigator.onLine,
    ts: new Date().toISOString(),
  });

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/telemetry/connectivity", blob)) return;
    }
    // Fallback — keepalive so it still flushes if the page unloads.
    void fetch("/api/telemetry/connectivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Telemetry must never break the app.
  }
}

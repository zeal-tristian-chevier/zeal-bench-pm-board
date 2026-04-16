"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ??
        (typeof window !== "undefined" ? window.location.origin : "");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/board`,
        },
      });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div className="surface" style={{ padding: 32, width: "100%", maxWidth: 400 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bg)",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Z
          </div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Zeal Bench PM Board</div>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
          Tracking Internal Zeal Project Progress
        </div>

        <button
          className="btn"
          onClick={signInWithGoogle}
          disabled={loading}
          style={{ width: "100%", justifyContent: "center", padding: "10px 12px" }}
        >
          <GoogleIcon />
          <span>{loading ? "Redirecting…" : "Continue with Google"}</span>
        </button>

        {error ? (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "var(--danger)",
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 20,
            fontSize: 11,
            color: "var(--text-subtle)",
            lineHeight: 1.5,
          }}
        >
          Auth is powered by Supabase. Configure{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then enable the Google
          provider in the Supabase dashboard.
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.8 32.3 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.3 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.3 29.1 4.5 24 4.5 16.3 4.5 9.7 8.6 6.3 14.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.5c5 0 9.6-1.7 13.2-4.6l-6.1-5c-2 1.4-4.4 2.2-7.1 2.2-5.3 0-9.8-3.3-11.3-7.9l-6.5 5C9.6 39.3 16.2 43.5 24 43.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l.1.1 6.1 5c-.4.4 6.1-4.5 6.1-14.5 0-1.2-.1-2.3-.3-3.5z"
      />
    </svg>
  );
}

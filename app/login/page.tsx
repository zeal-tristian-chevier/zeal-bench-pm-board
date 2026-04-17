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
        typeof window !== "undefined" ? window.location.origin : "";
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
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--surface)",
        position: "relative",
        display: "grid",
        gridTemplateColumns: "minmax(420px, 1fr) 1.1fr",
      }}
    >
      <AmbientBackdrop />

      {/* LEFT — sign-in panel */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-end",
          padding: "40px 56px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 14px",
              borderRadius: 999,
              background: "var(--surface-low)",
              marginBottom: 28,
              boxShadow: "inset 0 0 0 1px var(--ghost-border)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "var(--secondary)",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--on-primary-fixed)",
              }}
            >
              Structural Pulse v2.0
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(44px, 5.2vw, 68px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 0.96,
              color: "var(--on-primary-fixed)",
              marginBottom: 20,
            }}
          >
            Build with{" "}
            <span style={{ color: "var(--secondary)" }}>precision</span>.
            <br />
            Manage with flow.
          </h1>

          <p
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              color: "var(--on-surface-variant)",
              marginBottom: 32,
              maxWidth: 420,
            }}
          >
            Editorial kanban, team benches, and project ledgers — tuned as
            precision instruments for the kinetic architect.
          </p>

          <button
            className="btn btn-primary btn-lg"
            onClick={signInWithGoogle}
            disabled={loading}
            style={{ boxShadow: "var(--shadow-float)" }}
          >
            <GoogleIcon />
            <span>{loading ? "Redirecting…" : "Sign in with Google"}</span>
          </button>

          {error ? (
            <div
              style={{
                marginTop: 18,
                fontSize: 12,
                color: "var(--secondary)",
                padding: "8px 12px",
                background: "var(--error-container)",
                borderRadius: "var(--radius)",
                display: "inline-block",
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
              marginTop: 56,
              paddingTop: 28,
              borderTop: "1px solid var(--ghost-border)",
            }}
          >
            <Stat value="10k+" label="Dependencies" />
            <Stat value="<12ms" label="Render Latency" />
            <Stat value="99.99%" label="Uptime" />
          </div>
        </div>
      </section>

      {/* RIGHT — dimensional preview */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderLeft: "1px solid var(--ghost-border)",
        }}
        aria-hidden
      >
        <BlueprintGrid />
        <GradientWash />
        <FloatingBoard />
      </section>
    </div>
  );
}

/* ─── Pieces ─── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "var(--on-primary-fixed)",
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--on-surface-subtle)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function AmbientBackdrop() {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -220,
          left: -180,
          width: 520,
          height: 520,
          borderRadius: 999,
          background: "var(--primary-fixed)",
          opacity: 0.55,
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: -200,
          left: -140,
          width: 420,
          height: 420,
          borderRadius: 999,
          background: "var(--secondary)",
          opacity: 0.06,
          filter: "blur(110px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
    </>
  );
}

function GradientWash() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(160deg, transparent 20%, rgba(3,26,63,0.04) 60%, rgba(3,26,63,0.14) 100%)",
        pointerEvents: "none",
      }}
    />
  );
}

function BlueprintGrid() {
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, opacity: 0.5 }}
      aria-hidden
    >
      <defs>
        <pattern id="bp" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="var(--primary-fixed-dim)"
            strokeOpacity="0.5"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bp)" />
    </svg>
  );
}

function FloatingBoard() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(640px, 92%)",
          aspectRatio: "4 / 3",
          transform: "perspective(1400px) rotateY(-14deg) rotateX(8deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Back plate */}
        <div
          className="surface-well"
          style={{
            position: "absolute",
            inset: "6% -4% -6% 4%",
            background: "var(--surface-container)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-editorial)",
            transform: "translateZ(-60px)",
          }}
        />

        {/* Main board panel */}
        <div
          className="surface-card"
          style={{
            position: "absolute",
            inset: 0,
            padding: 22,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
            boxShadow: "var(--shadow-float)",
            border: "1px solid var(--ghost-border)",
            background: "var(--surface-lowest)",
            transformStyle: "preserve-3d",
          }}
        >
          <Column
            label="Backlog"
            dot="var(--on-surface-muted)"
            cards={[
              { title: "Facade load test", chip: "A-01", accent: false },
              { title: "Kinetic map audit", chip: "DEP", accent: false },
            ]}
          />
          <Column
            label="In Motion"
            dot="var(--primary-tint)"
            cards={[
              { title: "Pulse view v2", chip: "PULSE", accent: true },
              { title: "Bench sync stream", chip: "LIVE", accent: false },
              { title: "Ledger rewrite", chip: "LEDGER", accent: false },
            ]}
          />
          <Column
            label="Certified"
            dot="var(--secondary)"
            cards={[
              { title: "Drag & drop engine", chip: "CORE", accent: false },
              { title: "Forensic history", chip: "AUDIT", accent: false },
            ]}
          />
        </div>

        {/* Floating metric card */}
        <div
          className="glass-white"
          style={{
            position: "absolute",
            bottom: "-8%",
            left: "-6%",
            padding: 18,
            borderRadius: "var(--radius-lg)",
            minWidth: 220,
            boxShadow: "var(--shadow-float)",
            border: "1px solid var(--ghost-border)",
            transform: "translateZ(80px)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--on-surface-subtle)",
              marginBottom: 8,
            }}
          >
            Throughput
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--on-primary-fixed)",
                lineHeight: 1,
              }}
            >
              +24.6%
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--success)",
                fontWeight: 700,
              }}
            >
              ▲ wk
            </div>
          </div>
          <svg width="100%" height="34" viewBox="0 0 200 34">
            <path
              d="M0 26 L20 22 L40 24 L60 14 L80 18 L100 10 L120 14 L140 6 L160 12 L180 4 L200 8"
              fill="none"
              stroke="var(--secondary)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Floating sync chip */}
        <div
          style={{
            position: "absolute",
            top: "-4%",
            right: "-4%",
            padding: "10px 14px",
            borderRadius: 999,
            background: "var(--primary)",
            color: "var(--on-primary)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "var(--shadow-float)",
            transform: "translateZ(120px)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--secondary-bright)",
              boxShadow: "0 0 0 4px rgba(227,34,33,0.2)",
            }}
          />
          Live Sync · 4 benches
        </div>
      </div>
    </div>
  );
}

function Column({
  label,
  dot,
  cards,
}: {
  label: string;
  dot: string;
  cards: { title: string; chip: string; accent: boolean }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--on-surface-variant)",
          paddingBottom: 6,
          borderBottom: "1px solid var(--ghost-border)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: dot,
          }}
        />
        {label}
      </div>
      {cards.map((c) => (
        <div
          key={c.title}
          style={{
            background: "var(--surface-lowest)",
            borderRadius: "var(--radius-md)",
            padding: "10px 12px",
            boxShadow: "var(--shadow-editorial)",
            border: "1px solid var(--ghost-border)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {c.accent ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                background: "var(--secondary)",
              }}
            />
          ) : null}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--on-surface-subtle)",
            }}
          >
            {c.chip}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--on-primary-fixed)",
              lineHeight: 1.3,
            }}
          >
            {c.title}
          </div>
          <div
            style={{
              height: 3,
              borderRadius: 999,
              background: "var(--surface-high)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: c.accent ? "72%" : "38%",
                background: c.accent
                  ? "var(--secondary)"
                  : "var(--primary-tint)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
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

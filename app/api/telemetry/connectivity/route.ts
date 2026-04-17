import { NextResponse, type NextRequest } from "next/server";

/**
 * Connectivity-failure beacon. Called via navigator.sendBeacon() from the
 * client when a user's browser can't reach Supabase. The request lands on
 * Vercel (different hostname than Supabase), so it still works in the very
 * scenario we're trying to observe.
 *
 * Writes are best-effort: we log to Vercel logs (console.log is captured)
 * and never fail — telemetry must not turn into its own user-visible bug.
 */

export const runtime = "nodejs";

const MAX_BODY_BYTES = 2_048;

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }
    const payload = safeParse(raw);

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0]?.trim() : null;

    // Vercel log captures structured JSON nicely — keep it one-line.
    console.warn(
      "[telemetry:connectivity]",
      JSON.stringify({
        ...payload,
        ip: ip ?? undefined,
        received_at: new Date().toISOString(),
      }),
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 204 });
  }
}

function safeParse(text: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return { raw: text.slice(0, 200) };
}

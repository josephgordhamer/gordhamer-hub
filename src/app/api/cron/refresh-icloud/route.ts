import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { fetchEvents, type ICloudCredentials } from "@/lib/icloud";

// Vercel cron hits this hourly. Refreshes every connected iCloud calendar.
// Uses service role to bypass RLS (so we can iterate all connections).
export const dynamic = "force-dynamic";

const SYNC_DAYS_BACK = 30;
const SYNC_DAYS_FORWARD = 365;

export async function GET(request: Request) {
  // Vercel sets x-vercel-cron-signature in cron requests; we also accept a manual token.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createServerClient(url, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  const { data: connections } = await supabase
    .from("icloud_connections")
    .select("*");

  const results: Array<{ id: string; ok: boolean; count?: number; error?: string }> = [];

  for (const conn of connections ?? []) {
    if (!conn.default_calendar_url) continue;
    const creds: ICloudCredentials = {
      appleId: conn.apple_id,
      appPasswordEncrypted: conn.app_password_encrypted,
    };
    try {
      const now = new Date();
      const back = new Date(now);
      back.setDate(back.getDate() - SYNC_DAYS_BACK);
      const forward = new Date(now);
      forward.setDate(forward.getDate() + SYNC_DAYS_FORWARD);

      const events = await fetchEvents(
        creds,
        conn.default_calendar_url,
        back.toISOString(),
        forward.toISOString(),
      );

      await supabase.from("subscribed_events").delete().eq("connection_id", conn.id);

      if (events.length > 0) {
        const rows = events.map((e) => ({
          connection_id: conn.id,
          uid: e.uid,
          caldav_url: e.caldav_url,
          etag: e.etag,
          summary: e.summary,
          description: e.description,
          location: e.location,
          start_at: e.start_at,
          end_at: e.end_at,
          all_day: e.all_day,
          is_recurring: e.is_recurring,
          rrule: e.rrule,
          raw_ical: e.raw_ical,
        }));
        for (let i = 0; i < rows.length; i += 200) {
          await supabase.from("subscribed_events").insert(rows.slice(i, i + 200));
        }
      }

      await supabase
        .from("icloud_connections")
        .update({ last_synced_at: new Date().toISOString(), last_error: null })
        .eq("id", conn.id);
      results.push({ id: conn.id, ok: true, count: events.length });
    } catch (e: unknown) {
      const error = (e as Error)?.message ?? "unknown";
      await supabase
        .from("icloud_connections")
        .update({ last_error: error })
        .eq("id", conn.id);
      results.push({ id: conn.id, ok: false, error });
    }
  }
  return NextResponse.json({ ran: true, results });
}

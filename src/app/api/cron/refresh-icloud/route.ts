import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { fetchEvents, type ICloudCredentials } from "@/lib/icloud";

// Vercel cron hits this hourly. Refreshes every iCloud calendar on every
// connection (regardless of the per-calendar enabled flag — that flag is now
// a display filter only). Uses service role to bypass RLS so we can iterate
// across all profiles.
export const dynamic = "force-dynamic";

const SYNC_DAYS_BACK = 30;
const SYNC_DAYS_FORWARD = 365;

export async function GET(request: Request) {
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

  const results: Array<{ id: string; ok: boolean; count?: number; errors?: string[] }> = [];

  for (const conn of connections ?? []) {
    const creds: ICloudCredentials = {
      appleId: conn.apple_id,
      appPasswordEncrypted: conn.app_password_encrypted,
    };

    const { data: cals } = await supabase
      .from("icloud_calendars")
      .select("id, caldav_url, display_name")
      .eq("connection_id", conn.id);

    if (!cals || cals.length === 0) {
      results.push({ id: conn.id, ok: false, errors: ["no calendars on this connection"] });
      continue;
    }

    const now = new Date();
    const back = new Date(now);
    back.setDate(back.getDate() - SYNC_DAYS_BACK);
    const forward = new Date(now);
    forward.setDate(forward.getDate() + SYNC_DAYS_FORWARD);

    let total = 0;
    const errors: string[] = [];

    for (const cal of cals) {
      try {
        const events = await fetchEvents(
          creds,
          cal.caldav_url,
          back.toISOString(),
          forward.toISOString(),
        );
        await supabase
          .from("subscribed_events")
          .delete()
          .eq("icloud_calendar_id", cal.id);
        if (events.length > 0) {
          // Dedupe by UID — shared/family calendars can return duplicates.
          const seen = new Set<string>();
          const deduped = events.filter((e) => {
            if (seen.has(e.uid)) return false;
            seen.add(e.uid);
            return true;
          });
          const rows = deduped.map((e) => ({
            connection_id: conn.id,
            icloud_calendar_id: cal.id,
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
            await supabase
              .from("subscribed_events")
              .upsert(rows.slice(i, i + 200), { onConflict: "connection_id,uid" });
          }
          total += deduped.length;
        }
      } catch (e: unknown) {
        const msg = (e as Error)?.message ?? String(e);
        errors.push(`${cal.display_name}: ${msg}`);
      }
    }

    await supabase
      .from("icloud_connections")
      .update({
        last_synced_at: new Date().toISOString(),
        last_error: errors.length > 0 ? errors.join(" | ").slice(0, 500) : null,
      })
      .eq("id", conn.id);
    results.push({
      id: conn.id,
      ok: errors.length === 0,
      count: total,
      errors: errors.length > 0 ? errors : undefined,
    });
  }
  return NextResponse.json({ ran: true, results });
}

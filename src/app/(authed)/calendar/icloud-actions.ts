"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto";
import {
  fetchEvents,
  listCalendars,
  upsertEvent as icloudUpsert,
  updateEventAt as icloudUpdate,
  deleteEvent as icloudDelete,
  type ICloudCredentials,
} from "@/lib/icloud";

const SYNC_WINDOW_DAYS_BACK = 30;
const SYNC_WINDOW_DAYS_FORWARD = 365;

const COLOR_PALETTE = [
  "#4a7080", // slate
  "#b8924a", // gold
  "#5d6d4a", // sage
  "#732d3b", // burgundy
  "#6b4e7a", // plum
  "#1f2c4a", // navy
  "#a07b1f", // amber
  "#4a4a4a", // graphite
];

export async function connectICloud(input: {
  appleId: string;
  appPassword: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const encrypted = encryptSecret(input.appPassword);
  let calendars;
  try {
    calendars = await listCalendars({
      appleId: input.appleId,
      appPasswordEncrypted: encrypted,
    });
  } catch (e: unknown) {
    return {
      ok: false,
      error:
        "Couldn't connect to iCloud. Check that the email is your Apple ID and the password is an app-specific password (not your normal Apple password). " +
        ((e as Error)?.message ?? ""),
    };
  }
  if (calendars.length === 0) {
    return { ok: false, error: "Connected, but no calendars found." };
  }

  // Upsert the connection (no default calendar — user picks)
  const { data: conn } = await supabase
    .from("icloud_connections")
    .upsert(
      {
        profile_id: user.id,
        apple_id: input.appleId,
        app_password_encrypted: encrypted,
      },
      { onConflict: "profile_id" },
    )
    .select("id")
    .single();

  if (conn) {
    // Pre-populate the icloud_calendars rows so the UI can show all options
    for (let i = 0; i < calendars.length; i++) {
      const cal = calendars[i];
      await supabase.from("icloud_calendars").upsert(
        {
          connection_id: conn.id,
          caldav_url: cal.url,
          display_name: cal.displayName,
          color: COLOR_PALETTE[i % COLOR_PALETTE.length],
          enabled: false,
          is_default_for_writes: false,
          position: i,
        },
        { onConflict: "connection_id,caldav_url" },
      );
    }
  }

  revalidatePath("/calendar");
  return { ok: true, calendars };
}

export async function disconnectICloud() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("icloud_connections").delete().eq("profile_id", user.id);
  revalidatePath("/calendar");
}

// Re-fetch the calendar list from iCloud and upsert any new ones into our
// icloud_calendars table, preserving enabled / color / default-for-writes
// flags on calendars that are already there.
export async function refreshCalendarList() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { data: conn } = await supabase
    .from("icloud_connections")
    .select("id, apple_id, app_password_encrypted")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!conn) return { ok: false as const, error: "iCloud isn't connected." };

  let calendars;
  try {
    calendars = await listCalendars({
      appleId: conn.apple_id,
      appPasswordEncrypted: conn.app_password_encrypted,
    });
  } catch (e: unknown) {
    return { ok: false as const, error: (e as Error)?.message ?? "fetch failed" };
  }

  // Existing rows so we can avoid clobbering the user's choices.
  const { data: existing } = await supabase
    .from("icloud_calendars")
    .select("id, caldav_url, position")
    .eq("connection_id", conn.id);
  const existingByUrl = new Map(
    (existing ?? []).map((r) => [r.caldav_url, r] as const),
  );
  const maxPos = (existing ?? []).reduce((m, r) => Math.max(m, r.position ?? 0), -1);

  let added = 0;
  let nextPos = maxPos + 1;
  for (const cal of calendars) {
    if (existingByUrl.has(cal.url)) {
      // Keep the existing row's flags, just refresh the display name.
      await supabase
        .from("icloud_calendars")
        .update({ display_name: cal.displayName })
        .eq("connection_id", conn.id)
        .eq("caldav_url", cal.url);
      continue;
    }
    await supabase.from("icloud_calendars").insert({
      connection_id: conn.id,
      caldav_url: cal.url,
      display_name: cal.displayName,
      color: COLOR_PALETTE[nextPos % COLOR_PALETTE.length],
      enabled: false,
      is_default_for_writes: false,
      position: nextPos,
    });
    nextPos += 1;
    added += 1;
  }

  revalidatePath("/calendar");
  return { ok: true as const, total: calendars.length, added };
}

export async function listMyCalendars() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  const { data: conn } = await supabase
    .from("icloud_connections")
    .select("apple_id, app_password_encrypted")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!conn) return { ok: false as const, error: "iCloud isn't connected." };
  try {
    const calendars = await listCalendars({
      appleId: conn.apple_id,
      appPasswordEncrypted: conn.app_password_encrypted,
    });
    return { ok: true as const, calendars };
  } catch (e: unknown) {
    return { ok: false as const, error: (e as Error)?.message ?? "fetch failed" };
  }
}

// Toggle a single calendar enabled/disabled. The "enabled" flag is now a
// display filter — events from ALL calendars are still cached, so toggling is
// instant and doesn't require a re-sync to see events come back.
export async function toggleCalendar(id: string, enabled: boolean) {
  const supabase = createClient();
  await supabase.from("icloud_calendars").update({ enabled }).eq("id", id);
  revalidatePath("/calendar");
}

export async function setDefaultWriteCalendar(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: cal } = await supabase
    .from("icloud_calendars")
    .select("connection_id")
    .eq("id", id)
    .maybeSingle();
  if (!cal) return;
  // Clear other defaults on the same connection, then set this one
  await supabase
    .from("icloud_calendars")
    .update({ is_default_for_writes: false })
    .eq("connection_id", cal.connection_id);
  await supabase
    .from("icloud_calendars")
    .update({ is_default_for_writes: true })
    .eq("id", id);
  // Mirror to the connection row for legacy reads
  const { data: chosen } = await supabase
    .from("icloud_calendars")
    .select("caldav_url, display_name")
    .eq("id", id)
    .maybeSingle();
  if (chosen) {
    await supabase
      .from("icloud_connections")
      .update({
        default_calendar_url: chosen.caldav_url,
        default_calendar_name: chosen.display_name,
      })
      .eq("id", cal.connection_id);
  }
  revalidatePath("/calendar");
}

export async function setCalendarColor(id: string, color: string) {
  const supabase = createClient();
  await supabase.from("icloud_calendars").update({ color }).eq("id", id);
  revalidatePath("/calendar");
}

export async function refreshICloudEvents() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { data: conn } = await supabase
    .from("icloud_connections")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!conn) return { ok: false as const, error: "iCloud isn't connected." };

  // Pull events from ALL calendars on this connection — the user's enabled/disabled
  // flag is a UI filter, not a fetch filter. This way, ticking a calendar shows
  // its events instantly (no re-sync required).
  const { data: cals } = await supabase
    .from("icloud_calendars")
    .select("*")
    .eq("connection_id", conn.id);
  if (!cals || cals.length === 0) {
    return { ok: false as const, error: "No calendars on this connection. Click Re-fetch list to discover them." };
  }

  const creds: ICloudCredentials = {
    appleId: conn.apple_id,
    appPasswordEncrypted: conn.app_password_encrypted,
  };

  const now = new Date();
  const back = new Date(now);
  back.setDate(back.getDate() - SYNC_WINDOW_DAYS_BACK);
  const forward = new Date(now);
  forward.setDate(forward.getDate() + SYNC_WINDOW_DAYS_FORWARD);

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
      // Replace events for THIS calendar only
      await supabase
        .from("subscribed_events")
        .delete()
        .eq("icloud_calendar_id", cal.id);
      if (events.length > 0) {
        const rows = events.map((e) => ({
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
          const { error: insErr } = await supabase
            .from("subscribed_events")
            .insert(rows.slice(i, i + 200));
          if (insErr) {
            errors.push(`${cal.display_name}: insert failed — ${insErr.message}`);
            console.error("subscribed_events insert error:", insErr);
          }
        }
      }
      total += events.length;
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? String(e);
      errors.push(`${cal.display_name}: ${msg}`);
      console.error(`Sync error for ${cal.display_name}:`, e);
    }
  }

  await supabase
    .from("icloud_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      last_error: errors.length > 0 ? errors.join(" | ").slice(0, 500) : null,
    })
    .eq("id", conn.id);

  revalidatePath("/calendar");
  revalidatePath("/home");
  if (errors.length > 0) {
    return {
      ok: false as const,
      error: `Synced ${total} events, but had ${errors.length} error${errors.length === 1 ? "" : "s"}: ${errors.join(" | ").slice(0, 400)}`,
    };
  }
  return { ok: true as const, count: total };
}

// Push a hub-side event to iCloud. If `targetCalendarId` is provided, that
// calendar is used; otherwise we fall back to the default-for-writes calendar.
export async function pushEventToICloud(input: {
  source: "calendar_item" | "event";
  source_id: string;
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  startIso: string;
  endIso?: string | null;
  allDay?: boolean;
  targetCalendarId?: string | null;
}): Promise<{ ok: boolean; reason?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "not_signed_in" };

  const { data: conn } = await supabase
    .from("icloud_connections")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!conn) return { ok: false, reason: "no_connection" };

  // Pick target calendar: explicit override first, then default-for-writes.
  let writeCal: { id: string; caldav_url: string; display_name: string } | null = null;
  if (input.targetCalendarId) {
    const { data } = await supabase
      .from("icloud_calendars")
      .select("id, caldav_url, display_name")
      .eq("connection_id", conn.id)
      .eq("id", input.targetCalendarId)
      .maybeSingle();
    writeCal = data ?? null;
  }
  if (!writeCal) {
    const { data } = await supabase
      .from("icloud_calendars")
      .select("id, caldav_url, display_name")
      .eq("connection_id", conn.id)
      .eq("is_default_for_writes", true)
      .maybeSingle();
    writeCal = data ?? null;
  }
  if (!writeCal) {
    await supabase
      .from("icloud_connections")
      .update({ last_error: "No default-for-writes calendar selected. Click ★ Make default on one calendar." })
      .eq("id", conn.id);
    return { ok: false, reason: "no_default_calendar" };
  }

  try {
    const result = await icloudUpsert(
      {
        appleId: conn.apple_id,
        appPasswordEncrypted: conn.app_password_encrypted,
      },
      writeCal.caldav_url,
      {
        uid: input.uid,
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: new Date(input.startIso),
        end: input.endIso ? new Date(input.endIso) : null,
        allDay: input.allDay,
      },
    );
    await supabase.from("subscribed_events").upsert(
      {
        connection_id: conn.id,
        icloud_calendar_id: writeCal.id,
        uid: input.uid,
        caldav_url: result.url,
        etag: result.etag,
        summary: input.summary,
        description: input.description ?? null,
        location: input.location ?? null,
        start_at: input.startIso,
        end_at: input.endIso ?? null,
        all_day: input.allDay ?? false,
        is_recurring: false,
        rrule: null,
        raw_ical: null,
        source_event_id: input.source === "event" ? input.source_id : null,
        source_calendar_item_id: input.source === "calendar_item" ? input.source_id : null,
      },
      { onConflict: "connection_id,uid" },
    );
    // Clear last_error on success
    await supabase
      .from("icloud_connections")
      .update({ last_error: null })
      .eq("id", conn.id);
    return { ok: true };
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? "iCloud push failed";
    await supabase
      .from("icloud_connections")
      .update({ last_error: `Push failed: ${msg.slice(0, 300)}` })
      .eq("id", conn.id);
    console.error("pushEventToICloud failed:", msg);
    return { ok: false, reason: "icloud_error", error: msg };
  }
}

// Edit an existing iCloud event (CalDAV PUT to its url).
export async function updateICloudEvent(input: {
  cached_event_id: string;
  summary: string;
  description?: string;
  location?: string;
  startIso: string;
  endIso?: string | null;
  allDay?: boolean;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: ev } = await supabase
    .from("subscribed_events")
    .select("*")
    .eq("id", input.cached_event_id)
    .maybeSingle();
  if (!ev) return { ok: false, error: "Event not found" };
  if (!ev.caldav_url) return { ok: false, error: "Event has no CalDAV URL" };

  // We can't safely overwrite the recurring master without preserving RRULE / EXDATE.
  // Defer that to a future commit; for now refuse with a clear message.
  if (ev.is_recurring) {
    return {
      ok: false,
      error:
        "This is a recurring event. Editing the whole series isn't supported yet — please edit it on your iPhone, then click ↻ Refresh here.",
    };
  }

  const { data: conn } = await supabase
    .from("icloud_connections")
    .select("*")
    .eq("id", ev.connection_id)
    .maybeSingle();
  if (!conn) return { ok: false, error: "Connection missing" };

  const masterUid = ev.uid.split("::")[0];

  try {
    const result = await icloudUpdate(
      {
        appleId: conn.apple_id,
        appPasswordEncrypted: conn.app_password_encrypted,
      },
      ev.caldav_url,
      ev.etag,
      {
        uid: masterUid,
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: new Date(input.startIso),
        end: input.endIso ? new Date(input.endIso) : null,
        allDay: input.allDay,
      },
    );
    await supabase
      .from("subscribed_events")
      .update({
        summary: input.summary,
        description: input.description ?? null,
        location: input.location ?? null,
        start_at: input.startIso,
        end_at: input.endIso ?? null,
        all_day: input.allDay ?? false,
        etag: result.etag,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ev.id);
    revalidatePath("/calendar");
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error)?.message };
  }
}

export async function deleteICloudEvent(cached_event_id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: ev } = await supabase
    .from("subscribed_events")
    .select("*")
    .eq("id", cached_event_id)
    .maybeSingle();
  if (!ev || !ev.caldav_url) return { ok: false, error: "Event missing or has no URL" };

  const { data: conn } = await supabase
    .from("icloud_connections")
    .select("*")
    .eq("id", ev.connection_id)
    .maybeSingle();
  if (!conn) return { ok: false, error: "Connection missing" };

  try {
    await icloudDelete(
      {
        appleId: conn.apple_id,
        appPasswordEncrypted: conn.app_password_encrypted,
      },
      ev.caldav_url,
      ev.etag,
    );
    // Delete all rows for this UID (handles recurring expansions)
    const baseUid = ev.uid.split("::")[0];
    await supabase
      .from("subscribed_events")
      .delete()
      .eq("connection_id", ev.connection_id)
      .or(`uid.eq.${baseUid},uid.like.${baseUid}::%`);
    revalidatePath("/calendar");
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error)?.message };
  }
}

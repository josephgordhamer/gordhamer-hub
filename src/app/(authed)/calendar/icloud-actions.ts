"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto";
import {
  fetchEvents,
  listCalendars,
  upsertEvent as icloudUpsert,
  deleteEvent as icloudDelete,
  type ICloudCredentials,
} from "@/lib/icloud";

const SYNC_WINDOW_DAYS_BACK = 30;
const SYNC_WINDOW_DAYS_FORWARD = 365;

export async function connectICloud(input: {
  appleId: string;
  appPassword: string;
  defaultCalendarName?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Try to log in & list calendars to validate the credentials.
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

  // Pick the calendar by name if provided, else the first.
  const target =
    (input.defaultCalendarName &&
      calendars.find(
        (c) => c.displayName.toLowerCase() === input.defaultCalendarName!.toLowerCase(),
      )) ||
    calendars[0];

  // Upsert the connection
  await supabase.from("icloud_connections").upsert(
    {
      profile_id: user.id,
      apple_id: input.appleId,
      app_password_encrypted: encrypted,
      default_calendar_url: target.url,
      default_calendar_name: target.displayName,
    },
    { onConflict: "profile_id" },
  );

  revalidatePath("/calendar");
  return { ok: true, calendars };
}

// Returns the list of calendars available on iCloud for the signed-in user's connection.
export async function listMyCalendars(): Promise<
  { ok: true; calendars: { url: string; displayName: string }[] } | { ok: false; error: string }
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const { data: conn } = await supabase
    .from("icloud_connections")
    .select("apple_id, app_password_encrypted")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!conn) return { ok: false, error: "iCloud isn't connected." };
  try {
    const calendars = await listCalendars({
      appleId: conn.apple_id,
      appPasswordEncrypted: conn.app_password_encrypted,
    });
    return { ok: true, calendars: calendars.map((c) => ({ url: c.url, displayName: c.displayName })) };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error)?.message ?? "fetch failed" };
  }
}

export async function disconnectICloud() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("icloud_connections").delete().eq("profile_id", user.id);
  revalidatePath("/calendar");
}

export async function setDefaultCalendar(url: string, name: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("icloud_connections")
    .update({ default_calendar_url: url, default_calendar_name: name })
    .eq("profile_id", user.id);
  revalidatePath("/calendar");
}

export async function refreshICloudEvents() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: conn } = await supabase
    .from("icloud_connections")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!conn) return { ok: false, error: "iCloud isn't connected." };
  if (!conn.default_calendar_url) return { ok: false, error: "No default calendar set." };

  const creds: ICloudCredentials = {
    appleId: conn.apple_id,
    appPasswordEncrypted: conn.app_password_encrypted,
  };

  const now = new Date();
  const back = new Date(now);
  back.setDate(back.getDate() - SYNC_WINDOW_DAYS_BACK);
  const forward = new Date(now);
  forward.setDate(forward.getDate() + SYNC_WINDOW_DAYS_FORWARD);

  let events;
  try {
    events = await fetchEvents(
      creds,
      conn.default_calendar_url,
      back.toISOString(),
      forward.toISOString(),
    );
  } catch (e: unknown) {
    await supabase
      .from("icloud_connections")
      .update({ last_error: (e as Error)?.message ?? "fetch failed" })
      .eq("id", conn.id);
    return { ok: false, error: "iCloud fetch failed: " + ((e as Error)?.message ?? "") };
  }

  // Replace cached events for this connection in the window.
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
    // chunk to 200 to avoid request limits
    for (let i = 0; i < rows.length; i += 200) {
      await supabase.from("subscribed_events").insert(rows.slice(i, i + 200));
    }
  }

  await supabase
    .from("icloud_connections")
    .update({ last_synced_at: new Date().toISOString(), last_error: null })
    .eq("id", conn.id);

  revalidatePath("/calendar");
  revalidatePath("/home");
  return { ok: true, count: events.length };
}

// Push a hub-side event to iCloud. Used by the calendar item / event creation flows.
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
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: conn } = await supabase
    .from("icloud_connections")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!conn || !conn.default_calendar_url) return { ok: false, reason: "no_connection" };

  try {
    const result = await icloudUpsert(
      {
        appleId: conn.apple_id,
        appPasswordEncrypted: conn.app_password_encrypted,
      },
      conn.default_calendar_url,
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
    // Cache it locally too, linked to the source row.
    await supabase.from("subscribed_events").upsert(
      {
        connection_id: conn.id,
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
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error)?.message };
  }
}

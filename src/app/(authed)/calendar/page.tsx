import { createClient } from "@/lib/supabase/server";
import type { CalendarItem, FamilyEvent, FamilyMember } from "@/lib/types";
import { CalendarClient } from "./CalendarClient";
import { ICloudPanel } from "./ICloudPanel";

export interface ICloudCalendarRow {
  id: string;
  caldav_url: string;
  display_name: string;
  color: string;
  enabled: boolean;
  is_default_for_writes: boolean;
}

export interface SubscribedEvent {
  id: string;
  uid: string;
  summary: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  is_recurring: boolean;
  icloud_calendar_id: string | null;
  caldav_url: string | null;
}

export default async function CalendarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [eventsRes, familyRes, itemsRes, connRes, calsRes, subRes] = await Promise.all([
    supabase.from("events").select("*").is("deleted_at", null),
    supabase.from("family_members").select("*").is("deleted_at", null),
    supabase
      .from("calendar_items")
      .select("id, name, date, start_at, end_at, all_day, location, description, icloud_calendar_id")
      .is("deleted_at", null),
    user
      ? supabase
          .from("icloud_connections")
          .select("id, apple_id, last_synced_at, last_error")
          .eq("profile_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("icloud_calendars")
          .select("id, caldav_url, display_name, color, enabled, is_default_for_writes")
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] as ICloudCalendarRow[] }),
    supabase
      .from("subscribed_events")
      .select("id, uid, summary, description, location, start_at, end_at, all_day, is_recurring, icloud_calendar_id, caldav_url"),
  ]);

  return (
    <>
      <h2 className="section-title">Family Calendar</h2>
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 22 }}>
        Family events, calendar items, birthdays, and your iCloud calendars — all in one place.
      </p>
      <ICloudPanel
        connection={connRes.data ?? null}
        calendars={(calsRes.data ?? []) as ICloudCalendarRow[]}
      />
      <CalendarClient
        events={(eventsRes.data ?? []) as FamilyEvent[]}
        family={(familyRes.data ?? []) as FamilyMember[]}
        calendarItems={(itemsRes.data ?? []) as CalendarItem[]}
        subscribedEvents={(subRes.data ?? []) as SubscribedEvent[]}
        icloudCalendars={(calsRes.data ?? []) as ICloudCalendarRow[]}
      />
    </>
  );
}

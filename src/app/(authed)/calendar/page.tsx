import { createClient } from "@/lib/supabase/server";
import type { CalendarItem, FamilyEvent, FamilyMember } from "@/lib/types";
import { CalendarClient } from "./CalendarClient";
import { ICloudPanel } from "./ICloudPanel";

interface SubscribedEvent {
  id: string;
  uid: string;
  summary: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  is_recurring: boolean;
  location: string | null;
}

export default async function CalendarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [eventsRes, familyRes, itemsRes, connRes, subRes] = await Promise.all([
    supabase.from("events").select("*").is("deleted_at", null),
    supabase.from("family_members").select("*").is("deleted_at", null),
    supabase.from("calendar_items").select("*").is("deleted_at", null),
    user
      ? supabase
          .from("icloud_connections")
          .select("id, apple_id, default_calendar_name, last_synced_at, last_error")
          .eq("profile_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("subscribed_events")
      .select("id, uid, summary, start_at, end_at, all_day, is_recurring, location"),
  ]);

  return (
    <>
      <h2 className="section-title">Family Calendar</h2>
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 22 }}>
        Family events, calendar items, birthdays, and your iCloud calendar — all in one place.
      </p>
      <ICloudPanel connection={connRes.data ?? null} />
      <CalendarClient
        events={(eventsRes.data ?? []) as FamilyEvent[]}
        family={(familyRes.data ?? []) as FamilyMember[]}
        calendarItems={(itemsRes.data ?? []) as CalendarItem[]}
        subscribedEvents={(subRes.data ?? []) as SubscribedEvent[]}
      />
    </>
  );
}

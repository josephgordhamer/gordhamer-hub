import { createClient } from "@/lib/supabase/server";
import type { CalendarItem, FamilyEvent, FamilyMember } from "@/lib/types";
import { CalendarClient } from "./CalendarClient";

export default async function CalendarPage() {
  const supabase = createClient();
  const [eventsRes, familyRes, itemsRes] = await Promise.all([
    supabase.from("events").select("*").is("deleted_at", null),
    supabase.from("family_members").select("*").is("deleted_at", null),
    supabase.from("calendar_items").select("*").is("deleted_at", null),
  ]);

  return (
    <>
      <h2 className="section-title">Family Calendar</h2>
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 22 }}>
        A view of upcoming events. Apple Calendar sync coming once we move to the web.
      </p>
      <CalendarClient
        events={(eventsRes.data ?? []) as FamilyEvent[]}
        family={(familyRes.data ?? []) as FamilyMember[]}
        calendarItems={(itemsRes.data ?? []) as CalendarItem[]}
      />
    </>
  );
}

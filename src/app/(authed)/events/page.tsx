import { createClient } from "@/lib/supabase/server";
import type { FamilyEvent, EventTask, FamilyMember } from "@/lib/types";
import { EventsClient } from "./EventsClient";

export default async function EventsPage() {
  const supabase = createClient();
  const [eventsRes, tasksRes, familyRes] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .is("deleted_at", null)
      .order("date", { ascending: true, nullsFirst: false }),
    supabase
      .from("event_tasks")
      .select("*")
      .is("deleted_at", null)
      .order("position", { ascending: true }),
    supabase
      .from("family_members")
      .select("*")
      .is("deleted_at", null)
      .order("position", { ascending: true }),
  ]);

  const events = (eventsRes.data ?? []) as FamilyEvent[];
  const tasks = (tasksRes.data ?? []) as EventTask[];
  const family = (familyRes.data ?? []) as FamilyMember[];

  const tasksByEvent: Record<string, EventTask[]> = {};
  tasks.forEach((t) => {
    if (!tasksByEvent[t.event_id]) tasksByEvent[t.event_id] = [];
    tasksByEvent[t.event_id].push(t);
  });

  return (
    <>
      <h2 className="section-title">Family Events</h2>
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 22 }}>
        Plan together, celebrate together.
      </p>
      <EventsClient events={events} tasksByEvent={tasksByEvent} family={family} />
    </>
  );
}

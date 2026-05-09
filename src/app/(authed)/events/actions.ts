"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createEvent(name: string, date: string | null) {
  const supabase = createClient();
  await supabase.from("events").insert({ name, date });
  revalidatePath("/events");
  revalidatePath("/calendar");
  revalidatePath("/home");
}

export async function deleteEvent(id: string) {
  const supabase = createClient();
  await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/events");
  revalidatePath("/calendar");
  revalidatePath("/home");
}

export async function addTask(
  eventId: string,
  name: string,
  assignee: string | null,
  parentId: string | null,
) {
  const supabase = createClient();
  await supabase
    .from("event_tasks")
    .insert({ event_id: eventId, name, assignee, parent_task_id: parentId });
  revalidatePath("/events");
}

export async function toggleTask(taskId: string, done: boolean) {
  const supabase = createClient();
  await supabase.from("event_tasks").update({ done }).eq("id", taskId);
  revalidatePath("/events");
}

export async function deleteTask(taskId: string) {
  const supabase = createClient();
  // Also delete subtasks
  await supabase.from("event_tasks").delete().eq("parent_task_id", taskId);
  await supabase.from("event_tasks").delete().eq("id", taskId);
  revalidatePath("/events");
}

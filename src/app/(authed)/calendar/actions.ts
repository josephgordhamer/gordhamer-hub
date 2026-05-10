"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCalendarItem(name: string, date: string) {
  const supabase = createClient();
  await supabase.from("calendar_items").insert({ name, date });
  revalidatePath("/calendar");
  revalidatePath("/home");
}

export async function deleteCalendarItem(id: string) {
  const supabase = createClient();
  await supabase
    .from("calendar_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/calendar");
  revalidatePath("/home");
}

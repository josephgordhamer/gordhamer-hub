"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addReadingDay(day: string, passage: string) {
  const supabase = createClient();
  const { count } = await supabase.from("scripture_plan").select("*", { count: "exact", head: true });
  await supabase.from("scripture_plan").insert({ day, passage, position: count ?? 0 });
  revalidatePath("/scripture");
}

export async function removeReadingDay(id: string) {
  const supabase = createClient();
  await supabase.from("scripture_plan").delete().eq("id", id);
  revalidatePath("/scripture");
}

export async function postDiscussion(author: string, message: string) {
  const supabase = createClient();
  await supabase.from("discussions").insert({ author, message });
  revalidatePath("/scripture");
}

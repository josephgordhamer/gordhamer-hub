"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addResource(input: {
  title: string;
  category: string;
  url: string;
  shared_by: string;
  notes: string;
}) {
  const supabase = createClient();
  await supabase.from("resources").insert({
    title: input.title,
    category: input.category || null,
    url: input.url || null,
    shared_by: input.shared_by || null,
    notes: input.notes || null,
  });
  revalidatePath("/resources");
}

export async function deleteResource(id: string) {
  const supabase = createClient();
  await supabase
    .from("resources")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/resources");
}

"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pushEventToICloud } from "./icloud-actions";

export async function createCalendarItem(name: string, date: string) {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("calendar_items")
    .insert({ name, date })
    .select("id")
    .single();
  // Best-effort push to iCloud (no-op if not connected).
  if (row) {
    const uid = `gordhamer-hub-item-${row.id}@gordhamer-hub.vercel.app`;
    const startIso = new Date(date + "T00:00:00").toISOString();
    const endDate = new Date(date + "T00:00:00");
    endDate.setDate(endDate.getDate() + 1);
    const endIso = endDate.toISOString();
    await pushEventToICloud({
      source: "calendar_item",
      source_id: row.id,
      uid,
      summary: name,
      startIso,
      endIso,
      allDay: true,
    });
  }
  revalidatePath("/calendar");
  revalidatePath("/home");
}

export async function updateCalendarItem(id: string, name: string, date: string) {
  const supabase = createClient();
  await supabase.from("calendar_items").update({ name, date }).eq("id", id);

  // If we're connected to iCloud and this item was previously pushed, push the update too.
  // The UID we used at create time is deterministic from the row id.
  const uid = `gordhamer-hub-item-${id}@gordhamer-hub.vercel.app`;
  const startIso = new Date(date + "T00:00:00").toISOString();
  const endDate = new Date(date + "T00:00:00");
  endDate.setDate(endDate.getDate() + 1);
  const endIso = endDate.toISOString();
  await pushEventToICloud({
    source: "calendar_item",
    source_id: id,
    uid,
    summary: name,
    startIso,
    endIso,
    allDay: true,
  });
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

// silence unused crypto import lint when build-time only
void crypto;

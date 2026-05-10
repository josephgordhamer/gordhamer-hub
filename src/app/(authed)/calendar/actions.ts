"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pushEventToICloud } from "./icloud-actions";

export async function createCalendarItem(name: string, date: string) {
  const supabase = createClient();
  const { data: row, error: insertErr } = await supabase
    .from("calendar_items")
    .insert({ name, date })
    .select("id")
    .single();
  if (insertErr || !row) {
    return { ok: false as const, error: insertErr?.message ?? "Insert failed" };
  }
  const uid = `gordhamer-hub-item-${row.id}@gordhamer-hub.vercel.app`;
  const startIso = new Date(date + "T00:00:00").toISOString();
  const endDate = new Date(date + "T00:00:00");
  endDate.setDate(endDate.getDate() + 1);
  const endIso = endDate.toISOString();
  const sync = await pushEventToICloud({
    source: "calendar_item",
    source_id: row.id,
    uid,
    summary: name,
    startIso,
    endIso,
    allDay: true,
  });
  revalidatePath("/calendar");
  revalidatePath("/home");
  return { ok: true as const, sync };
}

export async function updateCalendarItem(id: string, name: string, date: string) {
  const supabase = createClient();
  const { error: upErr } = await supabase
    .from("calendar_items")
    .update({ name, date })
    .eq("id", id);
  if (upErr) return { ok: false as const, error: upErr.message };

  const uid = `gordhamer-hub-item-${id}@gordhamer-hub.vercel.app`;
  const startIso = new Date(date + "T00:00:00").toISOString();
  const endDate = new Date(date + "T00:00:00");
  endDate.setDate(endDate.getDate() + 1);
  const endIso = endDate.toISOString();
  const sync = await pushEventToICloud({
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
  return { ok: true as const, sync };
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

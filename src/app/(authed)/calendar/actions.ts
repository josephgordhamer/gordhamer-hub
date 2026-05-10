"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pushEventToICloud } from "./icloud-actions";

export interface CalendarItemInput {
  name: string;
  allDay: boolean;
  // Date in YYYY-MM-DD (used for the legacy `date` column and for all-day events)
  date: string;
  // For non-all-day, HH:mm in local time. May be undefined for all-day.
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  // Optional override of which iCloud calendar to push to. If omitted,
  // we fall back to the default-for-writes calendar.
  icloudCalendarId?: string | null;
}

function buildIso(date: string, time: string | undefined): string {
  // time is HH:mm in the user's local timezone. We construct a Date in local
  // time and let toISOString() emit UTC.
  const t = (time && /^\d{2}:\d{2}$/.test(time)) ? time + ":00" : "00:00:00";
  return new Date(date + "T" + t).toISOString();
}

function buildAllDayBounds(date: string): { startIso: string; endIso: string } {
  const startIso = new Date(date + "T00:00:00").toISOString();
  const endDate = new Date(date + "T00:00:00");
  endDate.setDate(endDate.getDate() + 1);
  return { startIso, endIso: endDate.toISOString() };
}

export async function createCalendarItem(input: CalendarItemInput) {
  const supabase = createClient();
  const { name, allDay, date } = input;

  const startIso = allDay
    ? buildAllDayBounds(date).startIso
    : buildIso(date, input.startTime);
  const endIso = allDay
    ? buildAllDayBounds(date).endIso
    : input.endTime
    ? buildIso(date, input.endTime)
    : null;

  const { data: row, error: insertErr } = await supabase
    .from("calendar_items")
    .insert({
      name,
      date,
      start_at: startIso,
      end_at: endIso,
      all_day: allDay,
      location: input.location || null,
      description: input.description || null,
      icloud_calendar_id: input.icloudCalendarId || null,
    })
    .select("id")
    .single();
  if (insertErr || !row) {
    return { ok: false as const, error: insertErr?.message ?? "Insert failed" };
  }

  const uid = `gordhamer-hub-item-${row.id}@gordhamer-hub.vercel.app`;
  const sync = await pushEventToICloud({
    source: "calendar_item",
    source_id: row.id,
    uid,
    summary: name,
    description: input.description,
    location: input.location,
    startIso,
    endIso,
    allDay,
    targetCalendarId: input.icloudCalendarId || null,
  });
  revalidatePath("/calendar");
  revalidatePath("/home");
  return { ok: true as const, sync };
}

export async function updateCalendarItem(id: string, input: CalendarItemInput) {
  const supabase = createClient();
  const { name, allDay, date } = input;

  const startIso = allDay
    ? buildAllDayBounds(date).startIso
    : buildIso(date, input.startTime);
  const endIso = allDay
    ? buildAllDayBounds(date).endIso
    : input.endTime
    ? buildIso(date, input.endTime)
    : null;

  const { error: upErr } = await supabase
    .from("calendar_items")
    .update({
      name,
      date,
      start_at: startIso,
      end_at: endIso,
      all_day: allDay,
      location: input.location || null,
      description: input.description || null,
      icloud_calendar_id: input.icloudCalendarId || null,
    })
    .eq("id", id);
  if (upErr) return { ok: false as const, error: upErr.message };

  const uid = `gordhamer-hub-item-${id}@gordhamer-hub.vercel.app`;
  const sync = await pushEventToICloud({
    source: "calendar_item",
    source_id: id,
    uid,
    summary: name,
    description: input.description,
    location: input.location,
    startIso,
    endIso,
    allDay,
    targetCalendarId: input.icloudCalendarId || null,
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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Frequency } from "@/lib/types";

export async function toggleCompletion(
  jobId: string,
  date: string,
  completedBy: string,
) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("job_completions")
    .select("id")
    .eq("job_id", jobId)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    await supabase.from("job_completions").delete().eq("id", existing.id);
  } else {
    await supabase
      .from("job_completions")
      .insert({ job_id: jobId, date, completed_by: completedBy });
  }
  revalidatePath("/jobs");
  revalidatePath("/home");
}

export async function setOverride(
  jobId: string,
  date: string,
  fields: { name?: string | null; assignee?: string | null; notes?: string | null },
) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("job_overrides")
    .select("*")
    .eq("job_id", jobId)
    .eq("date", date)
    .maybeSingle();

  const merged = {
    job_id: jobId,
    date,
    name: fields.name !== undefined ? fields.name : existing?.name ?? null,
    assignee: fields.assignee !== undefined ? fields.assignee : existing?.assignee ?? null,
    notes: fields.notes !== undefined ? fields.notes : existing?.notes ?? null,
  };

  // If everything is null/empty, delete the override row
  const allEmpty = !merged.name && !merged.assignee && !merged.notes;
  if (existing && allEmpty) {
    await supabase.from("job_overrides").delete().eq("id", existing.id);
  } else if (existing) {
    await supabase.from("job_overrides").update(merged).eq("id", existing.id);
  } else if (!allEmpty) {
    await supabase.from("job_overrides").insert(merged);
  }
  revalidatePath("/jobs");
}

export async function clearOverride(jobId: string, date: string) {
  const supabase = createClient();
  await supabase
    .from("job_overrides")
    .delete()
    .eq("job_id", jobId)
    .eq("date", date);
  revalidatePath("/jobs");
}

export async function createJob(input: {
  name: string;
  frequency: Frequency;
  custom_days: number | null;
  start_date: string;
  rotation: string[];
  notes?: string;
}) {
  const supabase = createClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      name: input.name,
      frequency: input.frequency,
      custom_days: input.custom_days,
      start_date: input.start_date,
      rotation: input.rotation,
    })
    .select("id")
    .single();

  // If notes provided (one-time job), add as override
  if (job && !error && input.notes && input.notes.trim()) {
    await supabase.from("job_overrides").insert({
      job_id: job.id,
      date: input.start_date,
      notes: input.notes.trim(),
    });
  }
  revalidatePath("/jobs");
  revalidatePath("/home");
}

export async function updateJob(
  id: string,
  input: {
    name: string;
    frequency: Frequency;
    custom_days: number | null;
    start_date: string;
    rotation: string[];
  },
) {
  const supabase = createClient();
  await supabase
    .from("jobs")
    .update({
      name: input.name,
      frequency: input.frequency,
      custom_days: input.custom_days,
      start_date: input.start_date,
      rotation: input.rotation,
    })
    .eq("id", id);
  revalidatePath("/jobs");
  revalidatePath("/home");
}

export async function deleteJob(id: string) {
  const supabase = createClient();
  await supabase
    .from("jobs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/jobs");
  revalidatePath("/home");
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface QuoteInput {
  family_member_id: string;
  text: string;
  context?: string;
  said_on?: string; // YYYY-MM-DD or empty
}

export async function addQuote(input: QuoteInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!input.text.trim()) return { ok: false as const, error: "Quote can't be empty" };

  // Find the next position for this family member so it sorts to the bottom.
  const { data: maxRow } = await supabase
    .from("quotes")
    .select("position")
    .eq("family_member_id", input.family_member_id)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (maxRow?.position ?? -1) + 1;

  const { error } = await supabase.from("quotes").insert({
    family_member_id: input.family_member_id,
    text: input.text.trim(),
    context: input.context?.trim() || null,
    said_on: input.said_on || null,
    added_by: user.id,
    position: nextPosition,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/quotes");
  return { ok: true as const };
}

export async function updateQuote(
  id: string,
  input: { text: string; context?: string; said_on?: string },
) {
  const supabase = createClient();
  if (!input.text.trim()) return { ok: false as const, error: "Quote can't be empty" };
  const { error } = await supabase
    .from("quotes")
    .update({
      text: input.text.trim(),
      context: input.context?.trim() || null,
      said_on: input.said_on || null,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/quotes");
  return { ok: true as const };
}

export async function deleteQuote(id: string) {
  const supabase = createClient();
  await supabase
    .from("quotes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/quotes");
}

export async function toggleReaction(quoteId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  // Check if a reaction already exists for this user+quote
  const { data: existing } = await supabase
    .from("quote_reactions")
    .select("id")
    .eq("quote_id", quoteId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("quote_reactions").delete().eq("id", existing.id);
  } else {
    await supabase.from("quote_reactions").insert({
      quote_id: quoteId,
      profile_id: user.id,
    });
  }
  revalidatePath("/quotes");
  return { ok: true as const };
}

export async function addComment(quoteId: string, text: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!text.trim()) return { ok: false as const, error: "Comment can't be empty" };
  const { error } = await supabase.from("quote_comments").insert({
    quote_id: quoteId,
    profile_id: user.id,
    text: text.trim(),
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/quotes");
  return { ok: true as const };
}

export async function deleteComment(id: string) {
  const supabase = createClient();
  await supabase
    .from("quote_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/quotes");
}

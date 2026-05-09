"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PersonalPageSection } from "@/lib/types";

export async function updatePage(
  familyMemberId: string,
  fields: {
    header_text?: string;
    bio?: string;
    accent_color?: string;
    bg_color?: string;
    text_color?: string;
    sections?: PersonalPageSection[];
  },
) {
  const supabase = createClient();
  await supabase.from("personal_pages").update(fields).eq("family_member_id", familyMemberId);
  revalidatePath(`/pages/${familyMemberId}`);
  revalidatePath("/pages");
}

export async function submitPageRequest(familyMemberId: string, text: string) {
  const supabase = createClient();
  await supabase.from("page_requests").insert({
    family_member_id: familyMemberId,
    text,
    status: "pending",
  });
  revalidatePath(`/pages/${familyMemberId}`);
  revalidatePath("/pages");
}

export async function setRequestStatus(
  requestId: string,
  status: "completed" | "dismissed",
) {
  const supabase = createClient();
  await supabase
    .from("page_requests")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", requestId);
  revalidatePath("/pages");
}

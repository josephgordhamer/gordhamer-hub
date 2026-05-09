import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FamilyMember, PersonalPage, PageRequest } from "@/lib/types";
import { PersonalPageClient } from "./PersonalPageClient";

export default async function PersonalPageRoute({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [memberRes, pageRes, requestsRes] = await Promise.all([
    supabase.from("family_members").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("personal_pages").select("*").eq("family_member_id", params.id).maybeSingle(),
    supabase
      .from("page_requests")
      .select("*")
      .eq("family_member_id", params.id)
      .order("created_at", { ascending: false }),
  ]);
  if (!memberRes.data) notFound();

  return (
    <PersonalPageClient
      person={memberRes.data as FamilyMember}
      page={pageRes.data as PersonalPage | null}
      requests={(requestsRes.data ?? []) as PageRequest[]}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import type { Discussion, FamilyMember, ScripturePlanEntry } from "@/lib/types";
import { ScriptureClient } from "./ScriptureClient";

export default async function ScripturePage() {
  const supabase = createClient();
  const [planRes, discRes, familyRes] = await Promise.all([
    supabase.from("scripture_plan").select("*").order("position", { ascending: true }),
    supabase
      .from("discussions")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("family_members")
      .select("*")
      .is("deleted_at", null)
      .order("position", { ascending: true }),
  ]);
  return (
    <>
      <h2 className="section-title">Scripture Study</h2>
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 22 }}>
        Plan together, study together, discuss together — even from afar.
      </p>
      <ScriptureClient
        plan={(planRes.data ?? []) as ScripturePlanEntry[]}
        discussions={(discRes.data ?? []) as Discussion[]}
        family={(familyRes.data ?? []) as FamilyMember[]}
      />
    </>
  );
}

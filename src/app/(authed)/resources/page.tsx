import { createClient } from "@/lib/supabase/server";
import type { FamilyMember, Resource } from "@/lib/types";
import { ResourcesClient } from "./ResourcesClient";

export default async function ResourcesPage() {
  const supabase = createClient();
  const [resourcesRes, familyRes] = await Promise.all([
    supabase
      .from("resources")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("family_members")
      .select("*")
      .is("deleted_at", null)
      .order("position", { ascending: true }),
  ]);
  return (
    <>
      <h2 className="section-title">Family Resources</h2>
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 22 }}>
        Cool things worth sharing — websites, books, articles, talks.
      </p>
      <ResourcesClient
        resources={(resourcesRes.data ?? []) as Resource[]}
        family={(familyRes.data ?? []) as FamilyMember[]}
      />
    </>
  );
}

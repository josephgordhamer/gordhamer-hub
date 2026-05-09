import { createClient } from "@/lib/supabase/server";
import type { FamilyMember } from "@/lib/types";
import { GamesClient } from "./GamesClient";

export default async function GamesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("family_members")
    .select("*")
    .is("deleted_at", null)
    .order("position", { ascending: true });
  return (
    <>
      <h2 className="section-title">Fun &amp; Games</h2>
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 22 }}>
        A few activities to enjoy together, even when miles apart.
      </p>
      <GamesClient family={(data ?? []) as FamilyMember[]} />
    </>
  );
}

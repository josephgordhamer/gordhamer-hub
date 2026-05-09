import { createClient } from "@/lib/supabase/server";
import type { FamilyMember } from "@/lib/types";
import { ContactsClient } from "./ContactsClient";

export default async function ContactsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("family_members")
    .select("*")
    .is("deleted_at", null)
    .order("position", { ascending: true });

  const family = (data ?? []) as FamilyMember[];

  return (
    <>
      <h2 className="section-title">Family Directory</h2>
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 22 }}>
        Names, addresses, birthdays — and room to grow as the family grows.
      </p>
      <ContactsClient family={family} />
    </>
  );
}

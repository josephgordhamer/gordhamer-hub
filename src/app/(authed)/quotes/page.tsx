import { createClient } from "@/lib/supabase/server";
import type {
  FamilyMember,
  Quote,
  QuoteComment,
  QuoteReaction,
} from "@/lib/types";
import { QuotesClient } from "./QuotesClient";

export interface CommenterProfile {
  id: string;
  preferred_name: string | null;
  family_member_id: string | null;
}

export default async function QuotesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [familyRes, quotesRes, reactionsRes, commentsRes, profilesRes] =
    await Promise.all([
      supabase
        .from("family_members")
        .select("*")
        .is("deleted_at", null)
        .order("position", { ascending: true }),
      supabase
        .from("quotes")
        .select("*")
        .is("deleted_at", null)
        .order("family_member_id", { ascending: true })
        .order("position", { ascending: true }),
      supabase.from("quote_reactions").select("*"),
      supabase
        .from("quote_comments")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, preferred_name, family_member_id"),
    ]);

  return (
    <>
      <h2 className="section-title">Greatest Quotes</h2>
      <p
        style={{
          color: "var(--muted)",
          fontStyle: "italic",
          marginTop: 0,
          marginBottom: 22,
        }}
      >
        Funny, profound, and unforgettable things our family has said over the
        years. Add your own — and give a 👍 or a comment to the ones that make
        you smile.
      </p>
      <QuotesClient
        family={(familyRes.data ?? []) as FamilyMember[]}
        quotes={(quotesRes.data ?? []) as Quote[]}
        reactions={(reactionsRes.data ?? []) as QuoteReaction[]}
        comments={(commentsRes.data ?? []) as QuoteComment[]}
        profiles={(profilesRes.data ?? []) as CommenterProfile[]}
        currentUserId={user?.id ?? null}
      />
    </>
  );
}

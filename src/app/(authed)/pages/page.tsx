import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { FamilyMember, PersonalPage, PageRequest } from "@/lib/types";
import { getDisplayName } from "@/lib/helpers";
import { setRequestStatus } from "./actions";
import { PendingRequestActions } from "./PendingRequestActions";

export default async function FamilyPagesIndex() {
  const supabase = createClient();
  const [familyRes, pagesRes, requestsRes] = await Promise.all([
    supabase
      .from("family_members")
      .select("*")
      .is("deleted_at", null)
      .order("position", { ascending: true }),
    supabase.from("personal_pages").select("*"),
    supabase
      .from("page_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);
  const family = (familyRes.data ?? []) as FamilyMember[];
  const pages = (pagesRes.data ?? []) as PersonalPage[];
  const requests = (requestsRes.data ?? []) as PageRequest[];

  return (
    <>
      <h2 className="section-title">Family Pages</h2>
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 22 }}>
        Each family member has their own page they can design however they like.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {family.map((p) => {
          const page = pages.find((pp) => pp.family_member_id === p.id);
          const display = getDisplayName(p);
          const initial = display.charAt(0).toUpperCase();
          const pendingCount = requests.filter((r) => r.family_member_id === p.id).length;
          const borderColor =
            p.relationship === "parent" ? "var(--gold)" :
            p.relationship === "child" ? "var(--navy)" :
            "var(--burgundy)";
          return (
            <Link
              key={p.id}
              href={`/pages/${p.id}`}
              style={{
                background: "var(--cream-soft)",
                border: "1px solid var(--line)",
                borderTop: `5px solid ${borderColor}`,
                borderRadius: 6,
                padding: "18px 16px",
                textAlign: "center",
                textDecoration: "none",
                color: "inherit",
                boxShadow: "var(--shadow)",
                display: "block",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: page?.bg_color || "var(--navy)",
                  color: page?.text_color || "var(--cream)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                  fontFamily: "'Garamond', serif",
                  fontSize: "1.8rem",
                  border: `2px solid ${page?.accent_color || "var(--gold)"}`,
                }}
              >
                {initial}
              </div>
              <h3 style={{ margin: "0 0 4px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal", fontSize: "1.15rem" }}>
                {display}
              </h3>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
                {p.relationship.charAt(0).toUpperCase() + p.relationship.slice(1)}
              </div>
              {p.preferred_name && (
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }}>
                  {p.name}
                </div>
              )}
              {pendingCount > 0 && (
                <div
                  style={{
                    display: "inline-block",
                    background: "var(--burgundy)",
                    color: "var(--cream)",
                    fontSize: "0.7rem",
                    padding: "2px 8px",
                    borderRadius: 10,
                    marginTop: 6,
                  }}
                >
                  {pendingCount} pending request{pendingCount === 1 ? "" : "s"}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {requests.length > 0 && (
        <div className="card" style={{ borderLeft: "4px solid var(--burgundy)" }}>
          <h3 style={{ color: "var(--burgundy)", fontFamily: "'Garamond', serif", fontWeight: "normal", margin: "0 0 6px" }}>
            📨 Pending Page Requests ({requests.length})
          </h3>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
            When you next open Cowork, you can ask Claude to &quot;implement the pending page requests&quot; and they&apos;ll get built.
          </p>
          {requests.map((r) => {
            const person = family.find((f) => f.id === r.family_member_id);
            return (
              <div
                key={r.id}
                style={{
                  background: "var(--cream-soft)",
                  border: "1px solid var(--line)",
                  borderLeft: "4px solid var(--burgundy)",
                  padding: "10px 14px",
                  borderRadius: 4,
                  marginTop: 10,
                  fontSize: "0.92rem",
                }}
              >
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                  <span>
                    <strong>{person ? getDisplayName(person) : "?"}</strong> ·{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                  <span
                    style={{
                      background: "var(--burgundy)",
                      color: "var(--cream)",
                      padding: "1px 8px",
                      borderRadius: 8,
                      fontSize: "0.7rem",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Pending
                  </span>
                </div>
                <div>{r.text}</div>
                <PendingRequestActions requestId={r.id} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

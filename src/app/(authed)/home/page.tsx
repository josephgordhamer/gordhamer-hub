import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: family } = await supabase
    .from("family_members")
    .select("id, name, preferred_name, relationship, birthday")
    .is("deleted_at", null)
    .order("position", { ascending: true });

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });

  return (
    <>
      <div
        style={{
          background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)",
          color: "var(--cream)",
          padding: 24,
          borderRadius: 8,
          marginBottom: 24,
          textAlign: "center",
          border: "1px solid var(--gold)",
        }}
      >
        <h2
          style={{
            fontFamily: "'Garamond', serif",
            margin: "0 0 6px",
            fontSize: "1.6rem",
            fontWeight: "normal",
            letterSpacing: 1,
          }}
        >
          Welcome Home, Gordhamers
        </h2>
        <p style={{ margin: 0, color: "var(--cream-deep)", fontStyle: "italic" }}>
          Happy {dayName}, family. Here&apos;s what&apos;s happening together.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <DashboardCard title="Family">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            {family?.length ?? 0} family member{family?.length === 1 ? "" : "s"} loaded.
          </p>
        </DashboardCard>
        <DashboardCard title="What&apos;s next">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            More sections (Job Board, Events, Calendar, Family Pages, Scripture, Fun &amp;
            Games, Resources) are being ported in. Watch this space.
          </p>
        </DashboardCard>
        <DashboardCard title="Signed in as">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            {user?.email}
          </p>
        </DashboardCard>
      </div>
    </>
  );
}

function DashboardCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--cream-soft)",
        border: "1px solid var(--line)",
        borderLeft: "5px solid var(--gold)",
        borderRadius: 6,
        padding: 16,
        boxShadow: "var(--shadow)",
      }}
    >
      <h3
        style={{
          margin: "0 0 8px",
          color: "var(--navy)",
          fontFamily: "'Garamond', serif",
          fontSize: "1.25rem",
          fontWeight: "normal",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

import { Sidebar } from "@/components/Sidebar";
import { SignOutButton } from "@/components/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_name")
      .eq("id", user.id)
      .maybeSingle();
    displayName = profile?.preferred_name || user.email?.split("@")[0] || "";
  }

  return (
    <>
      <header
        style={{
          background: "var(--navy)",
          color: "var(--cream)",
          padding: "16px 24px 10px",
          borderBottom: "4px double var(--gold)",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            color: "var(--gold-soft)",
            fontSize: "0.8rem",
            letterSpacing: 6,
            marginBottom: 2,
            textTransform: "uppercase",
          }}
        >
          ~ Established in Love ~
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Garamond', serif",
            fontSize: "2rem",
            letterSpacing: 2,
            fontWeight: "normal",
          }}
        >
          The Gordhamer Family Hub
        </h1>
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 18,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "0.85rem",
            color: "var(--cream-deep)",
          }}
        >
          {displayName && <span>Welcome, {displayName}</span>}
          <SignOutButton />
        </div>
      </header>
      <Sidebar />
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "24px 20px 60px",
        }}
      >
        {children}
      </main>
      <footer
        style={{
          textAlign: "center",
          padding: 20,
          color: "var(--muted)",
          fontSize: "0.85rem",
          fontStyle: "italic",
          borderTop: "1px solid var(--line)",
          marginTop: 40,
        }}
      >
        The Gordhamer Family Hub · Built with love for our family across the States
      </footer>
    </>
  );
}

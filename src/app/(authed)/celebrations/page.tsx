import Link from "next/link";

interface Keepsake {
  href: string;
  title: string;
  subtitle: string;
  date: string;
  tone: "rose" | "gold" | "navy";
}

// Add new keepsake pages here as the family creates them.
const KEEPSAKES: Keepsake[] = [
  {
    href: "/celebrations/mothers-day-2026",
    title: "Mother's Day 2026",
    subtitle: "For Anna — with love from Joseph and the kids",
    date: "May 10, 2026",
    tone: "rose",
  },
];

const TONES: Record<Keepsake["tone"], { from: string; to: string; accent: string }> = {
  rose:  { from: "#fff7ee", to: "#f6e2cf", accent: "var(--burgundy)" },
  gold:  { from: "#fff8e0", to: "#f3dc99", accent: "var(--gold)" },
  navy:  { from: "#e7eaf2", to: "#c2c9d8", accent: "var(--navy)" },
};

export default function CelebrationsPage() {
  return (
    <>
      <h2 className="section-title">Family Keepsakes</h2>
      <p
        style={{
          color: "var(--muted)",
          fontStyle: "italic",
          marginTop: 0,
          marginBottom: 22,
        }}
      >
        A growing collection of pages we built together to remember the moments
        that mattered.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 18,
        }}
      >
        {KEEPSAKES.map((k) => {
          const t = TONES[k.tone];
          return (
            <Link
              key={k.href}
              href={k.href}
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                className="card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  border: "1px solid var(--line)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
              >
                <div
                  style={{
                    aspectRatio: "5 / 3",
                    background: `linear-gradient(135deg, ${t.from} 0%, ${t.to} 100%)`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 18,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: t.accent,
                      letterSpacing: 6,
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    ~ Keepsake ~
                  </div>
                  <div
                    style={{
                      fontFamily: "'Garamond', serif",
                      fontSize: "1.5rem",
                      color: "var(--navy)",
                      fontStyle: "italic",
                    }}
                  >
                    {k.title}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 6 }}>
                    {k.date}
                  </div>
                </div>
                <div style={{ padding: "10px 14px" }}>
                  <div
                    style={{
                      color: "var(--muted)",
                      fontSize: "0.88rem",
                      lineHeight: 1.4,
                    }}
                  >
                    {k.subtitle}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div
        className="card"
        style={{
          marginTop: 24,
          background: "var(--cream-soft)",
          color: "var(--muted)",
          fontSize: "0.88rem",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "var(--navy)" }}>About keepsakes.</strong> These
        pages live on permanently so they can be revisited any time. New ones
        can be added for birthdays, anniversaries, weddings, or any moment we
        want to remember.
      </div>
    </>
  );
}

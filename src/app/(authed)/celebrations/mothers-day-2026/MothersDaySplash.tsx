import Link from "next/link";
import { HERO_PHOTO, COLLAGE_PHOTOS } from "./photos.generated";

// Photo list is generated at build time by scripts/list-mothers-day-photos.mjs
// (wired into `prebuild` in package.json). Drop files into /public/mothers-day/
// and they'll appear after the next deploy. Name a file `hero.jpg` to make it
// the hero; otherwise the first file alphabetically is used.
export function MothersDaySplash() {
  const hero = HERO_PHOTO;
  const collage = COLLAGE_PHOTOS;
  return (
    <div
      style={{
        background:
          "radial-gradient(ellipse at top, #fff7e8 0%, var(--cream) 60%)",
        margin: "-24px -20px 0",
        padding: "24px 20px 60px",
        minHeight: "100vh",
      }}
    >
      {/* Hero band */}
      <div
        style={{
          textAlign: "center",
          padding: "24px 12px 32px",
          position: "relative",
        }}
      >
        <DecorBranch />
        <div
          style={{
            color: "var(--gold)",
            letterSpacing: 8,
            fontSize: "0.78rem",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          ~ Mother&apos;s Day ~ May 10, 2026 ~
        </div>
        <h1
          style={{
            fontFamily: "'Garamond', serif",
            fontSize: "clamp(2.2rem, 6vw, 3.6rem)",
            color: "var(--navy)",
            margin: "8px 0",
            fontWeight: "normal",
            letterSpacing: 1,
            fontStyle: "italic",
          }}
        >
          Happy Mother&apos;s Day,
          <br />
          <span style={{ color: "var(--burgundy)" }}>Anna</span>
        </h1>
        <p
          style={{
            fontStyle: "italic",
            color: "var(--muted)",
            maxWidth: 540,
            margin: "10px auto 0",
            fontSize: "1rem",
            lineHeight: 1.6,
          }}
        >
          From your husband, your children, and the whole family —
          <br />
          with all our love and gratitude for all that you are.
        </p>
        <DecorBranch flip />
      </div>

      {/* Hero photo */}
      {hero && (
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto 28px",
            padding: 8,
            background: "white",
            border: "1px solid var(--gold)",
            borderRadius: 4,
            boxShadow: "0 8px 30px rgba(31, 44, 74, 0.12)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero}
            alt="Anna — Mother's Day"
            style={{
              display: "block",
              width: "100%",
              maxHeight: 520,
              objectFit: "cover",
              objectPosition: "center 30%",
              borderRadius: 2,
            }}
          />
        </div>
      )}

      {/* Tribute message */}
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto 36px",
          padding: "26px 28px",
          background: "white",
          border: "1px solid var(--line)",
          borderLeft: "4px solid var(--gold)",
          borderRadius: 4,
          boxShadow: "0 4px 20px rgba(31, 44, 74, 0.08)",
        }}
      >
        <h2
          style={{
            fontFamily: "'Garamond', serif",
            fontWeight: "normal",
            fontSize: "1.5rem",
            color: "var(--navy)",
            margin: "0 0 14px",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          Mom,
        </h2>
        <p style={{ lineHeight: 1.85, color: "var(--ink)", fontSize: "1.05rem", margin: "0 0 14px" }}>
          Today we want to stop and tell you what you mean to us.
        </p>
        <p style={{ lineHeight: 1.85, color: "var(--ink)", fontSize: "1.05rem", margin: "0 0 14px" }}>
          You taught us how to laugh in a kitchen and how to be still in a quiet
          room. You showed us what it looks like to love faithfully — patiently,
          gracefully, day after day, year after year — even when it cost you
          something. You held us when we were small enough to fit in your arms,
          and you still hold us, across the miles, in your heart.
        </p>
        <p style={{ lineHeight: 1.85, color: "var(--ink)", fontSize: "1.05rem", margin: "0 0 14px" }}>
          You filled our lives with scripture and song, with carousel rides and
          pumpkin patches, with beach days and bedtime hugs. You taught us to
          pray and to forgive and to come home. Every one of us carries
          something of you wherever we go.
        </p>
        <p
          style={{
            lineHeight: 1.85,
            color: "var(--burgundy)",
            fontSize: "1.05rem",
            margin: "16px 0 12px",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          You are loved. You are admired. You are home.
        </p>
        <p
          style={{
            textAlign: "right",
            margin: 0,
            fontFamily: "'Garamond', serif",
            color: "var(--navy)",
            fontStyle: "italic",
            fontSize: "1rem",
          }}
        >
          — Joseph &amp; Abigail &amp; Henry, Magdalene, Joseph Alexander, Ella,
          Juliet, and Greta
        </p>
      </div>

      {/* Photo collage */}
      <div style={{ maxWidth: 1100, margin: "0 auto 36px" }}>
        <h3
          style={{
            textAlign: "center",
            fontFamily: "'Garamond', serif",
            color: "var(--navy)",
            fontSize: "1.4rem",
            fontStyle: "italic",
            fontWeight: "normal",
            margin: "0 0 18px",
            letterSpacing: 1,
          }}
        >
          ~ A few of our favorite moments with you ~
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 10,
            gridAutoFlow: "dense",
          }}
        >
          {collage.map((src, i) => {
            // Give a few photos visual emphasis: every 11th is featured (taller),
            // every 7th is wider, others uniform. Creates rhythm without chaos.
            const featured = i > 0 && i % 11 === 0;
            const wide = !featured && i > 0 && i % 7 === 0;
            return (
              <div
                key={i}
                style={{
                  gridColumn: wide || featured ? "span 2" : undefined,
                  gridRow: featured ? "span 2" : undefined,
                  background: "white",
                  border: "1px solid var(--line)",
                  padding: 4,
                  boxShadow: "0 2px 8px rgba(31, 44, 74, 0.08)",
                  aspectRatio: featured ? "4 / 5" : "4 / 3",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Anna with family ${i + 1}`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Verse / footer */}
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto 28px",
          textAlign: "center",
          color: "var(--muted)",
          fontStyle: "italic",
          lineHeight: 1.7,
        }}
      >
        <em
          style={{
            display: "block",
            fontSize: "1.05rem",
            color: "var(--navy)",
            fontFamily: "'Garamond', serif",
            marginBottom: 6,
          }}
        >
          &ldquo;Her children rise up, and call her blessed.&rdquo;
        </em>
        <span style={{ fontSize: "0.85rem" }}>— Proverbs 31:28</span>
      </div>

      {/* Continue link back to the regular hub */}
      <div
        style={{
          textAlign: "center",
          marginTop: 30,
          display: "flex",
          justifyContent: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/home?dashboard=1"
          style={{
            color: "var(--burgundy)",
            fontSize: "0.88rem",
            textDecoration: "none",
            borderBottom: "1px dotted var(--burgundy)",
            paddingBottom: 1,
          }}
        >
          → Continue to the Hub
        </Link>
        <Link
          href="/celebrations"
          style={{
            color: "var(--muted)",
            fontSize: "0.88rem",
            textDecoration: "none",
            borderBottom: "1px dotted var(--muted)",
            paddingBottom: 1,
          }}
        >
          ✦ Family Keepsakes
        </Link>
      </div>
    </div>
  );
}

function DecorBranch({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="180"
      height="36"
      viewBox="0 0 180 36"
      style={{
        display: "block",
        margin: "0 auto",
        opacity: 0.55,
        transform: flip ? "scaleY(-1)" : undefined,
      }}
    >
      <g stroke="var(--gold)" strokeWidth="1.4" fill="none" strokeLinecap="round">
        <path d="M30 18 H150" />
        <path d="M50 18 q-6 -8 -16 -10" />
        <path d="M50 18 q-6 8 -16 10" />
        <path d="M70 18 q-4 -7 -10 -10" />
        <path d="M70 18 q-4 7 -10 10" />
        <path d="M90 18 q0 -8 -4 -12" />
        <path d="M90 18 q0 8 -4 12" />
        <path d="M110 18 q4 -7 10 -10" />
        <path d="M110 18 q4 7 10 10" />
        <path d="M130 18 q6 -8 16 -10" />
        <path d="M130 18 q6 8 16 10" />
      </g>
      <circle cx="90" cy="18" r="3" fill="var(--gold)" />
    </svg>
  );
}

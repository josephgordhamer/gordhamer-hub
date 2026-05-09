"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const supabase = createClient();

  const signInWithGoogle = async () => {
    setBusy(true);
    setErrMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setBusy(false);
      setErrMsg(error.message);
    }
  };

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setErrMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) setErrMsg(error.message);
    else setMagicSent(true);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: "var(--cream-soft)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "32px 28px",
          boxShadow: "var(--shadow-lg)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "var(--gold-soft)",
            fontSize: "0.8rem",
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          ~ Established in Love ~
        </div>
        <h1
          style={{
            fontFamily: "'Garamond', serif",
            color: "var(--navy)",
            fontSize: "1.8rem",
            margin: "4px 0 6px",
            letterSpacing: 1,
            fontWeight: "normal",
          }}
        >
          The Gordhamer Family Hub
        </h1>
        <p
          style={{
            color: "var(--muted)",
            fontStyle: "italic",
            fontSize: "0.9rem",
            marginTop: 0,
            marginBottom: 24,
          }}
        >
          Sign in to continue
        </p>

        {error === "not_allowed" && (
          <div
            style={{
              background: "#fbf0f0",
              border: "1px solid var(--burgundy)",
              borderRadius: 4,
              padding: "10px 14px",
              color: "var(--burgundy)",
              marginBottom: 18,
              fontSize: "0.9rem",
              textAlign: "left",
            }}
          >
            That email isn&apos;t on the family allowlist yet. Ask Joseph to add you.
          </div>
        )}
        {errMsg && (
          <div
            style={{
              background: "#fbf0f0",
              border: "1px solid var(--burgundy)",
              borderRadius: 4,
              padding: "10px 14px",
              color: "var(--burgundy)",
              marginBottom: 18,
              fontSize: "0.9rem",
              textAlign: "left",
            }}
          >
            {errMsg}
          </div>
        )}

        <button
          onClick={signInWithGoogle}
          disabled={busy}
          className="btn"
          style={{
            width: "100%",
            justifyContent: "center",
            marginBottom: 14,
            opacity: busy ? 0.6 : 1,
          }}
        >
          Continue with Google
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "var(--muted)",
            fontSize: "0.8rem",
            margin: "10px 0 14px",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>

        {magicSent ? (
          <div
            style={{
              background: "#fffbe9",
              border: "1px solid var(--gold)",
              borderRadius: 4,
              padding: "12px 14px",
              color: "var(--navy)",
              textAlign: "left",
              fontSize: "0.95rem",
            }}
          >
            ✉️ Check <strong>{email}</strong> for a sign-in link from Supabase.
            Click it and you&apos;ll be signed in.
          </div>
        ) : (
          <form onSubmit={sendMagicLink}>
            <input
              type="email"
              required
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              style={{ marginBottom: 10 }}
            />
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="btn btn-secondary"
              style={{
                width: "100%",
                justifyContent: "center",
                opacity: busy ? 0.6 : 1,
              }}
            >
              Email me a sign-in link
            </button>
          </form>
        )}

        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.8rem",
            fontStyle: "italic",
            marginTop: 22,
            marginBottom: 0,
          }}
        >
          You must be on the family allowlist to sign in.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Detect in-app browsers (Messenger, Instagram, FB, etc.) that Google blocks for OAuth.
function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /(FBAN|FBAV|Instagram|Messenger|FB_IAB|Line|MicroMessenger|Twitter|Snapchat)/i.test(ua);
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";
  const error = searchParams.get("error");
  const detail = searchParams.get("detail");

  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [inApp, setInApp] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setInApp(isInAppBrowser());
  }, []);

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
        {(error === "callback_failed" || error === "callback_no_code") && (
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
            <strong>Sign-in failed.</strong> Try again, or close this tab and start
            over from <code>gordhamer-hub.vercel.app</code> in Safari.
            {detail && (
              <div style={{ marginTop: 6, fontSize: "0.8rem", color: "var(--muted)", fontFamily: "monospace", wordBreak: "break-all" }}>
                Detail: {detail}
              </div>
            )}
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

        {inApp && (
          <div
            style={{
              background: "#fffbe9",
              border: "1px solid var(--gold)",
              borderRadius: 4,
              padding: "12px 14px",
              color: "var(--navy)",
              marginBottom: 18,
              fontSize: "0.92rem",
              textAlign: "left",
            }}
          >
            <strong>Open in Safari to sign in.</strong> Google blocks sign-in inside
            Messenger / Instagram / Facebook. Tap the <strong>•••</strong> menu in the
            top right and choose <strong>&quot;Open in Safari&quot;</strong> (or paste{" "}
            <code style={{ background: "var(--cream-deep)", padding: "1px 5px", borderRadius: 3, fontSize: "0.85rem" }}>
              gordhamer-hub.vercel.app
            </code>{" "}
            into Safari directly).
          </div>
        )}

        <button
          onClick={signInWithGoogle}
          disabled={busy || inApp}
          className="btn"
          style={{
            width: "100%",
            justifyContent: "center",
            opacity: busy || inApp ? 0.5 : 1,
          }}
        >
          Continue with Google
        </button>

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

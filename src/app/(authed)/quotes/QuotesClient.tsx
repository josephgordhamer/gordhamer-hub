"use client";

import { useMemo, useState } from "react";
import type {
  FamilyMember,
  Quote,
  QuoteComment,
  QuoteReaction,
} from "@/lib/types";
import { getDisplayName } from "@/lib/helpers";
import {
  addComment,
  addQuote,
  deleteComment,
  deleteQuote,
  toggleReaction,
  updateQuote,
} from "./actions";
import type { CommenterProfile } from "./page";

export function QuotesClient({
  family,
  quotes,
  reactions,
  comments,
  profiles,
  currentUserId,
}: {
  family: FamilyMember[];
  quotes: Quote[];
  reactions: QuoteReaction[];
  comments: QuoteComment[];
  profiles: CommenterProfile[];
  currentUserId: string | null;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);

  // Lookup tables
  const familyById = useMemo(() => {
    const m: Record<string, FamilyMember> = {};
    family.forEach((f) => (m[f.id] = f));
    return m;
  }, [family]);

  const profileById = useMemo(() => {
    const m: Record<string, CommenterProfile> = {};
    profiles.forEach((p) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const reactionsByQuote = useMemo(() => {
    const m: Record<string, QuoteReaction[]> = {};
    reactions.forEach((r) => {
      (m[r.quote_id] ||= []).push(r);
    });
    return m;
  }, [reactions]);

  const commentsByQuote = useMemo(() => {
    const m: Record<string, QuoteComment[]> = {};
    comments.forEach((c) => {
      (m[c.quote_id] ||= []).push(c);
    });
    return m;
  }, [comments]);

  // Group quotes by family member (only show people with quotes)
  const grouped = useMemo(() => {
    const buckets: { member: FamilyMember; quotes: Quote[] }[] = [];
    family.forEach((m) => {
      const theirs = quotes.filter((q) => q.family_member_id === m.id);
      if (theirs.length > 0) buckets.push({ member: m, quotes: theirs });
    });
    return buckets;
  }, [family, quotes]);

  const filtered = filter === "all" ? grouped : grouped.filter((b) => b.member.id === filter);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <label className="field" style={{ marginBottom: 0, minWidth: 220 }}>
          <span>Filter</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Everyone</option>
            {grouped.map(({ member, quotes }) => (
              <option key={member.id} value={member.id}>
                {getDisplayName(member)} ({quotes.length})
              </option>
            ))}
          </select>
        </label>
        <button className="btn" onClick={() => setShowAdd((s) => !s)}>
          {showAdd ? "Cancel" : "+ Add a Quote"}
        </button>
      </div>

      {showAdd && (
        <AddQuoteForm family={family} onDone={() => setShowAdd(false)} />
      )}

      {filtered.map(({ member, quotes }) => (
        <PersonBlock
          key={member.id}
          member={member}
          quotes={quotes}
          reactionsByQuote={reactionsByQuote}
          commentsByQuote={commentsByQuote}
          profileById={profileById}
          familyById={familyById}
          currentUserId={currentUserId}
        />
      ))}

      {filtered.length === 0 && (
        <div
          className="card"
          style={{ textAlign: "center", padding: 30, color: "var(--muted)" }}
        >
          No quotes yet. Be the first to add one.
        </div>
      )}
    </>
  );
}

function PersonBlock({
  member,
  quotes,
  reactionsByQuote,
  commentsByQuote,
  profileById,
  familyById,
  currentUserId,
}: {
  member: FamilyMember;
  quotes: Quote[];
  reactionsByQuote: Record<string, QuoteReaction[]>;
  commentsByQuote: Record<string, QuoteComment[]>;
  profileById: Record<string, CommenterProfile>;
  familyById: Record<string, FamilyMember>;
  currentUserId: string | null;
}) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h3
        style={{
          fontFamily: "'Garamond', serif",
          fontSize: "1.5rem",
          color: "var(--navy)",
          margin: "0 0 10px",
          fontWeight: "normal",
          borderBottom: "2px solid var(--gold)",
          paddingBottom: 4,
          letterSpacing: 1,
        }}
      >
        {getDisplayName(member)}
      </h3>
      {quotes.map((q) => (
        <QuoteCard
          key={q.id}
          quote={q}
          reactions={reactionsByQuote[q.id] || []}
          comments={commentsByQuote[q.id] || []}
          profileById={profileById}
          familyById={familyById}
          currentUserId={currentUserId}
        />
      ))}
    </section>
  );
}

function QuoteCard({
  quote,
  reactions,
  comments,
  profileById,
  familyById,
  currentUserId,
}: {
  quote: Quote;
  reactions: QuoteReaction[];
  comments: QuoteComment[];
  profileById: Record<string, CommenterProfile>;
  familyById: Record<string, FamilyMember>;
  currentUserId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [busy, setBusy] = useState(false);

  const userReacted =
    currentUserId !== null && reactions.some((r) => r.profile_id === currentUserId);

  const onThumbs = async () => {
    if (busy) return;
    setBusy(true);
    await toggleReaction(quote.id);
    setBusy(false);
  };

  const onDelete = async () => {
    if (!confirm("Remove this quote?")) return;
    setBusy(true);
    await deleteQuote(quote.id);
  };

  if (editing) {
    return (
      <EditQuoteForm
        quote={quote}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className="card"
      style={{
        marginBottom: 10,
        padding: "14px 16px",
        background: "var(--cream-soft)",
        borderLeft: "4px solid var(--gold)",
      }}
    >
      <blockquote
        style={{
          margin: "0 0 8px",
          fontFamily: "'Garamond', serif",
          fontSize: "1.15rem",
          fontStyle: "italic",
          color: "var(--ink)",
          lineHeight: 1.5,
        }}
      >
        &ldquo;{quote.text}&rdquo;
      </blockquote>
      {(quote.context || quote.said_on) && (
        <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 8 }}>
          {quote.said_on && (
            <span>
              {new Date(quote.said_on + "T12:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
          {quote.said_on && quote.context && " · "}
          {quote.context && <span style={{ fontStyle: "italic" }}>{quote.context}</span>}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontSize: "0.85rem",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onThumbs}
          disabled={busy || !currentUserId}
          className="btn btn-secondary"
          style={{
            padding: "3px 10px",
            fontSize: "0.85rem",
            background: userReacted ? "var(--gold)" : undefined,
            color: userReacted ? "var(--navy)" : undefined,
            borderColor: userReacted ? "var(--gold)" : undefined,
          }}
          title={userReacted ? "Remove your thumbs up" : "Give a thumbs up"}
        >
          👍 {reactions.length > 0 ? reactions.length : ""}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="btn btn-secondary"
          style={{ padding: "3px 10px", fontSize: "0.85rem" }}
        >
          💬 {comments.length > 0 ? `${comments.length} ` : ""}
          {showComments ? "Hide" : comments.length === 0 ? "Comment" : "comment" + (comments.length === 1 ? "" : "s")}
        </button>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setEditing(true)}
          className="btn btn-secondary"
          style={{ padding: "3px 8px", fontSize: "0.75rem", opacity: 0.75 }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="btn"
          style={{
            padding: "3px 8px",
            fontSize: "0.75rem",
            background: "var(--burgundy)",
            opacity: 0.85,
          }}
          disabled={busy}
        >
          Remove
        </button>
      </div>

      {showComments && (
        <CommentsSection
          quoteId={quote.id}
          comments={comments}
          profileById={profileById}
          familyById={familyById}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

function EditQuoteForm({ quote, onDone }: { quote: Quote; onDone: () => void }) {
  const [text, setText] = useState(quote.text);
  const [context, setContext] = useState(quote.context || "");
  const [saidOn, setSaidOn] = useState(quote.said_on || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await updateQuote(quote.id, {
      text,
      context: context || undefined,
      said_on: saidOn || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    onDone();
  };

  return (
    <form
      onSubmit={save}
      className="card"
      style={{ marginBottom: 10, padding: "14px 16px", background: "#fffbe9" }}
    >
      <label className="field">
        <span>Quote *</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} required />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <label className="field">
          <span>Date (optional)</span>
          <input type="date" value={saidOn} onChange={(e) => setSaidOn(e.target.value)} />
        </label>
        <label className="field">
          <span>Context (optional)</span>
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Where, when, why this was said"
          />
        </label>
      </div>
      {err && <div style={{ color: "var(--burgundy)", fontSize: "0.9rem", marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onDone} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function CommentsSection({
  quoteId,
  comments,
  profileById,
  familyById,
  currentUserId,
}: {
  quoteId: string;
  comments: QuoteComment[];
  profileById: Record<string, CommenterProfile>;
  familyById: Record<string, FamilyMember>;
  currentUserId: string | null;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const res = await addComment(quoteId, text);
    setBusy(false);
    if (res.ok) setText("");
    else alert(res.error);
  };

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px dotted var(--line)",
      }}
    >
      {comments.map((c) => {
        const profile = c.profile_id ? profileById[c.profile_id] : null;
        const member = profile?.family_member_id ? familyById[profile.family_member_id] : null;
        const name = member ? getDisplayName(member) : profile?.preferred_name || "Someone";
        const isMine = c.profile_id === currentUserId;
        return (
          <div
            key={c.id}
            style={{
              padding: "6px 0",
              fontSize: "0.92rem",
              borderBottom: "1px dotted var(--line)",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <div style={{ flex: 1 }}>
              <strong style={{ color: "var(--navy)" }}>{name}</strong>{" "}
              <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                {new Date(c.created_at).toLocaleDateString()}
              </span>
              <div style={{ marginTop: 2 }}>{c.text}</div>
            </div>
            {isMine && (
              <button
                onClick={async () => {
                  if (!confirm("Delete your comment?")) return;
                  await deleteComment(c.id);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--burgundy)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Remove
              </button>
            )}
          </div>
        );
      })}
      <form
        onSubmit={submit}
        style={{ display: "flex", gap: 6, marginTop: 8 }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          style={{ flex: 1 }}
          disabled={busy || !currentUserId}
        />
        <button
          className="btn"
          type="submit"
          disabled={busy || !text.trim() || !currentUserId}
          style={{ fontSize: "0.85rem", padding: "4px 14px" }}
        >
          Post
        </button>
      </form>
    </div>
  );
}

function AddQuoteForm({
  family,
  onDone,
}: {
  family: FamilyMember[];
  onDone: () => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [saidOn, setSaidOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !text.trim()) return;
    setBusy(true);
    setErr(null);
    const res = await addQuote({
      family_member_id: memberId,
      text,
      context: context || undefined,
      said_on: saidOn || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setText("");
    setContext("");
    setSaidOn("");
    onDone();
  };

  return (
    <form
      onSubmit={submit}
      className="card"
      style={{
        marginBottom: 18,
        background: "#fffbe9",
        border: "1px solid var(--gold)",
      }}
    >
      <h3
        style={{
          margin: "0 0 10px",
          color: "var(--navy)",
          fontFamily: "'Garamond', serif",
          fontWeight: "normal",
        }}
      >
        Add a Quote
      </h3>
      <label className="field">
        <span>Who said it? *</span>
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
          <option value="">— Pick a family member —</option>
          {family.map((m) => (
            <option key={m.id} value={m.id}>
              {getDisplayName(m)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Quote *</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`"Pride makes you stupid"`}
          required
          rows={2}
        />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <label className="field">
          <span>Date (optional)</span>
          <input type="date" value={saidOn} onChange={(e) => setSaidOn(e.target.value)} />
        </label>
        <label className="field">
          <span>Context (optional)</span>
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="What was happening? Who was there?"
          />
        </label>
      </div>
      {err && <div style={{ color: "var(--burgundy)", fontSize: "0.9rem", marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" type="submit" disabled={busy || !memberId || !text.trim()}>
          {busy ? "Adding…" : "+ Add Quote"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onDone} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

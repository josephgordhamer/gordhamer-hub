"use client";

import { useState } from "react";
import type { Discussion, FamilyMember, ScripturePlanEntry } from "@/lib/types";
import { getDisplayName } from "@/lib/helpers";
import { addReadingDay, removeReadingDay, postDiscussion } from "./actions";

export function ScriptureClient({
  plan,
  discussions,
  family,
}: {
  plan: ScripturePlanEntry[];
  discussions: Discussion[];
  family: FamilyMember[];
}) {
  const [day, setDay] = useState("");
  const [passage, setPassage] = useState("");
  const [author, setAuthor] = useState(family[0]?.name || "");
  const [message, setMessage] = useState("");

  const onAddDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!day.trim() || !passage.trim()) return;
    await addReadingDay(day.trim(), passage.trim());
    setDay("");
    setPassage("");
  };

  const onPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    await postDiscussion(author, message.trim());
    setMessage("");
  };

  return (
    <>
      <div
        style={{
          background: "var(--navy)",
          color: "var(--cream)",
          padding: "18px 22px",
          borderRadius: 6,
          borderLeft: "4px solid var(--gold)",
          fontStyle: "italic",
          fontFamily: "'Garamond', serif",
          fontSize: "1.05rem",
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        &quot;Trust in the Lord with all thine heart; and lean not unto thine own understanding.&quot;
        <span style={{ display: "block", marginTop: 8, fontSize: "0.85rem", color: "var(--gold-soft)", fontStyle: "normal", letterSpacing: 2 }}>
          — Proverbs 3:5
        </span>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 10px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
          This Week&apos;s Reading Plan
        </h3>
        {plan.length === 0 ? (
          <p style={{ color: "var(--muted)", fontStyle: "italic" }}>No reading plan yet.</p>
        ) : (
          plan.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: "var(--cream-soft)",
                borderLeft: "4px solid var(--gold)",
                padding: "12px 14px",
                marginBottom: 8,
                borderRadius: 4,
              }}
            >
              <h4 style={{ margin: "0 0 4px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
                {entry.day}
              </h4>
              <div>{entry.passage}</div>
              <button
                className="btn"
                style={{ background: "var(--burgundy)", fontSize: "0.78rem", padding: "3px 8px", marginTop: 4 }}
                onClick={async () => {
                  if (confirm("Remove this reading?")) await removeReadingDay(entry.id);
                }}
              >
                Remove
              </button>
            </div>
          ))
        )}
        <form onSubmit={onAddDay} style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
          <input value={day} onChange={(e) => setDay(e.target.value)} placeholder="Day (e.g., Monday)" style={{ flex: 1, minWidth: 120 }} />
          <input value={passage} onChange={(e) => setPassage(e.target.value)} placeholder="Passage (e.g., Mosiah 2:17)" style={{ flex: 2, minWidth: 150 }} />
          <button className="btn" type="submit" style={{ fontSize: "0.85rem", padding: "4px 10px" }}>Add</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 6px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
          Discussion Board
        </h3>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 0 }}>
          Share thoughts and insights so family across States can join the conversation.
        </p>
        {discussions.length === 0 ? (
          <p style={{ color: "var(--muted)", fontStyle: "italic" }}>No insights shared yet. Be the first to post.</p>
        ) : (
          discussions.map((d) => (
            <div
              key={d.id}
              style={{
                background: "var(--cream-soft)",
                padding: "10px 12px",
                borderRadius: 4,
                marginBottom: 8,
                border: "1px solid var(--line)",
              }}
            >
              <span style={{ color: "var(--navy)", fontWeight: "bold", fontSize: "0.9rem" }}>{getDisplayName(d.author, family)}</span>
              <span style={{ color: "var(--muted)", fontSize: "0.78rem", marginLeft: 8 }}>{new Date(d.created_at).toLocaleString()}</span>
              <div style={{ marginTop: 4 }}>{d.message}</div>
            </div>
          ))
        )}
        <form onSubmit={onPost} style={{ marginTop: 12 }}>
          <select value={author} onChange={(e) => setAuthor(e.target.value)} style={{ marginBottom: 6, maxWidth: 240 }}>
            {family.map((f) => (
              <option key={f.id} value={f.name}>
                {getDisplayName(f)}
              </option>
            ))}
          </select>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share an insight, question, or thought..."
          />
          <button className="btn" type="submit" style={{ marginTop: 8 }}>Post Insight</button>
        </form>
      </div>
    </>
  );
}

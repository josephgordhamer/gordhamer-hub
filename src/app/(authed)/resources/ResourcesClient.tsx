"use client";

import { useState } from "react";
import type { FamilyMember, Resource } from "@/lib/types";
import { addResource, deleteResource } from "./actions";

const CATEGORIES = ["Website", "Book", "Article", "Talk / Sermon", "Video", "Other"];

export function ResourcesClient({
  resources,
  family,
}: {
  resources: Resource[];
  family: FamilyMember[];
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Website");
  const [url, setUrl] = useState("");
  const [sharedBy, setSharedBy] = useState(family[0]?.name || "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    await addResource({
      title: title.trim(),
      category,
      url,
      shared_by: sharedBy,
      notes,
    });
    setTitle("");
    setUrl("");
    setNotes("");
    setBusy(false);
  };

  return (
    <>
      <div className="card">
        <h3 style={{ margin: "0 0 10px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
          Share a Resource
        </h3>
        <form onSubmit={onAdd}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" />
            <select value={sharedBy} onChange={(e) => setSharedBy(e.target.value)}>
              {family.map((f) => (
                <option key={f.id} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why is this worth sharing?" />
          <button className="btn" type="submit" disabled={busy} style={{ marginTop: 10 }}>
            {busy ? "Adding..." : "Add Resource"}
          </button>
        </form>
      </div>

      {resources.length === 0 ? (
        <p style={{ color: "var(--muted)", fontStyle: "italic" }}>No resources shared yet.</p>
      ) : (
        resources.map((r) => (
          <div
            key={r.id}
            style={{
              background: "var(--cream-soft)",
              borderLeft: "4px solid var(--navy)",
              padding: "12px 14px",
              marginBottom: 10,
              borderRadius: 4,
              border: "1px solid var(--line)",
            }}
          >
            <h4 style={{ margin: "0 0 4px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
              {r.title}
            </h4>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 4 }}>
              {r.category && (
                <span style={{ display: "inline-block", background: "var(--cream-deep)", color: "var(--navy)", padding: "2px 8px", borderRadius: 10, fontSize: "0.75rem", marginRight: 4 }}>
                  {r.category}
                </span>
              )}
              {r.shared_by && <>Shared by {r.shared_by} · </>}
              {new Date(r.created_at).toLocaleDateString()}
            </div>
            {r.url && (
              <div>
                <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--burgundy)", fontSize: "0.85rem" }}>
                  {r.url}
                </a>
              </div>
            )}
            {r.notes && <div style={{ marginTop: 6, fontSize: "0.9rem" }}>{r.notes}</div>}
            <button
              className="btn"
              style={{ background: "var(--burgundy)", fontSize: "0.78rem", padding: "3px 8px", marginTop: 6 }}
              onClick={async () => {
                if (confirm("Remove this resource?")) await deleteResource(r.id);
              }}
            >
              Remove
            </button>
          </div>
        ))
      )}
    </>
  );
}

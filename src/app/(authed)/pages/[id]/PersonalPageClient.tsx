"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  FamilyMember,
  PersonalPage,
  PageRequest,
  PersonalPageSection,
} from "@/lib/types";
import { getDisplayName } from "@/lib/helpers";
import { updatePage, submitPageRequest } from "../actions";

const DEFAULT_PAGE: PersonalPage = {
  id: "",
  family_member_id: "",
  header_text: "",
  bio: "",
  accent_color: "#b8924a",
  bg_color: "#faf6ea",
  text_color: "#2a2a2a",
  sections: [],
};

export function PersonalPageClient({
  person,
  page,
  requests,
}: {
  person: FamilyMember;
  page: PersonalPage | null;
  requests: PageRequest[];
}) {
  const display = getDisplayName(person);
  const pp = page ?? { ...DEFAULT_PAGE, family_member_id: person.id };
  const [editMode, setEditMode] = useState(false);

  return (
    <>
      <div
        style={{
          background: "var(--cream-soft)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <Link className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px", textDecoration: "none" }} href="/pages">
          ⤺ Back to Family Pages
        </Link>
        <span style={{ fontStyle: "italic", color: "var(--muted)", marginRight: "auto", fontSize: "0.9rem" }}>
          {display}&apos;s page
        </span>
        <button className={editMode ? "btn btn-secondary" : "btn"} onClick={() => setEditMode((m) => !m)}>
          {editMode ? "Done Editing" : "✎ Edit Page"}
        </button>
      </div>

      {editMode ? (
        <PageEditor person={person} pp={pp} onClose={() => setEditMode(false)} />
      ) : (
        <PageView person={person} pp={pp} />
      )}

      <RequestDialog person={person} requests={requests} />
    </>
  );
}

function PageView({ person, pp }: { person: FamilyMember; pp: PersonalPage }) {
  const display = getDisplayName(person);
  const headerText = pp.header_text || `Welcome to ${display}'s page`;
  return (
    <div
      style={{
        border: `1px solid ${pp.accent_color}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "var(--shadow-lg)",
        background: pp.bg_color,
        color: pp.text_color,
      }}
    >
      <div style={{ padding: "30px 24px 22px", textAlign: "center", borderBottom: `3px double ${pp.accent_color}` }}>
        <h2 style={{ margin: 0, fontFamily: "'Garamond', serif", fontSize: "2.2rem", fontWeight: "normal", letterSpacing: 1 }}>
          {headerText}
        </h2>
        {pp.bio && (
          <div style={{ fontStyle: "italic", marginTop: 6, opacity: 0.75, fontSize: "0.95rem" }}>{display}</div>
        )}
      </div>
      <div style={{ padding: "22px 24px 28px" }}>
        {pp.bio && (
          <div
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.65,
              marginBottom: 22,
              paddingBottom: 18,
              borderBottom: `1px dashed ${pp.accent_color}`,
            }}
          >
            {pp.bio}
          </div>
        )}
        {pp.sections.length === 0 ? (
          <div style={{ textAlign: "center", fontStyle: "italic", opacity: 0.6, padding: "30px 10px" }}>
            This page is a blank canvas. Click <strong>✎ Edit Page</strong> above to make it your own.
          </div>
        ) : (
          pp.sections.map((s, i) => <SectionView key={i} s={s} accent={pp.accent_color} />)
        )}
      </div>
    </div>
  );
}

function SectionView({ s, accent }: { s: PersonalPageSection; accent: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      {s.title && (
        <h3
          style={{
            fontFamily: "'Garamond', serif",
            fontSize: "1.4rem",
            fontWeight: "normal",
            margin: "0 0 8px",
            paddingBottom: 4,
            borderBottom: `2px solid ${accent}`,
            display: "inline-block",
          }}
        >
          {s.title}
        </h3>
      )}
      {s.type === "text" && s.content && (
        <div style={{ fontSize: "1rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{s.content}</div>
      )}
      {s.type === "list" && s.items && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 22 }}>
          {(s.items as string[]).map((it, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{it}</li>
          ))}
        </ul>
      )}
      {s.type === "links" && s.items && (
        <div>
          {(s.items as { title: string; url: string; description?: string }[]).map((it, i) => (
            <a
              key={i}
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                background: "rgba(255,255,255,0.4)",
                padding: "8px 12px",
                borderRadius: 4,
                marginBottom: 6,
                textDecoration: "none",
                color: "inherit",
                borderLeft: `3px solid ${accent}`,
              }}
            >
              <span style={{ fontWeight: "bold", display: "block" }}>{it.title || it.url}</span>
              {it.description && (
                <span style={{ fontSize: "0.88rem", opacity: 0.75, marginTop: 2 }}>{it.description}</span>
              )}
            </a>
          ))}
        </div>
      )}
      {s.type === "custom" && s.html && (
        <div dangerouslySetInnerHTML={{ __html: s.html }} />
      )}
    </div>
  );
}

function PageEditor({
  person,
  pp,
  onClose,
}: {
  person: FamilyMember;
  pp: PersonalPage;
  onClose: () => void;
}) {
  const [headerText, setHeaderText] = useState(pp.header_text);
  const [bio, setBio] = useState(pp.bio);
  const [bg, setBg] = useState(pp.bg_color);
  const [text, setText] = useState(pp.text_color);
  const [accent, setAccent] = useState(pp.accent_color);
  const [sections, setSections] = useState<PersonalPageSection[]>(pp.sections);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await updatePage(person.id, {
      header_text: headerText,
      bio,
      bg_color: bg,
      text_color: text,
      accent_color: accent,
      sections,
    });
    setBusy(false);
    onClose();
  };

  const addSection = (type: PersonalPageSection["type"]) => {
    const newSection: PersonalPageSection =
      type === "text"
        ? { type: "text", title: "", content: "" }
        : type === "list"
        ? { type: "list", title: "", items: [""] }
        : { type: "links", title: "", items: [{ title: "", url: "", description: "" }] };
    setSections([...sections, newSection]);
  };

  const updateSection = (idx: number, fields: Partial<PersonalPageSection>) => {
    setSections(sections.map((s, i) => (i === idx ? { ...s, ...fields } : s)));
  };

  const removeSection = (idx: number) => {
    if (!confirm("Delete this section?")) return;
    setSections(sections.filter((_, i) => i !== idx));
  };

  const moveSection = (idx: number, delta: number) => {
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const arr = [...sections];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setSections(arr);
  };

  return (
    <>
      <div className="card">
        <h3 style={{ margin: "0 0 10px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
          Page header & bio
        </h3>
        <label className="field">
          <span>Page title (shown at the top)</span>
          <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder={`e.g., ${getDisplayName(person)}'s Corner`} />
        </label>
        <label className="field">
          <span>About me / bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell your family a bit about you..." />
        </label>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 10px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
          Color theme
        </h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <ColorPick label="Background" value={bg} onChange={setBg} />
          <ColorPick label="Text" value={text} onChange={setText} />
          <ColorPick label="Accent" value={accent} onChange={setAccent} />
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 10px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
          Sections ({sections.length})
        </h3>
        {sections.length === 0 && (
          <p style={{ color: "var(--muted)", fontStyle: "italic" }}>No sections yet.</p>
        )}
        {sections.map((s, idx) => (
          <SectionEditor
            key={idx}
            s={s}
            idx={idx}
            onUpdate={(f) => updateSection(idx, f)}
            onRemove={() => removeSection(idx)}
            onMove={(d) => moveSection(idx, d)}
          />
        ))}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          <span style={{ color: "var(--muted)", fontSize: "0.9rem", alignSelf: "center", marginRight: 6 }}>
            Add new:
          </span>
          <button className="btn btn-secondary" onClick={() => addSection("text")} style={{ fontSize: "0.85rem", padding: "4px 10px" }}>+ Text Block</button>
          <button className="btn btn-secondary" onClick={() => addSection("list")} style={{ fontSize: "0.85rem", padding: "4px 10px" }}>+ Bullet List</button>
          <button className="btn btn-secondary" onClick={() => addSection("links")} style={{ fontSize: "0.85rem", padding: "4px 10px" }}>+ Links Collection</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Save All Changes"}
        </button>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

function ColorPick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", color: "var(--muted)" }}>
      {label}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 42, height: 32, border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }}
      />
    </label>
  );
}

function SectionEditor({
  s,
  idx,
  onUpdate,
  onRemove,
  onMove,
}: {
  s: PersonalPageSection;
  idx: number;
  onUpdate: (f: Partial<PersonalPageSection>) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
}) {
  const typeLabel = s.type.charAt(0).toUpperCase() + s.type.slice(1);
  return (
    <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: 4, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span
          style={{
            background: "var(--cream-deep)",
            color: "var(--navy)",
            padding: "2px 8px",
            borderRadius: 10,
            fontSize: "0.72rem",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {typeLabel} block
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-secondary" style={{ fontSize: "0.78rem", padding: "3px 8px" }} onClick={() => onMove(-1)}>↑</button>
          <button className="btn btn-secondary" style={{ fontSize: "0.78rem", padding: "3px 8px" }} onClick={() => onMove(1)}>↓</button>
          <button className="btn" style={{ background: "var(--burgundy)", fontSize: "0.78rem", padding: "3px 8px" }} onClick={onRemove}>Delete</button>
        </div>
      </div>
      <label className="field">
        <span>Title</span>
        <input value={s.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} />
      </label>
      {s.type === "text" && (
        <label className="field">
          <span>Content</span>
          <textarea value={s.content || ""} onChange={(e) => onUpdate({ content: e.target.value })} />
        </label>
      )}
      {s.type === "list" && (
        <>
          {((s.items as string[]) || []).map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <input
                value={item}
                onChange={(e) => {
                  const items = [...((s.items as string[]) || [])];
                  items[i] = e.target.value;
                  onUpdate({ items });
                }}
                style={{ flex: 1 }}
                placeholder="List item"
              />
              <button
                className="btn"
                style={{ background: "var(--burgundy)", fontSize: "0.78rem", padding: "3px 8px" }}
                onClick={() => onUpdate({ items: ((s.items as string[]) || []).filter((_, idx) => idx !== i) })}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="btn btn-secondary"
            style={{ fontSize: "0.78rem", padding: "3px 8px", marginTop: 4 }}
            onClick={() => onUpdate({ items: [...((s.items as string[]) || []), ""] })}
          >
            + Add item
          </button>
        </>
      )}
      {s.type === "links" && (
        <>
          {((s.items as { title: string; url: string; description?: string }[]) || []).map((item, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 6 }}>
                <input
                  value={item.title}
                  onChange={(e) => {
                    const items = [...((s.items as { title: string; url: string; description?: string }[]) || [])];
                    items[i] = { ...item, title: e.target.value };
                    onUpdate({ items });
                  }}
                  placeholder="Title"
                />
                <input
                  type="url"
                  value={item.url}
                  onChange={(e) => {
                    const items = [...((s.items as { title: string; url: string; description?: string }[]) || [])];
                    items[i] = { ...item, url: e.target.value };
                    onUpdate({ items });
                  }}
                  placeholder="https://..."
                />
                <button
                  className="btn"
                  style={{ background: "var(--burgundy)", fontSize: "0.78rem", padding: "3px 8px" }}
                  onClick={() =>
                    onUpdate({
                      items: ((s.items as { title: string; url: string; description?: string }[]) || []).filter(
                        (_, idx) => idx !== i,
                      ),
                    })
                  }
                >
                  ×
                </button>
              </div>
              <input
                value={item.description || ""}
                onChange={(e) => {
                  const items = [...((s.items as { title: string; url: string; description?: string }[]) || [])];
                  items[i] = { ...item, description: e.target.value };
                  onUpdate({ items });
                }}
                placeholder="Description (optional)"
                style={{ marginTop: 4 }}
              />
            </div>
          ))}
          <button
            className="btn btn-secondary"
            style={{ fontSize: "0.78rem", padding: "3px 8px" }}
            onClick={() =>
              onUpdate({
                items: [
                  ...((s.items as { title: string; url: string; description?: string }[]) || []),
                  { title: "", url: "", description: "" },
                ],
              })
            }
          >
            + Add link
          </button>
        </>
      )}
    </div>
  );
}

function RequestDialog({ person, requests }: { person: FamilyMember; requests: PageRequest[] }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const display = getDisplayName(person);

  const submit = async () => {
    if (!text.trim()) return alert("Type your request first.");
    setBusy(true);
    await submitPageRequest(person.id, text.trim());
    setText("");
    setBusy(false);
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)",
        color: "var(--cream)",
        borderRadius: 8,
        padding: "18px 20px",
        marginTop: 16,
        border: "1px solid var(--gold)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <h3 style={{ margin: "0 0 6px", fontFamily: "'Garamond', serif", fontWeight: "normal", fontSize: "1.3rem", color: "var(--gold-soft)" }}>
        💬 Chat with Claude about your page
      </h3>
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          padding: "10px 14px",
          borderRadius: "14px 14px 14px 0",
          margin: "10px 0",
          fontSize: "0.95rem",
          lineHeight: 1.4,
          borderLeft: "3px solid var(--gold)",
        }}
      >
        Hi {display}! Tell me anything you&apos;d like changed or added — new sections, different colors, photos, layout ideas. The next time someone opens this in Cowork, Claude will work through your request.
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g., Make my page have a forest-green background, add a section about my favorite recipes..."
        style={{ background: "rgba(255,255,255,0.95)", color: "var(--ink)", marginTop: 4, minHeight: 80 }}
      />
      <div style={{ marginTop: 10 }}>
        <button className="btn btn-gold" onClick={submit} disabled={busy}>
          {busy ? "Saving..." : "Submit Request"}
        </button>
      </div>
      {requests.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <h4 style={{ margin: "0 0 8px", color: "var(--gold-soft)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
            Your requests
          </h4>
          {requests.map((r) => (
            <div
              key={r.id}
              style={{
                background: "var(--cream-soft)",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                borderLeft: `4px solid ${r.status === "completed" ? "#5d6d4a" : "var(--burgundy)"}`,
                padding: "10px 14px",
                borderRadius: 4,
                marginBottom: 8,
                fontSize: "0.92rem",
              }}
            >
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                <span>{new Date(r.created_at).toLocaleString()}</span>
                <span
                  style={{
                    background: r.status === "completed" ? "#5d6d4a" : "var(--burgundy)",
                    color: "var(--cream)",
                    padding: "1px 8px",
                    borderRadius: 8,
                    fontSize: "0.7rem",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  {r.status === "completed" ? "Done" : r.status}
                </span>
              </div>
              <div>{r.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

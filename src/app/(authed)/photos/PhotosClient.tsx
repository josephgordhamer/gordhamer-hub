"use client";

import { useState } from "react";
import { addPhotoAlbum, deletePhotoAlbum, updatePhotoAlbum } from "./actions";
import type { AlbumRow } from "./page";

export function PhotosClient({ albums }: { albums: AlbumRow[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <button className="btn" onClick={() => setShowAdd((s) => !s)}>
          {showAdd ? "Cancel" : "+ Add Shared Album"}
        </button>
        {albums.length > 0 && (
          <button
            className="btn btn-secondary"
            onClick={() => setEditingId(editingId ? null : "all")}
          >
            {editingId ? "Done" : "Manage albums"}
          </button>
        )}
      </div>

      {showAdd && (
        <AddAlbumForm
          onDone={() => setShowAdd(false)}
        />
      )}

      {editingId === "all" && albums.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 10px", fontFamily: "'Garamond', serif", color: "var(--navy)", fontWeight: "normal" }}>
            Manage albums
          </h3>
          {albums.map((a) => (
            <AlbumManageRow key={a.id} album={a} />
          ))}
        </div>
      )}
    </>
  );
}

function AddAlbumForm({ onDone }: { onDone: () => void }) {
  const [shareUrl, setShareUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareUrl.trim()) return;
    setBusy(true);
    setErr(null);
    const res = await addPhotoAlbum({
      share_url: shareUrl.trim(),
      name: name.trim() || undefined,
      description: description.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setShareUrl("");
    setName("");
    setDescription("");
    onDone();
  };

  return (
    <form onSubmit={submit} className="card" style={{ marginBottom: 18, background: "#fffbe9", border: "1px solid var(--gold)" }}>
      <h3 style={{ margin: "0 0 8px", fontFamily: "'Garamond', serif", color: "var(--navy)", fontWeight: "normal" }}>
        Add a Shared Album
      </h3>
      <label className="field">
        <span>iCloud Shared Album link *</span>
        <input
          value={shareUrl}
          onChange={(e) => setShareUrl(e.target.value)}
          placeholder="https://www.icloud.com/sharedalbum/#B0…"
          required
          autoFocus
        />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <label className="field">
          <span>Display name (optional)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Christmas 2025"
          />
        </label>
        <label className="field">
          <span>Description (optional)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A note about this album"
          />
        </label>
      </div>
      {err && (
        <div
          style={{
            background: "#fbf0f0",
            border: "1px solid var(--burgundy)",
            color: "var(--burgundy)",
            padding: "8px 12px",
            borderRadius: 4,
            fontSize: "0.9rem",
            marginBottom: 10,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" type="submit" disabled={busy || !shareUrl.trim()}>
          {busy ? "Checking…" : "+ Add Album"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function AlbumManageRow({ album }: { album: AlbumRow }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(album.name);
  const [description, setDescription] = useState(album.description || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await updatePhotoAlbum(album.id, { name: name.trim() || album.name, description });
    setBusy(false);
    setEditing(false);
  };
  const remove = async () => {
    if (!confirm(`Remove "${album.name}" from the Hub? The album in iCloud is not affected.`)) return;
    setBusy(true);
    await deletePhotoAlbum(album.id);
  };

  if (editing) {
    return (
      <div style={{ borderBottom: "1px dotted var(--line)", padding: "8px 4px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto auto", gap: 8, alignItems: "center" }}>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <button className="btn" onClick={save} disabled={busy}>
            Save
          </button>
          <button className="btn btn-secondary" onClick={() => setEditing(false)} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        padding: "6px 4px",
        borderBottom: "1px dotted var(--line)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Garamond', serif", color: "var(--navy)" }}>{album.name}</div>
        {album.description && (
          <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{album.description}</div>
        )}
      </div>
      <button
        className="btn btn-secondary"
        style={{ fontSize: "0.78rem", padding: "2px 8px" }}
        onClick={() => setEditing(true)}
        disabled={busy}
      >
        Edit
      </button>
      <button
        className="btn"
        style={{ background: "var(--burgundy)", fontSize: "0.78rem", padding: "2px 8px" }}
        onClick={remove}
        disabled={busy}
      >
        Remove
      </button>
    </div>
  );
}

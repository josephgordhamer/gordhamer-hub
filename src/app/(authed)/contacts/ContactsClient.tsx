"use client";

import { useState } from "react";
import Link from "next/link";
import type { FamilyMember, Relationship } from "@/lib/types";
import { formatDate } from "@/lib/helpers";
import { saveContact, deleteContact } from "./actions";

export function ContactsClient({ family }: { family: FamilyMember[] }) {
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [showForm, setShowForm] = useState(false);

  const parents = family.filter((f) => f.relationship === "parent");
  const children = family.filter((f) => f.relationship === "child");
  const grandchildren = family.filter((f) => f.relationship === "grandchild");

  const onEdit = (p: FamilyMember) => {
    setEditing(p);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onAdd = () => {
    setEditing(null);
    setShowForm(true);
  };
  const onDelete = async (id: string) => {
    if (!confirm("Remove this family member?")) return;
    await deleteContact(id);
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn btn-gold" onClick={onAdd}>+ Add Family Member</button>
      </div>

      {showForm && (
        <ContactForm
          editing={editing}
          family={family}
          onClose={() => setShowForm(false)}
        />
      )}

      <div>
        {parents.map((p) => (
          <ContactCard key={p.id} person={p} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {children.map((c) => (
          <div key={c.id}>
            <ContactCard person={c} onEdit={onEdit} onDelete={onDelete} />
            {grandchildren
              .filter((gc) => gc.parent_id === c.id)
              .map((gc) => (
                <ContactCard key={gc.id} person={gc} onEdit={onEdit} onDelete={onDelete} />
              ))}
          </div>
        ))}
      </div>
    </>
  );
}

function ContactCard({
  person,
  onEdit,
  onDelete,
}: {
  person: FamilyMember;
  onEdit: (p: FamilyMember) => void;
  onDelete: (id: string) => void;
}) {
  const cls = person.relationship;
  const colors = {
    parent: { border: "var(--gold)", marginLeft: 0 },
    child: { border: "var(--navy)", marginLeft: 24 },
    grandchild: { border: "var(--burgundy)", marginLeft: 48 },
  };
  const style = colors[cls];
  return (
    <div
      style={{
        background: "var(--cream-soft)",
        border: "1px solid var(--line)",
        borderLeft: `5px solid ${style.border}`,
        borderRadius: 6,
        padding: 14,
        marginBottom: 12,
        marginLeft: style.marginLeft,
        boxShadow: "var(--shadow)",
      }}
    >
      <h3
        style={{
          margin: "0 0 6px",
          fontFamily: "'Garamond', serif",
          color: "var(--navy)",
          fontWeight: "normal",
        }}
      >
        {person.name}
      </h3>
      {person.preferred_name && (
        <Detail label="Goes by"><strong>{person.preferred_name}</strong></Detail>
      )}
      {person.birthday && <Detail label="Birthday">{formatDate(person.birthday)}</Detail>}
      {person.phone && <Detail label="Phone">{person.phone}</Detail>}
      {person.email && <Detail label="Email">{person.email}</Detail>}
      {person.address && <Detail label="Address">{person.address}</Detail>}
      {person.state && <Detail label="State">{person.state}</Detail>}
      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={() => onEdit(person)}>
          Edit
        </button>
        <Link
          href={`/pages/${person.id}`}
          className="btn btn-gold"
          style={{ fontSize: "0.85rem", padding: "4px 10px", textDecoration: "none" }}
        >
          Visit Page
        </Link>
        <button
          className="btn"
          style={{ fontSize: "0.85rem", padding: "4px 10px", background: "var(--burgundy)" }}
          onClick={() => onDelete(person.id)}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "0.9rem", margin: "2px 0" }}>
      <span style={{ color: "var(--muted)", fontStyle: "italic", marginRight: 6 }}>
        {label}:
      </span>
      {children}
    </div>
  );
}

function ContactForm({
  editing,
  family,
  onClose,
}: {
  editing: FamilyMember | null;
  family: FamilyMember[];
  onClose: () => void;
}) {
  const [name, setName] = useState(editing?.name || "");
  const [preferredName, setPreferredName] = useState(editing?.preferred_name || "");
  const [relationship, setRelationship] = useState<Relationship>(
    editing?.relationship || "child",
  );
  const [parentId, setParentId] = useState(editing?.parent_id || "");
  const [birthday, setBirthday] = useState(editing?.birthday || "");
  const [phone, setPhone] = useState(editing?.phone || "");
  const [email, setEmail] = useState(editing?.email || "");
  const [address, setAddress] = useState(editing?.address || "");
  const [state, setState] = useState(editing?.state || "");
  const [busy, setBusy] = useState(false);

  const possibleParents = family.filter((f) => f.relationship !== "grandchild");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await saveContact({
      id: editing?.id,
      name: name.trim(),
      preferred_name: preferredName.trim(),
      relationship,
      parent_id: parentId || null,
      birthday: birthday || null,
      phone,
      email,
      address,
      state,
    });
    setBusy(false);
    onClose();
  };

  return (
    <div className="card">
      <h3
        style={{
          margin: "0 0 12px",
          fontFamily: "'Garamond', serif",
          color: "var(--navy)",
          fontWeight: "normal",
        }}
      >
        {editing ? `Edit ${editing.name}` : "Add Family Member"}
      </h3>
      <form onSubmit={onSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="field">
            <span>Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Preferred name</span>
            <input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} />
          </label>
          <label className="field">
            <span>Relationship</span>
            <select value={relationship} onChange={(e) => setRelationship(e.target.value as Relationship)}>
              <option value="parent">Parent</option>
              <option value="child">Child</option>
              <option value="grandchild">Grandchild</option>
            </select>
          </label>
          <label className="field">
            <span>Parent (if child or grandchild)</span>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">— None —</option>
              {possibleParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Birthday</span>
            <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </label>
          <label className="field">
            <span>State</span>
            <input value={state} onChange={(e) => setState(e.target.value)} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Address</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

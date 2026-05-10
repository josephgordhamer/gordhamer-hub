"use client";

import { useState } from "react";
import Link from "next/link";
import type { FamilyMember, Relationship, RelationshipStatus } from "@/lib/types";
import { formatDate, getDisplayName } from "@/lib/helpers";
import { saveContact, deleteContact } from "./actions";

interface Couple {
  primary: FamilyMember;
  partner: FamilyMember | null;
}

export function ContactsClient({ family }: { family: FamilyMember[] }) {
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  // Find the root couples (people with no parent_id and no partner who has a parent_id).
  // This handles Joseph & Anna both having parent_id=null, partnered to each other.
  const rootCouples = buildCouplesForParents(family, [null]);

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
        {rootCouples.map((couple) => (
          <CoupleNode
            key={couple.primary.id}
            couple={couple}
            family={family}
            depth={0}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  );
}

// Recursively render a couple and their descendants
function CoupleNode({
  couple,
  family,
  depth,
  onEdit,
  onDelete,
}: {
  couple: Couple;
  family: FamilyMember[];
  depth: number;
  onEdit: (p: FamilyMember) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const childParentIds: (string | null)[] = [
    couple.primary.id,
    ...(couple.partner ? [couple.partner.id] : []),
  ];
  const childCouples = buildCouplesForParents(family, childParentIds);

  return (
    <>
      <CoupleCard couple={couple} depth={depth} onEdit={onEdit} onDelete={onDelete} />
      {childCouples.map((child) => (
        <CoupleNode
          key={child.primary.id}
          couple={child}
          family={family}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

// Find all people whose parent_id is in `parentIds`, group them into couples (with their
// partners — even if the partner's parent_id is null), dedupe, and sort.
function buildCouplesForParents(
  family: FamilyMember[],
  parentIds: (string | null)[],
): Couple[] {
  const candidates = family.filter((f) => parentIds.includes(f.parent_id));
  const seen = new Set<string>();
  const couples: Couple[] = [];

  // Sort: position ASC, then created_at ASC (older record wins, which is the blood relative
  // in cases where someone was added first and a partner was added later), then by name.
  candidates.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  candidates.forEach((person) => {
    if (seen.has(person.id)) return;
    seen.add(person.id);
    let partner: FamilyMember | null = null;
    if (person.partner_id) {
      partner = family.find((f) => f.id === person.partner_id) || null;
      if (partner) seen.add(partner.id);
    }
    couples.push({ primary: person, partner });
  });
  return couples;
}

function CoupleCard({
  couple,
  depth,
  onEdit,
  onDelete,
}: {
  couple: Couple;
  depth: number;
  onEdit: (p: FamilyMember) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const { primary, partner } = couple;
  const status = primary.relationship_status;

  // Visual style by depth: 0=parents (gold), 1=children (navy), 2+=grandkids (burgundy/plum)
  const palette = [
    "var(--gold)",
    "var(--navy)",
    "var(--burgundy)",
    "#6b4e7a",
    "#5d6d4a",
  ];
  const border = palette[Math.min(depth, palette.length - 1)];
  const marginLeft = depth * 24;

  return (
    <div
      style={{
        background: "var(--cream-soft)",
        border: "1px solid var(--line)",
        borderLeft: `5px solid ${border}`,
        borderRadius: 6,
        padding: 14,
        marginBottom: 12,
        marginLeft,
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Avatar person={primary} />
          {partner && <Avatar person={partner} />}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3
            style={{
              margin: "0 0 4px",
              fontFamily: "'Garamond', serif",
              color: "var(--navy)",
              fontWeight: "normal",
            }}
          >
            {getDisplayName(primary)}
            {partner && (
              <>
                {" "}
                <span style={{ color: "var(--gold)" }}>&amp;</span>{" "}
                {getDisplayName(partner)}
              </>
            )}
          </h3>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic", marginBottom: 6 }}>
            {primary.name}
            {partner && <> &amp; {partner.name}</>}
            {status && status !== "single" && (
              <span style={{ marginLeft: 8, color: "var(--burgundy)" }}>· {status}</span>
            )}
          </div>
          <PersonDetails person={primary} prefix={partner ? `${getDisplayName(primary)}: ` : ""} />
          {partner && (
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dotted var(--line)" }}>
              <PersonDetails person={partner} prefix={`${getDisplayName(partner)}: `} />
            </div>
          )}
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: "0.85rem", padding: "4px 10px" }}
              onClick={() => onEdit(primary)}
            >
              Edit {getDisplayName(primary)}
            </button>
            {partner && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: "0.85rem", padding: "4px 10px" }}
                onClick={() => onEdit(partner)}
              >
                Edit {getDisplayName(partner)}
              </button>
            )}
            <Link
              href={`/pages/${primary.id}`}
              className="btn btn-gold"
              style={{ fontSize: "0.85rem", padding: "4px 10px", textDecoration: "none" }}
            >
              Visit Page
            </Link>
            <button
              className="btn"
              style={{ fontSize: "0.85rem", padding: "4px 10px", background: "var(--burgundy)" }}
              onClick={() => onDelete(primary.id)}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ person }: { person: FamilyMember }) {
  const display = getDisplayName(person);
  const initial = display.charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: "var(--navy)",
        color: "var(--cream)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Garamond', serif",
        fontSize: "1.1rem",
        border: "2px solid var(--gold)",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function PersonDetails({ person, prefix = "" }: { person: FamilyMember; prefix?: string }) {
  const items: { label: string; value: string }[] = [];
  if (person.birthday) items.push({ label: "Birthday", value: formatDate(person.birthday) });
  if (person.phone) items.push({ label: "Phone", value: person.phone });
  if (person.email) items.push({ label: "Email", value: person.email });
  if (person.address) items.push({ label: "Address", value: person.address });
  if (person.state) items.push({ label: "State", value: person.state });
  if (items.length === 0) return null;
  return (
    <div style={{ fontSize: "0.88rem" }}>
      {prefix && <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.78rem", display: "block" }}>{prefix}</span>}
      {items.map((it, i) => (
        <div key={i} style={{ marginBottom: 2 }}>
          <span style={{ color: "var(--muted)", fontStyle: "italic", marginRight: 6 }}>{it.label}:</span>
          {it.value}
        </div>
      ))}
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

  // Partner side
  const existingPartner = editing?.partner_id
    ? family.find((f) => f.id === editing.partner_id) || null
    : null;
  const [hasPartner, setHasPartner] = useState(
    !!editing?.partner_id || editing?.relationship_status === "engaged" || editing?.relationship_status === "married",
  );
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>(
    editing?.relationship_status === "engaged" || editing?.relationship_status === "married"
      ? editing.relationship_status
      : "married",
  );
  const [partnerName, setPartnerName] = useState(existingPartner?.name || "");
  const [partnerPreferred, setPartnerPreferred] = useState(existingPartner?.preferred_name || "");
  const [partnerEmail, setPartnerEmail] = useState(existingPartner?.email || "");
  const [partnerPhone, setPartnerPhone] = useState(existingPartner?.phone || "");
  const [partnerBirthday, setPartnerBirthday] = useState(existingPartner?.birthday || "");

  // Possible parents (for parent_id selector)
  //   - "child" → can pick from existing parents
  //   - "grandchild" → can pick from existing children (or their spouses, who sit at child tier)
  //   - "parent" → no parent (root-tier)
  const possibleParents =
    relationship === "child"
      ? family.filter((f) => f.relationship === "parent")
      : relationship === "grandchild"
      ? family.filter((f) => f.relationship === "child")
      : [];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if ((relationship === "child" || relationship === "grandchild") && !parentId) {
      const ok = confirm(
        `${name} is a ${relationship} but no parent is selected. ` +
          `They'll show up at the very top instead of indented under their parent. Save anyway?`,
      );
      if (!ok) return;
    }
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
      has_partner: hasPartner,
      relationship_status: hasPartner ? relationshipStatus : "single",
      partner_id: existingPartner?.id || null,
      partner: hasPartner
        ? {
            name: partnerName.trim(),
            preferred_name: partnerPreferred.trim(),
            email: partnerEmail,
            phone: partnerPhone,
            birthday: partnerBirthday || null,
          }
        : null,
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
            <span>Generation</span>
            <select value={relationship} onChange={(e) => setRelationship(e.target.value as Relationship)}>
              <option value="parent">Parent</option>
              <option value="child">Child</option>
              <option value="grandchild">Grandchild</option>
            </select>
          </label>
          <label className="field">
            <span>{relationship === "grandchild" ? "Parent (a child or in-law)" : "Parent (if a child)"}</span>
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

        {/* Married / engaged section */}
        <div
          style={{
            background: "white",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: 12,
            marginTop: 12,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem", color: "var(--navy)" }}>
            <input
              type="checkbox"
              checked={hasPartner}
              onChange={(e) => setHasPartner(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--navy)" }}
            />
            <strong>Married or engaged</strong>
          </label>
          {hasPartner && (
            <div style={{ marginTop: 12 }}>
              <label className="field">
                <span>Status</span>
                <select
                  value={relationshipStatus}
                  onChange={(e) => setRelationshipStatus(e.target.value as RelationshipStatus)}
                  style={{ maxWidth: 200 }}
                >
                  <option value="engaged">Engaged</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                  <option value="divorced">Divorced</option>
                </select>
              </label>
              <h4
                style={{
                  fontFamily: "'Garamond', serif",
                  fontWeight: "normal",
                  color: "var(--navy)",
                  margin: "10px 0 6px",
                  borderBottom: "1px dashed var(--line)",
                  paddingBottom: 4,
                }}
              >
                Spouse&apos;s details
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="field">
                  <span>Full name</span>
                  <input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} required={hasPartner} />
                </label>
                <label className="field">
                  <span>Preferred name</span>
                  <input value={partnerPreferred} onChange={(e) => setPartnerPreferred(e.target.value)} />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input type="tel" value={partnerPhone} onChange={(e) => setPartnerPhone(e.target.value)} />
                </label>
                <label className="field">
                  <span>Birthday</span>
                  <input
                    type="date"
                    value={partnerBirthday}
                    onChange={(e) => setPartnerBirthday(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
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

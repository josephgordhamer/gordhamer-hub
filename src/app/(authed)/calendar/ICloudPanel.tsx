"use client";

import { useState, useTransition } from "react";
import {
  connectICloud,
  disconnectICloud,
  refreshICloudEvents,
  toggleCalendar,
  setDefaultWriteCalendar,
  setCalendarColor,
} from "./icloud-actions";
import type { ICloudCalendarRow } from "./page";

interface Connection {
  id: string;
  apple_id: string;
  last_synced_at: string | null;
  last_error: string | null;
}

export function ICloudPanel({
  connection,
  calendars,
}: {
  connection: Connection | null;
  calendars: ICloudCalendarRow[];
}) {
  const [open, setOpen] = useState(!connection);
  const [appleId, setAppleId] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const enabledCount = calendars.filter((c) => c.enabled).length;

  const onConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appleId.trim() || !appPassword.trim()) return;
    setBusy(true);
    setMsg(null);
    const res = await connectICloud({
      appleId: appleId.trim(),
      appPassword: appPassword.trim().replace(/\s+/g, ""),
    });
    setBusy(false);
    if (res.ok) {
      setMsg({
        ok: true,
        text: `Connected. ${res.calendars?.length} calendars found — pick which ones to sync below.`,
      });
      setAppPassword("");
    } else {
      setMsg({ ok: false, text: res.error || "Couldn't connect." });
    }
  };

  const onRefresh = () => {
    startTransition(async () => {
      setMsg(null);
      const res = await refreshICloudEvents();
      if (res.ok) setMsg({ ok: true, text: `Synced ${res.count} events.` });
      else setMsg({ ok: false, text: res.error });
    });
  };

  const onDisconnect = async () => {
    if (!confirm("Disconnect iCloud? Cached events will be removed.")) return;
    await disconnectICloud();
  };

  return (
    <div
      className="card"
      style={{
        background: connection ? "var(--cream-soft)" : "#fffbe9",
        border: connection ? "1px solid var(--line)" : "1px solid var(--gold)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: "0 0 4px", fontFamily: "'Garamond', serif", color: "var(--navy)", fontWeight: "normal" }}>
             iCloud Calendars
          </h3>
          {connection ? (
            <div style={{ fontSize: "0.88rem", color: "var(--muted)" }}>
              Connected as <strong>{connection.apple_id}</strong>
              {" · "}
              {enabledCount} of {calendars.length} calendar{calendars.length === 1 ? "" : "s"} syncing
              {connection.last_synced_at && (
                <> · last synced {new Date(connection.last_synced_at).toLocaleString()}</>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "0.88rem", color: "var(--muted)" }}>
              Connect your iCloud account to sync calendars both ways.
            </div>
          )}
          {connection?.last_error && (
            <div style={{ marginTop: 6, fontSize: "0.85rem", color: "var(--burgundy)" }}>
              Last error: {connection.last_error}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {connection && (
            <>
              <button className="btn" onClick={onRefresh} disabled={pending || enabledCount === 0}>
                {pending ? "Refreshing…" : "↻ Refresh"}
              </button>
              <button className="btn btn-secondary" onClick={() => setOpen((o) => !o)}>
                {open ? "Hide" : "Settings"}
              </button>
            </>
          )}
        </div>
      </div>

      {connection && calendars.length > 0 && (
        <div
          style={{
            marginTop: 12,
            background: "white",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: "8px 10px",
          }}
        >
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Calendars on iCloud
          </div>
          {calendars.map((cal) => (
            <CalendarRow key={cal.id} cal={cal} />
          ))}
          <div style={{ marginTop: 8, fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
            Tick a calendar to sync events from it. The ★ marks the calendar new events created here will be pushed to.
          </div>
        </div>
      )}

      {msg && (
        <div
          style={{
            marginTop: 10,
            background: msg.ok ? "#f0f7e8" : "#fbf0f0",
            border: `1px solid ${msg.ok ? "#5d6d4a" : "var(--burgundy)"}`,
            color: msg.ok ? "var(--navy)" : "var(--burgundy)",
            padding: "8px 12px",
            borderRadius: 4,
            fontSize: "0.9rem",
          }}
        >
          {msg.text}
        </div>
      )}

      {open && (
        <form onSubmit={onConnect} style={{ marginTop: 12 }}>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: "0 0 8px" }}>
            Use an <strong>app-specific password</strong> from{" "}
            <a href="https://account.apple.com/account/manage" target="_blank" rel="noopener noreferrer" style={{ color: "var(--burgundy)" }}>
              account.apple.com
            </a>
            {" "}— Sign-In and Security → App-Specific Passwords. Your normal Apple password won&apos;t work.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label className="field">
              <span>Apple ID (email)</span>
              <input
                type="email"
                value={appleId}
                onChange={(e) => setAppleId(e.target.value)}
                placeholder={connection?.apple_id || "you@icloud.com"}
                required
              />
            </label>
            <label className="field">
              <span>App-specific password</span>
              <input
                type="password"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                required
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Connecting…" : connection ? "Update Connection" : "Connect iCloud"}
            </button>
            {connection && (
              <button type="button" className="btn" style={{ background: "var(--burgundy)" }} onClick={onDisconnect}>
                Disconnect
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function CalendarRow({ cal }: { cal: ICloudCalendarRow }) {
  const [busy, setBusy] = useState(false);
  const onToggle = async (enabled: boolean) => {
    setBusy(true);
    await toggleCalendar(cal.id, enabled);
    setBusy(false);
  };
  const onMakeDefault = async () => {
    setBusy(true);
    await setDefaultWriteCalendar(cal.id);
    setBusy(false);
  };
  const onColor = async (color: string) => {
    setBusy(true);
    await setCalendarColor(cal.id, color);
    setBusy(false);
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 4px",
        borderBottom: "1px dotted var(--line)",
        opacity: busy ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={cal.enabled}
        onChange={(e) => onToggle(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: "var(--navy)" }}
        disabled={busy}
      />
      <input
        type="color"
        value={cal.color}
        onChange={(e) => onColor(e.target.value)}
        style={{ width: 26, height: 22, border: "1px solid var(--line)", borderRadius: 3, cursor: "pointer", padding: 0 }}
        disabled={busy}
        title="Calendar color"
      />
      <span style={{ flex: 1, fontSize: "0.92rem" }}>
        {cal.display_name}
        {cal.is_default_for_writes && (
          <span
            style={{
              marginLeft: 8,
              background: "var(--gold)",
              color: "var(--navy)",
              padding: "1px 8px",
              borderRadius: 8,
              fontSize: "0.7rem",
              letterSpacing: 1,
              textTransform: "uppercase",
              fontWeight: "bold",
            }}
          >
            ★ Default
          </span>
        )}
      </span>
      {cal.enabled && !cal.is_default_for_writes && (
        <button
          className="btn btn-secondary"
          style={{ fontSize: "0.75rem", padding: "2px 8px" }}
          onClick={onMakeDefault}
          disabled={busy}
          title="Make this the calendar that new hub events are pushed to"
        >
          ★ Make default
        </button>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  connectICloud,
  disconnectICloud,
  refreshICloudEvents,
  listMyCalendars,
  setDefaultCalendar,
} from "./icloud-actions";

interface Connection {
  id: string;
  apple_id: string;
  default_calendar_name: string | null;
  last_synced_at: string | null;
  last_error: string | null;
}

export function ICloudPanel({ connection }: { connection: Connection | null }) {
  const [open, setOpen] = useState(!connection);
  const [appleId, setAppleId] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [calendarName, setCalendarName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [availableCalendars, setAvailableCalendars] = useState<
    { url: string; displayName: string }[] | null
  >(null);
  const [pickerBusy, setPickerBusy] = useState(false);

  const loadCalendars = async () => {
    setPickerBusy(true);
    setMsg(null);
    const res = await listMyCalendars();
    setPickerBusy(false);
    if (res.ok) {
      setAvailableCalendars(res.calendars);
    } else {
      setMsg({ ok: false, text: res.error });
    }
  };

  const switchCalendar = async (url: string, name: string) => {
    setPickerBusy(true);
    setMsg(null);
    await setDefaultCalendar(url, name);
    // Auto-refresh after switching
    const res = await refreshICloudEvents();
    setPickerBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: `Switched to "${name}" and synced ${res.count} events.` });
    } else {
      setMsg({ ok: false, text: res.error || "Switched, but refresh failed." });
    }
  };

  const onConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appleId.trim() || !appPassword.trim()) return;
    setBusy(true);
    setMsg(null);
    const res = await connectICloud({
      appleId: appleId.trim(),
      appPassword: appPassword.trim().replace(/\s+/g, ""),
      defaultCalendarName: calendarName.trim() || undefined,
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Connected. Click Refresh to pull your events." });
      setAppPassword("");
    } else {
      setMsg({ ok: false, text: res.error || "Couldn't connect." });
    }
  };

  const onRefresh = () => {
    startTransition(async () => {
      setMsg(null);
      const res = await refreshICloudEvents();
      if (res.ok) {
        setMsg({ ok: true, text: `Synced ${res.count} events from iCloud.` });
      } else {
        setMsg({ ok: false, text: res.error || "Refresh failed." });
      }
    });
  };

  const onDisconnect = async () => {
    if (!confirm("Disconnect iCloud? Cached events will be removed.")) return;
    await disconnectICloud();
    setMsg({ ok: true, text: "Disconnected." });
  };

  return (
    <div
      className="card"
      style={{
        background: connection ? "var(--cream-soft)" : "#fffbe9",
        border: connection ? "1px solid var(--line)" : "1px solid var(--gold)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h3
            style={{
              margin: "0 0 4px",
              fontFamily: "'Garamond', serif",
              color: "var(--navy)",
              fontWeight: "normal",
            }}
          >
             iCloud Calendar
          </h3>
          {connection ? (
            <div style={{ fontSize: "0.88rem", color: "var(--muted)" }}>
              Connected as <strong>{connection.apple_id}</strong>
              {connection.default_calendar_name && (
                <> · syncing calendar <strong>{connection.default_calendar_name}</strong></>
              )}
              {connection.last_synced_at && (
                <> · last synced {new Date(connection.last_synced_at).toLocaleString()}</>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "0.88rem", color: "var(--muted)" }}>
              Connect your iCloud calendar so events sync both ways.
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
              <button className="btn" onClick={onRefresh} disabled={pending}>
                {pending ? "Refreshing…" : "↻ Refresh"}
              </button>
              <button className="btn btn-secondary" onClick={() => setOpen((o) => !o)}>
                {open ? "Hide" : "Settings"}
              </button>
            </>
          )}
        </div>
      </div>

      {connection && (
        <div style={{ marginTop: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={loadCalendars}
            disabled={pickerBusy}
            style={{ fontSize: "0.85rem", padding: "4px 10px" }}
          >
            {pickerBusy ? "Working…" : availableCalendars ? "Refresh list" : "Pick a different calendar"}
          </button>
          {availableCalendars && (
            <div
              style={{
                marginTop: 8,
                background: "white",
                border: "1px solid var(--line)",
                borderRadius: 4,
                padding: 8,
              }}
            >
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 6 }}>
                Calendars on your iCloud account ({availableCalendars.length}):
              </div>
              {availableCalendars.map((c) => (
                <div
                  key={c.url}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 6px",
                    borderBottom: "1px dotted var(--line)",
                  }}
                >
                  <span style={{ fontSize: "0.92rem" }}>
                    {c.displayName}
                    {connection.default_calendar_name === c.displayName && (
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
                        }}
                      >
                        Active
                      </span>
                    )}
                  </span>
                  {connection.default_calendar_name !== c.displayName && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: "0.78rem", padding: "3px 8px" }}
                      onClick={() => switchCalendar(c.url, c.displayName)}
                      disabled={pickerBusy}
                    >
                      Use this
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
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
                placeholder="josephgordhamer@gmail.com"
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
          <label className="field">
            <span>
              Calendar name <em style={{ color: "var(--muted)", fontWeight: "normal" }}>(optional — defaults to first calendar)</em>
            </span>
            <input
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
              placeholder='e.g., "Family"'
            />
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Connecting…" : connection ? "Update Connection" : "Connect iCloud"}
            </button>
            {connection && (
              <button
                type="button"
                className="btn"
                style={{ background: "var(--burgundy)" }}
                onClick={onDisconnect}
              >
                Disconnect
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

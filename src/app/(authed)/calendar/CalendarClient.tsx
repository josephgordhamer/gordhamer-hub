"use client";

import { useState } from "react";
import type { FamilyEvent, FamilyMember, CalendarItem } from "@/lib/types";
import { formatDate, getDisplayName, todayStr } from "@/lib/helpers";
import { createCalendarItem, deleteCalendarItem } from "./actions";

interface SubscribedEvent {
  id: string;
  uid: string;
  summary: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  is_recurring: boolean;
  location: string | null;
}

export function CalendarClient({
  events,
  family,
  calendarItems,
  subscribedEvents = [],
}: {
  events: FamilyEvent[];
  family: FamilyMember[];
  calendarItems: CalendarItem[];
  subscribedEvents?: SubscribedEvent[];
}) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const prevMonthLast = new Date(year, month, 0).getDate();

  type DayEntry = { label: string; kind: "event" | "item" | "birthday" | "icloud" };
  const eventsOnDate: Record<number, DayEntry[]> = {};
  const push = (day: number, entry: DayEntry) => {
    if (!eventsOnDate[day]) eventsOnDate[day] = [];
    eventsOnDate[day].push(entry);
  };
  events.forEach((e) => {
    if (!e.date) return;
    const d = new Date(e.date + "T12:00:00");
    if (d.getMonth() === month && d.getFullYear() === year) push(d.getDate(), { label: e.name, kind: "event" });
  });
  calendarItems.forEach((item) => {
    const d = new Date(item.date + "T12:00:00");
    if (d.getMonth() === month && d.getFullYear() === year) push(d.getDate(), { label: item.name, kind: "item" });
  });
  family.forEach((f) => {
    if (!f.birthday) return;
    const d = new Date(f.birthday + "T12:00:00");
    if (d.getMonth() === month) push(d.getDate(), { label: `🎂 ${getDisplayName(f)}`, kind: "birthday" });
  });
  subscribedEvents.forEach((se) => {
    const d = new Date(se.start_at);
    if (d.getMonth() === month && d.getFullYear() === year) {
      push(d.getDate(), { label: se.summary, kind: "icloud" });
    }
  });

  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const change = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  };

  const cells: React.ReactNode[] = [];
  // Header row
  dayNames.forEach((d) =>
    cells.push(
      <div
        key={"h" + d}
        style={{
          background: "var(--navy)",
          color: "var(--cream)",
          textAlign: "center",
          padding: "6px 2px",
          fontSize: "0.8rem",
          letterSpacing: 1,
        }}
      >
        {d}
      </div>,
    ),
  );
  // Previous month padding
  for (let i = startDay - 1; i >= 0; i--) {
    cells.push(
      <div
        key={"pp" + i}
        style={{
          background: "var(--cream-deep)",
          minHeight: 70,
          padding: 4,
          fontSize: "0.85rem",
          opacity: 0.5,
        }}
      >
        <div style={{ fontWeight: "bold", color: "var(--navy)" }}>{prevMonthLast - i}</div>
      </div>,
    );
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && today.getDate() === d;
    const eventsList = eventsOnDate[d] || [];
    cells.push(
      <div
        key={"d" + d}
        style={{
          background: isToday ? "#fff8e0" : "var(--cream-soft)",
          border: isToday ? "2px solid var(--gold)" : "none",
          minHeight: 70,
          padding: 4,
          fontSize: "0.85rem",
        }}
      >
        <div style={{ fontWeight: "bold", color: "var(--navy)" }}>{d}</div>
        {eventsList.map((entry, i) => {
          const bg =
            entry.kind === "icloud"
              ? "#4a7080"
              : entry.kind === "birthday"
              ? "var(--gold)"
              : entry.kind === "item"
              ? "var(--burgundy)"
              : "var(--navy)";
          const fg = entry.kind === "birthday" ? "var(--navy)" : "var(--cream)";
          return (
            <div
              key={i}
              title={entry.label}
              style={{
                background: bg,
                color: fg,
                borderRadius: 3,
                padding: "1px 4px",
                marginTop: 2,
                fontSize: "0.7rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.label}
            </div>
          );
        })}
      </div>,
    );
  }
  const totalCells = startDay + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    cells.push(
      <div
        key={"tp" + i}
        style={{
          background: "var(--cream-deep)",
          minHeight: 70,
          padding: 4,
          fontSize: "0.85rem",
          opacity: 0.5,
        }}
      >
        <div style={{ fontWeight: "bold", color: "var(--navy)" }}>{i}</div>
      </div>,
    );
  }

  return (
    <>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={() => change(-1)}>
            ‹ Previous
          </button>
          <h3 style={{ margin: 0, color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal", fontSize: "1.4rem" }}>
            {monthNames[month]} {year}
          </h3>
          <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={() => change(1)}>
            Next ›
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, background: "var(--line)", border: "1px solid var(--line)" }}>
          {cells}
        </div>
        <p style={{ marginTop: 12, fontSize: "0.85rem", color: "var(--muted)", fontStyle: "italic" }}>
          Events from the Events section, calendar items, and birthdays appear automatically.
        </p>
      </div>

      <AddCalendarItem />

      {calendarItems.length > 0 && <ItemsList items={calendarItems} />}
    </>
  );
}

function AddCalendarItem() {
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayStr());
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;
    setBusy(true);
    await createCalendarItem(name.trim(), date);
    setName("");
    setDate(todayStr());
    setBusy(false);
  };

  return (
    <div className="card">
      <h3 style={{ margin: "0 0 6px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
        Add a calendar item
      </h3>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 0, marginBottom: 12 }}>
        For one-off items like appointments, anniversaries, or reminders that aren&apos;t full Events.
      </p>
      <form
        onSubmit={submit}
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end" }}
      >
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Description</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Dentist appointment"
          />
        </label>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button className="btn" type="submit" disabled={busy || !name.trim() || !date}>
          {busy ? "Adding..." : "+ Add"}
        </button>
      </form>
    </div>
  );
}

function ItemsList({ items }: { items: CalendarItem[] }) {
  const today = todayStr();
  const upcoming = [...items]
    .filter((i) => i.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = [...items]
    .filter((i) => i.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="card">
      <h3 style={{ margin: "0 0 10px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
        Calendar items
      </h3>
      {upcoming.length > 0 && (
        <>
          <h4 style={{ margin: "0 0 6px", color: "var(--muted)", fontSize: "0.82rem", letterSpacing: 1, textTransform: "uppercase" }}>
            Upcoming ({upcoming.length})
          </h4>
          {upcoming.map((it) => (
            <ItemRow key={it.id} item={it} />
          ))}
        </>
      )}
      {past.length > 0 && (
        <>
          <h4 style={{ margin: "12px 0 6px", color: "var(--muted)", fontSize: "0.82rem", letterSpacing: 1, textTransform: "uppercase" }}>
            Recent past
          </h4>
          {past.map((it) => (
            <ItemRow key={it.id} item={it} dim />
          ))}
        </>
      )}
    </div>
  );
}

function ItemRow({ item, dim }: { item: CalendarItem; dim?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 8px",
        borderBottom: "1px dotted var(--line)",
        opacity: dim ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: "0.92rem" }}>
        <strong>{formatDate(item.date)}</strong>
        <span style={{ color: "var(--muted)", margin: "0 6px" }}>·</span>
        {item.name}
      </span>
      <button
        className="btn"
        style={{ background: "var(--burgundy)", fontSize: "0.78rem", padding: "3px 8px" }}
        onClick={async () => {
          if (confirm(`Remove "${item.name}"?`)) await deleteCalendarItem(item.id);
        }}
      >
        ×
      </button>
    </div>
  );
}

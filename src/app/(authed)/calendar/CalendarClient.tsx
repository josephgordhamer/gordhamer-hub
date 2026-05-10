"use client";

import { useState, useMemo } from "react";
import type { FamilyEvent, FamilyMember, CalendarItem } from "@/lib/types";
import { formatDate, getDisplayName, todayStr } from "@/lib/helpers";
import type { ICloudCalendarRow, SubscribedEvent } from "./page";
import { createCalendarItem, deleteCalendarItem, updateCalendarItem } from "./actions";
import { updateICloudEvent, deleteICloudEvent } from "./icloud-actions";

type ViewMode = "month" | "week" | "day";
type EntryKind = "event" | "item" | "birthday" | "icloud";
interface Entry {
  id: string;
  label: string;
  kind: EntryKind;
  color: string;
  startMs: number;
  endMs: number | null;
  allDay: boolean;
  location?: string | null;
  description?: string | null;
  calendarId?: string | null;
  // For clicking + editing:
  source: "icloud" | "calendar_item" | "event" | "birthday";
  sourceId?: string;
}

const KIND_COLORS: Record<EntryKind, string> = {
  event: "#1f2c4a",        // navy
  item: "#732d3b",         // burgundy
  birthday: "#b8924a",     // gold
  icloud: "#4a7080",       // slate (overridden by calendar color)
};

export function CalendarClient({
  events,
  family,
  calendarItems,
  subscribedEvents = [],
  icloudCalendars = [],
}: {
  events: FamilyEvent[];
  family: FamilyMember[];
  calendarItems: CalendarItem[];
  subscribedEvents?: SubscribedEvent[];
  icloudCalendars?: ICloudCalendarRow[];
}) {
  const today = new Date();
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [selected, setSelected] = useState<Entry | null>(null);

  // Build a unified Entry list from all sources
  const allEntries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    const calColor: Record<string, string> = {};
    icloudCalendars.forEach((c) => (calColor[c.id] = c.color));

    // Family events (date-only)
    events.forEach((e) => {
      if (!e.date) return;
      const start = new Date(e.date + "T00:00:00").getTime();
      out.push({
        id: `event-${e.id}`,
        label: e.name,
        kind: "event",
        color: KIND_COLORS.event,
        startMs: start,
        endMs: null,
        allDay: true,
        description: e.notes,
        source: "event",
        sourceId: e.id,
      });
    });
    // Calendar items (date-only)
    calendarItems.forEach((it) => {
      const start = new Date(it.date + "T00:00:00").getTime();
      out.push({
        id: `item-${it.id}`,
        label: it.name,
        kind: "item",
        color: KIND_COLORS.item,
        startMs: start,
        endMs: null,
        allDay: true,
        source: "calendar_item",
        sourceId: it.id,
      });
    });
    // Birthdays — repeating yearly
    const yearsToShow = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];
    family.forEach((f) => {
      if (!f.birthday) return;
      const b = new Date(f.birthday + "T00:00:00");
      yearsToShow.forEach((yr) => {
        const d = new Date(yr, b.getMonth(), b.getDate());
        out.push({
          id: `birthday-${f.id}-${yr}`,
          label: `🎂 ${getDisplayName(f)}`,
          kind: "birthday",
          color: KIND_COLORS.birthday,
          startMs: d.getTime(),
          endMs: null,
          allDay: true,
          source: "birthday",
          sourceId: f.id,
        });
      });
    });
    // iCloud events
    subscribedEvents.forEach((se) => {
      const startMs = new Date(se.start_at).getTime();
      const endMs = se.end_at ? new Date(se.end_at).getTime() : null;
      out.push({
        id: `icloud-${se.id}`,
        label: se.summary,
        kind: "icloud",
        color: (se.icloud_calendar_id && calColor[se.icloud_calendar_id]) || KIND_COLORS.icloud,
        startMs,
        endMs,
        allDay: se.all_day,
        location: se.location,
        description: se.description,
        calendarId: se.icloud_calendar_id,
        source: "icloud",
        sourceId: se.id,
      });
    });
    return out.sort((a, b) => a.startMs - b.startMs);
  }, [events, family, calendarItems, subscribedEvents, icloudCalendars, today]);

  return (
    <>
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 14px",
        }}
      >
        <ViewSwitcher view={view} setView={setView} />
        <NavBar view={view} anchor={anchor} setAnchor={setAnchor} />
      </div>

      {view === "month" && <MonthView anchor={anchor} entries={allEntries} onPick={setSelected} />}
      {view === "week" && <WeekView anchor={anchor} entries={allEntries} onPick={setSelected} />}
      {view === "day" && <DayView anchor={anchor} entries={allEntries} onPick={setSelected} />}

      <AddCalendarItem />
      {calendarItems.length > 0 && <ItemsList items={calendarItems} />}

      {selected && <EventDetailModal entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function ViewSwitcher({ view, setView }: { view: ViewMode; setView: (v: ViewMode) => void }) {
  const opts: ViewMode[] = ["month", "week", "day"];
  return (
    <div style={{ display: "flex", gap: 0 }}>
      {opts.map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={view === v ? "btn" : "btn btn-secondary"}
          style={{
            fontSize: "0.85rem",
            padding: "5px 14px",
            borderRadius: v === "month" ? "4px 0 0 4px" : v === "day" ? "0 4px 4px 0" : 0,
            border: "1px solid var(--line)",
          }}
        >
          {v[0].toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  );
}

function NavBar({
  view,
  anchor,
  setAnchor,
}: {
  view: ViewMode;
  anchor: Date;
  setAnchor: (d: Date) => void;
}) {
  const move = (delta: number) => {
    const d = new Date(anchor);
    if (view === "month") d.setMonth(d.getMonth() + delta);
    else if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setDate(d.getDate() + delta);
    setAnchor(d);
  };
  const today = () => setAnchor(new Date());
  const label = useMemo(() => {
    if (view === "month") {
      return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (view === "week") {
      const start = startOfWeek(anchor);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [view, anchor]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
      <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={() => move(-1)}>
        ‹
      </button>
      <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={today}>
        Today
      </button>
      <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={() => move(1)}>
        ›
      </button>
      <span style={{ fontFamily: "'Garamond', serif", fontSize: "1.1rem", color: "var(--navy)", marginLeft: 10 }}>
        {label}
      </span>
    </div>
  );
}

// ----- MONTH VIEW -----
function MonthView({ anchor, entries, onPick }: { anchor: Date; entries: Entry[]; onPick: (e: Entry) => void }) {
  const month = anchor.getMonth();
  const year = anchor.getFullYear();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const prevMonthLast = new Date(year, month, 0).getDate();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entriesByDay: Record<string, Entry[]> = {};
  entries.forEach((e) => {
    const d = new Date(e.startMs);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const key = String(d.getDate());
      if (!entriesByDay[key]) entriesByDay[key] = [];
      entriesByDay[key].push(e);
    }
  });

  const cells: React.ReactNode[] = [];
  dayNames.forEach((d) =>
    cells.push(
      <div key={"h" + d} style={dayHeaderStyle}>
        {d}
      </div>,
    ),
  );
  for (let i = startDay - 1; i >= 0; i--) {
    cells.push(
      <div key={"pp" + i} style={otherMonthCell}>
        <div style={dayNumStyle}>{prevMonthLast - i}</div>
      </div>,
    );
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    const isToday = cellDate.getTime() === today.getTime();
    const list = entriesByDay[String(d)] || [];
    cells.push(
      <div key={"d" + d} style={isToday ? todayCell : monthCell}>
        <div style={dayNumStyle}>{d}</div>
        {list.slice(0, 4).map((e) => (
          <div
            key={e.id}
            title={e.label}
            onClick={() => onPick(e)}
            style={entryChipStyle(e.color, e.kind === "birthday")}
          >
            {e.label}
          </div>
        ))}
        {list.length > 4 && (
          <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 2, fontStyle: "italic" }}>
            +{list.length - 4} more
          </div>
        )}
      </div>,
    );
  }
  const totalCells = startDay + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    cells.push(
      <div key={"tp" + i} style={otherMonthCell}>
        <div style={dayNumStyle}>{i}</div>
      </div>,
    );
  }

  return (
    <div className="card">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, background: "var(--line)", border: "1px solid var(--line)" }}>
        {cells}
      </div>
    </div>
  );
}

// ----- WEEK / DAY VIEWS -----
function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setDate(d.getDate() - d.getDay());
  out.setHours(0, 0, 0, 0);
  return out;
}

function WeekView({ anchor, entries, onPick }: { anchor: Date; entries: Entry[]; onPick: (e: Entry) => void }) {
  const start = startOfWeek(anchor);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return <TimedGrid days={days} entries={entries} onPick={onPick} />;
}

function DayView({ anchor, entries, onPick }: { anchor: Date; entries: Entry[]; onPick: (e: Entry) => void }) {
  const d = new Date(anchor);
  d.setHours(0, 0, 0, 0);
  return <TimedGrid days={[d]} entries={entries} onPick={onPick} />;
}

const HOUR_HEIGHT = 48; // px
const HOUR_START = 6;
const HOUR_END = 24;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);

function TimedGrid({ days, entries, onPick }: { days: Date[]; entries: Entry[]; onPick: (e: Entry) => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `60px repeat(${days.length}, 1fr)`,
          background: "var(--navy)",
          color: "var(--cream)",
          borderBottom: "2px solid var(--gold)",
        }}
      >
        <div style={{ padding: "6px 4px", fontSize: "0.72rem", textAlign: "center", letterSpacing: 1 }}>
        </div>
        {days.map((d, i) => {
          const isToday = d.getTime() === today.getTime();
          return (
            <div
              key={i}
              style={{
                padding: "6px 4px",
                fontSize: "0.78rem",
                textAlign: "center",
                background: isToday ? "var(--burgundy)" : undefined,
                fontWeight: isToday ? "bold" : "normal",
                borderRight: i < days.length - 1 ? "1px solid rgba(255,255,255,0.2)" : "none",
              }}
            >
              <div style={{ letterSpacing: 1 }}>
                {d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
              </div>
              <div style={{ fontFamily: "'Garamond', serif", fontSize: "1rem" }}>
                {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day strip */}
      <AllDayStrip days={days} entries={entries} onPick={onPick} />

      {/* Time grid */}
      <div style={{ position: "relative", overflowY: "auto", maxHeight: 600 }}>
        <div style={{ display: "grid", gridTemplateColumns: `60px repeat(${days.length}, 1fr)`, position: "relative" }}>
          {/* Hour labels */}
          <div>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{
                  height: HOUR_HEIGHT,
                  borderBottom: "1px solid var(--line)",
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                  paddingRight: 4,
                  textAlign: "right",
                }}
              >
                {hourLabel(h)}
              </div>
            ))}
          </div>
          {days.map((day, i) => (
            <DayColumn key={i} day={day} entries={entries} onPick={onPick} isLast={i === days.length - 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "Noon";
  return `${h - 12} PM`;
}

function AllDayStrip({ days, entries, onPick }: { days: Date[]; entries: Entry[]; onPick: (e: Entry) => void }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `60px repeat(${days.length}, 1fr)`,
        background: "#fcf7e8",
        borderBottom: "1px solid var(--line)",
        minHeight: 32,
      }}
    >
      <div
        style={{
          fontSize: "0.65rem",
          color: "var(--muted)",
          padding: "4px",
          textAlign: "right",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        All-day
      </div>
      {days.map((d, i) => {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);
        const list = entries.filter(
          (e) => e.allDay && e.startMs >= dayStart.getTime() && e.startMs <= dayEnd.getTime(),
        );
        return (
          <div
            key={i}
            style={{
              padding: 3,
              borderRight: i < days.length - 1 ? "1px dotted var(--line)" : "none",
            }}
          >
            {list.map((e) => (
              <div
                key={e.id}
                onClick={() => onPick(e)}
                style={entryChipStyle(e.color, e.kind === "birthday")}
              >
                {e.label}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function DayColumn({
  day,
  entries,
  onPick,
  isLast,
}: {
  day: Date;
  entries: Entry[];
  onPick: (e: Entry) => void;
  isLast: boolean;
}) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  const list = entries.filter(
    (e) => !e.allDay && e.startMs >= dayStart.getTime() && e.startMs <= dayEnd.getTime(),
  );

  return (
    <div
      style={{
        position: "relative",
        borderRight: isLast ? "none" : "1px solid var(--line)",
        background: "var(--cream-soft)",
      }}
    >
      {/* hour grid lines */}
      {HOURS.map((h) => (
        <div
          key={h}
          style={{ height: HOUR_HEIGHT, borderBottom: "1px solid var(--line)" }}
        />
      ))}
      {/* events */}
      {list.map((e) => {
        const start = new Date(e.startMs);
        const end = e.endMs ? new Date(e.endMs) : new Date(e.startMs + 60 * 60 * 1000);
        const startMin = start.getHours() * 60 + start.getMinutes();
        const endMin = Math.max(startMin + 30, end.getHours() * 60 + end.getMinutes());
        const top = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
        const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_HEIGHT);
        if (top < -HOUR_HEIGHT) return null;
        return (
          <div
            key={e.id}
            onClick={() => onPick(e)}
            style={{
              position: "absolute",
              top: Math.max(0, top),
              left: 4,
              right: 4,
              height,
              background: e.color,
              color: e.kind === "birthday" ? "var(--navy)" : "white",
              padding: "3px 6px",
              borderRadius: 4,
              fontSize: "0.78rem",
              cursor: "pointer",
              boxShadow: "var(--shadow)",
              overflow: "hidden",
            }}
          >
            <div style={{ fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {e.label}
            </div>
            <div style={{ fontSize: "0.7rem", opacity: 0.85 }}>
              {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              {e.endMs && (
                <>
                  {" – "}
                  {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const dayHeaderStyle: React.CSSProperties = {
  background: "var(--navy)",
  color: "var(--cream)",
  textAlign: "center",
  padding: "6px 2px",
  fontSize: "0.8rem",
  letterSpacing: 1,
};
const monthCell: React.CSSProperties = {
  background: "var(--cream-soft)",
  minHeight: 90,
  padding: 4,
  fontSize: "0.85rem",
};
const todayCell: React.CSSProperties = {
  ...monthCell,
  background: "#fff8e0",
  border: "2px solid var(--gold)",
};
const otherMonthCell: React.CSSProperties = {
  background: "var(--cream-deep)",
  minHeight: 90,
  padding: 4,
  fontSize: "0.85rem",
  opacity: 0.5,
};
const dayNumStyle: React.CSSProperties = {
  fontWeight: "bold",
  color: "var(--navy)",
  marginBottom: 2,
};

function entryChipStyle(color: string, isLight: boolean): React.CSSProperties {
  return {
    background: color,
    color: isLight ? "var(--navy)" : "var(--cream)",
    borderRadius: 3,
    padding: "1px 5px",
    marginTop: 2,
    fontSize: "0.7rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    cursor: "pointer",
  };
}

// ----- EVENT DETAIL MODAL -----
function EventDetailModal({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const [editing, setEditing] = useState(false);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(31, 44, 74, 0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--cream)",
          border: "2px solid var(--gold)",
          borderRadius: 8,
          padding: "22px 24px",
          maxWidth: 540,
          width: "100%",
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {editing ? (
          <EditForm entry={entry} onClose={onClose} onCancel={() => setEditing(false)} />
        ) : (
          <ViewDetail entry={entry} onClose={onClose} onEdit={() => setEditing(true)} />
        )}
      </div>
    </div>
  );
}

function ViewDetail({
  entry,
  onClose,
  onEdit,
}: {
  entry: Entry;
  onClose: () => void;
  onEdit: () => void;
}) {
  const start = new Date(entry.startMs);
  const end = entry.endMs ? new Date(entry.endMs) : null;
  const editable = entry.source === "icloud" || entry.source === "calendar_item";

  const onDelete = async () => {
    if (entry.source === "icloud" && entry.sourceId) {
      if (!confirm(`Delete "${entry.label}" from iCloud?`)) return;
      const res = await deleteICloudEvent(entry.sourceId);
      if (!res.ok) alert(res.error || "Delete failed");
      else onClose();
    } else if (entry.source === "calendar_item" && entry.sourceId) {
      if (!confirm(`Remove "${entry.label}"?`)) return;
      await deleteCalendarItem(entry.sourceId);
      onClose();
    }
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span
          style={{
            display: "inline-block",
            width: 14,
            height: 14,
            borderRadius: 3,
            background: entry.color,
            border: "1px solid var(--line)",
          }}
        />
        <h3 style={{ margin: 0, fontFamily: "'Garamond', serif", color: "var(--navy)", fontWeight: "normal", fontSize: "1.4rem" }}>
          {entry.label}
        </h3>
      </div>
      <div
        style={{
          color: "var(--muted)",
          fontStyle: "italic",
          fontSize: "0.85rem",
          borderBottom: "1px solid var(--line)",
          paddingBottom: 10,
          marginBottom: 14,
        }}
      >
        {labelForSource(entry.source)}
      </div>

      <Field label="When">
        {entry.allDay
          ? formatDate(start.toISOString().slice(0, 10))
          : `${start.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` +
            (end ? ` – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "")}
      </Field>
      {entry.location && <Field label="Location">{entry.location}</Field>}
      {entry.description && <Field label="Notes">{entry.description}</Field>}

      <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
        {editable && (
          <button className="btn" onClick={onEdit}>
            ✎ Edit
          </button>
        )}
        {editable && (
          <button className="btn" style={{ background: "var(--burgundy)" }} onClick={onDelete}>
            Delete
          </button>
        )}
        <button className="btn btn-secondary" onClick={onClose} style={{ marginLeft: editable ? 0 : "auto" }}>
          Close
        </button>
      </div>
    </>
  );
}

function labelForSource(s: Entry["source"]): string {
  if (s === "icloud") return "iCloud event · click Edit to change details";
  if (s === "calendar_item") return "Calendar item · stored on the family hub";
  if (s === "event") return "Family event · edit on the Events page";
  return "Birthday · edit on the Contacts page";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: "0.75rem", color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: "1rem" }}>{children}</div>
    </div>
  );
}

function EditForm({
  entry,
  onClose,
  onCancel,
}: {
  entry: Entry;
  onClose: () => void;
  onCancel: () => void;
}) {
  const start = new Date(entry.startMs);
  const end = entry.endMs ? new Date(entry.endMs) : null;
  const [summary, setSummary] = useState(entry.label);
  const [location, setLocation] = useState(entry.location || "");
  const [description, setDescription] = useState(entry.description || "");
  const [allDay, setAllDay] = useState(entry.allDay);
  const [date, setDate] = useState(start.toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(start.toTimeString().slice(0, 5));
  const [endTime, setEndTime] = useState(end ? end.toTimeString().slice(0, 5) : "");
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (entry.source === "icloud" && entry.sourceId) {
      const startIso = allDay
        ? new Date(date + "T00:00:00").toISOString()
        : new Date(date + "T" + startTime + ":00").toISOString();
      const endIso = allDay
        ? null
        : endTime
        ? new Date(date + "T" + endTime + ":00").toISOString()
        : null;
      const res = await updateICloudEvent({
        cached_event_id: entry.sourceId,
        summary,
        description,
        location,
        startIso,
        endIso,
        allDay,
      });
      setBusy(false);
      if (!res.ok) {
        alert(res.error || "Update failed");
        return;
      }
      onClose();
    } else if (entry.source === "calendar_item" && entry.sourceId) {
      // Calendar items only have name + date in our schema — ignore time fields.
      const res = await updateCalendarItem(entry.sourceId, summary.trim(), date);
      setBusy(false);
      if (!res.ok) {
        alert(res.error || "Update failed");
        return;
      }
      if (res.sync && !res.sync.ok && res.sync.reason !== "no_connection") {
        alert(
          "Saved on the Hub, but couldn't push to iCloud:\n\n" +
            (res.sync.error || res.sync.reason || "unknown reason"),
        );
      }
      onClose();
    } else {
      setBusy(false);
      onClose();
    }
  };

  return (
    <form onSubmit={save}>
      <h3 style={{ margin: "0 0 12px", fontFamily: "'Garamond', serif", color: "var(--navy)", fontWeight: "normal", fontSize: "1.3rem" }}>
        Edit event
      </h3>
      <label className="field">
        <span>Title</span>
        <input value={summary} onChange={(e) => setSummary(e.target.value)} required />
      </label>
      <label className="field">
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--navy)" }}
          />
          All-day event
        </span>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: allDay ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        {!allDay && (
          <>
            <label className="field">
              <span>Start time</span>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </label>
            <label className="field">
              <span>End time</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </>
        )}
      </div>
      <label className="field">
        <span>Location</span>
        <input value={location} onChange={(e) => setLocation(e.target.value)} />
      </label>
      <label className="field">
        <span>Notes</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ----- ADD CALENDAR ITEM -----
function AddCalendarItem() {
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayStr());
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;
    setBusy(true);
    const res = await createCalendarItem(name.trim(), date);
    setBusy(false);
    if (!res.ok) {
      alert(res.error || "Couldn't add the item");
      return;
    }
    if (res.sync && !res.sync.ok && res.sync.reason !== "no_connection") {
      alert(
        "Added to the Hub, but couldn't push to iCloud:\n\n" +
          (res.sync.error || res.sync.reason || "unknown reason"),
      );
    }
    setName("");
    setDate(todayStr());
  };

  return (
    <div className="card">
      <h3 style={{ margin: "0 0 6px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
        Add a calendar item
      </h3>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 0, marginBottom: 12 }}>
        For one-off items like appointments, anniversaries, or reminders. Pushed to your iCloud default calendar if connected.
      </p>
      <form
        onSubmit={submit}
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end" }}
      >
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Description</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Dentist appointment" />
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
  const upcoming = [...items].filter((i) => i.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = [...items].filter((i) => i.date < today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

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

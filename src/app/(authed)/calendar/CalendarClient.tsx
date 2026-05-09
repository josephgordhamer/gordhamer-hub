"use client";

import { useState } from "react";
import type { FamilyEvent, FamilyMember, CalendarItem } from "@/lib/types";
import { dateStr, getDisplayName, todayStr } from "@/lib/helpers";

export function CalendarClient({
  events,
  family,
  calendarItems,
}: {
  events: FamilyEvent[];
  family: FamilyMember[];
  calendarItems: CalendarItem[];
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

  const eventsOnDate: Record<number, string[]> = {};
  events.forEach((e) => {
    if (!e.date) return;
    const d = new Date(e.date + "T12:00:00");
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!eventsOnDate[day]) eventsOnDate[day] = [];
      eventsOnDate[day].push(e.name);
    }
  });
  calendarItems.forEach((item) => {
    const d = new Date(item.date + "T12:00:00");
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!eventsOnDate[day]) eventsOnDate[day] = [];
      eventsOnDate[day].push(item.name);
    }
  });
  family.forEach((f) => {
    if (!f.birthday) return;
    const d = new Date(f.birthday + "T12:00:00");
    if (d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsOnDate[day]) eventsOnDate[day] = [];
      eventsOnDate[day].push(`🎂 ${getDisplayName(f)}`);
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
        {eventsList.map((label, i) => (
          <div
            key={i}
            title={label}
            style={{
              background: "var(--navy)",
              color: "var(--cream)",
              borderRadius: 3,
              padding: "1px 4px",
              marginTop: 2,
              fontSize: "0.7rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        ))}
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
  );
}

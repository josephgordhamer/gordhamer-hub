"use client";

import { useState } from "react";
import type {
  FamilyMember,
  Job,
  JobCompletion,
  JobOverride,
  Frequency,
} from "@/lib/types";
import {
  FREQ_LABELS,
  addDays,
  dateStr,
  formatDate,
  getAssigneeForDate,
  getCompletionForDate,
  getDisplayName,
  getNameForDate,
  getNotesForDate,
  getRotationAssigneeForDate,
  hasInstanceOverride,
  isJobScheduledOnDate,
  parseDateStr,
  todayStr,
} from "@/lib/helpers";
import {
  toggleCompletion,
  setOverride,
  clearOverride,
  createJob,
  updateJob,
  deleteJob,
} from "./actions";

const FREQ_ORDER: Frequency[] = [
  "once",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
];

const FREQ_BORDER: Record<Frequency, string> = {
  once: "#4a7080",
  daily: "var(--navy)",
  weekly: "var(--gold)",
  biweekly: "#5d6d4a",
  monthly: "var(--burgundy)",
  quarterly: "#6b4e7a",
  yearly: "#4a4a4a",
  custom: "#5a5a5a",
};

const FREQ_BG: Record<Frequency, string> = {
  once: "#4a7080",
  daily: "var(--navy)",
  weekly: "var(--gold)",
  biweekly: "#5d6d4a",
  monthly: "var(--burgundy)",
  quarterly: "#6b4e7a",
  yearly: "#4a4a4a",
  custom: "#5a5a5a",
};

interface Props {
  family: FamilyMember[];
  jobs: Job[];
  completions: JobCompletion[];
  overrides: JobOverride[];
}

export function JobBoardClient({ family, jobs, completions, overrides }: Props) {
  const [view, setView] = useState<"calendar" | "manage">("calendar");
  const [calendarMode, setCalendarMode] = useState<"multi" | "single">("multi");
  const [calendarStart, setCalendarStart] = useState<string>(todayStr());
  const [singleDayDate, setSingleDayDate] = useState<string>(todayStr());
  const [filter, setFilter] = useState<string>("__all__");
  const [editingInstance, setEditingInstance] = useState<string | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);

  const matchesFilter = (job: Job, date: Date) => {
    if (filter === "__all__") return true;
    const a = getAssigneeForDate(job, date, overrides);
    if (filter === "Everyone") return a === "Everyone";
    return a === filter || a === "Everyone";
  };

  const stats = computeStats(jobs, completions, overrides);

  const renderFilter = () => (
    <select
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      style={{
        marginLeft: "auto",
        fontSize: "0.88rem",
        padding: "6px 10px",
        background: "white",
        border: "1px solid var(--line)",
        borderRadius: 4,
        width: "auto",
      }}
    >
      <option value="__all__">Show: All jobs</option>
      <option value="Everyone">Show: Everyone-tagged</option>
      {family.map((f) => (
        <option key={f.id} value={f.name}>
          Show: {getDisplayName(f)}&apos;s jobs
        </option>
      ))}
    </select>
  );

  const onCycleAssignee = async (job: Job, date: Date) => {
    const opts = ["Everyone", ...family.map((f) => f.name)];
    const current = getAssigneeForDate(job, date, overrides);
    const idx = opts.indexOf(current);
    const next = opts[((idx === -1 ? 0 : idx) + 1) % opts.length];
    await setOverride(job.id, dateStr(date), { assignee: next });
  };

  const onToggleDone = async (job: Job, date: Date) => {
    const assignee = getAssigneeForDate(job, date, overrides);
    await toggleCompletion(job.id, dateStr(date), assignee);
  };

  return (
    <>
      <h2 className="section-title">Family Job Board</h2>
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 22 }}>
        A scrolling calendar of family chores. Daily, weekly, monthly — with rotations.
      </p>

      <div
        className="card"
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "14px 18px",
        }}
      >
        <Stat num={stats.overdue} label="Overdue" color="var(--burgundy)" />
        <Stat num={stats.dueToday} label="Due Today" color="var(--gold)" />
        <Stat num={stats.doneToday} label="Done Today" color="#5d6d4a" />
        <Stat num={stats.total} label="Total Jobs" color="var(--navy)" />
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "2px solid var(--line)", flexWrap: "wrap" }}>
        <TabBtn active={view === "calendar"} onClick={() => setView("calendar")}>Calendar</TabBtn>
        <TabBtn active={view === "manage"} onClick={() => setView("manage")}>Manage Jobs</TabBtn>
      </div>

      {view === "calendar" && calendarMode === "multi" && (
        <MultiDayCalendar
          jobs={jobs}
          family={family}
          completions={completions}
          overrides={overrides}
          startDate={calendarStart}
          onShiftWeek={(d) => setCalendarStart(dateStr(addDays(parseDateStr(calendarStart), d)))}
          onJumpToday={() => setCalendarStart(todayStr())}
          onOpenSingleDay={(ds) => {
            setSingleDayDate(ds);
            setCalendarMode("single");
          }}
          onToggleDone={onToggleDone}
          onCycle={onCycleAssignee}
          onQuickAdd={(ds) => setQuickAddDate(ds)}
          matchesFilter={matchesFilter}
          renderFilter={renderFilter}
        />
      )}

      {view === "calendar" && calendarMode === "single" && (
        <SingleDayView
          jobs={jobs}
          family={family}
          completions={completions}
          overrides={overrides}
          singleDayDate={singleDayDate}
          setSingleDayDate={setSingleDayDate}
          backToMulti={() => setCalendarMode("multi")}
          onToggleDone={onToggleDone}
          onCycle={onCycleAssignee}
          editingInstance={editingInstance}
          setEditingInstance={setEditingInstance}
          onQuickAdd={(ds) => setQuickAddDate(ds)}
          matchesFilter={matchesFilter}
          renderFilter={renderFilter}
        />
      )}

      {view === "manage" && (
        <ManageJobs jobs={jobs} family={family} />
      )}

      {quickAddDate && (
        <QuickAddModal
          date={quickAddDate}
          family={family}
          onClose={() => setQuickAddDate(null)}
        />
      )}
    </>
  );
}

function computeStats(jobs: Job[], completions: JobCompletion[], overrides: JobOverride[]) {
  const todayDS = todayStr();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let overdue = 0;
  let dueToday = 0;
  let doneToday = 0;
  jobs.forEach((j) => {
    if (completions.some((c) => c.job_id === j.id && c.date === todayDS)) doneToday++;
    if (
      isJobScheduledOnDate(j, today) &&
      !completions.some((c) => c.job_id === j.id && c.date === todayDS)
    )
      dueToday++;
    for (let i = 1; i <= 30; i++) {
      const past = addDays(today, -i);
      const ds = dateStr(past);
      if (
        isJobScheduledOnDate(j, past) &&
        !completions.some((c) => c.job_id === j.id && c.date === ds)
      )
        overdue++;
    }
  });
  return { overdue, dueToday, doneToday, total: jobs.length };
}

function Stat({ num, label, color }: { num: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center", padding: "6px 12px" }}>
      <span
        style={{
          fontFamily: "'Garamond', serif",
          fontSize: "1.7rem",
          color,
          display: "block",
          lineHeight: 1,
        }}
      >
        {num}
      </span>
      <span
        style={{
          fontSize: "0.72rem",
          color: "var(--muted)",
          letterSpacing: 1,
          textTransform: "uppercase",
          marginTop: 4,
          display: "block",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function TabBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        padding: "8px 16px",
        fontFamily: "inherit",
        fontSize: "0.92rem",
        cursor: "pointer",
        color: active ? "var(--navy)" : "var(--muted)",
        borderBottom: active ? "3px solid var(--gold)" : "3px solid transparent",
        marginBottom: -2,
        fontWeight: active ? "bold" : "normal",
      }}
    >
      {children}
    </button>
  );
}

function MultiDayCalendar({
  jobs,
  family,
  completions,
  overrides,
  startDate,
  onShiftWeek,
  onJumpToday,
  onOpenSingleDay,
  onToggleDone,
  onCycle,
  onQuickAdd,
  matchesFilter,
  renderFilter,
}: {
  jobs: Job[];
  family: FamilyMember[];
  completions: JobCompletion[];
  overrides: JobOverride[];
  startDate: string;
  onShiftWeek: (n: number) => void;
  onJumpToday: () => void;
  onOpenSingleDay: (ds: string) => void;
  onToggleDone: (j: Job, d: Date) => void;
  onCycle: (j: Job, d: Date) => void;
  onQuickAdd: (ds: string) => void;
  matchesFilter: (j: Job, d: Date) => boolean;
  renderFilter: () => React.ReactNode;
}) {
  const start = parseDateStr(startDate);
  const days: Date[] = [];
  for (let i = 0; i < 14; i++) days.push(addDays(start, i));
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = days[days.length - 1].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const todayMid = new Date();
  todayMid.setHours(0, 0, 0, 0);

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={() => onShiftWeek(-7)}>
          ◀ Prev Week
        </button>
        <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={onJumpToday}>
          Jump to Today
        </button>
        <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={() => onShiftWeek(7)}>
          Next Week ▶
        </button>
        {renderFilter()}
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic", margin: "-4px 0 8px" }}>
        {startLabel} — {endLabel}
      </p>
      <div
        style={{
          overflowX: "auto",
          border: "1px solid var(--line)",
          borderRadius: 6,
          background: "var(--cream-soft)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ display: "flex", minWidth: "max-content" }}>
          {days.map((date) => {
            const ds = dateStr(date);
            const isToday = ds === todayStr();
            const isPast = date < todayMid;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
            const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const scheduled = jobs
              .filter((j) => isJobScheduledOnDate(j, date) && matchesFilter(j, date))
              .sort((a, b) => {
                const fa = FREQ_ORDER.indexOf(a.frequency);
                const fb = FREQ_ORDER.indexOf(b.frequency);
                if (fa !== fb) return fa - fb;
                return getNameForDate(a, date, overrides).localeCompare(
                  getNameForDate(b, date, overrides),
                );
              });

            return (
              <div
                key={ds}
                style={{
                  flex: "0 0 165px",
                  borderRight: "1px solid var(--line)",
                  display: "flex",
                  flexDirection: "column",
                  background: isToday
                    ? "#fffbe9"
                    : isWeekend
                    ? "#f4ecd6"
                    : isPast
                    ? "rgba(0,0,0,0.03)"
                    : "var(--cream-soft)",
                }}
              >
                <div
                  onClick={() => onOpenSingleDay(ds)}
                  style={{
                    background: isToday ? "var(--burgundy)" : "var(--navy)",
                    color: "var(--cream)",
                    padding: "8px 6px",
                    textAlign: "center",
                    borderBottom: "2px solid var(--gold)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", letterSpacing: 1, color: isToday ? "#f5d490" : "var(--gold-soft)", textTransform: "uppercase" }}>
                    {dayName}
                    {isToday ? " · Today" : ""}
                  </div>
                  <div style={{ fontFamily: "'Garamond', serif", fontSize: "1rem", marginTop: 2 }}>
                    {monthDay}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: isToday ? "#f5d490" : "var(--gold-soft)", letterSpacing: 1, marginTop: 3, opacity: 0.6 }}>
                    ▾ Tap for detail
                  </div>
                </div>
                <div style={{ padding: 5, flex: 1, minHeight: 220 }}>
                  {scheduled.length === 0 && (
                    <div style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic", fontSize: "0.78rem", padding: "8px 0" }}>
                      — no jobs —
                    </div>
                  )}
                  {scheduled.map((job) => (
                    <ThinRibbon
                      key={job.id}
                      job={job}
                      date={date}
                      family={family}
                      completions={completions}
                      overrides={overrides}
                      onToggleDone={onToggleDone}
                      onCycle={onCycle}
                      isPast={isPast && !isToday}
                    />
                  ))}
                  <button
                    onClick={() => onQuickAdd(ds)}
                    style={{
                      display: "block",
                      width: "calc(100% - 4px)",
                      margin: "4px 2px",
                      background: "transparent",
                      border: "1px dashed var(--line)",
                      color: "var(--muted)",
                      padding: "4px 6px",
                      borderRadius: 3,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "0.72rem",
                    }}
                  >
                    + Add Job
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 12, fontStyle: "italic" }}>
        Click a day&apos;s <strong>header</strong> to open detail view · click any ribbon to mark done · ✎ = edited just for that day.
      </p>
    </>
  );
}

function ThinRibbon({
  job,
  date,
  family,
  completions,
  overrides,
  onToggleDone,
  onCycle,
  isPast,
}: {
  job: Job;
  date: Date;
  family: FamilyMember[];
  completions: JobCompletion[];
  overrides: JobOverride[];
  onToggleDone: (j: Job, d: Date) => void;
  onCycle: (j: Job, d: Date) => void;
  isPast: boolean;
}) {
  const completion = getCompletionForDate(job, date, completions);
  const assignee = getAssigneeForDate(job, date, overrides);
  const name = getNameForDate(job, date, overrides);
  const overridden = hasInstanceOverride(job, date, overrides);
  const isComplete = !!completion;
  const isOverdue = isPast && !isComplete;
  const shortName =
    assignee === "Everyone" ? "All" : getDisplayName(assignee, family);
  let borderColor = FREQ_BORDER[job.frequency];
  let bg = "white";
  if (isComplete) {
    borderColor = "#5d6d4a";
    bg = "#eef2e6";
  } else if (isOverdue) {
    borderColor = "var(--burgundy)";
    bg = "#fbf0f0";
  }
  return (
    <div
      onClick={() => onToggleDone(job, date)}
      title={`${name} — ${assignee}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 5px",
        marginBottom: 2,
        borderRadius: 3,
        background: bg,
        borderLeft: `3px solid ${borderColor}`,
        fontSize: "0.74rem",
        cursor: "pointer",
        opacity: isComplete ? 0.7 : 1,
        textDecoration: isComplete ? "line-through" : "none",
      }}
    >
      <span style={{ fontWeight: "bold", color: isComplete ? "#5d6d4a" : isOverdue ? "var(--burgundy)" : "var(--navy)" }}>
        {isComplete ? "✓" : isOverdue ? "!" : "○"}
      </span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
        {overridden && <span style={{ color: "var(--burgundy)", fontSize: "0.7rem", marginLeft: 2 }}>✎</span>}
      </span>
      <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontStyle: "italic", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {shortName}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCycle(job, date);
        }}
        title="Cycle to next person"
        style={{
          background: "white",
          border: "1px solid var(--line)",
          color: "var(--muted)",
          padding: 0,
          width: 18,
          height: 18,
          borderRadius: "50%",
          fontSize: "0.65rem",
          cursor: "pointer",
          flexShrink: 0,
          fontWeight: "bold",
          lineHeight: 1,
          marginLeft: -2,
        }}
      >
        ↻
      </button>
    </div>
  );
}

function SingleDayView({
  jobs,
  family,
  completions,
  overrides,
  singleDayDate,
  setSingleDayDate,
  backToMulti,
  onToggleDone,
  onCycle,
  editingInstance,
  setEditingInstance,
  onQuickAdd,
  matchesFilter,
  renderFilter,
}: {
  jobs: Job[];
  family: FamilyMember[];
  completions: JobCompletion[];
  overrides: JobOverride[];
  singleDayDate: string;
  setSingleDayDate: (ds: string) => void;
  backToMulti: () => void;
  onToggleDone: (j: Job, d: Date) => void;
  onCycle: (j: Job, d: Date) => void;
  editingInstance: string | null;
  setEditingInstance: (id: string | null) => void;
  onQuickAdd: (ds: string) => void;
  matchesFilter: (j: Job, d: Date) => boolean;
  renderFilter: () => React.ReactNode;
}) {
  const date = parseDateStr(singleDayDate);
  const isToday = singleDayDate === todayStr();
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const allScheduled = jobs.filter((j) => isJobScheduledOnDate(j, date));
  const scheduled = allScheduled
    .filter((j) => matchesFilter(j, date))
    .sort((a, b) => {
      const fa = FREQ_ORDER.indexOf(a.frequency);
      const fb = FREQ_ORDER.indexOf(b.frequency);
      if (fa !== fb) return fa - fb;
      return getNameForDate(a, date, overrides).localeCompare(
        getNameForDate(b, date, overrides),
      );
    });

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={backToMulti}>
          ⤺ Back to Week View
        </button>
        <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={() => setSingleDayDate(dateStr(addDays(date, -1)))}>
          ◀ Prev Day
        </button>
        <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={() => setSingleDayDate(todayStr())}>
          Today
        </button>
        <button className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "4px 10px" }} onClick={() => setSingleDayDate(dateStr(addDays(date, 1)))}>
          Next Day ▶
        </button>
        {renderFilter()}
      </div>
      <div
        style={{
          background: "var(--cream-soft)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: 18,
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ borderBottom: "2px solid var(--gold)", paddingBottom: 12, marginBottom: 16 }}>
          <h3
            style={{
              fontFamily: "'Garamond', serif",
              fontSize: "1.5rem",
              color: "var(--navy)",
              margin: 0,
              fontWeight: "normal",
            }}
          >
            {dateLabel}
            {isToday ? " · Today" : ""}
          </h3>
          <div style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.9rem", marginTop: 4 }}>
            {scheduled.length} of {allScheduled.length} job{allScheduled.length === 1 ? "" : "s"} shown
          </div>
        </div>
        {scheduled.length === 0 ? (
          <p style={{ color: "var(--muted)", fontStyle: "italic", textAlign: "center", padding: "24px 12px" }}>
            {allScheduled.length === 0 ? "No jobs scheduled for this day." : "No jobs match the current filter."}
          </p>
        ) : (
          scheduled.map((job) =>
            editingInstance === job.id ? (
              <EditPanel
                key={job.id}
                job={job}
                date={date}
                family={family}
                overrides={overrides}
                onClose={() => setEditingInstance(null)}
              />
            ) : (
              <WideRibbon
                key={job.id}
                job={job}
                date={date}
                family={family}
                completions={completions}
                overrides={overrides}
                onToggleDone={onToggleDone}
                onCycle={onCycle}
                onEdit={() => setEditingInstance(job.id)}
              />
            ),
          )
        )}
        <button
          onClick={() => onQuickAdd(singleDayDate)}
          style={{
            display: "block",
            width: "100%",
            marginTop: 12,
            background: "transparent",
            border: "2px dashed var(--line)",
            color: "var(--muted)",
            padding: 12,
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "0.95rem",
            fontStyle: "italic",
          }}
        >
          + Add a one-time job for this day
        </button>
      </div>
    </>
  );
}

function WideRibbon({
  job,
  date,
  family,
  completions,
  overrides,
  onToggleDone,
  onCycle,
  onEdit,
}: {
  job: Job;
  date: Date;
  family: FamilyMember[];
  completions: JobCompletion[];
  overrides: JobOverride[];
  onToggleDone: (j: Job, d: Date) => void;
  onCycle: (j: Job, d: Date) => void;
  onEdit: () => void;
}) {
  const completion = getCompletionForDate(job, date, completions);
  const isComplete = !!completion;
  const todayMid = new Date();
  todayMid.setHours(0, 0, 0, 0);
  const isPast = new Date(date.getFullYear(), date.getMonth(), date.getDate()) < todayMid;
  const isOverdue = isPast && !isComplete;
  const overridden = hasInstanceOverride(job, date, overrides);
  const name = getNameForDate(job, date, overrides);
  const assignee = getAssigneeForDate(job, date, overrides);
  const notes = getNotesForDate(job, date, overrides);
  const freqLabel =
    job.frequency === "custom" ? `Every ${job.custom_days}d` : FREQ_LABELS[job.frequency];

  let borderColor = FREQ_BORDER[job.frequency];
  let bg = "white";
  if (isComplete) {
    borderColor = "#5d6d4a";
    bg = "#eef2e6";
  } else if (isOverdue) {
    borderColor = "var(--burgundy)";
    bg = "#fbf0f0";
  } else if (overridden) {
    bg = "#faf3df";
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        marginBottom: 6,
        borderRadius: 5,
        background: bg,
        border: "1px solid var(--line)",
        borderLeft: `5px solid ${borderColor}`,
        fontSize: "0.92rem",
        minHeight: 36,
        opacity: isComplete ? 0.78 : 1,
      }}
    >
      <span
        style={{
          fontSize: "1.15rem",
          fontWeight: "bold",
          color: isComplete ? "#5d6d4a" : isOverdue ? "var(--burgundy)" : "var(--navy)",
          width: 22,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {isComplete ? "✓" : isOverdue ? "!" : "○"}
      </span>
      <span
        style={{
          fontWeight: "bold",
          color: "var(--navy)",
          flex: 1,
          minWidth: 80,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textDecoration: isComplete ? "line-through" : "none",
        }}
      >
        {name}
        {overridden && (
          <span
            style={{
              fontSize: "0.6rem",
              background: "var(--burgundy)",
              color: "var(--cream)",
              padding: "1px 6px",
              borderRadius: 8,
              marginLeft: 6,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              fontWeight: "bold",
              verticalAlign: "middle",
            }}
          >
            edit
          </span>
        )}
      </span>
      <FreqBadge freq={job.frequency} label={freqLabel} />
      <span
        style={{
          background: "var(--navy)",
          color: "var(--cream)",
          padding: "2px 9px",
          borderRadius: 10,
          fontSize: "0.75rem",
        }}
      >
        {getDisplayName(assignee, family)}
      </span>
      <button
        onClick={() => onCycle(job, date)}
        title="Cycle to next person"
        style={{
          background: "white",
          border: "1px solid var(--line)",
          color: "var(--muted)",
          padding: 0,
          width: 22,
          height: 22,
          borderRadius: "50%",
          fontSize: "0.85rem",
          cursor: "pointer",
          flexShrink: 0,
          fontWeight: "bold",
        }}
      >
        ↻
      </button>
      {notes && (
        <span title={notes} style={{ cursor: "help", fontSize: "0.95rem", opacity: 0.7 }}>
          📝
        </span>
      )}
      {completion && completion.completed_by !== assignee && (
        <span style={{ color: "#5d6d4a", fontStyle: "italic", fontSize: "0.78rem" }}>
          by {getDisplayName(completion.completed_by ?? "", family)}
        </span>
      )}
      <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexShrink: 0 }}>
        <button className="btn btn-secondary" style={{ padding: "3px 9px", fontSize: "0.75rem" }} onClick={onEdit}>
          ✎
        </button>
        <button
          className={isComplete ? "btn btn-secondary" : "btn"}
          style={{ padding: "3px 9px", fontSize: "0.75rem" }}
          onClick={() => onToggleDone(job, date)}
        >
          {isComplete ? "Undo" : "✓ Done"}
        </button>
      </div>
    </div>
  );
}

function FreqBadge({ freq, label }: { freq: Frequency; label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "0.7rem",
        padding: "2px 8px",
        borderRadius: 10,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        color: freq === "weekly" ? "var(--navy)" : "white",
        fontWeight: "bold",
        background: FREQ_BG[freq],
      }}
    >
      {label}
    </span>
  );
}

function EditPanel({
  job,
  date,
  family,
  overrides,
  onClose,
}: {
  job: Job;
  date: Date;
  family: FamilyMember[];
  overrides: JobOverride[];
  onClose: () => void;
}) {
  const [name, setName] = useState(getNameForDate(job, date, overrides));
  const [assignee, setAssignee] = useState(getAssigneeForDate(job, date, overrides));
  const [notes, setNotes] = useState(getNotesForDate(job, date, overrides));
  const [busy, setBusy] = useState(false);
  const ds = dateStr(date);
  const masterAssignee = getRotationAssigneeForDate(job, date);
  const overridden = hasInstanceOverride(job, date, overrides);
  const opts = ["Everyone", ...family.map((f) => f.name)];

  const save = async () => {
    setBusy(true);
    await setOverride(job.id, ds, {
      name: name.trim() === job.name ? null : name.trim(),
      assignee: assignee === masterAssignee ? null : assignee,
      notes: notes.trim() || null,
    });
    setBusy(false);
    onClose();
  };

  const reset = async () => {
    if (!confirm("Remove all per-day edits for this instance?")) return;
    await clearOverride(job.id, ds);
    onClose();
  };

  return (
    <div
      style={{
        background: "var(--cream)",
        border: "1px solid var(--line)",
        borderLeft: "5px solid var(--burgundy)",
        borderRadius: 5,
        padding: "16px 20px",
        marginBottom: 6,
      }}
    >
      <h4
        style={{
          margin: "0 0 12px",
          color: "var(--navy)",
          fontFamily: "'Garamond', serif",
          fontWeight: "normal",
          fontSize: "1.15rem",
          borderBottom: "1px solid var(--line)",
          paddingBottom: 6,
        }}
      >
        Editing for <span style={{ color: "var(--burgundy)", fontStyle: "italic" }}>{formatDate(ds)}</span>
      </h4>
      <label className="field">
        <span>
          Job name <em style={{ color: "var(--muted)", fontWeight: "normal" }}>(master: &quot;{job.name}&quot;)</em>
        </span>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>
          Assigned to{" "}
          <em style={{ color: "var(--muted)", fontWeight: "normal" }}>
            (rotation default: {masterAssignee})
          </em>
        </span>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          {opts.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Notes for this day (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., 'Use the new vacuum bag' or 'Skip if raining'" />
      </label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Save Changes"}
        </button>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        {overridden && (
          <button className="btn btn-secondary" onClick={reset}>↻ Reset to Master</button>
        )}
      </div>
    </div>
  );
}

function QuickAddModal({
  date,
  family,
  onClose,
}: {
  date: string;
  family: FamilyMember[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [assignee, setAssignee] = useState("Everyone");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const dateLabel = parseDateStr(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const isToday = date === todayStr();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await createJob({
      name: name.trim(),
      frequency: "once",
      custom_days: null,
      start_date: date,
      rotation: [assignee],
      notes,
    });
    setBusy(false);
    onClose();
  };

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
          maxWidth: 500,
          width: "100%",
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
        }}
      >
        <h3
          style={{
            margin: "0 0 4px",
            fontFamily: "'Garamond', serif",
            color: "var(--navy)",
            fontWeight: "normal",
            fontSize: "1.35rem",
          }}
        >
          Add a one-time job
        </h3>
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
          For {dateLabel}
          {isToday ? " (Today)" : ""}
        </div>
        <form onSubmit={save}>
          <label className="field">
            <span>What needs doing?</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Pick up dry cleaning"
              autoFocus
            />
          </label>
          <label className="field">
            <span>Who&apos;s doing it?</span>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="Everyone">Everyone</option>
              {family.map((f) => (
                <option key={f.id} value={f.name}>
                  {getDisplayName(f)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Notes (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any details..." style={{ minHeight: 50 }} />
          </label>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Adding..." : "Add Job"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageJobs({ jobs, family }: { jobs: Job[]; family: FamilyMember[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const startEdit = (job: Job) => {
    setEditingJob(job);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {editingJob && (
        <JobForm
          editing={editingJob}
          family={family}
          onClose={() => setEditingJob(null)}
        />
      )}

      <div className="card" style={{ padding: 0 }}>
        <h3
          style={{
            padding: "14px 16px 0",
            margin: 0,
            color: "var(--navy)",
            fontFamily: "'Garamond', serif",
            fontWeight: "normal",
          }}
        >
          All Recurring Jobs
        </h3>
        {jobs.length === 0 ? (
          <p style={{ color: "var(--muted)", fontStyle: "italic", padding: 14 }}>
            No jobs yet. Add one below.
          </p>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: 12,
                borderBottom: "1px solid var(--line)",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <strong style={{ color: "var(--navy)", fontSize: "1rem" }}>{job.name}</strong>
                <div style={{ marginTop: 4 }}>
                  <FreqBadge
                    freq={job.frequency}
                    label={job.frequency === "custom" ? `Every ${job.custom_days}d` : FREQ_LABELS[job.frequency]}
                  />
                  <span style={{ color: "var(--muted)", fontSize: "0.82rem", marginLeft: 6 }}>
                    since {formatDate(job.start_date)}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--ink)", marginTop: 4 }}>
                  {job.rotation.length === 1 ? (
                    <>Always: <strong>{getDisplayName(job.rotation[0], family)}</strong></>
                  ) : (
                    <>
                      Rotates:{" "}
                      {job.rotation.map((n, i) => (
                        <span key={i}>
                          <strong>{getDisplayName(n, family)}</strong>
                          {i < job.rotation.length - 1 && (
                            <span style={{ color: "var(--gold)", margin: "0 4px" }}>→</span>
                          )}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "0.85rem", padding: "4px 10px" }}
                  onClick={() => startEdit(job)}
                >
                  ✎ Edit
                </button>
                <button
                  className="btn"
                  style={{ background: "var(--burgundy)", fontSize: "0.85rem", padding: "4px 10px" }}
                  onClick={async () => {
                    if (!confirm("Remove this job?")) return;
                    await deleteJob(job.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm ? (
        <JobForm family={family} onClose={() => setShowForm(false)} />
      ) : (
        !editingJob && (
          <button className="btn" onClick={() => setShowForm(true)} style={{ marginTop: 8 }}>
            + Add a Recurring Job
          </button>
        )
      )}
    </>
  );
}

function JobForm({
  family,
  editing,
  onClose,
}: {
  family: FamilyMember[];
  editing?: Job;
  onClose: () => void;
}) {
  const [name, setName] = useState(editing?.name || "");
  const [frequency, setFrequency] = useState<Frequency>(editing?.frequency || "weekly");
  const [customDays, setCustomDays] = useState(editing?.custom_days?.toString() || "");
  const [startDate, setStartDate] = useState(editing?.start_date || todayStr());
  const [rotation, setRotation] = useState<string[]>(editing?.rotation ? [...editing.rotation] : []);
  const [busy, setBusy] = useState(false);
  const opts = ["Everyone", ...family.map((f) => f.name)];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Job name required.");
    if (rotation.length === 0) return alert("Pick at least one family member for the rotation.");
    if (frequency === "custom" && !customDays) return alert("Days between is required for custom.");
    setBusy(true);
    const data = {
      name: name.trim(),
      frequency,
      custom_days: frequency === "custom" ? Number(customDays) : null,
      start_date: startDate,
      rotation,
    };
    if (editing) {
      await updateJob(editing.id, data);
    } else {
      await createJob(data);
    }
    setBusy(false);
    onClose();
  };

  return (
    <div className="card">
      <h3
        style={{
          margin: "0 0 12px",
          color: "var(--navy)",
          fontFamily: "'Garamond', serif",
          fontWeight: "normal",
        }}
      >
        {editing ? `Edit: ${editing.name}` : "Add a New Job"}
      </h3>
      <form onSubmit={save}>
        <label className="field">
          <span>Job description</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Wash dishes after dinner" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label className="field">
            <span>How often?</span>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Every 3 months</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom (every X days)</option>
            </select>
          </label>
          {frequency === "custom" && (
            <label className="field">
              <span>Days between</span>
              <input type="number" min="1" value={customDays} onChange={(e) => setCustomDays(e.target.value)} />
            </label>
          )}
          <label className="field">
            <span>Start date</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>
            Who does this job?{" "}
            <em style={{ color: "var(--muted)", fontWeight: "normal" }}>
              (Pick one for &quot;always&quot;, several for rotation)
            </em>
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {opts.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setRotation([...rotation, name])}
                style={{
                  background: "var(--cream-deep)",
                  color: "var(--navy)",
                  border: "1px solid var(--line)",
                  padding: "5px 12px",
                  borderRadius: 14,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                + {getDisplayName(name, family)}
              </button>
            ))}
          </div>
          <div
            style={{
              background: "white",
              padding: "10px 12px",
              border: "1px dashed var(--line)",
              borderRadius: 4,
              marginTop: 6,
              fontSize: "0.9rem",
              minHeight: 38,
            }}
          >
            {rotation.length === 0 ? (
              <em style={{ color: "var(--muted)" }}>
                No one yet — click family members above to add them in rotation order.
              </em>
            ) : (
              rotation.map((name, i) => (
                <span key={i}>
                  <span
                    onClick={() => setRotation(rotation.filter((_, idx) => idx !== i))}
                    style={{
                      display: "inline-block",
                      background: "var(--navy)",
                      color: "var(--cream)",
                      padding: "4px 10px",
                      borderRadius: 12,
                      margin: 2,
                      cursor: "pointer",
                      fontSize: "0.82rem",
                    }}
                  >
                    {i + 1}. {getDisplayName(name, family)} ✕
                  </span>
                  {i < rotation.length - 1 && (
                    <span style={{ color: "var(--gold)", margin: "0 2px", fontWeight: "bold" }}>→</span>
                  )}
                </span>
              ))
            )}
          </div>
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Saving..." : editing ? "Save Changes" : "Add Job"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

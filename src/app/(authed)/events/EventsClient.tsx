"use client";

import { useState } from "react";
import type { FamilyEvent, EventTask, FamilyMember } from "@/lib/types";
import { formatDate, getDisplayName } from "@/lib/helpers";
import {
  createEvent,
  deleteEvent,
  addTask,
  toggleTask,
  deleteTask,
} from "./actions";

export function EventsClient({
  events,
  tasksByEvent,
  family,
}: {
  events: FamilyEvent[];
  tasksByEvent: Record<string, EventTask[]>;
  family: FamilyMember[];
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createEvent(name.trim(), date || null);
    setName("");
    setDate("");
  };

  return (
    <>
      <div className="card">
        <h3 style={{ margin: "0 0 10px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
          Create New Event
        </h3>
        <form onSubmit={onAdd} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Event name" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn" type="submit" style={{ gridColumn: "1 / -1", maxWidth: 160 }}>
            Add Event
          </button>
        </form>
      </div>

      {events.length === 0 ? (
        <p style={{ color: "var(--muted)", fontStyle: "italic" }}>No events yet. Add one above.</p>
      ) : (
        events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            tasks={tasksByEvent[event.id] || []}
            family={family}
          />
        ))
      )}
    </>
  );
}

function EventCard({
  event,
  tasks,
  family,
}: {
  event: FamilyEvent;
  tasks: EventTask[];
  family: FamilyMember[];
}) {
  const [taskName, setTaskName] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskParent, setTaskParent] = useState<string>("");
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const parents = tasks.filter((t) => !t.parent_task_id);

  const onAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    await addTask(event.id, taskName.trim(), taskAssignee || null, taskParent || null);
    setTaskName("");
  };

  return (
    <div
      style={{
        background: "var(--cream-soft)",
        border: "1px solid var(--line)",
        borderRadius: 6,
        padding: 16,
        marginBottom: 16,
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 10,
          borderBottom: "1px solid var(--line)",
          paddingBottom: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <h3 style={{ margin: 0, color: "var(--navy)", fontFamily: "'Garamond', serif", fontSize: "1.4rem", fontWeight: "normal" }}>
            {event.name}
          </h3>
          <div style={{ color: "var(--burgundy)", fontStyle: "italic", fontSize: "0.9rem" }}>
            {event.date ? formatDate(event.date) : "Date TBD"}
          </div>
        </div>
        <button
          className="btn"
          style={{ background: "var(--burgundy)", fontSize: "0.85rem", padding: "4px 10px" }}
          onClick={async () => {
            if (confirm(`Delete "${event.name}" and all its tasks?`)) await deleteEvent(event.id);
          }}
        >
          Delete Event
        </button>
      </div>
      <div style={{ background: "var(--cream-deep)", borderRadius: 10, height: 8, overflow: "hidden", margin: "8px 0" }}>
        <div style={{ background: "var(--gold)", height: "100%", width: `${pct}%`, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
        {done} of {total} tasks complete ({pct}%)
      </div>

      <div style={{ marginTop: 12 }}>
        {parents.map((t) => (
          <TaskRow key={t.id} task={t} family={family} subtask={false} onToggle={toggleTask} onDelete={deleteTask} />
        ))}
        {parents.map((p) =>
          tasks
            .filter((s) => s.parent_task_id === p.id)
            .map((s) => (
              <TaskRow key={s.id} task={s} family={family} subtask={true} onToggle={toggleTask} onDelete={deleteTask} />
            )),
        )}
      </div>

      <form
        onSubmit={onAddTask}
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}
      >
        <input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="New task or subtask"
          style={{ flex: 1, minWidth: 120 }}
        />
        <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} style={{ width: "auto" }}>
          <option value="">— Anyone —</option>
          {family.map((f) => (
            <option key={f.id} value={f.name}>
              {getDisplayName(f)}
            </option>
          ))}
        </select>
        <select value={taskParent} onChange={(e) => setTaskParent(e.target.value)} style={{ width: "auto" }}>
          <option value="">— Top-level —</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              ↳ under: {p.name}
            </option>
          ))}
        </select>
        <button className="btn" type="submit" style={{ fontSize: "0.85rem", padding: "4px 10px" }}>
          Add Task
        </button>
      </form>
    </div>
  );
}

function TaskRow({
  task,
  family,
  subtask,
  onToggle,
  onDelete,
}: {
  task: EventTask;
  family: FamilyMember[];
  subtask: boolean;
  onToggle: (id: string, done: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 8px",
        borderBottom: "1px dotted var(--line)",
        paddingLeft: subtask ? 32 : 8,
        background: subtask ? "rgba(255,255,255,0.5)" : undefined,
        opacity: task.done ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => onToggle(task.id, e.target.checked)}
        style={{ accentColor: "var(--navy)", cursor: "pointer" }}
      />
      <span
        style={{
          flex: 1,
          fontSize: "0.95rem",
          textDecoration: task.done ? "line-through" : "none",
        }}
      >
        {task.name}
      </span>
      <span
        style={{
          fontSize: "0.78rem",
          color: "var(--muted)",
          background: "var(--cream-deep)",
          padding: "2px 8px",
          borderRadius: 10,
        }}
      >
        {getDisplayName(task.assignee || "Unassigned", family)}
      </span>
      <button
        className="btn"
        style={{ background: "var(--burgundy)", fontSize: "0.75rem", padding: "2px 8px" }}
        onClick={async () => {
          if (confirm("Delete this task?")) await onDelete(task.id);
        }}
      >
        ×
      </button>
    </div>
  );
}

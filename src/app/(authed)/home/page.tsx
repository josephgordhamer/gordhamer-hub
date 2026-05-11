import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  FamilyEvent,
  FamilyMember,
  Job,
  JobCompletion,
  PageRequest,
  Resource,
  ScripturePlanEntry,
} from "@/lib/types";
import {
  getDisplayName,
  getRotationAssigneeForDate,
  isJobScheduledOnDate,
  todayStr,
} from "@/lib/helpers";
import { MothersDaySplash } from "./MothersDaySplash";

// True on the 2nd Sunday of May (US Mother's Day) — auto-reverts the day after.
function isUsMothersDay(d: Date): boolean {
  if (d.getMonth() !== 4) return false; // May
  if (d.getDay() !== 0) return false;   // Sunday
  const dom = d.getDate();
  return dom >= 8 && dom <= 14;         // 2nd Sunday window
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { dashboard?: string };
}) {
  // Show the splash on Mother's Day, unless the user has clicked
  // "Continue to the Hub" (which sets ?dashboard=1).
  if (isUsMothersDay(new Date()) && searchParams?.dashboard !== "1") {
    return <MothersDaySplash />;
  }
  return <Dashboard />;
}

async function Dashboard() {
  const supabase = createClient();
  const [familyRes, jobsRes, complRes, eventsRes, planRes, resRes, reqRes] = await Promise.all([
    supabase.from("family_members").select("*").is("deleted_at", null).order("position", { ascending: true }),
    supabase.from("jobs").select("*").is("deleted_at", null),
    supabase.from("job_completions").select("*"),
    supabase
      .from("events")
      .select("*")
      .is("deleted_at", null)
      .gte("date", todayStr())
      .order("date", { ascending: true })
      .limit(3),
    supabase.from("scripture_plan").select("*").order("position"),
    supabase.from("resources").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(2),
    supabase.from("page_requests").select("*").eq("status", "pending"),
  ]);

  const family = (familyRes.data ?? []) as FamilyMember[];
  const jobs = (jobsRes.data ?? []) as Job[];
  const completions = (complRes.data ?? []) as JobCompletion[];
  const upcomingEvents = (eventsRes.data ?? []) as FamilyEvent[];
  const plan = (planRes.data ?? []) as ScripturePlanEntry[];
  const recentResources = (resRes.data ?? []) as Resource[];
  const pendingRequests = (reqRes.data ?? []) as PageRequest[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDS = todayStr();

  const jobsDueToday = jobs.filter(
    (j) =>
      isJobScheduledOnDate(j, today) &&
      !completions.some((c) => c.job_id === j.id && c.date === todayDS),
  );

  const upcomingBirthdays = family
    .filter((f) => f.birthday)
    .map((f) => {
      const bday = new Date(f.birthday + "T12:00:00");
      const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
      return { name: getDisplayName(f), date: thisYear };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayPassage = plan.find((p) => p.day === dayName) || plan[0];

  return (
    <>
      <div
        style={{
          background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)",
          color: "var(--cream)",
          padding: 24,
          borderRadius: 8,
          marginBottom: 24,
          textAlign: "center",
          border: "1px solid var(--gold)",
        }}
      >
        <h2 style={{ fontFamily: "'Garamond', serif", margin: "0 0 6px", fontSize: "1.6rem", fontWeight: "normal", letterSpacing: 1 }}>
          Welcome Home, Gordhamers
        </h2>
        <p style={{ margin: 0, color: "var(--cream-deep)", fontStyle: "italic" }}>
          Happy {dayName}, family. Here&apos;s what&apos;s happening together.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Card href="/jobs" title="Family Jobs">
          <p style={{ margin: "0 0 8px", fontSize: "0.9rem", color: "var(--muted)" }}>
            {jobsDueToday.length} due today · {jobs.length} total
          </p>
          {jobsDueToday.length === 0 ? (
            <p className="empty">All caught up for today. Well done.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.92rem" }}>
              {jobsDueToday.slice(0, 4).map((j) => (
                <li key={j.id} style={{ marginBottom: 4 }}>
                  {j.name} — <em>{getDisplayName(getRotationAssigneeForDate(j, today), family)}</em>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card href="/events" title="Upcoming Events">
          {upcomingEvents.length === 0 ? (
            <p className="empty">No events on the horizon.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.92rem" }}>
              {upcomingEvents.map((e) => (
                <li key={e.id} style={{ marginBottom: 4 }}>
                  {e.name} — <em>{e.date && new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</em>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card href="/contacts" title="Upcoming Birthdays">
          {upcomingBirthdays.length === 0 ? (
            <p className="empty">Add birthdays in Contacts.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.92rem" }}>
              {upcomingBirthdays.map((b) => (
                <li key={b.name} style={{ marginBottom: 4 }}>
                  {b.name} — <em>{b.date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</em>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card href="/scripture" title="Scripture Study">
          {todayPassage ? (
            <p style={{ margin: 0, fontStyle: "italic", color: "var(--ink)", fontSize: "0.92rem" }}>
              Today: {todayPassage.passage}
            </p>
          ) : (
            <p className="empty">No reading plan set.</p>
          )}
        </Card>

        <Card href="/calendar" title="Calendar">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            Click to see this month&apos;s view of family events and birthdays.
          </p>
        </Card>

        <Card href="/pages" title="Family Pages">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            {family.length} member page{family.length === 1 ? "" : "s"}
            {pendingRequests.length > 0 && (
              <> · <span style={{ color: "var(--burgundy)" }}>{pendingRequests.length} pending request{pendingRequests.length === 1 ? "" : "s"}</span></>
            )}
          </p>
        </Card>

        <Card href="/resources" title="Recent Resources">
          {recentResources.length === 0 ? (
            <p className="empty">No resources shared yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.92rem" }}>
              {recentResources.map((r) => (
                <li key={r.id} style={{ marginBottom: 4 }}>
                  {r.title} <em>({r.category})</em>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card href="/games" title="Fun &amp; Games">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            Trivia, would-you-rather, and family memory prompts.
          </p>
        </Card>

        <Card href="/quotes" title="Greatest Quotes">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            Funny and meaningful things our family has said. 👍 the ones you love.
          </p>
        </Card>

        <Card href="/celebrations" title="Family Keepsakes">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            Pages we built to remember the moments that mattered.
          </p>
        </Card>
      </div>
    </>
  );
}

function Card({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        background: "var(--cream-soft)",
        border: "1px solid var(--line)",
        borderLeft: "5px solid var(--gold)",
        borderRadius: 6,
        padding: 16,
        textDecoration: "none",
        color: "inherit",
        boxShadow: "var(--shadow)",
        display: "block",
      }}
    >
      <h3
        style={{
          margin: "0 0 8px",
          color: "var(--navy)",
          fontFamily: "'Garamond', serif",
          fontSize: "1.25rem",
          fontWeight: "normal",
        }}
      >
        {title}
      </h3>
      {children}
    </Link>
  );
}

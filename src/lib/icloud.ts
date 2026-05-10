import {
  DAVClient,
  type DAVCalendar,
  type DAVCalendarObject,
} from "tsdav";
import ICAL from "ical.js";
import { decryptSecret } from "./crypto";

const ICLOUD_BASE = "https://caldav.icloud.com";

export interface ICloudCredentials {
  appleId: string;
  appPasswordEncrypted: string;
}

async function getClient(creds: ICloudCredentials) {
  const client = new DAVClient({
    serverUrl: ICLOUD_BASE,
    credentials: {
      username: creds.appleId,
      password: decryptSecret(creds.appPasswordEncrypted),
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  await client.login();
  return client;
}

export interface CalendarSummary {
  url: string;
  displayName: string;
  ctag: string | null;
}

export async function listCalendars(creds: ICloudCredentials): Promise<CalendarSummary[]> {
  const client = await getClient(creds);
  const cals = await client.fetchCalendars();
  // iCloud is inconsistent about how it populates `components`: sometimes it's
  // an array of strings, sometimes a comma-separated string, sometimes missing
  // (especially for shared / family calendars). Be permissive — only EXCLUDE a
  // calendar if `components` clearly says it's a non-event calendar.
  function supportsEvents(c: DAVCalendar): boolean {
    const comps = c.components as unknown;
    if (Array.isArray(comps)) {
      if (comps.length === 0) return true; // empty → can't tell, include
      return comps.some((x) => typeof x === "string" && x.toUpperCase().includes("VEVENT"));
    }
    if (typeof comps === "string") {
      return comps.toUpperCase().includes("VEVENT");
    }
    return true; // unknown shape → include
  }
  // Skip iCloud's housekeeping collections by URL.
  function looksLikeEventCalendar(c: DAVCalendar): boolean {
    const url = (c.url || "").toLowerCase();
    if (url.includes("/inbox/") || url.includes("/outbox/") || url.includes("/notifications/")) {
      return false;
    }
    return true;
  }
  return cals
    .filter((c: DAVCalendar) => looksLikeEventCalendar(c) && supportsEvents(c))
    .map((c: DAVCalendar) => ({
      url: c.url,
      displayName:
        typeof c.displayName === "string" && c.displayName.trim()
          ? c.displayName
          : c.url.split("/").filter(Boolean).pop() || "Calendar",
      ctag: typeof c.ctag === "string" ? c.ctag : null,
    }));
}

export interface ParsedEvent {
  uid: string;
  caldav_url: string;
  etag: string | null;
  summary: string;
  description: string | null;
  location: string | null;
  start_at: string;          // ISO
  end_at: string | null;      // ISO
  all_day: boolean;
  is_recurring: boolean;
  rrule: string | null;
  raw_ical: string;
}

// Pull all events from a single calendar URL within a time window. Expands
// recurring events into individual occurrences.
export async function fetchEvents(
  creds: ICloudCredentials,
  calendarUrl: string,
  rangeStartIso: string,
  rangeEndIso: string,
): Promise<ParsedEvent[]> {
  const client = await getClient(creds);
  const calObjects = await client.fetchCalendarObjects({
    calendar: { url: calendarUrl } as DAVCalendar,
    timeRange: { start: rangeStartIso, end: rangeEndIso },
  });
  const out: ParsedEvent[] = [];
  for (const obj of calObjects as DAVCalendarObject[]) {
    if (!obj.data) continue;
    try {
      const parsed = ICAL.parse(obj.data);
      const comp = new ICAL.Component(parsed);
      const vevents = comp.getAllSubcomponents("vevent");
      for (const ve of vevents) {
        const event = new ICAL.Event(ve);
        const uid = event.uid;
        const summary = event.summary || "(no title)";
        const description = event.description || null;
        const location = event.location || null;
        const isRecurring = event.isRecurring();
        const rrule = isRecurring ? ve.getFirstPropertyValue("rrule")?.toString() ?? null : null;

        if (isRecurring) {
          const rangeStart = ICAL.Time.fromJSDate(new Date(rangeStartIso), false);
          const rangeEnd = ICAL.Time.fromJSDate(new Date(rangeEndIso), false);
          const iter = event.iterator();
          let occ = iter.next();
          let safety = 0;
          while (occ && occ.compare(rangeEnd) < 0 && safety < 500) {
            safety++;
            if (occ.compare(rangeStart) >= 0) {
              const occStart = occ.toJSDate();
              const dur = event.duration;
              const occEnd = dur ? new Date(occStart.getTime() + dur.toSeconds() * 1000) : null;
              out.push({
                uid: `${uid}::${occStart.toISOString()}`,
                caldav_url: obj.url,
                etag: obj.etag ?? null,
                summary,
                description,
                location,
                start_at: occStart.toISOString(),
                end_at: occEnd ? occEnd.toISOString() : null,
                all_day: event.startDate.isDate,
                is_recurring: true,
                rrule,
                raw_ical: obj.data,
              });
            }
            occ = iter.next();
          }
        } else {
          out.push({
            uid,
            caldav_url: obj.url,
            etag: obj.etag ?? null,
            summary,
            description,
            location,
            start_at: event.startDate.toJSDate().toISOString(),
            end_at: event.endDate ? event.endDate.toJSDate().toISOString() : null,
            all_day: event.startDate.isDate,
            is_recurring: false,
            rrule: null,
            raw_ical: obj.data,
          });
        }
      }
    } catch {
      // skip unparseable
    }
  }
  return out;
}

function pad(n: number) {
  return n < 10 ? "0" + n : "" + n;
}
function icalDateTime(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}
function icalDate(d: Date): string {
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
}
function escapeIcal(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export interface NewEventInput {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date | null;
  allDay?: boolean;
}

// Create / update an event on iCloud. Returns the new etag.
export async function upsertEvent(
  creds: ICloudCredentials,
  calendarUrl: string,
  input: NewEventInput,
): Promise<{ url: string; etag: string | null }> {
  const client = await getClient(creds);
  const dtstamp = icalDateTime(new Date());
  const ds = input.allDay ? icalDate(input.start) : icalDateTime(input.start);
  const de = input.end
    ? input.allDay ? icalDate(input.end) : icalDateTime(input.end)
    : null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gordhamer Hub//EN",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${dtstamp}`,
    input.allDay ? `DTSTART;VALUE=DATE:${ds}` : `DTSTART:${ds}`,
    de ? (input.allDay ? `DTEND;VALUE=DATE:${de}` : `DTEND:${de}`) : "",
    `SUMMARY:${escapeIcal(input.summary)}`,
    input.description ? `DESCRIPTION:${escapeIcal(input.description)}` : "",
    input.location ? `LOCATION:${escapeIcal(input.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const ical = lines.join("\r\n");
  const filename = encodeURIComponent(input.uid) + ".ics";
  const url = calendarUrl.endsWith("/") ? calendarUrl + filename : calendarUrl + "/" + filename;
  const res = await client.createCalendarObject({
    calendar: { url: calendarUrl } as DAVCalendar,
    filename,
    iCalString: ical,
  });
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(`iCloud rejected create (${res.status} ${res.statusText}): ${body.slice(0, 200)}`);
  }
  const etag = res.headers?.get?.("etag") ?? null;
  return { url, etag };
}

// Delete an event on iCloud by its CalDAV URL.
export async function deleteEvent(
  creds: ICloudCredentials,
  caldavUrl: string,
  etag?: string | null,
): Promise<void> {
  const client = await getClient(creds);
  const res = await client.deleteCalendarObject({
    calendarObject: { url: caldavUrl, etag: etag ?? "" } as DAVCalendarObject,
  });
  if (!res.ok && res.status !== 404) {
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(`iCloud rejected delete (${res.status} ${res.statusText}): ${body.slice(0, 200)}`);
  }
}

// Update an existing event on iCloud (PUT to the same caldav_url).
export async function updateEventAt(
  creds: ICloudCredentials,
  caldavUrl: string,
  etag: string | null,
  input: NewEventInput,
): Promise<{ etag: string | null }> {
  const client = await getClient(creds);
  const dtstamp = icalDateTime(new Date());
  const ds = input.allDay ? icalDate(input.start) : icalDateTime(input.start);
  const de = input.end
    ? input.allDay ? icalDate(input.end) : icalDateTime(input.end)
    : null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gordhamer Hub//EN",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${dtstamp}`,
    input.allDay ? `DTSTART;VALUE=DATE:${ds}` : `DTSTART:${ds}`,
    de ? (input.allDay ? `DTEND;VALUE=DATE:${de}` : `DTEND:${de}`) : "",
    `SUMMARY:${escapeIcal(input.summary)}`,
    input.description ? `DESCRIPTION:${escapeIcal(input.description)}` : "",
    input.location ? `LOCATION:${escapeIcal(input.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const ical = lines.join("\r\n");
  let res = await client.updateCalendarObject({
    calendarObject: { url: caldavUrl, etag: etag ?? "", data: ical } as DAVCalendarObject,
  });
  // If the etag is stale, retry with If-Match: * (unconditional)
  if (res.status === 412 || res.status === 409) {
    res = await client.updateCalendarObject({
      calendarObject: { url: caldavUrl, etag: "*", data: ical } as DAVCalendarObject,
    });
  }
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(`iCloud rejected update (${res.status} ${res.statusText}): ${body.slice(0, 200)}`);
  }
  const newEtag = res.headers?.get?.("etag") ?? null;
  return { etag: newEtag };
}

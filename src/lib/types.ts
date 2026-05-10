export type Relationship = "parent" | "child" | "grandchild" | "spouse";
export type Frequency =
  | "once"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

export type RelationshipStatus =
  | "single"
  | "engaged"
  | "married"
  | "widowed"
  | "divorced";

export interface FamilyMember {
  id: string;
  name: string;
  preferred_name: string | null;
  relationship: Relationship;
  parent_id: string | null;
  partner_id: string | null;
  relationship_status: RelationshipStatus | null;
  birthday: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  state: string | null;
  profile_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PersonalPageSection {
  type: "text" | "list" | "links" | "custom" | "countdown";
  title?: string;
  content?: string;
  items?: string[] | { title: string; url: string; description?: string }[];
  html?: string;
  // for countdown
  target_date?: string;
  label?: string;
}

export interface PersonalPage {
  id: string;
  family_member_id: string;
  header_text: string;
  bio: string;
  accent_color: string;
  bg_color: string;
  text_color: string;
  sections: PersonalPageSection[];
}

export interface PageRequest {
  id: string;
  family_member_id: string;
  text: string;
  status: "pending" | "completed" | "dismissed";
  created_at: string;
  completed_at: string | null;
}

export interface Job {
  id: string;
  name: string;
  frequency: Frequency;
  custom_days: number | null;
  start_date: string;
  rotation: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface JobCompletion {
  id: string;
  job_id: string;
  date: string;
  completed_by: string | null;
  completed_at: string;
}

export interface JobOverride {
  id: string;
  job_id: string;
  date: string;
  name: string | null;
  assignee: string | null;
  notes: string | null;
}

export interface EventTask {
  id: string;
  event_id: string;
  parent_task_id: string | null;
  name: string;
  assignee: string | null;
  done: boolean;
  position: number;
}

export interface FamilyEvent {
  id: string;
  name: string;
  date: string | null;
  notes: string | null;
}

export interface CalendarItem {
  id: string;
  name: string;
  date: string;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  description: string | null;
  icloud_calendar_id: string | null;
}

export interface ScripturePlanEntry {
  id: string;
  day: string;
  passage: string;
  position: number;
}

export interface Discussion {
  id: string;
  author: string;
  message: string;
  created_at: string;
}

export interface Resource {
  id: string;
  title: string;
  category: string | null;
  url: string | null;
  shared_by: string | null;
  notes: string | null;
  created_at: string;
}

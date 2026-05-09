import { createClient } from "@/lib/supabase/server";
import type {
  FamilyMember,
  Job,
  JobCompletion,
  JobOverride,
} from "@/lib/types";
import { JobBoardClient } from "./JobBoardClient";

export default async function JobsPage() {
  const supabase = createClient();
  const [familyRes, jobsRes, completionsRes, overridesRes] = await Promise.all([
    supabase
      .from("family_members")
      .select("*")
      .is("deleted_at", null)
      .order("position", { ascending: true }),
    supabase
      .from("jobs")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase.from("job_completions").select("*"),
    supabase.from("job_overrides").select("*"),
  ]);

  return (
    <JobBoardClient
      family={(familyRes.data ?? []) as FamilyMember[]}
      jobs={(jobsRes.data ?? []) as Job[]}
      completions={(completionsRes.data ?? []) as JobCompletion[]}
      overrides={(overridesRes.data ?? []) as JobOverride[]}
    />
  );
}

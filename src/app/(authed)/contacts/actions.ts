"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Relationship } from "@/lib/types";

interface ContactInput {
  id?: string;
  name: string;
  preferred_name: string;
  relationship: Relationship;
  parent_id: string | null;
  birthday: string | null;
  phone: string;
  email: string;
  address: string;
  state: string;
}

export async function saveContact(input: ContactInput) {
  const supabase = createClient();
  const data = {
    name: input.name,
    preferred_name: input.preferred_name || null,
    relationship: input.relationship,
    parent_id: input.parent_id || null,
    birthday: input.birthday || null,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    state: input.state || null,
  };
  if (input.id) {
    await supabase.from("family_members").update(data).eq("id", input.id);
  } else {
    await supabase.from("family_members").insert(data);
  }
  revalidatePath("/contacts");
  revalidatePath("/pages");
}

export async function deleteContact(id: string) {
  const supabase = createClient();
  await supabase
    .from("family_members")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/contacts");
  revalidatePath("/pages");
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Relationship, RelationshipStatus } from "@/lib/types";

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
  // partner fields (optional)
  has_partner: boolean;
  relationship_status: RelationshipStatus | null;
  partner_id: string | null; // existing partner link
  partner: {
    name: string;
    preferred_name: string;
    email: string;
    phone: string;
    birthday: string | null;
  } | null;
}

export async function saveContact(input: ContactInput) {
  const supabase = createClient();
  const personData = {
    name: input.name,
    preferred_name: input.preferred_name || null,
    relationship: input.relationship,
    parent_id: input.parent_id || null,
    birthday: input.birthday || null,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    state: input.state || null,
    relationship_status: input.has_partner
      ? input.relationship_status ?? "married"
      : "single",
  };

  let personId = input.id;

  if (input.id) {
    await supabase.from("family_members").update(personData).eq("id", input.id);
  } else {
    const { data: ins } = await supabase
      .from("family_members")
      .insert(personData)
      .select("id")
      .single();
    personId = ins?.id;
  }

  if (!personId) return;

  // Handle partner side
  if (!input.has_partner) {
    // Unlink from any existing partner
    const { data: current } = await supabase
      .from("family_members")
      .select("partner_id")
      .eq("id", personId)
      .maybeSingle();
    if (current?.partner_id) {
      await supabase
        .from("family_members")
        .update({ partner_id: null, relationship_status: "single" })
        .eq("id", current.partner_id);
    }
    await supabase
      .from("family_members")
      .update({ partner_id: null })
      .eq("id", personId);
  } else if (input.partner) {
    let partnerId = input.partner_id;
    const partnerData = {
      name: input.partner.name,
      preferred_name: input.partner.preferred_name || null,
      email: input.partner.email || null,
      phone: input.partner.phone || null,
      birthday: input.partner.birthday || null,
      relationship: input.relationship, // partner sits at same generation
      parent_id: null,                   // not a blood-line child
      partner_id: personId,
      relationship_status: input.relationship_status ?? "married",
    };

    if (partnerId) {
      await supabase.from("family_members").update(partnerData).eq("id", partnerId);
    } else if (input.partner.name.trim()) {
      const { data: pIns } = await supabase
        .from("family_members")
        .insert(partnerData)
        .select("id")
        .single();
      partnerId = pIns?.id ?? null;
    }
    if (partnerId) {
      await supabase
        .from("family_members")
        .update({ partner_id: partnerId })
        .eq("id", personId);
    }
  }

  revalidatePath("/contacts");
  revalidatePath("/pages");
  revalidatePath("/home");
}

export async function deleteContact(id: string) {
  const supabase = createClient();
  // Unlink partner first
  const { data: person } = await supabase
    .from("family_members")
    .select("partner_id")
    .eq("id", id)
    .maybeSingle();
  if (person?.partner_id) {
    await supabase
      .from("family_members")
      .update({ partner_id: null, relationship_status: "single" })
      .eq("id", person.partner_id);
  }
  await supabase
    .from("family_members")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/contacts");
  revalidatePath("/pages");
}

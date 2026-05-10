"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  extractShareToken,
  getAlbumMetadata,
  getPhotoUrls,
  type SharedAlbumPhoto,
} from "@/lib/icloud-photos";

export interface AlbumWithPhotos {
  id: string;
  name: string;
  description: string | null;
  share_url: string;
  share_token: string;
  position: number;
  ok: boolean;
  error?: string;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  streamName?: string | null;
  photos?: SharedAlbumPhoto[];
}

export async function addPhotoAlbum(input: {
  share_url: string;
  name?: string;
  description?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const token = extractShareToken(input.share_url);
  if (!token) {
    return {
      ok: false as const,
      error:
        "Couldn't read a share token from that URL. Paste the full link from Photos → Share Album, e.g. https://www.icloud.com/sharedalbum/#B0...",
    };
  }

  // Validate the token actually works against iCloud before saving — gives us a
  // nice name to default to and surfaces obvious typos right away.
  const metadata = await getAlbumMetadata(token);
  if (!metadata.ok) {
    return {
      ok: false as const,
      error: `iCloud rejected that link: ${metadata.error}`,
    };
  }

  // Find the next position
  const { data: maxRow } = await supabase
    .from("photo_albums")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (maxRow?.position ?? -1) + 1;

  const fallbackName =
    metadata.streamName?.trim() ||
    [metadata.ownerFirstName, metadata.ownerLastName].filter(Boolean).join(" ") ||
    "Shared Album";
  const finalName = input.name?.trim() || fallbackName;

  const { error: insertErr } = await supabase.from("photo_albums").insert({
    share_url: input.share_url.trim(),
    share_token: token,
    name: finalName,
    description: input.description?.trim() || null,
    position: nextPosition,
    added_by: user.id,
  });
  if (insertErr) {
    if (insertErr.message?.includes("photo_albums_share_token_key")) {
      return { ok: false as const, error: "That album is already in the Hub." };
    }
    return { ok: false as const, error: insertErr.message };
  }
  revalidatePath("/photos");
  return { ok: true as const };
}

export async function deletePhotoAlbum(id: string) {
  const supabase = createClient();
  await supabase
    .from("photo_albums")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/photos");
}

export async function updatePhotoAlbum(
  id: string,
  input: { name: string; description?: string },
) {
  const supabase = createClient();
  await supabase
    .from("photo_albums")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/photos");
}

// Fetch one album's photos (used by the album detail page).
export async function getAlbumPhotos(id: string) {
  const supabase = createClient();
  const { data: album } = await supabase
    .from("photo_albums")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!album) return { ok: false as const, error: "Album not found" };
  const meta = await getAlbumMetadata(album.share_token);
  if (!meta.ok) {
    return { ok: false as const, error: meta.error };
  }
  // Resolve thumbnail URLs for the grid view
  const thumbChecksums = Array.from(
    new Set(meta.photos.map((p) => p.thumbChecksum).filter((c): c is string => !!c)),
  );
  const guidsForThumbs = meta.photos
    .filter((p) => p.thumbChecksum)
    .map((p) => p.photoGuid);
  let thumbUrls: Record<string, string> = {};
  if (thumbChecksums.length > 0) {
    try {
      thumbUrls = await getPhotoUrls(album.share_token, guidsForThumbs);
    } catch (e: unknown) {
      console.error("getPhotoUrls failed:", e);
    }
  }
  return {
    ok: true as const,
    album: {
      id: album.id,
      name: album.name,
      description: album.description as string | null,
      share_url: album.share_url as string,
    },
    streamName: meta.streamName,
    photos: meta.photos.map((p) => ({
      ...p,
      thumbUrl: p.thumbChecksum ? thumbUrls[p.thumbChecksum] ?? null : null,
    })),
  };
}

// Resolve full-size URLs on demand for the lightbox.
export async function getAlbumFullUrls(id: string, photoGuids: string[]) {
  const supabase = createClient();
  const { data: album } = await supabase
    .from("photo_albums")
    .select("share_token")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!album) return { ok: false as const, error: "Album not found" };
  try {
    const urls = await getPhotoUrls(album.share_token, photoGuids);
    return { ok: true as const, urls };
  } catch (e: unknown) {
    return { ok: false as const, error: (e as Error)?.message ?? "fetch failed" };
  }
}

/**
 * iCloud Shared Album fetcher.
 *
 * Apple's "Shared Albums" feature lets you create a public album in the Photos
 * app, get a share link like https://www.icloud.com/sharedalbum/#B0XYZ..., and
 * anyone with the link can view it without an Apple ID. The web viewer is
 * backed by an undocumented JSON API that we use here.
 *
 * The protocol (reverse-engineered, stable for years):
 *
 *   1. POST https://p<NN>-sharedstreams.icloud.com/<token>/sharedstreams/webstream
 *        body: {"streamCtag": null}
 *      The first request goes to a "guess" partition. Apple may reply with HTTP
 *      330 and a body telling us the right partition (X-Apple-MMe-Host). We
 *      retry against that partition. The successful response has photo metadata
 *      including each photo's `photoGuid` and a list of `derivatives` (sizes).
 *
 *   2. POST https://p<NN>-sharedstreams.icloud.com/<token>/sharedstreams/webasseturls
 *        body: {"photoGuids": [<list of photoGuids>]}
 *      Returns `items` keyed by checksum, each containing a `url_path` and
 *      `url_expiry` and a top-level `locations` map giving us the hostname
 *      to combine with the path. URLs expire (typically ~1h).
 *
 * We expose two functions:
 *   - `getAlbumMetadata(token)` returns name, owner, photo list with thumbnails
 *     for the page render
 *   - `getPhotoUrls(token, photoGuids)` returns full-size URLs for the lightbox
 */

const DEFAULT_PARTITION = 23; // good initial guess; will follow the redirect

export interface SharedAlbumPhoto {
  photoGuid: string;
  caption: string | null;
  dateCreated: string | null; // ISO
  width: number;
  height: number;
  // Best thumbnail: the smallest derivative (~256–340px)
  thumbChecksum: string | null;
  // Best full-screen: the largest derivative
  fullChecksum: string | null;
}

export interface SharedAlbumMetadata {
  ok: true;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  streamName: string | null;
  photos: SharedAlbumPhoto[];
}

export interface SharedAlbumError {
  ok: false;
  error: string;
}

interface RawDerivative {
  checksum: string;
  width: string | number;
  height: string | number;
  fileSize?: string | number;
}

interface RawPhoto {
  photoGuid: string;
  caption?: string;
  dateCreated?: string;
  width?: string | number;
  height?: string | number;
  derivatives?: Record<string, RawDerivative>;
}

interface RawWebstreamResponse {
  photos?: RawPhoto[];
  streamName?: string;
  userFirstName?: string;
  userLastName?: string;
  "X-Apple-MMe-Host"?: string;
}

interface RawAssetUrlsResponse {
  items?: Record<string, { url_path?: string; url_expiry?: string }>;
  locations?: Record<string, { scheme?: string; hosts?: string[] }>;
}

/**
 * Extracts the share token from an iCloud share URL.
 * Accepts:
 *   - https://www.icloud.com/sharedalbum/#B0...
 *   - https://share.icloud.com/photos/0XX...
 *   - just the token itself
 */
export function extractShareToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Already looks like a bare token
  if (/^[A-Za-z0-9]{10,}$/.test(trimmed)) return trimmed;
  // Hash form: #B0...
  const hashMatch = trimmed.match(/[#/]([A-Za-z0-9]{10,})(?:[?#]|$)/);
  if (hashMatch) return hashMatch[1];
  return null;
}

/**
 * Returns "https://p23-sharedstreams.icloud.com" for partition 23.
 */
function partitionHost(partition: number): string {
  return `https://p${String(partition).padStart(2, "0")}-sharedstreams.icloud.com`;
}

/**
 * POST to one of Apple's sharedstreams endpoints, transparently following
 * the partition redirect (response status 330 with X-Apple-MMe-Host).
 */
async function postWithPartitionRedirect<T>(
  path: string,
  body: unknown,
  initialPartition = DEFAULT_PARTITION,
  maxHops = 3,
): Promise<T> {
  let partition = initialPartition;
  for (let hop = 0; hop < maxHops; hop++) {
    const url = partitionHost(partition) + path;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // A user-agent to look like a normal browser; Apple sometimes 403s
        // requests that look automated.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 GordhamerHub/1.0",
      },
      body: JSON.stringify(body ?? {}),
      // shared albums work without credentials; this also avoids accidental cookie use
      credentials: "omit",
    });
    if (res.status === 330) {
      const data = (await res.json()) as { "X-Apple-MMe-Host"?: string };
      const newHost = data["X-Apple-MMe-Host"];
      if (!newHost) throw new Error("iCloud asked us to redirect but didn't say where");
      const m = newHost.match(/^p(\d+)-/);
      if (!m) throw new Error(`Couldn't parse iCloud redirect host: ${newHost}`);
      partition = Number(m[1]);
      continue;
    }
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try {
        const text = await res.text();
        if (text) msg += ` — ${text.slice(0, 200)}`;
      } catch {
        /* ignore */
      }
      throw new Error(`iCloud responded ${msg}`);
    }
    return (await res.json()) as T;
  }
  throw new Error("iCloud sent us in circles between partitions");
}

/**
 * Fetch the album metadata + photo list for a given share token.
 */
export async function getAlbumMetadata(
  token: string,
): Promise<SharedAlbumMetadata | SharedAlbumError> {
  if (!token) return { ok: false, error: "Empty share token" };
  try {
    const data = await postWithPartitionRedirect<RawWebstreamResponse>(
      `/${encodeURIComponent(token)}/sharedstreams/webstream`,
      { streamCtag: null },
    );
    const photos: SharedAlbumPhoto[] = (data.photos ?? []).map((p) => {
      const derivatives = p.derivatives ?? {};
      // Apple keys derivatives by max-dimension as a string (e.g. "256", "1024")
      // plus sometimes a "best" variant. Pick the smallest for thumb, biggest for full.
      const sizes = Object.entries(derivatives)
        .map(([k, d]) => ({
          key: k,
          checksum: d.checksum,
          dim: Number(d.width) > 0 ? Number(d.width) : Number(k) || 0,
        }))
        .filter((d) => d.checksum)
        .sort((a, b) => a.dim - b.dim);
      const thumb = sizes.find((s) => s.dim >= 256) ?? sizes[0] ?? null;
      const full = sizes[sizes.length - 1] ?? null;
      return {
        photoGuid: p.photoGuid,
        caption: p.caption?.trim() || null,
        dateCreated: p.dateCreated || null,
        width: Number(p.width) || 0,
        height: Number(p.height) || 0,
        thumbChecksum: thumb?.checksum ?? null,
        fullChecksum: full?.checksum ?? null,
      };
    });
    return {
      ok: true,
      streamName: data.streamName ?? null,
      ownerFirstName: data.userFirstName ?? null,
      ownerLastName: data.userLastName ?? null,
      photos,
    };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error)?.message ?? "Unknown iCloud error" };
  }
}

/**
 * Resolve photo asset URLs for a list of photoGuids. Returns a map from
 * checksum to fully-qualified https URL.
 */
export async function getPhotoUrls(
  token: string,
  photoGuids: string[],
): Promise<Record<string, string>> {
  if (photoGuids.length === 0) return {};
  const data = await postWithPartitionRedirect<RawAssetUrlsResponse>(
    `/${encodeURIComponent(token)}/sharedstreams/webasseturls`,
    { photoGuids },
  );
  const out: Record<string, string> = {};
  const items = data.items ?? {};
  const locations = data.locations ?? {};
  for (const [checksum, item] of Object.entries(items)) {
    const path = item.url_path;
    if (!path) continue;
    // Per Apple's reply, each item references a location key embedded in path-like
    // headers OR uses the first available location. The locations map keys aren't
    // returned per-item, so we fall back to the first available host.
    const locKey = Object.keys(locations)[0];
    const loc = locations[locKey];
    const host = loc?.hosts?.[0];
    const scheme = loc?.scheme || "https";
    if (!host) continue;
    out[checksum] = `${scheme}://${host}${path}`;
  }
  return out;
}

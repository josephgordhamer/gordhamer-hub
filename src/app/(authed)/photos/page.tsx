import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PhotosClient } from "./PhotosClient";

export interface AlbumRow {
  id: string;
  name: string;
  description: string | null;
  share_url: string;
  share_token: string;
  position: number;
  cover_guid: string | null;
}

export default async function PhotosPage() {
  const supabase = createClient();
  const { data: albums } = await supabase
    .from("photo_albums")
    .select("id, name, description, share_url, share_token, position, cover_guid")
    .is("deleted_at", null)
    .order("position", { ascending: true });

  return (
    <>
      <h2 className="section-title">Family Photos</h2>
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 22 }}>
        Albums shared from our iCloud Photos — moments from across the family. Click any album to
        view its pictures.
      </p>

      <details
        className="card"
        style={{ marginBottom: 18 }}
      >
        <summary style={{ cursor: "pointer", color: "var(--navy)", fontFamily: "'Garamond', serif", fontSize: "1.05rem" }}>
          How to add an album
        </summary>
        <ol style={{ marginTop: 10, color: "var(--muted)", fontSize: "0.92rem", lineHeight: 1.7 }}>
          <li>Open the <strong>Photos</strong> app on your iPhone, iPad, or Mac.</li>
          <li>
            Create a new <strong>Shared Album</strong> (or open an existing one) and add the photos
            you want to share.
          </li>
          <li>Tap the album, then <strong>People</strong> → enable <strong>Public Website</strong>.</li>
          <li>
            Copy the <strong>Public Link</strong> (looks like
            <code style={{ background: "var(--cream-deep)", padding: "1px 4px", borderRadius: 3, marginLeft: 4 }}>
              https://www.icloud.com/sharedalbum/#B0…
            </code>
            ) and paste it in the box below.
          </li>
        </ol>
      </details>

      <PhotosClient albums={(albums ?? []) as AlbumRow[]} />

      {albums && albums.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "30px 20px", color: "var(--muted)" }}>
          No albums yet. Paste a Shared Album link above to add the first one.
        </div>
      )}

      {albums && albums.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 18,
            marginTop: 18,
          }}
        >
          {albums.map((album) => (
            <Link
              key={album.id}
              href={`/photos/${album.id}`}
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <AlbumTile album={album} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function AlbumTile({ album }: { album: { id: string; name: string; description: string | null } }) {
  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        border: "1px solid var(--line)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
    >
      <div
        style={{
          aspectRatio: "4 / 3",
          background:
            "linear-gradient(135deg, var(--navy) 0%, var(--navy-deep) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--gold-soft)",
          fontFamily: "'Garamond', serif",
          fontSize: "1.4rem",
          fontStyle: "italic",
          letterSpacing: 1,
          textAlign: "center",
          padding: 16,
        }}
      >
        {album.name}
      </div>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ color: "var(--navy)", fontFamily: "'Garamond', serif", fontSize: "1.05rem" }}>
          {album.name}
        </div>
        {album.description && (
          <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 2 }}>
            {album.description}
          </div>
        )}
      </div>
    </div>
  );
}

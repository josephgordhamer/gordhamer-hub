import Link from "next/link";
import { getAlbumPhotos } from "../actions";
import { AlbumDetailClient } from "./AlbumDetailClient";

export default async function AlbumDetailPage({ params }: { params: { id: string } }) {
  const result = await getAlbumPhotos(params.id);

  if (!result.ok) {
    return (
      <>
        <Link
          href="/photos"
          style={{ color: "var(--burgundy)", fontSize: "0.9rem", textDecoration: "none" }}
        >
          ← All albums
        </Link>
        <h2 className="section-title" style={{ marginTop: 8 }}>
          Album not available
        </h2>
        <div className="card">
          <p style={{ color: "var(--burgundy)", margin: 0 }}>
            Couldn&apos;t load this album: {result.error}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Link
        href="/photos"
        style={{ color: "var(--burgundy)", fontSize: "0.9rem", textDecoration: "none" }}
      >
        ← All albums
      </Link>
      <h2 className="section-title" style={{ marginTop: 8, marginBottom: 4 }}>
        {result.album.name}
      </h2>
      {result.album.description && (
        <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 0, marginBottom: 12 }}>
          {result.album.description}
        </p>
      )}
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 0, marginBottom: 18 }}>
        {result.photos.length} photo{result.photos.length === 1 ? "" : "s"}
        {" · "}
        <a
          href={result.album.share_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--burgundy)" }}
        >
          Open in iCloud ↗
        </a>
      </p>
      <AlbumDetailClient
        albumId={result.album.id}
        photos={result.photos.map((p) => ({
          photoGuid: p.photoGuid,
          caption: p.caption,
          dateCreated: p.dateCreated,
          width: p.width,
          height: p.height,
          thumbUrl: p.thumbUrl,
          fullChecksum: p.fullChecksum,
        }))}
      />
    </>
  );
}

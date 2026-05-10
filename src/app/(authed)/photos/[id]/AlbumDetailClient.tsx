"use client";

import { useEffect, useState } from "react";
import { getAlbumFullUrls } from "../actions";

interface Photo {
  photoGuid: string;
  caption: string | null;
  dateCreated: string | null;
  width: number;
  height: number;
  thumbUrl: string | null;
  fullChecksum: string | null;
}

export function AlbumDetailClient({
  albumId,
  photos,
}: {
  albumId: string;
  photos: Photo[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [fullUrls, setFullUrls] = useState<Record<string, string>>({});
  const [loadingFull, setLoadingFull] = useState(false);

  // When the lightbox opens, fetch the full-size URLs in chunks of 25 around the
  // current index so we have prev/next ready without waiting.
  useEffect(() => {
    if (openIndex === null) return;
    const start = Math.max(0, openIndex - 12);
    const end = Math.min(photos.length, openIndex + 13);
    const guidsNeeded = photos
      .slice(start, end)
      .filter((p) => p.fullChecksum && !fullUrls[p.fullChecksum])
      .map((p) => p.photoGuid);
    if (guidsNeeded.length === 0) return;
    setLoadingFull(true);
    getAlbumFullUrls(albumId, guidsNeeded).then((res) => {
      setLoadingFull(false);
      if (res.ok) {
        setFullUrls((prev) => ({ ...prev, ...res.urls }));
      }
    });
  }, [openIndex, albumId, photos, fullUrls]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      if (e.key === "ArrowRight")
        setOpenIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 30, color: "var(--muted)" }}>
        This album doesn&apos;t have any photos yet.
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 8,
        }}
      >
        {photos.map((p, i) => (
          <button
            key={p.photoGuid}
            onClick={() => setOpenIndex(i)}
            style={{
              padding: 0,
              border: "1px solid var(--line)",
              background: "var(--cream-deep)",
              borderRadius: 4,
              overflow: "hidden",
              cursor: "pointer",
              aspectRatio: "1 / 1",
              position: "relative",
            }}
            title={p.caption || ""}
          >
            {p.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.thumbUrl}
                alt={p.caption || `Photo ${i + 1}`}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)", fontSize: "0.8rem" }}>
                no thumb
              </div>
            )}
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={photos}
          index={openIndex}
          fullUrls={fullUrls}
          loading={loadingFull}
          onClose={() => setOpenIndex(null)}
          onPrev={() => setOpenIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() =>
            setOpenIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))
          }
        />
      )}
    </>
  );
}

function Lightbox({
  photos,
  index,
  fullUrls,
  loading,
  onClose,
  onPrev,
  onNext,
}: {
  photos: Photo[];
  index: number;
  fullUrls: Record<string, string>;
  loading: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[index];
  const fullUrl = photo.fullChecksum ? fullUrls[photo.fullChecksum] : null;
  const display = fullUrl || photo.thumbUrl;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 22, 38, 0.95)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--cream)", marginBottom: 8 }}>
        <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
          {index + 1} / {photos.length}
          {photo.dateCreated && ` · ${new Date(photo.dateCreated).toLocaleDateString()}`}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid var(--cream)",
            color: "var(--cream)",
            padding: "4px 12px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          ✕ Close
        </button>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          minHeight: 0,
        }}
      >
        <button
          onClick={onPrev}
          disabled={index === 0}
          style={navButtonStyle(index === 0)}
          aria-label="Previous"
        >
          ‹
        </button>
        {display ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={display}
            alt={photo.caption || `Photo ${index + 1}`}
            style={{
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
              boxShadow: "0 10px 50px rgba(0,0,0,0.5)",
            }}
          />
        ) : (
          <div style={{ color: "var(--cream)" }}>{loading ? "Loading…" : "No image available"}</div>
        )}
        <button
          onClick={onNext}
          disabled={index === photos.length - 1}
          style={navButtonStyle(index === photos.length - 1)}
          aria-label="Next"
        >
          ›
        </button>
      </div>
      {photo.caption && (
        <div
          style={{
            color: "var(--cream)",
            textAlign: "center",
            padding: "10px 12px",
            fontStyle: "italic",
            opacity: 0.9,
            fontSize: "0.95rem",
          }}
        >
          {photo.caption}
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: 4 }}>
        {fullUrl && (
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--gold-soft)",
              fontSize: "0.82rem",
              textDecoration: "none",
              border: "1px solid var(--gold-soft)",
              padding: "3px 10px",
              borderRadius: 4,
            }}
          >
            Open original ↗
          </a>
        )}
      </div>
    </div>
  );
}

function navButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid var(--cream)",
    color: "var(--cream)",
    width: 44,
    height: 44,
    borderRadius: "50%",
    cursor: disabled ? "default" : "pointer",
    fontSize: "1.6rem",
    opacity: disabled ? 0.3 : 0.85,
    flexShrink: 0,
  };
}

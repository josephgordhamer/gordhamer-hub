"use client";

import { setRequestStatus } from "./actions";

export function PendingRequestActions({ requestId }: { requestId: string }) {
  return (
    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
      <button
        className="btn btn-secondary"
        style={{ fontSize: "0.78rem", padding: "3px 8px" }}
        onClick={async () => {
          await setRequestStatus(requestId, "completed");
        }}
      >
        Mark as Done
      </button>
      <button
        className="btn"
        style={{ background: "var(--burgundy)", fontSize: "0.78rem", padding: "3px 8px" }}
        onClick={async () => {
          if (confirm("Dismiss this request?")) await setRequestStatus(requestId, "dismissed");
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

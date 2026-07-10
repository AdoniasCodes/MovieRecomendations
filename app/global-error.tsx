"use client";

// Last-resort boundary: catches errors in the root layout itself. Must render
// its own <html>/<body> because the layout is gone at this point.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0b0812", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 360, width: "100%", textAlign: "center", padding: 24, borderRadius: 24,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ fontSize: 36 }}>💔</div>
            <h2 style={{ margin: "12px 0 8px", fontSize: 18 }}>Amore Movies hit a snag</h2>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>
              Tap OK to reload the app{error.digest ? ` (ref ${error.digest})` : ""}.
            </p>
            <button
              onClick={() => reset()}
              style={{
                marginTop: 20, width: "100%", padding: "12px 0", borderRadius: 16, border: "none",
                background: "linear-gradient(135deg, #8b5cf6, #ec4899)", color: "#fff",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

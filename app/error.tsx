"use client";

// Route-level error boundary: a crash in any screen shows a blocking recovery
// modal instead of a white screen (workspace rule: blocking popup with OK).
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm">
      <div className="glass-strong w-full max-w-sm rounded-3xl p-6 text-center">
        <span className="text-4xl">🙈</span>
        <h2 className="mt-3 text-lg font-bold">Something broke</h2>
        <p className="mt-2 text-sm text-white/70">
          That screen hit an error. Tap OK to try again{error.digest ? ` (ref ${error.digest})` : ""}.
        </p>
        <button
          onClick={reset}
          className="mt-5 w-full rounded-2xl bg-accent-gradient py-3 text-sm font-bold text-white shadow-glow active:scale-95"
        >
          OK
        </button>
      </div>
    </div>
  );
}

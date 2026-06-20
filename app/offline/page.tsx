export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="text-5xl">🍿</div>
      <h1 className="mt-4 text-2xl font-black">You&apos;re offline</h1>
      <p className="mt-2 max-w-[16rem] text-sm text-white/50">
        Amore Movies needs a connection for fresh picks — your saved lists are still here when you reconnect.
      </p>
    </div>
  );
}

// Keeps the free Supabase project awake. Supabase pauses a free project after
// about a week with no activity, and a paused project broke login ("wrong PIN"),
// sync and push all at once (October 2026). Netlify runs this every 3 days.
//
// It makes a real database write (one tiny client_logs row, which anon may
// insert by design, see 0007) so the activity is unmistakable, and so every
// ping can be checked from the database:
//   select created_at from client_logs where session_id = 'keepalive' order by 1 desc;
// No new secrets: it uses the public URL + anon key Netlify already has.

export default async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error("[keepalive] missing Supabase env");
    return new Response("missing env", { status: 500 });
  }
  const headers = { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" };
  const res = await fetch(`${url}/rest/v1/client_logs`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ session_id: "keepalive", reason: "keepalive", who: null, entries: [] }),
    signal: AbortSignal.timeout(20_000),
  });
  console.log("[keepalive]", res.status);
  return new Response(`keepalive ${res.status}`, { status: res.ok ? 200 : 502 });
};

export const config = { schedule: "0 6 */3 * *" };

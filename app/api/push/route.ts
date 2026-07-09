import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sends a web push to every registered device of `toUserId`.
// Auth: the caller's Supabase JWT. RLS on push_subscriptions guarantees the
// caller can only read (and therefore push to) devices of their own couple.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!url || !anon || !pub || !priv) {
    return Response.json({ ok: false, reason: "push not configured" }, { status: 503 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ ok: false }, { status: 401 });

  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await sb.auth.getUser(token);
  if (!userData?.user) return Response.json({ ok: false }, { status: 401 });

  let payload: { toUserId?: string; title?: string; body?: string; tag?: string; url?: string };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!payload.toUserId || !payload.body) return Response.json({ ok: false }, { status: 400 });

  const { data: subs, error } = await sb
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", payload.toUserId);
  if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@amoremovies.app", pub, priv);

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({
          title: payload.title ?? "Amore Movies 💞",
          body: payload.body,
          tag: payload.tag ?? "amore-notif",
          url: payload.url ?? "/",
        })
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      // endpoint is dead (uninstalled / re-subscribed): prune it
      if (code === 404 || code === 410) {
        await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }
  return Response.json({ ok: true, sent, devices: subs?.length ?? 0 });
}

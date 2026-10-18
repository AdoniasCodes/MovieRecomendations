import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The VAPID public key is public by definition; serving it at runtime frees
// the client from build-time env inlining (which failed on Netlify when the
// var was scoped to functions only).
export async function GET() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  return Response.json({ configured: !!(pub && priv), publicKey: pub ?? null });
}

type Sub = { endpoint: string; p256dh: string; auth: string };
type Payload = {
  notificationId?: string;
  nonce?: string;
  toUserId?: string;
  title?: string;
  body?: string;
  test?: boolean;
};

// Two callers, one sender:
//  1. The database (migration 0008 trigger, via pg_net) posts
//     {notificationId, nonce} the moment a notification row lands. This is the
//     main path: it does not depend on the sender's phone reaching Netlify.
//  2. The sender's phone posts {notificationId, toUserId, body} with its JWT as
//     a backup. claim_push() is single-use, so only one of the two sends.
// {toUserId, body} without a notificationId is the legacy path (before 0008)
// and the Profile "send me a test" button.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!url || !anon || !pub || !priv) {
    return Response.json({ ok: false, reason: "push not configured" }, { status: 503 });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const sb = createClient(url, anon, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@amoremovies.app", pub, priv);

  if (payload.notificationId) {
    const { data, error } = await sb.rpc("claim_push", {
      p_id: payload.notificationId,
      p_nonce: payload.nonce ?? null,
    });
    if (!error) {
      if (!data) return Response.json({ ok: true, skipped: "claimed elsewhere" });
      const job = data as { id?: string; type?: string; body?: string; muted?: boolean; subs: Sub[] };
      if (job.muted) return Response.json({ ok: true, skipped: "muted" });
      const sent = await sendAll(sb, job.subs, {
        title: "Amore Movies 💞",
        body: job.body ?? "",
        tag: `amore-${job.id}`,
        url: "/",
      });
      return Response.json({ ok: true, sent, devices: job.subs.length });
    }
    // 0008 not applied yet: fall through to the legacy path below
    if (!/claim_push|PGRST202|42883/.test(`${error.code} ${error.message}`)) {
      return Response.json({ ok: false, reason: error.message }, { status: 500 });
    }
  }

  // legacy / self-test path: needs the caller's JWT, RLS scopes the subscriptions
  if (!token) return Response.json({ ok: false }, { status: 401 });
  const { data: userData } = await sb.auth.getUser(token);
  if (!userData?.user) return Response.json({ ok: false }, { status: 401 });
  if (!payload.toUserId || !payload.body) return Response.json({ ok: false }, { status: 400 });

  const { data: subs, error } = await sb
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", payload.toUserId);
  if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });

  const sent = await sendAll(sb, subs ?? [], {
    title: payload.title ?? "Amore Movies 💞",
    body: payload.body,
    tag: payload.notificationId ? `amore-${payload.notificationId}` : `amore-${Date.now()}`,
    url: "/",
  });
  return Response.json({ ok: true, sent, devices: subs?.length ?? 0 });
}

async function sendAll(
  sb: SupabaseClient,
  subs: Sub[],
  msg: { title: string; body: string; tag: string; url: string }
): Promise<number> {
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(msg),
          // high urgency: Android delivers at once instead of waiting for the
          // phone to leave Doze; Apple maps it to priority 10. A day of TTL so a
          // phone that is off still gets it when it comes back.
          { urgency: "high", TTL: 86_400 }
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // endpoint is dead (uninstalled / re-subscribed): prune it
        if (code === 404 || code === 410) {
          const { error } = await sb.rpc("prune_push", { p_endpoint: s.endpoint });
          if (error) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    })
  );
  return sent;
}

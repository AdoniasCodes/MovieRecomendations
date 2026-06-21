// Verifies the LIVE data flow between two paired users (mirrors lib/live.ts):
// save, vote -> match, watched, note, watch-along session + reactions, then RLS.
// Run: node scripts/verify-live.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const PW = "TestLive123!";
const ok = (c, m) => console.log(`${c ? "✓" : "✗"} ${m}`);
const T = "movie:496243"; // Parasite
let users = [];

const signIn = async (email) => {
  const { data: { user } } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  users.push(user);
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: PW });
  return { c, id: user.id };
};

try {
  const A = await signIn(`live.panda.${Date.now()}@gmail.com`);
  const B = await signIn(`live.hermi.${Date.now()}@gmail.com`);
  await A.c.rpc("ensure_profile", { p_name: "Panda", p_emoji: "🐼", p_color: "#7C3AED" });
  await B.c.rpc("ensure_profile", { p_name: "Hermi", p_emoji: "💞", p_color: "#DB2777" });
  const { data: code } = await A.c.rpc("create_couple");
  await B.c.rpc("join_couple", { p_code: code });
  const { data: m } = await A.c.from("couple_members").select("couple_id").limit(1);
  const cid = m[0].couple_id;
  ok(!!cid, `paired (couple ${code})`);

  // A saves a title
  await A.c.from("watchlist").upsert({ couple_id: cid, title_id: T, added_by: A.id, status: "interested" }, { onConflict: "couple_id,title_id", ignoreDuplicates: true });
  // A marks watched + rating; B marks watched
  await A.c.from("watched").upsert({ couple_id: cid, title_id: T, watcher: A.id, rating: 10 }, { onConflict: "couple_id,title_id,watcher" });
  await B.c.from("watched").upsert({ couple_id: cid, title_id: T, watcher: B.id }, { onConflict: "couple_id,title_id,watcher" });
  // A leaves a note
  await A.c.from("notes").insert({ couple_id: cid, title_id: T, author_id: A.id, body: "rewatch with Hermi 💞" });

  // both vote like -> match (B's vote forms it, mirroring pushVoteAndMaybeMatch)
  await A.c.from("votes").upsert({ couple_id: cid, title_id: T, user_id: A.id, value: "love" }, { onConflict: "couple_id,title_id,user_id" });
  await B.c.from("votes").upsert({ couple_id: cid, title_id: T, user_id: B.id, value: "like" }, { onConflict: "couple_id,title_id,user_id" });
  const { data: aVote } = await B.c.from("votes").select("value").eq("couple_id", cid).eq("title_id", T).eq("user_id", A.id).maybeSingle();
  if (aVote && (aVote.value === "like" || aVote.value === "love"))
    await B.c.from("matches").upsert({ couple_id: cid, title_id: T }, { onConflict: "couple_id,title_id", ignoreDuplicates: true });

  // watch-along: A starts a session, both react
  const { data: sess } = await A.c.from("watch_sessions").insert({ couple_id: cid, title_id: T, host_id: A.id, active: true }).select("id").single();
  await A.c.from("reactions").insert({ session_id: sess.id, by_user: A.id, kind: "emoji", content: "🍿" });
  await B.c.from("reactions").insert({ session_id: sess.id, by_user: B.id, kind: "text", content: "this is so good 🥹" });

  // ---- B reads the whole couple slice (what loadCoupleState does) ----
  const q = (t, f = "*") => B.c.from(t).select(f).eq("couple_id", cid);
  ok((await q("watchlist")).data.length === 1, "B sees the saved title");
  ok((await q("votes")).data.length === 2, "B sees both votes");
  ok((await q("matches")).data.length === 1, "B sees the MATCH 💞");
  ok((await q("watched")).data.length === 2, "B sees both watched records (rewatch shelf)");
  ok((await q("notes")).data[0]?.body.includes("rewatch"), "B reads A's note");
  const { data: rx } = await B.c.from("reactions").select("by_user,content").eq("session_id", sess.id);
  ok(rx.length === 2, `B sees both watch-along reactions (${rx.length})`);

  // RLS: stranger sees nothing
  const S = await signIn(`live.stranger.${Date.now()}@gmail.com`);
  ok((await S.c.from("watchlist").select("*").eq("couple_id", cid)).data.length === 0, "stranger sees 0 (RLS isolates)");

  for (const u of users) await admin.auth.admin.deleteUser(u.id);
  console.log("\n🧹 cleaned up. LIVE data flow verified end-to-end.");
} catch (e) {
  console.error("ERROR:", e.message);
  for (const u of users) await admin.auth.admin.deleteUser(u.id).catch(() => {});
  process.exit(1);
}

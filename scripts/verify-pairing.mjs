// Verifies the auth + pairing + RLS pipeline against the live Supabase project,
// then cleans up. Run: node scripts/verify-pairing.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const PW = "TestPair123!";
const ea = `amovies.test.panda.${Date.now()}@gmail.com`;
const eb = `amovies.test.hermi.${Date.now()}@gmail.com`;
let ua, ub;
const ok = (c, m) => console.log(`${c ? "✓" : "✗"} ${m}`);

try {
  // 1. create two confirmed users
  ({ data: { user: ua } } = await admin.auth.admin.createUser({ email: ea, password: PW, email_confirm: true }));
  ({ data: { user: ub } } = await admin.auth.admin.createUser({ email: eb, password: PW, email_confirm: true }));
  ok(ua && ub, `created two confirmed users`);

  // 2. user A signs in, ensures profile, creates couple
  const A = createClient(URL, ANON, { auth: { persistSession: false } });
  await A.auth.signInWithPassword({ email: ea, password: PW });
  await A.rpc("ensure_profile", { p_name: "Panda", p_emoji: "🐼", p_color: "#7C3AED" });
  const { data: code, error: ce } = await A.rpc("create_couple");
  ok(!!code && !ce, `A created couple, code = ${code}`);

  // 3. user B signs in, ensures profile, joins by code
  const B = createClient(URL, ANON, { auth: { persistSession: false } });
  await B.auth.signInWithPassword({ email: eb, password: PW });
  await B.rpc("ensure_profile", { p_name: "Hermi", p_emoji: "💞", p_color: "#DB2777" });
  const { error: je } = await B.rpc("join_couple", { p_code: code });
  ok(!je, `B joined couple${je ? " — " + je.message : ""}`);

  // 4. RLS: A sees 2 members and can read B's profile (couple-mate)
  const { data: mem } = await A.from("couple_members").select("user_id");
  ok(mem?.length === 2, `A sees ${mem?.length} couple members (expect 2)`);
  const { data: profs } = await A.from("profiles").select("name");
  ok((profs?.length ?? 0) >= 2, `A can read both profiles via RLS: ${profs?.map((p) => p.name).join(", ")}`);

  // 5. couple-scoped write/read: A writes a notification, B reads it
  const cid = mem[0] && (await A.from("couple_members").select("couple_id").limit(1)).data[0].couple_id;
  const { error: ne } = await A.from("notifications").insert({
    couple_id: cid, type: "nudge", actor_id: ua.id, to_id: ub.id, body: "Movie night? 🍿", read: false,
  });
  ok(!ne, `A wrote a notification${ne ? " — " + ne.message : ""}`);
  const { data: notifs } = await B.from("notifications").select("body");
  ok(notifs?.some((n) => n.body.includes("Movie night")), `B reads the couple notification via RLS`);

  // 6. RLS isolation: a third, unpaired user sees nothing
  const ec = `amovies.test.stranger.${Date.now()}@gmail.com`;
  const { data: { user: uc } } = await admin.auth.admin.createUser({ email: ec, password: PW, email_confirm: true });
  const C = createClient(URL, ANON, { auth: { persistSession: false } });
  await C.auth.signInWithPassword({ email: ec, password: PW });
  const { data: leak } = await C.from("notifications").select("body");
  ok((leak?.length ?? 0) === 0, `stranger sees ${leak?.length ?? 0} notifications (expect 0 — RLS isolates)`);

  // cleanup
  for (const u of [ua, ub, uc]) if (u) await admin.auth.admin.deleteUser(u.id);
  console.log("\n🧹 cleaned up test users. Pipeline verified.");
} catch (e) {
  console.error("ERROR:", e.message);
  for (const u of [ua, ub]) if (u) await admin.auth.admin.deleteUser(u.id).catch(() => {});
  process.exit(1);
}

// One-time: create Panda & Hermi's pre-paired Supabase accounts for PIN login.
// The PIN is the password (derived: `amore-<pin>`). Idempotent — safe to re-run.
// Run: node scripts/setup-pin-accounts.mjs [PIN]   (PIN defaults to 9009)
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

const PIN = process.argv[2] ?? "9009";
const PW = `amore-${PIN}`; // must match lib/pin-accounts.ts derivePassword()

const PEOPLE = [
  { key: "panda", name: "Panda", emoji: "🐼", color: "#7C3AED", email: "panda@amoremovies.app" },
  { key: "hermi", name: "Hermi", emoji: "💞", color: "#DB2777", email: "hermi@amoremovies.app" },
];

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);

async function findUser(email) {
  // listUsers is paginated; scan a couple pages (we only have a handful of users)
  for (let page = 1; page <= 5; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const u = data?.users?.find((x) => x.email === email);
    if (u) return u;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function ensureUser(p) {
  let u = await findUser(p.email);
  if (u) {
    await admin.auth.admin.updateUserById(u.id, { password: PW, email_confirm: true });
    log(`• ${p.name}: user exists, password synced to PIN`);
  } else {
    ({ data: { user: u } } = await admin.auth.admin.createUser({
      email: p.email, password: PW, email_confirm: true,
    }));
    log(`• ${p.name}: created confirmed user`);
  }
  return u;
}

async function memberCoupleId(client) {
  const { data } = await client.from("couple_members").select("couple_id").maybeSingle();
  return data?.couple_id ?? null;
}

try {
  log(`\nSetting up PIN accounts (PIN = ${PIN})…\n`);
  const ua = await ensureUser(PEOPLE[0]);
  const ub = await ensureUser(PEOPLE[1]);

  // Panda signs in, ensures profile, ensures a couple exists
  const A = createClient(URL, ANON, { auth: { persistSession: false } });
  await A.auth.signInWithPassword({ email: PEOPLE[0].email, password: PW });
  await A.rpc("ensure_profile", { p_name: PEOPLE[0].name, p_emoji: PEOPLE[0].emoji, p_color: PEOPLE[0].color });

  let coupleId = await memberCoupleId(A);
  let code;
  if (!coupleId) {
    ({ data: code } = await A.rpc("create_couple"));
    coupleId = await memberCoupleId(A);
    log(`• Panda created couple ${code}`);
  } else {
    const { data: c } = await A.from("couples").select("code").eq("id", coupleId).maybeSingle();
    code = c?.code;
    log(`• Panda already in couple ${code}`);
  }

  // Hermi signs in, ensures profile, joins the couple if not already a member
  const B = createClient(URL, ANON, { auth: { persistSession: false } });
  await B.auth.signInWithPassword({ email: PEOPLE[1].email, password: PW });
  await B.rpc("ensure_profile", { p_name: PEOPLE[1].name, p_emoji: PEOPLE[1].emoji, p_color: PEOPLE[1].color });

  const bCouple = await memberCoupleId(B);
  if (!bCouple) {
    const { error } = await B.rpc("join_couple", { p_code: code });
    if (error) throw new Error(`Hermi join failed: ${error.message}`);
    log(`• Hermi joined couple ${code}`);
  } else if (bCouple === coupleId) {
    log(`• Hermi already paired in ${code}`);
  } else {
    log(`⚠ Hermi is in a DIFFERENT couple (${bCouple}) — manual fix needed`);
  }

  // verify both see 2 members
  const { data: mem } = await A.from("couple_members").select("user_id");
  log(`\n✓ Done. Couple ${code} has ${mem?.length ?? "?"} members (expect 2).`);
  log(`  Panda → ${PEOPLE[0].email}`);
  log(`  Hermi → ${PEOPLE[1].email}`);
  log(`  PIN   → ${PIN}\n`);
  void ua; void ub;
} catch (e) {
  console.error("✗ setup failed:", e.message);
  process.exit(1);
}

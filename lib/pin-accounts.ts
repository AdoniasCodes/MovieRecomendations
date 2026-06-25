// The two fixed identities for Panda & Hermi. "Pick who you are" + a shared PIN
// signs into a pre-created, pre-paired Supabase account — no email, no codes.
// The PIN itself is the password (derived below), so a wrong PIN just fails login.

export interface PinIdentity {
  key: "panda" | "hermi";
  name: string;
  emoji: string;
  color: string;
  email: string;
}

export const PIN_IDENTITIES: PinIdentity[] = [
  { key: "panda", name: "Panda", emoji: "🐼", color: "#7C3AED", email: "panda@amoremovies.app" },
  { key: "hermi", name: "Hermi", emoji: "💞", color: "#DB2777", email: "hermi@amoremovies.app" },
];

/** PIN → account password. The PIN is short; we pad it to meet Supabase's 6-char
 * minimum. Must match the setup script (scripts/setup-pin-accounts.mjs). */
export const derivePassword = (pin: string) => `amore-${pin}`;

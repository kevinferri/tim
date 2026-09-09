const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const FORCE = process.argv.includes("--force");

const CHAT_ENV = path.join(ROOT, "apps/chat/.env.local");
const REALTIME_ENV = path.join(ROOT, "apps/realtime-server/.env.local");

for (const file of [CHAT_ENV, REALTIME_ENV]) {
  if (fs.existsSync(file) && !FORCE) {
    console.error(
      `${path.relative(ROOT, file)} already exists. Refusing to overwrite (pass --force to regenerate anyway).`
    );
    process.exit(1);
  }
}

const hex = (bytes) => crypto.randomBytes(bytes).toString("hex");

// Safe to generate randomly: internal-only secrets, not tied to any external
// service and not shared with production. CRYPTO_IV must be exactly 16 bytes
// as a utf8 string (see apps/realtime-server/src/lib/encryption.ts); hex(8)
// gives 16 hex characters = 16 bytes. CRYPTO_ALGORITHM must match the 24-byte
// key that same file derives via scrypt, so it's fixed, not random.
const generated = {
  JWT_SECRET: hex(32),
  CRYPTO_SECRET: hex(32),
  CRYPTO_IV: hex(8),
  CRYPTO_ALGORITHM: "aes-192-cbc",
  NEXTAUTH_SECRET: hex(32),
};

// Safe to default: plain localhost config, identical for anyone's local setup.
const localDefaults = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/tim",
  FRONTEND_URL: "http://localhost:3000",
  WS_SERVER_URL: "http://localhost:2428",
  WS_SERVER_PATH: "/ws/",
  WS_PORT: "2428",
  NEXTAUTH_URL: "http://localhost:3000/",
  NEXTAUTH_COOKIE_KEY: "next-auth.session-token",
  GOOGLE_CALLBACK_URL: "http://localhost:3000/google-login/callback",
  DEBUG: "false",
};

// Can't be generated — either a real external credential, or paired with one.
const needsManualValue = {
  GOOGLE_CLIENT_ID:
    "required to log in at all. Ask Kevin for a dev-only client, or create your own at https://console.cloud.google.com/apis/credentials (add the GOOGLE_CALLBACK_URL above as an authorized redirect URI)",
  GOOGLE_CLIENT_SECRET: "paired with GOOGLE_CLIENT_ID above",
  CLOUDINARY_URL: "only needed for avatar upload — ask Kevin, or create a free account at https://cloudinary.com",
  GIPHY_KEY: "only needed for the /giphy command — ask Kevin, or get a key at https://developers.giphy.com",
  YOUTUBE_ID: "only needed for the /youtube command — ask Kevin, or create credentials in Google Cloud Console",
  YOUTUBE_KEY: "paired with YOUTUBE_ID above",
  YOUTUBE_SECRET: "paired with YOUTUBE_ID above",
  OPENAI_API_KEY: "only needed for the /tim command — ask Kevin, or get a key at https://platform.openai.com",
};

const CHAT_KEYS = [
  "FRONTEND_URL", "JWT_SECRET", "DATABASE_URL", "CRYPTO_SECRET", "CRYPTO_ALGORITHM", "CRYPTO_IV",
  "GOOGLE_CALLBACK_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_URL", "NEXTAUTH_SECRET",
  "NEXTAUTH_COOKIE_KEY", "WS_SERVER_URL", "WS_SERVER_PATH", "CLOUDINARY_URL",
];

const REALTIME_KEYS = [
  "WS_PORT", "FRONTEND_URL", "JWT_SECRET", "DATABASE_URL", "CRYPTO_SECRET", "CRYPTO_ALGORITHM",
  "CRYPTO_IV", "DEBUG", "GIPHY_KEY", "YOUTUBE_ID", "YOUTUBE_SECRET", "YOUTUBE_KEY", "OPENAI_API_KEY",
];

const knownValues = { ...generated, ...localDefaults };

function buildEnvContent(keys) {
  return (
    keys
      .map((key) => {
        if (key in knownValues) return `${key}=${knownValues[key]}`;
        return `${key}=`;
      })
      .join("\n") + "\n"
  );
}

fs.writeFileSync(CHAT_ENV, buildEnvContent(CHAT_KEYS));
fs.writeFileSync(REALTIME_ENV, buildEnvContent(REALTIME_KEYS));

console.log("Wrote apps/chat/.env.local and apps/realtime-server/.env.local with throwaway local secrets.\n");

const stillNeeded = [...new Set([...CHAT_KEYS, ...REALTIME_KEYS])].filter((k) => needsManualValue[k]);
console.log("Still need real values for:");
for (const key of stillNeeded) {
  console.log(`  ${key} — ${needsManualValue[key]}`);
}
console.log(
  "\nLogging in won't work at all without GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET. Everything else above only disables one specific feature if left blank."
);

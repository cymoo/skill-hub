import { defineConfig } from "drizzle-kit";
import { readFileSync, existsSync } from "fs";

// drizzle-kit does not auto-load .env.local (Next.js convention).
// Parse it manually so DATABASE_URL is available when running db:* scripts.
for (const envFile of [".env", ".env.local"]) {
  if (!existsSync(envFile)) continue;
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

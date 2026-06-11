/**
 * Usage:
 *   npm run reset-password -- <email> <new-password>
 *
 * Example:
 *   npm run reset-password -- user@example.com newpassword123
 */

import { readFileSync, existsSync } from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hash } from "bcryptjs";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

// Load .env / .env.local (same logic as drizzle.config.ts)
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

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error("Usage: npm run reset-password -- <email> <new-password>");
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error("Error: password must be at least 8 characters");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Error: DATABASE_URL is not set");
  process.exit(1);
}

async function main() {
  const client = postgres(connectionString!, { max: 1 });
  const db = drizzle(client);

  try {
    const [user] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.error(`Error: no user found with email "${email}"`);
      process.exit(1);
    }

    const passwordHash = await hash(newPassword, 12);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    console.log(`Password reset successfully for ${user.username} (${email})`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

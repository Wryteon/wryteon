import { db, Users } from "astro:db";
import { hashPassword } from "../src/lib/auth";
import crypto from "crypto";

function getEnv(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function seed() {
  const username = getEnv("WRYTEON_ADMIN_USERNAME");
  const email = getEnv("WRYTEON_ADMIN_EMAIL");
  const adminPassword = getEnv("WRYTEON_ADMIN_PASSWORD");

  // Astro DB will attempt to execute db/seed.ts during startup if it exists.
  // To avoid breaking builds/runs, treat missing credentials as "seed disabled".
  if (!username || !email || !adminPassword) {
    const anySet = Boolean(username || email || adminPassword);
    if (anySet) {
      console.log(
        "ℹ️  Seed skipped: set WRYTEON_ADMIN_USERNAME, WRYTEON_ADMIN_EMAIL, and WRYTEON_ADMIN_PASSWORD to create an admin user.",
      );
    }
    return;
  }

  const passwordHash = await hashPassword(adminPassword);

  try {
    await db.insert(Users).values({
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash,
      createdAt: new Date(),
    });

    console.log("✅ Default admin user created");
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log("   Password: (set via WRYTEON_ADMIN_PASSWORD)");
    console.log("   (Change this password after first login!)");
  } catch (error) {
    console.log("ℹ️  Admin user already exists or seed already ran");
  }
}

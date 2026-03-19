import { db, eq } from "astro:db";
import { asDrizzleTable } from "@astrojs/db/utils";
import { Users } from "./config";
import { hash } from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 10;
const UsersTable = asDrizzleTable("Users", Users);

async function maybeLoadDotenv(): Promise<void> {
  // `astro db execute` does not always load `.env` automatically.
  // Load it on-demand for local dev, but stay safe in environments
  // where `dotenv` might not be installed.
  try {
    const dotenv = await import("dotenv");
    dotenv.config();
  } catch {
    // ignore
  }
}

function getEnv(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function adminExists(email: string): Promise<boolean> {
  const byEmail = await db
    .select({ id: UsersTable.id })
    .from(UsersTable)
    .where(eq(UsersTable.email, email))
    .limit(1);

  return byEmail.length > 0;
}

export default async function seed() {
  // If env vars are missing, try to populate them from `.env`.
  // (dotenv won't override already-set env vars by default.)
  if (!process.env.WRYTEON_ADMIN_EMAIL || !process.env.WRYTEON_ADMIN_PASSWORD) {
    await maybeLoadDotenv();
  }

  const email = getEnv("WRYTEON_ADMIN_EMAIL");
  const adminPassword = getEnv("WRYTEON_ADMIN_PASSWORD");

  // Astro DB will attempt to execute db/seed.ts during startup if it exists.
  // To avoid breaking builds/runs, treat missing credentials as "seed disabled".
  if (!email || !adminPassword) {
    const anySet = Boolean(email || adminPassword);
    if (anySet) {
      console.log(
        "ℹ️  Seed skipped: set WRYTEON_ADMIN_EMAIL and WRYTEON_ADMIN_PASSWORD to create an admin user.",
      );
    }
    return;
  }

  if (await adminExists(email)) {
    console.log("ℹ️  Admin user already exists; skipping seed");
    return;
  }

  const passwordHash = await hash(adminPassword, SALT_ROUNDS);

  try {
    await db.insert(UsersTable).values({
      id: crypto.randomUUID(),
      email,
      passwordHash,
      createdAt: new Date(),
    });

    console.log("✅ Default admin user created");
    console.log(`   Email: ${email}`);
    console.log("   Password: (set via WRYTEON_ADMIN_PASSWORD)");
    console.log("   (Change this password after first login!)");
  } catch (error) {
    console.error("❌ Failed to create default admin user", error);
    throw error;
  }
}

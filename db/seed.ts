import { db, Users } from "astro:db";
import { hashPassword } from "../src/lib/auth";
import crypto from "crypto";

export default async function seed() {
  // Create default admin user
  const adminPassword = "admin123";
  const passwordHash = await hashPassword(adminPassword);

  try {
    await db.insert(Users).values({
      id: crypto.randomUUID(),
      username: "admin",
      email: "admin@example.com",
      passwordHash,
      createdAt: new Date(),
    });

    console.log("✅ Default admin user created");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("   (Change this password after first login!)");
  } catch (error) {
    console.log("ℹ️  Admin user already exists or seed already ran");
  }
}

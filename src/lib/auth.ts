import { hash, compare } from "bcrypt";
import { db, eq } from "astro:db";
import { asDrizzleTable } from "@astrojs/db/utils";
import { Users, Sessions } from "../../db/config";
import crypto from "crypto";

const SALT_ROUNDS = 10;
const SESSION_DURATION_DAYS = 7;
export const MIN_PASSWORD_LENGTH = 8;

// Create type-safe table references
const UsersTable = asDrizzleTable("Users", Users);
const SessionsTable = asDrizzleTable("Sessions", Sessions);

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await db.insert(SessionsTable).values({
    id: crypto.randomUUID(),
    userId,
    token,
    expiresAt,
    createdAt: new Date(),
  });

  return token;
}

/**
 * Validate a session token and return user ID if valid
 */
export async function validateSession(
  token: string,
): Promise<{ userId: string } | null> {
  try {
    const result = await db
      .select()
      .from(SessionsTable)
      .where(eq(SessionsTable.token, token))
      .limit(1);

    const session = result[0] ?? null;

    if (!session) return null;

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      // Delete expired session
      await db.delete(SessionsTable).where(eq(SessionsTable.id, session.id));
      return null;
    }

    return { userId: session.userId };
  } catch (error) {
    console.error("Session validation error:", error);
    return null;
  }
}

/**
 * Extract session token from Cookie header
 */
export function getSessionTokenFromRequest(request: Request): string | null {
  const cookies = request.headers.get("cookie") || "";
  const token = cookies
    .split(";")
    .find((entry) => entry.trim().startsWith("session="))
    ?.split("=")[1];

  return token ?? null;
}

/**
 * Validate session attached to the request cookie
 */
export async function getRequestSession(
  request: Request,
): Promise<{ userId: string } | null> {
  const token = getSessionTokenFromRequest(request);
  return token ? validateSession(token) : null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  try {
    const result = await db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.email, email))
      .limit(1);

    return result[0] ?? null;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  try {
    const result = await db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.id, userId))
      .limit(1);

    return result[0] ?? null;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}

/**
 * Change a user's password after verifying their current password.
 */
export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    };
  }

  try {
    const user = await getUserById(userId);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const isCurrentPasswordValid = await verifyPassword(
      currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    const newPasswordHash = await hashPassword(newPassword);

    await db
      .update(UsersTable)
      .set({ passwordHash: newPasswordHash })
      .where(eq(UsersTable.id, userId));

    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    return { success: false, error: "Failed to change password" };
  }
}

/**
 * Create a new user
 */
export async function createUser(email: string, password: string) {
  try {
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();

    await db.insert(UsersTable).values({
      id: userId,
      email,
      passwordHash,
      createdAt: new Date(),
    });

    return { id: userId, email };
  } catch (error) {
    console.error("Create user error:", error);
    throw error;
  }
}

/**
 * Verify login credentials
 */
export async function verifyLogin(
  email: string,
  password: string,
): Promise<{ userId: string } | null> {
  const user = await getUserByEmail(email);

  if (!user) {
    return null;
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    return null;
  }

  return { userId: user.id };
}

/**
 * Delete a session
 */
export async function deleteSession(token: string): Promise<void> {
  try {
    await db.delete(SessionsTable).where(eq(SessionsTable.token, token));
  } catch (error) {
    console.error("Delete session error:", error);
  }
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  try {
    await db.delete(SessionsTable).where(eq(SessionsTable.userId, userId));
  } catch (error) {
    console.error("Delete user sessions error:", error);
  }
}

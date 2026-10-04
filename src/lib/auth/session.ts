/**
 * PLACEHOLDER AUTH. A cookie holds the mock user id; there are no passwords.
 * TODO(supabase-auth): replace with Supabase Auth (email + password, verification, reset,
 * leaked-password protection) via @supabase/ssr. Keep getCurrentUser()'s signature.
 */
import { cookies } from "next/headers";
import { getData } from "@/lib/data";
import type { Profile } from "@/lib/data/types";

export const SESSION_COOKIE = "dts_mock_uid";

export async function getCurrentUser(): Promise<Profile | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return id ? getData().getProfile(id) : null;
}

export async function setSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

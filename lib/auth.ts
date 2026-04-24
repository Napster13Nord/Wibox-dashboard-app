import { auth, currentUser } from '@clerk/nextjs/server';

export type UserRole = 'manager' | 'kitchen';

/**
 * Get the role of the current user from their publicMetadata.
 * Returns 'kitchen' as the safe default if no role is set.
 */
export async function getUserRole(): Promise<UserRole> {
  const user = await currentUser();
  const role = user?.publicMetadata?.role as UserRole | undefined;
  return role ?? 'kitchen';
}

/**
 * Returns true if the current user has the 'manager' role.
 */
export async function isManager(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'manager';
}

/**
 * Client-side helper: extract role from Clerk session claims.
 * Use this in 'use client' components via useAuth().sessionClaims.
 */
export function getRoleFromClaims(
  sessionClaims: Record<string, unknown> | null | undefined
): UserRole {
  const role = sessionClaims?.metadata
    ? (sessionClaims.metadata as Record<string, unknown>)?.role
    : undefined;
  return (role as UserRole) ?? 'kitchen';
}

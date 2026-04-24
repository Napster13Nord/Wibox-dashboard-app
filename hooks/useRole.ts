'use client';

import { useUser } from '@clerk/nextjs';

export type UserRole = 'manager' | 'kitchen';

/**
 * Client-side hook to get the current user's role.
 * Reads from Clerk's publicMetadata.role.
 * Default: 'kitchen' (read-only).
 */
export function useRole(): { role: UserRole; isManager: boolean; isLoaded: boolean } {
  const { user, isLoaded } = useUser();
  const role = (user?.publicMetadata?.role as UserRole) ?? 'kitchen';
  return { role, isManager: role === 'manager', isLoaded };
}

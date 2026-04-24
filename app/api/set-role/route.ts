import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * POST /api/set-role
 * Body: { userId: string, role: 'manager' | 'kitchen' }
 * Only managers can set roles on other users.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: callerId } = await auth();
    if (!callerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check caller is a manager
    const client = await clerkClient();
    const caller = await client.users.getUser(callerId);
    const callerRole = caller.publicMetadata?.role as string | undefined;

    if (callerRole !== 'manager') {
      return NextResponse.json({ error: 'Forbidden: only managers can assign roles' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !['manager', 'kitchen'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid request. Provide userId and role (manager | kitchen).' },
        { status: 400 }
      );
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });

    return NextResponse.json({ success: true, userId, role });
  } catch (error) {
    console.error('Error setting role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

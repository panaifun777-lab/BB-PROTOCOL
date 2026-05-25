import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/avatars — List all avatars
export async function GET() {
  try {
    const avatars = await db.avatar.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(avatars);
  } catch (error) {
    console.error('Failed to list avatars:', error);
    return NextResponse.json(
      { error: 'Failed to list avatars' },
      { status: 500 }
    );
  }
}

// POST /api/avatars — Create a new avatar
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ownerAddress, tier } = body;

    if (!name || !ownerAddress) {
      return NextResponse.json(
        { error: 'name and ownerAddress are required' },
        { status: 400 }
      );
    }

    // Generate a soulId based on owner address
    const soulId = `0x${ownerAddress.slice(2, 6)}...${ownerAddress.slice(-4)}`;

    // Generate a mock cognition root hash
    const cognitionRoot = `Qm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

    const avatar = await db.avatar.create({
      data: {
        soulId,
        ownerAddress,
        name,
        cognitionRoot,
        tier: tier || 'starter',
      },
    });

    return NextResponse.json(avatar, { status: 201 });
  } catch (error) {
    console.error('Failed to create avatar:', error);
    return NextResponse.json(
      { error: 'Failed to create avatar' },
      { status: 500 }
    );
  }
}

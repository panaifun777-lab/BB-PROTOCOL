import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/avatars/[id] — Get avatar by ID with relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const avatar = await db.avatar.findUnique({
      where: { id },
      include: {
        skills: {
          include: { skill: true },
          orderBy: { unlocked: 'desc' },
        },
        revenues: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        delegations: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        timeline: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!avatar) {
      return NextResponse.json(
        { error: 'Avatar not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(avatar);
  } catch (error) {
    console.error('Failed to get avatar:', error);
    return NextResponse.json(
      { error: 'Failed to get avatar' },
      { status: 500 }
    );
  }
}

// PATCH /api/avatars/[id] — Update avatar fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify avatar exists
    const existing = await db.avatar.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Avatar not found' },
        { status: 404 }
      );
    }

    // Only allow updating specific fields
    const allowedFields = ['resonanceScore', 'circuitState', 'isFrozen', 'name'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const avatar = await db.avatar.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(avatar);
  } catch (error) {
    console.error('Failed to update avatar:', error);
    return NextResponse.json(
      { error: 'Failed to update avatar' },
      { status: 500 }
    );
  }
}

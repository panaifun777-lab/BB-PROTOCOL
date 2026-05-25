import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/skills — List all skills
export async function GET() {
  try {
    const skills = await db.skill.findMany({
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(skills);
  } catch (error) {
    console.error('Failed to list skills:', error);
    return NextResponse.json(
      { error: 'Failed to list skills' },
      { status: 500 }
    );
  }
}

// POST /api/skills — Create a new skill definition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, tier, revenueThreshold, mcpEndpoint, icon, category } = body;

    if (!name || !description || tier === undefined || revenueThreshold === undefined) {
      return NextResponse.json(
        { error: 'name, description, tier, and revenueThreshold are required' },
        { status: 400 }
      );
    }

    const skill = await db.skill.create({
      data: {
        name,
        description,
        tier,
        revenueThreshold,
        mcpEndpoint: mcpEndpoint || null,
        icon: icon || null,
        category: category || 'general',
      },
    });

    return NextResponse.json(skill, { status: 201 });
  } catch (error) {
    console.error('Failed to create skill:', error);
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    );
  }
}

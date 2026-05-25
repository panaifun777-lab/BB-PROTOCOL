import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/resonance — Get resonance history for an avatar
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const avatarId = searchParams.get('avatarId');
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    if (!avatarId) {
      return NextResponse.json(
        { error: 'avatarId query parameter is required' },
        { status: 400 }
      );
    }

    const history = await db.resonanceHistory.findMany({
      where: { avatarId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Failed to get resonance history:', error);
    return NextResponse.json(
      { error: 'Failed to get resonance history' },
      { status: 500 }
    );
  }
}

// POST /api/resonance — Record a new resonance score
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarId, score, source } = body;

    if (!avatarId || score === undefined || !source) {
      return NextResponse.json(
        { error: 'avatarId, score, and source are required' },
        { status: 400 }
      );
    }

    // Validate score range
    if (score < 0 || score > 100) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Determine circuit state based on score
    let circuitState: string;
    let isFrozen: boolean;

    if (score < 50) {
      circuitState = 'HARD_PAUSE';
      isFrozen = true;
    } else if (score < 70) {
      circuitState = 'SOFT_LIMIT';
      isFrozen = false;
    } else {
      circuitState = 'NORMAL';
      isFrozen = false;
    }

    const result = await db.$transaction(async (tx) => {
      // Get current avatar state
      const avatar = await tx.avatar.findUnique({ where: { id: avatarId } });
      if (!avatar) {
        throw new Error('Avatar not found');
      }

      const previousCircuitState = avatar.circuitState;

      // Create resonance history record
      const resonanceRecord = await tx.resonanceHistory.create({
        data: {
          avatarId,
          score,
          source,
        },
      });

      // Update avatar's resonance score, circuit state, and frozen status
      await tx.avatar.update({
        where: { id: avatarId },
        data: {
          resonanceScore: score,
          circuitState,
          isFrozen,
          lastActivityAt: new Date(),
        },
      });

      // Create timeline events
      await tx.timelineEvent.create({
        data: {
          avatarId,
          eventType: 'resonance_update',
          details: `共振分更新: ${avatar.resonanceScore} → ${score} (${score >= avatar.resonanceScore ? '+' : ''}${score - avatar.resonanceScore})`,
        },
      });

      // Create circuit change event if state changed
      if (previousCircuitState !== circuitState) {
        await tx.timelineEvent.create({
          data: {
            avatarId,
            eventType: 'circuit_change',
            details: `认知状态: ${previousCircuitState} → ${circuitState}${isFrozen ? ' (认知熔断冻结)' : ''}`,
          },
        });
      }

      return resonanceRecord;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record resonance score';
    const status = message === 'Avatar not found' ? 404 : 500;

    if (status === 404) {
      return NextResponse.json({ error: message }, { status });
    }

    console.error('Failed to record resonance score:', error);
    return NextResponse.json(
      { error: 'Failed to record resonance score' },
      { status: 500 }
    );
  }
}

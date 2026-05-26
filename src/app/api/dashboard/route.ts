import { NextResponse } from 'next/server';
import { MOCK_AVATAR, MOCK_AVATAR_SKILLS, MOCK_REVENUE_SUMMARY, MOCK_REVENUES, MOCK_DELEGATIONS, MOCK_TIMELINE, MOCK_RESONANCE_HISTORY } from '@/lib/mock-data';

export async function GET() {
  try {
    return NextResponse.json({
      avatar: MOCK_AVATAR,
      skills: MOCK_AVATAR_SKILLS,
      revenueSummary: MOCK_REVENUE_SUMMARY,
      recentRevenues: MOCK_REVENUES,
      delegations: MOCK_DELEGATIONS,
      timeline: MOCK_TIMELINE,
      resonanceHistory: MOCK_RESONANCE_HISTORY,
    });
  } catch (error) {
    console.error('[API] Error in GET /api/dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

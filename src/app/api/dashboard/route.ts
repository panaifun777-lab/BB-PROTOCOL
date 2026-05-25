import { NextResponse } from 'next/server';
import { MOCK_AVATAR, MOCK_AVATAR_SKILLS, MOCK_REVENUE_SUMMARY, MOCK_REVENUES, MOCK_DELEGATIONS, MOCK_TIMELINE, MOCK_RESONANCE_HISTORY } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({
    avatar: MOCK_AVATAR,
    skills: MOCK_AVATAR_SKILLS,
    revenueSummary: MOCK_REVENUE_SUMMARY,
    recentRevenues: MOCK_REVENUES,
    delegations: MOCK_DELEGATIONS,
    timeline: MOCK_TIMELINE,
    resonanceHistory: MOCK_RESONANCE_HISTORY,
  });
}

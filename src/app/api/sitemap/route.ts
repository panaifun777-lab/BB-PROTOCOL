import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const baseUrl = 'https://bb-protocol.dev';
    const now = new Date().toISOString();

    const pages = [
      { path: '/', priority: 1.0, changefreq: 'daily' },
      { path: '/api/health', priority: 0.8, changefreq: 'hourly' },
      { path: '/api/dashboard', priority: 0.9, changefreq: 'realtime' },
      { path: '/api/avatars', priority: 0.8, changefreq: 'daily' },
      { path: '/api/skills', priority: 0.7, changefreq: 'weekly' },
      { path: '/api/delegations', priority: 0.7, changefreq: 'daily' },
      { path: '/api/revenues', priority: 0.8, changefreq: 'daily' },
      { path: '/api/resonance', priority: 0.7, changefreq: 'hourly' },
      { path: '/api/compliance', priority: 0.6, changefreq: 'weekly' },
      { path: '/api/security', priority: 0.7, changefreq: 'daily' },
      { path: '/api/deployment', priority: 0.8, changefreq: 'daily' },
      { path: '/api/monitoring', priority: 0.7, changefreq: 'realtime' },
      { path: '/api/performance', priority: 0.6, changefreq: 'hourly' },
      { path: '/api/feature-flags', priority: 0.5, changefreq: 'weekly' },
      { path: '/api/multichain', priority: 0.7, changefreq: 'daily' },
      { path: '/api/sdk-platform', priority: 0.6, changefreq: 'weekly' },
      { path: '/api/ecosystem', priority: 0.6, changefreq: 'weekly' },
      { path: '/api/dao-governance', priority: 0.7, changefreq: 'daily' },
      { path: '/api/web3-integration', priority: 0.7, changefreq: 'daily' },
      { path: '/api/liquidity', priority: 0.7, changefreq: 'hourly' },
      { path: '/api/data-infra', priority: 0.6, changefreq: 'weekly' },
      { path: '/api/contracts-arch', priority: 0.6, changefreq: 'weekly' },
      { path: '/api/engine-arch', priority: 0.6, changefreq: 'weekly' },
      { path: '/api/engine-status', priority: 0.8, changefreq: 'realtime' },
      { path: '/api/contracts/simulate', priority: 0.6, changefreq: 'weekly' },
    ];

    const sitemap = {
      generatedAt: now,
      site: baseUrl,
      pages: pages.map((p) => ({
        url: `${baseUrl}${p.path}`,
        priority: p.priority,
        changefreq: p.changefreq,
        lastmod: now,
      })),
      total_pages: pages.length,
      discovery_files: {
        llms_txt: `${baseUrl}/llms.txt`,
        agents_md: `${baseUrl}/AGENTS.md`,
        sitemap_xml: `${baseUrl}/sitemap.xml`,
        sitemap_md: `${baseUrl}/sitemap.md`,
        robot_txt: `${baseUrl}/robots.txt`,
      },
    };

    return NextResponse.json(sitemap, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[API] Error in sitemap:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

/**
 * Proxy route for the Gutendex API (https://gutendex.com).
 * Needed because Gutendex doesn't serve CORS headers broad enough for
 * browser-side fetches, so all API calls are routed through here.
 *
 * Usage: GET /api/gutenberg?path=/books?search=dracula
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // Only allow calls to gutendex.com to prevent open-proxy abuse
  const upstreamUrl = `https://gutendex.com${path}`;

  try {
    const response = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Upstream request failed', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to reach Gutendex' }, { status: 502 });
  }
}

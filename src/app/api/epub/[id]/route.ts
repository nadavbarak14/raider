import { NextResponse } from 'next/server';

/**
 * Proxy route for fetching EPUB files from Project Gutenberg.
 * Needed because Gutenberg doesn't serve CORS headers, so the browser
 * blocks direct cross-origin fetches from the client.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try multiple URL patterns — Gutenberg isn't perfectly consistent
  const urls = [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.epub`,
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.epub`,
    `https://www.gutenberg.org/ebooks/${id}.epub3.images`,
    `https://www.gutenberg.org/ebooks/${id}.epub.images`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (response.ok) {
        const blob = await response.arrayBuffer();
        return new NextResponse(blob, {
          headers: {
            'Content-Type': 'application/epub+zip',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch {
      // Try next URL
    }
  }

  return NextResponse.json({ error: 'EPUB not found' }, { status: 404 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    try {
        // Fetch from DuckDuckGo HTML layout (no JS required)
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Search fetch failed: ${response.statusText}` }, { status: 502 });
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const results: { title: string; url: string; snippet: string }[] = [];

        $('.result__body').each((_, el) => {
            const titleEl = $(el).find('.result__a');
            const snippetEl = $(el).find('.result__snippet');

            const title = titleEl.text().trim();
            const rawUrl = titleEl.attr('href') || '';
            const snippet = snippetEl.text().trim();

            if (title && rawUrl) {
                // Parse DuckDuckGo redirect URL
                let cleanUrl = rawUrl;
                if (rawUrl.startsWith('//duckduckgo.com/l/?')) {
                    const match = rawUrl.match(/uddg=([^&]+)/);
                    if (match) {
                        cleanUrl = decodeURIComponent(match[1]);
                    }
                }

                results.push({ title, url: cleanUrl, snippet });
            }
        });

        return NextResponse.json({ results: results.slice(0, 8), query });
    } catch (error: any) {
        console.error('Browser search error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

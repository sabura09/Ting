import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import TurndownService from 'turndown';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // 1. Fetch HTML
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        const html = response.data;

        // 2. Initial Cleanup with Turndown
        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        });
        
        const cleanHtml = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
            .replace(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gmi, "")
            .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gmi, "")
            .replace(/<header\b[^>]*>([\s\S]*?)<\/header>/gmi, "")
            .replace(/<aside\b[^>]*>([\s\S]*?)<\/aside>/gmi, "");

        const rawMarkdown = turndownService.turndown(cleanHtml);

        return NextResponse.json({ 
            rawMarkdown: rawMarkdown.slice(0, 30000) // Truncate for AI context efficiency
        });

    } catch (error: any) {
        console.error('[WebsiteWiki Scraper] Error:', error.message);
        
        let errorMessage = 'Failed to scrape content. The website might be unreachable or invalid.';
        
        if (error.response) {
            const status = error.response.status;
            if (status === 403 || status === 999 || status === 401) {
                errorMessage = 'This website restricts automated access. Please try a different URL.';
            } else if (status === 404) {
                errorMessage = 'The provided URL was not found.';
            } else {
                errorMessage = `Failed to scrape content (Status: ${status}).`;
            }
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'The request timed out. The website took too long to respond.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

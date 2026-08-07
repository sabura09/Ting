import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithRetryAndFallback(targetUrl: string, maxRetries = 2) {
    let lastResponse: Response | null = null;
    let lastError: Error | null = null;
    
    // Attempt direct fetch with rotating user agents
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                },
                redirect: 'follow',
            });
            
            lastResponse = response;
            
            // If success or not a rate-limit/forbidden error, return it
            if (response.ok || (response.status !== 429 && response.status !== 403)) {
                return response;
            }
            
            // Wait a bit before retry (exponential backoff)
            await new Promise(res => setTimeout(res, 500 * (i + 1)));
        } catch (error: any) {
            // Network error, ignore and retry
            lastError = error;
            console.error(`Fetch attempt ${i + 1} failed:`, error.message);
        }
    }
    
    // Fallback to proxy services if direct fetch consistently fails with 429/403 or network error
    const fallbackProxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
    ];
    
    for (const proxyUrl of fallbackProxies) {
        try {
            const proxyResponse = await fetch(proxyUrl, {
                headers: {
                    'User-Agent': getRandomUserAgent(),
                },
                redirect: 'follow',
            });
            
            if (proxyResponse.ok) {
                return proxyResponse;
            }
        } catch (e: any) {
            console.error(`Fallback proxy ${proxyUrl} failed:`, e.message);
        }
    }
    
    // If all fail, return the last direct response (which is likely a 429) or throw
    if (lastResponse) {
        return lastResponse;
    }
    
    if (lastError) {
        throw lastError;
    }
    
    throw new Error('All fetch attempts and fallbacks failed');
}
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return new Response('Missing URL parameter', { status: 400 });
    }

    try {
        const parsedUrl = new URL(targetUrl);
        const origin = parsedUrl.origin;

        const response = await fetchWithRetryAndFallback(targetUrl);

        if (!response.ok) {
            return new Response(`Failed to fetch target page: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || '';

        // For non-HTML content (images, CSS, JS, etc.), pass through directly
        if (!contentType.includes('text/html')) {
            const body = await response.arrayBuffer();
            return new Response(body, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=3600',
                },
            });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Rewrite base URL to handle relative assets
        if (!$('base').length) {
            $('head').prepend(`<base href="${origin}/">`);
        }

        // Inject overrides to prevent history state security errors
        $('head').prepend(`
            <script>
                (function() {
                    var originalPushState = window.history.pushState;
                    var originalReplaceState = window.history.replaceState;

                    function tryRewriteUrl(url) {
                        if (!url) return url;
                        try {
                            var parsed = new URL(url, window.location.href);
                            if (parsed.origin !== window.location.origin) {
                                if (parsed.pathname === '/api/browser/proxy' || parsed.pathname.indexOf('/proxy') !== -1) {
                                    return parsed.pathname + parsed.search + parsed.hash;
                                }
                            }
                        } catch (e) {}
                        return url;
                    }

                    window.history.pushState = function(state, title, url) {
                        var targetUrl = tryRewriteUrl(url);
                        try {
                            return originalPushState.call(this, state, title, targetUrl);
                        } catch (e) {
                            if (e.name === 'SecurityError') {
                                console.warn('history.pushState cross-origin call swallowed:', url);
                                return;
                            }
                            throw e;
                        }
                    };

                    window.history.replaceState = function(state, title, url) {
                        var targetUrl = tryRewriteUrl(url);
                        try {
                            return originalReplaceState.call(this, state, title, targetUrl);
                        } catch (e) {
                            if (e.name === 'SecurityError') {
                                console.warn('history.replaceState cross-origin call swallowed:', url);
                                return;
                            }
                            throw e;
                        }
                    };
                })();
            </script>
        `);

        // Rewrite links (a tags) to route through our proxy
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
                try {
                    const absoluteUrl = new URL(href, targetUrl).toString();
                    $(el).attr('href', `/api/browser/proxy?url=${encodeURIComponent(absoluteUrl)}`);
                } catch {
                    // Keep original if URL parsing fails
                }
            }
        });

        // Rewrite form actions to route through proxy
        $('form').each((_, el) => {
            const action = $(el).attr('action');
            if (action) {
                try {
                    const absoluteUrl = new URL(action, targetUrl).toString();
                    $(el).attr('action', `/api/browser/proxy?url=${encodeURIComponent(absoluteUrl)}`);
                } catch {
                    // Keep original
                }
            }
        });

        // Inject IPC script to communicate iframe state to the parent React app
        $('body').append(`
            <script>
                (function() {
                    // Intercept link clicks
                    document.addEventListener('click', function(e) {
                        var target = e.target.closest('a');
                        if (target && target.href) {
                            try {
                                var proxiedUrl = new URL(target.href, window.location.origin);
                                var realUrl = proxiedUrl.searchParams.get('url');
                                if (realUrl) {
                                    window.parent.postMessage({
                                        type: 'BROWSER_NAVIGATION',
                                        url: realUrl
                                    }, '*');
                                }
                            } catch(err) {}
                        }
                    }, true);

                    // Notify parent of load completion
                    window.addEventListener('load', function() {
                        window.parent.postMessage({
                            type: 'BROWSER_LOADED',
                            url: '${targetUrl.replace(/'/g, "\\'")}',
                            title: document.title
                        }, '*');
                    });
                })();
            </script>
        `);

        return new Response($.html(), {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'X-Frame-Options': 'ALLOWALL',
                'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors *",
            },
        });

    } catch (error: any) {
        return new Response(`Proxy Error: ${error.message}`, { status: 500 });
    }
}

// Also support extracting page text content for the AI agent
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const { url } = await req.json();
        if (!url) {
            return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400 });
        }

        const response = await fetchWithRetryAndFallback(url);

        if (!response.ok) {
            return new Response(JSON.stringify({ error: `Fetch failed: ${response.statusText}` }), { status: response.status });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove noise elements
        $('script, style, noscript, nav, footer, header, iframe, svg').remove();

        const title = $('title').text().trim();
        const metaDescription = $('meta[name="description"]').attr('content') || '';

        // Extract meaningful text content
        const textContent = $('body').text()
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 8000); // Cap to avoid overloading the model context

        // Extract key links
        const links: { text: string; href: string }[] = [];
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !href.startsWith('#') && !href.startsWith('javascript:') && links.length < 20) {
                try {
                    const absoluteUrl = new URL(href, url).toString();
                    links.push({ text: text.slice(0, 100), href: absoluteUrl });
                } catch {
                    // skip
                }
            }
        });

        return new Response(JSON.stringify({
            title,
            metaDescription,
            textContent,
            links,
            url,
        }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

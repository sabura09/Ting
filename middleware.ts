import { NextResponse, type NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

export async function middleware(request: NextRequest) {
    console.log(`[Middleware/Proxy] ${request.method} ${request.nextUrl.pathname}`);

    const hostname = request.headers.get('host') || '';
    const currentHost = hostname.replace(/:\d+$/, '');
    const isLocalhost = currentHost.endsWith('localhost');

    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || (process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : null);

    let subdomain = null;
    let isCustomDomain = false;
    let customDomainHost = null;

    if (baseDomain && currentHost !== baseDomain && currentHost.endsWith('.' + baseDomain)) {
        subdomain = currentHost.replace('.' + baseDomain, '');
    } else if (baseDomain && currentHost !== baseDomain && !currentHost.endsWith('.' + baseDomain) && !isLocalhost) {
        isCustomDomain = true;
        customDomainHost = currentHost;
    } else if (!baseDomain) {
        // Fallback heuristic logic if base domain is not set
        // We avoid guessing for arbitrary custom domains to prevent breaking deployments
        // on subdomains (e.g., ai-suite.mounikai.shop).
        if (isLocalhost) {
            const parts = currentHost.split('.');
            if (parts.length > 1 && parts[0] !== 'www') {
                subdomain = parts[0];
            }
        } else if (currentHost.endsWith('.vercel.app')) {
            const parts = currentHost.split('.');
            // For Vercel, URLs look like project-name.vercel.app (3 parts).
            // A subdomain would be site-name.project-name.vercel.app (4 parts).
            if (parts.length > 3 && parts[0] !== 'www') {
                subdomain = parts[0];
            }
        }
    }

    const { pathname } = request.nextUrl;

    if (subdomain) {
        // Exclude Next.js system paths from subdomain interception
        if (!pathname.startsWith('/_next') && !pathname.startsWith('/api') && !pathname.startsWith('/images')) {
            return NextResponse.rewrite(new URL(`/sites/${subdomain}`, request.url));
        }
    } else if (isCustomDomain) {
        if (!pathname.startsWith('/_next') && !pathname.startsWith('/api') && !pathname.startsWith('/images')) {
            return NextResponse.rewrite(new URL(`/sites/custom/${customDomainHost}`, request.url));
        }
    }

    const session = request.cookies.get('session')?.value;

    // The pathname is already extracted above

    // Allow service worker and PWA-related files through without auth
    if (
        pathname === '/sw.js' ||
        pathname === '/manifest.json' ||
        pathname.startsWith('/workbox-') ||
        pathname.startsWith('/swe-worker-') ||
        pathname.startsWith('/icons/')
    ) {
        return NextResponse.next();
    }

    // Public paths
    const isPublicPath = pathname === '/login' || pathname === '/register' || pathname === '/' || pathname === '/admin/register' || pathname === '/verify-email' || pathname === '/custom-requirement' || pathname.startsWith('/sites/');

    // API paths that don't need auth
    if (pathname?.startsWith('/api/auth') || pathname?.startsWith('/api/webhook') || pathname?.startsWith('/api/cron') || pathname === '/api/admin/register' || pathname === '/api/banners' || pathname === '/api/translations' || pathname === '/api/settings' || pathname === '/api/plans' || pathname?.startsWith('/api/twilio/') || pathname === '/api/custom-requirement' || pathname === '/api/chat/rag') {

        return NextResponse.next();
    }

    if (!session && !isPublicPath) {
        if (pathname?.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (session) {
        try {
            const secret = new TextEncoder().encode(JWT_SECRET);
            const { payload } = await jose.jwtVerify(session, secret);

            // Protect Admin routes
            if (pathname?.startsWith('/admin') && payload.role !== 'admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }

            // Feature Access Control
            const disabledFeatures = (payload.disabledFeatures as string[]) || [];

            const featurePaths: Record<string, string> = {
                '/chat': 'chat',
                '/writer': 'writer',
                '/code': 'code',
                '/summary': 'summary',
                '/email': 'email',
                '/ocr': 'ocr',
                '/sql': 'sql',
                '/grammar': 'grammar',
                '/translator': 'translator',
                '/story': 'story',
                '/quiz': 'quiz',
                '/resume': 'resume',
                '/social': 'social',
                '/recipe': 'recipe',
                '/finance': 'finance',
                '/meeting': 'meeting',
                '/ai-meeting': 'ai-meeting',
                '/sentiment': 'sentiment',
                '/interview': 'interview',
                '/image-generator': 'image-generator',
                '/trading': 'trading-terminal',
                '/ai-marketing/flyer-designer': 'flyer-designer',
                '/ai-marketing/business-card-designer': 'business-card-designer',
                '/ai-marketing/brochure-designer': 'brochure-designer',
                '/pitch-deck': 'pitch-deck',
                '/ppt-playground': 'ppt-playground'
            };

            for (const [path, featureId] of Object.entries(featurePaths)) {
                if (pathname?.startsWith(path) && disabledFeatures.includes(featureId)) {
                    return NextResponse.redirect(new URL('/dashboard', request.url));
                }
            }



            // Redirect from login/register if already logged in
            if (isPublicPath && pathname !== '/') {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        } catch (error) {
            // Invalid session
            if (pathname?.startsWith('/api/')) {
                return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
            }
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('session');
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/',
        '/dashboard/:path*',
        '/admin/:path*',
        '/login',
        '/register',
        '/api/:path*',
        '/chat/:path*',
        '/writer/:path*',
        '/code/:path*',
        '/summary/:path*',
        '/email/:path*',
        '/ocr/:path*',
        '/sql/:path*',
        '/grammar/:path*',
        '/translator/:path*',
        '/story/:path*',
        '/quiz/:path*',
        '/resume/:path*',
        '/social/:path*',
        '/recipe/:path*',
        '/finance/:path*',
        '/meeting/:path*',
        '/ai-meeting/:path*',
        '/sentiment/:path*',
        '/interview/:path*',
        '/image-generator/:path*',
        '/trading/:path*',
        '/ai-marketing/:path*',
        '/pitch-deck/:path*',
        '/ppt-playground/:path*',
    ],
};

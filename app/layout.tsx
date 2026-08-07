import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "../src/components/Providers";
import { ServiceWorkerRegistration } from "../src/components/ServiceWorkerRegistration";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
    weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const outfit = Outfit({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-outfit",
    weight: ["300", "400", "500", "600", "700", "800", "900"],
});

import { supabaseAdmin } from "@/lib/supabase";

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
    let siteName = "AI Suite";
    let description = "The most powerful AI productivity suite. Access 135+ AI tools including chatbots, content generators, code assistants, image creators, and autonomous AI agents. Powered by advanced AI models.";
    let keywords = [
        "AI",
        "artificial intelligence",
        "AI generator",
        "AI chatbot",
        "content generator",
        "code generator",
        "AI assistant",
        "AI agents",
        "text to image",
        "AI writer",
        "productivity",
        "SaaS",
    ];

    try {
        const { data, error } = await supabaseAdmin
            .from("system_settings")
            .select("site_name, metadata")
            .eq("id", 1)
            .single();

        if (data) {
            if (data.site_name) siteName = data.site_name;
            if (data.metadata?.siteDescription) description = data.metadata.siteDescription;
            if (data.metadata?.siteKeywords) {
                keywords = data.metadata.siteKeywords.split(",").map((k: string) => k.trim());
            }
        }
    } catch (error) {
        console.error("Error fetching metadata:", error);
    }

    return {
        title: {
            default: `${siteName}`,
            template: `%s | ${siteName}`,
        },
        description,
        keywords,
        authors: [{ name: "Mounikai" }],
        creator: "Mounikai",
        publisher: siteName,
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-video-preview": -1,
                "max-image-preview": "large",
                "max-snippet": -1,
            },
        },
        openGraph: {
            type: "website",
            locale: "en_US",
            siteName,
            title: siteName,
            description,
        },
        twitter: {
            card: "summary_large_image",
            title: siteName,
            description,
            creator: "@aisuite",
        },
        icons: {
            icon: "/favicon.ico",
            shortcut: "/favicon-16x16.png",
            apple: "/icons/icon-192x192.png",
        },
        manifest: "/manifest.json",
        appleWebApp: {
            capable: true,
            statusBarStyle: "default",
            title: siteName,
        },
        formatDetection: {
            telephone: false,
        },
    };
}

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#030712" },
    ],
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
};

import { AnnouncementBanner } from "@/components/announcement-banner";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable}`}>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
            </head>
            <body className={`${inter.className} antialiased flex flex-col h-dvh overflow-hidden`}>
                <Providers>
                    <AnnouncementBanner />
                    <div className="flex-1 min-h-0 flex flex-col overflow-auto" id="main-scroll-container">
                        {children}
                    </div>
                </Providers>
                <ServiceWorkerRegistration />
            </body>
        </html>
    );
}

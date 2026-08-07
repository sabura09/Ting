import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    typescript: {
        ignoreBuildErrors: false,
    },
    reactStrictMode: false,
    serverExternalPackages: ["@whiskeysockets/baileys"],
    // turbopack: {},
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=0, must-revalidate',
                    },
                ],
            },
        ]
    }
};

export default nextConfig;

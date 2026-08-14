"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { motion } from "framer-motion";
import { FloatingBuyNow } from "@/components/ui/FloatingBuyNow";

interface LayoutProps {
    children: React.ReactNode;
    fullHeight?: boolean;
    noPadding?: boolean;
}

export function Layout({ children, fullHeight = false, noPadding = false }: LayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu on resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div
                    className="absolute inset-0 opacity-80"
                    style={{
                        background:
                            "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.46) 45%, hsl(var(--background)) 100%)",
                    }}
                />
                <div
                    className="absolute inset-0 opacity-[0.045] dark:opacity-[0.055]"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
                        `,
                        backgroundSize: "44px 44px",
                    }}
                />
                <div
                    className="absolute inset-0 opacity-60"
                    style={{
                        background:
                            "linear-gradient(110deg, transparent 0%, hsl(var(--ai-primary) / 0.08) 34%, transparent 62%, hsl(var(--ai-secondary) / 0.06) 100%)",
                    }}
                />
            </div>

            {/* Sidebar - handles both desktop and mobile internally */}
            <Sidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header
                    onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
                />

                {/* Main Content */}
                <main className={`flex-1 ${fullHeight ? 'overflow-hidden flex flex-col min-h-0' : 'overflow-auto'}`}>
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className={`${fullHeight ? 'h-full flex flex-col min-h-0' : 'min-h-full'} ${noPadding ? '' : 'p-4 lg:p-6 xl:p-8'}`}
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
            {/* <FloatingBuyNow /> */}
        </div>
    );
}

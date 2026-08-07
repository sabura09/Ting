"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface BannerData {
    id: string;
    message: string;
    bg_gradient: string;
    text_color: string;
    is_dismissible: boolean;
    button_text?: string;
    button_link?: string;
}

export function AnnouncementBanner() {
    const [banner, setBanner] = useState<BannerData | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const pathname = usePathname();
    const bannerRef = useRef<HTMLDivElement>(null);

    // Update the CSS custom property so fixed headers can offset themselves
    const updateBannerHeight = useCallback(() => {
        requestAnimationFrame(() => {
            const h = bannerRef.current?.offsetHeight || 0;
            document.documentElement.style.setProperty("--banner-height", `${h}px`);
        });
    }, []);

    useEffect(() => {
        fetchBanner();
    }, [pathname]);

    useEffect(() => {
        updateBannerHeight();
        window.addEventListener("resize", updateBannerHeight);
        return () => window.removeEventListener("resize", updateBannerHeight);
    }, [isVisible, banner, updateBannerHeight]);

    // Reset CSS var when banner is not visible
    useEffect(() => {
        if (!isVisible || !banner) {
            document.documentElement.style.setProperty("--banner-height", "0px");
        }
    }, [isVisible, banner]);

    const fetchBanner = async () => {
        try {
            const res = await fetch("/api/banners");
            if (!res.ok) return;
            const data = await res.json();
            
            if (data) {
                const dismissedBanners = JSON.parse(localStorage.getItem("dismissed_banners") || "[]");
                if (!dismissedBanners.includes(data.id)) {
                    setBanner(data);
                    setIsVisible(true);
                }
            } else {
                setBanner(null);
                setIsVisible(false);
            }
        } catch (error) {
            console.error("Failed to fetch banner:", error);
        }
    };

    const handleDismiss = () => {
        if (!banner) return;
        
        setIsVisible(false);
        document.documentElement.style.setProperty("--banner-height", "0px");
        const dismissedBanners = JSON.parse(localStorage.getItem("dismissed_banners") || "[]");
        if (!dismissedBanners.includes(banner.id)) {
            dismissedBanners.push(banner.id);
            localStorage.setItem("dismissed_banners", JSON.stringify(dismissedBanners));
        }
    };

    if (!banner || !isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    ref={bannerRef}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    onAnimationComplete={updateBannerHeight}
                    className="relative w-full overflow-hidden z-[100] flex-shrink-0"
                >
                    <div 
                        className="relative w-full flex flex-col sm:flex-row items-center justify-center px-8 py-2 sm:px-12 sm:py-2.5 shadow-md"
                        style={{ 
                            background: banner.bg_gradient,
                            color: banner.text_color
                        }}
                    >
                        <div className="flex flex-row items-center justify-center min-w-0 gap-2">
                            <div 
                                className="text-[11px] sm:text-xs md:text-sm font-medium text-center px-2 leading-snug line-clamp-1 sm:line-clamp-none min-w-0"
                                dangerouslySetInnerHTML={{ __html: banner.message }}
                            />
                            
                            {banner.button_text && banner.button_link && (
                                <a 
                                    href={banner.button_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-white/20 hover:bg-white/30 transition-colors text-[10px] sm:text-xs font-semibold border border-white/20 whitespace-nowrap flex items-center gap-1 flex-shrink-0"
                                >
                                    {banner.button_text}
                                    <ExternalLink size={12} />
                                </a>
                            )}
                        </div>

                        {banner.is_dismissible && (
                            <button 
                                onClick={handleDismiss}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 transition-colors flex-shrink-0"
                                aria-label="Dismiss announcement"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

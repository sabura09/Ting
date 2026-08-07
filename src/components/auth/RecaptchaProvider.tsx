'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

interface RecaptchaContextType {
    executeRecaptcha: (action: string) => Promise<string | null>;
    isLoaded: boolean;
}

const RecaptchaContext = createContext<RecaptchaContextType>({
    executeRecaptcha: async () => null,
    isLoaded: false,
});

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

export function RecaptchaProvider({ children }: { children: React.ReactNode }) {
    const [isLoaded, setIsLoaded] = useState(false);
    const { settings, loading } = useSettings();

    useEffect(() => {
        if (loading) return;

        const enableRecaptcha = settings?.metadata?.enableRecaptcha === true;

        if (!enableRecaptcha || !SITE_KEY) {
            if (!SITE_KEY && enableRecaptcha) {
                console.warn('[reCAPTCHA] NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not configured. Client verification will be bypassed.');
            }
            
            // Hide badge if it exists from a previous load
            const badge = document.querySelector('.grecaptcha-badge') as HTMLElement;
            if (badge) {
                badge.style.visibility = 'hidden';
            }
            return;
        }

        // Show badge if it was previously hidden
        const badge = document.querySelector('.grecaptcha-badge') as HTMLElement;
        if (badge) {
            badge.style.visibility = 'visible';
        }

        // Check if script is already loaded
        if (typeof window !== 'undefined' && (window as any).grecaptcha) {
            setIsLoaded(true);
            return;
        }

        // Load the script tag
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if ((window as any).grecaptcha) {
                (window as any).grecaptcha.ready(() => {
                    setIsLoaded(true);
                });
            }
        };
        script.onerror = () => {
            console.error('[reCAPTCHA] Failed to load grecaptcha script');
        };
        document.head.appendChild(script);
    }, [settings, loading]);

    const executeRecaptcha = async (action: string): Promise<string | null> => {
        const enableRecaptcha = settings?.metadata?.enableRecaptcha === true;
        if (!enableRecaptcha) return 'bypassed-disabled';
        if (!SITE_KEY) return 'bypassed-no-key';

        if (!isLoaded || !(window as any).grecaptcha) {
            console.warn('[reCAPTCHA] grecaptcha is not loaded yet');
            return null;
        }

        try {
            return await (window as any).grecaptcha.execute(SITE_KEY, { action });
        } catch (error) {
            console.error('[reCAPTCHA] Execution failed:', error);
            return null;
        }
    };

    return (
        <RecaptchaContext.Provider value={{ executeRecaptcha, isLoaded }}>
            {children}
        </RecaptchaContext.Provider>
    );
}

export function useRecaptcha() {
    return useContext(RecaptchaContext);
}

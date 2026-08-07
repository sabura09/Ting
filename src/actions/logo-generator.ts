"use server";

import { GoogleGenAI } from "@google/genai";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export interface LogoGenerationOptions {
    brandName: string;
    tagline?: string;
    style: string;
    primaryColor?: string;
    secondaryColor?: string;
    typographyStyle?: string;
    industry?: string;
    iconPreference?: string;
    additionalPrompt?: string;
}

function buildLogoPrompt(options: LogoGenerationOptions): string {
    const parts: string[] = [];

    // Core instruction
    parts.push(`Design a professional logo for a brand called "${options.brandName}".`);

    // Tagline context
    if (options.tagline) {
        parts.push(`The brand tagline is: "${options.tagline}".`);
    }

    // Style directive
    const styleDescriptions: Record<string, string> = {
        minimal: "Use a minimalist design approach with clean lines, ample whitespace, and refined simplicity.",
        modern: "Create a modern, contemporary logo with sleek geometry and current design trends.",
        luxury: "Design an upscale, premium luxury logo with elegant details, serif typography, and sophistication.",
        tech: "Create a technology-forward logo with digital aesthetics, geometric precision, and innovation.",
        mascot: "Design a character-based mascot logo that is memorable, friendly, and distinctive.",
        flat: "Use a flat design style with bold, solid colors, clean shapes, and no gradients or shadows.",
        "3d": "Create a three-dimensional logo with depth, realistic lighting, and volume.",
        gradient: "Incorporate smooth, modern gradients with flowing color transitions.",
        monogram: "Design a monogram or lettermark logo using the brand initials with typographic artistry.",
        geometric: "Build the logo from precise geometric shapes — circles, triangles, hexagons — with mathematical harmony.",
    };

    if (options.style && styleDescriptions[options.style]) {
        parts.push(styleDescriptions[options.style]);
    }

    // Color palette
    if (options.primaryColor) {
        parts.push(`Use ${options.primaryColor} as the primary brand color.`);
    }
    if (options.secondaryColor) {
        parts.push(`Use ${options.secondaryColor} as the secondary accent color.`);
    }

    // Typography
    if (options.typographyStyle) {
        const typoMap: Record<string, string> = {
            serif: "Use elegant serif typography for a classic, trustworthy feel.",
            "sans-serif": "Use clean sans-serif typography for a modern, approachable look.",
            display: "Use distinctive display/decorative typography to make the wordmark stand out.",
            handwritten: "Use handwritten or script typography for a personal, artisanal character.",
            monospace: "Use monospace typography for a technical, developer-oriented vibe.",
        };
        if (typoMap[options.typographyStyle]) {
            parts.push(typoMap[options.typographyStyle]);
        }
    }

    // Industry context
    if (options.industry) {
        parts.push(`The brand operates in the ${options.industry} industry.`);
    }

    // Icon preference
    if (options.iconPreference) {
        const iconMap: Record<string, string> = {
            "icon-only": "Create an icon-only mark (no text/wordmark).",
            "text-only": "Create a text-only logotype (wordmark) with no icon.",
            "icon-text": "Combine an icon/symbol with the brand name text.",
            abstract: "Use an abstract symbol that conveys the brand essence without being literal.",
            lettermark: "Use the brand initials as the primary visual element.",
        };
        if (iconMap[options.iconPreference]) {
            parts.push(iconMap[options.iconPreference]);
        }
    }

    // Additional creative prompt
    if (options.additionalPrompt?.trim()) {
        parts.push(options.additionalPrompt.trim());
    }

    // Universal logo quality directives
    parts.push("Render on a clean solid background. Ensure the logo is vector-quality, scalable, and suitable for professional use. High contrast, balanced composition, centered layout.");

    return parts.join(" ");
}

export async function generateLogoAction(options: LogoGenerationOptions) {
    try {
        // 1. Authentication
        const session: any = await getSession();
        if (!session) {
            return { error: "Unauthorized" };
        }

        // 2. Check Token Balance
        const settings = await db.getSettings();
        const cost = settings.aiLimits['logo-generator'] || settings.aiLimits['image-generator'] || 50;
        const balance = await db.getTokenBalance(session.email);

        if (balance.balance < cost) {
            return { error: "Insufficient tokens. Please top up your balance." };
        }

        // 3. Initialize Client
        if (!apiKey) {
            return { error: "Gemini API Key not configured" };
        }

        const ai = new GoogleGenAI({ apiKey });

        // 4. Build prompt and generate
        const prompt = buildLogoPrompt(options);

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '1:1',
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            return { error: "No logos generated. Try adjusting your prompt or style." };
        }

        // 5. Deduct Tokens
        await db.updateTokenBalance(session.email, cost, 'consume', 'logo-generator');

        // 6. Return logo as base64
        const firstImage = response.generatedImages[0];
        const imgBytes = firstImage.image.imageBytes;
        const base64Image = Buffer.from(imgBytes).toString('base64');

        return { success: true, image: base64Image, prompt };

    } catch (error: any) {
        console.error("Logo Generation Error:", error);
        return { error: error.message || "Failed to generate logo" };
    }
}

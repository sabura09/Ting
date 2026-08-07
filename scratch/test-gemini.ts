import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

async function run() {
    if (!apiKey) {
        console.error("No API key found in env!");
        return;
    }
    console.log("Using API key starting with:", apiKey.substring(0, 10));
    const ai = new GoogleGenAI({ apiKey });

    const sourceText = "+48 new";
    const targetLanguages = [
        { code: "fr", name: "French" },
        { code: "es", name: "Spanish" },
        { code: "ar", name: "Arabic" },
        { code: "cn", name: "Chinese" }
    ];

    const languageList = targetLanguages
        .map((l: { code: string; name: string }) => `${l.name} (${l.code})`)
        .join(", ");

    const prompt = `You are a professional translator. Translate the following text into these languages: ${languageList}.

Text to translate: "${sourceText}"

Return ONLY a valid JSON object where keys are the language codes and values are the translated strings. Do not include any other text, explanation, or markdown formatting. Example format:
{"fr": "translated text", "ar": "translated text"}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Translate the source text: "${sourceText}" into these target languages: ${languageList}.
Provide the translation for each target language code.`,
            config: {
                systemInstruction: "You are a professional localization translator. Translate the source text accurately into each requested language. Return a JSON object where the keys are the target language codes (e.g. 'fr', 'ar', 'es') and the values are the translated strings. Do not leave common words (like 'new', 'edit', 'delete') untranslated in any language, including Arabic. Preserve numbers, formatting, and variables.",
                responseMimeType: "application/json"
            }
        });
        console.log("Raw Response Text:");
        console.log(response.text?.trim());
    } catch (error) {
        console.error("Error:", error);
    }
}

run();

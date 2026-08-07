import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { getModelById } from "@/lib/models";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { key, sourceText, targetLanguages, model: modelId } = body;

        if (!key || !sourceText || !targetLanguages || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
            return NextResponse.json(
                { error: "key, sourceText, and targetLanguages[] are required" },
                { status: 400 }
            );
        }

        const aiModel = getModelById(modelId || 'gemini-2.5-flash') || getModelById('gemini-2.5-flash')!;
        const provider = aiModel.provider;

        let apiKey = '';
        if (provider === 'google') {
            apiKey = req.headers.get('x-provider-key-gemini') || req.headers.get('x-provider-key-google') || process.env[aiModel.envKey || ''] || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
        } else if (provider === 'nvidia') {
            apiKey = req.headers.get('x-provider-key-nvidia') || process.env.NVIDIA_API_KEY || '';
        } else if (provider === 'openai') {
            apiKey = req.headers.get('x-provider-key-openai') || process.env[aiModel.envKey || ''] || process.env.OPENAI_API_KEY || '';
        } else if (provider === 'anthropic') {
            apiKey = req.headers.get('x-provider-key-anthropic') || process.env.ANTHROPIC_API_KEY || '';
        } else if (provider === 'mistral') {
            apiKey = req.headers.get('x-provider-key-mistral') || process.env.MISTRAL_API_KEY || '';
        } else if (provider === 'groq') {
            apiKey = req.headers.get('x-provider-key-groq') || process.env.GROQ_API_KEY || '';
        }

        if (!apiKey || apiKey === '*************************') {
            return NextResponse.json(
                { error: `${aiModel.name} API Key not configured` },
                { status: 500 }
            );
        }

        const languageList = targetLanguages
            .map((l: { code: string; name: string }) => `${l.name} (${l.code})`)
            .join(", ");

        const systemInstruction = "You are a professional localization translator. Translate the source text accurately into each requested language. Return ONLY a valid JSON object where keys are the target language codes (e.g. 'fr', 'ar', 'es') and values are the translated strings. Do not include any formatting, markdown, or text outside the JSON object.\n\nGuidelines:\n1. Translate the entire text. Do not leave common words (such as 'new', 'edit', 'delete', 'update', 'settings') untranslated in any target language, including Arabic.\n2. Maintain numbers, punctuation, variables (e.g., {name}, %s), and special characters in their correct grammatical position relative to the translated text. For Arabic, keep the numbers in the Western style (e.g. '48') as they are in the source, rather than translating them to Eastern Arabic numerals (e.g. '٤٨') unless the text flow dictates otherwise.\n3. Ensure translations feel natural and professional for the target locale.";

        const prompt = `Translate the source text into these target languages: ${languageList}.

Source text: "${sourceText}"

Provide the translation for each target language code as values in a JSON object.`;

        let rawText = '';

        if (provider === 'google') {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: aiModel.id,
                contents: prompt,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json"
                }
            });
            rawText = response.text?.trim() || "";
        } else if (provider === 'nvidia') {
            const openai = new OpenAI({
                apiKey,
                baseURL: 'https://integrate.api.nvidia.com/v1'
            });
            const completion = await openai.chat.completions.create({
                model: aiModel.id,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ]
            });
            rawText = completion.choices[0]?.message?.content?.trim() || "";
        } else if (provider === 'openai') {
            const openai = new OpenAI({ apiKey });
            const completion = await openai.chat.completions.create({
                model: aiModel.id,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: "json_object" }
            });
            rawText = completion.choices[0]?.message?.content?.trim() || "";
        } else if (provider === 'groq') {
            const openai = new OpenAI({
                apiKey,
                baseURL: 'https://api.groq.com/openai/v1'
            });
            const completion = await openai.chat.completions.create({
                model: aiModel.id,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: "json_object" }
            });
            rawText = completion.choices[0]?.message?.content?.trim() || "";
        } else if (provider === 'mistral') {
            const openai = new OpenAI({
                apiKey,
                baseURL: 'https://api.mistral.ai/v1'
            });
            const completion = await openai.chat.completions.create({
                model: aiModel.id,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: "json_object" }
            });
            rawText = completion.choices[0]?.message?.content?.trim() || "";
        } else if (provider === 'anthropic') {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: aiModel.id,
                    system: systemInstruction,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1024
                })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || "Anthropic API Error");
            }
            const data = await response.json();
            rawText = data.content?.[0]?.text?.trim() || "";
        } else {
            return NextResponse.json(
                { error: `Unsupported provider: ${provider}` },
                { status: 400 }
            );
        }

        // Try to extract JSON from the response
        let suggestions: Record<string, string> = {};
        try {
            // Remove markdown code fences if present
            const jsonStr = rawText
                .replace(/^```json?\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();
            suggestions = JSON.parse(jsonStr);
        } catch {
            console.error("Failed to parse AI response:", rawText);
            return NextResponse.json(
                { error: "AI returned invalid format. Please try again." },
                { status: 422 }
            );
        }

        return NextResponse.json({ suggestions });
    } catch (error: any) {
        console.error("AI translation error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate AI translations" },
            { status: 500 }
        );
    }
}

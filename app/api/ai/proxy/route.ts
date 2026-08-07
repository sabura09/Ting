import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getModelById, AVAILABLE_MODELS } from '@/lib/models';
import OpenAI from 'openai';
import { getFeatureById } from '@/lib/features';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}
function sanitizeSchemaTypes(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema;

    const newSchema = Array.isArray(schema) ? [...schema] : { ...schema };

    for (const key in newSchema) {
        if (key === 'type' && typeof newSchema[key] === 'string') {
            const lowerType = newSchema[key].toLowerCase();
            if (['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'].includes(lowerType)) {
                newSchema[key] = lowerType;
            }
        } else if (typeof newSchema[key] === 'object') {
            newSchema[key] = sanitizeSchemaTypes(newSchema[key]);
        }
    }

    return newSchema;
}

function convertGeminiToOpenAIMessages(content: any): any[] {
    const messages: any[] = [];

    // Check if systemInstruction exists
    if (content?.systemInstruction?.parts?.[0]?.text) {
        messages.push({
            role: 'system',
            content: content.systemInstruction.parts[0].text
        });
    }

    if (content?.contents && Array.isArray(content.contents)) {
        for (const item of content.contents) {
            const role = item.role === 'model' ? 'assistant' : 'user';
            if (Array.isArray(item.parts)) {
                if (item.parts.length === 1 && item.parts[0].text) {
                    messages.push({
                        role: role,
                        content: item.parts[0].text
                    });
                } else {
                    const contentParts = item.parts.map((part: any) => {
                        if (part.text) {
                            return { type: 'text', text: part.text };
                        }
                        if (part.inlineData) {
                            return {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                                }
                            };
                        }
                        return part;
                    });
                    messages.push({
                        role: role,
                        content: contentParts
                    });
                }
            }
        }
    }
    return messages;
}

function getOpenAIMessages(content: any): any[] {
    if (content?.messages && Array.isArray(content.messages)) {
        return content.messages;
    }
    return convertGeminiToOpenAIMessages(content);
}

async function callOpenAIModel(aiModel: any, content: any) {
    const apiKey = process.env[aiModel.envKey || ''] || process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "*************************") {
        throw new Error("in the demo we are not added the openAi key");
    }

    const openai = new OpenAI({ apiKey });

    let instructions = "";
    const input: any[] = [];
    const messages = getOpenAIMessages(content);

    for (const msg of messages) {
        if (msg.role === 'system') {
            instructions = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        } else {
            let transformedContent: any = msg.content;
            if (Array.isArray(msg.content)) {
                transformedContent = msg.content.map((item: any) => {
                    if (item.type === 'text') {
                        return { type: 'input_text', text: item.text };
                    } else if (item.type === 'image_url') {
                        return { type: 'input_image', image_url: item.image_url?.url || item.image_url };
                    }
                    return item;
                });
            }
            input.push({
                role: msg.role,
                content: transformedContent
            });
        }
    }

    const transformedTools = content?.tools ? content.tools.map((tool: any) => {
        if (tool.type === 'function') {
            const name = tool.name || tool.function?.name;
            const description = tool.description || tool.function?.description;
            const parameters = tool.parameters || tool.function?.parameters;

            return {
                type: 'function',
                name: name,
                description: description,
                parameters: sanitizeSchemaTypes(parameters)
            };
        }
        return tool;
    }) : undefined;

    const response = await openai.responses.create({
        model: aiModel.id,
        input: input.length > 0 ? input : undefined,
        instructions: instructions || undefined,
        tools: transformedTools
    });

    const resp = response as any;
    return {
        content: resp.output_text || "",
        raw: response
    };
}

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        // Support both structures
        const tool = body.tool || "unknown";
        const prompt = body.prompt;
        const modelId = body.model || 'gemini-2.5-flash';
        let aiModel = getModelById(modelId) || getModelById('gemini-2.5-flash') || AVAILABLE_MODELS[0];

        // Production-level check: Llama 3.1 8B Instruct does not support vision.
        // If an image is present, we automatically upgrade to Llama 3.2 11B Vision Instruct.
        const bodyStr = JSON.stringify(body);
        const hasImage = bodyStr.includes('image_url') || bodyStr.includes('inlineData') || bodyStr.includes('"image"');
        if (aiModel.id === 'meta/llama-3.1-8b-instruct' && hasImage) {
            console.log("Image detected in Proxy with Llama 3.1 8B Instruct; upgrading to Llama 3.2 11B Vision Instruct under the hood.");
            const visionModel = getModelById('meta/llama-3.2-11b-vision-instruct');
            if (visionModel) {
                aiModel = visionModel;
            }
        }

        const provider = aiModel.provider;

        let content = body.content;

        // 0. Plan Entitlement Verification
        const user = await db.getUser(session.email);

        if (user && user.role !== 'admin' && tool !== 'support-agent' && tool !== 'dashboard' && tool !== 'unknown') {
            const userPlan = await db.getUserPlan(session.email);
            if (userPlan.planName !== 'Enterprise' && (!userPlan.aiTools || !userPlan.aiTools.includes(tool))) {
                return NextResponse.json({
                    error: `Forbidden. The '${tool}' tool is not included in your current plan.`
                }, { status: 403 });
            }
        }

        // If simple prompt is provided, convert to Gemini/OpenAI format
        if (!content && prompt) {
            if (provider === "openai") {
                content = {
                    messages: [{ role: "user", content: prompt }],
                    model: aiModel.id
                };
            } else {
                content = {
                    contents: [{ parts: [{ text: prompt }] }]
                };
            }
        }

        // 1. Calculate Cost & Verify Tokens
        const settings = await db.getSettings();
        const feature = getFeatureById(tool);
        const baseCost = settings.aiLimits?.[tool] ?? feature?.tokenCost ?? 10;
        let cost = baseCost;
        if (provider === "openai") cost = Math.ceil(baseCost * 1.5);

        const balance = await db.getTokenBalance(session.email);
        if (balance.balance < cost) {
            return NextResponse.json({
                error: 'Insufficient tokens. Please top up your balance.'
            }, { status: 402 });
        }

        // 2. Call AI Provider
        let result;

        if (provider === "openai") {
            try {
                result = await callOpenAIModel(aiModel, content);
            } catch (error: any) {
                console.error("OpenAI Responses API proxy error:", error);
                let errorMessage = error.message || "OpenAI API Error";
                if (error.status === 429 || errorMessage.includes("quota") || error.code === "insufficient_quota") {
                    errorMessage = "Many users are currently using the project, so the API quota has been temporarily exceeded. There is no issue with the project. Please wait for a while and try again.";
                }
                throw new Error(errorMessage);
            }

        } else if (provider === "nvidia") {
            const apiKey = process.env.NVIDIA_API_KEY;
            if (!apiKey) throw new Error("NVIDIA API Key not configured");

            const response = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: aiModel.id,
                    messages: content.messages || [{ role: "user", content: content.contents?.[0]?.parts?.[0]?.text }],
                    temperature: 0.7,
                    max_tokens: 1024
                })
            }, 15000);

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || "NVIDIA API Error");
            }

            const data = await response.json();
            result = {
                content: data.choices[0].message.content,
                raw: data
            };

        } else {
            // Default: Gemini
            const apiKey = process.env[aiModel.envKey || ''] || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Gemini API Key not configured");

            try {
                // Use generic Gemini model with a timeout
                const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel.id}:generateContent`, {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                        "X-goog-api-key": apiKey,
                    },
                    body: JSON.stringify(content)
                }, 20000);

                if (!response.ok) {
                    const err = await response.json();
                    console.error("Gemini Error:", JSON.stringify(err));

                    // Handle Quota Error
                    if (response.status === 429 || err.error?.message?.includes("exceeded your current quota") || err.error?.status === "RESOURCE_EXHAUSTED") {
                        throw new Error("Many users are currently using the project, so the API quota has been temporarily exceeded. There is no issue with the project. Please wait for a while and try again.");
                    }

                    throw new Error(err.error?.message || "Gemini API Error");
                }

                const data = await response.json();

                // Extract text from Gemini response
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                result = {
                    content: text,
                    text: text, // Compatibility
                    result: text, // Compatibility
                    raw: data
                };
            } catch (error: any) {
                console.log(`Gemini (${aiModel.id}) proxy failed: ${error.message || error}. Trying fallback gpt-5.4-mini...`);
                try {
                    const fallbackModel1 = getModelById('gpt-5.4-mini');
                    if (!fallbackModel1) throw new Error("Fallback model gpt-5.4-mini not found");

                    result = await callOpenAIModel(fallbackModel1, content);
                    console.log(`Successfully fell back to gpt-5.4-mini.`);
                } catch (fallback1Error: any) {
                    console.error('gpt-5.4-mini fallback failed:', fallback1Error);
                    const bodyStr = JSON.stringify(body);
                    const hasImage = bodyStr.includes('image_url') || bodyStr.includes('inlineData') || bodyStr.includes('"image"');
                    const fallbackModelId2 = hasImage ? 'meta/llama-3.2-11b-vision-instruct' : 'meta/llama-3.1-8b-instruct';
                    console.log(`Trying second fallback to ${fallbackModelId2}...`);

                    try {
                        const fallbackModel2 = getModelById(fallbackModelId2);
                        if (!fallbackModel2) throw new Error(`Fallback model ${fallbackModelId2} not found`);

                        const nvidiaApiKey = process.env.NVIDIA_API_KEY;
                        if (!nvidiaApiKey) throw new Error("NVIDIA API Key not configured");

                        const messages = getOpenAIMessages(content);

                        const response = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${nvidiaApiKey}`
                            },
                            body: JSON.stringify({
                                model: fallbackModel2.id,
                                messages: messages,
                                temperature: 0.7,
                                max_tokens: 1024
                            })
                        }, 15000);

                        if (!response.ok) {
                            const err = await response.json();
                            throw new Error(err.error?.message || "NVIDIA API Error");
                        }

                        const data = await response.json();
                        result = {
                            content: data.choices[0].message.content,
                            text: data.choices[0].message.content,
                            result: data.choices[0].message.content,
                            raw: data
                        };
                        console.log(`Successfully fell back to second fallback: ${fallbackModelId2}`);
                    } catch (fallback2Error: any) {
                        console.error('Second fallback failed:', fallback2Error);
                        throw new Error(`AI Proxy Service is temporarily unavailable. Primary error: ${error.message || error}. First fallback error: ${fallback1Error.message || fallback1Error}. Second fallback error: ${fallback2Error.message || fallback2Error}`);
                    }
                }
            }
        }

        // 3. Deduct tokens on success
        await db.updateTokenBalance(session.email, cost, 'consume', tool, aiModel.id);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('AI Proxy Error:', error);
        return NextResponse.json({
            error: error.message || 'AI request failed'
        }, { status: 500 });
    }
}

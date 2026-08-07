import axios from 'axios';
import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

const KIE_API_KEY = process.env.KIE_API_KEY || process.env.KIE_AI_API_KEY;
const KIE_BASE_URL = 'https://api.kie.ai/api/v1';
const KIE_UPLOAD_URL = 'https://kieai.redpandaai.co';

const kieClient = axios.create({
    baseURL: KIE_BASE_URL,
    headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
    }
});



if (!KIE_API_KEY) {
    console.warn('KIE_API_KEY is not configured. AI Marketing features will fail.');
}

export interface KieTaskResponse {
    success: boolean;
    taskId?: string;
    error?: string;
}

export interface KieTaskStatus {
    state: 'processing' | 'success' | 'failed';
    resultUrl?: string;
    error?: string;
}

/**
 * Uploads a base64 encoded file to Kie.ai
 */
export async function uploadFile(base64: string, fileName: string): Promise<string> {
    try {
        // The API requires the full base64 data URL including the prefix

        const response = await axios.post(`${KIE_UPLOAD_URL}/api/file-base64-upload`, {
            base64Data: base64, // The API requires 'base64Data' with full prefix
            uploadPath: "marketing",
            fileName
        }, {
            headers: {
                'Authorization': `Bearer ${KIE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // API might return { successFlag: 1, url: "..." } or { code: 200, data: { url: "..." } }
        const data = response.data;
        const innerData = data.data || data;

        if (data.successFlag === 1 || data.code === 200 || data.success === true) {
            // Documentation says 'fileUrl' is the property for the full URL
            let url = innerData.fileUrl || innerData.url || innerData.image_url ||
                innerData.downloadUrl || innerData.filePath || innerData.file_url;

            if (!url) {
                console.error('Kie.ai Upload Response (No URL found):', data);
                throw new Error('No URL returned from upload');
            }

            // If the URL is relative, prepend the base URL and ensure /files/ prefix if needed
            if (!url.startsWith('http')) {
                const path = url.startsWith('/') ? url : `/${url}`;
                // Docs show files are served from /files/ path
                const prefix = path.startsWith('/files/') ? '' : '/files';
                url = `${KIE_UPLOAD_URL}${prefix}${path}`;
            }

            // Normalize the URL: remove double slashes in the path but preserve the protocol
            if (url.includes('://')) {
                const parts = url.split('://');
                const protocol = parts[0];
                const rest = parts.slice(1).join('://');
                url = `${protocol}://${rest.replace(/\/+/g, '/')}`;
            } else {
                url = url.replace(/\/+/g, '/');
            }

            console.log('Kie.ai Upload Success:', { original: innerData.fileUrl || innerData.filePath, normalized: url });
            return url;
        }

        throw new Error(data.message || data.msg || 'File upload failed');
    } catch (error: any) {
        console.error('Kie.ai Upload Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Ensures a URL is remote by uploading it if it's a local path.
 */
export async function ensureRemoteUrl(url: string): Promise<string> {
    if (!url) return url;

    // Handle local relative paths (like system avatars)
    if (url.startsWith('/') && !url.startsWith('//')) {
        try {
            const publicPath = path.join(process.cwd(), 'public', url);
            if (fs.existsSync(publicPath)) {
                const fileBuffer = fs.readFileSync(publicPath);
                const base64 = fileBuffer.toString('base64');
                const fileName = path.basename(url);
                console.log(`Auto-uploading local file to Kie.ai: ${url}`);
                return await uploadFile(base64, fileName);
            }
        } catch (err) {
            console.error(`Error auto-uploading local file ${url}:`, err);
        }
    }

    // Repair broken https:/ URLs
    if (url.startsWith('https:/') && !url.startsWith('https://')) {
        return url.replace('https:/', 'https://');
    }
    return url;
}

/**
 * Generates an image using Flux-2 via the Market API.
 * Uses image-to-image model if reference images are provided.
 */
export async function generateMarketingImage(prompt: string, options: {
    filesUrl?: string[],
    size?: '1:1' | '3:2' | '2:3',
    isEnhance?: boolean
} = {}) {
    try {
        const hasImages = options.filesUrl && options.filesUrl.length > 0;
        let repairedUrls: string[] = [];

        if (hasImages) {
            // Repair any broken URLs and auto-upload local relative paths
            repairedUrls = await Promise.all(options.filesUrl!.map(ensureRemoteUrl));
        }

        const model = hasImages ? 'flux-2/pro-image-to-image' : 'flux-2/pro-text-to-image';

        const input: any = {
            prompt,
            aspect_ratio: options.size || '1:1',
            resolution: '1K',
            nsfw_checker: false
        };

        if (hasImages) {
            // Flux-2 image-to-image uses input_urls parameter
            input.input_urls = repairedUrls;
        }

        console.log('Kie.ai Creating Task:', { model, input_urls: input.input_urls });

        const response = await kieClient.post('/jobs/createTask', {
            model,
            input
        });

        // Market API response: { code: 200, msg: "success", data: { taskId: "task_flux-2_..." } }
        const apiResponse = response.data;
        const innerData = apiResponse.data || apiResponse;

        return {
            successFlag: (apiResponse.code === 200 || apiResponse.successFlag === 1) ? 1 : 3,
            taskId: innerData.taskId,
            message: apiResponse.msg || innerData.message
        };
    } catch (error: any) {
        console.error('Kie.ai Image Gen Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Polls for image generation status using the common Market API recordInfo endpoint.
 * This replaces the legacy gpt4o-image/record-info endpoint.
 */
export async function getMarketingImageStatus(taskId: string) {
    try {
        const response = await kieClient.get('/jobs/recordInfo', {
            params: { taskId }
        });

        // Market API response: { code: 200, msg: "success", data: { taskId, state, resultJson, failMsg, ... } }
        const apiResponse = response.data;
        const data = apiResponse.data || apiResponse;

        // state from Market API: "success", "processing", "failed"
        let state: 'processing' | 'success' | 'failed' = 'processing';
        if (data.state === 'success') {
            state = 'success';
        } else if (data.state === 'failed') {
            state = 'failed';
        }

        // Parse result URLs from resultJson (JSON string with { resultUrls: [...] })
        let resultUrls: string[] = [];
        if (data.resultJson) {
            try {
                const parsed = typeof data.resultJson === 'string' ? JSON.parse(data.resultJson) : data.resultJson;
                if (parsed.resultUrls && Array.isArray(parsed.resultUrls)) {
                    resultUrls = parsed.resultUrls;
                } else if (parsed.image_url) {
                    resultUrls = [parsed.image_url];
                } else if (parsed.video_url) {
                    resultUrls = [parsed.video_url];
                }
            } catch {
                // If resultJson is a direct URL string
                if (typeof data.resultJson === 'string' && data.resultJson.startsWith('http')) {
                    resultUrls = [data.resultJson];
                }
            }
        }

        return {
            state,
            resultUrls,
            error: data.failMsg || data.errorMessage || (state === 'failed' ? apiResponse.msg : undefined)
        };
    } catch (error: any) {
        console.error('Kie.ai Image Status Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Creates a task for Kling AI (Avatar, Video, etc.)
 */
export async function createKlingTask(model: string, input: any) {
    try {
        const response = await kieClient.post('/jobs/createTask', {
            model,
            input
        });

        // Market API response: { code: 200, msg: "success", data: { taskId: "..." } }
        const apiResponse = response.data;
        const innerData = apiResponse.data || apiResponse;

        return {
            success: apiResponse.code === 200,
            taskId: innerData.taskId,
            message: apiResponse.msg
        };
    } catch (error: any) {
        console.error(`Kie.ai ${model} Task Error:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Polls for General Task status (Kling/Wan)
 */
export async function getKlingTaskStatus(taskId: string) {
    try {
        const response = await kieClient.get('/jobs/recordInfo', {
            params: { taskId }
        });

        // Market API response: { code: 200, msg: "success", data: { state, resultJson, failMsg, ... } }
        const apiResponse = response.data;
        const data = apiResponse.data || apiResponse;

        // Parse resultJson (comes as a JSON string)
        let resultUrl: string | undefined;
        let resultText: string | undefined;
        if (data.resultJson) {
            try {
                const parsed = typeof data.resultJson === 'string' ? JSON.parse(data.resultJson) : data.resultJson;
                resultUrl = parsed.video_url || parsed.image_url || (parsed.resultUrls?.[0]);
                resultText = parsed.text || parsed.content || (typeof parsed === 'string' ? parsed : undefined);
            } catch {
                if (typeof data.resultJson === 'string') {
                    if (data.resultJson.startsWith('http')) {
                        resultUrl = data.resultJson;
                    } else {
                        resultText = data.resultJson;
                    }
                }
            }
        }

        return {
            state: (data.state || 'processing') as 'processing' | 'success' | 'failed',
            resultUrl,
            resultText,
            error: data.failMsg || data.errorMessage
        };
    } catch (error: any) {
        console.error('Kie.ai Task Status Error:', error.response?.data || error.message);
        throw error;
    }
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });

/**
 * Generates text content (Ad Copy, Social Media, Scripts) using Gemini with Kie AI Fallback
 */
export async function generateMarketingText(prompt: string, systemPrompt?: string) {
    const combinedPrompt = systemPrompt ? `${systemPrompt}\n\nUSER PROMPT: ${prompt}` : prompt;
    let geminiError = '';
    let kieError = '';

    // Attempt 1: Gemini
    try {
        console.log('Generating script with Gemini 1.5 Flash...');
        const result = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ parts: [{ text: combinedPrompt }] }]
        });
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (responseText) {
            return {
                success: true,
                taskId: `sync_${Buffer.from(responseText).toString('base64').slice(0, 32)}`,
                resultText: responseText,
                message: 'success'
            };
        }
    } catch (error: any) {
        geminiError = error.message;
        console.warn('Gemini failed:', geminiError);
    }

    // Attempt 2: Kie AI Fallback (GPT-4o)
    try {
        console.log('Generating script with Kie AI (gpt-4o)...');
        // Some providers use different model naming conventions, we'll try a common one
        const response = await kieClient.post('/jobs/createTask', {
            model: 'gpt-4o',
            input: {
                prompt: combinedPrompt, // Some Kie AI text models use simple prompt
                system_prompt: systemPrompt,
                messages: [
                    { role: 'system', content: systemPrompt || 'You are a viral reel script writer.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            }
        });

        const apiResponse = response.data;
        const data = apiResponse.data || apiResponse;

        if ((apiResponse.code === 200 || apiResponse.successFlag === 1) && (data.taskId || data.task_id)) {
            return {
                success: true,
                taskId: data.taskId || data.task_id,
                message: 'success'
            };
        } else {
            kieError = apiResponse.msg || data.message || 'Unknown Kie AI error';
        }
    } catch (error: any) {
        kieError = error.response?.data?.message || error.message;
        console.error('Kie AI Text Gen Error:', kieError);
    }

    return {
        success: false,
        message: `All text generation attempts failed. Gemini: ${geminiError}. Kie AI: ${kieError}`,
        error: `Text generation failed: ${geminiError}`
    };
}

function getRandom9DigitNumber() {
  return Math.floor(100000000 + Math.random() * 900000000);
}

/**
 * Generates a video using grok-imagine/image-to-video via Kie.ai
 */
export async function generateReelVideo(prompt: string, options: {
    duration?: number | string,
    aspect_ratio?: string,
    resolution?: string,
    mode?: string,
    seed?: number,
    callBackUrl?: string,
    negative_prompt?: string,
    filesUrl?: string[]
} = {}) {
    try {
        let image_urls: string[] = [];
        if (options.filesUrl && options.filesUrl.length > 0) {
            image_urls = await Promise.all(options.filesUrl.map(ensureRemoteUrl));
        }

        const model = image_urls.length > 0 ? 'grok-imagine/image-to-video' : 'grok-imagine/text-to-video';

        const payload: any = {
            model,
            input: {
                prompt,
                task_id: `task_grok_${getRandom9DigitNumber()}`,
                mode: options.mode || "normal",
                duration: String(options.duration || "6"),
                resolution: options.resolution || "480p",
                aspect_ratio: options.aspect_ratio || "16:9"
            }
        };

        if (image_urls.length > 0) {
            payload.input.image_urls = image_urls;
        }

        if (options.seed !== undefined) {
            payload.input.seed = options.seed;
        }

        if (options.negative_prompt) {
            payload.input.negative_prompt = options.negative_prompt;
        }

        if (options.callBackUrl) {
            payload.callBackUrl = options.callBackUrl;
        }

        console.log('Kie.ai Video Task Payload:', JSON.stringify(payload, null, 2));

        const response = await kieClient.post('/jobs/createTask', payload);

        const apiResponse = response.data;
        const data = apiResponse.data || apiResponse;

        return {
            success: apiResponse.code === 200 || apiResponse.successFlag === 1,
            taskId: data.taskId || data.task_id,
            message: apiResponse.msg || data.message
        };
    } catch (error: any) {
        console.error('Kie.ai Video Gen Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Generates speech from text using ElevenLabs via Kie.ai
 */
export async function generateTTS(text: string, voiceId: string = 'adam') {
    try {
        const response = await kieClient.post('/jobs/createTask', {
            model: 'elevenlabs/text-to-speech',
            input: {
                text,
                voice_id: voiceId,
                model_id: "eleven_multilingual_v2"
            }
        });

        const apiResponse = response.data;
        const data = apiResponse.data || apiResponse;

        return {
            success: apiResponse.code === 200,
            taskId: data.taskId,
            message: apiResponse.msg
        };
    } catch (error: any) {
        console.error('Kie.ai TTS Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Generates music using Suno API via Kie.ai
 */
export async function generateMusic(params: {
    prompt: string;
    style?: string;
    title?: string;
    customMode?: boolean;
    instrumental?: boolean;
    model?: string;
    callBackUrl?: string;
}) {
    try {
        // Suno uses a direct /generate endpoint according to docs
        const response = await kieClient.post('/generate', params);

        // Response: { code: 200, msg: "success", data: { task_id: "..." } }
        const apiResponse = response.data;
        const data = apiResponse.data || apiResponse;

        return {
            success: apiResponse.code === 200 || apiResponse.successFlag === 1,
            taskId: data.task_id || data.taskId,
            message: apiResponse.msg || data.message
        };
    } catch (error: any) {
        console.error('Kie.ai Music Gen Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Isolates audio (vocals/instrumentals) using ElevenLabs via Kie.ai
 */
export async function isolateAudio(audioUrl: string, callBackUrl?: string) {
    try {
        const response = await kieClient.post('/jobs/createTask', {
            model: 'elevenlabs/audio-isolation',
            input: {
                audio_url: audioUrl
            },
            callBackUrl
        });

        const apiResponse = response.data;
        const data = apiResponse.data || apiResponse;

        return {
            success: apiResponse.code === 200 || apiResponse.successFlag === 1,
            taskId: data.taskId,
            message: apiResponse.msg || data.message
        };
    } catch (error: any) {
        console.error('Kie.ai Audio Isolation Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Gets status for Suno music generation tasks
 */
export async function getMusicTaskStatus(taskId: string) {
    try {
        const response = await kieClient.get('/generate/record-info', {
            params: { taskId }
        });

        const apiResponse = response.data;
        const data = apiResponse.data || apiResponse;

        let resultUrls: string[] = [];
        // Handle Suno specific response structure
        if (data.response?.sunoData && Array.isArray(data.response.sunoData)) {
            resultUrls = data.response.sunoData.map((item: any) => item.audioUrl).filter(Boolean);
        }
        // Handle common recordInfo structure (resultJson)
        else if (data.resultJson) {
            try {
                const parsed = typeof data.resultJson === 'string' ? JSON.parse(data.resultJson) : data.resultJson;
                if (Array.isArray(parsed)) {
                    resultUrls = parsed.map((item: any) => item.audio_url || item.url || item.audioUrl).filter(Boolean);
                } else if (parsed.resultUrls && Array.isArray(parsed.resultUrls)) {
                    resultUrls = parsed.resultUrls;
                } else if (parsed.audio_url || parsed.audioUrl) {
                    resultUrls = [parsed.audio_url || parsed.audioUrl];
                }
            } catch {
                if (typeof data.resultJson === 'string' && data.resultJson.startsWith('http')) {
                    resultUrls = [data.resultJson];
                }
            }
        }

        // Normalize state
        let normalizedState: 'processing' | 'success' | 'failed' = 'processing';
        const rawState = (data.state || data.status || '').toLowerCase();

        if (['success', 'completed', 'finish', 'finished', 'first_success'].includes(rawState)) {
            normalizedState = 'success';
        } else if (['failed', 'error', 'fail'].includes(rawState)) {
            normalizedState = 'failed';
        }

        // Safety: If we have results, it's a success for the UI
        if (resultUrls.length > 0 && normalizedState === 'processing') {
            normalizedState = 'success';
        }

        return {
            state: normalizedState,
            resultUrls,
            error: data.failMsg || data.errorMessage || data.failReason || null
        };
    } catch (error: any) {
        console.error('Kie.ai Music Status Error:', error.response?.data || error.message);
        throw error;
    }
}

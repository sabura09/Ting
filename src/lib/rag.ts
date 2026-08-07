import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import { db } from './db';
import { supabaseAdmin } from './supabase';
import { extractTextFromFile, chunkText } from './docProcessor';
import fs from 'fs';

import path from 'path';
const LOG_DIR = path.join(process.cwd(), 'tmp');
const LOG_FILE = path.join(LOG_DIR, 'rag-logs.txt');

function debugLog(msg: string) {
    const timestamp = new Date().toISOString();
    const formattedMsg = `[${timestamp}] ${msg}\n`;
    try {
        fs.appendFileSync(LOG_FILE, formattedMsg);
    } catch (e) {}
}

const RAW_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_KEY = RAW_KEY;

const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function getEmbedding(text: string): Promise<number[]> {
    try {
        debugLog(`[getEmbedding] Generating for length: ${text.length}`);
        const result = await client.models.embedContent({
            model: "models/gemini-embedding-001",
            contents: [{ parts: [{ text }] }],
            config: {
                outputDimensionality: 768
            }
        });

        const embedding = result.embeddings?.[0]?.values;
        if (!embedding) throw new Error("No embedding returned");
        
        debugLog(`[getEmbedding] SUCCESS: length=${embedding.length}, first5=[${embedding.slice(0, 5)}]`);
        return embedding;
    } catch (error: any) {
        debugLog(`[getEmbedding] ERROR: ${error.message}`);
        throw error;
    }
}

export async function processDocument(buffer: Buffer, filename: string, docId: string) {
    try {
        debugLog(`[processDocument] START: ${filename} (id: ${docId})`);
        const text = await extractTextFromFile(buffer, filename);
        if (!text || text.length < 10) {
            throw new Error("Extracted text is too short or empty.");
        }

        const textChunks = chunkText(text);
        debugLog(`[processDocument] Created ${textChunks.length} chunks`);

        const chunksWithEmbeddings = await Promise.all(
            textChunks.map(async (content) => {
                const embedding = await getEmbedding(content);
                return { documentId: docId, content, embedding };
            })
        );

        await db.saveDocumentChunks(chunksWithEmbeddings);
        await db.updateDocumentStatus(docId, 'completed');
        debugLog(`[processDocument] SUCCESS: ${filename}`);

    } catch (error: any) {
        debugLog(`[processDocument] ERROR: ${error.message}`);
        await db.updateDocumentStatus(docId, 'error');
        throw error;
    }
}

export async function processText(text: string, filename: string, docId: string) {
    try {
        debugLog(`[processText] START: ${filename} (id: ${docId})`);
        if (!text || text.length < 10) {
            throw new Error("Text is too short or empty.");
        }

        const textChunks = chunkText(text);
        debugLog(`[processText] Created ${textChunks.length} chunks`);

        const chunksWithEmbeddings = await Promise.all(
            textChunks.map(async (content) => {
                const embedding = await getEmbedding(content);
                return { documentId: docId, content, embedding };
            })
        );

        await db.saveDocumentChunks(chunksWithEmbeddings);
        await db.updateDocumentStatus(docId, 'completed');
        debugLog(`[processText] SUCCESS: ${filename}`);

    } catch (error: any) {
        debugLog(`[processText] ERROR: ${error.message}`);
        await db.updateDocumentStatus(docId, 'error');
        throw error;
    }
}

function isDocumentQuery(query: string, hasImage: boolean): boolean {
    const q = query.trim().toLowerCase();
    
    // 1. If it's too short, it's not a document query (e.g. "hi", "2+2", "ok", "help")
    if (q.length < 5) return false;

    // 2. Check for simple greetings
    const greetings = [
        "hello", "hi", "hey", "hola", "yo", "good morning", "good afternoon", 
        "good evening", "how are you", "who are you", "what is this", 
        "test", "testing", "say about this image", "analyze this image", "what is this image"
    ];
    if (greetings.includes(q)) return false;
    if (greetings.some(g => q.startsWith(g) && q.length < g.length + 5)) return false;

    // 3. Check if it looks like math / non-alphabetic
    // If it contains no letters (a-z), it's probably math or symbols
    if (!/[a-z]/.test(q)) return false;

    // 4. Check for common general query patterns that shouldn't search documents
    const generalPatterns = [
        /^how to use this$/,
        /^what can you do$/,
        /^help me$/,
        /^(who|what|where|how|why) are you\??$/
    ];
    if (generalPatterns.some(p => p.test(q))) return false;

    // 5. If an image is uploaded, we only treat it as a document query if they explicitly mention documents/files/database
    if (hasImage) {
        const docKeywords = ["document", "file", "workspace", "database", "matching", "kb", "knowledge"];
        return docKeywords.some(keyword => q.includes(keyword));
    }

    return true;
}

async function generateOpenAIResponse(systemPrompt: string, userPrompt: string, image?: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
        throw new Error("No OpenAI API key found");
    }

    const openai = new OpenAI({ apiKey });
    
    const messages: any[] = [
        { role: 'system', content: systemPrompt },
    ];

    if (image) {
        let imgUrl = image;
        if (!imgUrl.startsWith('data:')) {
            imgUrl = `data:image/jpeg;base64,${image}`;
        }
        messages.push({
            role: 'user',
            content: [
                { type: 'text', text: userPrompt },
                {
                    type: 'image_url',
                    image_url: {
                        url: imgUrl,
                    }
                }
            ]
        });
    } else {
        messages.push({
            role: 'user',
            content: userPrompt
        });
    }

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.3,
        max_tokens: 1024
    });

    return response.choices[0]?.message?.content || "";
}

async function generateNvidiaResponse(systemPrompt: string, userPrompt: string, image?: string): Promise<string> {
    const apiKey = process.env.NVIDIA_API_KEY || '';
    if (!apiKey) {
        throw new Error("No NVIDIA API key found");
    }

    const openai = new OpenAI({
        apiKey,
        baseURL: 'https://integrate.api.nvidia.com/v1'
    });

    const messages: any[] = [
        { role: 'system', content: systemPrompt },
    ];

    if (image) {
        let imgUrl = image;
        if (!imgUrl.startsWith('data:')) {
            imgUrl = `data:image/jpeg;base64,${image}`;
        }
        messages.push({
            role: 'user',
            content: [
                { type: 'text', text: userPrompt },
                {
                    type: 'image_url',
                    image_url: {
                        url: imgUrl,
                    }
                }
            ]
        });
    } else {
        messages.push({
            role: 'user',
            content: userPrompt
        });
    }

    const modelName = image ? "meta/llama-3.2-11b-vision-instruct" : "meta/llama-3.1-8b-instruct";

    const response = await openai.chat.completions.create({
        model: modelName,
        messages: messages,
        temperature: 0.3,
        max_tokens: 1024
    });

    return response.choices[0]?.message?.content || "";
}

export async function getRAGContext(userEmail: string, query: string, limit = 4, hasImage = false): Promise<string> {
    try {
        debugLog(`[getRAGContext] START: email=${userEmail}, query="${query}", hasImage=${hasImage}`);
        
        if (!isDocumentQuery(query, hasImage)) {
            debugLog(`[getRAGContext] Skipping RAG context search: Query is not a document query.`);
            return "";
        }

        const queryEmbedding = await getEmbedding(query);

        // 1. Vector Match (Threshold 0.45)
        let matches = await db.matchDocumentChunks(userEmail, queryEmbedding, limit, 0.45);
        debugLog(`[getRAGContext] Vector matches (0.45): ${matches.length}`);

        // 2. Vector Match (Threshold 0.3 Fallback)
        if (matches.length === 0) {
            matches = await db.matchDocumentChunks(userEmail, queryEmbedding, limit, 0.3);
            debugLog(`[getRAGContext] Vector fallback (0.3): ${matches.length}`);
        }

        // 3. Keyword Match Fallback
        if (matches.length === 0) {
            matches = await db.keywordSearchChunks(userEmail, query, limit);
            debugLog(`[getRAGContext] Keyword fallback: ${matches.length}`);
        }

        if (matches.length === 0) {
            debugLog(`[getRAGContext] FINAL: No information found.`);
            return "";
        }

        return matches.map(m => m.content).join("\n\n---\n\n");
    } catch (error: any) {
        debugLog(`[getRAGContext] ERROR: ${error.message}`);
        return "";
    }
}

export async function generateGroundedResponseV3(userEmail: string, query: string, image?: string): Promise<string> {
    try {
        const context = await getRAGContext(userEmail, query, 4, !!image);
        
        const systemPrompt = `You are Live Support, a friendly and conversational support assistant powered by AI Suite.
Your goals:
1. Provide a warm, natural, and helpful conversation. Avoid robotic, repetitive, or generic AI-like responses.
2. If the user greets you (e.g., "hi", "hello"), asks general questions (e.g., "who are you?", "how are you?"), or asks you to analyze an uploaded image/screenshot, respond to them directly and conversationally. Do NOT refer to any document context or state "I found information in your documents" for these queries.
3. If the user asks a question about their uploaded files, documents, or information stored in their workspace, use the provided CONTEXT FROM DOCUMENTS to answer accurately.
4. If you use the document context to answer, integrate the information naturally without using stiff phrases like "According to the context" or "Based on the documents". Just answer their question directly and professionally.
5. If the document context is not relevant to the user's question, ignore it and answer the question to the best of your general knowledge.`;
        
        const userPrompt = `
CONTEXT FROM DOCUMENTS:
---
${context || "No specific document context found for this query."}
---

USER QUESTION: ${query}`;

        const modelNames = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"];
        let answer = "";
        let lastErr: any = null;

        // Try Gemini models first
        for (const modelId of modelNames) {
            try {
                debugLog(`[generateGroundedResponseV3] Attempting with ${modelId}`);
                
                const parts: any[] = [{ text: systemPrompt + "\n\n" + userPrompt }];
                if (image) {
                    let imgData = image;
                    let imgMime = 'image/jpeg';
                    if (imgData.startsWith('data:')) {
                        const m = imgData.match(/^data:([^;]+);base64,(.+)$/);
                        if (m) {
                            imgMime = m[1];
                            imgData = m[2];
                        }
                    }
                    parts.push({
                        inlineData: {
                            data: imgData,
                            mimeType: imgMime
                        }
                    });
                }

                const result = await client.models.generateContent({
                    model: modelId,
                    contents: [
                        { role: "user", parts }
                    ],
                    config: {
                        temperature: 0.3,
                        maxOutputTokens: 1024
                    }
                });
                answer = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (answer) break;
            } catch (err: any) {
                lastErr = err;
                debugLog(`[generateGroundedResponseV3] Model ${modelId} failed: ${err.message}`);
                continue;
            }
        }

        // If Gemini failed, try OpenAI fallback
        if (!answer) {
            try {
                debugLog(`[generateGroundedResponseV3] Gemini failed, attempting OpenAI fallback`);
                answer = await generateOpenAIResponse(systemPrompt, userPrompt, image);
                debugLog(`[generateGroundedResponseV3] OpenAI fallback SUCCESS`);
            } catch (err: any) {
                debugLog(`[generateGroundedResponseV3] OpenAI fallback failed: ${err.message}`);
            }
        }

        // If OpenAI failed, try NVIDIA fallback
        if (!answer) {
            try {
                debugLog(`[generateGroundedResponseV3] OpenAI failed, attempting NVIDIA fallback`);
                answer = await generateNvidiaResponse(systemPrompt, userPrompt, image);
                debugLog(`[generateGroundedResponseV3] NVIDIA fallback SUCCESS`);
            } catch (err: any) {
                debugLog(`[generateGroundedResponseV3] NVIDIA fallback failed: ${err.message}`);
            }
        }

        if (!answer && lastErr) {
            // Check if it's a quota error to show a better message
            if (lastErr.message?.includes("429") || lastErr.message?.includes("RESOURCE_EXHAUSTED")) {
                if (context) {
                    return "I found relevant information in your documents, but my AI quota is exhausted. Please try again in 1 minute.";
                }
                return "My AI quota is exhausted. Please try again in 1 minute.";
            }
            if (context) {
                return `I found information in your documents, but had trouble generating a summary: \n\n${context.substring(0, 500)}...`;
            }
            return "I'm sorry, I encountered an error while processing your request. Please try again.";
        }

        return answer || "I'm sorry, I couldn't generate a response. Please try again.";

    } catch (error: any) {
        debugLog(`[generateGroundedResponseV3] ERROR: ${error.message}`);
        return "I encountered an error while processing your request. Please try again.";
    }
}

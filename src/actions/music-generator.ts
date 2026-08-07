"use server";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { generateMusic, isolateAudio, getMusicTaskStatus } from "@/lib/marketing-api";
import { query } from "@/lib/pg";

export async function generateMusicAction(params: {
    prompt: string;
    style?: string;
    title?: string;
    customMode?: boolean;
    instrumental?: boolean;
    model?: string;
}) {
    try {
        // 1. Authentication
        const session: any = await getSession();
        if (!session) {
            return { error: "Unauthorized" };
        }

        // 2. Check Token Balance
        const settings = await db.getSettings();
        const cost = settings.aiLimits['music-generator'] || 100; // Default 100 tokens
        const balance = await db.getTokenBalance(session.email);

        if (balance.balance < cost) {
            return { error: "Insufficient tokens. Please top up your balance." };
        }

        // 3. Create Task
        const host = (await headers()).get("host");
        const protocol = host?.includes("localhost") ? "http" : "https";
        const appUrl = host ? `${protocol}://${host}` : "";
        
        // Kie.ai requires a callBackUrl for Suno. If we don't have one, we use a dummy 
        // because we are polling anyway.
        const callBackUrl = appUrl 
            ? `${appUrl}/api/callbacks/music` 
            : "https://example.com/api/callbacks/music";

        const result = await generateMusic({
            ...params,
            callBackUrl
        });

        if (!result.success || !result.taskId) {
            return { error: result.message || "Failed to start music generation" };
        }

        // 4. Deduct Tokens
        await db.updateTokenBalance(session.email, cost, 'consume', 'music-generator');

        // 5. Save Task to DB for persistence
        try {
            console.log(`[MusicAction] Saving initial task to DB: ${result.taskId}`);
            const taskResult = await query(
                'INSERT INTO marketing_tasks (task_id, user_email, type, status, metadata) VALUES ($1, $2, $3, $4, $5)',
                [
                    result.taskId, 
                    session.email, 
                    'music', 
                    'processing', 
                    JSON.stringify({ 
                        prompt: params.prompt, 
                        style: params.style, 
                        title: params.title,
                        model: params.model,
                        instrumental: params.instrumental
                    })
                ]
            );
            console.log(`[MusicAction] Task saved successfully. Rows: ${taskResult.rowCount}`);
        } catch (dbErr: any) {
            console.error("[MusicAction] Error saving music task to DB:", dbErr.message || dbErr);
            // Don't fail the action if DB save fails, but log it
        }

        return { success: true, taskId: result.taskId };

    } catch (error: any) {
        console.error("Music Generation Action Error:", error);
        return { error: error.message || "Failed to generate music" };
    }
}

export async function getMusicStatusAction(taskId: string) {
    try {
        const session = await getSession();
        if (!session) {
            return { error: "Unauthorized" };
        }

        const status = await getMusicTaskStatus(taskId);

        // If success, persist to DB
        if (status.state === 'success' && status.resultUrls && status.resultUrls.length > 0) {
            try {
                const userEmail = (session as any).email;
                if (!userEmail) {
                    console.error("[MusicStatus] No email found in session for music status update");
                    return { success: true, ...status };
                }
                
                console.log(`[MusicStatus] Persisting results for ${userEmail}, task ${taskId}`);

                // 1. Update task status
                const updateRes = await query(
                    'UPDATE marketing_tasks SET status = $1, result_url = $2, updated_at = NOW() WHERE task_id = $3',
                    ['success', status.resultUrls[0], taskId]
                );
                console.log(`[MusicStatus] Updated task: ${updateRes.rowCount} rows`);

                // 2. Fetch task metadata to get original prompt/title
                const taskRes = await query('SELECT metadata FROM marketing_tasks WHERE task_id = $1', [taskId]);
                let taskMetadata = taskRes.rows[0]?.metadata || {};
                
                // Handle case where metadata might be returned as a string
                if (typeof taskMetadata === 'string') {
                    try {
                        taskMetadata = JSON.parse(taskMetadata);
                    } catch (e) {
                        console.error("[MusicStatus] Failed to parse task metadata:", e);
                        taskMetadata = {};
                    }
                }

                // 3. Save as assets (save all generated versions)
                for (const url of status.resultUrls) {
                    // Check if already exists to avoid duplicates during polling
                    const exists = await query('SELECT id FROM marketing_assets WHERE url = $1 AND user_email = $2', [url, userEmail]);
                    if (exists.rowCount === 0) {
                        console.log(`[MusicStatus] Inserting new music asset: ${url}`);
                        const assetRes = await query(
                            'INSERT INTO marketing_assets (user_email, type, url, prompt, metadata) VALUES ($1, $2, $3, $4, $5)',
                            [
                                userEmail, 
                                'music', 
                                url, 
                                taskMetadata.prompt || '', 
                                JSON.stringify({
                                    ...taskMetadata,
                                    taskId,
                                    persistedAt: new Date().toISOString()
                                })
                            ]
                        );
                        console.log(`[MusicStatus] Asset inserted: ${assetRes.rowCount} rows`);
                    } else {
                        console.log(`[MusicStatus] Music asset already exists: ${url}`);
                    }
                }
            } catch (dbErr: any) {
                console.error("[MusicStatus] Error persisting music results to DB:", dbErr.message || dbErr);
            }
        } else if (status.state === 'failed') {
            try {
                console.log(`[MusicStatus] Marking task as failed: ${taskId}`);
                await query(
                    'UPDATE marketing_tasks SET status = $1, updated_at = NOW() WHERE task_id = $2',
                    ['failed', taskId]
                );
            } catch (dbErr: any) {
                console.error("[MusicStatus] Error updating failed music task in DB:", dbErr.message || dbErr);
            }
        }

        return { success: true, ...status };
    } catch (error: any) {
        console.error("Get Music Status Action Error:", error);
        return { error: error.message || "Failed to get music status" };
    }
}

export async function isolateAudioAction(audioUrl: string) {
    try {
        const session: any = await getSession();
        if (!session) {
            return { error: "Unauthorized" };
        }

        const settings = await db.getSettings();
        const cost = settings.aiLimits['audio-isolation'] || 50; 
        const balance = await db.getTokenBalance(session.email);

        if (balance.balance < cost) {
            return { error: "Insufficient tokens for audio processing." };
        }

        const host = (await headers()).get("host");
        const protocol = host?.includes("localhost") ? "http" : "https";
        const appUrl = host ? `${protocol}://${host}` : "";
        
        const callBackUrl = appUrl 
            ? `${appUrl}/api/callbacks/music` 
            : "https://example.com/api/callbacks/music";

        const result = await isolateAudio(audioUrl, callBackUrl);

        if (!result.success || !result.taskId) {
            return { error: result.message || "Failed to start audio isolation" };
        }

        await db.updateTokenBalance(session.email, cost, 'consume', 'audio-isolation');

        return { success: true, taskId: result.taskId };
    } catch (error: any) {
        console.error("Audio Isolation Action Error:", error);
        return { error: error.message || "Failed to isolate audio" };
    }
}

export async function listMusicAssetsAction() {
    try {
        const session: any = await getSession();
        if (!session || !session.email) {
            return { error: "Unauthorized" };
        }

        console.log(`[ListMusic] Fetching music assets for ${session.email}`);
        const res = await query(
            'SELECT * FROM marketing_assets WHERE user_email = $1 AND type = $2 ORDER BY created_at DESC',
            [session.email, 'music']
        );
        console.log(`[ListMusic] Found ${res.rowCount} assets`);

        return { success: true, assets: res.rows };
    } catch (error: any) {
        console.error("[ListMusic] Error:", error.message || error);
        return { error: error.message || "Failed to list music assets" };
    }
}

export async function getSummerVibesMusic() {
    try {
        // Since landing page is public, we search globally for "Summer Vibes"
        // In a real app, this might be a 'featured' flag, but for now we match title
        const res = await query(
            "SELECT * FROM marketing_assets WHERE type = 'music' AND (metadata->>'title' = 'Summer Vibes' OR prompt ILIKE '%Summer Vibes%') ORDER BY created_at DESC LIMIT 1",
            []
        );

        if (res.rowCount > 0) {
            return { success: true, song: res.rows[0] };
        }
        return { success: false };
    } catch (error: any) {
        console.error("[SummerVibes] Error:", error.message || error);
        return { error: error.message || "Failed to fetch Summer Vibes" };
    }
}

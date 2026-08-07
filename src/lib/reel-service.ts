import { query } from './pg';
import {
    generateMarketingText,
    generateTTS,
    generateMusic,
    generateReelVideo,
    createKlingTask,
    getKlingTaskStatus,
    getMarketingImageStatus,
    getMusicTaskStatus
} from './marketing-api';

export class ReelService {
    /**
     * Starts the reel generation process by directly using the user prompt for video generation.
     */
    static async startReelGeneration(userEmail: string, prompt: string, options: {
        resolution?: string,
        ratio?: string,
        mode?: string,
        seed?: number,
        duration?: number,
        negative_prompt?: string
    } = {}) {
        // 1. Create the reel record in the database
        const reelRes = await query(
            'INSERT INTO marketing_reels (user_email, prompt, status, metadata) VALUES ($1, $2, $3, $4) RETURNING id',
            [userEmail, prompt, 'processing', JSON.stringify({ options })]
        );
        const reelId = reelRes.rows[0].id;

        console.log('Starting direct video generation for reel:', reelId);

        // 2. Create a single-scene script from the prompt
        const script = [
            {
                scene: 1,
                text: prompt,
                image_prompt: prompt, // Use the user's prompt directly
                duration: options.duration || 6
            }
        ];

        // 3. Update the reel with the script and trigger sub-tasks in the next poll
        await query(
            'UPDATE marketing_reels SET script = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(script), reelId]
        );

        return { success: true, reelId };
    }

    /**
     * Polls and advances the reel generation state machine.
     */
    static async pollReelStatus(reelId: string) {
        const res = await query('SELECT * FROM marketing_reels WHERE id = $1', [reelId]);
        const reel = res.rows[0];
        if (!reel) throw new Error('Reel not found');

        if (reel.status === 'success' || reel.status === 'failed') {
            return reel;
        }

        const metadata = reel.metadata || {};
        let updatedMetadata = { ...metadata };
        let statusChanged = false;

        // Step 1: Check Script or Start Subtasks if script is already present
        if (reel.script && !metadata.sceneTaskIds && !metadata.voiceoverTaskId) {
            // Script is ready, start sub-tasks
            try {
                const script = typeof reel.script === 'string' ? JSON.parse(reel.script) : reel.script;

                // Start only the Video task
                const sceneTasks = await Promise.all(script.map((scene: any) =>
                    generateReelVideo(scene.image_prompt, {
                        aspect_ratio: updatedMetadata.options?.ratio || "9:16",
                        resolution: updatedMetadata.options?.resolution || "480p",
                        mode: updatedMetadata.options?.mode || "normal",
                        seed: updatedMetadata.options?.seed,
                        duration: updatedMetadata.options?.duration || 6,
                        filesUrl: updatedMetadata.options?.filesUrl
                    })
                ));

                updatedMetadata.sceneTaskIds = sceneTasks.map(t => t.taskId);
                statusChanged = true;
            } catch (e) {
                console.error('Error starting subtasks:', e);
                await query('UPDATE marketing_reels SET status = $1 WHERE id = $2', ['failed', reelId]);
                return { ...reel, status: 'failed' };
            }
        } else if (!reel.script && metadata.scriptTaskId) {
            const scriptStatus = await getKlingTaskStatus(metadata.scriptTaskId);
            if (scriptStatus.state === 'success') {
                try {
                    const scriptText = scriptStatus.resultText || scriptStatus.resultUrl;
                    const cleaned = (scriptText || '').replace(/```json|```/g, '').trim();
                    const script = JSON.parse(cleaned || '[]');

                    await query(
                        'UPDATE marketing_reels SET script = $1, updated_at = NOW() WHERE id = $2',
                        [JSON.stringify(script), reelId]
                    );
                    reel.script = script;
                    statusChanged = true; // Trigger re-poll logic in the next check or wait for next poll
                } catch (e) {
                    console.error('Error parsing script:', e);
                    await query('UPDATE marketing_reels SET status = $1 WHERE id = $2', ['failed', reelId]);
                    return { ...reel, status: 'failed' };
                }
            } else if (scriptStatus.state === 'failed') {
                await query('UPDATE marketing_reels SET status = $1 WHERE id = $2', ['failed', reelId]);
                return { ...reel, status: 'failed' };
            }
        }

        // Step 2: Check sub-tasks (Scenes only)
        if (reel.script && updatedMetadata.sceneTaskIds) {
            const sceneStatuses = await Promise.all(updatedMetadata.sceneTaskIds.map(async (id: string, idx: number) => {
                if (reel.script[idx].video_url) return { state: 'success' };
                return await getKlingTaskStatus(id);
            }));

            let allScenesDone = true;
            sceneStatuses.forEach((s: any, idx: number) => {
                if (s.state === 'success' && !reel.script[idx].video_url) {
                    reel.script[idx].video_url = s.resultUrls?.[0] || s.resultUrl;
                    statusChanged = true;
                } else if (s.state !== 'success') {
                    allScenesDone = false;
                }

                if (s.state === 'failed') {
                    // One scene failed, whole reel failed
                    allScenesDone = false;
                    throw new Error(`Scene ${idx + 1} failed: ${s.error}`);
                }
            });

            if (allScenesDone) {
                // All scenes ready!
                const finalVideoUrl = reel.script[0].video_url;

                await query(
                    'UPDATE marketing_reels SET status = $1, result_url = $2, script = $3, updated_at = NOW() WHERE id = $4',
                    ['success', finalVideoUrl, JSON.stringify(reel.script), reelId]
                );

                // Save to marketing_assets
                await query(
                    'INSERT INTO marketing_assets (user_email, type, url, prompt, metadata) VALUES ($1, $2, $3, $4, $5)',
                    [reel.user_email, 'reel', finalVideoUrl, reel.prompt, JSON.stringify({ reelId, script: reel.script })]
                );

                return { ...reel, status: 'success', result_url: finalVideoUrl };
            }
        }

        if (statusChanged) {
            await query(
                'UPDATE marketing_reels SET metadata = $1, updated_at = NOW() WHERE id = $2',
                [JSON.stringify(updatedMetadata), reelId]
            );
        }

        return { ...reel, metadata: updatedMetadata };
    }
}

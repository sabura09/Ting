import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/pg';
import {
    generateMarketingImage,
    getMarketingImageStatus,
    createKlingTask,
    getKlingTaskStatus,
    uploadFile,
    ensureRemoteUrl
} from '@/lib/marketing-api';
import { ReelService } from '@/lib/reel-service';
import { db } from '@/lib/db';
import { getFeatureById } from '@/lib/features';

function getFeatureId(action: string, data: any): string {
    if (action === 'generate-avatar') return 'avatar-studio';
    if (action === 'generate-video') return 'marketing-video';
    if (action === 'generate-reel') return 'reel-generator';
    if (action === 'generate-image') {
        if (data.isManga) return 'manga-generator';
        if (data.isLogo) return 'logo-generator';
        if (data.isThumbnail) return 'thumbnail-maker';
        if (data.isFlyer) return 'flyer-designer';
        if (data.isBusinessCard) return 'business-card-designer';
        if (data.isBrochure) return 'brochure-designer';
        if (data.isAvatar || data.type === 'avatar') return 'avatar-studio';
        return 'marketing-image';
    }
    return 'marketing-image';
}

async function resolveTokens(req: NextRequest, session: any, featureId: string) {
    const headerCost = req.headers.get('x-deducted-cost');
    const headerFeature = req.headers.get('x-deducted-feature');

    if (headerCost && headerFeature) {
        return {
            cost: parseInt(headerCost),
            featureId: headerFeature,
            isDeducted: true
        };
    }

    // Fallback: Run local validation and deduction if not already handled by middleware
    const settings = await db.getSettings();
    const feature = getFeatureById(featureId);
    const cost = settings.aiLimits?.[featureId] ?? feature?.tokenCost ?? 10;

    const tokenBalance = await db.getTokenBalance(session.email);
    if (tokenBalance.balance < cost) {
        throw new Error('Credits insufficient. Please upgrade your plan or purchase more tokens.');
    }

    await db.updateTokenBalance(session.email, cost, 'consume', featureId);

    return {
        cost,
        featureId,
        isDeducted: true
    };
}

export async function POST(req: NextRequest) {
    const session = await getSession() as any;
    if (!session || !session.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...data } = await req.json();

    try {
        switch (action) {
            case 'generate-image': {
                const { prompt, options, referenceImageUrl, isAvatar, name } = data;

                // If reference image is provided, add it to filesUrl for image-to-image
                const finalOptions = { ...options };
                if (referenceImageUrl) {
                    finalOptions.filesUrl = [referenceImageUrl];
                }

                const featureId = getFeatureId(action, data);
                let costInfo;
                try {
                    costInfo = await resolveTokens(req, session, featureId);
                } catch (err: any) {
                    return NextResponse.json({ error: err.message }, { status: 403 });
                }
                const { cost, featureId: resolvedFeatureId } = costInfo;

                try {
                    const result = await generateMarketingImage(prompt, finalOptions);
                    if (result.successFlag === 1 || result.successFlag === 2) {
                        // Save task
                        const taskType = data.isManga ? 'manga' : 
                                         (data.isLogo ? 'logo' : 
                                         (data.isThumbnail ? 'thumbnail' : 
                                         (data.isFlyer ? 'flyer' : 
                                         (data.isBusinessCard ? 'business-card' : 
                                         (data.isBrochure ? 'brochure' : 
                                         (isAvatar ? 'avatar' : 'image'))))));
                        await query(
                            'INSERT INTO marketing_tasks (task_id, user_email, type, status, metadata) VALUES ($1, $2, $3, $4, $5)',
                            [result.taskId, session.email, taskType, 'processing', JSON.stringify({ name, prompt, options: finalOptions, isManga: data.isManga, isFlyer: data.isFlyer, isBusinessCard: data.isBusinessCard, isBrochure: data.isBrochure, tokenCost: cost, featureId: resolvedFeatureId })]
                        );
                        return NextResponse.json({ success: true, taskId: result.taskId });
                    }
                    await db.updateTokenBalance(session.email, cost, 'add', `refund-${resolvedFeatureId}`);
                    return NextResponse.json({ error: result.message || 'Generation failed' }, { status: 400 });
                } catch (err: any) {
                    await db.updateTokenBalance(session.email, cost, 'add', `refund-${resolvedFeatureId}`);
                    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 400 });
                }
            }

            case 'generate-avatar': {
                const { name, imageUrl, audioUrl, prompt } = data;

                const featureId = getFeatureId(action, data);
                let costInfo;
                try {
                    costInfo = await resolveTokens(req, session, featureId);
                } catch (err: any) {
                    return NextResponse.json({ error: err.message }, { status: 403 });
                }
                const { cost, featureId: resolvedFeatureId } = costInfo;

                try {
                    const result = await createKlingTask('kling/ai-avatar-standard', {
                        image_url: imageUrl,
                        audio_url: audioUrl,
                        prompt
                    });
                    if (result.success) {
                        await query(
                            'INSERT INTO marketing_tasks (task_id, user_email, type, status, metadata) VALUES ($1, $2, $3, $4, $5)',
                            [result.taskId, session.email, 'avatar', 'processing', JSON.stringify({ name, imageUrl, audioUrl, prompt, tokenCost: cost, featureId: resolvedFeatureId })]
                        );
                        return NextResponse.json({ success: true, taskId: result.taskId });
                    }
                    await db.updateTokenBalance(session.email, cost, 'add', `refund-${resolvedFeatureId}`);
                    return NextResponse.json({ error: 'Avatar generation failed' }, { status: 400 });
                } catch (err: any) {
                    await db.updateTokenBalance(session.email, cost, 'add', `refund-${resolvedFeatureId}`);
                    return NextResponse.json({ error: err.message || 'Avatar generation failed' }, { status: 400 });
                }
            }

            case 'generate-video': {
                const { imageUrl, avatarUrl, prompt, mode, duration, resolution, aspect_ratio } = data;

                const featureId = getFeatureId(action, data);
                let costInfo;
                try {
                    costInfo = await resolveTokens(req, session, featureId);
                } catch (err: any) {
                    return NextResponse.json({ error: err.message }, { status: 403 });
                }
                const { cost, featureId: resolvedFeatureId } = costInfo;

                try {
                    // Ensure all URLs are remote (handles local system avatars)
                    const remoteImageUrl = imageUrl ? await ensureRemoteUrl(imageUrl) : null;
                    const remoteAvatarUrl = avatarUrl ? await ensureRemoteUrl(avatarUrl) : null;

                    // Primary image is product, fallback to avatar
                    const primaryImage = remoteImageUrl || remoteAvatarUrl;

                    const modelName = primaryImage ? 'grok-imagine/image-to-video' : 'grok-imagine/text-to-video';

                    const taskInput: any = {
                        prompt,
                        duration: duration || "6",
                        mode: mode || "normal",
                        resolution: resolution || "480p",
                        aspect_ratio: aspect_ratio || "16:9",
                    };

                    if (primaryImage) {
                        taskInput.image_urls = [primaryImage];
                    }

                    // For grok-imagine, we might need a task_id format as well if specified, 
                    // but according to user it says "Do not use it simultaneously with task_id. In your prompt..." 
                    // and wait, the user's curl uses task_id, wait! the docs say "Do not use it simultaneously with task_id. ... image_urls ... "
                    // So we provide image_urls.
                    
                    const result = await createKlingTask(modelName, taskInput);

                    if (result.success) {
                        await query(
                            'INSERT INTO marketing_tasks (task_id, user_email, type, status, metadata) VALUES ($1, $2, $3, $4, $5)',
                            [result.taskId, session.email, 'video', 'processing', JSON.stringify({ imageUrl: remoteImageUrl, avatarUrl: remoteAvatarUrl, prompt, tokenCost: cost, featureId: resolvedFeatureId })]
                        );
                        return NextResponse.json({ success: true, taskId: result.taskId });
                    }
                    await db.updateTokenBalance(session.email, cost, 'add', `refund-${resolvedFeatureId}`);
                    return NextResponse.json({ error: result.message || 'Video generation failed' }, { status: 400 });
                } catch (err: any) {
                    await db.updateTokenBalance(session.email, cost, 'add', `refund-${resolvedFeatureId}`);
                    return NextResponse.json({ error: err.message || 'Video generation failed' }, { status: 400 });
                }
            }

            case 'generate-reel': {
                const { prompt, options } = data;
                if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

                const featureId = getFeatureId(action, data);
                let costInfo;
                try {
                    costInfo = await resolveTokens(req, session, featureId);
                } catch (err: any) {
                    return NextResponse.json({ error: err.message }, { status: 403 });
                }
                const { cost, featureId: resolvedFeatureId } = costInfo;

                try {
                    const result = await ReelService.startReelGeneration(session.email, prompt, options);

                    if (result.success && result.reelId) {
                        // Append token economics to the newly created reel's metadata JSONB
                        await query(
                            'UPDATE marketing_reels SET metadata = COALESCE(metadata, \'{}\'::jsonb) || jsonb_build_object(\'tokenCost\', $1::int, \'featureId\', $2::text) WHERE id = $3',
                            [cost, resolvedFeatureId, result.reelId]
                        );
                    }
                    return NextResponse.json(result);
                } catch (err: any) {
                    await db.updateTokenBalance(session.email, cost, 'add', `refund-${resolvedFeatureId}`);
                    return NextResponse.json({ error: err.message || 'Reel generation failed' }, { status: 400 });
                }
            }

            case 'upload': {
                const { base64, fileName, saveAsProduct, productName } = data;
                const url = await uploadFile(base64, fileName);

                if (saveAsProduct) {
                    await query(
                        'INSERT INTO marketing_products (user_email, name, image_url) VALUES ($1, $2, $3)',
                        [session.email, productName || fileName, url]
                    );
                }

                return NextResponse.json({ success: true, url });
            }

            case 'save-avatar': {
                const { imageUrl, name } = data;
                await query(
                    'INSERT INTO marketing_avatars (user_email, name, image_url, type) VALUES ($1, $2, $3, $4)',
                    [session.email, name || 'Uploaded Avatar', imageUrl, 'uploaded']
                );
                return NextResponse.json({ success: true });
            }

            case 'delete-avatar': {
                const { id } = data;
                await query(
                    'DELETE FROM marketing_avatars WHERE id = $1 AND user_email = $2',
                    [id, session.email]
                );
                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Marketing API POST Error Details:', {
            message: error.message,
            stack: error.stack,
            action,
            data: action === 'upload' ? 'base64-data-hidden' : data
        });
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const session = await getSession() as any;
    if (!session || !session.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    try {
        switch (action) {
            case 'poll': {
                const taskId = searchParams.get('taskId');
                const type = searchParams.get('type');
                if (!taskId) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

                let status;
                if (type === 'image') {
                    status = await getMarketingImageStatus(taskId);
                } else {
                    status = await getKlingTaskStatus(taskId);
                }

                if (status.state === 'success') {
                    const resultUrl = Array.isArray(status.resultUrls) ? status.resultUrls[0] : (status.resultUrl || status.resultUrls);

                    // Update task status
                    await query(
                        'UPDATE marketing_tasks SET status = $1, result_url = $2, updated_at = NOW() WHERE task_id = $3',
                        ['success', resultUrl, taskId]
                    );

                    // Fetch task metadata to get original prompt/name
                    const taskRes = await query('SELECT type, metadata FROM marketing_tasks WHERE task_id = $1', [taskId]);
                    const task = taskRes.rows[0];

                    // Save as asset
                    if (task) {
                        const assetType = task.type === 'manga' ? 'manga' : 
                                          (task.type === 'logo' ? 'logo' : 
                                          (task.type === 'thumbnail' ? 'thumbnail' : 
                                          (task.type === 'flyer' ? 'flyer' : 
                                          (task.type === 'business-card' ? 'business-card' : 
                                          (task.type === 'brochure' ? 'brochure' : 
                                          (task.type === 'avatar' ? 'avatar' : 
                                          (task.type === 'video' ? 'video' : 'image')))))));
                        await query(
                            'INSERT INTO marketing_assets (user_email, type, url, prompt, metadata) VALUES ($1, $2, $3, $4, $5)',
                            [session.email, assetType, resultUrl, task.metadata.prompt, JSON.stringify(task.metadata)]
                        );

                        if (task.type === 'avatar') {
                            await query(
                                'INSERT INTO marketing_avatars (user_email, name, image_url, type) VALUES ($1, $2, $3, $4)',
                                [session.email, task.metadata.name || 'AI Avatar', resultUrl, 'generated']
                            );
                        }
                    }
                } else if (status.state === 'failed') {
                    // Fetch task metadata to refund tokens if task status is currently 'processing'
                    const taskRes = await query('SELECT status, metadata FROM marketing_tasks WHERE task_id = $1', [taskId]);
                    const task = taskRes.rows[0];
                    if (task && task.status === 'processing') {
                        await query(
                            'UPDATE marketing_tasks SET status = $1, updated_at = NOW() WHERE task_id = $2',
                            ['failed', taskId]
                        );

                        const tokenCost = task.metadata?.tokenCost;
                        const featureId = task.metadata?.featureId || 'marketing-image';
                        if (tokenCost) {
                            await db.updateTokenBalance(session.email, tokenCost, 'add', `refund-${featureId}`);
                        }
                    }
                }

                return NextResponse.json(status);
            }

            case 'poll-reel': {
                const reelId = searchParams.get('reelId');
                if (!reelId) return NextResponse.json({ error: 'Reel ID required' }, { status: 400 });

                // Fetch the current reel record to check if it's already in a final state before polling
                const beforeRes = await query('SELECT status FROM marketing_reels WHERE id = $1', [reelId]);
                const beforeReel = beforeRes.rows[0];

                const status = await ReelService.pollReelStatus(reelId);

                // If it just transitioned to failed, refund tokens!
                if (beforeReel && beforeReel.status === 'processing' && status.status === 'failed') {
                    const tokenCost = status.metadata?.tokenCost;
                    const featureId = status.metadata?.featureId || 'reel-generator';
                    if (tokenCost) {
                        await db.updateTokenBalance(session.email, tokenCost, 'add', `refund-${featureId}`);
                    }
                }
                return NextResponse.json(status);
            }

            case 'list-assets': {
                const type = searchParams.get('type');
                let dbRows = [];
                try {
                    if (type) {
                        const res = await query(
                            'SELECT * FROM marketing_assets WHERE user_email = $1 AND type = $2 ORDER BY created_at DESC',
                            [session.email, type]
                        );
                        dbRows = res.rows;
                    } else {
                        const res = await query(
                            'SELECT * FROM marketing_assets WHERE user_email = $1 ORDER BY created_at DESC',
                            [session.email]
                        );
                        dbRows = res.rows;
                    }
                } catch (dbError) {
                    console.error('Database error in list-assets:', dbError);
                }
                return NextResponse.json(dbRows);
            }

            case 'list-avatars': {
                let dbRows = [];
                try {
                    const dbRes = await query(
                        'SELECT * FROM marketing_avatars WHERE user_email = $1 ORDER BY created_at DESC',
                        [session.email]
                    );
                    dbRows = dbRes.rows;
                } catch (dbError) {
                    console.error('Database error in list-avatars:', dbError);
                    // Continue without DB rows, only system avatars
                }

                const systemAvatars = [
                    { id: 'sys-1', name: 'Premium Avatar 1', image_url: '/ai-avatar/1.jpg', type: 'system' },
                    { id: 'sys-2', name: 'Premium Avatar 2', image_url: '/ai-avatar/2.jpg', type: 'system' },
                    { id: 'sys-3', name: 'Premium Avatar 3', image_url: '/ai-avatar/3.jpg', type: 'system' },
                    { id: 'sys-5', name: 'Premium Avatar 4', image_url: '/ai-avatar/5.jpg', type: 'system' },
                    { id: 'sys-6', name: 'Premium Avatar 5', image_url: '/ai-avatar/6.jpg', type: 'system' },
                    { id: 'sys-7', name: 'Premium Avatar 6', image_url: '/ai-avatar/7.jpg', type: 'system' },
                    { id: 'sys-8', name: 'Premium Avatar 7', image_url: '/ai-avatar/8.jpg', type: 'system' },
                ];

                return NextResponse.json([...systemAvatars, ...dbRows]);
            }

            case 'list-products': {
                let dbRows = [];
                try {
                    const res = await query(
                        'SELECT * FROM marketing_products WHERE user_email = $1 ORDER BY created_at DESC',
                        [session.email]
                    );
                    dbRows = res.rows;
                } catch (dbError) {
                    console.error('Database error in list-products:', dbError);
                }

                const systemProducts = [
                    { id: 'prod-1', name: 'Demo Product 1', image_url: '/products/1.png' },
                    { id: 'prod-2', name: 'Demo Product 2', image_url: '/products/2.png' },
                    { id: 'prod-3', name: 'Demo Product 3', image_url: '/products/3.png' },
                ];

                return NextResponse.json([...systemProducts, ...dbRows]);
            }

            case 'list-tasks': {
                let dbRows = [];
                try {
                    const res = await query(
                        'SELECT * FROM marketing_tasks WHERE user_email = $1 ORDER BY created_at DESC LIMIT 10',
                        [session.email]
                    );
                    dbRows = res.rows;
                } catch (dbError) {
                    console.error('Database error in list-tasks:', dbError);
                }
                return NextResponse.json(dbRows);
            }

            case 'list-reels': {
                const res = await query(
                    'SELECT * FROM marketing_reels WHERE user_email = $1 ORDER BY created_at DESC',
                    [session.email]
                );
                return NextResponse.json(res.rows);
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Marketing API GET Error Details:', {
            message: error.message,
            stack: error.stack,
            action
        });
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

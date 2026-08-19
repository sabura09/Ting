import { NextResponse } from 'next/server';
import { query } from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    return processCron();
}

export async function POST(req: Request) {
    return processCron();
}

async function processCron() {
    try {
        const startTime = Date.now();
        
        // 1. Fetch all scheduled posts that are due
        const duePostsRes = await query(`
            SELECT p.*, a.instagram_business_account_id, a.page_access_token 
            FROM instagram_posts p
            LEFT JOIN instagram_agents a ON LOWER(p.user_email) = LOWER(a.user_email)
            WHERE p.status = 'scheduled' AND p.scheduled_at <= NOW()
        `);

        const duePosts = duePostsRes.rows;
        const results = [];

        console.log(`[Instagram Cron] Found ${duePosts.length} posts due for publication.`);

        for (const post of duePosts) {
            const { id, user_email, media_url, caption, instagram_business_account_id, page_access_token } = post;
            
            try {
                // Check if account config exists
                if (!instagram_business_account_id || !page_access_token) {
                    throw new Error("Instagram configuration missing (Account ID or Page Token not connected).");
                }

                const isMockToken = page_access_token.includes('mock_token') || instagram_business_account_id.includes('mock_');

                if (isMockToken) {
                    // Simulate successful publication in development/testing mode
                    console.log(`[Instagram Cron] Simulating post publication for ${user_email} (mock credentials)`);
                    
                    // Artificial small delay to feel realistic
                    await new Promise(resolve => setTimeout(resolve, 500));

                    await query(`
                        UPDATE instagram_posts 
                        SET status = 'published', published_at = NOW(), error_message = null, updated_at = NOW()
                        WHERE id = $1
                    `, [id]);

                    results.push({ id, status: 'published', mode: 'simulated' });
                } else {
                    // Official production publish workflow via Instagram Graph API
                    console.log(`[Instagram Cron] Publishing post via Instagram Graph API for ${user_email}`);

                    // Step A: Create Media Container
                    const containerUrl = `https://graph.facebook.com/v20.0/${instagram_business_account_id}/media`;
                    const containerRes = await fetch(containerUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image_url: media_url,
                            caption: caption || '',
                            access_token: page_access_token
                        })
                    });

                    if (!containerRes.ok) {
                        const errBody = await containerRes.json().catch(() => ({}));
                        throw new Error(`Graph API Media Container Creation Failed: ${errBody.error?.message || containerRes.statusText}`);
                    }

                    const containerData = await containerRes.json();
                    const containerId = containerData.id;

                    if (!containerId) {
                        throw new Error("Did not receive a container ID from Graph API.");
                    }

                    // Step B: Publish Container
                    const publishUrl = `https://graph.facebook.com/v20.0/${instagram_business_account_id}/media_publish`;
                    const publishRes = await fetch(publishUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            creation_id: containerId,
                            access_token: page_access_token
                        })
                    });

                    if (!publishRes.ok) {
                        const errBody = await publishRes.json().catch(() => ({}));
                        throw new Error(`Graph API Media Publish Failed: ${errBody.error?.message || publishRes.statusText}`);
                    }

                    const publishData = await publishRes.json();
                    const instagramMediaId = publishData.id;

                    // Update DB with success status and actual media ID if needed
                    await query(`
                        UPDATE instagram_posts 
                        SET status = 'published', published_at = NOW(), error_message = null, updated_at = NOW()
                        WHERE id = $1
                    `, [id]);

                    results.push({ id, status: 'published', mode: 'production', mediaId: instagramMediaId });
                }

            } catch (err: any) {
                console.error(`[Instagram Cron] Failed to publish post ${id}:`, err);
                
                // Update DB with failed status and error details
                await query(`
                    UPDATE instagram_posts 
                    SET status = 'failed', error_message = $2, updated_at = NOW()
                    WHERE id = $1
                `, [id, err.message || 'Unknown publication error']);

                results.push({ id, status: 'failed', error: err.message });
            }
        }

        const duration = Date.now() - startTime;
        return NextResponse.json({
            success: true,
            processed: duePosts.length,
            duration: `${duration}ms`,
            results
        });

    } catch (error: any) {
        console.error('Error running Instagram scheduler cron:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

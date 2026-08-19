import { NextResponse } from 'next/server';
import { query } from '@/lib/pg';
import { processDmReply, processCommentReply } from '@/lib/instagram/manager';

// Webhook GET validation (Meta verification)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('hub.mode');
        const token = searchParams.get('hub.verify_token');
        const challenge = searchParams.get('hub.challenge');

        const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'instagram_verify_token_default';

        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('[Instagram Webhook] Validation Successful.');
                return new Response(challenge, { status: 200 });
            } else {
                console.warn('[Instagram Webhook] Validation Failed: Token mismatch.');
                return new Response('Forbidden', { status: 403 });
            }
        }
        return new Response('Bad Request', { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// Webhook POST receiver (Meta event dispatching)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Confirm it is an instagram subscription event
        if (body.object !== 'instagram') {
            return NextResponse.json({ error: 'Unsupported webhook object type.' }, { status: 400 });
        }

        console.log('[Instagram Webhook] Event received:', JSON.stringify(body, null, 2));

        for (const entry of body.entry || []) {
            const instagramBusinessAccountId = entry.id; // Target business ID

            // 1. Find the agent associated with this Instagram account ID
            const agentRes = await query(
                'SELECT * FROM instagram_agents WHERE instagram_business_account_id = $1 AND is_active = true', 
                [instagramBusinessAccountId]
            );
            const agent = agentRes.rows[0];
            
            if (!agent) {
                console.warn(`[Instagram Webhook] No active agent configured for Account ID: ${instagramBusinessAccountId}`);
                continue;
            }

            const email = agent.user_email;
            const pageAccessToken = agent.page_access_token;

            // 2. Process Direct Messages (messaging array)
            if (entry.messaging) {
                for (const event of entry.messaging) {
                    const senderId = event.sender?.id;
                    const messageText = event.message?.text;

                    // Skip echo events or empty messages
                    if (!senderId || !messageText || event.message?.is_echo) continue;

                    console.log(`[Instagram Webhook] Processing DM from sender ${senderId} for user ${email}`);

                    // A: Execute AI generation & log entry
                    const result = await processDmReply(email, senderId, 'instagram_user', messageText);

                    // B: Send the response back to Meta via Graph API if AI reply is generated
                    if (result.replyText && pageAccessToken) {
                        const sendUrl = `https://graph.facebook.com/v20.0/me/messages?access_token=${pageAccessToken}`;
                        const response = await fetch(sendUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                recipient: { id: senderId },
                                message: { text: result.replyText }
                            })
                        });

                        if (!response.ok) {
                            const errBody = await response.json().catch(() => ({}));
                            console.error('[Instagram Webhook] Failed to transmit reply to Meta:', errBody.error?.message);
                        } else {
                            console.log('[Instagram Webhook] DM reply sent successfully.');
                        }
                    }
                }
            }

            // 3. Process Feed Comments (changes array)
            if (entry.changes) {
                for (const change of entry.changes) {
                    if (change.field === 'comments') {
                        const value = change.value;
                        const commentId = value.id;
                        const mediaId = value.media?.id || 'post_media';
                        const commenterUsername = value.from?.username || 'instagram_user';
                        const commentText = value.text;

                        // Avoid infinite loops (skip our own agent replies if we receive them)
                        if (commenterUsername === agent.username) continue;

                        console.log(`[Instagram Webhook] Processing comment ${commentId} on media ${mediaId} by ${commenterUsername}`);

                        // A: Execute AI generation & log entry
                        const result = await processCommentReply(email, mediaId, 'Post Media', commentId, commenterUsername, commentText);

                        // B: Send the response back to Meta comment thread
                        if (result.replyText && pageAccessToken) {
                            const replyUrl = `https://graph.facebook.com/v20.0/${commentId}/replies?access_token=${pageAccessToken}`;
                            const response = await fetch(replyUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    message: `@${commenterUsername} ${result.replyText}`
                                })
                            });

                            if (!response.ok) {
                                const errBody = await response.json().catch(() => ({}));
                                console.error('[Instagram Webhook] Failed to transmit comment reply to Meta:', errBody.error?.message);
                            } else {
                                console.log('[Instagram Webhook] Comment reply posted successfully.');
                            }
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Webhook event processed.' });

    } catch (error: any) {
        console.error('Error in Instagram Webhook handler:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

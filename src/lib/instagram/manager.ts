import OpenAI from 'openai';
import { query } from '@/lib/pg';
import { db } from '@/lib/db';
import { getFeatureById } from '@/lib/features';
import { getModelById } from '@/lib/models';

export async function generateText(systemPrompt: string, userMessage: string, modelId: string): Promise<string> {
    const model = getModelById(modelId);
    const provider = model?.provider || ( (modelId.toLowerCase().includes('gemini') || modelId.toLowerCase().includes('google')) ? 'google' : 'openai' );

    if (provider === 'google') {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("Gemini API key is not configured in environment variables.");

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userMessage }] }],
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                }
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || "Gemini API Error");
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (provider === 'nvidia') {
        const apiKey = process.env.NVIDIA_API_KEY;
        if (!apiKey) throw new Error("NVIDIA API key is not configured in environment variables.");
        const openai = new OpenAI({
            apiKey,
            baseURL: 'https://integrate.api.nvidia.com/v1'
        });
        const completion = await openai.chat.completions.create({
            model: modelId,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ]
        });
        return completion.choices[0]?.message?.content || "";
    } else if (provider === 'groq') {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error("Groq API key is not configured in environment variables.");
        const openai = new OpenAI({
            apiKey,
            baseURL: 'https://api.groq.com/openai/v1'
        });
        const completion = await openai.chat.completions.create({
            model: modelId,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ]
        });
        return completion.choices[0]?.message?.content || "";
    } else if (provider === 'mistral') {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) throw new Error("Mistral API key is not configured in environment variables.");
        const openai = new OpenAI({
            apiKey,
            baseURL: 'https://api.mistral.ai/v1'
        });
        const completion = await openai.chat.completions.create({
            model: modelId,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ]
        });
        return completion.choices[0]?.message?.content || "";
    } else {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OpenAI API key is not configured in environment variables.");
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
            model: modelId,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ]
        });
        return completion.choices[0]?.message?.content || "";
    }
}

export async function processDmReply(
    email: string,
    senderId: string,
    senderUsername: string,
    messageText: string
): Promise<{ replyText: string | null; error?: string }> {
    const cleanEmail = email.toLowerCase();
    
    try {
        // 1. Fetch agent configuration
        const agentRes = await query('SELECT * FROM instagram_agents WHERE LOWER(user_email) = LOWER($1)', [cleanEmail]);
        const agent = agentRes.rows[0];

        if (!agent || !agent.is_active) {
            // Log incoming message even if agent is inactive (manual mode)
            await query(`
                INSERT INTO instagram_dm_logs (user_email, sender_id, sender_username, message_text, reply_text, tokens_consumed, status)
                VALUES ($1, $2, $3, $4, null, 0, 'success')
            `, [cleanEmail, senderId, senderUsername, messageText]);
            return { replyText: null, error: 'Agent is inactive or manual mode' };
        }

        if (agent.dm_reply_behavior === 'manual') {
            // Log message for manual view
            await query(`
                INSERT INTO instagram_dm_logs (user_email, sender_id, sender_username, message_text, reply_text, tokens_consumed, status)
                VALUES ($1, $2, $3, $4, null, 0, 'success')
            `, [cleanEmail, senderId, senderUsername, messageText]);
            return { replyText: null, error: 'Manual reply behavior enabled' };
        }

        // 2. Validate token balance
        const feature = getFeatureById('instagram-agent');
        const cost = feature?.tokenCost || 5;

        const balanceRes = await query('SELECT balance FROM user_balances WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
        const balance = balanceRes.rows[0]?.balance ?? 0;

        if (balance < cost) {
            const errMsg = 'Insufficient token balance';
            await query(`
                INSERT INTO instagram_dm_logs (user_email, sender_id, sender_username, message_text, reply_text, tokens_consumed, status, error_message)
                VALUES ($1, $2, $3, $4, null, 0, 'failed', $5)
            `, [cleanEmail, senderId, senderUsername, messageText, errMsg]);
            return { replyText: null, error: errMsg };
        }

        // 3. Generate response
        const systemPrompt = agent.system_prompt || 'You are a helpful and friendly AI assistant for Instagram.';
        const modelId = agent.model_id || 'gemini-2.5-flash';

        const replyText = await generateText(systemPrompt, messageText, modelId);
        if (!replyText || !replyText.trim()) {
            throw new Error("AI returned an empty response.");
        }

        // 4. Implement response delay if configured
        if (agent.response_delay && agent.response_delay > 0) {
            await new Promise(resolve => setTimeout(resolve, agent.response_delay * 1000));
        }

        // 5. Deduct token balance
        await db.updateTokenBalance(cleanEmail, cost, 'consume', 'instagram-agent', modelId);

        // 6. Log success
        await query(`
            INSERT INTO instagram_dm_logs (user_email, sender_id, sender_username, message_text, reply_text, tokens_consumed, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'success')
        `, [cleanEmail, senderId, senderUsername, messageText, replyText, cost]);

        return { replyText };

    } catch (error: any) {
        console.error(`[Instagram Agent DM] Error replying to ${senderUsername}:`, error);
        await query(`
            INSERT INTO instagram_dm_logs (user_email, sender_id, sender_username, message_text, reply_text, tokens_consumed, status, error_message)
            VALUES ($1, $2, $3, $4, null, 0, 'failed', $5)
        `, [cleanEmail, senderId, senderUsername, messageText, error.message || 'Auto-reply failed']);
        return { replyText: null, error: error.message || 'Auto-reply failed' };
    }
}

export async function processCommentReply(
    email: string,
    postId: string,
    postCaption: string,
    commentId: string,
    commenterUsername: string,
    commentText: string
): Promise<{ replyText: string | null; error?: string }> {
    const cleanEmail = email.toLowerCase();

    try {
        // 1. Fetch agent configuration
        const agentRes = await query('SELECT * FROM instagram_agents WHERE LOWER(user_email) = LOWER($1)', [cleanEmail]);
        const agent = agentRes.rows[0];

        if (!agent || !agent.is_active) {
            // Log comment even if agent is inactive
            await query(`
                INSERT INTO instagram_comments_logs (user_email, post_id, post_caption, comment_id, commenter_username, comment_text, reply_text, tokens_consumed, status)
                VALUES ($1, $2, $3, $4, $5, $6, null, 0, 'success')
            `, [cleanEmail, postId, postCaption, commentId, commenterUsername, commentText]);
            return { replyText: null, error: 'Agent is inactive or manual mode' };
        }

        if (agent.comment_reply_behavior === 'manual') {
            // Log comment for manual view
            await query(`
                INSERT INTO instagram_comments_logs (user_email, post_id, post_caption, comment_id, commenter_username, comment_text, reply_text, tokens_consumed, status)
                VALUES ($1, $2, $3, $4, $5, $6, null, 0, 'success')
            `, [cleanEmail, postId, postCaption, commentId, commenterUsername, commentText]);
            return { replyText: null, error: 'Manual reply behavior enabled' };
        }

        // 2. Validate token balance
        const feature = getFeatureById('instagram-agent');
        const cost = feature?.tokenCost || 5;

        const balanceRes = await query('SELECT balance FROM user_balances WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
        const balance = balanceRes.rows[0]?.balance ?? 0;

        if (balance < cost) {
            const errMsg = 'Insufficient token balance';
            await query(`
                INSERT INTO instagram_comments_logs (user_email, post_id, post_caption, comment_id, commenter_username, comment_text, reply_text, tokens_consumed, status, error_message)
                VALUES ($1, $2, $3, $4, $5, $6, null, 0, 'failed', $7)
            `, [cleanEmail, postId, postCaption, commentId, commenterUsername, commentText, errMsg]);
            return { replyText: null, error: errMsg };
        }

        // 3. Generate response
        const systemPrompt = agent.system_prompt || 'You are a helpful and friendly AI assistant for Instagram.';
        const modelId = agent.model_id || 'gemini-2.5-flash';
        
        // Formulate a prompt optimized for comments (short, engaging, no line breaks if possible)
        const commentPrompt = `Post Caption: "${postCaption}"\nComment: "${commentText}"\nReply to this comment in 1-2 sentences. Keep it brief, conversational, and optimize it for a social media comment thread.`;

        const replyText = await generateText(systemPrompt, commentPrompt, modelId);
        if (!replyText || !replyText.trim()) {
            throw new Error("AI returned an empty response.");
        }

        // 4. Implement response delay if configured
        if (agent.response_delay && agent.response_delay > 0) {
            await new Promise(resolve => setTimeout(resolve, agent.response_delay * 1000));
        }

        // 5. Deduct token balance
        await db.updateTokenBalance(cleanEmail, cost, 'consume', 'instagram-agent', modelId);

        // 6. Log success
        await query(`
            INSERT INTO instagram_comments_logs (user_email, post_id, post_caption, comment_id, commenter_username, comment_text, reply_text, tokens_consumed, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'success')
        `, [cleanEmail, postId, postCaption, commentId, commenterUsername, commentText, replyText, cost]);

        return { replyText };

    } catch (error: any) {
        console.error(`[Instagram Agent Comment] Error replying to comment by ${commenterUsername}:`, error);
        await query(`
            INSERT INTO instagram_comments_logs (user_email, post_id, post_caption, comment_id, commenter_username, comment_text, reply_text, tokens_consumed, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, null, 0, 'failed', $7)
        `, [cleanEmail, postId, postCaption, commentId, commenterUsername, commentText, error.message || 'Auto-reply failed']);
        return { replyText: null, error: error.message || 'Auto-reply failed' };
    }
}

import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestWaWebVersion,
    type WASocket
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { query } from '@/lib/pg';
import { db } from '@/lib/db';
import { getFeatureById } from '@/lib/features';
import { getModelById } from '@/lib/models';

// --- Session Directory Serialization Helpers ---

function getSessionData(dir: string): Record<string, string> {
    const data: Record<string, string> = {};
    if (!fs.existsSync(dir)) return data;

    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
            const content = fs.readFileSync(filePath, 'base64');
            data[file] = content;
        }
    }
    return data;
}

function restoreSessionData(dir: string, data: Record<string, string>) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    for (const [file, content] of Object.entries(data)) {
        const filePath = path.join(dir, file);
        fs.writeFileSync(filePath, Buffer.from(content, 'base64'));
    }
}

async function syncSessionToDb(email: string, sessionDir: string) {
    try {
        const data = getSessionData(sessionDir);
        await query(
            `INSERT INTO whatsapp_sessions (user_email, creds_data, updated_at) 
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_email) DO UPDATE SET 
                creds_data = EXCLUDED.creds_data, 
                updated_at = NOW()`,
            [email.toLowerCase(), JSON.stringify(data)]
        );
    } catch (e) {
        console.error(`[WhatsApp] Failed to sync session to DB for ${email}:`, e);
    }
}

// --- Text Generation Helper (Gemini / OpenAI) ---

async function generateText(systemPrompt: string, userMessage: string, modelId: string): Promise<string> {
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
            const err = await response.json();
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

// --- Helper to extract text from nested Baileys message structures ---
function extractMessageText(message: any): string {
    if (!message) return '';

    // Unpack ephemeral messages
    if (message.ephemeralMessage?.message) {
        message = message.ephemeralMessage.message;
    }

    // Unpack view once messages
    if (message.viewOnceMessage?.message) {
        message = message.viewOnceMessage.message;
    }
    if (message.viewOnceMessageV2?.message) {
        message = message.viewOnceMessageV2.message;
    }

    // Unpack document with caption messages
    if (message.documentWithCaptionMessage?.message) {
        message = message.documentWithCaptionMessage.message;
    }

    // Extract text from various common message types
    return message.conversation ||
           message.extendedTextMessage?.text ||
           message.imageMessage?.caption ||
           message.videoMessage?.caption ||
           message.documentMessage?.caption ||
           '';
}

// --- WhatsApp Manager Singleton ---

const globalForWhatsApp = globalThis as unknown as {
    whatsAppManagerInstance: WhatsAppManager | undefined;
};

export class WhatsAppManager {
    private sockets: Map<string, WASocket> = new Map();
    private statuses: Map<string, string> = new Map();
    private qrs: Map<string, string> = new Map();
    private sseClients: Map<string, Set<(data: string) => void>> = new Map();
    private isAutoStarted = false;

    private constructor() {}

    public static getInstance(): WhatsAppManager {
        if (!globalForWhatsApp.whatsAppManagerInstance) {
            globalForWhatsApp.whatsAppManagerInstance = new WhatsAppManager();
        } else {
            // Hot reload fix: update the prototype of the existing global instance to the new class definition
            Object.setPrototypeOf(globalForWhatsApp.whatsAppManagerInstance, WhatsAppManager.prototype);
        }
        return globalForWhatsApp.whatsAppManagerInstance;
    }

    public async init() {
        if (this.isAutoStarted) return;
        this.isAutoStarted = true;
        await this.autoStartAgents();
    }

    public addSseClient(email: string, writeFn: (data: string) => void) {
        const cleanEmail = email.toLowerCase();
        if (!this.sseClients.has(cleanEmail)) {
            this.sseClients.set(cleanEmail, new Set());
        }
        this.sseClients.get(cleanEmail)!.add(writeFn);

        // Emit current state immediately
        const status = this.statuses.get(cleanEmail) || 'disconnected';
        const qr = this.qrs.get(cleanEmail) || '';
        writeFn(JSON.stringify({ status, qr }));
    }

    public removeSseClient(email: string, writeFn: (data: string) => void) {
        const cleanEmail = email.toLowerCase();
        const clients = this.sseClients.get(cleanEmail);
        if (clients) {
            clients.delete(writeFn);
            if (clients.size === 0) {
                this.sseClients.delete(cleanEmail);
            }
        }
    }

    private emitToClients(email: string, data: any) {
        const cleanEmail = email.toLowerCase();
        const clients = this.sseClients.get(cleanEmail);
        if (clients) {
            const message = JSON.stringify(data);
            for (const client of clients) {
                try {
                    client(message);
                } catch (e) {
                    console.error(`[WhatsApp] Failed to push to client for ${cleanEmail}:`, e);
                }
            }
        }
    }

    public getStatus(email: string): string {
        return this.statuses.get(email.toLowerCase()) || 'disconnected';
    }

    public getQr(email: string): string {
        return this.qrs.get(email.toLowerCase()) || '';
    }

    private async rehydrateSession(email: string, sessionDir: string): Promise<boolean> {
        try {
            const res = await query('SELECT creds_data FROM whatsapp_sessions WHERE LOWER(user_email) = LOWER($1)', [email]);
            if (res.rows.length > 0 && res.rows[0].creds_data) {
                const data = JSON.parse(res.rows[0].creds_data);
                restoreSessionData(sessionDir, data);
                console.log(`[WhatsApp] Restored session credentials from database for ${email}`);
                return true;
            }
        } catch (e) {
            console.error(`[WhatsApp] Error rehydrating session for ${email}:`, e);
        }
        return false;
    }

    public async connect(email: string) {
        const cleanEmail = email.toLowerCase();
        if (this.sockets.has(cleanEmail)) {
            console.log(`[WhatsApp] Connection already active or pending for ${cleanEmail}`);
            return;
        }

        const sessionDir = path.join(process.cwd(), 'tmp/whatsapp-sessions', cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'));

        // 1. Restore credentials from database if directory is empty or missing
        if (!fs.existsSync(sessionDir) || fs.readdirSync(sessionDir).length === 0) {
            await this.rehydrateSession(cleanEmail, sessionDir);
        }

        this.statuses.set(cleanEmail, 'connecting');
        this.emitToClients(cleanEmail, { status: 'connecting' });

        try {
            const { version, isLatest } = await fetchLatestWaWebVersion().catch((err) => {
                console.warn(`[WhatsApp] Failed to fetch latest WA Web version:`, err);
                return {
                    version: [2, 3000, 1044296537] as [number, number, number],
                    isLatest: false
                };
            });
            console.log(`[WhatsApp] Connecting using version: ${version.join('.')} (latest: ${isLatest})`);

            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
            const sock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: false,
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
            });

            this.sockets.set(cleanEmail, sock);

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    try {
                        const qrDataUrl = await QRCode.toDataURL(qr);
                        this.qrs.set(cleanEmail, qrDataUrl);
                        this.statuses.set(cleanEmail, 'qr');
                        this.emitToClients(cleanEmail, { status: 'qr', qr: qrDataUrl });
                    } catch (e) {
                        console.error(`[WhatsApp] QR generation failed for ${cleanEmail}:`, e);
                    }
                }

                if (connection === 'connecting') {
                    this.statuses.set(cleanEmail, 'connecting');
                    this.emitToClients(cleanEmail, { status: 'connecting' });
                }

                if (connection === 'open') {
                    this.statuses.set(cleanEmail, 'connected');
                    this.qrs.delete(cleanEmail);
                    this.emitToClients(cleanEmail, { status: 'connected' });
                    console.log(`[WhatsApp] Connected successfully for ${cleanEmail}`);

                    const jid = sock.user?.id;
                    const cleanPhone = jid ? jid.split(':')[0] : '';
                    await query(
                        `INSERT INTO whatsapp_agents (user_email, is_active, phone_number) 
                         VALUES ($1, true, $2)
                         ON CONFLICT (user_email) DO UPDATE SET is_active = true, phone_number = EXCLUDED.phone_number`,
                        [cleanEmail, cleanPhone]
                    );

                    // Force credentials save and sync to DB
                    await saveCreds();
                    await syncSessionToDb(cleanEmail, sessionDir);
                }

                if (connection === 'close') {
                    const status = (lastDisconnect?.error as any)?.output?.statusCode;
                    const loggedOut = status === DisconnectReason.loggedOut;
                    console.error(`[WhatsApp] Connection closed for ${cleanEmail}. Logged out: ${loggedOut}, status code: ${status}, error:`, lastDisconnect?.error);

                    this.sockets.delete(cleanEmail);
                    this.qrs.delete(cleanEmail);

                    if (!loggedOut) {
                        // Temporary disconnect: reconnect
                        this.statuses.set(cleanEmail, 'connecting');
                        this.emitToClients(cleanEmail, { status: 'connecting' });
                        setTimeout(() => this.connect(cleanEmail), 5000);
                    } else {
                        // Permanent logout: clean up DB and credentials
                        this.statuses.set(cleanEmail, 'disconnected');
                        this.emitToClients(cleanEmail, { status: 'disconnected' });
                        
                        await query('UPDATE whatsapp_agents SET is_active = false WHERE LOWER(user_email) = LOWER($1)', [cleanEmail]);
                        await query('DELETE FROM whatsapp_sessions WHERE LOWER(user_email) = LOWER($1)', [cleanEmail]);
                        
                        try {
                            fs.rmSync(sessionDir, { recursive: true, force: true });
                        } catch (e) {}
                    }
                }
            });

            sock.ev.on('creds.update', async () => {
                await saveCreds();
                await syncSessionToDb(cleanEmail, sessionDir);
            });

            sock.ev.on('messages.upsert', async (m) => {
                if (m.type !== 'notify') return;
                for (const msg of m.messages) {
                    if (!msg.message) continue;
                    const from = msg.key.remoteJid;
                    if (!from) continue;

                    // Log raw message event for diagnosis
                    console.log(`[WhatsApp] Received message event: fromMe=${msg.key.fromMe}, remoteJid=${from}`);

                    if (msg.key.fromMe) continue;
                    if (from.endsWith('@g.us')) continue; // Exclude groups
                    if (from === 'status@broadcast') continue; // Exclude status broadcasts

                    const text = extractMessageText(msg.message);
                    if (!text.trim()) {
                        console.log(`[WhatsApp] Skipping message: empty text content.`);
                        continue;
                    }

                    await this.handleIncomingMessage(cleanEmail, from, msg.pushName || '', text, sock);
                }
            });

        } catch (error) {
            console.error(`[WhatsApp] Connect process failed for ${cleanEmail}:`, error);
            this.statuses.set(cleanEmail, 'error');
            this.emitToClients(cleanEmail, { status: 'error', message: String(error) });
        }
    }

    public async disconnect(email: string) {
        const cleanEmail = email.toLowerCase();
        const sock = this.sockets.get(cleanEmail);
        if (sock) {
            try {
                await sock.logout();
            } catch (e) {
                console.error(`[WhatsApp] Error during log out:`, e);
            }
            this.sockets.delete(cleanEmail);
        }

        const sessionDir = path.join(process.cwd(), 'tmp/whatsapp-sessions', cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'));
        this.statuses.set(cleanEmail, 'disconnected');
        this.qrs.delete(cleanEmail);
        this.emitToClients(cleanEmail, { status: 'disconnected' });

        await query('UPDATE whatsapp_agents SET is_active = false WHERE LOWER(user_email) = LOWER($1)', [cleanEmail]);
        await query('DELETE FROM whatsapp_sessions WHERE LOWER(user_email) = LOWER($1)', [cleanEmail]);
        
        try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (e) {}
    }

    private async autoStartAgents() {
        try {
            const res = await query('SELECT user_email FROM whatsapp_agents WHERE is_active = true');
            console.log(`[WhatsApp] Auto-starting ${res.rows.length} active agent sessions...`);
            for (const row of res.rows) {
                this.connect(row.user_email);
            }
        } catch (e) {
            console.error(`[WhatsApp] Error auto-starting agents:`, e);
        }
    }

    public async sendManualMessage(email: string, targetNumber: string, text: string): Promise<boolean> {
        const cleanEmail = email.toLowerCase();
        const sock = this.sockets.get(cleanEmail);

        let jid = targetNumber.trim();
        if (!jid.includes('@')) {
            const cleanNumber = jid.replace(/\D/g, '');
            jid = `${cleanNumber}@s.whatsapp.net`;
        }

        // Debug log JID formatting
        try {
            const logPath = path.join(process.cwd(), 'tmp/whatsapp-debug.log');
            const dir = path.dirname(logPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] [Manual Send] targetNumber=${targetNumber} jid=${jid} sockExists=${!!sock}\n`);
        } catch (e) {}

        if (!sock) {
            throw new Error("WhatsApp client not connected.");
        }

        // Send message
        await sock.sendMessage(jid, { text });

        // Log manual message to database using the correct JID
        await query(
            `INSERT INTO whatsapp_logs (user_email, sender_number, sender_name, message_text, reply_text, tokens_consumed, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [cleanEmail, jid, null, '', text, 0, 'manual']
        );

        // Notify SSE clients
        this.emitToClients(cleanEmail, { type: 'message', senderNumber: jid });

        return true;
    }

    private async handleIncomingMessage(email: string, from: string, pushName: string, text: string, sock: WASocket) {
        // Keep the full JID (from) as the sender_number in DB (to support @s.whatsapp.net and @lid suffixes)
        const cleanNumber = from;
        const phoneOnly = from.split('@')[0];

        // Debug log incoming JID
        try {
            const logPath = path.join(process.cwd(), 'tmp/whatsapp-debug.log');
            const dir = path.dirname(logPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] [Incoming] fromJid=${from} cleanNumber=${cleanNumber} text=${text}\n`);
        } catch (e) {}

        console.log(`[WhatsApp] [${email}] Incoming message:
  - From: ${phoneOnly} (${pushName})
  - Message: ${text}`);

        try {
            // 1. Fetch config settings
            const agentRes = await query('SELECT * FROM whatsapp_agents WHERE LOWER(user_email) = LOWER($1)', [email]);
            const agent = agentRes.rows[0];
            if (!agent || !agent.is_active) {
                console.log(`[WhatsApp] [${email}] Skipping message: Agent is not active or not configured.`);
                return;
            }

            // 2. Target numbers whitelist check
            if (agent.reply_target === 'select') {
                const targetNumbers = agent.target_numbers || [];
                const matched = targetNumbers.some((num: string) => {
                    const cleanWhitelist = num.replace(/\D/g, '');
                    const cleanPhone = phoneOnly.replace(/\D/g, '');
                    return cleanPhone.includes(cleanWhitelist) || cleanWhitelist.includes(cleanPhone);
                });
                if (!matched) {
                    console.log(`[WhatsApp] [${email}] Skipping message: Number ${phoneOnly} not in whitelist.`);
                    return;
                }
            }

            // Check if auto-reply is disabled/manual
            if (agent.reply_behavior === 'manual') {
                console.log(`[WhatsApp] [${email}] Skipping message: Auto-reply behavior is disabled/manual.`);
                // Still log the incoming message so the operator sees it in history
                await query(
                    `INSERT INTO whatsapp_logs (user_email, sender_number, sender_name, message_text, reply_text, tokens_consumed, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [email, cleanNumber, pushName, text, '', 0, 'success']
                );
                // Notify SSE clients
                this.emitToClients(email, { type: 'message', senderNumber: cleanNumber });
                return;
            }

            // 3. Deduct tokens check
            const feature = getFeatureById('whatsapp-agent');
            const cost = feature?.tokenCost || 5;
            const balanceRes = await query('SELECT balance FROM user_balances WHERE LOWER(email) = LOWER($1)', [email]);
            const balance = balanceRes.rows[0]?.balance ?? 0;

            if (balance < cost) {
                console.warn(`[WhatsApp] [${email}] Insufficient balance for ${phoneOnly} (${balance} < ${cost})`);
                await query(
                    `INSERT INTO whatsapp_logs (user_email, sender_number, sender_name, message_text, reply_text, tokens_consumed, status, error_message)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [email, cleanNumber, pushName, text, '', 0, 'failed', 'Insufficient token balance']
                );
                // Notify SSE clients
                this.emitToClients(email, { type: 'message', senderNumber: cleanNumber });
                return;
            }

            // 4. Generate response
            const systemPrompt = agent.system_prompt || 'You are a helpful and friendly AI assistant.';
            const modelId = agent.model_id || 'gemini-2.5-flash';

            console.log(`[WhatsApp] [${email}] Generating reply:
  - Model: ${modelId}
  - Prompt: ${systemPrompt}`);

            const replyText = await generateText(systemPrompt, text, modelId);
            if (!replyText || !replyText.trim()) {
                throw new Error("AI returned empty generation response.");
            }

            // Implement response delay if configured
            if (agent.response_delay && agent.response_delay > 0) {
                console.log(`[WhatsApp] [${email}] Delaying response by ${agent.response_delay} seconds...`);
                await new Promise(resolve => setTimeout(resolve, agent.response_delay * 1000));
            }

            console.log(`[WhatsApp] [${email}] Sending reply:
  - To: ${phoneOnly}
  - Reply: ${replyText}`);

            // 5. Send reply JID
            await sock.sendMessage(from, { text: replyText });

            // 6. Charge tokens
            await db.updateTokenBalance(email, cost, 'consume', 'whatsapp-agent', modelId);

            // 7. Log success
            await query(
                `INSERT INTO whatsapp_logs (user_email, sender_number, sender_name, message_text, reply_text, tokens_consumed, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [email, cleanNumber, pushName, text, replyText, cost, 'success']
            );

            console.log(`[WhatsApp] [${email}] Successfully sent auto-reply to ${phoneOnly}`);

            // Notify SSE clients
            this.emitToClients(email, { type: 'message', senderNumber: cleanNumber });

        } catch (error: any) {
            console.error(`[WhatsApp] [${email}] Error replying to ${phoneOnly}:`, error);
            await query(
                `INSERT INTO whatsapp_logs (user_email, sender_number, sender_name, message_text, reply_text, tokens_consumed, status, error_message)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [email, cleanNumber, pushName, text, '', 0, 'failed', error.message || 'Auto-reply failed']
            );
            // Notify SSE clients even on failure
            this.emitToClients(email, { type: 'message', senderNumber: cleanNumber });
        }
    }
}

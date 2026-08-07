// ─── In-Memory & Database-Backed Call Session Manager ───
// Tracks active call conversations for fast access during webhook loops
// In Serverless environments, caches read/write through the PostgreSQL database.

import type { CallSession, VoiceAgentConfig } from './types';
import { DEFAULT_AGENT_CONFIG } from './types';
import { query } from '../pg';

class CallSessionManager {
  private sessions: Map<string, CallSession> = new Map();
  
  // Cleanup interval — remove stale sessions every 5 minutes
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.startCleanup();
  }

  private startCleanup() {
    if (typeof window !== 'undefined' || typeof setInterval === 'undefined') return;
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [sid, session] of this.sessions) {
        if (now - session.lastActivity.getTime() > this.SESSION_TTL_MS) {
          console.log(`[CallSession] Removing stale session: ${sid}`);
          this.sessions.delete(sid);
        }
      }
    }, 5 * 60 * 1000);
  }

  create(callSid: string, agentConfig: VoiceAgentConfig): CallSession {
    const session: CallSession = {
      callSid,
      agentConfig,
      history: [],
      startedAt: new Date(),
      lastActivity: new Date(),
      turnCount: 0,
    };
    this.sessions.set(callSid, session);
    console.log(`[CallSession] Created session in-memory for ${callSid}`);
    return session;
  }

  async get(callSid: string): Promise<CallSession | undefined> {
    // 1. Check in-memory cache first
    const cached = this.sessions.get(callSid);
    if (cached) {
      return cached;
    }

    // 2. Fallback to database for Serverless/Multi-instance resilience
    try {
      console.log(`[CallSession] Cache miss for ${callSid}. Reconstructing session from database...`);
      
      const callRes = await query(
        'SELECT * FROM voice_calls WHERE call_sid = $1',
        [callSid]
      );
      if (callRes.rows.length === 0) {
        console.warn(`[CallSession] Call ${callSid} not found in database.`);
        return undefined;
      }
      const callRow = callRes.rows[0];

      let agentConfig: VoiceAgentConfig;
      const configId = callRow.agent_config_id;
      
      if (configId) {
        const configRes = await query(
          'SELECT * FROM voice_agent_config WHERE id = $1',
          [configId]
        );
        if (configRes.rows.length > 0) {
          const row = configRes.rows[0];
          agentConfig = {
            id: row.id,
            userEmail: row.user_email,
            agentName: row.agent_name,
            personality: row.personality,
            systemPrompt: row.system_prompt,
            greetingMessage: row.greeting_message,
            language: row.language,
            voiceId: row.voice_id,
            callObjective: row.call_objective,
            maxCallDuration: row.max_call_duration,
            silenceTimeout: row.silence_timeout,
            endCallPhrases: row.end_call_phrases || DEFAULT_AGENT_CONFIG.endCallPhrases,
            isActive: row.is_active,
          };
        } else {
          agentConfig = { ...DEFAULT_AGENT_CONFIG, userEmail: callRow.user_email || '' } as VoiceAgentConfig;
        }
      } else {
        // Fallback to active agent config
        const activeConfigRes = await query(
          'SELECT * FROM voice_agent_config WHERE is_active = true ORDER BY updated_at DESC LIMIT 1'
        );
        if (activeConfigRes.rows.length > 0) {
          const row = activeConfigRes.rows[0];
          agentConfig = {
            id: row.id,
            userEmail: row.user_email,
            agentName: row.agent_name,
            personality: row.personality,
            systemPrompt: row.system_prompt,
            greetingMessage: row.greeting_message,
            language: row.language,
            voiceId: row.voice_id,
            callObjective: row.call_objective,
            maxCallDuration: row.max_call_duration,
            silenceTimeout: row.silence_timeout,
            endCallPhrases: row.end_call_phrases || DEFAULT_AGENT_CONFIG.endCallPhrases,
            isActive: row.is_active,
          };
        } else {
          agentConfig = { ...DEFAULT_AGENT_CONFIG, userEmail: callRow.user_email || '' } as VoiceAgentConfig;
        }
      }

      // Fetch transcript history
      const transcriptsRes = await query(
        'SELECT role, content, timestamp FROM voice_transcripts WHERE call_id = $1 ORDER BY timestamp ASC',
        [callRow.id]
      );
      
      const history = transcriptsRes.rows.map(row => ({
        role: (row.role === 'caller' ? 'user' : 'model') as 'user' | 'model',
        content: row.content,
      }));

      const session: CallSession = {
        callSid,
        agentConfig,
        history,
        startedAt: callRow.started_at || callRow.created_at || new Date(),
        lastActivity: transcriptsRes.rows[transcriptsRes.rows.length - 1]?.timestamp || new Date(),
        turnCount: history.length,
      };

      // Cache it for fast subsequent access
      this.sessions.set(callSid, session);
      console.log(`[CallSession] Reconstructed session for ${callSid} with ${history.length} turns.`);
      return session;
    } catch (error) {
      console.error('[CallSessionManager] Failed to get session from DB:', error);
      return undefined;
    }
  }

  addTurn(callSid: string, role: 'user' | 'model', content: string): void {
    const session = this.sessions.get(callSid);
    if (!session) return;

    // Check if turn already exists in history to prevent duplicates when loaded from DB
    const alreadyExists = session.history.some(
      turn => turn.role === role && turn.content === content
    );
    if (!alreadyExists) {
      session.history.push({ role, content });
      session.lastActivity = new Date();
      session.turnCount++;

      // Keep history manageable — last 20 turns
      if (session.history.length > 20) {
        session.history = session.history.slice(-20);
      }
    }
  }

  remove(callSid: string): void {
    this.sessions.delete(callSid);
    console.log(`[CallSession] Removed session for ${callSid}`);
  }

  getActiveSessions(): CallSession[] {
    return Array.from(this.sessions.values());
  }

  getActiveCount(): number {
    return this.sessions.size;
  }

  isCallActive(callSid: string): boolean {
    return this.sessions.has(callSid);
  }

  shouldEndCall(callSidOrSession: string | CallSession, userInput: string): boolean {
    const session = typeof callSidOrSession === 'string' 
      ? this.sessions.get(callSidOrSession) 
      : callSidOrSession;
    if (!session) return true;

    // Check max duration
    const elapsed = (Date.now() - session.startedAt.getTime()) / 1000;
    if (elapsed > session.agentConfig.maxCallDuration) return true;

    // Check end-call phrases
    const normalized = userInput.toLowerCase().trim();
    return session.agentConfig.endCallPhrases.some(
      phrase => normalized.includes(phrase.toLowerCase())
    );
  }
}

// Singleton
export const callSessionManager = new CallSessionManager();

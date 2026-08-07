// ─── Agent Config API ───
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/pg';
import { DEFAULT_AGENT_CONFIG } from '@/lib/voice-agent/types';
import { getTwilioStatus } from '@/lib/voice-agent/twilio-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session: any = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await query(
      'SELECT * FROM voice_agent_config WHERE user_email = $1 ORDER BY updated_at DESC LIMIT 1',
      [session.email]
    );

    const twilioStatus = getTwilioStatus();

    if (result.rows.length === 0) {
      return NextResponse.json({
        config: { ...DEFAULT_AGENT_CONFIG, userEmail: session.email },
        twilioStatus,
        isDefault: true,
      });
    }

    const row = result.rows[0];
    return NextResponse.json({
      config: {
        id: row.id, userEmail: row.user_email, agentName: row.agent_name,
        personality: row.personality, systemPrompt: row.system_prompt,
        greetingMessage: row.greeting_message, language: row.language,
        voiceId: row.voice_id, callObjective: row.call_objective,
        maxCallDuration: row.max_call_duration, silenceTimeout: row.silence_timeout,
        endCallPhrases: row.end_call_phrases || DEFAULT_AGENT_CONFIG.endCallPhrases,
        isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at,
      },
      twilioStatus,
      isDefault: false,
    });
  } catch (error: any) {
    console.error('[AgentConfig] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session: any = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      agentName, personality, systemPrompt, greetingMessage,
      language, voiceId, callObjective, maxCallDuration,
      silenceTimeout, endCallPhrases, isActive,
    } = body;

    const result = await query(
      `INSERT INTO voice_agent_config (
        user_email, agent_name, personality, system_prompt, greeting_message,
        language, voice_id, call_objective, max_call_duration, silence_timeout,
        end_call_phrases, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (user_email) DO UPDATE SET
        agent_name = EXCLUDED.agent_name, personality = EXCLUDED.personality,
        system_prompt = EXCLUDED.system_prompt, greeting_message = EXCLUDED.greeting_message,
        language = EXCLUDED.language, voice_id = EXCLUDED.voice_id,
        call_objective = EXCLUDED.call_objective, max_call_duration = EXCLUDED.max_call_duration,
        silence_timeout = EXCLUDED.silence_timeout, end_call_phrases = EXCLUDED.end_call_phrases,
        is_active = EXCLUDED.is_active, updated_at = NOW()
      RETURNING *`,
      [
        session.email, agentName || DEFAULT_AGENT_CONFIG.agentName,
        personality || DEFAULT_AGENT_CONFIG.personality,
        systemPrompt || DEFAULT_AGENT_CONFIG.systemPrompt,
        greetingMessage || DEFAULT_AGENT_CONFIG.greetingMessage,
        language || DEFAULT_AGENT_CONFIG.language,
        voiceId || DEFAULT_AGENT_CONFIG.voiceId,
        callObjective || DEFAULT_AGENT_CONFIG.callObjective,
        maxCallDuration || DEFAULT_AGENT_CONFIG.maxCallDuration,
        silenceTimeout || DEFAULT_AGENT_CONFIG.silenceTimeout,
        endCallPhrases || DEFAULT_AGENT_CONFIG.endCallPhrases,
        isActive ?? true,
      ]
    );

    return NextResponse.json({ success: true, config: result.rows[0] });
  } catch (error: any) {
    console.error('[AgentConfig] POST Error:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}

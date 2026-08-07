// ─── Outbound Calls API ───
// Initiate AI-powered outbound phone calls

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callSessionManager } from '@/lib/voice-agent/call-session';
import { initiateOutboundCall, getBaseUrl, isTwilioConfigured, appendVercelBypassParams } from '@/lib/voice-agent/twilio-service';
import { DEFAULT_AGENT_CONFIG } from '@/lib/voice-agent/types';
import type { VoiceAgentConfig } from '@/lib/voice-agent/types';
import { query } from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session: any = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isTwilioConfigured()) {
      return NextResponse.json({ error: 'Twilio is not configured. Please add Twilio credentials to your environment variables.' }, { status: 400 });
    }

    const body = await req.json();
    const { phoneNumber, prompt, persona, greetingMessage, agentConfigId } = body;

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Validate phone number format (E.164)
    const cleanNumber = phoneNumber.replace(/[^+\d]/g, '');
    if (!cleanNumber.match(/^\+\d{10,15}$/)) {
      return NextResponse.json({ error: 'Invalid phone number. Use E.164 format (e.g., +1234567890)' }, { status: 400 });
    }

    // Build agent config for this outbound call
    let agentConfig: VoiceAgentConfig;

    if (agentConfigId) {
      // Load specific config from DB
      try {
        const configResult = await query(
          'SELECT * FROM voice_agent_config WHERE id = $1',
          [agentConfigId]
        );
        if (configResult.rows.length > 0) {
          const row = configResult.rows[0];
          agentConfig = {
            id: row.id,
            userEmail: row.user_email,
            agentName: row.agent_name,
            personality: row.personality,
            systemPrompt: row.system_prompt,
            greetingMessage: greetingMessage || row.greeting_message,
            language: row.language,
            voiceId: row.voice_id,
            callObjective: row.call_objective,
            maxCallDuration: row.max_call_duration,
            silenceTimeout: row.silence_timeout,
            endCallPhrases: row.end_call_phrases || DEFAULT_AGENT_CONFIG.endCallPhrases,
            isActive: row.is_active,
          };
        } else {
          agentConfig = { ...DEFAULT_AGENT_CONFIG, userEmail: session.email };
        }
      } catch {
        agentConfig = { ...DEFAULT_AGENT_CONFIG, userEmail: session.email };
      }
    } else {
      agentConfig = {
        ...DEFAULT_AGENT_CONFIG,
        userEmail: session.email,
      };
    }

    // Override with request-specific settings
    if (prompt) {
      agentConfig.systemPrompt = prompt;
    }
    if (persona) {
      agentConfig.personality = persona;
      agentConfig.agentName = persona.split(',')[0]?.trim() || agentConfig.agentName;
    }
    if (greetingMessage) {
      agentConfig.greetingMessage = greetingMessage;
    }

    // Initiate call via Twilio
    const baseUrl = await getBaseUrl();
    const statusCallbackUrl = appendVercelBypassParams(`${baseUrl}/api/twilio/status`);
    const voiceWebhookUrl = appendVercelBypassParams(`${baseUrl}/api/twilio/voice`);

    const result = await initiateOutboundCall(
      cleanNumber,
      statusCallbackUrl,
      voiceWebhookUrl
    );

    // Pre-create session for this outbound call
    callSessionManager.create(result.callSid, agentConfig);

    // Map Twilio status to allowed database check constraint values
    const statusMap: Record<string, string> = {
      'queued': 'ringing',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'no-answer': 'no-answer',
      'canceled': 'failed',
      'failed': 'failed',
    };
    const initialStatus = statusMap[result.status] || 'ringing';

    // Log to database
    try {
      await query(
        `INSERT INTO voice_calls (call_sid, user_email, direction, from_number, to_number, status, agent_config_id, started_at)
         VALUES ($1, $2, 'outbound', $3, $4, $5, $6, NOW())`,
        [result.callSid, session.email, process.env.TWILIO_PHONE_NUMBER || '', cleanNumber, initialStatus, agentConfig.id || null]
      );
    } catch (err) {
      console.warn('[OutboundCall] Could not log call:', err);
    }

    return NextResponse.json({
      success: true,
      callSid: result.callSid,
      status: result.status,
      phoneNumber: cleanNumber,
    });
  } catch (error: any) {
    console.error('[OutboundCall] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate call' },
      { status: 500 }
    );
  }
}

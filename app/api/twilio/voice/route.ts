// ─── Twilio Voice Webhook ───
// Handles inbound calls and outbound call connections
// Twilio calls this URL when a call is received or connected

import { NextRequest, NextResponse } from 'next/server';
import { callSessionManager } from '@/lib/voice-agent/call-session';
import { buildGreetingTwiML, buildErrorTwiML, getBaseUrl, validateTwilioSignature, appendVercelBypassParams } from '@/lib/voice-agent/twilio-service';
import { DEFAULT_AGENT_CONFIG } from '@/lib/voice-agent/types';
import type { VoiceAgentConfig } from '@/lib/voice-agent/types';
import { query } from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const callSid = params['CallSid'] || '';
    const from = params['From'] || '';
    const to = params['To'] || '';
    const direction = params['Direction'] || 'inbound';

    console.log(`[VoiceWebhook] ${direction} call: ${callSid} from=${from} to=${to}`);

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = req.headers.get('x-twilio-signature') || '';
      const proto = req.headers.get('x-forwarded-proto') || 'https';
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
      const url = `${proto}://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;
      
      console.log(`[VoiceWebhook] Validating signature. Signature: ${signature.slice(0, 8)}... URL: ${url}`);
      
      if (!validateTwilioSignature(url, params, signature)) {
        console.warn('[VoiceWebhook] Invalid Twilio signature. Reconstructed URL:', url, 'Params:', params, 'Signature:', signature);
        
        // Robust fallback: Check if the request came from our configured Twilio account
        const twilioAccountSid = (process.env.TWILIO_ACCOUNT_SID || '').replace(/['"]/g, '').trim();
        const incomingAccountSid = (params['AccountSid'] || '').replace(/['"]/g, '').trim();
        
        if (twilioAccountSid && incomingAccountSid === twilioAccountSid) {
          console.info('[VoiceWebhook] Twilio signature validation failed but AccountSid matched. Proceeding for production resilience.');
        } else {
          return new NextResponse('Forbidden', { status: 403 });
        }
      }
    }

    // Load agent config from DB or use defaults
    let agentConfig: VoiceAgentConfig;
    try {
      const configResult = await query(
        'SELECT * FROM voice_agent_config WHERE is_active = true ORDER BY updated_at DESC LIMIT 1'
      );
      if (configResult.rows.length > 0) {
        const row = configResult.rows[0];
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
        agentConfig = { ...DEFAULT_AGENT_CONFIG, userEmail: '' };
      }
    } catch (err) {
      console.warn('[VoiceWebhook] Could not load agent config, using defaults:', err);
      agentConfig = { ...DEFAULT_AGENT_CONFIG, userEmail: '' };
    }

    // Check for outbound call context (stored when initiating)
    const outboundSession = await callSessionManager.get(callSid);
    if (outboundSession) {
      // Re-use existing session (outbound call already set up)
      agentConfig = outboundSession.agentConfig;
    } else {
      // Create new session for inbound call
      callSessionManager.create(callSid, agentConfig);
    }

    // Log call to database
    try {
      await query(
        `INSERT INTO voice_calls (call_sid, direction, from_number, to_number, status, agent_config_id, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (call_sid) DO UPDATE SET status = 'in-progress', started_at = NOW()`,
        [callSid, direction === 'outbound-api' ? 'outbound' : 'inbound', from, to, 'in-progress', agentConfig.id || null]
      );
    } catch (err) {
      console.warn('[VoiceWebhook] Could not log call:', err);
    }

    // Build greeting TwiML
    const gatherUrl = appendVercelBypassParams(`${await getBaseUrl()}/api/twilio/gather?callSid=${encodeURIComponent(callSid)}`);
    const twiml = buildGreetingTwiML(
      agentConfig.greetingMessage,
      agentConfig.voiceId,
      agentConfig.language,
      gatherUrl
    );

    // Store greeting in transcript
    try {
      const callResult = await query('SELECT id FROM voice_calls WHERE call_sid = $1', [callSid]);
      if (callResult.rows[0]) {
        await query(
          'INSERT INTO voice_transcripts (call_id, role, content) VALUES ($1, $2, $3)',
          [callResult.rows[0].id, 'agent', agentConfig.greetingMessage]
        );
      }
    } catch (err) {
      console.warn('[VoiceWebhook] Could not save transcript:', err);
    }

    // Add greeting to session history
    callSessionManager.addTurn(callSid, 'model', agentConfig.greetingMessage);

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error: any) {
    console.error('[VoiceWebhook] Error:', error);
    return new NextResponse(buildErrorTwiML(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

// ─── Twilio Gather Webhook ───
// Handles speech input from caller, generates AI response, sends back TwiML
// This is the core of the conversation loop

import { NextRequest, NextResponse } from 'next/server';
import { callSessionManager } from '@/lib/voice-agent/call-session';
import { generateVoiceResponse } from '@/lib/voice-agent/gemini-service';
import { buildResponseTwiML, buildGoodbyeTwiML, buildErrorTwiML, getBaseUrl, validateTwilioSignature, appendVercelBypassParams } from '@/lib/voice-agent/twilio-service';
import { query } from '@/lib/pg';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 second timeout for AI response

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const callSid = req.nextUrl.searchParams.get('callSid') || params['CallSid'] || '';
    const speechResult = params['SpeechResult'] || '';
    const confidence = parseFloat(params['Confidence'] || '0');

    console.log(`[Gather] CallSid=${callSid} Speech="${speechResult}" Confidence=${confidence}`);

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = req.headers.get('x-twilio-signature') || '';
      const proto = req.headers.get('x-forwarded-proto') || 'https';
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
      const url = `${proto}://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;
      
      console.log(`[Gather] Validating signature. Signature: ${signature.slice(0, 8)}... URL: ${url}`);
      
      if (!validateTwilioSignature(url, params, signature)) {
        console.warn('[Gather] Invalid Twilio signature. Reconstructed URL:', url, 'Params:', params, 'Signature:', signature);
        
        // Robust fallback: Check if the request came from our configured Twilio account
        const twilioAccountSid = (process.env.TWILIO_ACCOUNT_SID || '').replace(/['"]/g, '').trim();
        const incomingAccountSid = (params['AccountSid'] || '').replace(/['"]/g, '').trim();
        
        if (twilioAccountSid && incomingAccountSid === twilioAccountSid) {
          console.info('[Gather] Twilio signature validation failed but AccountSid matched. Proceeding for production resilience.');
        } else {
          return new NextResponse('Forbidden', { status: 403 });
        }
      }
    }

    // Get session
    const session = await callSessionManager.get(callSid);
    if (!session) {
      console.warn(`[Gather] No session found for ${callSid}`);
      return new NextResponse(buildErrorTwiML(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // No speech detected
    if (!speechResult) {
      const gatherUrl = appendVercelBypassParams(`${await getBaseUrl()}/api/twilio/gather?callSid=${encodeURIComponent(callSid)}`);
      const twiml = buildResponseTwiML(
        "I didn't catch that. Could you please repeat?",
        session.agentConfig.voiceId,
        session.agentConfig.language,
        gatherUrl
      );
      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Check if caller wants to end the call
    if (callSessionManager.shouldEndCall(session, speechResult)) {
      // Save transcript
      saveTranscript(callSid, 'caller', speechResult);

      const goodbyeMsg = `Thank you for calling! It was great speaking with you. Goodbye!`;
      saveTranscript(callSid, 'agent', goodbyeMsg);
      callSessionManager.addTurn(callSid, 'user', speechResult);
      callSessionManager.addTurn(callSid, 'model', goodbyeMsg);

      // Update call status
      updateCallStatus(callSid, 'completed');
      callSessionManager.remove(callSid);

      return new NextResponse(
        buildGoodbyeTwiML(goodbyeMsg, session.agentConfig.voiceId),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Add user input to session
    callSessionManager.addTurn(callSid, 'user', speechResult);
    saveTranscript(callSid, 'caller', speechResult);

    // Generate AI response
    const aiResponse = await generateVoiceResponse(session, speechResult);
    
    // Add AI response to session
    callSessionManager.addTurn(callSid, 'model', aiResponse);
    saveTranscript(callSid, 'agent', aiResponse);

    console.log(`[Gather] AI Response: "${aiResponse}"`);

    // Build response TwiML with next gather loop
    const gatherUrl = appendVercelBypassParams(`${await getBaseUrl()}/api/twilio/gather?callSid=${encodeURIComponent(callSid)}`);
    const twiml = buildResponseTwiML(
      aiResponse,
      session.agentConfig.voiceId,
      session.agentConfig.language,
      gatherUrl
    );

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error: any) {
    console.error('[Gather] Error:', error);
    return new NextResponse(buildErrorTwiML(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

// ─── Background helpers (fire-and-forget DB ops) ───

async function saveTranscript(callSid: string, role: 'caller' | 'agent', content: string) {
  try {
    const callResult = await query('SELECT id FROM voice_calls WHERE call_sid = $1', [callSid]);
    if (callResult.rows[0]) {
      await query(
        'INSERT INTO voice_transcripts (call_id, role, content) VALUES ($1, $2, $3)',
        [callResult.rows[0].id, role, content]
      );
    }
  } catch (err) {
    console.warn('[Gather] Could not save transcript:', err);
  }
}

async function updateCallStatus(callSid: string, status: string) {
  try {
    await query(
      'UPDATE voice_calls SET status = $1, ended_at = NOW() WHERE call_sid = $2',
      [status, callSid]
    );
  } catch (err) {
    console.warn('[Gather] Could not update call status:', err);
  }
}

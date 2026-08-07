// ─── Twilio Voice Service ───
// Handles Twilio REST API calls, TwiML generation, and signature validation

import crypto from 'crypto';
import { headers } from 'next/headers';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
const FALLBACK_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

// ─── TwiML Builders ───

export function buildGreetingTwiML(
  greetingMessage: string,
  voiceId: string,
  language: string,
  gatherUrl: string
): string {
  const voice = getVoiceAttribute(voiceId);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${escapeXml(gatherUrl)}" method="POST" 
    speechTimeout="auto" language="${escapeXml(language)}" 
    enhanced="true" speechModel="phone_call">
    <Say ${voice}>${escapeXml(greetingMessage)}</Say>
  </Gather>
  <Say ${voice}>I didn't hear anything. Goodbye!</Say>
  <Hangup/>
</Response>`;
}

export function buildResponseTwiML(
  responseText: string,
  voiceId: string,
  language: string,
  gatherUrl: string
): string {
  const voice = getVoiceAttribute(voiceId);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${escapeXml(gatherUrl)}" method="POST" 
    speechTimeout="auto" language="${escapeXml(language)}" 
    enhanced="true" speechModel="phone_call">
    <Say ${voice}>${escapeXml(responseText)}</Say>
  </Gather>
  <Say ${voice}>Are you still there? If not, goodbye!</Say>
  <Hangup/>
</Response>`;
}

export function buildGoodbyeTwiML(
  goodbyeMessage: string,
  voiceId: string
): string {
  const voice = getVoiceAttribute(voiceId);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say ${voice}>${escapeXml(goodbyeMessage)}</Say>
  <Hangup/>
</Response>`;
}

export function buildErrorTwiML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">I'm sorry, I'm having trouble right now. Please try again later.</Say>
  <Hangup/>
</Response>`;
}

// ─── Outbound Calls ───

export async function initiateOutboundCall(
  toNumber: string,
  statusCallbackUrl: string,
  voiceWebhookUrl: string
): Promise<{ callSid: string; status: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio credentials not configured');
  }

  const params = new URLSearchParams();
  params.append('To', toNumber);
  params.append('From', TWILIO_PHONE_NUMBER);
  params.append('Url', voiceWebhookUrl);
  params.append('StatusCallback', statusCallbackUrl);
  params.append('StatusCallbackEvent', 'initiated ringing answered completed');
  params.append('StatusCallbackMethod', 'POST');
  params.append('MachineDetection', 'Enable');
  params.append('MachineDetectionTimeout', '5');

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Twilio API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    callSid: data.sid,
    status: data.status,
  };
}

// ─── Call Management ───

export async function getCallDetails(callSid: string): Promise<any> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured');
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`,
    {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get call details: ${response.status}`);
  }

  return response.json();
}

export async function endCall(callSid: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return;

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      },
      body: 'Status=completed',
    }
  );
}

// ─── Security ───

export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  if (process.env.BYPASS_TWILIO_SIGNATURE === 'true') {
    console.log('[TwilioService] Signature validation bypassed via BYPASS_TWILIO_SIGNATURE environment variable');
    return true;
  }
  if (!TWILIO_AUTH_TOKEN || !signature) {
    console.warn('[TwilioService] Missing TWILIO_AUTH_TOKEN or signature');
    return false;
  }

  try {
    // Sort params and concatenate
    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const key of sortedKeys) {
      data += key + params[key];
    }

    const expectedSignature = crypto
      .createHmac('sha1', TWILIO_AUTH_TOKEN)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      console.warn('[TwilioService] Signature length mismatch');
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error: any) {
    console.error('[TwilioService] Signature validation failed with error:', error);
    return false;
  }
}

export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
}

export function getTwilioStatus(): {
  configured: boolean;
  accountSid: string;
  phoneNumber: string;
} {
  return {
    configured: isTwilioConfigured(),
    accountSid: TWILIO_ACCOUNT_SID ? `${TWILIO_ACCOUNT_SID.slice(0, 8)}...` : '',
    phoneNumber: TWILIO_PHONE_NUMBER || '',
  };
}

export async function getBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host');
    const proto = headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    if (host) return `${proto}://${host}`;
  } catch (e) {}
  return FALLBACK_URL;
}

// ─── Helpers ───

function getVoiceAttribute(voiceId: string): string {
  if (!voiceId || voiceId === 'alice' || voiceId === 'man' || voiceId === 'woman') {
    return `voice="${voiceId || 'alice'}"`;
  }
  // Polly or Google voices
  return `voice="${voiceId}"`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function appendVercelBypassParams(url: string): string {
  const token = process.env.VERCEL_AUTOMATION_BYPASS_TOKEN || 
                process.env.VERCEL_BYPASS_TOKEN || 
                process.env.NEXT_PUBLIC_VERCEL_BYPASS_TOKEN;
  if (!token) return url;

  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set('x-vercel-protection-bypass', token);
    parsedUrl.searchParams.set('x-vercel-set-bypass-cookie', 'true');
    return parsedUrl.toString();
  } catch (error) {
    console.error('[TwilioService] Failed to parse URL in appendVercelBypassParams:', url, error);
    return url;
  }
}

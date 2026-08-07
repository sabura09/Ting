// ─── Twilio Call Status Callback ───
// Receives status updates: initiated, ringing, answered, completed

import { NextRequest, NextResponse } from 'next/server';
import { callSessionManager } from '@/lib/voice-agent/call-session';
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
    const callStatus = params['CallStatus'] || '';
    const callDuration = parseInt(params['CallDuration'] || '0');
    const answeredBy = params['AnsweredBy'] || '';

    console.log(`[StatusCallback] CallSid=${callSid} Status=${callStatus} Duration=${callDuration} AnsweredBy=${answeredBy}`);

    // Map Twilio status to our status
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

    const mappedStatus = statusMap[callStatus] || callStatus;

    // Update call in database
    try {
      if (callStatus === 'completed' || callStatus === 'busy' || callStatus === 'no-answer' || callStatus === 'failed' || callStatus === 'canceled') {
        await query(
          'UPDATE voice_calls SET status = $1, duration = $2, ended_at = NOW() WHERE call_sid = $3',
          [mappedStatus, callDuration, callSid]
        );

        // Clean up session
        callSessionManager.remove(callSid);
      } else {
        await query(
          'UPDATE voice_calls SET status = $1 WHERE call_sid = $2',
          [mappedStatus, callSid]
        );
      }
    } catch (err) {
      console.warn('[StatusCallback] DB update failed:', err);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('[StatusCallback] Error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}

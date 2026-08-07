// ─── Call Logs API ───
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callSessionManager } from '@/lib/voice-agent/call-session';
import { query } from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const direction = searchParams.get('direction');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const callId = searchParams.get('callId');

    if (callId) {
      const transcriptResult = await query(
        `SELECT vt.* FROM voice_transcripts vt WHERE vt.call_id = $1 ORDER BY vt.timestamp ASC`,
        [callId]
      );
      const callResult = await query('SELECT * FROM voice_calls WHERE id = $1', [callId]);

      return NextResponse.json({
        call: callResult.rows[0] || null,
        transcripts: transcriptResult.rows.map(t => ({
          id: t.id, callId: t.call_id, role: t.role, content: t.content, timestamp: t.timestamp,
        })),
      });
    }

    let sql = `SELECT * FROM voice_calls WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (session.role !== 'admin') {
      sql += ` AND (user_email = $${idx} OR user_email IS NULL)`;
      params.push(session.email);
      idx++;
    }
    if (direction) {
      sql += ` AND direction = $${idx}`;
      params.push(direction);
      idx++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    const activeSessions = callSessionManager.getActiveSessions();

    return NextResponse.json({
      calls: result.rows.map(c => ({
        id: c.id, callSid: c.call_sid, userEmail: c.user_email,
        direction: c.direction, fromNumber: c.from_number, toNumber: c.to_number,
        status: c.status, duration: c.duration, startedAt: c.started_at,
        endedAt: c.ended_at, createdAt: c.created_at,
      })),
      activeCalls: activeSessions.length,
      limit, offset,
    });
  } catch (error: any) {
    console.error('[CallLogs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { processCommentReply } from '@/lib/instagram/manager';

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = session.email.toLowerCase();
        const body = await req.json();
        const { postId, postCaption, commenterUsername, commentText } = body;

        if (!postId) {
            return NextResponse.json({ error: 'Post ID is required.' }, { status: 400 });
        }
        if (!commenterUsername) {
            return NextResponse.json({ error: 'Commenter username is required.' }, { status: 400 });
        }
        if (!commentText) {
            return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
        }

        const commentId = `mock_comment_${Date.now()}`;
        const result = await processCommentReply(
            email, 
            postId, 
            postCaption || 'Mock Instagram Post', 
            commentId, 
            commenterUsername, 
            commentText
        );

        return NextResponse.json({
            success: true,
            replyText: result.replyText,
            error: result.error
        });

    } catch (error: any) {
        console.error('Error in Instagram Comment Simulator:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

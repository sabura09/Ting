import { getSession } from '@/lib/auth';
import { WhatsAppManager } from '@/lib/whatsapp/manager';

export async function GET(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return new Response('Unauthorized', { status: 401 });
        }

        const email = session.email.toLowerCase();
        const manager = WhatsAppManager.getInstance();
        await manager.init();

        const stream = new ReadableStream({
            start(controller) {
                const sendEvent = (data: string) => {
                    try {
                        controller.enqueue(`data: ${data}\n\n`);
                    } catch (e) {
                        // Handle stream close issues
                    }
                };

                // Register client in the manager
                manager.addSseClient(email, sendEvent);

                // Clean up on disconnect
                req.signal.addEventListener('abort', () => {
                    manager.removeSseClient(email, sendEvent);
                    try {
                        controller.close();
                    } catch (e) {}
                });
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        });

    } catch (error: any) {
        console.error('Error starting WhatsApp SSE stream:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
export const dynamic = 'force-dynamic';

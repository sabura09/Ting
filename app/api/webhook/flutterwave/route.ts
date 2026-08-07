import { NextResponse } from 'next/server';
import { db, PaymentRecord, SubscriptionRecord } from '@/lib/db';
import { FlutterwaveGateway } from '@/lib/gateways/flutterwave';

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        console.log("Flutterwave Webhook Payload:", JSON.stringify(payload, null, 2));

        const data = payload.data;
        if (!data || !data.id) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const settings = await db.getSettings();
        const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
        const signature = req.headers.get('verif-hash');
        
        if (secretHash && signature !== secretHash) {
            console.error("Flutterwave signature verification failed");
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const eventId = data.id.toString();
        const eventType = payload.event || 'transfer.completed'; // fallback

        const hasBeenProcessed = await db.hasWebhookEvent(eventId);
        if (hasBeenProcessed) {
            console.log(`[Flutterwave] Webhook event ${eventId} already processed.`);
            return NextResponse.json({ message: 'Already processed' });
        }

        const gateway = new FlutterwaveGateway(settings);
        const verification = await gateway.verifyPayment(eventId);

        await db.executeTx(async (txClient) => {
            if (verification.paid) {
                const txRef = verification.sessionId;
                const userId = verification.userId;
                const userEmail = verification.userEmail;
                const planId = verification.planId;

                if (userEmail && planId) {
                    const plans = await db.getPlans();
                    const plan = plans.find(p => p.id === planId);

                    if (plan) {
                        const payment: PaymentRecord = {
                            id: eventId,
                            userId: userId,
                            userEmail: userEmail,
                            planId: planId,
                            amount: plan.price,
                            status: 'succeeded',
                            paymentGateway: 'flutterwave',
                            createdAt: new Date().toISOString()
                        };
                        await db.savePayment(payment, txClient);

                        await db.updateTokenBalance(
                            userEmail,
                            plan.tokens,
                            'add',
                            `Purchase: ${plan.name} (Flutterwave)`,
                            undefined,
                            txClient
                        );

                        const subscription: SubscriptionRecord = {
                            id: eventId,
                            userEmail: userEmail,
                            planId: planId,
                            status: 'active',
                            gateway: 'flutterwave',
                            createdAt: new Date().toISOString()
                        };
                        await db.saveSubscription(subscription, txClient);

                        console.log(`[Flutterwave] Successfully credited ${plan.tokens} tokens to ${userEmail}`);
                    }
                }
            } else if (data.status === 'failed') {
                console.log(`[Flutterwave] Payment failed for ID: ${eventId}`);
            }

            await db.saveWebhookEvent(eventId, 'flutterwave', eventType, txClient);
        });

        return NextResponse.json({ received: true });

    } catch (err: any) {
        console.error("Flutterwave Webhook processing error:", err);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

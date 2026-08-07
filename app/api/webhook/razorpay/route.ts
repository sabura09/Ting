import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, PaymentRecord, SubscriptionRecord } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const body = JSON.parse(rawBody);
        const settings = await db.getSettings();

        const receivedSignature = req.headers.get('x-razorpay-signature');
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (webhookSecret && receivedSignature) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            if (expectedSignature !== receivedSignature) {
                console.error('[Razorpay Webhook] Signature verification failed');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
            }
        }

        const event = body.event;
        console.log(`[Razorpay Webhook] Received event: ${event}`);

        let paymentId = '';
        let subscriptionId = '';
        let userId = '';
        let userEmail = '';
        let planId = '';

        if (event === 'subscription.charged') {
            const payloadSub = body.payload?.subscription?.entity;
            const payloadPayment = body.payload?.payment?.entity;
            if (!payloadSub || !payloadPayment) return NextResponse.json({ received: true });

            paymentId = payloadPayment.id;
            subscriptionId = payloadSub.id;
            const notes = payloadSub.notes || {};
            userId = notes.userId || '';
            userEmail = notes.userEmail || '';
            planId = notes.planId || '';
        } else if (event === 'subscription.cancelled' || event === 'subscription.halted') {
            const payloadSub = body.payload?.subscription?.entity;
            if (!payloadSub) return NextResponse.json({ received: true });

            subscriptionId = payloadSub.id;
            const notes = payloadSub.notes || {};
            userId = notes.userId || '';
            userEmail = notes.userEmail || '';
            planId = notes.planId || '';
        }

        if (!subscriptionId && !paymentId) return NextResponse.json({ received: true });

        const eventId = req.headers.get('x-razorpay-event-id') || `${subscriptionId || paymentId}_${event}`;
        const hasBeenProcessed = await db.hasWebhookEvent(eventId);
        if (hasBeenProcessed) {
            console.log(`[Razorpay] Webhook event ${eventId} already processed.`);
            return NextResponse.json({ message: 'Already processed' });
        }

        await db.executeTx(async (txClient) => {
            if (event === 'subscription.charged' && userEmail && planId && paymentId) {
                const plans = await db.getPlans();
                const plan = plans.find(p => p.id === planId);
                if (plan) {
                    const user = await db.getUser(userEmail);
                    if (user?.id) userId = user.id;

                    const paymentRec: PaymentRecord = {
                        id: paymentId,
                        userId,
                        userEmail,
                        planId,
                        amount: plan.price,
                        status: 'succeeded',
                        paymentGateway: 'razorpay',
                        createdAt: new Date().toISOString()
                    };
                    await db.savePayment(paymentRec, txClient);
                    await db.updateTokenBalance(userEmail, plan.tokens, 'add', `Renewal: ${plan.name} (Razorpay)`, undefined, txClient);

                    const subscription: SubscriptionRecord = {
                        id: subscriptionId,
                        userEmail,
                        planId,
                        status: 'active',
                        gateway: 'razorpay',
                        createdAt: new Date().toISOString()
                    };
                    await db.saveSubscription(subscription, txClient);

                    console.log(`[Razorpay Webhook] Charged subscription and credited ${plan.tokens} tokens to ${userEmail}`);
                }
            } else if ((event === 'subscription.cancelled' || event === 'subscription.halted') && userEmail && planId) {
                const subscription: SubscriptionRecord = {
                    id: subscriptionId,
                    userEmail,
                    planId,
                    status: 'canceled',
                    gateway: 'razorpay',
                    createdAt: new Date().toISOString()
                };
                await db.saveSubscription(subscription, txClient);
                console.log(`[Razorpay Webhook] Subscription cancelled for ${userEmail}`);
            }
            
            await db.saveWebhookEvent(eventId, 'razorpay', event, txClient);
        });

        return NextResponse.json({ received: true });

    } catch (err: any) {
        console.error("Razorpay webhook error:", err);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

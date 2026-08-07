import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, PaymentRecord, SubscriptionRecord } from '@/lib/db';
import { PaystackGateway } from '@/lib/gateways/paystack';

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const body = JSON.parse(rawBody);
        const settings = await db.getSettings();

        // Paystack webhook signature verification (HMAC-SHA512)
        const receivedSignature = req.headers.get('x-paystack-signature');
        const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;

        if (webhookSecret && receivedSignature) {
            const expectedSignature = crypto
                .createHmac('sha512', webhookSecret)
                .update(rawBody)
                .digest('hex');

            if (expectedSignature !== receivedSignature) {
                console.error('[Paystack Webhook] Signature verification failed');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
            }
        }

        const event = body.event;
        const data = body.data;
        console.log(`[Paystack Webhook] Received event: ${event}`);

        if (!data) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Determine a unique event ID for idempotency
        const eventId = data.id?.toString() || data.reference || `paystack_${Date.now()}`;

        const hasBeenProcessed = await db.hasWebhookEvent(eventId);
        if (hasBeenProcessed) {
            console.log(`[Paystack] Webhook event ${eventId} already processed.`);
            return NextResponse.json({ message: 'Already processed' });
        }

        await db.executeTx(async (txClient) => {
            if (event === 'charge.success') {
                // Verify the transaction server-side for security
                const gateway = new PaystackGateway(settings);
                const reference = data.reference;
                const verification = await gateway.verifyPayment(reference);

                if (verification.paid) {
                    const userId = verification.userId;
                    const userEmail = verification.userEmail;
                    const planId = verification.planId;

                    if (userEmail && planId) {
                        const plans = await db.getPlans();
                        const plan = plans.find(p => p.id === planId);

                        if (plan) {
                            // Resolve real userId from database
                            const user = await db.getUser(userEmail);
                            const resolvedUserId = user?.id || userId;

                            const payment: PaymentRecord = {
                                id: eventId,
                                userId: resolvedUserId,
                                userEmail: userEmail,
                                planId: planId,
                                amount: plan.price,
                                status: 'succeeded',
                                paymentGateway: 'paystack',
                                createdAt: new Date().toISOString()
                            };
                            await db.savePayment(payment, txClient);

                            await db.updateTokenBalance(
                                userEmail,
                                plan.tokens,
                                'add',
                                `Purchase: ${plan.name} (Paystack)`,
                                undefined,
                                txClient
                            );

                            // Use subscription_code if available, otherwise reference
                            const subscriptionId = data.plan?.subscription_code
                                || data.subscription_code
                                || reference;

                            const subscription: SubscriptionRecord = {
                                id: subscriptionId,
                                userEmail: userEmail,
                                planId: planId,
                                status: 'active',
                                gateway: 'paystack',
                                createdAt: new Date().toISOString()
                            };
                            await db.saveSubscription(subscription, txClient);

                            console.log(`[Paystack Webhook] Successfully credited ${plan.tokens} tokens to ${userEmail}`);
                        } else {
                            console.error(`[Paystack Webhook] Plan not found for ID: ${planId}`);
                        }
                    } else {
                        console.error('[Paystack Webhook] Missing userEmail or planId in metadata:', verification);
                    }
                } else {
                    console.log(`[Paystack Webhook] Payment verification failed for reference: ${reference}`);
                }
            } else if (event === 'subscription.disable' || event === 'subscription.not_renew') {
                const subscriptionCode = data.subscription_code;
                const customerEmail = data.customer?.email;
                const planId = data.plan?.plan_code;

                if (subscriptionCode && customerEmail) {
                    // Try to find the plan by looking up active subscription
                    const activeSub = await db.getActiveSubscriptionByEmail(customerEmail);

                    const subscription: SubscriptionRecord = {
                        id: subscriptionCode,
                        userEmail: customerEmail,
                        planId: activeSub?.planId || planId || '',
                        status: 'canceled',
                        gateway: 'paystack',
                        createdAt: new Date().toISOString()
                    };
                    await db.saveSubscription(subscription, txClient);
                    console.log(`[Paystack Webhook] Subscription cancelled for ${customerEmail}`);
                }
            }

            await db.saveWebhookEvent(eventId, 'paystack', event, txClient);
        });

        return NextResponse.json({ received: true });

    } catch (err: any) {
        console.error('Paystack webhook error:', err);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

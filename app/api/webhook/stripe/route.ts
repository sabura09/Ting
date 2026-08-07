import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, PaymentRecord, SubscriptionRecord } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const settings = await db.getSettings();
        const stripeKey = settings.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
            console.error("Missing STRIPE_SECRET_KEY");
            return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2024-12-18.acacia' as any
        });

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error("Missing STRIPE_WEBHOOK_SECRET");
            return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 });
        }

        const body = await req.text();
        const signature = req.headers.get('stripe-signature') as string;

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
        }

        const eventId = event.id;
        const hasBeenProcessed = await db.hasWebhookEvent(eventId);
        if (hasBeenProcessed) {
            console.log(`Stripe webhook event ${eventId} already processed.`);
            return NextResponse.json({ message: 'Already processed' });
        }

        await db.executeTx(async (txClient) => {
            if (event.type === 'checkout.session.completed') {
                const session = event.data.object as Stripe.Checkout.Session;

                const userId = session.metadata?.userId || 'unknown-user-id';
                const userEmail = session.metadata?.userEmail || session.customer_details?.email;
                const planId = session.metadata?.planId;

                if (userEmail && planId) {
                    const plans = await db.getPlans();
                    const plan = plans.find(p => p.id === planId);

                    if (plan) {
                        const subscriptionId = session.subscription as string || session.id;

                        // Save subscription details immediately
                        const subscription: SubscriptionRecord = {
                            id: subscriptionId,
                            userEmail: userEmail,
                            planId: planId,
                            status: 'active',
                            gateway: 'stripe',
                            createdAt: new Date().toISOString()
                        };
                        await db.saveSubscription(subscription, txClient);

                        // If checkout was a one-time payment (mode === 'payment'), credit tokens here.
                        // For subscriptions, tokens will be credited in the invoice.payment_succeeded event.
                        if (session.mode === 'payment') {
                            const payment: PaymentRecord = {
                                id: session.id,
                                userId: userId,
                                userEmail: userEmail,
                                planId: planId,
                                amount: plan.price,
                                status: 'succeeded',
                                paymentGateway: 'stripe',
                                createdAt: new Date().toISOString()
                            };
                            await db.savePayment(payment, txClient);

                            await db.updateTokenBalance(
                                userEmail,
                                plan.tokens,
                                'add',
                                `Purchase: ${plan.name}`,
                                undefined,
                                txClient
                            );
                            console.log(`Successfully credited ${plan.tokens} tokens to ${userEmail} for one-time payment`);
                        } else {
                            console.log(`Initial subscription registered for ${userEmail}. Tokens will be credited via invoice webhook.`);
                        }
                    }
                } else {
                    console.error("Missing metadata in checkout session:", session.metadata);
                }
            } else if (event.type === 'invoice.payment_succeeded') {
                const invoice = event.data.object as any;
                const subscriptionId = invoice.subscription as string;

                if (subscriptionId) {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const userId = subscription.metadata?.userId || 'unknown-user-id';
                    const userEmail = subscription.metadata?.userEmail || invoice.customer_email || '';
                    const planId = subscription.metadata?.planId;

                    if (userEmail && planId) {
                        const plans = await db.getPlans();
                        const plan = plans.find(p => p.id === planId);

                        if (plan) {
                            const chargeId = invoice.charge as string || invoice.id;
                            const isAlreadyProcessed = await db.hasWebhookEvent(chargeId);

                            if (!isAlreadyProcessed) {
                                const payment: PaymentRecord = {
                                    id: chargeId,
                                    userId: userId,
                                    userEmail: userEmail,
                                    planId: planId,
                                    amount: plan.price,
                                    status: 'succeeded',
                                    paymentGateway: 'stripe',
                                    createdAt: new Date().toISOString()
                                };
                                await db.savePayment(payment, txClient);

                                await db.updateTokenBalance(
                                    userEmail,
                                    plan.tokens,
                                    'add',
                                    `Renewal: ${plan.name}`,
                                    undefined,
                                    txClient
                                );

                                const subscriptionRec: SubscriptionRecord = {
                                    id: subscriptionId,
                                    userEmail: userEmail,
                                    planId: planId,
                                    status: 'active',
                                    gateway: 'stripe',
                                    createdAt: new Date().toISOString()
                                };
                                await db.saveSubscription(subscriptionRec, txClient);
                                await db.saveWebhookEvent(chargeId, 'stripe', 'invoice.payment_succeeded_credited', txClient);
                                console.log(`Successfully credited subscription tokens (${plan.tokens}) to ${userEmail} for Stripe invoice ${chargeId}`);
                            }
                        }
                    }
                }
            } else if (event.type === 'customer.subscription.deleted') {
                const subscription = event.data.object as Stripe.Subscription;
                const userEmail = subscription.metadata?.userEmail;
                const planId = subscription.metadata?.planId;

                if (userEmail && planId) {
                    const subscriptionRec: SubscriptionRecord = {
                        id: subscription.id,
                        userEmail: userEmail,
                        planId: planId,
                        status: 'canceled',
                        gateway: 'stripe',
                        createdAt: new Date().toISOString()
                    };
                    await db.saveSubscription(subscriptionRec, txClient);
                    console.log(`Successfully marked subscription ${subscription.id} as canceled for ${userEmail}`);
                }
            } else if (event.type === 'charge.refunded') {
                const charge = event.data.object as Stripe.Charge;
                console.log(`Stripe charge refunded: ${charge.id}`);
            }

            await db.saveWebhookEvent(eventId, 'stripe', event.type, txClient);
        });

        return NextResponse.json({ received: true });

    } catch (err: any) {
        console.error("Webhook processing error:", err);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import axios from 'axios';
import { db, PaymentRecord, SubscriptionRecord } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const settings = await db.getSettings();

        const eventId = body.id;
        const eventType = body.event_type;
        
        if (!eventId) {
            return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
        }

        const hasBeenProcessed = await db.hasWebhookEvent(eventId);
        if (hasBeenProcessed) {
            console.log(`[PayPal] Webhook event ${eventId} already processed.`);
            return NextResponse.json({ message: 'Already processed' });
        }

        const handledEvents = [
            'BILLING.SUBSCRIPTION.ACTIVATED',
            'PAYMENT.SALE.COMPLETED',
            'BILLING.SUBSCRIPTION.CANCELLED',
            'BILLING.SUBSCRIPTION.EXPIRED',
            'BILLING.SUBSCRIPTION.SUSPENDED'
        ];

        if (!handledEvents.includes(eventType)) {
            await db.executeTx(async (txClient) => {
                await db.saveWebhookEvent(eventId, 'paypal', eventType, txClient);
            });
            return NextResponse.json({ received: true });
        }

        const resource = body.resource;
        const paypalMode = settings.paypalMode || 'sandbox';
        const paypalBase = paypalMode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        const auth = Buffer.from(`${settings.paypalClientId}:${settings.paypalClientSecret}`).toString('base64');
        const tokenRes = await axios.post(`${paypalBase}/v1/oauth2/token`, 'grant_type=client_credentials', {
            headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const accessToken = tokenRes.data.access_token;

        const getSubscriptionDetails = async (subId: string) => {
            const res = await axios.get(`${paypalBase}/v1/billing/subscriptions/${subId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            return res.data;
        };

        await db.executeTx(async (txClient) => {
            if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
                const subId = resource.id;
                const customId = resource.custom_id;
                if (customId) {
                    let userId = '', userEmail = '', planId = '';
                    try {
                        const meta = JSON.parse(customId);
                        userId = meta.userId || '';
                        userEmail = meta.userEmail || '';
                        planId = meta.planId || '';
                    } catch {}

                    if (userEmail && planId) {
                        const subscription: SubscriptionRecord = {
                            id: subId,
                            userEmail,
                            planId,
                            status: 'active',
                            gateway: 'paypal',
                            createdAt: new Date().toISOString()
                        };
                        await db.saveSubscription(subscription, txClient);
                        console.log(`[PayPal Webhook] Activated subscription ${subId} for ${userEmail}`);
                    }
                }
            } else if (eventType === 'PAYMENT.SALE.COMPLETED') {
                const saleId = resource.id;
                const subscriptionId = resource.billing_agreement_id;

                if (subscriptionId) {
                    // Fetch subscription to retrieve custom_id metadata
                    const subDetails = await getSubscriptionDetails(subscriptionId);
                    const customId = subDetails.custom_id;

                    if (customId) {
                        let userId = '', userEmail = '', planId = '';
                        try {
                            const meta = JSON.parse(customId);
                            userId = meta.userId || '';
                            userEmail = meta.userEmail || '';
                            planId = meta.planId || '';
                        } catch {}

                        if (userEmail && planId) {
                            const plans = await db.getPlans();
                            const plan = plans.find(p => p.id === planId);

                            if (plan) {
                                // Prevent double crediting for the same sale/charge ID
                                const hasBeenCredited = await db.hasWebhookEvent(saleId);
                                if (!hasBeenCredited) {
                                    const payment: PaymentRecord = {
                                        id: saleId,
                                        userId,
                                        userEmail,
                                        planId,
                                        amount: plan.price,
                                        status: 'succeeded',
                                        paymentGateway: 'paypal',
                                        createdAt: new Date().toISOString()
                                    };
                                    await db.savePayment(payment, txClient);

                                    await db.updateTokenBalance(
                                        userEmail,
                                        plan.tokens,
                                        'add',
                                        `Renewal: ${plan.name} (PayPal)`,
                                        undefined,
                                        txClient
                                    );

                                    const subscription: SubscriptionRecord = {
                                        id: subscriptionId,
                                        userEmail,
                                        planId,
                                        status: 'active',
                                        gateway: 'paypal',
                                        createdAt: new Date().toISOString()
                                    };
                                    await db.saveSubscription(subscription, txClient);
                                    await db.saveWebhookEvent(saleId, 'paypal', 'payment.sale.completed_credited', txClient);
                                    console.log(`[PayPal Webhook] Successfully processed renewal payment and credited ${plan.tokens} tokens to ${userEmail}`);
                                }
                            }
                        }
                    }
                }
            } else if (
                eventType === 'BILLING.SUBSCRIPTION.CANCELLED' ||
                eventType === 'BILLING.SUBSCRIPTION.EXPIRED' ||
                eventType === 'BILLING.SUBSCRIPTION.SUSPENDED'
            ) {
                const subId = resource.id;
                const customId = resource.custom_id;
                if (customId) {
                    let userEmail = '', planId = '';
                    try {
                        const meta = JSON.parse(customId);
                        userEmail = meta.userEmail || '';
                        planId = meta.planId || '';
                    } catch {}

                    if (userEmail && planId) {
                        const subscription: SubscriptionRecord = {
                            id: subId,
                            userEmail,
                            planId,
                            status: 'canceled',
                            gateway: 'paypal',
                            createdAt: new Date().toISOString()
                        };
                        await db.saveSubscription(subscription, txClient);
                        console.log(`[PayPal Webhook] Marked subscription ${subId} as canceled for ${userEmail}`);
                    }
                }
            }

            await db.saveWebhookEvent(eventId, 'paypal', eventType, txClient);
        });

        return NextResponse.json({ received: true });

    } catch (err: any) {
        console.error("PayPal webhook error:", err);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

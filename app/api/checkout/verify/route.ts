import { NextResponse } from 'next/server';
import { db, PaymentRecord, SubscriptionRecord } from '@/lib/db';
import { getGateway } from '@/lib/gateways/gateway-factory';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        let sessionId = searchParams.get('session_id');
        const gatewayParam = searchParams.get('gateway');
        const token = searchParams.get('token');

        // PayPal specific: resolve session ID for both orders (using token) and subscriptions (using subscription_id)
        const paypalSubId = searchParams.get('subscription_id');
        if (gatewayParam === 'paypal') {
            if (paypalSubId) {
                sessionId = paypalSubId;
            } else if (token && (!sessionId || sessionId === '__PAYPAL_ORDER_ID__' || sessionId === '__PAYPAL_SUB_ID__')) {
                sessionId = token;
            }
        }

        // Flutterwave specific: use 'transaction_id' if available
        const flwTransactionId = searchParams.get('transaction_id');
        if (gatewayParam === 'flutterwave' && flwTransactionId) {
            sessionId = flwTransactionId;
        }

        // Razorpay specific: use 'razorpay_payment_link_id' if available
        const razorpayLinkId = searchParams.get('razorpay_payment_link_id');
        if (gatewayParam === 'razorpay' && razorpayLinkId) {
            sessionId = razorpayLinkId;
        }

        // Paystack specific: use 'reference' or 'trxref' if available
        const paystackRef = searchParams.get('reference') || searchParams.get('trxref');
        if (gatewayParam === 'paystack' && paystackRef) {
            sessionId = paystackRef;
        }

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
        }

        const settings = await db.getSettings();

        // Use the gateway param from the URL, or fall back to the active gateway in settings
        const activeGateway = gatewayParam || settings.paymentGateway || 'stripe';

        // Special handling for free plans (bypassing gateway)
        if (activeGateway === 'free') {
            const planId = searchParams.get('planId');
            const { getSession } = await import('@/lib/auth');
            const session: any = await getSession();

            if (!session || !session.email) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            if (!planId) {
                return NextResponse.json({ error: 'Missing planId for free gateway' }, { status: 400 });
            }

            const plans = await db.getPlans();
            const plan = plans.find(p => p.id === planId);

            if (!plan || plan.price > 0) {
                return NextResponse.json({ error: 'Invalid free plan request' }, { status: 400 });
            }

            // For idempotency, check if already processed
            const payments = await db.getPayments(50);
            const exists = payments.find(p => p.id === sessionId);

            if (!exists) {
                const userId = session.id || (await db.getUser(session.email))?.id || 'unknown';
                await db.savePayment({
                    id: sessionId,
                    userId,
                    userEmail: session.email,
                    planId,
                    amount: 0,
                    status: 'succeeded',
                    paymentGateway: 'free',
                    createdAt: new Date().toISOString()
                });

                await db.updateTokenBalance(session.email, plan.tokens, 'add', `Activated: ${plan.name} (Free)`);
                
                await db.saveSubscription({
                    id: sessionId,
                    userEmail: session.email,
                    planId,
                    status: 'active',
                    createdAt: new Date().toISOString()
                });
            }

            return NextResponse.json({ success: true, status: 'paid' });
        }

        const overriddenSettings = { ...settings, paymentGateway: activeGateway };
        const gateway = getGateway(overriddenSettings);
        const payerId = searchParams.get('PayerID');
        const result = await gateway.verifyPayment(sessionId, payerId || undefined);

        if (result.paid) {
            // Check if this payment was already processed (idempotency)
            const payments = await db.getPayments(100);
            const existingPayment = payments.find(p => p.id === result.sessionId || p.id === sessionId);

            if (!existingPayment) {
                let { userId, userEmail, planId } = result;

                if (!userEmail) {
                    throw new Error(`Payment verified but no customer email provided by ${activeGateway}.`);
                }

                // Authoritatively resolve and VERIFY the real userId
                // We prefer fetching it directly from the database based on the verified email
                const user = await db.getUser(userEmail);
                if (user && user.id) {
                    userId = user.id;
                    console.log(`[${activeGateway}] Authoritatively resolved real userId: ${userId} for ${userEmail}`);
                } else {
                    console.error(`[${activeGateway}] Critical Error: No database user record found for verified customer email ${userEmail}. Payment cannot be credited.`);
                    throw new Error(`No user account found for ${userEmail}. Please contact support with session ${sessionId}.`);
                }

                if (userEmail && planId && userId) {
                    const plans = await db.getPlans();
                    const plan = plans.find(p => p.id === planId);

                    if (plan) {
                        const payment: PaymentRecord = {
                            id: result.sessionId || sessionId,
                            userId: userId,
                            userEmail,
                            planId,
                            amount: plan.price,
                            status: 'succeeded',
                            paymentGateway: activeGateway,
                            createdAt: new Date().toISOString()
                        };
                        await db.savePayment(payment);

                        await db.updateTokenBalance(
                            userEmail,
                            plan.tokens,
                            'add',
                            `Purchase: ${plan.name}`
                        );

                        const subscription: SubscriptionRecord = {
                            id: result.sessionId || sessionId,
                            userEmail,
                            planId,
                            status: 'active',
                            gateway: activeGateway,
                            createdAt: new Date().toISOString()
                        };
                        await db.saveSubscription(subscription);

                        console.log(`[${activeGateway}] Verify Route credited ${plan.tokens} tokens to ${userEmail}`);
                    } else {
                        console.error(`[${activeGateway}] Plan not found for ID: ${planId}`);
                    }
                } else {
                    console.error(`[${activeGateway}] Missing data for payment record:`, { userEmail, planId, userId });
                }
            } else {
                console.log(`Verify Route: Payment already processed for session ${sessionId}`);
            }
        }

        return NextResponse.json({ 
            success: true, 
            status: result.paid ? 'paid' : 'unpaid',
            providerStatus: result.providerStatus,
            error: result.error,
            recoveryUrl: result.recoveryUrl
        });

    } catch (error: any) {
        console.error("Verification failed:", error);
        const message = error?.response?.data?.message || error?.message || "Unknown error during verification";
        return NextResponse.json({ error: `Verification failed: ${message}` }, { status: 500 });
    }
}

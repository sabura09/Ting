import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import Stripe from 'stripe';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session || !session.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const activeSub = await db.getActiveSubscriptionByEmail(session.email);
        if (!activeSub) {
            return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
        }

        const settings = await db.getSettings();
        const gateway = activeSub.gateway || settings.paymentGateway || 'stripe';

        console.log(`[Cancel Subscription] Cancelling subscription ${activeSub.id} on gateway: ${gateway}`);

        if (gateway === 'stripe') {
            const stripeKey = settings.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
            if (!stripeKey) {
                throw new Error('Stripe secret key is not configured.');
            }
            const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });
            await stripe.subscriptions.cancel(activeSub.id);

        } else if (gateway === 'paypal') {
            const paypalMode = settings.paypalMode || 'sandbox';
            const paypalBase = paypalMode === 'live'
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com';

            const auth = Buffer.from(`${settings.paypalClientId}:${settings.paypalClientSecret}`).toString('base64');
            const tokenRes = await axios.post(`${paypalBase}/v1/oauth2/token`, 'grant_type=client_credentials', {
                headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const accessToken = tokenRes.data.access_token;

            await axios.post(`${paypalBase}/v1/billing/subscriptions/${activeSub.id}/cancel`, {
                reason: 'User cancelled subscription'
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            });

        } else if (gateway === 'razorpay') {
            const keyId = settings.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
            const keySecret = settings.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;
            if (!keyId || !keySecret) {
                throw new Error('Razorpay API credentials are not configured.');
            }
            const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
            await axios.post(`https://api.razorpay.com/v1/subscriptions/${activeSub.id}/cancel`, {
                cancel_at_cycle_end: 0
            }, {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });

        } else if (gateway === 'flutterwave') {
            const secretKey = settings.flutterwaveSecretKey;
            if (!secretKey) {
                throw new Error('Flutterwave secret key is not configured.');
            }
            await axios.put(`https://api.flutterwave.com/v3/subscriptions/${activeSub.id}/status`, {
                status: 'cancelled'
            }, {
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json'
                }
            });

        } else if (gateway === 'paystack') {
            const secretKey = settings.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
            if (!secretKey) {
                throw new Error('Paystack secret key is not configured.');
            }
            // Paystack requires subscription code and email token to disable
            // The subscription code is stored as activeSub.id
            // We need to fetch the subscription to get the email_token
            const subRes = await axios.get(`https://api.paystack.co/subscription/${activeSub.id}`, {
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                }
            });
            const emailToken = subRes.data?.data?.email_token;
            await axios.post('https://api.paystack.co/subscription/disable', {
                code: activeSub.id,
                token: emailToken,
            }, {
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json'
                }
            });

        } else {
            throw new Error(`Unsupported subscription gateway: ${gateway}`);
        }

        // Update local database status
        await db.saveSubscription({
            ...activeSub,
            status: 'canceled',
            createdAt: new Date().toISOString()
        });

        console.log(`[Cancel Subscription] Successfully cancelled subscription ${activeSub.id} for ${session.email}`);

        return NextResponse.json({ success: true, message: 'Subscription cancelled successfully' });

    } catch (error: any) {
        console.error('[Cancel Subscription Error]', error);
        const errMsg = error.response?.data?.message || error.response?.data?.error?.description || error.message || 'Cancellation failed';
        return NextResponse.json({ error: `Cancellation failed: ${errMsg}` }, { status: 500 });
    }
}

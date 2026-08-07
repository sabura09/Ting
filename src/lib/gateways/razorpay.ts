import axios from 'axios';
import { SystemSettings } from '@/lib/db';
import { PaymentGateway, CheckoutParams, CheckoutResult, VerifyResult } from './gateway-factory';

/**
 * Razorpay Payment Gateway
 * 
 * Uses the Razorpay Payment Links API for redirect-based checkout flow.
 * Razorpay distinguishes test vs live via separate API key pairs (no mode toggle).
 * 
 * Docs: https://razorpay.com/docs/api/payments/payment-links/
 */
export class RazorpayGateway implements PaymentGateway {
    readonly name = 'razorpay';
    private keyId: string;
    private keySecret: string;
    private baseUrl = 'https://api.razorpay.com/v1';

    constructor(private settings: SystemSettings) {
        this.keyId = (settings.razorpayKeyId || process.env.RAZORPAY_KEY_ID || '').trim();
        this.keySecret = (settings.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || '').trim();

        if (!this.keyId || !this.keySecret) {
            throw new Error('Razorpay API keys are not configured.');
        }
    }

    /**
     * Returns axios auth config for Razorpay HTTP Basic Auth
     */
    private getAuthConfig() {
        return {
            auth: {
                username: this.keyId,
                password: this.keySecret,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }

    /**
     * Creates a Razorpay Payment Link and returns the redirect URL.
     * 
     * The Payment Link carries metadata (userId, userEmail, planId) in `notes`,
     * which is preserved through webhooks and verification calls.
     */
    async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
        try {
            const amountInSmallestUnit = Math.round(params.price * 100);

            // 1. Create a recurring plan
            const planResponse = await axios.post(
                `${this.baseUrl}/plans`,
                {
                    period: 'monthly',
                    interval: 1,
                    item: {
                        name: `${this.settings?.metadata?.siteName || 'AI Suite'} - ${params.planName}`,
                        amount: amountInSmallestUnit,
                        currency: params.currency.toUpperCase(),
                        description: `${params.tokens.toLocaleString()} tokens`,
                    },
                },
                this.getAuthConfig()
            );

            const planId = planResponse.data.id;

            // 2. Create the subscription linking to the plan
            const subResponse = await axios.post(
                `${this.baseUrl}/subscriptions`,
                {
                    plan_id: planId,
                    total_count: 120, // 10 years of monthly cycles
                    quantity: 1,
                    customer_notify: 1,
                    notify_info: {
                        notify_email: params.customerEmail,
                    },
                    notes: {
                        userId: params.userId,
                        userEmail: params.customerEmail,
                        planId: params.planId,
                    },
                },
                this.getAuthConfig()
            );

            const subscriptionId = subResponse.data.id;
            const shortUrl = subResponse.data.short_url;

            if (!shortUrl) {
                throw new Error('Razorpay did not return a subscription payment link URL.');
            }

            console.log(`[Razorpay] Created Subscription ${subscriptionId} for ${params.customerEmail}`);

            return {
                url: shortUrl,
                sessionId: subscriptionId,
            };
        } catch (error: any) {
            const errMsg = error.response?.data?.error?.description
                || error.response?.data?.message
                || error.message;
            console.error('Razorpay Create Subscription Error:', error.response?.data || error.message);
            throw new Error(`Razorpay Error: ${errMsg}`);
        }
    }

    async verifyPayment(sessionId: string, _payerId?: string): Promise<VerifyResult> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/subscriptions/${sessionId}`,
                this.getAuthConfig()
            );

            const data = response.data;
            const notes = data.notes || {};

            const isPaid = data.status === 'active' || data.status === 'authenticated';

            return {
                paid: isPaid,
                sessionId: data.id,
                userId: notes.userId || '',
                userEmail: notes.userEmail || '',
                planId: notes.planId || '',
                providerStatus: data.status,
            };
        } catch (error: any) {
            const errMsg = error.response?.data?.error?.description
                || error.response?.data?.message
                || error.message;
            console.error('Razorpay Verify Subscription Error:', error.response?.data || error.message);
            return {
                paid: false,
                sessionId: sessionId,
                error: errMsg,
            };
        }
    }

    /**
     * Tests API key validity by fetching the payment links list.
     */
    async testConnection(): Promise<boolean> {
        try {
            await axios.get(
                `${this.baseUrl}/payment_links?count=1`,
                this.getAuthConfig()
            );
            return true;
        } catch (error: any) {
            const errMsg = error.response?.data?.error?.description
                || error.response?.data?.message
                || error.message;
            console.error('Razorpay Connection Test Failed:', error.response?.data || error.message);
            throw new Error(errMsg || 'Connection failed');
        }
    }
}

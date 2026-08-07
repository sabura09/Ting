import axios from 'axios';
import { SystemSettings } from '@/lib/db';
import { PaymentGateway, CheckoutParams, CheckoutResult, VerifyResult } from './gateway-factory';

export class FlutterwaveGateway implements PaymentGateway {
    readonly name = 'flutterwave';
    private secretKey: string;
    private baseUrl = 'https://api.flutterwave.com/v3';

    constructor(private settings: SystemSettings) {
        this.secretKey = (settings.flutterwaveSecretKey || '').trim();
        if (!this.secretKey) {
            throw new Error('Flutterwave secret key is not configured.');
        }
    }

    private async getOrCreatePlan(planName: string, price: number): Promise<string> {
        const checkPlanName = `${this.settings?.metadata?.siteName || 'AI Suite'} - ${planName} Plan`;

        try {
            const listRes = await axios.get(`${this.baseUrl}/payment-plans`, {
                headers: { Authorization: `Bearer ${this.secretKey}` }
            });
            const plans = listRes.data?.data;
            const existing = plans?.find((p: any) => p.name === checkPlanName && p.amount === price && p.status === 'active');
            if (existing) {
                return existing.id.toString();
            }
        } catch (e) {
            console.warn('[Flutterwave] Failed to list existing plans, creating new one...', e);
        }

        const createRes = await axios.post(
            `${this.baseUrl}/payment-plans`,
            {
                amount: price,
                name: checkPlanName,
                interval: 'monthly',
                duration: 0
            },
            {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (createRes.data?.status !== 'success') {
            throw new Error(`Failed to create Flutterwave plan: ${createRes.data?.message}`);
        }

        return createRes.data.data.id.toString();
    }

    async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
        try {
            const tx_ref = `flw_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const paymentPlanId = await this.getOrCreatePlan(params.planName, params.price);
            
            const response = await axios.post(
                `${this.baseUrl}/payments`,
                {
                    tx_ref,
                    amount: params.price,
                    currency: params.currency.toUpperCase(),
                    payment_plan: paymentPlanId,
                    redirect_url: params.successUrl.replace('{CHECKOUT_SESSION_ID}', tx_ref),
                    customer: {
                        email: params.customerEmail,
                        name: params.customerEmail.split('@')[0], // Fallback name
                    },
                    meta: {
                        userId: params.userId,
                        userEmail: params.customerEmail,
                        planId: params.planId,
                    },
                    customizations: {
                        title: `${this.settings?.metadata?.siteName || 'AI Suite'} - ${params.planName}`,
                        description: `${params.tokens.toLocaleString()} tokens`,
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.secretKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.data.status !== 'success') {
                throw new Error(`Flutterwave checkout failed: ${response.data.message}`);
            }

            return {
                url: response.data.data.link,
                sessionId: tx_ref,
            };
        } catch (error: any) {
            console.error('Flutterwave Create Checkout Error:', error.response?.data || error.message);
            throw new Error(`Flutterwave Error: ${error.response?.data?.message || error.message}`);
        }
    }

    async verifyPayment(sessionId: string): Promise<VerifyResult> {
        try {
            // Flutterwave verification can be done via transaction ID or tx_ref.
            // When redirecting back, Flutterwave appends transaction_id to the URL.
            // If we only have tx_ref, we might need to find the transaction first or use a different endpoint.
            // Actually, the verify endpoint works with transaction ID.
            
            // Note: In the redirect URL, Flutterwave adds ?status=successful&tx_ref=...&transaction_id=...
            // So the sessionId passed here might be the transaction_id or tx_ref depending on how the frontend handles it.
            // Let's assume sessionId is the transaction_id for verification.

            const response = await axios.get(
                `${this.baseUrl}/transactions/${sessionId}/verify`,
                {
                    headers: {
                        Authorization: `Bearer ${this.secretKey}`,
                    },
                }
            );

            const data = response.data.data;

            if (response.data.status === 'success' && data.status === 'successful') {
                return {
                    paid: true,
                    sessionId: data.tx_ref,
                    userId: data.meta?.userId || '',
                    userEmail: data.meta?.userEmail || data.customer?.email || '',
                    planId: data.meta?.planId || '',
                    providerStatus: data.status,
                };
            }

            return {
                paid: false,
                sessionId: sessionId,
                providerStatus: data?.status || 'FAILED',
                error: response.data.message || 'Payment verification failed',
            };
        } catch (error: any) {
            console.error('Flutterwave Verify Payment Error:', error.response?.data || error.message);
            return {
                paid: false,
                sessionId: sessionId,
                error: error.response?.data?.message || error.message,
            };
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await axios.get(`${this.baseUrl}/transactions`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                },
                params: {
                    page: 1,
                },
            });
            return true;
        } catch (error: any) {
            console.error('Flutterwave Connection Test Failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Connection failed');
        }
    }
}

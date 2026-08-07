import axios from 'axios';
import { SystemSettings } from '@/lib/db';
import { PaymentGateway, CheckoutParams, CheckoutResult, VerifyResult } from './gateway-factory';

export class PayPalGateway implements PaymentGateway {
    readonly name = 'paypal';
    private clientId: string;
    private clientSecret: string;
    private baseUrl: string;

    constructor(private settings: SystemSettings) {
        this.clientId = (settings.paypalClientId || '').trim();
        this.clientSecret = (settings.paypalClientSecret || '').trim();
        if (!this.clientId || !this.clientSecret) {
            throw new Error('PayPal client credentials are not configured.');
        }
        const mode = settings.paypalMode || 'sandbox';
        this.baseUrl = mode === 'live'
            ? 'https://api.paypal.com'
            : 'https://api.sandbox.paypal.com';

        // Diagnostics
        if (this.clientId && this.clientSecret) {
            const idStart = this.clientId.substring(0, 5);
            const idEnd = this.clientId.substring(this.clientId.length - 5);
            const secretStart = this.clientSecret.substring(0, 5);
            const secretEnd = this.clientSecret.substring(this.clientSecret.length - 5);
            console.log(`PayPalGateway Initialized [${mode}]: ID(${idStart}...${idEnd}), Secret(${secretStart}...${secretEnd})`);
        }
    }

    private async getAccessToken(): Promise<string> {
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`, 'utf-8').toString('base64');
        
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');

            const resp = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'User-Agent': 'AI-Suite-Payment-Gateway/1.0',
                },
                body: params.toString()
            });

            if (!resp.ok) {
                let errorDetail = '';
                try {
                    const paypalError = await resp.json();
                    errorDetail = paypalError?.error_description || paypalError?.message || JSON.stringify(paypalError);
                } catch (e) {
                    errorDetail = resp.statusText;
                }

                console.error('PayPal Auth Failed:', {
                    status: resp.status,
                    detail: errorDetail,
                    endpoint: `${this.baseUrl}/v1/oauth2/token`,
                    mode: this.baseUrl.includes('sandbox') ? 'sandbox' : 'live'
                });

                if (resp.status === 401) {
                    throw new Error(`PayPal Auth Failed (401): ${errorDetail}. Please check if your Client ID and Secret match the selected mode (${this.baseUrl.includes('sandbox') ? 'Sandbox' : 'Live'}).`);
                }
                
                throw new Error(`PayPal Auth Failed: ${errorDetail}`);
            }

            const data = await resp.json();
            return data.access_token;
        } catch (error: any) {
            if (error.message.includes('PayPal Auth Failed')) throw error;
            console.error('PayPal Connection Error:', error);
            throw new Error(`PayPal Connection Error: ${error.message}`);
        }
    }

    private async getOrCreateProduct(token: string): Promise<string> {
        try {
            const listRes = await fetch(`${this.baseUrl}/v1/catalogs/products?page_size=10`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });
            if (listRes.ok) {
                const listData = await listRes.json();
                const existing = listData.products?.find((p: any) => p.name === 'AI Suite Product');
                if (existing) {
                    return existing.id;
                }
            }
        } catch (e) {
            console.warn('[PayPal] Failed to list existing products, creating new one...', e);
        }

        const createRes = await fetch(`${this.baseUrl}/v1/catalogs/products`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Prefer: 'return=representation'
            },
            body: JSON.stringify({
                name: 'AI Suite Product',
                description: 'AI Suite Monthly Subscription Services',
                type: 'SERVICE',
                category: 'SOFTWARE'
            })
        });

        if (!createRes.ok) {
            const errorData = await createRes.json();
            throw new Error(`Failed to create PayPal product: ${errorData.message || JSON.stringify(errorData)}`);
        }

        const product = await createRes.json();
        return product.id;
    }

    private async getOrCreatePlan(token: string, productId: string, planName: string, price: number, currency: string): Promise<string> {
        const uppercaseCurrency = currency.toUpperCase();
        const checkPlanName = `AI Suite - ${planName} - ${price.toFixed(2)} ${uppercaseCurrency}`;

        try {
            const listRes = await fetch(`${this.baseUrl}/v1/billing/plans?page_size=20`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });
            if (listRes.ok) {
                const listData = await listRes.json();
                const existing = listData.plans?.find((p: any) => p.name === checkPlanName && p.status === 'ACTIVE');
                if (existing) {
                    return existing.id;
                }
            }
        } catch (e) {
            console.warn('[PayPal] Failed to list existing plans, creating new one...', e);
        }

        const createRes = await fetch(`${this.baseUrl}/v1/billing/plans`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Prefer: 'return=representation'
            },
            body: JSON.stringify({
                product_id: productId,
                name: checkPlanName,
                description: `Monthly subscription to ${planName}`,
                status: 'ACTIVE',
                billing_cycles: [
                    {
                        frequency: {
                            interval_unit: 'MONTH',
                            interval_count: 1
                        },
                        tenure_type: 'REGULAR',
                        sequence: 1,
                        total_cycles: 0,
                        pricing_scheme: {
                            fixed_price: {
                                value: price.toFixed(2),
                                currency_code: uppercaseCurrency
                            }
                        }
                    }
                ],
                payment_preferences: {
                    auto_bill_outstanding: true,
                    setup_fee_failure_action: 'CONTINUE',
                    payment_failure_threshold: 3
                }
            })
        });

        if (!createRes.ok) {
            const errorData = await createRes.json();
            throw new Error(`Failed to create PayPal billing plan: ${errorData.message || JSON.stringify(errorData)}`);
        }

        const plan = await createRes.json();
        return plan.id;
    }

    async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
        const token = await this.getAccessToken();
        const productId = await this.getOrCreateProduct(token);
        const planId = await this.getOrCreatePlan(token, productId, params.planName, params.price, params.currency);

        const subResponse = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Prefer: 'return=representation'
            },
            body: JSON.stringify({
                plan_id: planId,
                custom_id: JSON.stringify({
                    userId: params.userId,
                    userEmail: params.customerEmail,
                    planId: params.planId
                }),
                application_context: {
                    brand_name: this.settings?.metadata?.siteName || 'AI Suite',
                    user_action: 'SUBSCRIBE_NOW',
                    return_url: params.successUrl.replace('{CHECKOUT_SESSION_ID}', '__PAYPAL_SUB_ID__'),
                    cancel_url: params.cancelUrl
                }
            })
        });

        if (!subResponse.ok) {
            const errorData = await subResponse.json();
            throw new Error(`Failed to create PayPal subscription: ${errorData.message || JSON.stringify(errorData)}`);
        }

        const subData = await subResponse.json();
        const approvalLink = subData.links?.find((l: any) => l.rel === 'approve')?.href;

        if (!approvalLink) {
            throw new Error('PayPal did not return an approval link for subscription.');
        }

        return { url: approvalLink, sessionId: subData.id };
    }

    async verifyPayment(sessionId: string, _payerId?: string): Promise<VerifyResult> {
        const token = await this.getAccessToken();
        let lastError: string | undefined;

        try {
            const subResponse = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${sessionId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });

            if (!subResponse.ok) {
                const errData = await subResponse.json();
                throw new Error(errData.message || 'Failed to fetch subscription');
            }

            const subData = await subResponse.json();
            console.log(`[PayPal] Subscription ${sessionId} details status: ${subData.status}`);

            const customId = subData.custom_id;
            let userId = '', userEmail = '', planId = '';

            if (customId) {
                try {
                    const meta = JSON.parse(customId);
                    userId = meta.userId || '';
                    userEmail = meta.userEmail || '';
                    planId = meta.planId || '';
                } catch (e) {
                    console.error('Failed to parse PayPal custom_id:', customId);
                }
            }

            const paid = subData.status === 'ACTIVE' || subData.status === 'APPROVED';

            return {
                paid,
                sessionId: subData.id,
                userId,
                userEmail,
                planId,
                providerStatus: subData.status,
                error: lastError
            };
        } catch (error: any) {
            console.error('[PayPal] Subscription verify error:', error.message);
            return {
                paid: false,
                sessionId,
                userId: '',
                userEmail: '',
                planId: '',
                providerStatus: 'UNKNOWN',
                error: error.message
            };
        }
    }

    async testConnection(): Promise<boolean> {
        await this.getAccessToken();
        return true;
    }
}

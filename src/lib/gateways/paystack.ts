import axios from 'axios';
import { SystemSettings } from '@/lib/db';
import { PaymentGateway, CheckoutParams, CheckoutResult, VerifyResult } from './gateway-factory';

/**
 * Paystack Payment Gateway
 *
 * Uses the Paystack Transactions API for redirect-based checkout flow.
 * Paystack distinguishes test vs live via separate API key pairs (no mode toggle).
 * Amounts are in the smallest currency unit (e.g. kobo for NGN, pesewas for GHS, cents for USD/ZAR).
 *
 * Docs: https://paystack.com/docs/api/transaction/
 */
export class PaystackGateway implements PaymentGateway {
    readonly name = 'paystack';
    private secretKey: string;
    private baseUrl = 'https://api.paystack.co';

    constructor(private settings: SystemSettings) {
        this.secretKey = (settings.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY || '').trim();
        if (!this.secretKey) {
            throw new Error('Paystack secret key is not configured.');
        }
    }

    /**
     * Returns axios headers for Paystack Bearer token auth
     */
    private getHeaders() {
        return {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Gets or creates a Paystack plan for recurring billing.
     * Paystack plans are identified by name, amount, and interval.
     */
    private async getOrCreatePlan(planName: string, price: number, currency: string): Promise<string> {
        const amountInSmallestUnit = Math.round(price * 100);
        const checkPlanName = `${this.settings?.metadata?.siteName || 'AI Suite'} - ${planName} Plan`;

        try {
            const listRes = await axios.get(`${this.baseUrl}/plan`, {
                headers: this.getHeaders(),
            });
            const plans = listRes.data?.data;
            const existing = plans?.find(
                (p: any) =>
                    p.name === checkPlanName &&
                    p.amount === amountInSmallestUnit &&
                    p.currency?.toUpperCase() === currency.toUpperCase() &&
                    !p.is_deleted && !p.is_archived
            );
            if (existing) {
                return existing.plan_code;
            }
        } catch (e) {
            console.warn('[Paystack] Failed to list existing plans, creating new one...', e);
        }

        const createRes = await axios.post(
            `${this.baseUrl}/plan`,
            {
                name: checkPlanName,
                amount: amountInSmallestUnit,
                interval: 'monthly',
                currency: currency.toUpperCase(),
            },
            {
                headers: this.getHeaders(),
            }
        );

        if (createRes.data?.status !== true) {
            throw new Error(`Failed to create Paystack plan: ${createRes.data?.message}`);
        }

        return createRes.data.data.plan_code;
    }

    /**
     * Fetches exchange rates between any two currencies, with robust cross-currency offline math.
     */
    private async getExchangeRate(from: string, to: string): Promise<number> {
        const fromUpper = from.toUpperCase();
        const toUpper = to.toUpperCase();
        if (fromUpper === toUpper) return 1;

        try {
            const res = await axios.get(`https://open.er-api.com/v6/latest/${fromUpper}`);
            const rate = res.data?.rates?.[toUpper];
            if (rate) return rate;
        } catch (e) {
            console.warn(`[Paystack] Failed to fetch dynamic exchange rate for ${from} to ${to}:`, e);
        }

        // Fallback rates relative to USD
        const usdRates: Record<string, number> = {
            USD: 1,
            NGN: 1500,
            GHS: 15,
            ZAR: 19,
            KES: 130
        };

        const rateFromUsd = usdRates[fromUpper];
        const rateToUsd = usdRates[toUpper];

        if (rateFromUsd && rateToUsd) {
            return rateToUsd / rateFromUsd;
        }
        return 1;
    }

    /**
     * Helper to initialize transaction with a specific currency and price
     */
    private async initializeCheckoutWithCurrency(params: CheckoutParams, price: number, currency: string): Promise<CheckoutResult> {
        const reference = `ps_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const amountInSmallestUnit = Math.round(price * 100);

        // Get or create a recurring plan with the appropriate currency and price
        const planCode = await this.getOrCreatePlan(params.planName, price, currency);

        const response = await axios.post(
            `${this.baseUrl}/transaction/initialize`,
            {
                reference,
                amount: amountInSmallestUnit,
                email: params.customerEmail,
                currency: currency,
                plan: planCode,
                callback_url: params.successUrl.replace('{CHECKOUT_SESSION_ID}', reference),
                metadata: {
                    userId: params.userId,
                    userEmail: params.customerEmail,
                    planId: params.planId,
                    custom_fields: [
                        {
                            display_name: 'Plan',
                            variable_name: 'plan_name',
                            value: `${this.settings?.metadata?.siteName || 'AI Suite'} - ${params.planName}`,
                        },
                        {
                            display_name: 'Tokens',
                            variable_name: 'tokens',
                            value: `${params.tokens.toLocaleString()} tokens`,
                        },
                    ],
                },
            },
            {
                headers: this.getHeaders(),
            }
        );

        if (response.data.status !== true) {
            throw new Error(`Paystack checkout failed: ${response.data.message}`);
        }

        return {
            url: response.data.data.authorization_url,
            sessionId: reference,
        };
    }

    /**
     * Detects the default integration currency for this merchant's secret key.
     * Checks settings first, then falls back to a currency probe loop.
     */
    private async getMerchantCurrency(): Promise<string> {
        if (this.settings.paystackCurrency) {
            return this.settings.paystackCurrency.toUpperCase();
        }

        // Probe candidate currencies to see which one is supported by the merchant account
        const candidateCurrencies = ['ZAR', 'GHS', 'KES', 'USD'];
        for (const curr of candidateCurrencies) {
            try {
                // Initialize a temporary probe transaction with 1 unit
                await axios.post(
                    `${this.baseUrl}/transaction/initialize`,
                    {
                        email: 'currency-probe@example.com',
                        amount: 100,
                        currency: curr,
                    },
                    {
                        headers: this.getHeaders(),
                    }
                );
                console.log(`[Paystack] Currency probe detected supported currency: ${curr}`);
                return curr;
            } catch (e: any) {
                const errorMsg = e.response?.data?.message || e.message || '';
                const isCurrencyError = errorMsg.toLowerCase().includes('currency') || 
                                        JSON.stringify(e.response?.data || {}).toLowerCase().includes('currency');
                if (isCurrencyError) {
                    continue;
                }
                break;
            }
        }
        return 'ZAR'; // Default fallback if detection fails (NGN removed)
    }

    /**
     * Creates a Paystack transaction and returns the authorization URL for redirect.
     *
     * Stores userId, userEmail, and planId in transaction metadata,
     * which is preserved through verification and webhook callbacks.
     */
    async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
        const currency = params.currency.toUpperCase();
        const price = params.price;

        try {
            return await this.initializeCheckoutWithCurrency(params, price, currency);
        } catch (error: any) {
            // Check if it's a currency support error
            const errorMsg = error.response?.data?.message || error.message || '';
            const isCurrencyError = errorMsg.toLowerCase().includes('currency') || 
                                    JSON.stringify(error.response?.data || {}).toLowerCase().includes('currency');
            
            if (isCurrencyError) {
                try {
                    // Dynamically discover the default currency of the merchant
                    const targetCurrency = await this.getMerchantCurrency();
                    console.log(`[Paystack] Currency ${currency} not supported. Automatically falling back to detected merchant currency: ${targetCurrency}...`);
                    
                    const rate = await this.getExchangeRate(currency, targetCurrency);
                    const convertedPrice = price * rate;
                    return await this.initializeCheckoutWithCurrency(params, convertedPrice, targetCurrency);
                } catch (retryError: any) {
                    console.error(`Paystack Retry with ${currency} Failed:`, retryError.response?.data || retryError.message);
                    throw new Error(`Paystack Error (Fallback retry failed): ${retryError.response?.data?.message || retryError.message}`);
                }
            }
            
            console.error('Paystack Create Checkout Error:', error.response?.data || error.message);
            throw new Error(`Paystack Error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Verifies a Paystack transaction by reference.
     *
     * Paystack redirects back with ?reference=xxx&trxref=xxx.
     * The sessionId here is the reference string.
     */
    async verifyPayment(sessionId: string): Promise<VerifyResult> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/transaction/verify/${encodeURIComponent(sessionId)}`,
                {
                    headers: this.getHeaders(),
                }
            );

            const data = response.data.data;

            if (response.data.status === true && data.status === 'success') {
                const metadata = data.metadata || {};
                return {
                    paid: true,
                    sessionId: data.reference,
                    userId: metadata.userId || '',
                    userEmail: metadata.userEmail || data.customer?.email || '',
                    planId: metadata.planId || '',
                    providerStatus: data.status,
                };
            }

            return {
                paid: false,
                sessionId: sessionId,
                providerStatus: data?.status || 'failed',
                error: response.data.message || 'Payment verification failed',
            };
        } catch (error: any) {
            console.error('Paystack Verify Payment Error:', error.response?.data || error.message);
            return {
                paid: false,
                sessionId: sessionId,
                error: error.response?.data?.message || error.message,
            };
        }
    }

    /**
     * Tests API key validity by listing transactions.
     */
    async testConnection(): Promise<boolean> {
        try {
            await axios.get(`${this.baseUrl}/transaction?perPage=1`, {
                headers: this.getHeaders(),
            });
            return true;
        } catch (error: any) {
            console.error('Paystack Connection Test Failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Connection failed');
        }
    }
}

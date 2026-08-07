import { supabaseAdmin } from './supabase';
import { query, getClient } from './pg';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { DEMO_PRICING_PLANS, PricingPlan } from './pricing-defaults';
export type { PricingPlan };



import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'tmp');
const LOG_FILE = path.join(LOG_DIR, 'rag-logs.txt');

function debugLog(msg: string) {
    const timestamp = new Date().toISOString();
    const formattedMsg = `[DB][${timestamp}] ${msg}\n`;
    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        fs.appendFileSync(LOG_FILE, formattedMsg);
    } catch (e) {
        // Ignore logging errors
    }
}

export interface User {
    id?: string;
    email: string;
    password?: string;
    name?: string;
    role: "user" | "admin";
    createdAt: string;
    status: "active" | "disabled";
    disabledFeatures?: string[];
    tokens?: number;
    twoFactorSecret?: string;
    twoFactorEnabled?: boolean;
    emailVerified?: boolean;
    emailVerificationToken?: string;
    emailVerificationExpiresAt?: string;
}

export interface TokenBalance {
    email: string;
    balance: number;
    updatedAt: string;
}

export interface TokenLog {
    email: string;
    amount: number;
    action: "consume" | "add" | "reset";
    feature?: string;
    model?: string;
    timestamp: string;
}

export interface SystemSettings {
    defaultTokens: number;
    aiLimits: Record<string, number>;
    paymentEnabled: boolean;
    paymentGateway?: string;
    stripePublicKey?: string;
    stripeSecretKey?: string;
    paypalClientId?: string;
    paypalClientSecret?: string;
    paypalMode?: string;
    flutterwavePublicKey?: string;
    flutterwaveSecretKey?: string;
    flutterwaveEncryptionKey?: string;
    razorpayKeyId?: string;
    razorpayKeySecret?: string;
    paystackSecretKey?: string;
    paystackCurrency?: string;
    showAiSettings?: boolean;
    showDemoMode?: boolean;

    metadata?: Record<string, any>;
}


export interface PaymentRecord {
    id: string;
    userId: string;
    userEmail: string;
    planId: string;
    amount: number;
    status: 'succeeded' | 'failed' | 'pending';
    paymentGateway?: string;
    createdAt: string;
}

export interface SubscriptionRecord {
    id: string;
    userEmail: string;
    planId: string;
    status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid';
    gateway?: string;
    createdAt: string;
}

export interface WebsiteProject {
    id: string;
    userEmail: string;
    name: string;
    code: string;
    subdomain?: string;
    createdAt: string;
    updatedAt: string;
    previewImage?: string;
    messages?: any[];
}

export interface PresentationProject {
    id: string;
    userEmail: string;
    name: string;
    slides: any;
    messages?: any[];
    createdAt: string;
    updatedAt: string;
}

export interface CustomDomain {
    id: string;
    domain: string;
    websiteId: string;
    status: 'pending' | 'active' | 'failed';
    createdAt: string;
    updatedAt: string;
}

export interface GameProject {
    id: string;
    userEmail: string;
    name: string;
    code: string;
    prompt: string;
    genre: string;
    visualStyle: string;
    previewImage?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Document {
    id: string;
    userEmail: string;
    name: string;
    status: 'processing' | 'completed' | 'error';
    metadata?: any;
    createdAt: string;
}

export interface DocumentChunk {
    id: string;
    documentId: string;
    content: string;
    similarity?: number;
}

export interface Language {
    id?: string;
    code: string;
    name: string;
    direction: 'ltr' | 'rtl';
    isEnabled: boolean;
    createdAt?: string;
}

export interface Translation {
    id?: string;
    translationKey: string;
    languageCode: string;
    value: string;
    updatedAt?: string;
}

class SystemDB {
    // Users
    async getUser(email: string): Promise<User | null> {
        try {
            const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
            const data = res.rows[0];

            if (!data) return null;

            return {
                id: data.id,
                email: data.email,
                name: data.name,
                role: data.role,
                createdAt: data.created_at instanceof Date ? data.created_at.toISOString() : (data.created_at || new Date().toISOString()),
                status: data.status,
                disabledFeatures: data.disabled_features || [],
                password: data.password,
                twoFactorSecret: data.two_factor_secret || undefined,
                twoFactorEnabled: data.two_factor_enabled || false,
                emailVerified: data.email_verified || false,
                emailVerificationToken: data.email_verification_token || undefined,
                emailVerificationExpiresAt: data.email_verification_expires_at instanceof Date ? data.email_verification_expires_at.toISOString() : (data.email_verification_expires_at || undefined)
            };
        } catch (error) {
            console.error("Error in getUser:", error);
            return null;
        }
    }

    async saveUser(user: User): Promise<User> {
        try {
            const res = await query(`
                INSERT INTO users (
                    email, name, role, status, password, created_at, disabled_features,
                    two_factor_secret, two_factor_enabled, email_verified,
                    email_verification_token, email_verification_expires_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (email) DO UPDATE SET
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                    status = EXCLUDED.status,
                    password = COALESCE(EXCLUDED.password, users.password),
                    disabled_features = EXCLUDED.disabled_features,
                    two_factor_secret = EXCLUDED.two_factor_secret,
                    two_factor_enabled = EXCLUDED.two_factor_enabled,
                    email_verified = EXCLUDED.email_verified,
                    email_verification_token = EXCLUDED.email_verification_token,
                    email_verification_expires_at = EXCLUDED.email_verification_expires_at
                RETURNING *
            `, [
                user.email.toLowerCase(),
                user.name || null,
                user.role || 'user',
                user.status || 'active',
                user.password || null,
                user.createdAt || new Date().toISOString(),
                user.disabledFeatures || [],
                user.twoFactorSecret || null,
                user.twoFactorEnabled ?? false,
                user.emailVerified ?? true,
                user.emailVerificationToken || null,
                user.emailVerificationExpiresAt || null
            ]);

            const data = res.rows[0];
            return {
                id: data.id,
                email: data.email,
                name: data.name,
                role: data.role,
                createdAt: data.created_at instanceof Date ? data.created_at.toISOString() : (data.created_at || new Date().toISOString()),
                status: data.status,
                disabledFeatures: data.disabled_features || [],
                password: data.password,
                twoFactorSecret: data.two_factor_secret || undefined,
                twoFactorEnabled: data.two_factor_enabled || false,
                emailVerified: data.email_verified || false,
                emailVerificationToken: data.email_verification_token || undefined,
                emailVerificationExpiresAt: data.email_verification_expires_at instanceof Date ? data.email_verification_expires_at.toISOString() : (data.email_verification_expires_at || undefined)
            };
        } catch (error) {
            console.error("Error in saveUser:", error);
            throw error;
        }
    }

    async listUsers(startDate?: Date, endDate?: Date): Promise<User[]> {
        try {
            let queryStr = 'SELECT * FROM users';
            const params: any[] = [];
            if (startDate && endDate) {
                queryStr += ' WHERE created_at >= $1 AND created_at <= $2';
                params.push(startDate, endDate);
            } else if (startDate) {
                queryStr += ' WHERE created_at >= $1';
                params.push(startDate);
            }
            const usersRes = await query(queryStr, params);
            const users = usersRes.rows;

            // Fetch settings once for the default tokens fallback
            const settings = await this.getSettings();
            const defaultTokens = settings.defaultTokens;

            // Fetch token balances
            const balancesRes = await query('SELECT email, balance FROM user_balances');
            const balances = balancesRes.rows;

            const balanceMap = new Map<string, number>();
            if (balances) {
                balances.forEach((b: any) => {
                    if (b.email) {
                        balanceMap.set(b.email.toLowerCase(), b.balance);
                    }
                });
            }

            return users.map((u: any) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                role: u.role,
                createdAt: u.created_at instanceof Date ? u.created_at.toISOString() : (u.created_at || new Date().toISOString()),
                status: u.status,
                disabledFeatures: u.disabled_features || [],
                tokens: balanceMap.has(u.email.toLowerCase()) ? (balanceMap.get(u.email.toLowerCase()) ?? defaultTokens) : defaultTokens,
                twoFactorSecret: u.two_factor_secret || undefined,
                twoFactorEnabled: u.two_factor_enabled || false,
                emailVerified: u.email_verified || false,
                emailVerificationToken: u.email_verification_token || undefined,
                emailVerificationExpiresAt: u.email_verification_expires_at instanceof Date ? u.email_verification_expires_at.toISOString() : (u.email_verification_expires_at || undefined)
            }));
        } catch (error) {
            console.error("Error in listUsers:", error);
            return [];
        }
    }

    async deleteUser(email: string): Promise<void> {
        try {
            await query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        } catch (error) {
            console.error("Error in deleteUser:", error);
            throw error;
        }
    }

    async updateUserPassword(email: string, hashedPassword: string): Promise<void> {
        try {
            await query('UPDATE users SET password = $1 WHERE LOWER(email) = LOWER($2)', [hashedPassword, email]);
        } catch (error) {
            console.error("Error in updateUserPassword:", error);
            throw error;
        }
    }

    // OTP and Password Reset
    async createResetToken(email: string, otp: string, expiresInMinutes: number): Promise<void> {
        // Clear any existing tokens for this user first
        await this.deleteResetTokens(email);

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

        const { error } = await supabaseAdmin
            .from('reset_tokens')
            .insert({
                email: email.toLowerCase(),
                otp,
                expires_at: expiresAt.toISOString()
            });

        if (error) throw new Error(`Error creating reset token: ${error.message}`);
    }

    async verifyResetToken(email: string, otp: string): Promise<boolean> {
        const { data, error } = await supabaseAdmin
            .from('reset_tokens')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('otp', otp)
            .single();

        if (error || !data) return false;

        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
            return false; // Token expired
        }

        return true;
    }

    async deleteResetTokens(email: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('reset_tokens')
            .delete()
            .eq('email', email.toLowerCase());

        if (error) throw new Error(`Error deleting reset tokens: ${error.message}`);
    }

    // Tokens
    async getTokenBalance(email: string): Promise<TokenBalance> {
        try {
            const res = await query('SELECT * FROM user_balances WHERE LOWER(email) = LOWER($1)', [email]);
            const data = res.rows[0];

            if (!data) {
                const settings = await this.getSettings();
                return { email, balance: settings.defaultTokens, updatedAt: new Date().toISOString() };
            }

            return {
                email: data.email,
                balance: data.balance,
                updatedAt: data.updated_at instanceof Date ? data.updated_at.toISOString() : (data.updated_at || new Date().toISOString())
            };
        } catch (error) {
            console.error("Error in getTokenBalance:", error);
            const settings = await this.getSettings();
            return { email, balance: settings.defaultTokens, updatedAt: new Date().toISOString() };
        }
    }

    async updateTokenBalance(email: string, amount: number, action: TokenLog["action"], feature?: string, model?: string, txClient?: any): Promise<void> {
        const queryFn = txClient ? txClient.query.bind(txClient) : query;
        try {
            const current = await this.getTokenBalance(email);
            const newBalance = action === 'consume' ? current.balance - amount : current.balance + amount;

            // Upsert balance
            await queryFn(`
                INSERT INTO user_balances (email, balance, updated_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (email) DO UPDATE SET
                    balance = EXCLUDED.balance,
                    updated_at = EXCLUDED.updated_at
            `, [email.toLowerCase(), newBalance, new Date().toISOString()]);

            // Insert log
            await queryFn(`
                INSERT INTO token_logs (email, amount, action, feature, model, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [email.toLowerCase(), amount, action, feature || null, model || null, new Date().toISOString()]);
        } catch (error) {
            console.error("Error in updateTokenBalance:", error);
            throw error;
        }
    }

    async getTokenLogs(email: string): Promise<TokenLog[]> {
        try {
            const res = await query(`
                SELECT * FROM token_logs 
                WHERE LOWER(email) = LOWER($1) 
                ORDER BY timestamp DESC 
                LIMIT 50
            `, [email]);

            return res.rows.map((l: any) => ({
                email: l.email,
                amount: l.amount,
                action: l.action,
                feature: l.feature || undefined,
                model: l.model || undefined,
                timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : (l.timestamp || new Date().toISOString())
            }));
        } catch (error) {
            console.error("Error in getTokenLogs:", error);
            return [];
        }
    }

    async getTotalDistributedTokens(startDate?: Date, endDate?: Date): Promise<number> {
        try {
            let queryStr = 'SELECT balance FROM user_balances';
            let usersQueryStr = 'SELECT COUNT(*) as count FROM users';
            const params: any[] = [];
            
            if (startDate && endDate) {
                queryStr += ' WHERE updated_at >= $1 AND updated_at <= $2';
                usersQueryStr += ' WHERE created_at >= $1 AND created_at <= $2';
                params.push(startDate, endDate);
            } else if (startDate) {
                queryStr += ' WHERE updated_at >= $1';
                usersQueryStr += ' WHERE created_at >= $1';
                params.push(startDate);
            }

            const balancesRes = await query(queryStr, params);
            const balances = balancesRes.rows;

            const usersCountRes = await query(usersQueryStr, params);
            const count = parseInt(usersCountRes.rows[0].count || '0');

            const settings = await this.getSettings();
            const defaultTokens = settings.defaultTokens;

            if (!balances || balances.length === 0) return count * defaultTokens;

            const sumStored = balances.reduce((sum, item) => sum + (item.balance || 0), 0);
            const usersWithoutBalance = Math.max(0, count - balances.length);

            return sumStored + (usersWithoutBalance * defaultTokens);
        } catch (error) {
            console.error("Error in getTotalDistributedTokens:", error);
            return 0;
        }
    }

    async getTotalConsumedTokens(startDate?: Date, endDate?: Date): Promise<number> {
        try {
            let queryStr = "SELECT SUM(amount) as total FROM token_logs WHERE action = 'consume'";
            const params: any[] = [];
            
            if (startDate && endDate) {
                queryStr += ' AND timestamp >= $1 AND timestamp <= $2';
                params.push(startDate, endDate);
            } else if (startDate) {
                queryStr += ' AND timestamp >= $1';
                params.push(startDate);
            }
            const res = await query(queryStr, params);
            return parseInt(res.rows[0].total || '0');
        } catch (error) {
            console.error("Error in getTotalConsumedTokens:", error);
            return 0;
        }
    }

    async getTokenUsageStats(startDate?: Date, endDate?: Date): Promise<{ date: string; tokens: number }[]> {
        try {
            let queryStr = "SELECT amount, timestamp FROM token_logs WHERE action = 'consume'";
            const params: any[] = [];
            
            if (startDate && endDate) {
                queryStr += ' AND timestamp >= $1 AND timestamp <= $2';
                params.push(startDate, endDate);
            } else if (startDate) {
                queryStr += ' AND timestamp >= $1';
                params.push(startDate);
            }
            queryStr += ' ORDER BY timestamp ASC';
            
            const res = await query(queryStr, params);
            const data = res.rows;

            const stats: Record<string, number> = {};

            data.forEach((log: any) => {
                const dateVal = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
                const date = dateVal.toLocaleDateString();
                stats[date] = (stats[date] || 0) + log.amount;
            });

            return Object.entries(stats).map(([date, tokens]) => ({ date, tokens }));
        } catch (error) {
            console.error("Error in getTokenUsageStats:", error);
            return [];
        }
    }

    async getSettings(): Promise<SystemSettings> {
        try {
            const res = await query('SELECT * FROM system_settings WHERE id = 1');
            const data = res.rows[0];

            if (!data) {
                return {
                    defaultTokens: 1000,
                    aiLimits: {
                        image: 50,
                        chat: 10,
                        'music-generator': 100,
                        'audio-isolation': 50
                    },
                    paymentEnabled: false,
                    showAiSettings: true,
                    showDemoMode: true
                };
            }

            return {
                defaultTokens: data.default_tokens,
                aiLimits: data.ai_limits,
                paymentEnabled: data.payment_enabled,
                showAiSettings: data.show_ai_settings,
                showDemoMode: data.show_demo_mode,
                paymentGateway: data.payment_gateway || 'stripe',
                stripePublicKey: data.stripe_public_key,
                stripeSecretKey: data.stripe_secret_key,
                paypalClientId: data.paypal_client_id,
                paypalClientSecret: data.paypal_client_secret,
                paypalMode: data.paypal_mode || 'sandbox',
                flutterwavePublicKey: data.flutterwave_public_key,
                flutterwaveSecretKey: data.flutterwave_secret_key,
                flutterwaveEncryptionKey: data.flutterwave_encryption_key,
                razorpayKeyId: data.razorpay_key_id,
                razorpayKeySecret: data.razorpay_key_secret,
                paystackSecretKey: data.paystack_secret_key,
                paystackCurrency: data.paystack_currency,

                metadata: {
                    ...(data.metadata || {}),
                    siteName: data.site_name,
                    siteUrl: data.site_url,
                    smtp: data.smtp_config
                }
            };
        } catch (error) {
            console.error("Error fetching settings:", error);
            throw error;
        }
    }

    async saveSettings(settings: SystemSettings): Promise<void> {
        const meta = settings.metadata || {};
        const storedMetadata = { ...meta };
        delete storedMetadata.siteName;
        delete storedMetadata.siteUrl;
        delete storedMetadata.smtp;

        await query(`
            INSERT INTO system_settings (
                id, default_tokens, ai_limits, payment_enabled, payment_gateway, 
                stripe_public_key, stripe_secret_key, paypal_client_id, 
                paypal_client_secret, paypal_mode, 
                flutterwave_public_key, flutterwave_secret_key, 
                flutterwave_encryption_key,
                razorpay_key_id, razorpay_key_secret,
                paystack_secret_key, paystack_currency,
                site_name, site_url, 
                smtp_config, show_ai_settings, show_demo_mode, metadata, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            ON CONFLICT (id) DO UPDATE SET
                default_tokens = EXCLUDED.default_tokens,
                ai_limits = EXCLUDED.ai_limits,
                payment_enabled = EXCLUDED.payment_enabled,
                show_ai_settings = EXCLUDED.show_ai_settings,
                show_demo_mode = EXCLUDED.show_demo_mode,
                payment_gateway = EXCLUDED.payment_gateway,
                stripe_public_key = EXCLUDED.stripe_public_key,
                stripe_secret_key = EXCLUDED.stripe_secret_key,
                paypal_client_id = EXCLUDED.paypal_client_id,
                paypal_client_secret = EXCLUDED.paypal_client_secret,
                paypal_mode = EXCLUDED.paypal_mode,
                flutterwave_public_key = EXCLUDED.flutterwave_public_key,
                flutterwave_secret_key = EXCLUDED.flutterwave_secret_key,
                flutterwave_encryption_key = EXCLUDED.flutterwave_encryption_key,
                razorpay_key_id = EXCLUDED.razorpay_key_id,
                razorpay_key_secret = EXCLUDED.razorpay_key_secret,
                paystack_secret_key = EXCLUDED.paystack_secret_key,
                paystack_currency = EXCLUDED.paystack_currency,
                site_name = EXCLUDED.site_name,
                site_url = EXCLUDED.site_url,
                smtp_config = EXCLUDED.smtp_config,
                metadata = EXCLUDED.metadata,
                updated_at = EXCLUDED.updated_at
        `, [
            1, settings.defaultTokens, settings.aiLimits, settings.paymentEnabled,
            settings.paymentGateway || 'stripe', settings.stripePublicKey,
            settings.stripeSecretKey, settings.paypalClientId,
            settings.paypalClientSecret, settings.paypalMode || 'sandbox',
            settings.flutterwavePublicKey, settings.flutterwaveSecretKey,
            settings.flutterwaveEncryptionKey,
            settings.razorpayKeyId, settings.razorpayKeySecret,
            settings.paystackSecretKey, settings.paystackCurrency || 'NGN',
            meta.siteName, meta.siteUrl, meta.smtp, settings.showAiSettings ?? true,
            settings.showDemoMode ?? false,
                storedMetadata, new Date().toISOString()
        ]);
    }

    // Pricing Plans
    async getPlans(): Promise<PricingPlan[]> {
        try {
            const res = await query('SELECT * FROM pricing_plans');
            if (res.rows.length === 0) return DEMO_PRICING_PLANS;

            return res.rows.map((p: any) => ({
                id: p.id,
                name: p.name,
                price: p.price,
                tokens: p.tokens,
                interval: p.interval,
                features: p.features,
                aiTools: p.ai_tools || [],
                isActive: p.is_active,
                description: p.description,
                popular: p.popular,
                cta: p.cta
            }));
        } catch (error) {
            console.error("Error fetching plans:", error);
            return DEMO_PRICING_PLANS;
        }
    }

    async savePlan(plan: PricingPlan): Promise<void> {
        await query(`
            INSERT INTO pricing_plans (id, name, price, tokens, interval, features, ai_tools, is_active, description, popular, cta)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                price = EXCLUDED.price,
                tokens = EXCLUDED.tokens,
                interval = EXCLUDED.interval,
                features = EXCLUDED.features,
                ai_tools = EXCLUDED.ai_tools,
                is_active = EXCLUDED.is_active,
                description = EXCLUDED.description,
                popular = EXCLUDED.popular,
                cta = EXCLUDED.cta
        `, [
            plan.id, plan.name, plan.price, plan.tokens, plan.interval,
            plan.features, plan.aiTools || [], plan.isActive,
            plan.description, plan.popular, plan.cta
        ]);
    }

    async deletePlan(planId: string): Promise<void> {
        await query('DELETE FROM pricing_plans WHERE id = $1', [planId]);
    }

    // Payments
    async savePayment(payment: PaymentRecord, txClient?: any): Promise<void> {
        const queryFn = txClient ? txClient.query.bind(txClient) : query;
        try {
            await queryFn(`
                INSERT INTO payments (id, user_id, user_email, plan_id, amount, status, payment_gateway, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO UPDATE SET
                    status = EXCLUDED.status,
                    amount = EXCLUDED.amount,
                    payment_gateway = EXCLUDED.payment_gateway
            `, [
                payment.id,
                payment.userId || null,
                payment.userEmail.toLowerCase(),
                payment.planId || null,
                payment.amount,
                payment.status,
                payment.paymentGateway || 'stripe',
                payment.createdAt
            ]);
        } catch (error: any) {
            throw new Error(`Error saving payment: ${error.message}`);
        }
    }

    async getPayments(limit = 50, txClient?: any): Promise<PaymentRecord[]> {
        const queryFn = txClient ? txClient.query.bind(txClient) : query;
        try {
            const res = await queryFn(`
                SELECT * FROM payments
                ORDER BY created_at DESC
                LIMIT $1
            `, [limit]);
            return res.rows.map((p: any) => ({
                id: p.id,
                userId: p.user_id,
                userEmail: p.user_email,
                planId: p.plan_id,
                amount: p.amount,
                status: p.status,
                paymentGateway: p.payment_gateway || 'stripe',
                createdAt: p.created_at instanceof Date ? p.created_at.toISOString() : p.created_at
            }));
        } catch (error) {
            return [];
        }
    }

    // Websites
    async getWebsite(id: string): Promise<WebsiteProject | null> {
        const { data, error } = await supabaseAdmin
            .from('websites')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            userEmail: data.user_email,
            name: data.name,
            code: data.code,
            subdomain: data.subdomain,
            messages: data.messages,
            previewImage: data.preview_image,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async getWebsiteBySubdomain(subdomain: string): Promise<WebsiteProject | null> {
        const { data, error } = await supabaseAdmin
            .from('websites')
            .select('*')
            .eq('subdomain', subdomain)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            userEmail: data.user_email,
            name: data.name,
            code: data.code,
            subdomain: data.subdomain,
            messages: data.messages,
            previewImage: data.preview_image,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async saveWebsite(project: WebsiteProject): Promise<void> {
        const { error } = await supabaseAdmin.from('websites').upsert({
            id: project.id,
            user_email: project.userEmail.toLowerCase(),
            name: project.name,
            code: project.code,
            subdomain: project.subdomain,
            messages: project.messages,
            preview_image: project.previewImage,
            created_at: project.createdAt,
            updated_at: project.updatedAt
        });
        if (error) throw new Error(`Error saving website: ${error.message}`);
    }

    async deleteWebsite(id: string): Promise<void> {
        const { error } = await supabaseAdmin.from('websites').delete().eq('id', id);
        if (error) throw new Error(`Error deleting website: ${error.message}`);
    }

    async getPresentation(id: string): Promise<PresentationProject | null> {
        try {
            const res = await query('SELECT * FROM presentations WHERE id = $1', [id]);
            const data = res.rows[0];
            if (!data) return null;
            return {
                id: data.id,
                userEmail: data.user_email,
                name: data.name,
                slides: data.slides,
                messages: data.messages || [],
                createdAt: data.created_at instanceof Date ? data.created_at.toISOString() : (data.created_at || new Date().toISOString()),
                updatedAt: data.updated_at instanceof Date ? data.updated_at.toISOString() : (data.updated_at || new Date().toISOString())
            };
        } catch (error) {
            console.error("Error in getPresentation:", error);
            return null;
        }
    }

    async savePresentation(project: PresentationProject): Promise<void> {
        try {
            await query(`
                INSERT INTO presentations (id, user_email, name, slides, messages, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    slides = EXCLUDED.slides,
                    messages = EXCLUDED.messages,
                    updated_at = EXCLUDED.updated_at
            `, [
                project.id,
                project.userEmail.toLowerCase(),
                project.name,
                JSON.stringify(project.slides),
                JSON.stringify(project.messages || []),
                project.createdAt || new Date().toISOString(),
                project.updatedAt || new Date().toISOString()
            ]);
        } catch (error) {
            console.error("Error in savePresentation:", error);
            throw error;
        }
    }

    async deletePresentation(id: string): Promise<void> {
        try {
            await query('DELETE FROM presentations WHERE id = $1', [id]);
        } catch (error) {
            console.error("Error in deletePresentation:", error);
            throw error;
        }
    }

    async listPresentations(userEmail: string): Promise<PresentationProject[]> {
        try {
            const res = await query('SELECT * FROM presentations WHERE LOWER(user_email) = LOWER($1) ORDER BY updated_at DESC', [userEmail]);
            return res.rows.map((data: any) => ({
                id: data.id,
                userEmail: data.user_email,
                name: data.name,
                slides: data.slides,
                messages: data.messages || [],
                createdAt: data.created_at instanceof Date ? data.created_at.toISOString() : (data.created_at || new Date().toISOString()),
                updatedAt: data.updated_at instanceof Date ? data.updated_at.toISOString() : (data.updated_at || new Date().toISOString())
            }));
        } catch (error) {
            console.error("Error in listPresentations:", error);
            return [];
        }
    }


    async listWebsites(userEmail: string): Promise<WebsiteProject[]> {
        const { data, error } = await supabaseAdmin
            .from('websites')
            .select('*')
            .eq('user_email', userEmail.toLowerCase())
            .order('updated_at', { ascending: false });

        if (error || !data) return [];

        return data.map((w: any) => ({
            id: w.id,
            userEmail: w.user_email,
            name: w.name,
            code: w.code,
            subdomain: w.subdomain,
            messages: w.messages,
            previewImage: w.preview_image,
            createdAt: w.created_at,
            updatedAt: w.updated_at
        }));
    }

    async listAllWebsites(): Promise<WebsiteProject[]> {
        const { data, error } = await supabaseAdmin
            .from('websites')
            .select('*')
            .not('subdomain', 'is', null)
            .neq('subdomain', '')
            .order('created_at', { ascending: false });

        if (error || !data) return [];

        return data.map((w: any) => ({
            id: w.id,
            userEmail: w.user_email,
            name: w.name,
            code: w.code,
            subdomain: w.subdomain,
            messages: w.messages,
            previewImage: w.preview_image,
            createdAt: w.created_at,
            updatedAt: w.updated_at
        }));
    }

    async getTotalWebsites(startDate?: Date, endDate?: Date): Promise<number> {
        let q = supabaseAdmin.from('websites').select('*', { count: 'exact', head: true });
        if (startDate && endDate) {
            q = q.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
        } else if (startDate) {
            q = q.gte('created_at', startDate.toISOString());
        }

        const { count, error } = await q;

        if (error) return 0;
        return count || 0;
    }

    async checkSubdomainAvailability(subdomain: string, excludeId?: string): Promise<boolean> {
        const { data, error } = await supabaseAdmin
            .from('websites')
            .select('id')
            .eq('subdomain', subdomain);

        if (error) return false;

        if (data && data.length > 0) {
            if (excludeId) {
                return !data.some((w: any) => w.id !== excludeId);
            }
            return false;
        }
        return true;
    }

    // Update Website Subdomain
    async updateWebsiteSubdomain(id: string, subdomain: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('websites')
            .update({ subdomain })
            .eq('id', id);
        if (error) throw new Error(`Error updating website subdomain: ${error.message}`);
    }

    // Custom Domains
    async addCustomDomain(domain: CustomDomain): Promise<void> {
        const { error } = await supabaseAdmin.from('custom_domains').insert({
            id: domain.id,
            domain: domain.domain.toLowerCase(),
            website_id: domain.websiteId,
            status: domain.status,
            created_at: domain.createdAt,
            updated_at: domain.updatedAt
        });
        if (error) throw new Error(`Error adding custom domain: ${error.message}`);
    }

    async getCustomDomain(domain: string): Promise<CustomDomain | null> {
        const { data, error } = await supabaseAdmin
            .from('custom_domains')
            .select('*')
            .eq('domain', domain.toLowerCase())
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            domain: data.domain,
            websiteId: data.website_id,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async getCustomDomainById(id: string): Promise<CustomDomain | null> {
        const { data, error } = await supabaseAdmin
            .from('custom_domains')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            domain: data.domain,
            websiteId: data.website_id,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async listCustomDomainsByWebsite(websiteId: string): Promise<CustomDomain[]> {
        const { data, error } = await supabaseAdmin
            .from('custom_domains')
            .select('*')
            .eq('website_id', websiteId)
            .order('created_at', { ascending: false });

        if (error || !data) return [];

        return data.map((d: any) => ({
            id: d.id,
            domain: d.domain,
            websiteId: d.website_id,
            status: d.status,
            createdAt: d.created_at,
            updatedAt: d.updated_at
        }));
    }

    async updateCustomDomainStatus(id: string, status: CustomDomain['status']): Promise<void> {
        const { error } = await supabaseAdmin
            .from('custom_domains')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw new Error(`Error updating custom domain status: ${error.message}`);
    }

    async deleteCustomDomain(id: string): Promise<void> {
        const { error } = await supabaseAdmin.from('custom_domains').delete().eq('id', id);
        if (error) throw new Error(`Error deleting custom domain: ${error.message}`);
    }

    // Subscriptions
    async saveSubscription(subscription: SubscriptionRecord, txClient?: any): Promise<void> {
        const queryFn = txClient ? txClient.query.bind(txClient) : query;
        try {
            await queryFn(`
                INSERT INTO subscriptions (id, user_email, plan_id, status, gateway, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE SET
                    status = EXCLUDED.status,
                    plan_id = EXCLUDED.plan_id,
                    gateway = COALESCE(EXCLUDED.gateway, subscriptions.gateway)
            `, [
                subscription.id,
                subscription.userEmail.toLowerCase(),
                subscription.planId,
                subscription.status,
                subscription.gateway || null,
                subscription.createdAt
            ]);
        } catch (error: any) {
            throw new Error(`Error saving subscription: ${error.message}`);
        }
    }

    async getActiveSubscriptionByEmail(email: string): Promise<SubscriptionRecord | null> {
        try {
            const res = await query(`
                SELECT * FROM subscriptions
                WHERE LOWER(user_email) = LOWER($1) AND status IN ('active', 'trialing')
                ORDER BY created_at DESC
                LIMIT 1
            `, [email]);
            const row = res.rows[0];
            if (!row) return null;
            return {
                id: row.id,
                userEmail: row.user_email,
                planId: row.plan_id,
                status: row.status,
                gateway: row.gateway || undefined,
                createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
            };
        } catch (e) {
            console.error('Error getting active subscription:', e);
            return null;
        }
    }

    async getUserPlan(email: string): Promise<{ planId: string | null, planName: string | null, aiTools: string[], tokens?: number | null }> {
        try {
            const res = await query(`
                SELECT s.plan_id, p.name as plan_name, p.ai_tools, p.tokens
                FROM subscriptions s
                JOIN pricing_plans p ON s.plan_id = p.id
                WHERE LOWER(s.user_email) = LOWER($1) AND s.status IN ('active', 'trialing')
                ORDER BY s.created_at DESC
                LIMIT 1
            `, [email]);

            const data = res.rows[0];
            if (data) {
                return {
                    planId: data.plan_id,
                    planName: data.plan_name,
                    aiTools: data.ai_tools || [],
                    tokens: data.tokens || null
                };
            }

            return { planId: null, planName: null, aiTools: [], tokens: null };
        } catch (error) {
            console.error("Error in getUserPlan:", error);
            return { planId: null, planName: null, aiTools: [], tokens: null };
        }
    }

    // Documents & RAG
    async saveDocument(doc: Partial<Document> & { userEmail: string; name: string }): Promise<Document> {
        const { data, error } = await supabaseAdmin
            .from('documents')
            .insert({
                user_email: doc.userEmail.toLowerCase(),
                name: doc.name,
                status: doc.status || 'processing',
                metadata: doc.metadata || {}
            })
            .select()
            .single();

        if (error) throw new Error(`Error saving document: ${error.message}`);
        return {
            id: data.id,
            userEmail: data.user_email,
            name: data.name,
            status: data.status,
            metadata: data.metadata,
            createdAt: data.created_at
        };
    }

    async updateDocumentStatus(id: string, status: Document['status']): Promise<void> {
        const { error } = await supabaseAdmin
            .from('documents')
            .update({ status })
            .eq('id', id);

        if (error) throw new Error(`Error updating document status: ${error.message}`);
    }

    async listDocuments(userEmail: string): Promise<Document[]> {
        const { data, error } = await supabaseAdmin
            .from('documents')
            .select('*')
            .eq('user_email', userEmail.toLowerCase())
            .order('created_at', { ascending: false });

        if (error || !data) return [];
        return data.map(d => ({
            id: d.id,
            userEmail: d.user_email,
            name: d.name,
            status: d.status,
            metadata: d.metadata,
            createdAt: d.created_at
        }));
    }

    async deleteDocument(id: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('documents')
            .delete()
            .eq('id', id);
        if (error) throw new Error(`Error deleting document: ${error.message}`);
    }

    async saveDocumentChunks(chunks: { documentId: string; content: string; embedding: number[] }[]): Promise<void> {
        const { error } = await supabaseAdmin
            .from('document_chunks')
            .insert(chunks.map(c => ({
                document_id: c.documentId,
                content: (c.content || "").replace(/\u0000/g, ""), // Final safety check for null characters
                embedding: c.embedding
            })));

        if (error) throw new Error(`Error saving document chunks: ${error.message}`);
    }

    async matchDocumentChunks(userEmail: string, embedding: number[], limit = 5, threshold = 0.5): Promise<DocumentChunk[]> {
        debugLog(`matchDocumentChunks: email=${userEmail}, limit=${limit}, threshold=${threshold}`);
        const { data, error } = await supabaseAdmin.rpc('match_document_chunks', {
            query_embedding: embedding,
            match_threshold: threshold,
            match_count: limit,
            p_user_email: userEmail.toLowerCase()
        });

        if (error) {
            debugLog(`matchDocumentChunks ERROR: ${error.message}`);
            throw new Error(`Error matching document chunks: ${error.message}`);
        }

        debugLog(`matchDocumentChunks: Found ${data?.length || 0} matches`);
        return (data || []).map((d: any) => ({
            id: d.id,
            documentId: d.document_id,
            content: d.content,
            similarity: d.similarity
        }));
    }

    async keywordSearchChunks(userEmail: string, query: string, limit = 5): Promise<DocumentChunk[]> {
        debugLog(`keywordSearchChunks: email=${userEmail}, query=${query}, limit=${limit}`);
        const { data, error } = await supabaseAdmin.rpc('keyword_search_chunks', {
            query_text: query,
            match_count: limit,
            p_user_email: userEmail.toLowerCase()
        });

        if (error) {
            debugLog(`keywordSearchChunks ERROR: ${error.message}`);
            return [];
        }

        return (data || []).map((d: any) => ({
            id: d.id,
            documentId: d.document_id,
            content: d.content,
            similarity: d.similarity
        }));
    }

    // Dashboard Analytics & Aggregation
    async getRevenueStats(startDate?: Date, endDate?: Date): Promise<{ totalRevenue: number, monthlyRevenue: number, revenueData: any[] }> {
        try {
            let queryStr = "SELECT amount, created_at FROM payments WHERE status = 'succeeded'";
            let usersQueryStr = 'SELECT email, created_at FROM users';
            const params: any[] = [];
            
            if (startDate && endDate) {
                queryStr += ' AND created_at >= $1 AND created_at <= $2';
                usersQueryStr += ' WHERE created_at >= $1 AND created_at <= $2';
                params.push(startDate, endDate);
            } else if (startDate) {
                queryStr += ' AND created_at >= $1';
                usersQueryStr += ' WHERE created_at >= $1';
                params.push(startDate);
            }
            
            const paymentsRes = await query(queryStr, params);
            const payments = paymentsRes.rows;

            let totalRevenue = 0;
            let monthlyRevenue = 0;
            const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthlyData: Record<string, { revenue: number, users: Set<string> }> = {};
            
            monthsOrder.forEach(m => {
                monthlyData[m] = { revenue: 0, users: new Set() };
            });

            const usersRes = await query(usersQueryStr, params);
            const usersData = usersRes.rows;

            const currentMonth = new Date().toLocaleString('default', { month: 'short' });
            const currentYear = new Date().getFullYear();

            payments.forEach((p: any) => {
                totalRevenue += p.amount;
                const date = p.created_at instanceof Date ? p.created_at : new Date(p.created_at);
                const month = date.toLocaleString('default', { month: 'short' });
                if (!monthlyData[month]) monthlyData[month] = { revenue: 0, users: new Set() };
                monthlyData[month].revenue += p.amount;

                if (month === currentMonth && date.getFullYear() === currentYear) {
                    monthlyRevenue += p.amount;
                }
            });

            if (usersData) {
                usersData.forEach((u: any) => {
                    const date = u.created_at instanceof Date ? u.created_at : new Date(u.created_at);
                    const month = date.toLocaleString('default', { month: 'short' });
                    if (!monthlyData[month]) monthlyData[month] = { revenue: 0, users: new Set() };
                    monthlyData[month].users.add(u.email);
                });
            }

            const revenueData = Object.keys(monthlyData).map(month => ({
                month,
                revenue: monthlyData[month].revenue,
                users: monthlyData[month].users.size
            }));

            revenueData.sort((a, b) => monthsOrder.indexOf(a.month) - monthsOrder.indexOf(b.month));

            return { totalRevenue, monthlyRevenue, revenueData };
        } catch (error) {
            console.error("Error in getRevenueStats:", error);
            return { totalRevenue: 0, monthlyRevenue: 0, revenueData: [] };
        }
    }

    async getToolUsageDistribution(startDate?: Date, endDate?: Date): Promise<any[]> {
        let q = supabaseAdmin
            .from('token_logs')
            .select('amount, feature')
            .eq('action', 'consume');
            
        if (startDate && endDate) {
            q = q.gte('timestamp', startDate.toISOString()).lte('timestamp', endDate.toISOString());
        } else if (startDate) {
            q = q.gte('timestamp', startDate.toISOString());
        }

        const { data, error } = await q;

        if (error || !data) return [];

        const featureMap: Record<string, number> = {};
        let totalTokens = 0;
        data.forEach((log: any) => {
            const feature = log.feature || 'Other';
            featureMap[feature] = (featureMap[feature] || 0) + log.amount;
            totalTokens += log.amount;
        });

        const colors = ["#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#6b7280", "#3b82f6", "#ef4444"];
        let i = 0;

        const toolUsageData = Object.keys(featureMap).map(name => {
            const percentage = totalTokens > 0 ? Math.round((featureMap[name] / totalTokens) * 100) : 0;
            return {
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value: percentage,
                color: colors[i++ % colors.length]
            };
        });

        return toolUsageData.sort((a, b) => b.value - a.value);
    }

    async getDashboardRecentActivities(startDate?: Date, endDate?: Date): Promise<any[]> {
        const activities: any[] = [];
        
        let usersQ = supabaseAdmin.from('users').select('email, created_at').order('created_at', { ascending: false }).limit(5);
        if (startDate && endDate) {
             usersQ = usersQ.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
        } else if (startDate) {
             usersQ = usersQ.gte('created_at', startDate.toISOString());
        }
        
        const { data: users } = await usersQ;
        if (users) {
            users.forEach((u: any) => {
                activities.push({
                    type: "signup",
                    user: u.email,
                    timestamp: new Date(u.created_at).getTime(),
                });
            });
        }
        
        let paymentsQ = supabaseAdmin.from('payments').select('user_email, amount, created_at').order('created_at', { ascending: false }).limit(5);
        if (startDate && endDate) {
             paymentsQ = paymentsQ.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
        } else if (startDate) {
             paymentsQ = paymentsQ.gte('created_at', startDate.toISOString());
        }
        const { data: payments } = await paymentsQ;
        if (payments) {
            payments.forEach((p: any) => {
                activities.push({
                    type: "payment",
                    user: p.user_email,
                    amount: `$${p.amount}`,
                    timestamp: new Date(p.created_at).getTime(),
                });
            });
        }

        activities.sort((a, b) => b.timestamp - a.timestamp);

        const now = Date.now();
        const formatted = activities.slice(0, 5).map(a => {
            const diffInMins = Math.floor((now - a.timestamp) / 60000);
            let timeStr = `${diffInMins} min ago`;
            if (diffInMins >= 60) {
                const hrs = Math.floor(diffInMins / 60);
                timeStr = `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
            }
            if (diffInMins >= 1440) {
                const days = Math.floor(diffInMins / 1440);
                timeStr = `${days} day${days > 1 ? 's' : ''} ago`;
            }
            return {
                type: a.type,
                user: a.user,
                amount: a.amount,
                time: timeStr
            };
        });

        return formatted;
    }

    // ==================== i18n: Languages ====================

    async getLanguages(): Promise<Language[]> {
        try {
            const res = await query(`SELECT * FROM languages ORDER BY created_at ASC`);
            return res.rows.map((l: any) => ({
                id: l.id,
                code: l.code,
                name: l.name,
                direction: l.direction,
                isEnabled: l.is_enabled,
                createdAt: l.created_at
            }));
        } catch (error) {
            console.error("Error in getLanguages:", error);
            return [];
        }
    }

    async saveLanguage(language: Language): Promise<Language> {
        const res = await query(`
            INSERT INTO languages (code, name, direction, is_enabled)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (code) DO UPDATE SET
                name = EXCLUDED.name,
                direction = EXCLUDED.direction,
                is_enabled = EXCLUDED.is_enabled
            RETURNING *
        `, [
            language.code,
            language.name,
            language.direction || 'ltr',
            language.isEnabled !== false
        ]);
        const data = res.rows[0];
        return {
            id: data.id,
            code: data.code,
            name: data.name,
            direction: data.direction,
            isEnabled: data.is_enabled,
            createdAt: data.created_at
        };
    }

    async toggleLanguage(id: string, isEnabled: boolean): Promise<void> {
        await query(`UPDATE languages SET is_enabled = $1 WHERE id = $2`, [isEnabled, id]);
    }

    async deleteLanguage(id: string): Promise<void> {
        await query(`DELETE FROM languages WHERE id = $1`, [id]);
    }

    // ==================== i18n: Translations ====================

    async getTranslationKeys(): Promise<string[]> {
        try {
            const res = await query(`SELECT DISTINCT translation_key FROM translations ORDER BY translation_key ASC`);
            return res.rows.map((d: any) => d.translation_key);
        } catch (error) {
            console.error("Error in getTranslationKeys:", error);
            return [];
        }
    }

    async getTranslationsForLanguage(languageCode: string): Promise<Record<string, string>> {
        try {
            const res = await query(
                `SELECT translation_key, value FROM translations WHERE language_code = $1`,
                [languageCode]
            );
            const result: Record<string, string> = {};
            res.rows.forEach((d: any) => {
                result[d.translation_key] = d.value;
            });
            return result;
        } catch (error) {
            console.error("Error in getTranslationsForLanguage:", error);
            return {};
        }
    }

    async getAllTranslations(): Promise<Translation[]> {
        try {
            const res = await query(`SELECT * FROM translations ORDER BY translation_key ASC`);
            return res.rows.map((d: any) => ({
                id: d.id,
                translationKey: d.translation_key,
                languageCode: d.language_code,
                value: d.value,
                updatedAt: d.updated_at
            }));
        } catch (error) {
            console.error("Error in getAllTranslations:", error);
            return [];
        }
    }

    async saveTranslation(translation: Translation): Promise<void> {
        await query(`
            INSERT INTO translations (translation_key, language_code, value, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (translation_key, language_code)
            DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `, [translation.translationKey, translation.languageCode, translation.value]);
    }

    async bulkSaveTranslations(translations: Translation[]): Promise<void> {
        if (translations.length === 0) return;
        const batchSize = 500;
        for (let i = 0; i < translations.length; i += batchSize) {
            const chunk = translations.slice(i, i + batchSize);
            const valuePlaceholders: string[] = [];
            const params: any[] = [];
            chunk.forEach((item, index) => {
                const baseIndex = index * 3;
                valuePlaceholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, NOW())`);
                params.push(item.translationKey, item.languageCode, item.value);
            });
            const insertQuery = `
                INSERT INTO translations (translation_key, language_code, value, updated_at)
                VALUES ${valuePlaceholders.join(', ')}
                ON CONFLICT (translation_key, language_code)
                DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            `;
            await query(insertQuery, params);
        }
    }

    async deleteTranslationKey(key: string): Promise<void> {
        await query(`DELETE FROM translations WHERE translation_key = $1`, [key]);
    }

    // ==================== Meetings ====================

    async createMeeting(id: string, title: string, hostEmail: string): Promise<{ id: string; title: string; hostEmail: string; status: string; createdAt: string }> {
        const { data, error } = await supabaseAdmin
            .from('meetings')
            .insert({
                id,
                title,
                host_email: hostEmail.toLowerCase(),
                status: 'active',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw new Error(`Error creating meeting: ${error.message}`);

        return {
            id: data.id,
            title: data.title,
            hostEmail: data.host_email,
            status: data.status,
            createdAt: data.created_at
        };
    }

    async getMeeting(id: string): Promise<{ id: string; title: string; hostEmail: string; status: string; maxParticipants: number; createdAt: string; endedAt: string | null } | null> {
        const { data, error } = await supabaseAdmin
            .from('meetings')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            title: data.title,
            hostEmail: data.host_email,
            status: data.status,
            maxParticipants: data.max_participants,
            createdAt: data.created_at,
            endedAt: data.ended_at
        };
    }

    async endMeeting(id: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('meetings')
            .update({ status: 'ended', ended_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw new Error(`Error ending meeting: ${error.message}`);
    }

    async listUserMeetings(email: string, limit = 20): Promise<{ id: string; title: string; status: string; createdAt: string; endedAt: string | null }[]> {
        const { data, error } = await supabaseAdmin
            .from('meetings')
            .select('*')
            .eq('host_email', email.toLowerCase())
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !data) return [];

        return data.map((m: any) => ({
            id: m.id,
            title: m.title,
            status: m.status,
            createdAt: m.created_at,
            endedAt: m.ended_at
        }));
    }

    // ==================== Games ====================

    async getGame(id: string): Promise<GameProject | null> {
        const res = await query('SELECT * FROM games WHERE id = $1', [id]);
        const data = res.rows[0];

        if (!data) return null;

        return {
            id: data.id,
            userEmail: data.user_email,
            name: data.name,
            code: data.code,
            prompt: data.prompt,
            genre: data.genre,
            visualStyle: data.visual_style,
            previewImage: data.preview_image,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async saveGame(project: GameProject): Promise<void> {
        await query(`
            INSERT INTO games (
                id, user_email, name, code, prompt, genre, visual_style, 
                preview_image, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                code = EXCLUDED.code,
                prompt = EXCLUDED.prompt,
                genre = EXCLUDED.genre,
                visual_style = EXCLUDED.visual_style,
                preview_image = EXCLUDED.preview_image,
                updated_at = EXCLUDED.updated_at
        `, [
            project.id, project.userEmail.toLowerCase(), project.name, project.code,
            project.prompt, project.genre, project.visualStyle,
            project.previewImage, project.createdAt, project.updatedAt
        ]);
    }

    async deleteGame(id: string): Promise<void> {
        await query('DELETE FROM games WHERE id = $1', [id]);
    }

    async listGames(userEmail: string): Promise<GameProject[]> {
        const res = await query('SELECT * FROM games WHERE user_email = $1 ORDER BY updated_at DESC', [userEmail.toLowerCase()]);

        return res.rows.map((data: any) => ({
            id: data.id,
            userEmail: data.user_email,
            name: data.name,
            code: data.code,
            prompt: data.prompt,
            genre: data.genre,
            visualStyle: data.visual_style,
            previewImage: data.preview_image,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        }));
    }

    // ==================== 2FA & Email Verification Helpers ====================

    async updateTwoFactor(email: string, secret: string | null, enabled: boolean): Promise<void> {
        try {
            await query(
                'UPDATE users SET two_factor_secret = $1, two_factor_enabled = $2 WHERE LOWER(email) = LOWER($3)',
                [secret, enabled, email]
            );
        } catch (error) {
            console.error("Error in updateTwoFactor:", error);
            throw error;
        }
    }

    async saveRecoveryCodes(email: string, hashedCodes: string[]): Promise<void> {
        try {
            // Delete old recovery codes first
            await query('DELETE FROM two_factor_recovery_codes WHERE LOWER(user_email) = LOWER($1)', [email]);

            // Insert new ones
            for (const code of hashedCodes) {
                await query(
                    'INSERT INTO two_factor_recovery_codes (user_email, code) VALUES ($1, $2)',
                    [email.toLowerCase(), code]
                );
            }
        } catch (error) {
            console.error("Error in saveRecoveryCodes:", error);
            throw error;
        }
    }

    async verifyAndUseRecoveryCode(email: string, code: string): Promise<boolean> {
        try {
            const res = await query(
                'SELECT id, code FROM two_factor_recovery_codes WHERE LOWER(user_email) = LOWER($1) AND used = false',
                [email]
            );

            const records = res.rows;
            for (const record of records) {
                const isMatch = await bcrypt.compare(code, record.code);
                if (isMatch) {
                    await query(
                        'UPDATE two_factor_recovery_codes SET used = true WHERE id = $1',
                        [record.id]
                    );
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error("Error in verifyAndUseRecoveryCode:", error);
            return false;
        }
    }

    async log2FAEvent(
        email: string,
        action: string,
        ipAddress: string | null,
        userAgent: string | null,
        metadata: any = {}
    ): Promise<void> {
        try {
            await query(
                `INSERT INTO two_factor_audit_log (user_email, action, ip_address, user_agent, metadata)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    email.toLowerCase(),
                    action,
                    ipAddress || null,
                    userAgent || null,
                    JSON.stringify(metadata)
                ]
            );
        } catch (error) {
            console.error("Error in log2FAEvent:", error);
        }
    }

    async recordLoginAttempt(
        email: string,
        ipAddress: string | null,
        success: boolean
    ): Promise<void> {
        try {
            await query(
                `INSERT INTO login_attempts (email, ip_address, success)
                 VALUES ($1, $2, $3)`,
                [email.toLowerCase(), ipAddress || null, success]
            );
        } catch (error) {
            console.error("Error in recordLoginAttempt:", error);
        }
    }

    // Transactions and Webhooks
    async executeTx<T>(callback: (client: any) => Promise<T>): Promise<T> {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async hasWebhookEvent(eventId: string): Promise<boolean> {
        try {
            const res = await query('SELECT event_id FROM webhook_events WHERE event_id = $1 LIMIT 1', [eventId]);
            return (res.rowCount ?? 0) > 0;
        } catch (e) {
            console.error('Error checking webhook event:', e);
            return false;
        }
    }

    async saveWebhookEvent(eventId: string, gateway: string, eventType: string, txClient?: any): Promise<void> {
        const queryFn = txClient ? txClient.query.bind(txClient) : query;
        try {
            await queryFn(`
                INSERT INTO webhook_events (event_id, gateway, event_type, status, created_at)
                VALUES ($1, $2, $3, 'processed', NOW())
                ON CONFLICT (event_id) DO NOTHING
            `, [eventId, gateway, eventType]);
        } catch (error: any) {
            throw new Error(`Error saving webhook event: ${error.message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Notifications
    // ═══════════════════════════════════════════════════════════════════

    async createNotification(data: {
        title: string;
        content: string;
        description?: string;
        severity?: string;
        icon?: string;
        iconUrl?: string;
        isGlobal?: boolean;
        isPinned?: boolean;
        allowReplies?: boolean;
        createdBy: string;
        scheduledAt?: string;
        expiresAt?: string;
        status?: string;
    }): Promise<any> {
        try {
            const res = await query(`
                INSERT INTO notifications (
                    title, content, description, severity, icon, icon_url,
                    is_global, is_pinned, allow_replies, created_by,
                    scheduled_at, expires_at, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `, [
                data.title,
                data.content,
                data.description || null,
                data.severity || 'info',
                data.icon || 'info',
                data.iconUrl || null,
                data.isGlobal || false,
                data.isPinned || false,
                data.allowReplies ?? true,
                data.createdBy.toLowerCase(),
                data.scheduledAt || null,
                data.expiresAt || null,
                data.status || 'draft'
            ]);
            return res.rows[0];
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    async updateNotification(id: string, data: Record<string, any>): Promise<any> {
        try {
            const setClauses: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            const fieldMap: Record<string, string> = {
                title: 'title', content: 'content', description: 'description',
                severity: 'severity', icon: 'icon', iconUrl: 'icon_url',
                isGlobal: 'is_global', isPinned: 'is_pinned',
                allowReplies: 'allow_replies', scheduledAt: 'scheduled_at',
                expiresAt: 'expires_at', status: 'status'
            };

            for (const [key, dbCol] of Object.entries(fieldMap)) {
                if (data[key] !== undefined) {
                    setClauses.push(`${dbCol} = $${paramIndex}`);
                    values.push(data[key]);
                    paramIndex++;
                }
            }

            setClauses.push(`updated_at = NOW()`);
            values.push(id);

            const res = await query(`
                UPDATE notifications SET ${setClauses.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `, values);
            return res.rows[0];
        } catch (error) {
            console.error('Error updating notification:', error);
            throw error;
        }
    }

    async deleteNotification(id: string): Promise<void> {
        try {
            await query('DELETE FROM notifications WHERE id = $1', [id]);
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    async getNotification(id: string): Promise<any> {
        try {
            const res = await query(`
                SELECT n.*, u.name as creator_name
                FROM notifications n
                LEFT JOIN users u ON LOWER(u.email) = LOWER(n.created_by)
                WHERE n.id = $1
            `, [id]);
            return res.rows[0] || null;
        } catch (error) {
            console.error('Error getting notification:', error);
            return null;
        }
    }

    async listNotifications(filters?: {
        status?: string;
        severity?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ notifications: any[]; total: number }> {
        try {
            const conditions: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (filters?.status) {
                conditions.push(`n.status = $${paramIndex}`);
                values.push(filters.status);
                paramIndex++;
            }
            if (filters?.severity) {
                conditions.push(`n.severity = $${paramIndex}`);
                values.push(filters.severity);
                paramIndex++;
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const limit = filters?.limit || 50;
            const offset = filters?.offset || 0;

            // Get total count
            const countRes = await query(`SELECT COUNT(*) as total FROM notifications n ${whereClause}`, values);
            const total = parseInt(countRes.rows[0].total || '0');

            // Get notifications with recipient counts
            const res = await query(`
                SELECT n.*, u.name as creator_name,
                    (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.id) as recipient_count,
                    (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.id AND nr.is_read = true) as read_count,
                    (SELECT COUNT(*) FROM notification_messages nm WHERE nm.notification_id = n.id) as message_count
                FROM notifications n
                LEFT JOIN users u ON LOWER(u.email) = LOWER(n.created_by)
                ${whereClause}
                ORDER BY n.is_pinned DESC, n.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, [...values, limit, offset]);

            return { notifications: res.rows, total };
        } catch (error) {
            console.error('Error listing notifications:', error);
            return { notifications: [], total: 0 };
        }
    }

    async sendNotification(notificationId: string, recipientEmails?: string[]): Promise<void> {
        try {
            const notification = await this.getNotification(notificationId);
            if (!notification) throw new Error('Notification not found');

            if (notification.is_global) {
                // Send to all users
                const usersRes = await query('SELECT email FROM users');
                const allEmails = usersRes.rows.map((u: any) => u.email.toLowerCase());

                for (const email of allEmails) {
                    await query(`
                        INSERT INTO notification_recipients (notification_id, user_email)
                        VALUES ($1, $2)
                        ON CONFLICT (notification_id, user_email) DO NOTHING
                    `, [notificationId, email]);
                }
            } else if (recipientEmails && recipientEmails.length > 0) {
                for (const email of recipientEmails) {
                    await query(`
                        INSERT INTO notification_recipients (notification_id, user_email)
                        VALUES ($1, $2)
                        ON CONFLICT (notification_id, user_email) DO NOTHING
                    `, [notificationId, email.toLowerCase()]);
                }
            }

            // Update status to sent
            await query(`
                UPDATE notifications SET status = 'sent', updated_at = NOW()
                WHERE id = $1
            `, [notificationId]);
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }

    async getUserNotifications(email: string, filters?: {
        severity?: string;
        isRead?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
        try {
            const lowerEmail = email.toLowerCase();
            const conditions: string[] = [
                'nr.user_email = $1',
                'nr.is_deleted = false',
                "n.status = 'sent'"
            ];
            const values: any[] = [lowerEmail];
            let paramIndex = 2;

            if (filters?.severity) {
                conditions.push(`n.severity = $${paramIndex}`);
                values.push(filters.severity);
                paramIndex++;
            }
            if (filters?.isRead !== undefined) {
                conditions.push(`nr.is_read = $${paramIndex}`);
                values.push(filters.isRead);
                paramIndex++;
            }

            // Filter out expired notifications
            conditions.push(`(n.expires_at IS NULL OR n.expires_at > NOW())`);

            const whereClause = `WHERE ${conditions.join(' AND ')}`;

            // Get total count
            const countRes = await query(`
                SELECT COUNT(*) as total FROM notification_recipients nr
                JOIN notifications n ON n.id = nr.notification_id
                ${whereClause}
            `, values);
            const total = parseInt(countRes.rows[0].total || '0');

            // Get unread count (always for this user, regardless of filters)
            const unreadRes = await query(`
                SELECT COUNT(*) as unread FROM notification_recipients nr
                JOIN notifications n ON n.id = nr.notification_id
                WHERE nr.user_email = $1 AND nr.is_deleted = false AND nr.is_read = false
                AND n.status = 'sent' AND (n.expires_at IS NULL OR n.expires_at > NOW())
            `, [lowerEmail]);
            const unreadCount = parseInt(unreadRes.rows[0].unread || '0');

            const limit = filters?.limit || 20;
            const offset = filters?.offset || 0;

            const res = await query(`
                SELECT n.id, n.title, n.description, n.content, n.severity, n.icon, n.icon_url,
                    n.is_pinned, n.allow_replies, n.created_by, n.created_at, n.expires_at,
                    nr.is_read, nr.read_at, nr.created_at as received_at,
                    u.name as creator_name,
                    (SELECT COUNT(*) FROM notification_messages nm WHERE nm.notification_id = n.id) as message_count
                FROM notification_recipients nr
                JOIN notifications n ON n.id = nr.notification_id
                LEFT JOIN users u ON LOWER(u.email) = LOWER(n.created_by)
                ${whereClause}
                ORDER BY n.is_pinned DESC, nr.is_read ASC, n.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, [...values, limit, offset]);

            return { notifications: res.rows, total, unreadCount };
        } catch (error) {
            console.error('Error getting user notifications:', error);
            return { notifications: [], total: 0, unreadCount: 0 };
        }
    }

    async getUnreadNotificationCount(email: string): Promise<number> {
        try {
            const res = await query(`
                SELECT COUNT(*) as unread FROM notification_recipients nr
                JOIN notifications n ON n.id = nr.notification_id
                WHERE nr.user_email = $1 AND nr.is_deleted = false AND nr.is_read = false
                AND n.status = 'sent' AND (n.expires_at IS NULL OR n.expires_at > NOW())
            `, [email.toLowerCase()]);
            return parseInt(res.rows[0].unread || '0');
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }

    async markNotificationRead(notificationId: string, email: string): Promise<void> {
        try {
            await query(`
                UPDATE notification_recipients
                SET is_read = true, read_at = NOW()
                WHERE notification_id = $1 AND LOWER(user_email) = LOWER($2)
            `, [notificationId, email]);
        } catch (error) {
            console.error('Error marking notification read:', error);
            throw error;
        }
    }

    async markAllNotificationsRead(email: string): Promise<void> {
        try {
            await query(`
                UPDATE notification_recipients
                SET is_read = true, read_at = NOW()
                WHERE LOWER(user_email) = LOWER($1) AND is_read = false
            `, [email]);
        } catch (error) {
            console.error('Error marking all notifications read:', error);
            throw error;
        }
    }

    async deleteUserNotification(notificationId: string, email: string): Promise<void> {
        try {
            await query(`
                UPDATE notification_recipients
                SET is_deleted = true
                WHERE notification_id = $1 AND LOWER(user_email) = LOWER($2)
            `, [notificationId, email]);
        } catch (error) {
            console.error('Error deleting user notification:', error);
            throw error;
        }
    }

    async addNotificationMessage(data: {
        notificationId: string;
        senderEmail: string;
        senderRole: string;
        message: string;
    }): Promise<any> {
        try {
            const res = await query(`
                INSERT INTO notification_messages (notification_id, sender_email, sender_role, message)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `, [data.notificationId, data.senderEmail.toLowerCase(), data.senderRole, data.message]);
            return res.rows[0];
        } catch (error) {
            console.error('Error adding notification message:', error);
            throw error;
        }
    }

    async getNotificationMessages(notificationId: string): Promise<any[]> {
        try {
            const res = await query(`
                SELECT nm.*, u.name as sender_name
                FROM notification_messages nm
                LEFT JOIN users u ON LOWER(u.email) = LOWER(nm.sender_email)
                WHERE nm.notification_id = $1
                ORDER BY nm.created_at ASC
            `, [notificationId]);
            return res.rows;
        } catch (error) {
            console.error('Error getting notification messages:', error);
            return [];
        }
    }

    async markConversationMessagesRead(notificationId: string, readerEmail: string): Promise<void> {
        try {
            // Mark messages from others as read
            await query(`
                UPDATE notification_messages
                SET is_read = true
                WHERE notification_id = $1 AND LOWER(sender_email) != LOWER($2)
            `, [notificationId, readerEmail]);
        } catch (error) {
            console.error('Error marking conversation messages read:', error);
        }
    }

    async getNotificationConversations(filters?: {
        limit?: number;
        offset?: number;
    }): Promise<{ conversations: any[]; total: number }> {
        try {
            const limit = filters?.limit || 50;
            const offset = filters?.offset || 0;

            const countRes = await query(`
                SELECT COUNT(DISTINCT n.id) as total
                FROM notifications n
                WHERE n.allow_replies = true AND n.status = 'sent'
                AND EXISTS (SELECT 1 FROM notification_messages nm WHERE nm.notification_id = n.id)
            `);
            const total = parseInt(countRes.rows[0].total || '0');

            const res = await query(`
                SELECT n.id, n.title, n.severity, n.created_by, n.created_at,
                    u.name as creator_name,
                    (SELECT COUNT(*) FROM notification_messages nm WHERE nm.notification_id = n.id) as message_count,
                    (SELECT COUNT(*) FROM notification_messages nm WHERE nm.notification_id = n.id AND nm.is_read = false AND nm.sender_role = 'user') as unread_user_messages,
                    (SELECT nm2.message FROM notification_messages nm2 WHERE nm2.notification_id = n.id ORDER BY nm2.created_at DESC LIMIT 1) as last_message,
                    (SELECT nm3.created_at FROM notification_messages nm3 WHERE nm3.notification_id = n.id ORDER BY nm3.created_at DESC LIMIT 1) as last_message_at,
                    (SELECT nm4.sender_role FROM notification_messages nm4 WHERE nm4.notification_id = n.id ORDER BY nm4.created_at DESC LIMIT 1) as last_message_role
                FROM notifications n
                LEFT JOIN users u ON LOWER(u.email) = LOWER(n.created_by)
                WHERE n.allow_replies = true AND n.status = 'sent'
                AND EXISTS (SELECT 1 FROM notification_messages nm WHERE nm.notification_id = n.id)
                ORDER BY (SELECT MAX(nm5.created_at) FROM notification_messages nm5 WHERE nm5.notification_id = n.id) DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]);

            return { conversations: res.rows, total };
        } catch (error) {
            console.error('Error getting notification conversations:', error);
            return { conversations: [], total: 0 };
        }
    }

    async getNotificationRecipients(notificationId: string): Promise<any[]> {
        try {
            const res = await query(`
                SELECT nr.*, u.name as user_name
                FROM notification_recipients nr
                LEFT JOIN users u ON LOWER(u.email) = LOWER(nr.user_email)
                WHERE nr.notification_id = $1
                ORDER BY nr.created_at DESC
            `, [notificationId]);
            return res.rows;
        } catch (error) {
            console.error('Error getting notification recipients:', error);
            return [];
        }
    }
}

export const db = new SystemDB();


import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { getEmbedding } from '@/lib/rag';
import { extractTextFromFile, chunkText } from '@/lib/docProcessor';
import { translationsData } from '@/lib/seed_translations';

// ============================================================================
// CRON DATABASE SEED ROUTE
// ============================================================================
// This API is designed to be triggered as a Vercel cron job (or manually).
// It performs a FULL RESET of the database and inserts rich, realistic demo
// data across all tables. Safe to run multiple times (idempotent).
//
// Execution order:
//   1. DELETE all data (children-first to respect FK constraints)
//   2. INSERT seed data (parents-first to satisfy FK constraints)
// ============================================================================

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for seeding

// ---------------------------------------------------------------------------
// Helper: Generate a date N days ago from now
// ---------------------------------------------------------------------------
function daysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
}

// ---------------------------------------------------------------------------
// Helper: Generate a date N hours ago from now
// ---------------------------------------------------------------------------
function hoursAgo(hours: number): string {
    const d = new Date();
    d.setHours(d.getHours() - hours);
    return d.toISOString();
}

// ---------------------------------------------------------------------------
// STEP 1: Truncate all tables (children-first order)
// ---------------------------------------------------------------------------
async function truncateAllTables() {
    // Order matters: delete from child tables first to avoid FK violations.
    // Supabase JS doesn't support raw TRUNCATE, so we use delete with a
    // broad filter. The neq('id','__impossible__') trick deletes all rows.

    // notification_messages (child of notifications)
    await supabaseAdmin.from('notification_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // notification_recipients (child of notifications)
    await supabaseAdmin.from('notification_recipients').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // notifications (references users)
    await supabaseAdmin.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // document_chunks (child of documents)
    await supabaseAdmin.from('document_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // documents (child of users via user_email)
    await supabaseAdmin.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // websites (child of users via user_email)
    await supabaseAdmin.from('websites').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // payments (child of users + pricing_plans)
    await supabaseAdmin.from('payments').delete().neq('id', '__none__');

    // subscriptions (child of users + pricing_plans)
    await supabaseAdmin.from('subscriptions').delete().neq('id', '__none__');

    // token_logs (child of users via email)
    await supabaseAdmin.from('token_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // user_balances (child of users via email)
    await supabaseAdmin.from('user_balances').delete().neq('email', '__none__');

    // reset_tokens (child of users via email)
    await supabaseAdmin.from('reset_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // system_settings (standalone)
    await supabaseAdmin.from('system_settings').delete().neq('id', -999);

    // pricing_plans (now safe — payments & subscriptions deleted)
    await supabaseAdmin.from('pricing_plans').delete().neq('id', '__none__');

    // translations (child of languages)
    await supabaseAdmin.from('translations').delete().neq('translation_key', '___');

    // languages
    await supabaseAdmin.from('languages').delete().neq('code', '___');

    // meetings
    await supabaseAdmin.from('meetings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // announcement_banners
    await supabaseAdmin.from('announcement_banners').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // marketing_tasks (child of users)
    await supabaseAdmin.from('marketing_tasks').delete().neq('task_id', '__none__');

    // marketing_assets (child of users)
    await supabaseAdmin.from('marketing_assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // marketing_avatars (child of users)
    await supabaseAdmin.from('marketing_avatars').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // marketing_products (child of users)
    await supabaseAdmin.from('marketing_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // marketing_reels (child of users)
    await supabaseAdmin.from('marketing_reels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // games (child of users)
    await supabaseAdmin.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // presentations (child of users)
    await supabaseAdmin.from('presentations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // voice_transcripts (child of voice_calls)
    await supabaseAdmin.from('voice_transcripts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // voice_calls (child of voice_agent_config and users)
    await supabaseAdmin.from('voice_calls').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // voice_agent_config (child of users)
    await supabaseAdmin.from('voice_agent_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // instagram_comments_logs (child of users via user_email)
    await supabaseAdmin.from('instagram_comments_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // instagram_dm_logs (child of users via user_email)
    await supabaseAdmin.from('instagram_dm_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // instagram_posts (child of users via user_email)
    await supabaseAdmin.from('instagram_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // instagram_agents (child of users via user_email)
    await supabaseAdmin.from('instagram_agents').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // whatsapp_logs (child of users via user_email)
    await supabaseAdmin.from('whatsapp_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // whatsapp_sessions (child of users via user_email)
    await supabaseAdmin.from('whatsapp_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // whatsapp_agents (child of users via user_email)
    await supabaseAdmin.from('whatsapp_agents').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // users (now safe — all children deleted)
    await supabaseAdmin.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}

// ---------------------------------------------------------------------------
// STEP 2: Seed Users
// ---------------------------------------------------------------------------
async function seedUsers() {
    const salt = 10;

    const users = [
        {
            email: 'admin@example.com',
            name: 'Alex Morgan',
            role: 'admin',
            status: 'active',
            password: await bcrypt.hash('admin123', salt),
            disabled_features: '{}',
            created_at: daysAgo(180),
        },
        {
            email: 'user@demo.com',
            name: 'Jordan Lee',
            role: 'user',
            status: 'active',
            password: await bcrypt.hash('user123', salt),
            disabled_features: '{}',
            created_at: daysAgo(120),
        },
        {
            email: 'sarah.chen@techcorp.io',
            name: 'Sarah Chen',
            role: 'user',
            status: 'active',
            password: await bcrypt.hash('demo1234', salt),
            disabled_features: '{}',
            created_at: daysAgo(90),
        },
        {
            email: 'mike.johnson@startup.dev',
            name: 'Mike Johnson',
            role: 'user',
            status: 'active',
            password: await bcrypt.hash('demo1234', salt),
            disabled_features: '{}',
            created_at: daysAgo(75),
        },
        {
            email: 'emily.davis@agency.co',
            name: 'Emily Davis',
            role: 'user',
            status: 'active',
            password: await bcrypt.hash('demo1234', salt),
            disabled_features: '{}',
            created_at: daysAgo(60),
        },
        {
            email: 'raj.patel@enterprise.com',
            name: 'Raj Patel',
            role: 'user',
            status: 'active',
            password: await bcrypt.hash('demo1234', salt),
            disabled_features: '{}',
            created_at: daysAgo(45),
        },
        {
            email: 'lisa.wang@creative.studio',
            name: 'Lisa Wang',
            role: 'user',
            status: 'active',
            password: await bcrypt.hash('demo1234', salt),
            disabled_features: '{}',
            created_at: daysAgo(30),
        },
        {
            email: 'tom.wilson@freelance.io',
            name: 'Tom Wilson',
            role: 'user',
            status: 'disabled',
            password: await bcrypt.hash('demo1234', salt),
            disabled_features: '{chat,image-generator}',
            created_at: daysAgo(15),
        },
    ];

    const { data, error } = await supabaseAdmin.from('users').upsert(users, { onConflict: 'email' }).select('id, email');
    if (error) throw new Error(`Seed users failed: ${error.message}`);

    // Build a map of email → id for relational inserts
    const userMap: Record<string, string> = {};
    data?.forEach((u: any) => { userMap[u.email] = u.id; });
    return userMap;
}

// ---------------------------------------------------------------------------
// STEP 3: Seed User Balances
// ---------------------------------------------------------------------------
async function seedUserBalances() {
    const balances = [
        { email: 'admin@example.com', balance: 9999, updated_at: hoursAgo(1) },
        { email: 'user@demo.com', balance: 100000, updated_at: hoursAgo(3) },
        { email: 'sarah.chen@techcorp.io', balance: 4200, updated_at: hoursAgo(6) },
        { email: 'mike.johnson@startup.dev', balance: 1800, updated_at: hoursAgo(12) },
        { email: 'emily.davis@agency.co', balance: 3100, updated_at: daysAgo(1) },
        { email: 'raj.patel@enterprise.com', balance: 5000, updated_at: daysAgo(2) },
        { email: 'lisa.wang@creative.studio', balance: 750, updated_at: hoursAgo(2) },
        { email: 'tom.wilson@freelance.io', balance: 150, updated_at: daysAgo(5) },
    ];

    // Use upsert because the on_user_created_balance trigger auto-creates rows when users are inserted
    const { error } = await supabaseAdmin.from('user_balances').upsert(balances, { onConflict: 'email' });
    if (error) throw new Error(`Seed user_balances failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// STEP 4: Seed System Settings
// ---------------------------------------------------------------------------
async function seedSystemSettings() {
    const settings = {
        id: 1,
        default_tokens: 1000,
        ai_limits: {
            chat: 10,
            image: 50,
            code: 15,
            writer: 20,
            website: 100,
            translator: 10,
            summary: 15,
        },
        payment_enabled: true,
        payment_gateway: 'stripe',
        stripe_public_key: 'pk_test_51T3C9iJ3ojpupL13whnE0053SRf3jzLQ9yvrhR6Vnq3Aj91LvQEwnsSff6TXADh7x5kKfAWjTNo7o7s3icL9xlfP001uPDkBIP',
        stripe_secret_key: 'sk_test_51T3C9iJ3ojpupL13vx1OvQrPNa7j8JJj0vjzZTFiFqXXvgKACe29ozf4BYvMFFeC5maNrLizidOQeIShyVxgxgkz00ZHYGyX5g',
        paypal_client_id: 'ARvtj-Vvnhyq9SLw_AmJYQlF8CDGHTSq_un7YXjpBLd9N0fsVEC6XKPY0l4VsxwaXwfgEcpdhH61WUq4',
        paypal_client_secret: 'EOCNCUFvQUyne92Oyv1Jud-24X7SFxYNpfqDTIbA4fsXn710ei3h2jElwwnkp-ryfPwL4dWSNyJv1pj5',
        paypal_mode: 'sandbox',
        flutterwave_public_key: 'FLWPUBK_TEST-785faa8f25b70f83b5c146ef8dba6739-X',
        flutterwave_secret_key: 'FLWSECK_TEST-72e801e9ad58f902879f92f9cd3051ed-X',
        flutterwave_encryption_key: 'FLWSECK_TEST9ccab130612d',
        razorpay_key_id: 'rzp_test_SxDsuihT0aicQQ',
        razorpay_key_secret: 'RAb0PCPQA0CR1Z0nizKpRnNY',
        paystack_secret_key: 'sk_test_8f08a2f01a6cd3b714b0eba07d5b7ddd2fbcb14d',
        paystack_currency: 'ZAR',
        site_name: 'AI Suite',
        site_url: 'https://mounikai.com',
        smtp_config: {
            host: 'smtp.gmail.com',
            port: 465,
            user: 'mounikaicloud@gmail.com',
            pass: 'vvpt bpbm ccll nbhr',
            from: 'mounikaicloud@gmail.com',
        },
        metadata: {
            maintenanceMode: false,
            announcement: 'Welcome to AI Suite! Explore 100+ AI tools.',
            version: '7.3',
        },
        show_ai_settings: true,
        show_demo_mode: true,
        updated_at: hoursAgo(2),
    };

    const { error } = await supabaseAdmin.from('system_settings').upsert(settings, { onConflict: 'id' });
    if (error) throw new Error(`Seed system_settings failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// STEP 5: Seed Pricing Plans
// ---------------------------------------------------------------------------
async function seedPricingPlans() {
    const plans = [
        {
            id: 'free',
            name: 'Free',
            price: 0,
            tokens: 500,
            interval: 'month',
            features: ['AI Chat (10 msgs/day)', 'Text Summarizer', 'Grammar Check', 'Translation Hub', 'Community Support'],
            ai_tools: ['chat', 'summary', 'grammar', 'translator'],
            is_active: true,
        },
        {
            id: 'starter',
            name: 'Starter',
            price: 9,
            tokens: 5000,
            interval: 'month',
            features: ['Everything in Free', '5,000 tokens/month', 'Image Generator', 'Code Generator', 'Content Writer', 'Social Media Suite', 'Email Support'],
            ai_tools: ['chat', 'summary', 'grammar', 'translator', 'image-generator', 'code', 'writer', 'social', 'email'],
            is_active: true,
            popular: true,
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 29,
            tokens: 25000,
            interval: 'month',
            features: ['Everything in Starter', '25,000 tokens/month', 'Website Builder', 'AI Agents', 'RAG Documents', 'Contract Generator', 'Priority Support'],
            ai_tools: ['chat', 'summary', 'grammar', 'translator', 'image-generator', 'code', 'writer', 'social', 'email', 'website', 'rag-docs', 'agent', 'contract'],
            is_active: true,
            popular: true,
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 99,
            tokens: 100000,
            interval: 'month',
            features: ['Everything in Pro', '100,000 tokens/month', 'Unlimited AI Agents', 'Custom Models', 'Dedicated Support', 'SSO & API Access', 'White-label Option'],
            ai_tools: [
                'chat', 'website', 'image-generator', 'code', 'translator', 'support-agent',
                'writer', 'blog-post', 'article-writer', 'content-improver', 'summary', 'headline-generator', 'poem-generator', 'story', 'grammar',
                'social', 'instagram-caption', 'twitter-thread', 'linkedin-post', 'youtube-description', 'hashtag-generator', 'content-calendar',
                'google-ads', 'facebook-ads', 'email', 'sales-pitch', 'marketing-plan', 'competitor-analysis',
                'business-plan', 'meeting', 'contract-generator', 'job-description', 'finance',
                'bug-fix', 'code-reviewer', 'api-docs', 'readme-generator', 'regex-generator', 'sql', 'unit-test', 'ocr',
                'quiz', 'lesson-plan', 'study-guide', 'flashcard-generator', 'math-solver', 'interview',
                'story-ideas', 'character-creator', 'song-lyrics', 'joke-generator', 'name-generator', 'recipe',
                'privacy-policy', 'terms-of-service', 'disclaimer-generator', 'refund-policy',
                'meta-description', 'keyword-research', 'schema-markup', 'seo-audit',
                'journal-prompt', 'goal-setting', 'motivation-booster', 'sentiment', 'resume',
                'research-agent', 'writing-agent', 'code-agent', 'ai-support-agent', 'marketing-agent',
                'rag-docs', 'agent', 'contract', 'custom-model', 'api-access', 'voice-generator', 'video-ai'
            ],
            is_active: true,
        },
    ];

    const { error } = await supabaseAdmin.from('pricing_plans').upsert(plans, { onConflict: 'id' });
    if (error) throw new Error(`Seed pricing_plans failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// STEP 6: Seed Subscriptions
// ---------------------------------------------------------------------------
async function seedSubscriptions() {
    const subscriptions = [
        { id: 'sub_admin_pro', user_email: 'admin@example.com', plan_id: 'pro', status: 'active', created_at: daysAgo(160) },
        { id: 'sub_demo_enterprise', user_email: 'user@demo.com', plan_id: 'enterprise', status: 'active', created_at: daysAgo(100) },
        { id: 'sub_sarah_pro', user_email: 'sarah.chen@techcorp.io', plan_id: 'pro', status: 'active', created_at: daysAgo(80) },
        { id: 'sub_mike_starter', user_email: 'mike.johnson@startup.dev', plan_id: 'starter', status: 'trialing', created_at: daysAgo(10) },
        { id: 'sub_emily_pro', user_email: 'emily.davis@agency.co', plan_id: 'pro', status: 'active', created_at: daysAgo(50) },
        { id: 'sub_raj_enterprise', user_email: 'raj.patel@enterprise.com', plan_id: 'enterprise', status: 'active', created_at: daysAgo(40) },
        { id: 'sub_lisa_starter', user_email: 'lisa.wang@creative.studio', plan_id: 'starter', status: 'past_due', created_at: daysAgo(25) },
        { id: 'sub_tom_cancelled', user_email: 'tom.wilson@freelance.io', plan_id: 'starter', status: 'canceled', created_at: daysAgo(60) },
    ];

    const { error } = await supabaseAdmin.from('subscriptions').upsert(subscriptions, { onConflict: 'id' });
    if (error) throw new Error(`Seed subscriptions failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// STEP 7: Seed Payments
// ---------------------------------------------------------------------------
async function seedPayments(userMap: Record<string, string>) {
    const payments = [
        // Admin — Pro plan payments
        { id: 'pay_001', user_id: userMap['admin@example.com'], user_email: 'admin@example.com', plan_id: 'pro', amount: 29, status: 'succeeded', created_at: daysAgo(160) },
        { id: 'pay_002', user_id: userMap['admin@example.com'], user_email: 'admin@example.com', plan_id: 'pro', amount: 29, status: 'succeeded', created_at: daysAgo(130) },
        { id: 'pay_003', user_id: userMap['admin@example.com'], user_email: 'admin@example.com', plan_id: 'pro', amount: 29, status: 'succeeded', created_at: daysAgo(100) },
        { id: 'pay_003_1', user_id: userMap['admin@example.com'], user_email: 'admin@example.com', plan_id: 'pro', amount: 29, status: 'succeeded', created_at: daysAgo(70) },
        { id: 'pay_003_2', user_id: userMap['admin@example.com'], user_email: 'admin@example.com', plan_id: 'pro', amount: 29, status: 'succeeded', created_at: daysAgo(40) },
        { id: 'pay_003_3', user_id: userMap['admin@example.com'], user_email: 'admin@example.com', plan_id: 'pro', amount: 29, status: 'succeeded', created_at: daysAgo(10) },

        // Demo user — Enterprise plan payments
        { id: 'pay_004', user_id: userMap['user@demo.com'], user_email: 'user@demo.com', plan_id: 'enterprise', amount: 99, status: 'succeeded', created_at: daysAgo(100) },
        { id: 'pay_005', user_id: userMap['user@demo.com'], user_email: 'user@demo.com', plan_id: 'enterprise', amount: 99, status: 'succeeded', created_at: daysAgo(70) },
        { id: 'pay_005_1', user_id: userMap['user@demo.com'], user_email: 'user@demo.com', plan_id: 'enterprise', amount: 99, status: 'succeeded', created_at: daysAgo(40) },
        { id: 'pay_005_2', user_id: userMap['user@demo.com'], user_email: 'user@demo.com', plan_id: 'enterprise', amount: 99, status: 'succeeded', created_at: daysAgo(10) },

        // Sarah — Pro
        { id: 'pay_006', user_id: userMap['sarah.chen@techcorp.io'], user_email: 'sarah.chen@techcorp.io', plan_id: 'pro', amount: 29, status: 'succeeded', created_at: daysAgo(80) },
        { id: 'pay_007', user_id: userMap['sarah.chen@techcorp.io'], user_email: 'sarah.chen@techcorp.io', plan_id: 'pro', amount: 29, status: 'succeeded', created_at: daysAgo(50) },
        { id: 'pay_007_1', user_id: userMap['sarah.chen@techcorp.io'], user_email: 'sarah.chen@techcorp.io', plan_id: 'pro', amount: 29, status: 'succeeded', created_at: daysAgo(20) },

        // Emily — Pro
        { id: 'pay_008', user_id: userMap['emily.davis@agency.co'], user_email: 'emily.davis@agency.co', plan_id: 'pro', amount: 29, status: 'succeeded', created_at: daysAgo(50) },
        { id: 'pay_008_1', user_id: userMap['emily.davis@agency.co'], user_email: 'emily.davis@agency.co', plan_id: 'pro', amount: 29, status: 'succeeded', created_at: daysAgo(20) },

        // Raj — Enterprise
        { id: 'pay_009', user_id: userMap['raj.patel@enterprise.com'], user_email: 'raj.patel@enterprise.com', plan_id: 'enterprise', amount: 99, status: 'succeeded', created_at: daysAgo(40) },
        { id: 'pay_009_1', user_id: userMap['raj.patel@enterprise.com'], user_email: 'raj.patel@enterprise.com', plan_id: 'enterprise', amount: 99, status: 'succeeded', created_at: daysAgo(10) },

        // Failed & pending payments (edge cases)
        { id: 'pay_010', user_id: userMap['lisa.wang@creative.studio'], user_email: 'lisa.wang@creative.studio', plan_id: 'starter', amount: 9, status: 'failed', created_at: daysAgo(5) },
        { id: 'pay_011', user_id: userMap['mike.johnson@startup.dev'], user_email: 'mike.johnson@startup.dev', plan_id: 'starter', amount: 9, status: 'pending', created_at: daysAgo(2) },
        { id: 'pay_012', user_id: userMap['tom.wilson@freelance.io'], user_email: 'tom.wilson@freelance.io', plan_id: 'starter', amount: 9, status: 'succeeded', created_at: daysAgo(60) },
    ];

    const { error } = await supabaseAdmin.from('payments').upsert(payments, { onConflict: 'id' });
    if (error) throw new Error(`Seed payments failed: ${error.message}`);
    return payments.length;
}

// ---------------------------------------------------------------------------
// STEP 8: Seed Token Logs (realistic usage patterns)
// ---------------------------------------------------------------------------
async function seedTokenLogs() {
    const features = ['chat', 'image-generator', 'code', 'writer', 'website', 'translator', 'summary', 'social', 'email', 'quiz', 'resume', 'story', 'grammar', 'sql', 'blog-post'];

    const logs: any[] = [];

    // Generate realistic consumption logs across multiple users and days
    const activeUsers = [
        'admin@example.com',
        'user@demo.com',
        'sarah.chen@techcorp.io',
        'mike.johnson@startup.dev',
        'emily.davis@agency.co',
        'raj.patel@enterprise.com',
        'lisa.wang@creative.studio',
    ];

    // Day-by-day consumption over the past 30 days
    for (let day = 0; day < 30; day++) {
        // Each day, 2-4 random users use the platform
        const usersToday = activeUsers
            .sort(() => Math.random() - 0.5)
            .slice(0, 2 + Math.floor(Math.random() * 3));

        const popularModels = ['gpt-4o', 'gpt-4-turbo', 'claude-3-opus', 'gemini-1.5-pro', 'llama-3-70b', 'gpt-3.5-turbo', 'claude-3-sonnet'];

        for (const email of usersToday) {
            // Each user uses 1-3 features per day
            const featuresUsed = features
                .sort(() => Math.random() - 0.5)
                .slice(0, 1 + Math.floor(Math.random() * 3));

            for (const feature of featuresUsed) {
                logs.push({
                    email,
                    amount: [5, 10, 15, 20, 25, 50][Math.floor(Math.random() * 6)],
                    action: 'consume',
                    feature,
                    model: popularModels[Math.floor(Math.random() * popularModels.length)],
                    timestamp: daysAgo(day),
                });
            }
        }
    }

    // Add some "add" token events (purchases / resets)
    logs.push(
        { email: 'user@demo.com', amount: 5000, action: 'add', feature: 'purchase', timestamp: daysAgo(100) },
        { email: 'sarah.chen@techcorp.io', amount: 25000, action: 'add', feature: 'purchase', timestamp: daysAgo(80) },
        { email: 'emily.davis@agency.co', amount: 25000, action: 'add', feature: 'purchase', timestamp: daysAgo(50) },
        { email: 'raj.patel@enterprise.com', amount: 100000, action: 'add', feature: 'purchase', timestamp: daysAgo(40) },
        { email: 'mike.johnson@startup.dev', amount: 5000, action: 'add', feature: 'purchase', timestamp: daysAgo(10) },
        { email: 'admin@example.com', amount: 1000, action: 'reset', feature: 'admin_reset', timestamp: daysAgo(5) },
        { email: 'lisa.wang@creative.studio', amount: 5000, action: 'add', feature: 'purchase', timestamp: daysAgo(25) },
    );

    // Insert in batches of 50 to avoid payload size issues
    for (let i = 0; i < logs.length; i += 50) {
        const batch = logs.slice(i, i + 50);
        const { error } = await supabaseAdmin.from('token_logs').upsert(batch, { onConflict: 'id' });
        if (error) throw new Error(`Seed token_logs batch ${i} failed: ${error.message}`);
    }

    return logs.length;
}

// ---------------------------------------------------------------------------
// STEP 9: Seed Websites (AI-generated website projects)
// ---------------------------------------------------------------------------
async function seedWebsites() {
    const websites = [
        {
            user_email: 'admin@example.com',
            name: 'TechStartup Landing Page',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NexaFlow - AI-Powered Workflows</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
                tailwind.config = {
                    theme: {
                        extend: {
                            fontFamily: { sans: ['Inter', 'sans-serif'] }
                        }
                    }
                }
            </script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        </head>
        <body class="bg-[#030014] text-white font-sans antialiased overflow-x-hidden selection:bg-indigo-500 selection:text-white">
            
            <div class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none"></div>
            <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none"></div>

            <nav class="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                <div class="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
                    NexaFlow
                </div>
                <div class="hidden md:flex space-x-8 text-sm font-medium text-slate-300">
                    <a href="#" class="hover:text-white transition">Product</a>
                    <a href="#" class="hover:text-white transition">Solutions</a>
                    <a href="#" class="hover:text-white transition">Pricing</a>
                </div>
                <button class="px-5 py-2.5 text-sm font-semibold rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all">
                    Sign In
                </button>
            </nav>

            <main class="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
                
                <div class="inline-flex items-center px-4 py-1.5 mb-8 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-medium backdrop-blur-sm cursor-pointer hover:bg-indigo-500/20 transition">
                    <span class="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
                    NexaFlow AI 2.0 is now live
                </div>
                
                <h1 class="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight max-w-5xl leading-[1.1]">
                    Automate workflows with <br/>
                    <span class="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-sm">
                        Intelligent AI
                    </span>
                </h1>
                
                <p class="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    Build, deploy, and scale complex automation in minutes. NexaFlow's neural engine handles the heavy lifting so your team can focus on what matters.
                </p>
                
                <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
                    <button class="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold text-lg transition-all shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)] hover:shadow-[0_0_40px_-5px_rgba(99,102,241,0.7)] hover:-translate-y-1">
                        Get Started Free
                    </button>
                    <button class="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-lg backdrop-blur-sm transition-all hover:-translate-y-1">
                        Book a Demo
                    </button>
                </div>
                
            </main>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Create a modern landing page for an AI startup called NexaFlow' },
                { role: 'model', content: 'I\'ve created a sleek, dark-themed landing page for NexaFlow with a gradient hero section and CTA button.' },
                { role: 'user', content: 'Update that HTML code with a premium UI design. Use Tailwind CSS.' },
                { role: 'model', content: 'I have completely overhauled the design using Tailwind CSS. The new premium UI features an ambient background glow, a modern navigation bar, an animated announcement badge, a highly stylized hero section with gradient text, and beautiful frosted glass/backdrop-blur button hover effects.' }
            ],
            created_at: daysAgo(45),
            updated_at: daysAgo(0), // Updated to reflect recent modification
        },
        {
            user_email: 'admin@example.com',
            name: 'SaaS Admin Dashboard',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dashboard - NexaFlow</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <script>
                tailwind.config = {
                    theme: {
                        extend: {
                            fontFamily: { sans: ['Inter', 'sans-serif'] }
                        }
                    }
                }
            </script>
        </head>
        <body class="bg-gray-50 text-gray-900 font-sans antialiased">

            <div class="flex h-screen overflow-hidden">
                
                <aside class="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
                    <div class="h-16 flex items-center px-6 border-b border-gray-200">
                        <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">NexaFlow</span>
                    </div>
                    <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        <a href="#" class="flex items-center gap-3 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                            Dashboard
                        </a>
                        <a href="#" class="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors">
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            Customers
                        </a>
                        <a href="#" class="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors">
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                            Analytics
                        </a>
                        <a href="#" class="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors">
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            Settings
                        </a>
                    </nav>
                    <div class="p-4 border-t border-gray-200">
                        <div class="flex items-center gap-3">
                            <img class="h-9 w-9 rounded-full bg-gray-300" src="https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff" alt="Avatar">
                            <div>
                                <p class="text-sm font-medium text-gray-700">Admin User</p>
                                <p class="text-xs text-gray-500">admin@nexaflow.io</p>
                            </div>
                        </div>
                    </div>
                </aside>

                <div class="flex-1 flex flex-col overflow-hidden">
                    
                    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10">
                        <div class="flex-1 flex">
                            <div class="w-full max-w-lg relative">
                                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </span>
                                <input type="text" class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors" placeholder="Search tasks, users, or settings...">
                            </div>
                        </div>
                        <div class="ml-4 flex items-center md:ml-6">
                            <button class="p-2 text-gray-400 hover:text-gray-500 relative">
                                <span class="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                            </button>
                            <button class="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                                New Project
                            </button>
                        </div>
                    </header>

                    <main class="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
                        
                        <h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>

                        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                            <div class="bg-white overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                <div class="p-5">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 bg-indigo-50 rounded-md p-3">
                                            <svg class="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        </div>
                                        <div class="ml-4 w-0 flex-1">
                                            <dl>
                                                <dt class="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                                                <dd class="flex items-baseline">
                                                    <div class="text-2xl font-semibold text-gray-900">$45,231</div>
                                                    <div class="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                                                        <svg class="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" style="transform: rotate(-45deg);"></path></svg>
                                                        12%
                                                    </div>
                                                </dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-white overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                <div class="p-5">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 bg-purple-50 rounded-md p-3">
                                            <svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        </div>
                                        <div class="ml-4 w-0 flex-1">
                                            <dl>
                                                <dt class="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                                                <dd class="flex items-baseline">
                                                    <div class="text-2xl font-semibold text-gray-900">2,405</div>
                                                    <div class="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                                                        <svg class="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" style="transform: rotate(-45deg);"></path></svg>
                                                        5.4%
                                                    </div>
                                                </dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div class="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                                    <h3 class="text-lg leading-6 font-medium text-gray-900">Recent Transactions</h3>
                                    <a href="#" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">View all</a>
                                </div>
                                <div class="overflow-x-auto">
                                    <table class="min-w-full divide-y divide-gray-200">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody class="bg-white divide-y divide-gray-200">
                                            <tr>
                                                <td class="px-6 py-4 whitespace-nowrap">
                                                    <div class="flex items-center">
                                                        <div class="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">AC</div>
                                                        <div class="ml-3"><div class="text-sm font-medium text-gray-900">Acme Corp</div></div>
                                                    </div>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$2,400.00</td>
                                                <td class="px-6 py-4 whitespace-nowrap">
                                                    <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Oct 24, 2024</td>
                                            </tr>
                                            <tr>
                                                <td class="px-6 py-4 whitespace-nowrap">
                                                    <div class="flex items-center">
                                                        <div class="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">GL</div>
                                                        <div class="ml-3"><div class="text-sm font-medium text-gray-900">Globex Inc</div></div>
                                                    </div>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$850.00</td>
                                                <td class="px-6 py-4 whitespace-nowrap">
                                                    <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Oct 23, 2024</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
                                <div class="px-6 py-5 border-b border-gray-200">
                                    <h3 class="text-lg leading-6 font-medium text-gray-900">Invite Team Member</h3>
                                </div>
                                <div class="p-6">
                                    <form action="#" method="POST" class="space-y-4">
                                        <div>
                                            <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
                                            <div class="mt-1 relative rounded-md shadow-sm">
                                                <input type="email" name="email" id="email" class="block w-full sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 border" placeholder="jane@example.com">
                                            </div>
                                        </div>
                                        <div>
                                            <label for="role" class="block text-sm font-medium text-gray-700">Role</label>
                                            <select id="role" name="role" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border">
                                                <option>Admin</option>
                                                <option selected>Editor</option>
                                                <option>Viewer</option>
                                            </select>
                                        </div>
                                        <div class="flex items-start mt-4">
                                            <div class="flex items-center h-5">
                                                <input id="notify" name="notify" type="checkbox" class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded">
                                            </div>
                                            <div class="ml-3 text-sm">
                                                <label for="notify" class="font-medium text-gray-700">Send welcome email</label>
                                                <p class="text-gray-500">They will receive a link to set their password.</p>
                                            </div>
                                        </div>
                                        <div class="pt-4">
                                            <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors">
                                                Send Invitation
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>

                    </main>
                </div>
            </div>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Create a modern landing page for an AI startup called NexaFlow' },
                { role: 'model', content: 'I\'ve created a sleek, dark-themed landing page for NexaFlow with a gradient hero section and CTA button.' },
                { role: 'user', content: 'Update that HTML code with a premium UI design. Use Tailwind CSS.' },
                { role: 'model', content: 'I have completely overhauled the design using Tailwind CSS. The new premium UI features an ambient background glow, a modern navigation bar, an animated announcement badge, a highly stylized hero section with gradient text, and beautiful frosted glass/backdrop-blur button hover effects.' },
                { role: 'user', content: 'now make one more UI example not landing page. also make the page big. need to see lot of examples in the html code' },
                { role: 'model', content: 'I have generated a large, comprehensive SaaS Admin Dashboard layout. This provides extensive examples of Tailwind CSS in action, including a functional sidebar, top navigation with search, data metric cards, a full data table with status badges, and a form interface.' }
            ],
            created_at: daysAgo(45),
            updated_at: daysAgo(0),
        },
        {
            user_email: 'admin@example.com',
            name: 'E-commerce Product Details',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NexaAudio Pro - NexaStore</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <script>
                tailwind.config = {
                    theme: {
                        extend: {
                            fontFamily: { sans: ['Inter', 'sans-serif'] }
                        }
                    }
                }
            </script>
        </head>
        <body class="bg-white text-gray-900 font-sans antialiased">

            <header class="border-b border-gray-200">
                <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div class="flex items-center gap-8">
                        <a href="#" class="text-2xl font-bold tracking-tighter text-indigo-600">NexaStore</a>
                        <div class="hidden md:flex gap-6 text-sm font-medium text-gray-600">
                            <a href="#" class="hover:text-indigo-600 transition">Men</a>
                            <a href="#" class="hover:text-indigo-600 transition">Women</a>
                            <a href="#" class="text-indigo-600 transition">Electronics</a>
                            <a href="#" class="hover:text-indigo-600 transition">Accessories</a>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <button class="text-gray-400 hover:text-gray-500">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </button>
                        <button class="text-gray-400 hover:text-gray-500 relative">
                            <span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">3</span>
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        </button>
                    </div>
                </nav>
            </header>

            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                
                <nav class="flex text-sm text-gray-500 mb-8" aria-label="Breadcrumb">
                    <ol class="flex items-center space-x-2">
                        <li><a href="#" class="hover:text-gray-900">Home</a></li>
                        <li><svg class="h-4 w-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg></li>
                        <li><a href="#" class="hover:text-gray-900">Electronics</a></li>
                        <li><svg class="h-4 w-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg></li>
                        <li class="font-medium text-gray-900" aria-current="page">NexaAudio Pro</li>
                    </ol>
                </nav>

                <div class="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
                    
                    <div class="flex flex-col gap-4">
                        <div class="aspect-w-1 aspect-h-1 w-full bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">
                            <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Headphones" class="w-full h-full object-cover object-center">
                        </div>
                        <div class="grid grid-cols-4 gap-4">
                            <button class="aspect-w-1 aspect-h-1 bg-gray-100 rounded-lg overflow-hidden border-2 border-indigo-600">
                                <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" class="w-full h-full object-cover object-center" alt="Thumbnail 1">
                            </button>
                            <button class="aspect-w-1 aspect-h-1 bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-gray-300 transition">
                                <img src="https://images.unsplash.com/photo-1583394838336-acd977736f90?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" class="w-full h-full object-cover object-center" alt="Thumbnail 2">
                            </button>
                            <button class="aspect-w-1 aspect-h-1 bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-gray-300 transition">
                                <img src="https://images.unsplash.com/photo-1484704849700-f032a568e944?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" class="w-full h-full object-cover object-center" alt="Thumbnail 3">
                            </button>
                            <button class="aspect-w-1 aspect-h-1 bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-gray-300 transition flex items-center justify-center">
                                <span class="text-sm font-medium text-gray-500">+3 More</span>
                            </button>
                        </div>
                    </div>

                    <div class="mt-10 px-4 sm:px-0 lg:mt-0">
                        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">NexaAudio Pro Wireless</h1>
                        
                        <div class="mt-3 flex items-center justify-between">
                            <p class="text-3xl text-gray-900 font-bold">$299.00</p>
                            <div class="flex items-center gap-2">
                                <div class="flex items-center text-yellow-400">
                                    <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                    <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                    <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                    <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                    <svg class="h-5 w-5 flex-shrink-0 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                </div>
                                <a href="#" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">117 reviews</a>
                            </div>
                        </div>

                        <div class="mt-6 text-base text-gray-500 space-y-4">
                            <p>Experience studio-quality sound with the NexaAudio Pro. Featuring active noise cancellation, 40-hour battery life, and ultra-plush memory foam ear cups for all-day listening comfort.</p>
                        </div>

                        <form class="mt-8">
                            <div>
                                <h3 class="text-sm font-medium text-gray-900">Color</h3>
                                <div class="mt-4 flex items-center space-x-3">
                                    <label class="relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus:outline-none ring-gray-400 ring-2 ring-offset-2">
                                        <input type="radio" name="color-choice" value="Matte Black" class="sr-only" aria-labelledby="color-choice-0-label">
                                        <span aria-hidden="true" class="h-8 w-8 rounded-full border border-black border-opacity-10 bg-gray-900"></span>
                                    </label>
                                    <label class="relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus:outline-none ring-transparent hover:ring-gray-300 ring-2 ring-offset-2 transition">
                                        <input type="radio" name="color-choice" value="Silver" class="sr-only" aria-labelledby="color-choice-1-label">
                                        <span aria-hidden="true" class="h-8 w-8 rounded-full border border-black border-opacity-10 bg-gray-300"></span>
                                    </label>
                                    <label class="relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus:outline-none ring-transparent hover:ring-gray-300 ring-2 ring-offset-2 transition">
                                        <input type="radio" name="color-choice" value="Rose Gold" class="sr-only" aria-labelledby="color-choice-2-label">
                                        <span aria-hidden="true" class="h-8 w-8 rounded-full border border-black border-opacity-10 bg-rose-200"></span>
                                    </label>
                                </div>
                            </div>

                            <div class="mt-8">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-sm font-medium text-gray-900">Model</h3>
                                    <a href="#" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">Compare specs</a>
                                </div>
                                <div class="mt-4 grid grid-cols-2 gap-4">
                                    <label class="group relative flex items-center justify-center rounded-md border py-3 px-4 text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none sm:flex-1 cursor-pointer bg-white text-gray-900 shadow-sm border-indigo-600 ring-1 ring-indigo-600">
                                        <input type="radio" name="model" value="Standard" class="sr-only">
                                        <span>Standard</span>
                                    </label>
                                    <label class="group relative flex items-center justify-center rounded-md border py-3 px-4 text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none sm:flex-1 cursor-pointer bg-white text-gray-900 shadow-sm border-gray-300">
                                        <input type="radio" name="model" value="Pro Max" class="sr-only">
                                        <span>Pro Max (+$50)</span>
                                    </label>
                                </div>
                            </div>

                            <div class="mt-10 flex gap-4">
                                <button type="submit" class="flex max-w-xs flex-1 items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 transition-colors sm:w-full">
                                    Add to bag
                                </button>
                                <button type="button" class="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-400 hover:bg-gray-50 hover:text-gray-500 transition-colors">
                                    <svg class="h-6 w-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                    <span class="sr-only">Add to favorites</span>
                                </button>
                            </div>
                        </form>

                        <div class="mt-8 border-t border-gray-200 pt-8">
                            <h3 class="text-sm font-medium text-gray-900">Highlights</h3>
                            <div class="mt-4">
                                <ul role="list" class="list-disc space-y-2 pl-4 text-sm text-gray-500">
                                    <li class="pl-2">Industry-leading Active Noise Cancellation</li>
                                    <li class="pl-2">Up to 40 hours of listening time</li>
                                    <li class="pl-2">Spatial Audio with dynamic head tracking</li>
                                    <li class="pl-2">Seamless switching between devices</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Create a modern landing page for an AI startup called NexaFlow' },
                { role: 'model', content: 'I\'ve created a sleek, dark-themed landing page for NexaFlow with a gradient hero section and CTA button.' },
                { role: 'user', content: 'Update that HTML code with a premium UI design. Use Tailwind CSS.' },
                { role: 'model', content: 'I have completely overhauled the design using Tailwind CSS. The new premium UI features an ambient background glow, a modern navigation bar, an animated announcement badge, a highly stylized hero section with gradient text, and beautiful frosted glass/backdrop-blur button hover effects.' },
                { role: 'user', content: 'now make one more UI example not landing page. also make the page big. need to see lot of examples in the html code' },
                { role: 'model', content: 'I have generated a large, comprehensive SaaS Admin Dashboard layout. This provides extensive examples of Tailwind CSS in action, including a functional sidebar, top navigation with search, data metric cards, a full data table with status badges, and a form interface.' },
                { role: 'user', content: 'now give me one more example' },
                { role: 'model', content: 'I have built an E-commerce Product Details page. This layout focuses on consumer-facing elements, featuring a dynamic image gallery grid, interactive color and size selectors using customized radio inputs, breadcrumb navigation, and an inline review rating display.' }
            ],
            created_at: daysAgo(45),
            updated_at: daysAgo(0),
        },
        {
            user_email: 'admin@example.com',
            name: 'Messaging Chat Interface',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NexaChat - Web</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <script>
                tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] } } } }
            </script>
        </head>
        <body class="bg-gray-100 font-sans antialiased">
            <div class="flex h-screen w-full overflow-hidden bg-gray-100">
                
                <aside class="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full z-10">
                    <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 class="text-xl font-bold text-gray-800">Messages</h2>
                        <button class="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-600 transition">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                    </div>
                    <div class="p-4">
                        <input type="text" placeholder="Search chats..." class="w-full bg-gray-100 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition">
                    </div>
                    <div class="flex-1 overflow-y-auto">
                        <div class="flex items-center gap-3 p-4 bg-indigo-50 cursor-pointer border-l-4 border-indigo-600">
                            <div class="relative">
                                <img src="https://ui-avatars.com/api/?name=Sarah+Jenkins&background=random" class="w-12 h-12 rounded-full object-cover">
                                <span class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-baseline">
                                    <h3 class="text-sm font-semibold text-gray-900 truncate">Sarah Jenkins</h3>
                                    <span class="text-xs text-indigo-600 font-medium">10:42 AM</span>
                                </div>
                                <p class="text-sm text-gray-600 truncate">Are we still on for the 2PM sync?</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition border-l-4 border-transparent">
                            <div class="relative">
                                <img src="https://ui-avatars.com/api/?name=Design+Team&background=0D8ABC&color=fff" class="w-12 h-12 rounded-full object-cover">
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-baseline">
                                    <h3 class="text-sm font-semibold text-gray-900 truncate">Design Team</h3>
                                    <span class="text-xs text-gray-400">Yesterday</span>
                                </div>
                                <p class="text-sm text-gray-500 truncate">Mike: I've updated the Figma file.</p>
                            </div>
                        </div>
                    </div>
                </aside>

                <main class="flex-1 min-w-0 flex flex-col bg-[#F8FAFC]">
                    <header class="h-16 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
                        <div class="flex items-center gap-3">
                            <img src="https://ui-avatars.com/api/?name=Sarah+Jenkins&background=random" class="w-10 h-10 rounded-full">
                            <div>
                                <h2 class="text-base font-semibold text-gray-900">Sarah Jenkins</h2>
                                <p class="text-xs text-green-500 font-medium">Online</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4 text-gray-400">
                            <button class="hover:text-indigo-600 transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg></button>
                            <button class="hover:text-indigo-600 transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button>
                        </div>
                    </header>

                    <div class="flex-1 overflow-y-auto p-6 space-y-6">
                        <div class="text-center text-xs text-gray-400 font-medium my-4">Today, 10:30 AM</div>
                        
                        <div class="flex items-end gap-2">
                            <img src="https://ui-avatars.com/api/?name=Sarah+Jenkins&background=random" class="w-8 h-8 rounded-full mb-1">
                            <div class="bg-white border border-gray-100 shadow-sm text-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-sm max-w-md text-sm">
                                Hey! Have you had a chance to review the new dashboard mockups?
                            </div>
                        </div>

                        <div class="flex items-end justify-end gap-2">
                            <div class="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-br-sm max-w-md text-sm shadow-md">
                                Yes! I just looked at them. They look incredibly clean. I'll add a few comments in Figma before our meeting.
                            </div>
                        </div>
                        
                        <div class="flex items-end gap-2">
                            <img src="https://ui-avatars.com/api/?name=Sarah+Jenkins&background=random" class="w-8 h-8 rounded-full mb-1">
                            <div class="bg-white border border-gray-100 shadow-sm text-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-sm max-w-md text-sm">
                                Perfect. Are we still on for the 2PM sync?
                            </div>
                        </div>
                    </div>

                    <div class="p-4 flex-shrink-0 bg-white border-t border-gray-200">
                        <div class="flex items-center gap-3 bg-gray-50 rounded-full px-4 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                            <button class="text-gray-400 hover:text-gray-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg></button>
                            <input type="text" placeholder="Type a message..." class="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-700 placeholder-gray-400 py-1.5">
                            <button class="text-gray-400 hover:text-gray-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></button>
                            <button class="bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 transition shadow-sm"><svg class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg></button>
                        </div>
                    </div>
                </main>
            </div>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Give me 3 more UI examples. Make them big.' },
                { role: 'model', content: 'Here is the first example: A comprehensive Messaging and Chat Application interface, demonstrating complex pane layouts and styling for chat bubbles.' },
                { role: 'user', content: 'chat UI was having CSS issues fix it give me the new object' },
                { role: 'model', content: 'I have fixed the layout by wrapping the main components in a dedicated flex container. This resolves the issue where the sidebar and main chat area were stacking vertically instead of horizontally due to rendering environments stripping body classes.' }
            ],
            created_at: daysAgo(2),
            updated_at: daysAgo(0),
        },
        {
            user_email: 'admin@example.com',
            name: 'Kanban Task Board',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NexaBoard - Agile Tasks</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <script>
                tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] } } } }
            </script>
        </head>
        <body class="bg-gray-50 font-sans h-screen flex flex-col overflow-hidden">

            <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div class="flex items-center gap-4">
                    <h1 class="text-xl font-bold text-gray-900">Q3 Marketing Launch</h1>
                    <span class="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">Active Sprint</span>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex -space-x-2">
                        <img class="w-8 h-8 rounded-full border-2 border-white" src="https://ui-avatars.com/api/?name=A+B&background=random">
                        <img class="w-8 h-8 rounded-full border-2 border-white" src="https://ui-avatars.com/api/?name=C+D&background=random">
                        <img class="w-8 h-8 rounded-full border-2 border-white" src="https://ui-avatars.com/api/?name=E+F&background=random">
                        <div class="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">+4</div>
                    </div>
                    <button class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition">Share Board</button>
                </div>
            </header>

            <main class="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <div class="flex items-start gap-6 h-full pb-4 min-w-max">
                    
                    <div class="w-80 flex flex-col max-h-full bg-gray-100/50 rounded-xl p-3 border border-gray-200">
                        <div class="flex justify-between items-center mb-3 px-1">
                            <h2 class="font-semibold text-gray-700 text-sm flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-gray-400"></span> TO DO <span class="text-gray-400 text-xs font-normal">3</span>
                            </h2>
                            <button class="text-gray-400 hover:text-gray-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg></button>
                        </div>
                        <div class="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            
                            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab hover:border-indigo-300 hover:shadow-md transition">
                                <div class="flex gap-2 mb-2">
                                    <span class="px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wide">High Priority</span>
                                    <span class="px-2 py-1 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide">Design</span>
                                </div>
                                <h3 class="text-sm font-medium text-gray-900 mb-2">Design Social Media Assets for Launch</h3>
                                <p class="text-xs text-gray-500 mb-4 line-clamp-2">Create standard sizes for Twitter, LinkedIn, and Instagram based on the new brand guidelines.</p>
                                <div class="flex justify-between items-center mt-auto">
                                    <div class="flex gap-3 text-gray-400">
                                        <span class="flex items-center text-xs gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg> 2</span>
                                        <span class="flex items-center text-xs gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg> 5</span>
                                    </div>
                                    <img src="https://ui-avatars.com/api/?name=Alex+M&background=random" class="w-6 h-6 rounded-full">
                                </div>
                            </div>

                        </div>
                        <button class="mt-3 w-full py-2 flex items-center justify-center gap-2 text-sm text-gray-500 hover:bg-gray-200/50 hover:text-gray-700 rounded-lg transition font-medium">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> Add Task
                        </button>
                    </div>

                    <div class="w-80 flex flex-col max-h-full bg-indigo-50/50 rounded-xl p-3 border border-indigo-100">
                        <div class="flex justify-between items-center mb-3 px-1">
                            <h2 class="font-semibold text-gray-700 text-sm flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> IN PROGRESS <span class="text-gray-400 text-xs font-normal">1</span>
                            </h2>
                        </div>
                        <div class="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            
                            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab border-l-4 border-l-indigo-500">
                                <div class="flex gap-2 mb-2">
                                    <span class="px-2 py-1 rounded bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wide">Copywriting</span>
                                </div>
                                <h3 class="text-sm font-medium text-gray-900 mb-2">Draft Email Drip Campaign</h3>
                                <div class="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                                    <div class="bg-indigo-500 h-1.5 rounded-full" style="width: 45%"></div>
                                </div>
                                <div class="flex justify-between items-center mt-auto">
                                    <div class="text-xs text-gray-500 font-medium">Due Tomorrow</div>
                                    <img src="https://ui-avatars.com/api/?name=Sam+K&background=random" class="w-6 h-6 rounded-full">
                                </div>
                            </div>

                        </div>
                    </div>

                    <div class="w-80 flex flex-col max-h-full bg-gray-100/50 rounded-xl p-3 border border-gray-200 opacity-80">
                        <div class="flex justify-between items-center mb-3 px-1">
                            <h2 class="font-semibold text-gray-700 text-sm flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-green-500"></span> DONE <span class="text-gray-400 text-xs font-normal">12</span>
                            </h2>
                        </div>
                        <div class="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            <div class="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                                <h3 class="text-sm font-medium text-gray-500 line-through mb-2">Finalize Target Audience Personas</h3>
                                <span class="px-2 py-1 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide">Approved</span>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Give me 3 more UI examples. Make them big.' },
                { role: 'model', content: 'Here is the second example: A Kanban Task Board, featuring horizontal scrolling, draggable-style task cards, priority badges, and progress bars.' }
            ],
            created_at: daysAgo(2),
            updated_at: daysAgo(0),
        },
        {
            user_email: 'admin@example.com',
            name: 'Social Profile & Feed',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>User Profile - NexaSocial</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <script>
                tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] } } } }
            </script>
        </head>
        <body class="bg-gray-100 font-sans antialiased overflow-y-scroll">

            <nav class="bg-white shadow-sm sticky top-0 z-50">
                <div class="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
                    <span class="font-bold text-xl text-indigo-600">NexaSocial</span>
                    <div class="flex items-center gap-4">
                        <div class="relative hidden sm:block">
                            <input type="text" placeholder="Search..." class="bg-gray-100 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64">
                        </div>
                        <img src="https://ui-avatars.com/api/?name=JD&background=0D8ABC&color=fff" class="w-8 h-8 rounded-full cursor-pointer">
                    </div>
                </div>
            </nav>

            <main class="max-w-5xl mx-auto pb-10">
                <div class="bg-white rounded-b-xl shadow-sm overflow-hidden mb-6">
                    <div class="h-64 w-full bg-gradient-to-r from-indigo-400 to-purple-500 relative">
                        <img src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" class="w-full h-full object-cover mix-blend-overlay opacity-50">
                    </div>
                    
                    <div class="px-8 pb-4 relative">
                        <div class="flex justify-between items-end -mt-16 mb-4">
                            <div class="relative">
                                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" class="w-32 h-32 rounded-full border-4 border-white object-cover shadow-md z-10 relative">
                                <div class="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-2 border-white rounded-full z-20"></div>
                            </div>
                            
                            <div class="flex gap-3 mb-2">
                                <button class="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg text-sm transition">Message</button>
                                <button class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm shadow-sm transition">Following</button>
                            </div>
                        </div>

                        <div>
                            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                Jessica Davis
                                <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>
                            </h1>
                            <p class="text-gray-500 text-sm mt-1">Senior UX Designer @NexaFlow • Coffee Enthusiast • Travel Blogger</p>
                            <div class="flex gap-6 mt-4 text-sm">
                                <span class="text-gray-500"><strong class="text-gray-900">1,204</strong> Followers</span>
                                <span class="text-gray-500"><strong class="text-gray-900">450</strong> Following</span>
                            </div>
                        </div>
                    </div>

                    <div class="border-t border-gray-200 px-8 flex gap-8 text-sm font-semibold text-gray-500">
                        <a href="#" class="py-4 text-indigo-600 border-b-2 border-indigo-600">Posts</a>
                        <a href="#" class="py-4 hover:text-gray-800 transition">About</a>
                        <a href="#" class="py-4 hover:text-gray-800 transition">Photos</a>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-0">
                    
                    <div class="lg:col-span-1 space-y-6">
                        <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                            <h2 class="font-bold text-gray-900 mb-4">Intro</h2>
                            <ul class="space-y-3 text-sm text-gray-600">
                                <li class="flex items-center gap-3"><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg> Works at NexaFlow</li>
                                <li class="flex items-center gap-3"><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> Studied at Design Institute</li>
                                <li class="flex items-center gap-3"><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Lives in San Francisco, CA</li>
                            </ul>
                        </div>
                    </div>

                    <div class="lg:col-span-2 space-y-6">
                        
                        <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                            <div class="flex gap-3">
                                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&w=100&q=80" class="w-10 h-10 rounded-full object-cover">
                                <input type="text" placeholder="What's on your mind, Jessica?" class="flex-1 bg-gray-100 rounded-full px-4 text-sm focus:outline-none hover:bg-gray-200 transition cursor-text">
                            </div>
                            <div class="border-t border-gray-100 mt-4 pt-3 flex justify-around">
                                <button class="flex items-center gap-2 text-gray-500 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition"><span class="text-green-500">📷</span> Photo/Video</button>
                                <button class="flex items-center gap-2 text-gray-500 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition"><span class="text-blue-500">📍</span> Check in</button>
                            </div>
                        </div>

                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div class="p-4 flex justify-between items-center">
                                <div class="flex items-center gap-3">
                                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&w=100&q=80" class="w-10 h-10 rounded-full object-cover">
                                    <div>
                                        <h3 class="font-bold text-sm text-gray-900">Jessica Davis</h3>
                                        <p class="text-xs text-gray-500">2 hours ago • 🌎</p>
                                    </div>
                                </div>
                                <button class="text-gray-400 hover:text-gray-600"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"></path></svg></button>
                            </div>
                            <div class="px-4 pb-3 text-sm text-gray-800">
                                Just finished up a massive UI overhaul for a new client! Really happy with how the dark mode variants turned out. Here is a sneak peek! 🎨✨ #Design #UIUX
                            </div>
                            <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" class="w-full h-auto object-cover border-y border-gray-100">
                            
                            <div class="px-4 py-3 flex justify-between items-center text-sm text-gray-500 border-b border-gray-100">
                                <span class="flex items-center gap-1"><span class="bg-blue-500 text-white rounded-full p-0.5 text-[10px]">👍</span> 248</span>
                                <span>12 Comments • 4 Shares</span>
                            </div>
                            <div class="px-4 py-2 flex justify-between">
                                <button class="flex-1 flex items-center justify-center gap-2 py-2 text-gray-500 hover:bg-gray-50 rounded-lg text-sm font-medium transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path></svg> Like</button>
                                <button class="flex-1 flex items-center justify-center gap-2 py-2 text-gray-500 hover:bg-gray-50 rounded-lg text-sm font-medium transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg> Comment</button>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Give me 3 more UI examples. Make them big.' },
                { role: 'model', content: 'Here is the third example: A Social Media Profile and Feed, utilizing absolute positioning for a custom header, grid layouts for sidebars, and interactive post card components.' }
            ],
            created_at: daysAgo(2),
            updated_at: daysAgo(0),
        },
        {
            user_email: 'user@demo.com',
            name: 'Premium Dark Portfolio',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Creative Developer Portfolio</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <script>tailwind.config = { theme: { extend: { fontFamily: { sans: ['Plus Jakarta Sans', 'sans-serif'] } } } }</script>
        </head>
        <body class="bg-[#0a0a0a] text-white font-sans antialiased selection:bg-purple-500/30">
            <div class="relative min-h-screen overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
                <div class="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[500px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>

                <nav class="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
                    <a href="#" class="text-sm font-medium hover:text-purple-400 transition">Work</a>
                    <a href="#" class="text-sm font-medium hover:text-purple-400 transition">About</a>
                    <a href="#" class="text-sm font-medium hover:text-purple-400 transition">Contact</a>
                </nav>

                <main class="relative z-10 max-w-5xl mx-auto mt-20">
                    <div class="text-center mb-16">
                        <img src="https://ui-avatars.com/api/?name=Alex+Design&background=a855f7&color=fff" class="w-20 h-20 rounded-full mx-auto mb-6 border-2 border-white/10 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                        <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">Digital Craftsman.</h1>
                        <p class="text-lg text-gray-400 max-w-xl mx-auto">Building premium web experiences merging high-end design with robust engineering.</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[250px]">
                        <div class="md:col-span-2 md:row-span-2 group relative rounded-3xl bg-white/5 border border-white/10 overflow-hidden hover:border-purple-500/50 transition duration-500">
                            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop" class="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 group-hover:opacity-60 transition duration-700">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            <div class="absolute bottom-0 left-0 p-8">
                                <span class="px-3 py-1 text-xs font-semibold bg-purple-500/20 text-purple-300 rounded-full backdrop-blur-sm border border-purple-500/30 mb-3 inline-block">E-Commerce</span>
                                <h3 class="text-3xl font-bold text-white mb-2">Aura Skincare</h3>
                                <p class="text-gray-300">A headless Shopify experience built with Next.js.</p>
                            </div>
                        </div>

                        <div class="group relative rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-8 flex flex-col justify-center hover:-translate-y-1 transition duration-300">
                            <h3 class="text-xl font-bold mb-2">Tech Stack</h3>
                            <div class="flex flex-wrap gap-2 mt-2">
                                <span class="px-3 py-1 text-xs rounded-full bg-white/10 text-white">React</span>
                                <span class="px-3 py-1 text-xs rounded-full bg-white/10 text-white">Three.js</span>
                                <span class="px-3 py-1 text-xs rounded-full bg-white/10 text-white">Tailwind</span>
                                <span class="px-3 py-1 text-xs rounded-full bg-white/10 text-white">Framer</span>
                            </div>
                        </div>

                        <div class="group relative rounded-3xl bg-purple-600/10 border border-purple-500/20 p-8 flex flex-col items-center justify-center text-center hover:bg-purple-600/20 transition duration-300 cursor-pointer">
                            <div class="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                            </div>
                            <h3 class="text-xl font-bold text-white">Let's Talk</h3>
                            <p class="text-sm text-purple-300 mt-1">Available for freelance</p>
                        </div>
                    </div>
                </main>
            </div>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Build a minimal dark portfolio website with a project grid' },
                { role: 'model', content: 'I have created a premium dark portfolio using a modern Bento Grid layout. It features a floating glassmorphic navigation bar, subtle background ambient glows, and interactive cards that zoom and highlight on hover to showcase your projects elegantly.' }
            ],
            created_at: daysAgo(30),
            updated_at: daysAgo(0),
        },
        {
            user_email: 'user@demo.com',
            name: 'Premium FinTech Wallet',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NexaPay Wallet</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <script>tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] } } } }</script>
        </head>
        <body class="bg-[#0B0F19] text-white font-sans antialiased h-screen flex justify-center items-center p-4 sm:p-8">
            
            <div class="w-full max-w-md bg-[#111827] rounded-[40px] shadow-2xl overflow-hidden border border-gray-800 relative ring-8 ring-[#1A2235]">
                <header class="p-6 flex justify-between items-center z-20 relative">
                    <div class="flex items-center gap-3">
                        <img src="https://ui-avatars.com/api/?name=User&background=3B82F6&color=fff" class="w-10 h-10 rounded-full border-2 border-gray-700">
                        <div>
                            <p class="text-xs text-gray-400 font-medium">Good morning,</p>
                            <p class="text-sm font-bold">David M.</p>
                        </div>
                    </div>
                    <button class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition">
                        <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                    </button>
                </header>

                <div class="px-6 relative z-10">
                    <div class="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl p-6 shadow-[0_10px_40px_-10px_rgba(59,130,246,0.5)] relative overflow-hidden">
                        <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        <div class="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-blue-400/20 rounded-full blur-lg"></div>
                        
                        <p class="text-blue-100 text-sm font-medium mb-1 relative z-10">Total Balance</p>
                        <h2 class="text-4xl font-extrabold text-white tracking-tight mb-6 relative z-10">$24,562.00</h2>
                        
                        <div class="flex gap-3 relative z-10">
                            <button class="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path></svg> Send
                            </button>
                            <button class="flex-1 bg-black/20 hover:bg-black/30 backdrop-blur-md text-white py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path></svg> Receive
                            </button>
                        </div>
                    </div>
                </div>

                <div class="mt-8 px-6 pb-8 h-full bg-gray-900 rounded-t-[32px] pt-6 relative border-t border-gray-800">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="font-semibold text-lg">Recent Activity</h3>
                        <a href="#" class="text-sm text-blue-500 font-medium">See all</a>
                    </div>

                    <div class="space-y-4">
                        <div class="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-800 transition cursor-pointer">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                                    <span class="text-xl">🍎</span>
                                </div>
                                <div>
                                    <p class="font-semibold text-sm">Apple Store</p>
                                    <p class="text-xs text-gray-500">Today, 2:45 PM</p>
                                </div>
                            </div>
                            <p class="font-semibold text-sm text-white">-$1,299.00</p>
                        </div>

                        <div class="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-800 transition cursor-pointer">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-800/50">
                                    <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                </div>
                                <div>
                                    <p class="font-semibold text-sm">NexaCorp Salary</p>
                                    <p class="text-xs text-gray-500">Yesterday, 9:00 AM</p>
                                </div>
                            </div>
                            <p class="font-semibold text-sm text-emerald-400">+$4,250.00</p>
                        </div>
                        
                        <div class="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-800 transition cursor-pointer">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                                    <span class="text-xl">☕</span>
                                </div>
                                <div>
                                    <p class="font-semibold text-sm">Starbucks</p>
                                    <p class="text-xs text-gray-500">Yesterday, 8:15 AM</p>
                                </div>
                            </div>
                            <p class="font-semibold text-sm text-white">-$5.40</p>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Create a UI for a personal finance app' },
                { role: 'model', content: 'Here is a premium mobile-first dashboard for a FinTech app. It features a striking gradient balance card with glassmorphic buttons, nested within a sleek dark-themed container that highlights recent transactions with high-quality spacing and typography.' }
            ],
            created_at: daysAgo(20),
            updated_at: daysAgo(2),
        },
        {
            user_email: 'user@demo.com',
            name: 'AI Generator Studio',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lumina AI Studio</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
            <script>tailwind.config = { theme: { extend: { fontFamily: { sans: ['Outfit', 'sans-serif'] } } } }</script>
        </head>
        <body class="bg-[#050505] text-gray-200 font-sans h-screen flex flex-col overflow-hidden">
            
            <header class="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-white/[0.02] backdrop-blur-xl z-20">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-fuchsia-600 to-blue-600 flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <span class="text-xl font-bold text-white tracking-wide">Lumina</span>
                </div>
                <button class="bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-medium px-4 py-2 rounded-full transition">Upgrade to Pro</button>
            </header>

            <main class="flex-1 relative overflow-hidden flex flex-col">
                
                <div class="flex-1 overflow-y-auto p-6 pb-32">
                    <div class="max-w-7xl mx-auto columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                        <div class="relative group rounded-2xl overflow-hidden border border-white/10 cursor-pointer">
                            <img src="https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=800&auto=format&fit=crop" class="w-full object-cover transition duration-500 group-hover:scale-105">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                <p class="text-xs text-gray-300 line-clamp-2">"A hyper-realistic cyberpunk city orbiting a gas giant, neon lights, 8k resolution, cinematic lighting"</p>
                                <div class="flex gap-2 mt-3">
                                    <button class="bg-white/20 hover:bg-white/30 backdrop-blur text-white p-2 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></button>
                                </div>
                            </div>
                        </div>
                        <div class="relative group rounded-2xl overflow-hidden border border-white/10 cursor-pointer">
                            <img src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop" class="w-full object-cover transition duration-500 group-hover:scale-105">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                <p class="text-xs text-gray-300 line-clamp-2">"Abstract geometric shapes floating in void, iridescent materials, octane render"</p>
                            </div>
                        </div>
                        <div class="relative group rounded-2xl overflow-hidden border border-white/10 cursor-pointer">
                            <img src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=800&auto=format&fit=crop" class="w-full object-cover transition duration-500 group-hover:scale-105">
                        </div>
                    </div>
                </div>

                <div class="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4">
                    <div class="bg-gray-900/80 backdrop-blur-2xl border border-white/20 p-2 rounded-3xl shadow-[0_0_50px_-12px_rgba(192,38,211,0.4)] flex items-center gap-3 relative overflow-hidden">
                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-fuchsia-500/10 to-blue-500/10 blur-xl pointer-events-none"></div>
                        
                        <button class="p-3 text-gray-400 hover:text-white transition relative z-10">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        </button>
                        <input type="text" placeholder="Imagine anything... Type your prompt here" class="flex-1 bg-transparent border-none focus:outline-none text-white placeholder-gray-500 text-lg relative z-10 py-3">
                        <button class="bg-white text-black font-semibold px-6 py-3 rounded-2xl hover:bg-gray-200 transition relative z-10 flex items-center gap-2">
                            Generate <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                        </button>
                    </div>
                    <div class="flex justify-center gap-4 mt-3 text-xs text-gray-500 font-medium">
                        <span class="hover:text-gray-300 cursor-pointer">Aspect Ratio: 16:9</span>
                        <span class="hover:text-gray-300 cursor-pointer">Model: Lumina v5</span>
                        <span class="hover:text-gray-300 cursor-pointer">Style: Cinematic</span>
                    </div>
                </div>

            </main>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Design a UI for an AI image generator app.' },
                { role: 'model', content: 'I have designed a highly immersive AI Studio interface. It features a masonry image gallery layout and a visually striking, glassmorphic floating prompt bar at the bottom with neon ambient glows to signify creative generation.' }
            ],
            created_at: daysAgo(15),
            updated_at: daysAgo(1),
        },
        {
            user_email: 'user@demo.com',
            name: 'Luxury Travel Booking',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WanderLuxe - Curated Stays</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            <script>
                tailwind.config = { theme: { extend: { fontFamily: { serif: ['Playfair Display', 'serif'], sans: ['Inter', 'sans-serif'] } } } }
            </script>
        </head>
        <body class="bg-[#FAFAFA] text-gray-900 font-sans antialiased selection:bg-rose-200">
            
            <div class="relative h-[70vh] w-full p-4 sm:p-6 lg:p-8">
                <div class="w-full h-full rounded-[40px] overflow-hidden relative shadow-2xl">
                    <img src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2000&auto=format&fit=crop" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60"></div>
                    
                    <nav class="absolute top-0 w-full p-8 flex justify-between items-center text-white z-10">
                        <span class="text-2xl font-serif tracking-wide">WanderLuxe.</span>
                        <div class="hidden md:flex gap-8 font-medium text-sm">
                            <a href="#" class="hover:text-rose-200 transition">Destinations</a>
                            <a href="#" class="hover:text-rose-200 transition">Experiences</a>
                            <a href="#" class="hover:text-rose-200 transition">Journal</a>
                        </div>
                        <button class="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-2 rounded-full text-sm font-semibold transition">Sign In</button>
                    </nav>

                    <div class="absolute bottom-24 left-8 md:left-16 z-10 max-w-2xl text-white">
                        <h1 class="text-5xl md:text-7xl font-serif leading-tight mb-4">Discover the extraordinary.</h1>
                        <p class="text-lg md:text-xl text-white/80 font-medium">Curated luxury villas and boutique hotels around the globe.</p>
                    </div>
                </div>
                
                <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[90%] max-w-4xl bg-white rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-3 flex flex-col md:flex-row items-center border border-gray-100 z-20">
                    <div class="flex-1 px-6 py-2 border-b md:border-b-0 md:border-r border-gray-200 w-full">
                        <p class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Where</p>
                        <input type="text" placeholder="Santorini, Greece" class="w-full focus:outline-none text-gray-900 font-medium placeholder-gray-900 text-lg">
                    </div>
                    <div class="flex-1 px-6 py-2 border-b md:border-b-0 md:border-r border-gray-200 w-full">
                        <p class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">When</p>
                        <input type="text" placeholder="Oct 12 - Oct 19" class="w-full focus:outline-none text-gray-900 font-medium placeholder-gray-900 text-lg">
                    </div>
                    <div class="flex-1 px-6 py-2 w-full flex justify-between items-center">
                        <div>
                            <p class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Who</p>
                            <input type="text" placeholder="2 Guests" class="w-full focus:outline-none text-gray-900 font-medium placeholder-gray-900 text-lg">
                        </div>
                        <button class="bg-rose-900 hover:bg-rose-800 text-white w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg shrink-0">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </button>
                    </div>
                </div>
            </div>

            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 pb-20">
                <div class="flex justify-between items-end mb-10">
                    <h2 class="text-4xl font-serif text-gray-900">Trending Destinations</h2>
                    <a href="#" class="text-rose-900 font-semibold flex items-center gap-2 hover:gap-3 transition-all">View all <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg></a>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div class="group cursor-pointer">
                        <div class="relative h-96 rounded-3xl overflow-hidden mb-4 shadow-md">
                            <img src="https://images.unsplash.com/photo-1516483638261-f4085ee6bd0f?q=80&w=800&auto=format&fit=crop" class="w-full h-full object-cover group-hover:scale-110 transition duration-700">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
                            <button class="absolute top-4 right-4 bg-white/30 backdrop-blur-md p-2 rounded-full text-white hover:bg-white hover:text-rose-500 transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></button>
                        </div>
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-xl font-bold text-gray-900">Cinque Terre</h3>
                                <p class="text-gray-500">Italy</p>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-gray-900">$450 <span class="text-sm font-normal text-gray-500">/night</span></p>
                                <div class="flex items-center gap-1 text-sm font-medium text-gray-900 mt-1"><span class="text-yellow-400">★</span> 4.96</div>
                            </div>
                        </div>
                    </div>
                    <div class="group cursor-pointer mt-0 md:mt-12">
                        <div class="relative h-96 rounded-3xl overflow-hidden mb-4 shadow-md">
                            <img src="https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=800&auto=format&fit=crop" class="w-full h-full object-cover group-hover:scale-110 transition duration-700">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
                        </div>
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-xl font-bold text-gray-900">Bali Resort</h3>
                                <p class="text-gray-500">Indonesia</p>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-gray-900">$280 <span class="text-sm font-normal text-gray-500">/night</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Design a luxury travel booking website.' },
                { role: 'model', content: 'I have designed a premium luxury travel landing page. The interface utilizes a massive hero image within a rounded container, a floating multi-part search bar bridging the hero and the content, and large, elegant destination cards utilizing serif typography for an upscale feel.' }
            ],
            created_at: daysAgo(5),
            updated_at: daysAgo(0),
        },
        {
            user_email: 'user@demo.com',
            name: 'Streaming Platform UI',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>StreamLine - Movies & Shows</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <script>tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] } } } }</script>
        </head>
        <body class="bg-black text-white font-sans antialiased overflow-x-hidden">
            
            <header class="fixed top-0 w-full z-50 bg-gradient-to-b from-black/80 to-transparent px-8 py-4 flex justify-between items-center transition-all">
                <div class="flex items-center gap-10">
                    <span class="text-2xl font-extrabold text-red-600 tracking-tighter">STREAMLINE</span>
                    <nav class="hidden md:flex gap-6 text-sm font-medium text-gray-300">
                        <a href="#" class="text-white">Home</a>
                        <a href="#" class="hover:text-white transition">TV Shows</a>
                        <a href="#" class="hover:text-white transition">Movies</a>
                        <a href="#" class="hover:text-white transition">My List</a>
                    </nav>
                </div>
                <div class="flex items-center gap-6">
                    <button class="text-white hover:text-gray-300"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></button>
                    <button class="text-white hover:text-gray-300 relative"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg><span class="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full"></span></button>
                    <img src="https://ui-avatars.com/api/?name=User&background=333&color=fff" class="w-8 h-8 rounded-md cursor-pointer">
                </div>
            </header>

            <div class="relative h-[85vh] w-full">
                <img src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2000&auto=format&fit=crop" class="absolute inset-0 w-full h-full object-cover">
                
                <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                
                <div class="absolute bottom-1/4 left-8 md:left-16 max-w-2xl z-10">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Dune_Logo.svg/1024px-Dune_Logo.svg.png" alt="Movie Logo" class="h-24 mb-6 invert brightness-0 opacity-90">
                    <div class="flex items-center gap-3 text-sm font-semibold mb-4 text-gray-300">
                        <span class="text-green-500">98% Match</span>
                        <span>2024</span>
                        <span class="border border-gray-500 px-1 rounded text-xs">PG-13</span>
                        <span>2h 46m</span>
                        <span class="bg-gray-800 text-white px-1.5 rounded text-xs">4K Ultra HD</span>
                    </div>
                    <p class="text-lg text-gray-200 mb-8 line-clamp-3">Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.</p>
                    <div class="flex gap-4">
                        <button class="bg-white hover:bg-gray-200 text-black px-8 py-3 rounded flex items-center gap-2 font-bold text-lg transition">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6V4z"></path></svg> Play
                        </button>
                        <button class="bg-gray-500/50 hover:bg-gray-500/70 backdrop-blur-md text-white px-8 py-3 rounded flex items-center gap-2 font-bold text-lg transition">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> More Info
                        </button>
                    </div>
                </div>
            </div>

            <main class="pl-8 md:pl-16 pb-20 -mt-10 relative z-20">
                <h2 class="text-2xl font-bold mb-4 text-white">Continue Watching for You</h2>
                <div class="flex gap-4 overflow-x-auto pb-8 pr-8 custom-scrollbar scroll-smooth snap-x">
                    
                    <div class="shrink-0 w-72 group relative rounded-md overflow-hidden cursor-pointer snap-start hover:scale-105 transition duration-300 z-10 hover:z-20 hover:shadow-2xl">
                        <div class="aspect-[16/9] w-full bg-gray-900 relative">
                            <img src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=800&auto=format&fit=crop" class="w-full h-full object-cover">
                            <div class="absolute bottom-0 left-0 w-full h-1 bg-gray-600">
                                <div class="h-full bg-red-600 w-[60%]"></div>
                            </div>
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <div class="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                    <svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6V4z"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="shrink-0 w-72 group relative rounded-md overflow-hidden cursor-pointer snap-start hover:scale-105 transition duration-300 z-10 hover:z-20 hover:shadow-2xl">
                        <div class="aspect-[16/9] w-full bg-gray-900 relative">
                            <img src="https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=800&auto=format&fit=crop" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <div class="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center bg-black/50">
                                    <svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6V4z"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="shrink-0 w-72 group relative rounded-md overflow-hidden cursor-pointer snap-start hover:scale-105 transition duration-300 z-10 hover:z-20 hover:shadow-2xl">
                        <div class="aspect-[16/9] w-full bg-gray-900 relative">
                            <img src="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=800&auto=format&fit=crop" class="w-full h-full object-cover">
                        </div>
                    </div>
                </div>
                
                <style>
                    .custom-scrollbar::-webkit-scrollbar { height: 0px; }
                </style>
            </main>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Create a UI for a video streaming platform.' },
                { role: 'model', content: 'Here is a premium streaming layout. It features a full-bleed cinematic hero background with vignette gradients to ensure text legibility, alongside a horizontal scrolling carousel for media thumbnails equipped with Netflix-style zoom-on-hover effects.' }
            ],
            created_at: daysAgo(10),
            updated_at: daysAgo(1),
        },
        {
            user_email: 'user@demo.com',
            name: 'Fitness & Sleep Tracker',
            code: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vitality Health Tracker</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <script>tailwind.config = { theme: { extend: { fontFamily: { sans: ['Manrope', 'sans-serif'] } } } }</script>
        </head>
        <body class="bg-[#090C15] text-white font-sans antialiased min-h-screen p-4 sm:p-8 flex justify-center items-center">
            
            <div class="w-full max-w-sm bg-[#131826] rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[#1F2937] overflow-hidden">
                
                <div class="p-6 pb-2 flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight">Today</h1>
                        <p class="text-sm text-gray-400 font-medium">Thursday, Oct 12</p>
                    </div>
                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 p-[2px]">
                        <img src="https://ui-avatars.com/api/?name=Emma&background=131826&color=fff" class="w-full h-full rounded-full border-2 border-[#131826]">
                    </div>
                </div>

                <div class="p-6 space-y-4">
                    
                    <div class="bg-[#1C2333] rounded-3xl p-5 border border-white/5 flex items-center justify-between">
                        <div>
                            <h2 class="font-bold text-lg mb-4">Activity</h2>
                            <div class="space-y-3">
                                <div class="flex items-center gap-3">
                                    <span class="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]"></span>
                                    <div>
                                        <p class="text-xs text-gray-400">Move</p>
                                        <p class="font-bold text-sm">480 / <span class="text-gray-500">600 kcal</span></p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]"></span>
                                    <div>
                                        <p class="text-xs text-gray-400">Exercise</p>
                                        <p class="font-bold text-sm">32 / <span class="text-gray-500">45 min</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="relative w-24 h-24 flex items-center justify-center">
                            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#311728" stroke-width="8"/>
                                <circle cx="50" cy="50" r="28" fill="transparent" stroke="#162E21" stroke-width="8"/>
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ec4899" stroke-width="8" stroke-dasharray="251" stroke-dashoffset="50" stroke-linecap="round"/>
                                <circle cx="50" cy="50" r="28" fill="transparent" stroke="#4ade80" stroke-width="8" stroke-dasharray="175" stroke-dashoffset="40" stroke-linecap="round"/>
                            </svg>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-3xl p-4">
                            <div class="flex items-center gap-2 mb-2">
                                <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg>
                                <span class="text-xs font-semibold text-red-400">Heart Rate</span>
                            </div>
                            <p class="text-3xl font-extrabold text-white">72 <span class="text-sm font-medium text-gray-400">bpm</span></p>
                            <p class="text-xs text-gray-500 mt-1">Resting: 64 bpm</p>
                        </div>

                        <div class="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-3xl p-4">
                            <div class="flex items-center gap-2 mb-2">
                                <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                                <span class="text-xs font-semibold text-blue-400">Sleep</span>
                            </div>
                            <p class="text-3xl font-extrabold text-white">7<span class="text-xl">h</span> 15<span class="text-xl">m</span></p>
                            <p class="text-xs text-gray-500 mt-1">Deep sleep: 2h</p>
                        </div>
                    </div>
                    
                    <div class="bg-[#1C2333] rounded-3xl p-4 border border-white/5 flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                                <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                            </div>
                            <div>
                                <p class="font-bold">Water</p>
                                <p class="text-xs text-gray-400">1.2 / 2.5 Liters</p>
                            </div>
                        </div>
                        <button class="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center text-black font-bold transition">+</button>
                    </div>
                </div>
            </div>
        </body>
        </html>`,
            messages: [
                { role: 'user', content: 'Create a UI for a health tracking app.' },
                { role: 'model', content: 'I created a premium dark-mode fitness tracker dashboard. It uses high-contrast neon accents for data visualization, including a custom SVG implementation for circular activity rings, and clean bento-style cards for modular health metrics.' }
            ],
            created_at: daysAgo(50),
            updated_at: daysAgo(1),
        }

    ];

    const { error } = await supabaseAdmin.from('websites').upsert(websites, { onConflict: 'id' });
    if (error) throw new Error(`Seed websites failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// STEP 10: Seed RAG Documents with REAL Embeddings
// Downloads a real PDF, extracts text, generates Gemini embeddings, and stores
// chunks for both admin and demo user so LiveChat can answer questions.
// ---------------------------------------------------------------------------
const PDF_URL = 'https://writing.colostate.edu/guides/documents/resume/functionalsample.pdf';

async function seedRAGDocuments(): Promise<{ docCount: number; chunkCount: number }> {
    const targetUsers = ['admin@example.com', 'user@demo.com'];
    let totalChunks = 0;

    try {
        // 1. Download the PDF
        console.log('[SEED] Downloading PDF from:', PDF_URL);
        const pdfResponse = await fetch(PDF_URL);
        if (!pdfResponse.ok) throw new Error(`Failed to download PDF: ${pdfResponse.status}`);
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
        const pdfBuffer = Buffer.from(pdfArrayBuffer);
        console.log(`[SEED] PDF downloaded: ${pdfBuffer.length} bytes`);

        // 2. Extract text from PDF
        const extractedText = await extractTextFromFile(pdfBuffer, 'functionalsample.pdf');
        if (!extractedText || extractedText.trim().length < 10) {
            throw new Error('No useful text extracted from PDF');
        }
        console.log(`[SEED] Extracted ${extractedText.length} characters from PDF`);

        // 3. Chunk the text
        const textChunks = chunkText(extractedText);
        console.log(`[SEED] Created ${textChunks.length} chunks`);

        // 4. Generate embeddings for all chunks
        console.log('[SEED] Generating embeddings via Gemini...');
        const embeddedChunks = await Promise.all(
            textChunks.map(async (content) => {
                const embedding = await getEmbedding(content);
                return { content, embedding };
            })
        );
        console.log(`[SEED] Generated ${embeddedChunks.length} embeddings`);

        // 5. Create document + chunks for each target user
        for (const userEmail of targetUsers) {
            // Create the document record
            const { data: doc, error: docError } = await supabaseAdmin
                .from('documents')
                .upsert({
                    id: userEmail === 'admin@example.com' 
                        ? 'f47ac10b-58cc-4372-a567-0e02b2c3d479' 
                        : '550e8400-e29b-41d4-a716-446655440000',
                    user_email: userEmail,
                    name: 'Functional Resume Sample.pdf',
                    status: 'completed',
                    metadata: {
                        pages: 1,
                        size: `${Math.round(pdfBuffer.length / 1024)} KB`,
                        type: 'application/pdf',
                        source: PDF_URL,
                    },
                    created_at: daysAgo(5),
                }, { onConflict: 'id' })
                .select('id')
                .single();

            if (docError) throw new Error(`Seed document for ${userEmail} failed: ${docError.message}`);

            // Insert chunks with real embeddings
            const chunksToInsert = embeddedChunks.map((c) => ({
                document_id: doc.id,
                content: c.content,
                embedding: c.embedding,
            }));

            const { error: chunkError } = await supabaseAdmin
                .from('document_chunks')
                .insert(chunksToInsert);

            if (chunkError) throw new Error(`Seed chunks for ${userEmail} failed: ${chunkError.message}`);
            totalChunks += chunksToInsert.length;
            console.log(`[SEED] Seeded ${chunksToInsert.length} chunks for ${userEmail}`);
        }

        return { docCount: targetUsers.length, chunkCount: totalChunks };
    } catch (error: any) {
        console.error('[SEED] RAG document seeding failed:', error.message);
        console.warn('[SEED] Falling back to placeholder documents (no embeddings)');

        // Fallback: insert placeholder documents without embeddings
        const fallbackDocs = targetUsers.map((email) => ({
            user_email: email,
            name: 'Functional Resume Sample.pdf',
            status: 'error' as const,
            metadata: {
                error: `Embedding generation failed: ${error.message}`,
                type: 'application/pdf',
            },
            created_at: daysAgo(5),
        }));

        const { error: fbError } = await supabaseAdmin.from('documents').insert(fallbackDocs);
        if (fbError) console.error('[SEED] Fallback document insert failed:', fbError.message);

        return { docCount: targetUsers.length, chunkCount: 0 };
    }
}

// ---------------------------------------------------------------------------
// STEP 11: Seed Languages and Translations
// ---------------------------------------------------------------------------
async function seedLanguagesAndTranslations() {
    const languages = [
        { code: 'en', name: 'English', direction: 'ltr', is_enabled: true, created_at: daysAgo(10) },
        { code: 'fr', name: 'French', direction: 'ltr', is_enabled: true, created_at: daysAgo(10) },
        { code: 'es', name: 'Spanish', direction: 'ltr', is_enabled: true, created_at: daysAgo(10) },
        { code: 'ar', name: 'Arabic', direction: 'rtl', is_enabled: true, created_at: daysAgo(10) },
        { code: 'cn', name: 'Chinese', direction: 'ltr', is_enabled: true, created_at: daysAgo(10) }
    ];

    // Use insert (not upsert) since tables are already truncated
    const { data: langData, error: langError } = await supabaseAdmin.from('languages').upsert(languages, { onConflict: 'code' }).select();
    if (langError) throw new Error(`Seed languages failed: ${langError.message}`);

    const translationsToInsert: any[] = [];
    const now = new Date().toISOString();
    for (const [key, values] of Object.entries(translationsData)) {
        translationsToInsert.push({
            translation_key: key,
            language_code: 'en',
            value: (values as any).en || key,
            updated_at: now
        });
        translationsToInsert.push({
            translation_key: key,
            language_code: 'fr',
            value: (values as any).fr || (values as any).en || key,
            updated_at: now
        });
        translationsToInsert.push({
            translation_key: key,
            language_code: 'es',
            value: (values as any).es || (values as any).en || key,
            updated_at: now
        });
        translationsToInsert.push({
            translation_key: key,
            language_code: 'ar',
            value: (values as any).ar || (values as any).en || key,
            updated_at: now
        });
        translationsToInsert.push({
            translation_key: key,
            language_code: 'cn',
            value: (values as any).cn || (values as any).en || key,
            updated_at: now
        });
    }

    // Insert in batches of 500 for optimal performance
    const chunkSize = 500;
    for (let i = 0; i < translationsToInsert.length; i += chunkSize) {
        const batch = translationsToInsert.slice(i, i + chunkSize);
        if (batch.length === 0) continue;
        const { error } = await supabaseAdmin.from('translations').upsert(batch, { onConflict: 'translation_key,language_code' });
        if (error) throw new Error(`Seed translations failed (batch ${i}): ${error.message}`);
    }
}

// ---------------------------------------------------------------------------
// STEP 12: Seed Meetings
// ---------------------------------------------------------------------------
async function seedMeetings() {
    const meetings = [
        {
            id: 'daily-scrum-99',
            title: 'Daily Scrum - Product Team',
            host_email: 'admin@example.com',
            status: 'active',
            max_participants: 8,
            created_at: hoursAgo(2),
        },
        {
            id: 'design-review-101',
            title: 'Design Review: Dashboard v2',
            host_email: 'admin@example.com',
            status: 'active',
            max_participants: 5,
            created_at: daysAgo(1),
        },
        {
            id: 'client-onboarding-jordan',
            title: 'Jordan Lee Onboarding',
            host_email: 'admin@example.com',
            status: 'ended',
            max_participants: 2,
            created_at: daysAgo(2),
            ended_at: daysAgo(2),
        },
        {
            id: 'marketing-sync-demo',
            title: 'Marketing Strategy Sync',
            host_email: 'user@demo.com',
            status: 'active',
            max_participants: 10,
            created_at: hoursAgo(4),
        },
        {
            id: 'quick-catchup-123',
            title: 'Quick Catch-up',
            host_email: 'user@demo.com',
            status: 'active',
            max_participants: 3,
            created_at: hoursAgo(1),
        }
    ];

    const { error } = await supabaseAdmin.from('meetings').upsert(meetings, { onConflict: 'id' });
    if (error) throw new Error(`Seed meetings failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// STEP 14: Seed Announcement Banners
// ---------------------------------------------------------------------------
async function seedAnnouncementBanners() {
    const currentYear = new Date().getFullYear();

    const banners = [
        {
            message: '<strong>Get Exclusive Discounts & a Premium License — Buy the Complete Project from Our <a style="color:#fff;text-decoration:underline;font-weight:bold;" href="https://mounikai.com/browse" target="_blank" >Marketplace Today</a> </strong>',
            start_date: new Date(`${currentYear}-01-01T00:00:00Z`).toISOString(),
            end_date: new Date(`${currentYear}-12-31T23:59:59Z`).toISOString(),
            bg_gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            text_color: '#ffffff',
            is_enabled: true,
            is_dismissible: true,
            button_text: 'Checkout',
            button_link: 'https://mounikai.com/product/a9921866-35a4-41d0-a137-23483d06e0b7',
            priority: 10,
            created_at: daysAgo(0),
            updated_at: daysAgo(0),
        },
    ];

    const { error } = await supabaseAdmin.from('announcement_banners').upsert(banners);
    if (error) throw new Error(`Seed announcement_banners failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// STEP 16: Seed Marketing Data (Avatar Studio, Image Generator, Video Generator)
// ---------------------------------------------------------------------------
async function seedMarketingData() {
    const avatars = [
        {
            id: '989b7d1c-0492-4ab3-b47a-d9b9adcbc7bb',
            user_email: 'admin@example.com',
            name: 'Test Avatar',
            image_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/my_avatars/1.png',
            type: 'generated',
            created_at: daysAgo(2),
        },
        {
            id: '48501250-8d7b-4d35-86d5-1dd51889c914',
            user_email: 'admin@example.com',
            name: 'Test Avatar 2',
            image_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/my_avatars/2.png',
            type: 'generated',
            created_at: daysAgo(1),
        },
        {
            id: '989b7d1c-0492-4ab3-b47a-d9b9adcbc7fb',
            user_email: 'user@demo.com',
            name: 'Test Avatar',
            image_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/my_avatars/1.png',
            type: 'generated',
            created_at: daysAgo(2),
        },
        {
            id: '48501250-8d7b-4d35-86d5-1dd51889c814',
            user_email: 'user@demo.com',
            name: 'Test Avatar 2',
            image_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/my_avatars/2.png',
            type: 'generated',
            created_at: daysAgo(1),
        }
    ];

    const assets = [
        {
            "id": "b1291f3d-ea29-4e9d-8fb7-fae6ffa0abdb",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/1.png",
            "prompt": "Mediterranean-style advertisement for 100% natural coconut water, featuring a happy woman in a coastal town.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(1)
        },
        {
            "id": "00110e9d-74bc-4715-ad5e-e429a5f8a186",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/2.png",
            "prompt": "Elegant high-end skincare product showcase with soft lighting and natural elements.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(2)
        },
        {
            "id": "11cf1048-724c-4699-84e7-04ff86cca6c7",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/3.png",
            "prompt": "Modern architectural masterpiece house in a desert landscape with large glass windows.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(3)
        },
        {
            "id": "58ad8b43-7ac6-4a72-93d6-7d7fb44abbb3",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/4.png",
            "prompt": "Breathtaking mountain range at sunrise with orange and purple hues in the sky.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(4)
        },
        {
            "id": "8fc6a56a-5ff6-440f-b000-6d12da0411e1",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/5.png",
            "prompt": "Professional woman focused on writing in her journal at a sunlit wooden desk, productivity theme.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(5)
        },
        {
            "id": "f5e92c1a-0d5a-4763-9f22-a47b3a293e28",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/6.png",
            "prompt": "Luxury sportscar driving through a futuristic city tunnel with neon light streaks.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(6)
        },
        {
            "id": "f83c79d2-3b12-489c-b13b-3b1875ce1427",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/7.png",
            "prompt": "Gourmet dessert plating with gold leaf and fresh berries in a dark ambient restaurant.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(7)
        },
        {
            "id": "fbd8ab58-2a5e-445f-8f55-899c61fcc899",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/8.png",
            "prompt": "Abstract digital art representing neural networks and artificial intelligence connectivity.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(8)
        },
        {
            "id": "f2afc273-2beb-4d49-a70a-f50e6cdbe9b0",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/9.png",
            "prompt": "Serene tropical beach with crystal clear water and a single palm tree leaning over.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(9)
        },
        {
            "id": "96ff6593-0f29-4387-bb40-49593a240dd8",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/10.png",
            "prompt": "Elegant perfume advertisement featuring a sophisticated woman with pearls in a European city background.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(0)
        },
        {
            "id": "f9b25161-d3f2-41c9-9f9c-80207ce0f577",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/11.png",
            "prompt": "Cozy library interior with floor-to-ceiling bookshelves and a warm fireplace.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(1)
        },
        {
            "id": "c6e2a2ec-3015-44de-89a3-c6ac9ac47ff8",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/12.png",
            "prompt": "Close-up of a high-tech mechanical watch showing intricate gears and premium finish.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(2)
        },
        {
            "id": "38f241b5-66c0-4d8e-b3ce-c61ecb4abbf7",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/13.png",
            "prompt": "Futuristic holographic interface for data analysis in a dark high-tech room.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(3)
        },
        {
            "id": "76827372-136c-4f92-a21e-3ea7d2f03a22",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/14.png",
            "prompt": "Minimalist interior design of a living room with Japandi style and neutral colors.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(4)
        },
        {
            "id": "aac06693-94a4-4a7f-ba30-f20793fe94d3",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/15.png",
            "prompt": "Mediterranean lifestyle image of a woman reading 'The Art of Living Well' on a sunny terrace with sea view.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(5)
        },
        {
            "id": "900edd23-0e0b-4587-b570-83c8d7029ef8",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/16.png",
            "prompt": "Macro photography of a butterfly on a colorful spring flower with bokeh background.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(6)
        },
        {
            "id": "9d52c541-05c7-4fcd-b9e5-7331a5fc5758",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/17.png",
            "prompt": "Bustling city street in Tokyo at night with vibrant neon signs and motion blur.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(7)
        },
        {
            "id": "1c0d59d6-0e31-49c5-9a76-bf8e675349c1",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/18.png",
            "prompt": "Luxury organic tea packaging design on a stone surface with herbal ingredients.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(8)
        },
        {
            "id": "119cefb7-d686-4999-bdf5-af22221d133b",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/19.png",
            "prompt": "Yoga practitioner meditating on a cliff overlooking the ocean at sunset.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(9)
        },
        {
            "id": "0d8beac7-099d-4e00-91cf-c0760cacff22",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/20.png",
            "prompt": "Professional woman watering a small green plant, symbolizing sustainable growth and corporate care.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(0)
        },
        {
            "id": "605fabd5-30e2-46a3-a593-b9734610b300",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/21.png",
            "prompt": "Artistic representation of a DNA double helix in a glowing scientific laboratory environment.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(1)
        },
        {
            "id": "93a7d323-5043-4c49-9db8-ab0349ec83b7",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/22.png",
            "prompt": "Grand opera house interior with golden balconies and a massive crystal chandelier.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(2)
        },
        {
            "id": "0f69f29c-7dfc-4447-b63e-a11eb93a33bc",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/23.png",
            "prompt": "Rustic Italian kitchen with fresh pasta, tomatoes, and basil on a wooden table.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(3)
        },
        {
            "id": "57efdb33-1f48-4894-b09d-58d74fbc93a6",
            "user_email": "admin@example.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/24.png",
            "prompt": "Professional woman in a grey blazer watering a plant in a clean, modern office setting.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(4)
        },
        {
            id: '04f82b37-af07-4853-b99f-4a3d924f3d22',
            user_email: 'admin@example.com',
            type: 'video',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/videos/2.mp4',
            prompt: 'Premium sneakers showcase with cinematic lighting.',
            metadata: {
                options: { duration: '5s', quality: 'hd' }
            },
            created_at: daysAgo(2),
        },
        {
            id: '04f82b37-af07-4853-b99f-4a3d924f3d23',
            user_email: 'admin@example.com',
            type: 'video',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/videos/1.mp4',
            prompt: 'Futuristic product reveal with smooth camera movement.',
            metadata: {
                options: { duration: '5s', quality: 'hd' }
            },
            created_at: daysAgo(1),
        },
        {
            id: '04f82b37-af07-4853-b99f-4a3d924f3d24',
            user_email: 'user@demo.com',
            type: 'video',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/videos/2.mp4',
            prompt: 'Premium sneakers showcase with cinematic lighting.',
            metadata: {
                options: { duration: '5s', quality: 'hd' }
            },
            created_at: daysAgo(2),
        },
        {
            id: '04f82b37-af07-4853-b99f-4a3d924f3d25',
            user_email: 'user@demo.com',
            type: 'video',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/videos/1.mp4',
            prompt: 'Futuristic product reveal with smooth camera movement.',
            metadata: {
                options: { duration: '5s', quality: 'hd' }
            },
            created_at: daysAgo(1),
        },
        {
            "id": "3f72cf32-da41-4b10-afc5-6cfbb3533e8c",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/1.png",
            "prompt": "Mediterranean-style advertisement for 100% natural coconut water, featuring a happy woman in a coastal town.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(1)
        },
        {
            "id": "0f0a99d4-9e5d-498a-a20a-e3a1e0c594c8",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/2.png",
            "prompt": "Elegant high-end skincare product showcase with soft lighting and natural elements.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(2)
        },
        {
            "id": "b2bca2d2-cf78-4472-a47a-4b8cd4b5c27a",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/3.png",
            "prompt": "Modern architectural masterpiece house in a desert landscape with large glass windows.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(3)
        },
        {
            "id": "e086ba87-4c21-4e7d-8efb-422306e378ef",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/4.png",
            "prompt": "Breathtaking mountain range at sunrise with orange and purple hues in the sky.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(4)
        },
        {
            "id": "ac11f663-d4aa-4606-b1fc-7862476a6a90",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/5.png",
            "prompt": "Professional woman focused on writing in her journal at a sunlit wooden desk, productivity theme.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(5)
        },
        {
            "id": "b4ef1e0b-b3ab-46cd-b504-30760efaec30",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/6.png",
            "prompt": "Luxury sportscar driving through a futuristic city tunnel with neon light streaks.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(6)
        },
        {
            "id": "9be5242c-d0c9-4b1d-b0fa-fa45f48c87bf",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/7.png",
            "prompt": "Gourmet dessert plating with gold leaf and fresh berries in a dark ambient restaurant.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(7)
        },
        {
            "id": "42d20053-ebbd-4cb4-a6cf-5282dd664693",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/8.png",
            "prompt": "Abstract digital art representing neural networks and artificial intelligence connectivity.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(8)
        },
        {
            "id": "a67209e8-c9a0-4ff8-8024-fc6c0259faa6",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/9.png",
            "prompt": "Serene tropical beach with crystal clear water and a single palm tree leaning over.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(9)
        },
        {
            "id": "dfcf7b00-0265-4cc1-bcd0-c7eed5b07475",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/10.png",
            "prompt": "Elegant perfume advertisement featuring a sophisticated woman with pearls in a European city background.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(0)
        },
        {
            "id": "6555f786-97fd-4fb1-a23c-182f5506e395",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/11.png",
            "prompt": "Cozy library interior with floor-to-ceiling bookshelves and a warm fireplace.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(1)
        },
        {
            "id": "6c3290ce-00a3-418c-99ba-96c5df4f6e14",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/12.png",
            "prompt": "Close-up of a high-tech mechanical watch showing intricate gears and premium finish.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(2)
        },
        {
            "id": "b92b1431-3d40-4bb5-a3d1-3ffcf9976c08",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/13.png",
            "prompt": "Futuristic holographic interface for data analysis in a dark high-tech room.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(3)
        },
        {
            "id": "7a2a3ea0-16bd-4571-b4ce-d1c7c5d025a4",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/14.png",
            "prompt": "Minimalist interior design of a living room with Japandi style and neutral colors.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(4)
        },
        {
            "id": "d7d1107b-a702-45b9-bf72-7e9ddad2f651",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/15.png",
            "prompt": "Mediterranean lifestyle image of a woman reading 'The Art of Living Well' on a sunny terrace with sea view.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(5)
        },
        {
            "id": "f60dd5fa-74cd-45eb-aa2d-87e06608f9ee",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/16.png",
            "prompt": "Macro photography of a butterfly on a colorful spring flower with bokeh background.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(6)
        },
        {
            "id": "ffed579b-a9d8-4c29-b218-f12fcf8410bc",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/17.png",
            "prompt": "Bustling city street in Tokyo at night with vibrant neon signs and motion blur.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(7)
        },
        {
            "id": "d1b67193-f270-40e9-be66-3b616cd8e1eb",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/18.png",
            "prompt": "Luxury organic tea packaging design on a stone surface with herbal ingredients.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(8)
        },
        {
            "id": "ae840155-7ce1-4d2d-8f6b-708ed3ed9e70",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/19.png",
            "prompt": "Yoga practitioner meditating on a cliff overlooking the ocean at sunset.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(9)
        },
        {
            "id": "9c4286c2-b417-4ca9-9376-23f895d23460",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/20.png",
            "prompt": "Professional woman watering a small green plant, symbolizing sustainable growth and corporate care.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(0)
        },
        {
            "id": "ab925364-1e42-49b3-9a78-1d2153d54b49",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/21.png",
            "prompt": "Artistic representation of a DNA double helix in a glowing scientific laboratory environment.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(1)
        },
        {
            "id": "63340bbf-abbf-4697-846c-ebc5f8cba8e9",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/22.png",
            "prompt": "Grand opera house interior with golden balconies and a massive crystal chandelier.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(2)
        },
        {
            "id": "dcd21854-109d-4c3a-8fca-65f9d90815df",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/23.png",
            "prompt": "Rustic Italian kitchen with fresh pasta, tomatoes, and basil on a wooden table.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(3)
        },
        {
            "id": "56b791f8-8878-468c-9681-b3de2c6f56d0",
            "user_email": "user@demo.com",
            "type": "image",
            "url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/24.png",
            "prompt": "Professional woman in a grey blazer watering a plant in a clean, modern office setting.",
            "metadata": {
              "options": {
                "size": "1:1",
                "isEnhance": true
              }
            },
            "created_at": daysAgo(4)
        },
        // Logo Assets - Added for demo
        // Logo Assets - Added for demo
        {
            id: '7b8d4f3e-5a1c-4b6e-8d2f-9c0b1a2d3e4f',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/1.png',
            prompt: 'Modern minimalist abstract logo for a tech startup.',
            metadata: { name: 'Tech Sphere' },
            created_at: daysAgo(1),
        },
        {
            id: '8c9e5f4d-6b2c-5c7f-9e3a-0d1c2b3e4f5a',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/2.png',
            prompt: 'Geometric logo design with clean lines and symmetrical shapes.',
            metadata: { name: 'Geo Pulse' },
            created_at: daysAgo(1),
        },
        {
            id: '9d0a6f5e-7c3d-6d8a-0f4b-1e2d3c4b5a6b',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/3.png',
            prompt: 'Futuristic icon representing connectivity and digital networks.',
            metadata: { name: 'Net Link' },
            created_at: daysAgo(1),
        },
        {
            id: '0e1b7a6f-8d4e-7e9b-1a5c-2f3d4c5b6a7c',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/4.png',
            prompt: 'Sleek professional logo for a creative design agency.',
            metadata: { name: 'Creative Wave' },
            created_at: daysAgo(1),
        },
        {
            id: '1f2c8b7a-9e5f-8f0c-2b6d-3a4e5d6c7b8d',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/5.png',
            prompt: 'Bold corporate identity logo with a strong visual presence.',
            metadata: { name: 'Titan Core' },
            created_at: daysAgo(1),
        },
        {
            id: '2a3d9c8b-0f6a-9a1d-3c7e-4b5f6e7d8c9e',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/6.png',
            prompt: 'Elegant cursive-style logo for a luxury fashion brand.',
            metadata: { name: 'Vogue Style' },
            created_at: daysAgo(1),
        },
        {
            id: '3b4e0d9c-1a7b-0b2e-4d8f-5c6a7b8c9d0f',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/7.png',
            prompt: 'Abstract representation of growth and innovation.',
            metadata: { name: 'Innovate Flow' },
            created_at: daysAgo(1),
        },
        {
            id: '4c5f1e0d-2b8c-1c3f-5e9a-6d7b8c9d0a1b',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/8.png',
            prompt: 'Circular logo with a focus on harmony and balance.',
            metadata: { name: 'Zenith Circle' },
            created_at: daysAgo(1),
        },
        {
            id: '5d6a2f1e-3c9d-2d4a-6f0b-7e8c9d0a1b2c',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/9.png',
            prompt: 'High-tech robotic head icon for an AI company.',
            metadata: { name: 'Cyber Mind' },
            created_at: daysAgo(1),
        },
        {
            id: '6e7b3a2f-4d0e-3e5b-7a1c-8f9d0a1b2c3d',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/10.png',
            prompt: 'Minimalist animal mascot logo for a lifestyle brand.',
            metadata: { name: 'Swift Lynx' },
            created_at: daysAgo(1),
        },
        {
            id: '7f8c4b3a-5e1f-4f6c-8b2d-9a0b1c2d3e4f',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/11.png',
            prompt: 'Dynamic flame icon representing energy and passion.',
            metadata: { name: 'Fire Peak' },
            created_at: daysAgo(1),
        },
        {
            id: '8a9d5c4b-6f2a-5a7d-9c3e-0b1c2d3e4f5a',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/12.png',
            prompt: 'Sustainable and eco-friendly leaf-inspired logo.',
            metadata: { name: 'Eco Leaf' },
            created_at: daysAgo(1),
        },
        {
            id: '9b0e6d5c-7a3b-6b8e-0d4f-1c2d3e4f5a6b',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/13.png',
            prompt: 'Symmetrical snowflake design for a winter sports brand.',
            metadata: { name: 'Frost Bite' },
            created_at: daysAgo(1),
        },
        {
            id: '0c1f7e6d-8b4c-7c9f-1e5a-2d3e4f5a6b7c',
            user_email: 'admin@example.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/14.png',
            prompt: 'Elegant crown icon for a premium service provider.',
            metadata: { name: 'Royal Core' },
            created_at: daysAgo(1),
        },
        {
            id: '1d2a8f7e-9c5d-8d0a-2f6b-3e4f5a6b7c8d',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/1.png',
            prompt: 'Modern minimalist abstract logo for a tech startup.',
            metadata: { name: 'Tech Sphere' },
            created_at: daysAgo(1),
        },
        {
            id: '2e3b9a8f-0d6e-9e1b-3a7c-4f5a6b7c8d9e',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/2.png',
            prompt: 'Geometric logo design with clean lines and symmetrical shapes.',
            metadata: { name: 'Geo Pulse' },
            created_at: daysAgo(1),
        },
        {
            id: '3f4c0b9a-1e7f-0f2c-4b8d-5a6b7c8d9e0f',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/3.png',
            prompt: 'Futuristic icon representing connectivity and digital networks.',
            metadata: { name: 'Net Link' },
            created_at: daysAgo(1),
        },
        {
            id: '4a5d1c0b-2f8a-1a3d-5c9e-6b7c8d9e0a1b',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/4.png',
            prompt: 'Sleek professional logo for a creative design agency.',
            metadata: { name: 'Creative Wave' },
            created_at: daysAgo(1),
        },
        {
            id: '5b6e2d1c-3a9b-2b4e-6d0f-7c8d9e0a1b2c',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/5.png',
            prompt: 'Bold corporate identity logo with a strong visual presence.',
            metadata: { name: 'Titan Core' },
            created_at: daysAgo(1),
        },
        {
            id: '6c7f3e2d-4b0c-3c5f-7e1a-8d9e0a1b2c3d',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/6.png',
            prompt: 'Elegant cursive-style logo for a luxury fashion brand.',
            metadata: { name: 'Vogue Style' },
            created_at: daysAgo(1),
        },
        {
            id: '7d8a4f3e-5c1d-4d6a-8f2b-9e0a1b2c3d4f',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/7.png',
            prompt: 'Abstract representation of growth and innovation.',
            metadata: { name: 'Innovate Flow' },
            created_at: daysAgo(1),
        },
        {
            id: '8e9b5a4f-6d2e-5e7b-9a3c-0f1a2b3c4d5e',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/8.png',
            prompt: 'Circular logo with a focus on harmony and balance.',
            metadata: { name: 'Zenith Circle' },
            created_at: daysAgo(1),
        },
        {
            id: '9f0c6b5a-7e3f-6f8c-0b4d-1a2b3c4d5e6f',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/9.png',
            prompt: 'High-tech robotic head icon for an AI company.',
            metadata: { name: 'Cyber Mind' },
            created_at: daysAgo(1),
        },
        {
            id: '0a1d7c6b-8f4a-7a9d-1c5e-2b3c4d5e6f7a',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/10.png',
            prompt: 'Minimalist animal mascot logo for a lifestyle brand.',
            metadata: { name: 'Swift Lynx' },
            created_at: daysAgo(1),
        },
        {
            id: '1b2e8d7c-9a5b-8b0e-2d6f-3c4d5e6f7a8b',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/11.png',
            prompt: 'Dynamic flame icon representing energy and passion.',
            metadata: { name: 'Fire Peak' },
            created_at: daysAgo(1),
        },
        {
            id: '2c3f9e8d-0b6c-9c1f-3e7a-4d5e6f7a8b9c',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/12.png',
            prompt: 'Sustainable and eco-friendly leaf-inspired logo.',
            metadata: { name: 'Eco Leaf' },
            created_at: daysAgo(1),
        },
        {
            id: '3d4a0f9e-1c7d-0d2a-4f8b-5e6f7a8b9c0d',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/13.png',
            prompt: 'Symmetrical snowflake design for a winter sports brand.',
            metadata: { name: 'Frost Bite' },
            created_at: daysAgo(1),
        },
        {
            id: '4e5b1a0f-2d8e-1e3b-5a9c-6f7a8b9c0d1e',
            user_email: 'user@demo.com',
            type: 'logo',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/14.png',
            prompt: 'Elegant crown icon for a premium service provider.',
            metadata: { name: 'Royal Core' },
            created_at: daysAgo(1),
        },
        // Manga Assets - Added for demo
        // Manga Assets - Added for demo
        {
            id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'manga',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/1.png',
            prompt: 'Epic samurai duel in a moonlit cherry blossom garden, high-contrast manga style.',
            metadata: { name: 'Moonlit Duel' },
            created_at: daysAgo(1),
        },
        {
            id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            user_email: 'admin@example.com',
            type: 'manga',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/2.png',
            prompt: 'Cyberpunk city street at night with neon lights and futuristic vehicles, detailed ink work.',
            metadata: { name: 'Neon City' },
            created_at: daysAgo(1),
        },
        {
            id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
            user_email: 'admin@example.com',
            type: 'manga',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/3.png',
            prompt: 'Mystical fantasy forest with glowing flora and ancient ruins, ethereal manga aesthetic.',
            metadata: { name: 'Spirit Woods' },
            created_at: daysAgo(1),
        },
        {
            id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
            user_email: 'admin@example.com',
            type: 'manga',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/4.png',
            prompt: 'School life slice-of-life scene with students on a sunny rooftop, clean line art.',
            metadata: { name: 'High School Days' },
            created_at: daysAgo(1),
        },
        {
            id: '6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c',
            user_email: 'user@demo.com',
            type: 'manga',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/1.png',
            prompt: 'Epic samurai duel in a moonlit cherry blossom garden, high-contrast manga style.',
            metadata: { name: 'Moonlit Duel' },
            created_at: daysAgo(1),
        },
        {
            id: '5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
            user_email: 'user@demo.com',
            type: 'manga',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/2.png',
            prompt: 'Cyberpunk city street at night with neon lights and futuristic vehicles, detailed ink work.',
            metadata: { name: 'Neon City' },
            created_at: daysAgo(1),
        },
        {
            id: '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
            user_email: 'user@demo.com',
            type: 'manga',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/3.png',
            prompt: 'Mystical fantasy forest with glowing flora and ancient ruins, ethereal manga aesthetic.',
            metadata: { name: 'Spirit Woods' },
            created_at: daysAgo(1),
        },
        {
            id: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
            user_email: 'user@demo.com',
            type: 'manga',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/4.png',
            prompt: 'School life slice-of-life scene with students on a sunny rooftop, clean line art.',
            metadata: { name: 'High School Days' },
            created_at: daysAgo(1),
        },
        // YouTube Thumbnail Assets - Added for demo
        // YouTube Thumbnail Assets - Added for demo
        {
            id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
            user_email: 'admin@example.com',
            type: 'thumbnail',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/1.png',
            prompt: 'High-conversion gaming thumbnail with vibrant colors and bold text.',
            metadata: { name: 'Gaming Pro' },
            created_at: daysAgo(1),
        },
        {
            id: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
            user_email: 'admin@example.com',
            type: 'thumbnail',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/2.png',
            prompt: 'Minimalist tech review thumbnail with sleek product focus.',
            metadata: { name: 'Tech Insight' },
            created_at: daysAgo(1),
        },
        {
            id: 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d',
            user_email: 'admin@example.com',
            type: 'thumbnail',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/3.png',
            prompt: 'Dynamic travel vlog thumbnail featuring scenic landscapes.',
            metadata: { name: 'Wanderlust' },
            created_at: daysAgo(1),
        },
        {
            id: 'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e',
            user_email: 'admin@example.com',
            type: 'thumbnail',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/4.png',
            prompt: 'Professional business thumbnail for finance and growth.',
            metadata: { name: 'Finance Hub' },
            created_at: daysAgo(1),
        },
        {
            id: 'f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'thumbnail',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/1.png',
            prompt: 'High-conversion gaming thumbnail with vibrant colors and bold text.',
            metadata: { name: 'Gaming Pro' },
            created_at: daysAgo(1),
        },
        {
            id: 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b',
            user_email: 'user@demo.com',
            type: 'thumbnail',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/2.png',
            prompt: 'Minimalist tech review thumbnail with sleek product focus.',
            metadata: { name: 'Tech Insight' },
            created_at: daysAgo(1),
        },
        {
            id: 'd3e4f5a6-b7c8-4d9e-0f1a-2b3c4d5e6f7a',
            user_email: 'user@demo.com',
            type: 'thumbnail',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/3.png',
            prompt: 'Dynamic travel vlog thumbnail featuring scenic landscapes.',
            metadata: { name: 'Wanderlust' },
            created_at: daysAgo(1),
        },
        {
            id: 'c4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f',
            user_email: 'user@demo.com',
            type: 'thumbnail',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/4.png',
            prompt: 'Professional business thumbnail for finance and growth.',
            metadata: { name: 'Finance Hub' },
            created_at: daysAgo(1),
        },
        // Music Assets
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3e02',
            user_email: 'admin@example.com',
            type: 'music',
            url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/f93188de9cb64d3c88b2da836668b526.mp3',
            prompt: 'Velvet Hush - Michael Jackson Style',
            metadata: {
                title: 'Velvet Hush',
                style: 'Michael Jackson Style',
                model: 'V5',
                lyrics: 'Midnight creeps on velvet paws...'
            },
            created_at: daysAgo(1),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3e03',
            user_email: 'admin@example.com',
            type: 'music',
            url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/2fc1ac5a865544d6adaba21e951e08ed.mp3',
            prompt: 'english song',
            metadata: {
                title: 'Ocean Breeze',
                style: 'English Pop',
                model: 'V5'
            },
            created_at: daysAgo(1),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3e04',
            user_email: 'admin@example.com',
            type: 'music',
            url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/5caf87d6fd494d67861a4cfe893a0dbc.mp3',
            prompt: 'english song',
            metadata: {
                title: 'Summer Vibes',
                style: 'English Pop',
                model: 'V5'
            },
            created_at: daysAgo(1),
        },
        // Repeat for demo user
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3e05',
            user_email: 'user@demo.com',
            type: 'music',
            url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/f93188de9cb64d3c88b2da836668b526.mp3',
            prompt: 'just music',
            metadata: {
                title: 'Smooth Rhythm',
                style: 'Instrumental',
                model: 'V5'
            },
            created_at: daysAgo(1),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3e06',
            user_email: 'user@demo.com',
            type: 'music',
            url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/f93188de9cb64d3c88b2da836668b526.mp3',
            prompt: 'Velvet Hush - Michael Jackson Style',
            metadata: {
                title: 'Velvet Hush',
                style: 'Michael Jackson Style',
                model: 'V5',
                lyrics: 'Midnight creeps on velvet paws...'
            },
            created_at: daysAgo(1),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3e07',
            user_email: 'admin@example.com',
            type: 'music',
            url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/f209efa50203453588f7031a84f07242.mp3',
            prompt: 'English ballad song',
            metadata: {
                title: 'Melancholy Dreams',
                style: 'English Ballad',
                model: 'V5'
            },
            created_at: daysAgo(1),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3e08',
            user_email: 'admin@example.com',
            type: 'music',
            url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/52035bfbb8024263b237985322b7cf31.mp3',
            prompt: 'Upbeat English pop song',
            metadata: {
                title: 'Neon Lights',
                style: 'Upbeat Pop',
                model: 'V5'
            },
            created_at: daysAgo(1),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3e09',
            user_email: 'user@demo.com',
            type: 'music',
            url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/f209efa50203453588f7031a84f07242.mp3',
            prompt: 'English ballad song',
            metadata: {
                title: 'Melancholy Dreams',
                style: 'English Ballad',
                model: 'V5'
            },
            created_at: daysAgo(1),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3e10',
            user_email: 'user@demo.com',
            type: 'music',
            url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/52035bfbb8024263b237985322b7cf31.mp3',
            prompt: 'Upbeat English pop song',
            metadata: {
                title: 'Neon Lights',
                style: 'Upbeat Pop',
                model: 'V5'
            },
            created_at: daysAgo(1),
        },
        // Reel Assets - Added for demo
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3f01',
            user_email: 'admin@example.com',
            type: 'reel',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/main/reels/1.mp4',
            prompt: 'High-energy AI promo reel',
            metadata: { name: 'Reel 1' },
            created_at: daysAgo(2),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3f02',
            user_email: 'admin@example.com',
            type: 'reel',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/main/reels/2.mp4',
            prompt: 'Futuristic product showcase',
            metadata: { name: 'Reel 2' },
            created_at: daysAgo(1),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3f03',
            user_email: 'user@demo.com',
            type: 'reel',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/main/reels/1.mp4',
            prompt: 'High-energy AI promo reel',
            metadata: { name: 'Reel 1' },
            created_at: daysAgo(2),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3f04',
            user_email: 'user@demo.com',
            type: 'reel',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/main/reels/2.mp4',
            prompt: 'Futuristic product showcase',
            metadata: { name: 'Reel 2' },
            created_at: daysAgo(1),
        },
        // Flyer Designer Assets
        {
            id: 'f1a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/1.png',
            prompt: 'Modern corporate business flyer layout for Apex Fitness Studio with green and dark colors, showcasing grand opening summer challenge details.',
            metadata: { name: 'Grand Opening Summer Challenge', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(1),
        },
        {
            id: 'f2a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/2.png',
            prompt: 'Bold colorful concert and music flyer for Summer Beats Festival, electric neon pink and blue tones, retro cyberpunk style.',
            metadata: { name: 'Summer Beats Music Festival', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(2),
        },
        {
            id: 'f3a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/3.png',
            prompt: 'Premium gourmet restaurant promotional flyer for Bistro Celeste, elegant black and gold color palette, minimalist design.',
            metadata: { name: 'Bistro Celeste Dinner Menu', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(3),
        },
        {
            id: 'f4a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/4.png',
            prompt: 'Real estate property promotion flyer for Luxury Villa Meadows, professional navy blue and silver colors, clean corporate layout.',
            metadata: { name: 'Luxury Villa Meadows Sale', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(4),
        },
        {
            id: 'f5a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/5.png',
            prompt: 'Retail sale and promo flyer for NeoGlow Electronics, futuristic neon purple theme, cyberpunk style.',
            metadata: { name: 'NeoGlow Grand Clearance Sale', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(5),
        },
        {
            id: 'f6a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/6.png',
            prompt: 'Fitness and wellness program advertisement flyer for Oasis Retreat, earthy green and soft beige mood.',
            metadata: { name: 'Oasis Retreat Wellness Program', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(6),
        },
        {
            id: 'f1b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/1.png',
            prompt: 'Modern corporate business flyer layout for Apex Fitness Studio with green and dark colors, showcasing grand opening summer challenge details.',
            metadata: { name: 'Grand Opening Summer Challenge', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(1),
        },
        {
            id: 'f2b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/2.png',
            prompt: 'Bold colorful concert and music flyer for Summer Beats Festival, electric neon pink and blue tones, retro cyberpunk style.',
            metadata: { name: 'Summer Beats Music Festival', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(2),
        },
        {
            id: 'f3b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/3.png',
            prompt: 'Premium gourmet restaurant promotional flyer for Bistro Celeste, elegant black and gold color palette, minimalist design.',
            metadata: { name: 'Bistro Celeste Dinner Menu', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(3),
        },
        {
            id: 'f4b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/4.png',
            prompt: 'Real estate property promotion flyer for Luxury Villa Meadows, professional navy blue and silver colors, clean corporate layout.',
            metadata: { name: 'Luxury Villa Meadows Sale', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(4),
        },
        {
            id: 'f5b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/5.png',
            prompt: 'Retail sale and promo flyer for NeoGlow Electronics, futuristic neon purple theme, cyberpunk style.',
            metadata: { name: 'NeoGlow Grand Clearance Sale', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(5),
        },
        {
            id: 'f6b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'flyer',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/6.png',
            prompt: 'Fitness and wellness program advertisement flyer for Oasis Retreat, earthy green and soft beige mood.',
            metadata: { name: 'Oasis Retreat Wellness Program', options: { size: '2:3', isEnhance: true } },
            created_at: daysAgo(6),
        },
        // Business Card Designer Assets
        {
            id: 'c1a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/1.png',
            prompt: 'Premium minimalist corporate business card design for John Doe, CEO of TechCorp.',
            metadata: { name: 'TechCorp CEO Business Card', options: { size: '3.5" x 2"', style: 'modern-minimalist' } },
            created_at: daysAgo(1),
        },
        {
            id: 'c2a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/2.png',
            prompt: 'Bold colorful creative business card design for Jane Smith, Lead Designer at CreativeWave.',
            metadata: { name: 'CreativeWave Designer Business Card', options: { size: '3.5" x 2"', style: 'bold-colorful' } },
            created_at: daysAgo(2),
        },
        {
            id: 'c3a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/3.png',
            prompt: 'Elegant professional business card design for Michael Johnson, Financial Advisor.',
            metadata: { name: 'Finance Hub Advisor Business Card', options: { size: '3.5" x 2"', style: 'elegant-luxury' } },
            created_at: daysAgo(3),
        },
        {
            id: 'c4a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/4.png',
            prompt: 'Retro vintage styled business card design for Robert Brown, Craftsman.',
            metadata: { name: 'Vintage Craft Business Card', options: { size: '3.5" x 2"', style: 'retro-vintage' } },
            created_at: daysAgo(4),
        },
        {
            id: 'c5a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/5.png',
            prompt: 'Cyberpunk neon themed business card design for Alice Williams, Developer.',
            metadata: { name: 'Cyber Developer Business Card', options: { size: '3.5" x 2"', style: 'cyberpunk-neon' } },
            created_at: daysAgo(5),
        },
        {
            id: 'c6a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/6.png',
            prompt: 'Clean corporate style business card design for Sarah Davis, Project Manager.',
            metadata: { name: 'Corporate Manager Business Card', options: { size: '3.5" x 2"', style: 'clean-corporate' } },
            created_at: daysAgo(6),
        },
        {
            id: 'c1b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/1.png',
            prompt: 'Premium minimalist corporate business card design for John Doe, CEO of TechCorp.',
            metadata: { name: 'TechCorp CEO Business Card', options: { size: '3.5" x 2"', style: 'modern-minimalist' } },
            created_at: daysAgo(1),
        },
        {
            id: 'c2b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/2.png',
            prompt: 'Bold colorful creative business card design for Jane Smith, Lead Designer at CreativeWave.',
            metadata: { name: 'CreativeWave Designer Business Card', options: { size: '3.5" x 2"', style: 'bold-colorful' } },
            created_at: daysAgo(2),
        },
        {
            id: 'c3b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/3.png',
            prompt: 'Elegant professional business card design for Michael Johnson, Financial Advisor.',
            metadata: { name: 'Finance Hub Advisor Business Card', options: { size: '3.5" x 2"', style: 'elegant-luxury' } },
            created_at: daysAgo(3),
        },
        {
            id: 'c4b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/4.png',
            prompt: 'Retro vintage styled business card design for Robert Brown, Craftsman.',
            metadata: { name: 'Vintage Craft Business Card', options: { size: '3.5" x 2"', style: 'retro-vintage' } },
            created_at: daysAgo(4),
        },
        {
            id: 'c5b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/5.png',
            prompt: 'Cyberpunk neon themed business card design for Alice Williams, Developer.',
            metadata: { name: 'Cyber Developer Business Card', options: { size: '3.5" x 2"', style: 'cyberpunk-neon' } },
            created_at: daysAgo(5),
        },
        {
            id: 'c6b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'business-card',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/6.png',
            prompt: 'Clean corporate style business card design for Sarah Davis, Project Manager.',
            metadata: { name: 'Corporate Manager Business Card', options: { size: '3.5" x 2"', style: 'clean-corporate' } },
            created_at: daysAgo(6),
        },
        // Brochure Designer Assets
        {
            id: 'd1a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/1.png',
            prompt: 'Corporate bi-fold brochure design template with clean layout, professional color palette, and business details.',
            metadata: { name: 'Corporate Business Brochure', options: { layout: 'Bi-Fold', style: 'clean-corporate' } },
            created_at: daysAgo(1),
        },
        {
            id: 'd2a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/2.png',
            prompt: 'Bold colorful tri-fold promotional brochure template for creative and modern brand presentation.',
            metadata: { name: 'Creative Agency Tri-Fold Brochure', options: { layout: 'Tri-Fold', style: 'bold-colorful' } },
            created_at: daysAgo(2),
        },
        {
            id: 'd3a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/3.png',
            prompt: 'Elegant premium hotel and spa brochure design, luxury theme with dark and gold colors.',
            metadata: { name: 'Grand Luxury Spa Brochure', options: { layout: 'Bi-Fold', style: 'elegant-luxury' } },
            created_at: daysAgo(3),
        },
        {
            id: 'd4a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/4.png',
            prompt: 'Retro vintage style coffee shop menu brochure template with warm brown and cream tones.',
            metadata: { name: 'Retro Cafe Menu Brochure', options: { layout: 'Tri-Fold', style: 'retro-vintage' } },
            created_at: daysAgo(4),
        },
        {
            id: 'd5a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/5.png',
            prompt: 'Minimalist design portfolio brochure showcase, clean modern typography with a white and gray aesthetic.',
            metadata: { name: 'Architectural Portfolio Brochure', options: { layout: 'Bi-Fold', style: 'modern-minimalist' } },
            created_at: daysAgo(5),
        },
        {
            id: 'd6a8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/6.png',
            prompt: 'Cyberpunk neon cyberpunk styled futuristic tech startup profile brochure layout.',
            metadata: { name: 'Cyberdyne Tech Profile Brochure', options: { layout: 'Tri-Fold', style: 'cyberpunk-neon' } },
            created_at: daysAgo(6),
        },
        {
            id: 'd1b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/1.png',
            prompt: 'Corporate bi-fold brochure design template with clean layout, professional color palette, and business details.',
            metadata: { name: 'Corporate Business Brochure', options: { layout: 'Bi-Fold', style: 'clean-corporate' } },
            created_at: daysAgo(1),
        },
        {
            id: 'd2b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/2.png',
            prompt: 'Bold colorful tri-fold promotional brochure template for creative and modern brand presentation.',
            metadata: { name: 'Creative Agency Tri-Fold Brochure', options: { layout: 'Tri-Fold', style: 'bold-colorful' } },
            created_at: daysAgo(2),
        },
        {
            id: 'd3b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/3.png',
            prompt: 'Elegant premium hotel and spa brochure design, luxury theme with dark and gold colors.',
            metadata: { name: 'Grand Luxury Spa Brochure', options: { layout: 'Bi-Fold', style: 'elegant-luxury' } },
            created_at: daysAgo(3),
        },
        {
            id: 'd4b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/4.png',
            prompt: 'Retro vintage style coffee shop menu brochure template with warm brown and cream tones.',
            metadata: { name: 'Retro Cafe Menu Brochure', options: { layout: 'Tri-Fold', style: 'retro-vintage' } },
            created_at: daysAgo(4),
        },
        {
            id: 'd5b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/5.png',
            prompt: 'Minimalist design portfolio brochure showcase, clean modern typography with a white and gray aesthetic.',
            metadata: { name: 'Architectural Portfolio Brochure', options: { layout: 'Bi-Fold', style: 'modern-minimalist' } },
            created_at: daysAgo(5),
        },
        {
            id: 'd6b8c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            user_email: 'user@demo.com',
            type: 'brochure',
            url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/6.png',
            prompt: 'Cyberpunk neon cyberpunk styled futuristic tech startup profile brochure layout.',
            metadata: { name: 'Cyberdyne Tech Profile Brochure', options: { layout: 'Tri-Fold', style: 'cyberpunk-neon' } },
            created_at: daysAgo(6),
        }
    ];

    const reels = [
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3d80',
            user_email: 'admin@example.com',
            prompt: 'Create a high-energy promotional reel for the new AI Suite platform.',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/main/reels/1.mp4',
            created_at: daysAgo(2),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3d81',
            user_email: 'admin@example.com',
            prompt: 'Futuristic product showcase for AI marketing tools.',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/main/reels/2.mp4',
            created_at: daysAgo(1),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3d82',
            user_email: 'user@demo.com',
            prompt: 'Create a high-energy promotional reel for the new AI Suite platform.',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/main/reels/1.mp4',
            created_at: daysAgo(2),
        },
        {
            id: 'f4f82b37-af07-4853-b99f-4a3d924f3d83',
            user_email: 'user@demo.com',
            prompt: 'Futuristic product showcase for AI marketing tools.',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/main/reels/2.mp4',
            created_at: daysAgo(1),
        }
    ];

    const products = [
        {
            id: 'eb5899af-e19f-4884-9aac-29d544678673',
            user_email: 'admin@example.com',
            name: 'Premium Sneakers',
            image_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/products/1.png',
            created_at: daysAgo(5),
        },
        {
            id: 'eb5899af-e19f-4884-9aac-29d544678674',
            user_email: 'user@demo.com',
            name: 'Premium Sneakers',
            image_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/products/1.png',
            created_at: daysAgo(5),
        },
    ];

    const tasks = [
        {
            task_id: 'task_avatar_001',
            user_email: 'admin@example.com',
            type: 'avatar',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/my_avatars/1.png',
            metadata: { name: 'Test Avatar' },
            created_at: daysAgo(2),
        },
        {
    "task_id": "0d5bd8c1-61a8-438d-81f4-64e9566f1d00",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/1.png",
    "metadata": {
      "prompt": "Mediterranean-style advertisement for 100% natural coconut water, featuring a happy woman in a coastal town."
    },
    "created_at": daysAgo(1)
  },
  {
    "task_id": "de7e575f-8968-49ae-b51e-0ef3123e4029",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/2.png",
    "metadata": {
      "prompt": "Elegant high-end skincare product showcase with soft lighting and natural elements."
    },
    "created_at": daysAgo(2)
  },
  {
    "task_id": "b22bea5a-8033-4699-abb7-005915be02b5",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/3.png",
    "metadata": {
      "prompt": "Modern architectural masterpiece house in a desert landscape with large glass windows."
    },
    "created_at": daysAgo(3)
  },
  {
    "task_id": "77b800b5-d3fc-4815-99b5-251fdf37a2ce",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/4.png",
    "metadata": {
      "prompt": "Breathtaking mountain range at sunrise with orange and purple hues in the sky."
    },
    "created_at": daysAgo(4)
  },
  {
    "task_id": "e2ce699e-1d47-4541-b8d5-90c5dd02729c",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/5.png",
    "metadata": {
      "prompt": "Professional woman focused on writing in her journal at a sunlit wooden desk, productivity theme."
    },
    "created_at": daysAgo(5)
  },
  {
    "task_id": "1a53412a-1b0b-4bb3-a7ee-ef14630e2012",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/6.png",
    "metadata": {
      "prompt": "Luxury sportscar driving through a futuristic city tunnel with neon light streaks."
    },
    "created_at": daysAgo(6)
  },
  {
    "task_id": "d6b359c4-1251-4cbd-a5dc-bdf8678ae7c2",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/7.png",
    "metadata": {
      "prompt": "Gourmet dessert plating with gold leaf and fresh berries in a dark ambient restaurant."
    },
    "created_at": daysAgo(7)
  },
  {
    "task_id": "fb790f80-73c4-4c41-95b0-1095f13bd3d5",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/8.png",
    "metadata": {
      "prompt": "Abstract digital art representing neural networks and artificial intelligence connectivity."
    },
    "created_at": daysAgo(8)
  },
  {
    "task_id": "19a602c5-cc05-41b1-8754-a3bb67753601",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/9.png",
    "metadata": {
      "prompt": "Serene tropical beach with crystal clear water and a single palm tree leaning over."
    },
    "created_at": daysAgo(9)
  },
  {
    "task_id": "7a2eccf8-b02f-48fb-a00e-33bcd72ba2cb",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/10.png",
    "metadata": {
      "prompt": "Elegant perfume advertisement featuring a sophisticated woman with pearls in a European city background."
    },
    "created_at": daysAgo(0)
  },
  {
    "task_id": "035a62d2-3a6f-4cae-9181-893253eeffaf",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/11.png",
    "metadata": {
      "prompt": "Cozy library interior with floor-to-ceiling bookshelves and a warm fireplace."
    },
    "created_at": daysAgo(1)
  },
  {
    "task_id": "56507e83-68fa-49c5-975a-9f7f4f8ebb34",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/12.png",
    "metadata": {
      "prompt": "Close-up of a high-tech mechanical watch showing intricate gears and premium finish."
    },
    "created_at": daysAgo(2)
  },
  {
    "task_id": "2480b004-ceca-4e0f-9482-de456f713d97",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/13.png",
    "metadata": {
      "prompt": "Futuristic holographic interface for data analysis in a dark high-tech room."
    },
    "created_at": daysAgo(3)
  },
  {
    "task_id": "13c71a0b-2bc4-4c88-a834-9703de89d65b",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/14.png",
    "metadata": {
      "prompt": "Minimalist interior design of a living room with Japandi style and neutral colors."
    },
    "created_at": daysAgo(4)
  },
  {
    "task_id": "ff7c46a0-0f03-424b-a6a1-e1bf926af79b",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/15.png",
    "metadata": {
      "prompt": "Mediterranean lifestyle image of a woman reading 'The Art of Living Well' on a sunny terrace with sea view."
    },
    "created_at": daysAgo(5)
  },
  {
    "task_id": "bbe22d96-0457-4206-b3cd-8e8a7717a4b7",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/16.png",
    "metadata": {
      "prompt": "Macro photography of a butterfly on a colorful spring flower with bokeh background."
    },
    "created_at": daysAgo(6)
  },
  {
    "task_id": "c5868fb0-9a7a-428a-83e1-5b715d3ea289",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/17.png",
    "metadata": {
      "prompt": "Bustling city street in Tokyo at night with vibrant neon signs and motion blur."
    },
    "created_at": daysAgo(7)
  },
  {
    "task_id": "da851ce4-7321-4a68-90de-0944c72af91a",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/18.png",
    "metadata": {
      "prompt": "Luxury organic tea packaging design on a stone surface with herbal ingredients."
    },
    "created_at": daysAgo(8)
  },
  {
    "task_id": "c5f5c60a-bad1-406f-af30-6cd629f73688",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/19.png",
    "metadata": {
      "prompt": "Yoga practitioner meditating on a cliff overlooking the ocean at sunset."
    },
    "created_at": daysAgo(9)
  },
  {
    "task_id": "17e9621f-d711-4618-be26-5b40b05540d4",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/20.png",
    "metadata": {
      "prompt": "Professional woman watering a small green plant, symbolizing sustainable growth and corporate care."
    },
    "created_at": daysAgo(0)
  },
  {
    "task_id": "519ae6f1-0c2a-4ada-8935-a936bcf1887e",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/21.png",
    "metadata": {
      "prompt": "Artistic representation of a DNA double helix in a glowing scientific laboratory environment."
    },
    "created_at": daysAgo(1)
  },
  {
    "task_id": "2bb074fb-9222-438a-b7c9-ced09bce5d76",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/22.png",
    "metadata": {
      "prompt": "Grand opera house interior with golden balconies and a massive crystal chandelier."
    },
    "created_at": daysAgo(2)
  },
  {
    "task_id": "1079f5ec-9d97-4940-8315-65e3a6d5afcd",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/23.png",
    "metadata": {
      "prompt": "Rustic Italian kitchen with fresh pasta, tomatoes, and basil on a wooden table."
    },
    "created_at": daysAgo(3)
  },
  {
    "task_id": "e30e9acc-1ab7-4587-955e-c68c7e95d8ce",
    "user_email": "admin@example.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/24.png",
    "metadata": {
      "prompt": "Professional woman in a grey blazer watering a plant in a clean, modern office setting."
    },
    "created_at": daysAgo(4)
  },
        {
            "task_id": "ad64a854-9407-43cf-b59a-115f0254c4a4",
            "user_email": 'user@demo.com',
            "type": 'avatar',
            "status": 'success',
            "result_url": 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/my_avatars/1.png',
            "metadata": { name: 'Test Avatar' },
            "created_at": daysAgo(2),
        },
        {
    "task_id": "45496e12-525c-4d71-b09c-de563d6ec0df",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/1.png",
    "metadata": {
      "prompt": "Mediterranean-style advertisement for 100% natural coconut water, featuring a happy woman in a coastal town."
    },
    "created_at": daysAgo(1)
  },
  {
    "task_id": "dc09fac1-098c-4b4b-8305-d381b1e69d10",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/2.png",
    "metadata": {
      "prompt": "Elegant high-end skincare product showcase with soft lighting and natural elements."
    },
    "created_at": daysAgo(2)
  },
  {
    "task_id": "246f1820-f81c-4e00-871b-a3bf5973b8a3",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/3.png",
    "metadata": {
      "prompt": "Modern architectural masterpiece house in a desert landscape with large glass windows."
    },
    "created_at": daysAgo(3)
  },
  {
    "task_id": "d15847bc-4239-42b2-bb02-ac6c3e568ba4",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/4.png",
    "metadata": {
      "prompt": "Breathtaking mountain range at sunrise with orange and purple hues in the sky."
    },
    "created_at": daysAgo(4)
  },
  {
    "task_id": "b3aaedb7-9636-445a-9bed-bf44c2c72ac0",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/5.png",
    "metadata": {
      "prompt": "Professional woman focused on writing in her journal at a sunlit wooden desk, productivity theme."
    },
    "created_at": daysAgo(5)
  },
  {
    "task_id": "5be49be9-ac51-47e6-b1b0-31d4ef1cedf2",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/6.png",
    "metadata": {
      "prompt": "Luxury sportscar driving through a futuristic city tunnel with neon light streaks."
    },
    "created_at": daysAgo(6)
  },
  {
    "task_id": "116e3cae-ded2-40b2-ac76-0738615f73f3",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/7.png",
    "metadata": {
      "prompt": "Gourmet dessert plating with gold leaf and fresh berries in a dark ambient restaurant."
    },
    "created_at": daysAgo(7)
  },
  {
    "task_id": "836e2131-5103-4ff9-844c-40984f9c284f",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/8.png",
    "metadata": {
      "prompt": "Abstract digital art representing neural networks and artificial intelligence connectivity."
    },
    "created_at": daysAgo(8)
  },
  {
    "task_id": "cd65e898-8eb9-42f5-b0d3-c066cfc94a0d",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/9.png",
    "metadata": {
      "prompt": "Serene tropical beach with crystal clear water and a single palm tree leaning over."
    },
    "created_at": daysAgo(9)
  },
  {
    "task_id": "4b95a310-a4d1-44d6-b38f-78c6f5b6dbbc",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/10.png",
    "metadata": {
      "prompt": "Elegant perfume advertisement featuring a sophisticated woman with pearls in a European city background."
    },
    "created_at": daysAgo(0)
  },
  {
    "task_id": "20ebbaaf-338d-4f4d-914a-7a400aab44e2",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/11.png",
    "metadata": {
      "prompt": "Cozy library interior with floor-to-ceiling bookshelves and a warm fireplace."
    },
    "created_at": daysAgo(1)
  },
  {
    "task_id": "a42006ad-1ff8-411a-bcdb-c12408738944",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/12.png",
    "metadata": {
      "prompt": "Close-up of a high-tech mechanical watch showing intricate gears and premium finish."
    },
    "created_at": daysAgo(2)
  },
  {
    "task_id": "f62ee9c9-6a16-498e-8e8c-79f8c10f268f",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/13.png",
    "metadata": {
      "prompt": "Futuristic holographic interface for data analysis in a dark high-tech room."
    },
    "created_at": daysAgo(3)
  },
  {
    "task_id": "0f38248a-844b-41c7-9f72-e780651db2a8",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/14.png",
    "metadata": {
      "prompt": "Minimalist interior design of a living room with Japandi style and neutral colors."
    },
    "created_at": daysAgo(4)
  },
  {
    "task_id": "02bc71de-cb93-4a50-8b5e-11c11cc98b32",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/15.png",
    "metadata": {
      "prompt": "Mediterranean lifestyle image of a woman reading 'The Art of Living Well' on a sunny terrace with sea view."
    },
    "created_at": daysAgo(5)
  },
  {
    "task_id": "3329c979-6e24-451d-8118-883eb88ee675",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/16.png",
    "metadata": {
      "prompt": "Macro photography of a butterfly on a colorful spring flower with bokeh background."
    },
    "created_at": daysAgo(6)
  },
  {
    "task_id": "4ac8d28b-c8d1-4c51-96cf-e46a548c8112",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/17.png",
    "metadata": {
      "prompt": "Bustling city street in Tokyo at night with vibrant neon signs and motion blur."
    },
    "created_at": daysAgo(7)
  },
  {
    "task_id": "2850bf34-407a-4044-91b5-e12abceb9e59",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/18.png",
    "metadata": {
      "prompt": "Luxury organic tea packaging design on a stone surface with herbal ingredients."
    },
    "created_at": daysAgo(8)
  },
  {
    "task_id": "01debcfe-592d-4e98-a2e3-8434abb2b34a",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/19.png",
    "metadata": {
      "prompt": "Yoga practitioner meditating on a cliff overlooking the ocean at sunset."
    },
    "created_at": daysAgo(9)
  },
  {
    "task_id": "5b069e8e-392c-48c5-8376-40f39a86b40b",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/20.png",
    "metadata": {
      "prompt": "Professional woman watering a small green plant, symbolizing sustainable growth and corporate care."
    },
    "created_at": daysAgo(0)
  },
  {
    "task_id": "9b4ddefb-00ab-49d2-b708-5111a9a4b42f",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/21.png",
    "metadata": {
      "prompt": "Artistic representation of a DNA double helix in a glowing scientific laboratory environment."
    },
    "created_at": daysAgo(1)
  },
  {
    "task_id": "46c98b05-a6fd-46f1-91c9-68c1431f9a49",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/22.png",
    "metadata": {
      "prompt": "Grand opera house interior with golden balconies and a massive crystal chandelier."
    },
    "created_at": daysAgo(2)
  },
  {
    "task_id": "2707bfc2-9fd7-4740-a321-735bc3e33717",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/23.png",
    "metadata": {
      "prompt": "Rustic Italian kitchen with fresh pasta, tomatoes, and basil on a wooden table."
    },
    "created_at": daysAgo(3)
  },
  {
    "task_id": "e57bf11d-ab18-485d-8a2d-d896d2d65a14",
    "user_email": "user@demo.com",
    "type": "image",
    "status": "success",
    "result_url": "https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/image-generator/24.png",
    "metadata": {
      "prompt": "Professional woman in a grey blazer watering a plant in a clean, modern office setting."
    },
    "created_at": daysAgo(4)
  },
        {
            task_id: 'task_music_001',
            user_email: 'admin@example.com',
            type: 'music',
            status: 'success',
            result_url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/f93188de9cb64d3c88b2da836668b526.mp3',
            metadata: { title: 'Velvet Hush', prompt: 'Michael Jackson Style' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'task_music_002',
            user_email: 'user@demo.com',
            type: 'music',
            status: 'success',
            result_url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/f93188de9cb64d3c88b2da836668b526.mp3',
            metadata: { title: 'Velvet Hush', prompt: 'Michael Jackson Style' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'task_music_003',
            user_email: 'admin@example.com',
            type: 'music',
            status: 'success',
            result_url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/f209efa50203453588f7031a84f07242.mp3',
            metadata: { title: 'Melancholy Dreams', prompt: 'English ballad' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'task_music_004',
            user_email: 'user@demo.com',
            type: 'music',
            status: 'success',
            result_url: 'https://rxdte2pbpwcujzvj.public.blob.vercel-storage.com/music/52035bfbb8024263b237985322b7cf31.mp3',
            metadata: { title: 'Neon Lights', prompt: 'Upbeat pop' },
            created_at: daysAgo(1),
        },
        // Logo Tasks
        // Logo Tasks
        {
            task_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/1.png',
            metadata: { name: 'Tech Sphere', prompt: 'Modern minimalist abstract logo for a tech startup.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/2.png',
            metadata: { name: 'Geo Pulse', prompt: 'Geometric logo design with clean lines and symmetrical shapes.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/3.png',
            metadata: { name: 'Net Link', prompt: 'Futuristic icon representing connectivity and digital networks.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/4.png',
            metadata: { name: 'Creative Wave', prompt: 'Sleek professional logo for a creative design agency.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/5.png',
            metadata: { name: 'Titan Core', prompt: 'Bold corporate identity logo with a strong visual presence.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/6.png',
            metadata: { name: 'Vogue Style', prompt: 'Elegant cursive-style logo for a luxury fashion brand.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/7.png',
            metadata: { name: 'Innovate Flow', prompt: 'Abstract representation of growth and innovation.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'b8c9d0e1-f2a3-1b2c-5d6e-7f8a9b0c1d2e',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/8.png',
            metadata: { name: 'Zenith Circle', prompt: 'Circular logo with a focus on harmony and balance.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'c9d0e1f2-a3b4-2c3d-6e7f-8a9b0c1d2e3f',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/9.png',
            metadata: { name: 'Cyber Mind', prompt: 'High-tech robotic head icon for an AI company.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'd0e1f2a3-b4c5-3d4e-7f8a-9b0c1d2e3f4a',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/10.png',
            metadata: { name: 'Swift Lynx', prompt: 'Minimalist animal mascot logo for a lifestyle brand.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'e1f2a3b4-c5d6-4e5f-8a9b-0c1d2e3f4a5b',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/11.png',
            metadata: { name: 'Fire Peak', prompt: 'Dynamic flame icon representing energy and passion.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'f2a3b4c5-d6e7-5f6a-9b0c-1d2e3f4a5b6c',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/12.png',
            metadata: { name: 'Eco Leaf', prompt: 'Sustainable and eco-friendly leaf-inspired logo.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'a3b4c5d6-e7f8-6a7b-0c1d-2e3f4a5b6c7d',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/13.png',
            metadata: { name: 'Frost Bite', prompt: 'Symmetrical snowflake design for a winter sports brand.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'b4c5d6e7-f8a9-7b8c-1d2e-3f4a5b6c7d8e',
            user_email: 'admin@example.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/14.png',
            metadata: { name: 'Royal Core', prompt: 'Elegant crown icon for a premium service provider.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'c5d6e7f8-a9b0-8c9d-2e3f-4a5b6c7d8e9f',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/1.png',
            metadata: { name: 'Tech Sphere', prompt: 'Modern minimalist abstract logo for a tech startup.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'd6e7f8a9-b0c1-9d0e-3f4a-5b6c7d8e9f0a',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/2.png',
            metadata: { name: 'Geo Pulse', prompt: 'Geometric logo design with clean lines and symmetrical shapes.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'e7f8a9b0-c1d2-0e1f-4a5b-6c7d8e9f0a1b',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/3.png',
            metadata: { name: 'Net Link', prompt: 'Futuristic icon representing connectivity and digital networks.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'f8a9b0c1-d2e3-1f2a-5b6c-7d8e9f0a1b2c',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/4.png',
            metadata: { name: 'Creative Wave', prompt: 'Sleek professional logo for a creative design agency.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'a9b0c1d2-e3f4-2a3b-6c7d-8e9f0a1b2c3d',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/5.png',
            metadata: { name: 'Titan Core', prompt: 'Bold corporate identity logo with a strong visual presence.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'b0c1d2e3-f4a5-3b4c-7d8e-9f0a1b2c3d4e',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/6.png',
            metadata: { name: 'Vogue Style', prompt: 'Elegant cursive-style logo for a luxury fashion brand.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'c1d2e3f4-a5b6-4c5d-8e9f-0a1b2c3d4e5f',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/7.png',
            metadata: { name: 'Innovate Flow', prompt: 'Abstract representation of growth and innovation.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'd2e3f4a5-b6c7-5d6e-9f0a-1b2c3d4e5f6a',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/8.png',
            metadata: { name: 'Zenith Circle', prompt: 'Circular logo with a focus on harmony and balance.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'e3f4a5b6-c7d8-6e7f-0a1b-2c3d4e5f6a7b',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/9.png',
            metadata: { name: 'Cyber Mind', prompt: 'High-tech robotic head icon for an AI company.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'f4a5b6c7-d8e9-7f8a-1b2c-3d4e5f6a7b8c',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/10.png',
            metadata: { name: 'Swift Lynx', prompt: 'Minimalist animal mascot logo for a lifestyle brand.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'a5b6c7d8-e9f0-8a9b-2c3d-4e5f6a7b8c9d',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/11.png',
            metadata: { name: 'Fire Peak', prompt: 'Dynamic flame icon representing energy and passion.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'b6c7d8e9-f0a1-9b0c-3d4e-5f6a7b8c9d0e',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/12.png',
            metadata: { name: 'Eco Leaf', prompt: 'Sustainable and eco-friendly leaf-inspired logo.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'c7d8e9f0-a1b2-0c1d-4e5f-6a7b8c9d0e1f',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/13.png',
            metadata: { name: 'Frost Bite', prompt: 'Symmetrical snowflake design for a winter sports brand.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'd8e9f0a1-b2c3-1d2e-5f6a-7b8c9d0e1f2a',
            user_email: 'user@demo.com',
            type: 'logo',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/icons/14.png',
            metadata: { name: 'Royal Core', prompt: 'Elegant crown icon for a premium service provider.' },
            created_at: daysAgo(1),
        },
        // YouTube Thumbnail Tasks
        {
            task_id: '1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b',
            user_email: 'admin@example.com',
            type: 'thumbnail',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/1.png',
            metadata: { name: 'Gaming Pro', prompt: 'High-conversion gaming thumbnail with vibrant colors and bold text.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '2f3a4b5c-6d7e-8f9a-0b1c-2d3e4f5a6b7c',
            user_email: 'admin@example.com',
            type: 'thumbnail',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/2.png',
            metadata: { name: 'Tech Insight', prompt: 'Minimalist tech review thumbnail with sleek product focus.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d',
            user_email: 'admin@example.com',
            type: 'thumbnail',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/3.png',
            metadata: { name: 'Wanderlust', prompt: 'Dynamic travel vlog thumbnail featuring scenic landscapes.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '4b5c6d7e-8f9a-0b1c-2d3e-4f5a6b7c8d9e',
            user_email: 'admin@example.com',
            type: 'thumbnail',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/4.png',
            metadata: { name: 'Finance Hub', prompt: 'Professional business thumbnail for finance and growth.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f',
            user_email: 'user@demo.com',
            type: 'thumbnail',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/1.png',
            metadata: { name: 'Gaming Pro', prompt: 'High-conversion gaming thumbnail with vibrant colors and bold text.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '6d7e8f9a-0b1c-2d3e-4f5a-6b7c8d9e0f1a',
            user_email: 'user@demo.com',
            type: 'thumbnail',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/2.png',
            metadata: { name: 'Tech Insight', prompt: 'Minimalist tech review thumbnail with sleek product focus.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '7e8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b',
            user_email: 'user@demo.com',
            type: 'thumbnail',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/3.png',
            metadata: { name: 'Wanderlust', prompt: 'Dynamic travel vlog thumbnail featuring scenic landscapes.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '8f9a0b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c',
            user_email: 'user@demo.com',
            type: 'thumbnail',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/youtube-thumbnail/4.png',
            metadata: { name: 'Finance Hub', prompt: 'Professional business thumbnail for finance and growth.' },
            created_at: daysAgo(1),
        },
        // Manga Tasks
        {
            task_id: '9b8a7c6d-5e4f-3a2b-1c0d-9a8b7c6d5e4f',
            user_email: 'admin@example.com',
            type: 'manga',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/1.png',
            metadata: { name: 'Moonlit Duel', prompt: 'Epic samurai duel in a moonlit cherry blossom garden, high-contrast manga style.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d',
            user_email: 'admin@example.com',
            type: 'manga',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/2.png',
            metadata: { name: 'Neon City', prompt: 'Cyberpunk city street at night with neon lights and futuristic vehicles, detailed ink work.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '7b6a5c4d-3e2f-1a0b-9c8d-7e6f5a4b3c2d',
            user_email: 'admin@example.com',
            type: 'manga',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/3.png',
            metadata: { name: 'Spirit Woods', prompt: 'Mystical fantasy forest with glowing flora and ancient ruins, ethereal manga aesthetic.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '6a5b4c3d-2e1f-0a9b-8c7d-6e5f4a3b2c1d',
            user_email: 'admin@example.com',
            type: 'manga',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/4.png',
            metadata: { name: 'High School Days', prompt: 'School life slice-of-life scene with students on a sunny rooftop, clean line art.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '5a4b3c2d-1e0f-9a8b-7c6d-5e4f3a2b1c0d',
            user_email: 'user@demo.com',
            type: 'manga',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/1.png',
            metadata: { name: 'Moonlit Duel', prompt: 'Epic samurai duel in a moonlit cherry blossom garden, high-contrast manga style.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '4b3c2d1a-0f9e-8d7c-6b5a-4a3b2c1d0f9e',
            user_email: 'user@demo.com',
            type: 'manga',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/2.png',
            metadata: { name: 'Neon City', prompt: 'Cyberpunk city street at night with neon lights and futuristic vehicles, detailed ink work.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '3c2d1a0f-9e8d-7c6b-5a4a-3b2c1d0f9e8d',
            user_email: 'user@demo.com',
            type: 'manga',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/3.png',
            metadata: { name: 'Spirit Woods', prompt: 'Mystical fantasy forest with glowing flora and ancient ruins, ethereal manga aesthetic.' },
            created_at: daysAgo(1),
        },
        {
            task_id: '2d1a0f9e-8d7c-6b5a-4a3b-2c1d0f9e8d7c',
            user_email: 'user@demo.com',
            type: 'manga',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/manga-generator/4.png',
            metadata: { name: 'High School Days', prompt: 'School life slice-of-life scene with students on a sunny rooftop, clean line art.' },
            created_at: daysAgo(1),
        },
        // Flyer Tasks
        {
            task_id: 'task_flyer_001',
            user_email: 'admin@example.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/1.png',
            metadata: { name: 'Grand Opening Summer Challenge', prompt: 'Modern corporate business flyer layout for Apex Fitness Studio with green and dark colors, showcasing grand opening summer challenge details.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'task_flyer_002',
            user_email: 'admin@example.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/2.png',
            metadata: { name: 'Summer Beats Music Festival', prompt: 'Bold colorful concert and music flyer for Summer Beats Festival, electric neon pink and blue tones, retro cyberpunk style.' },
            created_at: daysAgo(2),
        },
        {
            task_id: 'task_flyer_003',
            user_email: 'admin@example.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/3.png',
            metadata: { name: 'Bistro Celeste Dinner Menu', prompt: 'Premium gourmet restaurant promotional flyer for Bistro Celeste, elegant black and gold color palette, minimalist design.' },
            created_at: daysAgo(3),
        },
        {
            task_id: 'task_flyer_004',
            user_email: 'admin@example.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/4.png',
            metadata: { name: 'Luxury Villa Meadows Sale', prompt: 'Real estate property promotion flyer for Luxury Villa Meadows, professional navy blue and silver colors, clean corporate layout.' },
            created_at: daysAgo(4),
        },
        {
            task_id: 'task_flyer_005',
            user_email: 'admin@example.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/5.png',
            metadata: { name: 'NeoGlow Grand Clearance Sale', prompt: 'Retail sale and promo flyer for NeoGlow Electronics, futuristic neon purple theme, cyberpunk style.' },
            created_at: daysAgo(5),
        },
        {
            task_id: 'task_flyer_006',
            user_email: 'admin@example.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/6.png',
            metadata: { name: 'Oasis Retreat Wellness Program', prompt: 'Fitness and wellness program advertisement flyer for Oasis Retreat, earthy green and soft beige mood.' },
            created_at: daysAgo(6),
        },
        {
            task_id: 'task_flyer_007',
            user_email: 'user@demo.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/1.png',
            metadata: { name: 'Grand Opening Summer Challenge', prompt: 'Modern corporate business flyer layout for Apex Fitness Studio with green and dark colors, showcasing grand opening summer challenge details.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'task_flyer_008',
            user_email: 'user@demo.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/2.png',
            metadata: { name: 'Summer Beats Music Festival', prompt: 'Bold colorful concert and music flyer for Summer Beats Festival, electric neon pink and blue tones, retro cyberpunk style.' },
            created_at: daysAgo(2),
        },
        {
            task_id: 'task_flyer_009',
            user_email: 'user@demo.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/3.png',
            metadata: { name: 'Bistro Celeste Dinner Menu', prompt: 'Premium gourmet restaurant promotional flyer for Bistro Celeste, elegant black and gold color palette, minimalist design.' },
            created_at: daysAgo(3),
        },
        {
            task_id: 'task_flyer_010',
            user_email: 'user@demo.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/4.png',
            metadata: { name: 'Luxury Villa Meadows Sale', prompt: 'Real estate property promotion flyer for Luxury Villa Meadows, professional navy blue and silver colors, clean corporate layout.' },
            created_at: daysAgo(4),
        },
        {
            task_id: 'task_flyer_011',
            user_email: 'user@demo.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/5.png',
            metadata: { name: 'NeoGlow Grand Clearance Sale', prompt: 'Retail sale and promo flyer for NeoGlow Electronics, futuristic neon purple theme, cyberpunk style.' },
            created_at: daysAgo(5),
        },
        {
            task_id: 'task_flyer_012',
            user_email: 'user@demo.com',
            type: 'flyer',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Flyer%20Designer/6.png',
            metadata: { name: 'Oasis Retreat Wellness Program', prompt: 'Fitness and wellness program advertisement flyer for Oasis Retreat, earthy green and soft beige mood.' },
            created_at: daysAgo(6),
        },
        // Business Card Tasks
        {
            task_id: 'task_business_card_001',
            user_email: 'admin@example.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/1.png',
            metadata: { name: 'TechCorp CEO Business Card', prompt: 'Premium minimalist corporate business card design for John Doe, CEO of TechCorp.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'task_business_card_002',
            user_email: 'admin@example.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/2.png',
            metadata: { name: 'CreativeWave Designer Business Card', prompt: 'Bold colorful creative business card design for Jane Smith, Lead Designer at CreativeWave.' },
            created_at: daysAgo(2),
        },
        {
            task_id: 'task_business_card_003',
            user_email: 'admin@example.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/3.png',
            metadata: { name: 'Finance Hub Advisor Business Card', prompt: 'Elegant professional business card design for Michael Johnson, Financial Advisor.' },
            created_at: daysAgo(3),
        },
        {
            task_id: 'task_business_card_004',
            user_email: 'admin@example.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/4.png',
            metadata: { name: 'Vintage Craft Business Card', prompt: 'Retro vintage styled business card design for Robert Brown, Craftsman.' },
            created_at: daysAgo(4),
        },
        {
            task_id: 'task_business_card_005',
            user_email: 'admin@example.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/5.png',
            metadata: { name: 'Cyber Developer Business Card', prompt: 'Cyberpunk neon themed business card design for Alice Williams, Developer.' },
            created_at: daysAgo(5),
        },
        {
            task_id: 'task_business_card_006',
            user_email: 'admin@example.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/6.png',
            metadata: { name: 'Corporate Manager Business Card', prompt: 'Clean corporate style business card design for Sarah Davis, Project Manager.' },
            created_at: daysAgo(6),
        },
        {
            task_id: 'task_business_card_007',
            user_email: 'user@demo.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/1.png',
            metadata: { name: 'TechCorp CEO Business Card', prompt: 'Premium minimalist corporate business card design for John Doe, CEO of TechCorp.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'task_business_card_008',
            user_email: 'user@demo.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/2.png',
            metadata: { name: 'CreativeWave Designer Business Card', prompt: 'Bold colorful creative business card design for Jane Smith, Lead Designer at CreativeWave.' },
            created_at: daysAgo(2),
        },
        {
            task_id: 'task_business_card_009',
            user_email: 'user@demo.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/3.png',
            metadata: { name: 'Finance Hub Advisor Business Card', prompt: 'Elegant professional business card design for Michael Johnson, Financial Advisor.' },
            created_at: daysAgo(3),
        },
        {
            task_id: 'task_business_card_010',
            user_email: 'user@demo.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/4.png',
            metadata: { name: 'Vintage Craft Business Card', prompt: 'Retro vintage styled business card design for Robert Brown, Craftsman.' },
            created_at: daysAgo(4),
        },
        {
            task_id: 'task_business_card_011',
            user_email: 'user@demo.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/5.png',
            metadata: { name: 'Cyber Developer Business Card', prompt: 'Cyberpunk neon themed business card design for Alice Williams, Developer.' },
            created_at: daysAgo(5),
        },
        {
            task_id: 'task_business_card_012',
            user_email: 'user@demo.com',
            type: 'business-card',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Business%20Card%20Design/6.png',
            metadata: { name: 'Corporate Manager Business Card', prompt: 'Clean corporate style business card design for Sarah Davis, Project Manager.' },
            created_at: daysAgo(6),
        },
        // Brochure Tasks
        {
            task_id: 'task_brochure_001',
            user_email: 'admin@example.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/1.png',
            metadata: { name: 'Corporate Business Brochure', prompt: 'Corporate bi-fold brochure design template with clean layout, professional color palette, and business details.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'task_brochure_002',
            user_email: 'admin@example.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/2.png',
            metadata: { name: 'Creative Agency Tri-Fold Brochure', prompt: 'Bold colorful tri-fold promotional brochure template for creative and modern brand presentation.' },
            created_at: daysAgo(2),
        },
        {
            task_id: 'task_brochure_003',
            user_email: 'admin@example.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/3.png',
            metadata: { name: 'Grand Luxury Spa Brochure', prompt: 'Elegant premium hotel and spa brochure design, luxury theme with dark and gold colors.' },
            created_at: daysAgo(3),
        },
        {
            task_id: 'task_brochure_004',
            user_email: 'admin@example.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/4.png',
            metadata: { name: 'Retro Cafe Menu Brochure', prompt: 'Retro vintage style coffee shop menu brochure template with warm brown and cream tones.' },
            created_at: daysAgo(4),
        },
        {
            task_id: 'task_brochure_005',
            user_email: 'admin@example.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/5.png',
            metadata: { name: 'Architectural Portfolio Brochure', prompt: 'Minimalist design portfolio brochure showcase, clean modern typography with a white and gray aesthetic.' },
            created_at: daysAgo(5),
        },
        {
            task_id: 'task_brochure_006',
            user_email: 'admin@example.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/6.png',
            metadata: { name: 'Cyberdyne Tech Profile Brochure', prompt: 'Cyberpunk neon cyberpunk styled futuristic tech startup profile brochure layout.' },
            created_at: daysAgo(6),
        },
        {
            task_id: 'task_brochure_007',
            user_email: 'user@demo.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/1.png',
            metadata: { name: 'Corporate Business Brochure', prompt: 'Corporate bi-fold brochure design template with clean layout, professional color palette, and business details.' },
            created_at: daysAgo(1),
        },
        {
            task_id: 'task_brochure_008',
            user_email: 'user@demo.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/2.png',
            metadata: { name: 'Creative Agency Tri-Fold Brochure', prompt: 'Bold colorful tri-fold promotional brochure template for creative and modern brand presentation.' },
            created_at: daysAgo(2),
        },
        {
            task_id: 'task_brochure_009',
            user_email: 'user@demo.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/3.png',
            metadata: { name: 'Grand Luxury Spa Brochure', prompt: 'Elegant premium hotel and spa brochure design, luxury theme with dark and gold colors.' },
            created_at: daysAgo(3),
        },
        {
            task_id: 'task_brochure_010',
            user_email: 'user@demo.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/4.png',
            metadata: { name: 'Retro Cafe Menu Brochure', prompt: 'Retro vintage style coffee shop menu brochure template with warm brown and cream tones.' },
            created_at: daysAgo(4),
        },
        {
            task_id: 'task_brochure_011',
            user_email: 'user@demo.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/5.png',
            metadata: { name: 'Architectural Portfolio Brochure', prompt: 'Minimalist design portfolio brochure showcase, clean modern typography with a white and gray aesthetic.' },
            created_at: daysAgo(5),
        },
        {
            task_id: 'task_brochure_012',
            user_email: 'user@demo.com',
            type: 'brochure',
            status: 'success',
            result_url: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/Brochure%20Designer/6.png',
            metadata: { name: 'Cyberdyne Tech Profile Brochure', prompt: 'Cyberpunk neon cyberpunk styled futuristic tech startup profile brochure layout.' },
            created_at: daysAgo(6),
        }
    ];

    const { error: avatarError } = await supabaseAdmin.from('marketing_avatars').upsert(avatars, { onConflict: 'id' });
    if (avatarError) throw new Error(`Seed marketing_avatars failed: ${avatarError.message}`);

    const { error: assetError } = await supabaseAdmin.from('marketing_assets').upsert(assets, { onConflict: 'id' });
    if (assetError) throw new Error(`Seed marketing_assets failed: ${assetError.message}`);

    const { error: productError } = await supabaseAdmin.from('marketing_products').upsert(products, { onConflict: 'id' });
    if (productError) throw new Error(`Seed marketing_products failed: ${productError.message}`);

    const { error: taskError } = await supabaseAdmin.from('marketing_tasks').upsert(tasks, { onConflict: 'task_id' });
    if (taskError) throw new Error(`Seed marketing_tasks failed: ${taskError.message}`);

    const { error: reelError } = await supabaseAdmin.from('marketing_reels').upsert(reels, { onConflict: 'id' });
    if (reelError) throw new Error(`Seed marketing_reels failed: ${reelError.message}`);

    return {
        avatars: avatars.length,
        assets: assets.length,
        products: products.length,
        tasks: tasks.length,
        reels: reels.length
    };
}

// ---------------------------------------------------------------------------
// STEP 12: Seed Games
// ---------------------------------------------------------------------------
async function seedGames() {
    const game1Code = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Flappy Flight</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Poppins', sans-serif;
            background: #0f172a;
            color: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
        }

        #game-container {
            position: relative;
            width: 400px;
            height: 600px;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1);
            overflow: hidden;
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        }

        canvas {
            display: block;
        }

        .ui-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            pointer-events: none; /* Let clicks pass through to canvas container */
        }

        #score-display {
            position: absolute;
            top: 30px;
            font-size: 3rem;
            font-weight: 800;
            text-shadow: 0 4px 10px rgba(0,0,0,0.5);
            z-index: 10;
        }

        .menu {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            pointer-events: auto;
            transition: opacity 0.3s ease;
        }

        .menu h1 {
            font-size: 2rem;
            margin-bottom: 10px;
            background: linear-gradient(to right, #38bdf8, #818cf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .menu p {
            color: #94a3b8;
            margin-bottom: 25px;
            font-size: 0.9rem;
        }

        button {
            background: linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            font-family: 'Poppins', sans-serif;
            font-size: 1.1rem;
            font-weight: 600;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
            transition: transform 0.1s, box-shadow 0.1s;
        }

        button:active {
            transform: scale(0.95);
            box-shadow: 0 2px 10px rgba(59, 130, 246, 0.4);
        }

        .hidden {
            opacity: 0;
            pointer-events: none;
        }
    </style>
</head>
<body>

    <div id="game-container">
        <canvas id="gameCanvas" width="400" height="600"></canvas>
        
        <div class="ui-layer">
            <div id="score-display">0</div>
            
            <div id="start-menu" class="menu">
                <h1>Flappy Flight</h1>
                <p>Press Space or Tap to fly</p>
                <button onclick="startGame()">Start Game</button>
            </div>

            <div id="game-over-menu" class="menu hidden">
                <h1>Game Over</h1>
                <p id="final-score-text">Score: 0<br>Best: 0</p>
                <button onclick="startGame()">Play Again</button>
            </div>
        </div>
    </div>

    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // UI Elements
        const scoreDisplay = document.getElementById('score-display');
        const startMenu = document.getElementById('start-menu');
        const gameOverMenu = document.getElementById('game-over-menu');
        const finalScoreText = document.getElementById('final-score-text');

        // Game State
        let frames = 0;
        let score = 0;
        let bestScore = localStorage.getItem('flappyBestScore') || 0;
        let gameState = 'START'; // START, PLAYING, GAMEOVER

        // Constants
        const GRAVITY = 0.4;
        const JUMP = -7.5;
        const PIPE_SPEED = 3;
        const PIPE_WIDTH = 60;
        const PIPE_GAP = 160;

        // Entities
        const bird = {
            x: 80,
            y: 300,
            radius: 14,
            velocity: 0,
            
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                
                // Rotate bird based on velocity
                let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
                ctx.rotate(rotation);

                // Premium Bird Styling (Glowing Orb/Ship)
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                
                // Gradient for bird
                let gradient = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius);
                gradient.addColorStop(0, '#fde047');
                gradient.addColorStop(1, '#eab308');
                
                ctx.fillStyle = gradient;
                ctx.fill();

                // Inner glow / detail
                ctx.beginPath();
                ctx.arc(4, -4, 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fill();

                // Engine trail (if moving up)
                if (this.velocity < 0) {
                    ctx.beginPath();
                    ctx.arc(-10, 5, 6, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
                    ctx.fill();
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#38bdf8';
                }

                ctx.restore();
            },
            
            update() {
                this.velocity += GRAVITY;
                this.y += this.velocity;

                // Floor collision
                if (this.y + this.radius >= canvas.height) {
                    this.y = canvas.height - this.radius;
                    setGameOver();
                }
                
                // Ceiling collision
                if (this.y - this.radius <= 0) {
                    this.y = this.radius;
                    this.velocity = 0;
                }
            },

            flap() {
                this.velocity = JUMP;
            },
            
            reset() {
                this.y = 300;
                this.velocity = 0;
            }
        };

        const pipes = {
            items: [],
            
            draw() {
                for (let i = 0; i < this.items.length; i++) {
                    let p = this.items[i];
                    
                    // Premium Pipe Styling (Glass/Neon effect)
                    let gradient = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
                    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
                    gradient.addColorStop(0.5, 'rgba(129, 140, 248, 0.9)');
                    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.8)');

                    ctx.fillStyle = gradient;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = 'rgba(56, 189, 248, 0.3)';

                    // Top Pipe
                    ctx.beginPath();
                    ctx.roundRect(p.x, 0, PIPE_WIDTH, p.top, 0, 0, 8, 8);
                    ctx.fill();
                    
                    // Bottom Pipe
                    ctx.beginPath();
                    ctx.roundRect(p.x, canvas.height - p.bottom, PIPE_WIDTH, p.bottom, 8, 8, 0, 0);
                    ctx.fill();
                    
                    ctx.shadowBlur = 0; // reset
                }
            },
            
            update() {
                // Generate new pipes
                if (frames % 100 === 0) {
                    let minPipeHeight = 50;
                    let maxPipeHeight = canvas.height - PIPE_GAP - minPipeHeight;
                    let topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1) + minPipeHeight);
                    
                    this.items.push({
                        x: canvas.width,
                        top: topHeight,
                        bottom: canvas.height - (topHeight + PIPE_GAP),
                        passed: false
                    });
                }

                for (let i = 0; i < this.items.length; i++) {
                    let p = this.items[i];
                    p.x -= PIPE_SPEED;

                    // Collision Detection
                    let birdLeft = bird.x - bird.radius + 4; // slight forgiveness
                    let birdRight = bird.x + bird.radius - 4;
                    let birdTop = bird.y - bird.radius + 4;
                    let birdBottom = bird.y + bird.radius - 4;

                    if (birdRight > p.x && birdLeft < p.x + PIPE_WIDTH) {
                        if (birdTop < p.top || birdBottom > canvas.height - p.bottom) {
                            setGameOver();
                        }
                    }

                    // Score Update
                    if (p.x + PIPE_WIDTH < bird.x && !p.passed) {
                        score++;
                        scoreDisplay.innerText = score;
                        p.passed = true;
                    }

                    // Remove off-screen pipes
                    if (p.x + PIPE_WIDTH < 0) {
                        this.items.shift();
                        i--;
                    }
                }
            },
            
            reset() {
                this.items = [];
            }
        };

        // Controls
        function flap() {
            if (gameState === 'PLAYING') {
                bird.flap();
            } else if (gameState === 'START') {
                startGame();
            }
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') flap();
        });
        
        document.getElementById('game-container').addEventListener('mousedown', flap);
        document.getElementById('game-container').addEventListener('touchstart', (e) => {
            e.preventDefault();
            flap();
        }, {passive: false});

        // Game Flow
        function startGame() {
            bird.reset();
            pipes.reset();
            score = 0;
            frames = 0;
            scoreDisplay.innerText = score;
            scoreDisplay.style.opacity = 1;
            gameState = 'PLAYING';
            
            startMenu.classList.add('hidden');
            gameOverMenu.classList.add('hidden');
        }

        function setGameOver() {
            gameState = 'GAMEOVER';
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem('flappyBestScore', bestScore);
            }
            
            finalScoreText.innerHTML = \`Score: \${score}<br>Best: \${bestScore}\`;
            gameOverMenu.classList.remove('hidden');
            scoreDisplay.style.opacity = 0;
        }

        // Draw Background Elements
        function drawBackground() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw some floating particles for premium feel
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for(let i=0; i<5; i++) {
                let px = ((frames * 0.5) + (i * 100)) % canvas.width;
                let py = (Math.sin(frames * 0.02 + i) * 20) + (i * 100);
                ctx.beginPath();
                ctx.arc(canvas.width - px, py, 2, 0, Math.PI*2);
                ctx.fill();
            }
        }

        // Main Loop
        function loop() {
            drawBackground();

            if (gameState === 'PLAYING') {
                bird.update();
                pipes.update();
                frames++;
            }

            pipes.draw();
            bird.draw();

            // Initial hover animation before start
            if (gameState === 'START') {
                bird.y = 300 + Math.sin(Date.now() / 300) * 10;
            }

            requestAnimationFrame(loop);
        }

        // Initialize
        loop();

    </script>
</body>
</html>`;

    const game2Code = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neon Void - Space Shooter</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            user-select: none;
        }

        body {
            overflow: hidden;
            background-color: #050510;
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
        }

        #gameCanvas {
            display: block;
            width: 100vw;
            height: 100vh;
        }

        #ui-layer {
            position: absolute;
            top: 20px;
            left: 30px;
            font-size: 1.5rem;
            z-index: 5;
            letter-spacing: 2px;
            text-shadow: 0 0 10px #00f0ff;
            pointer-events: none;
        }

        .screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: rgba(5, 5, 16, 0.7);
            backdrop-filter: blur(8px);
            z-index: 10;
            transition: opacity 0.4s ease;
        }

        .hidden {
            opacity: 0;
            pointer-events: none;
        }

        h1 {
            font-size: 5rem;
            text-transform: uppercase;
            letter-spacing: 0.5rem;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #00f0ff, #ff003c);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 0 15px rgba(0, 240, 255, 0.4));
        }

        p {
            font-size: 1.2rem;
            color: #a0a0b5;
            margin-bottom: 40px;
            letter-spacing: 1px;
        }

        button {
            padding: 15px 50px;
            font-size: 1.5rem;
            font-family: 'Orbitron', sans-serif;
            font-weight: 700;
            background: transparent;
            color: #fff;
            border: 2px solid #00f0ff;
            border-radius: 8px;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 240, 255, 0.2), inset 0 0 10px rgba(0, 240, 255, 0.1);
            transition: all 0.3s ease;
        }

        button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.4), transparent);
            transition: all 0.4s ease;
        }

        button:hover {
            box-shadow: 0 0 30px rgba(0, 240, 255, 0.6), inset 0 0 20px rgba(0, 240, 255, 0.4);
            transform: translateY(-2px);
            background: rgba(0, 240, 255, 0.1);
        }

        button:hover::before {
            left: 100%;
        }
    </style>
</head>
<body>

    <div id="ui-layer">
        SCORE: <span id="scoreEl">0</span>
    </div>

    <!-- Start Screen -->
    <div id="startScreen" class="screen">
        <h1>NEON VOID</h1>
        <p>Move mouse to steer. Ship auto-fires.</p>
        <button id="startBtn">ENGAGE</button>
    </div>

    <!-- Game Over Screen -->
    <div id="gameOverScreen" class="screen hidden">
        <h1 style="background: linear-gradient(90deg, #ff003c, #ffaa00); -webkit-background-clip: text;">SYSTEM FAILURE</h1>
        <p>FINAL SCORE: <span id="finalScoreEl" style="color: #fff; font-weight: bold;">0</span></p>
        <button id="restartBtn">REBOOT</button>
    </div>

    <canvas id="gameCanvas"></canvas>

    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById('scoreEl');
        const startScreen = document.getElementById('startScreen');
        const gameOverScreen = document.getElementById('gameOverScreen');
        const finalScoreEl = document.getElementById('finalScoreEl');
        const startBtn = document.getElementById('startBtn');
        const restartBtn = document.getElementById('restartBtn');

        let width, height;
        let animationId;
        let score = 0;
        let frameCount = 0;
        let gameActive = false;

        // Entities
        let player;
        let projectiles = [];
        let enemies = [];
        let particles = [];
        let stars = [];

        // Resize Canvas
        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        // Mouse Input
        const mouse = { x: width / 2, y: height / 2 };
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        window.addEventListener('touchmove', (e) => {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
        }, { passive: true });

        // Classes
        class Player {
            constructor() {
                this.x = width / 2;
                this.y = height - 100;
                this.radius = 15;
                this.color = '#00f0ff';
            }
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                
                // Glow
                ctx.shadowBlur = 20;
                ctx.shadowColor = this.color;
                
                // Ship shape (Triangle)
                ctx.beginPath();
                ctx.moveTo(0, -this.radius * 1.5);
                ctx.lineTo(this.radius, this.radius);
                ctx.lineTo(-this.radius, this.radius);
                ctx.closePath();
                ctx.fillStyle = this.color;
                ctx.fill();
                
                // Inner core
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                
                ctx.restore();
            }
            update() {
                // Smooth follow mouse
                this.x += (mouse.x - this.x) * 0.1;
                this.y += (mouse.y - this.y) * 0.1;
                
                // Boundaries
                this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
                this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
                
                this.draw();
            }
        }

        class Projectile {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.radius = 4;
                this.velocity = { x: 0, y: -12 };
                this.color = '#00f0ff';
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
                ctx.fill();
                ctx.shadowBlur = 0; // reset
            }
            update() {
                this.y += this.velocity.y;
                this.draw();
            }
        }

        class Enemy {
            constructor(x, y, radius, color, velocity) {
                this.x = x;
                this.y = y;
                this.radius = radius;
                this.color = color;
                this.velocity = velocity;
                this.edges = 5 + Math.floor(Math.random() * 3);
                this.angle = 0;
                this.spin = (Math.random() - 0.5) * 0.1;
            }
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
                
                ctx.beginPath();
                for (let i = 0; i < this.edges; i++) {
                    const theta = (i / this.edges) * Math.PI * 2;
                    const vx = Math.cos(theta) * this.radius;
                    const vy = Math.sin(theta) * this.radius;
                    if (i === 0) ctx.moveTo(vx, vy);
                    else ctx.lineTo(vx, vy);
                }
                ctx.closePath();
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 3;
                ctx.stroke();
                
                ctx.restore();
            }
            update() {
                this.x += this.velocity.x;
                this.y += this.velocity.y;
                this.angle += this.spin;
                this.draw();
            }
        }

        class Particle {
            constructor(x, y, velocity, radius, color) {
                this.x = x;
                this.y = y;
                this.velocity = velocity;
                this.radius = radius;
                this.color = color;
                this.alpha = 1;
            }
            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
                ctx.fill();
                ctx.restore();
            }
            update() {
                this.velocity.x *= 0.98; // friction
                this.velocity.y *= 0.98;
                this.x += this.velocity.x;
                this.y += this.velocity.y;
                this.alpha -= 0.02;
                this.draw();
            }
        }

        class Star {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2;
                this.speed = Math.random() * 3 + 1;
            }
            update() {
                this.y += this.speed;
                if (this.y > height) {
                    this.y = 0;
                    this.x = Math.random() * width;
                }
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Initialize Game
        function init() {
            player = new Player();
            projectiles = [];
            enemies = [];
            particles = [];
            score = 0;
            frameCount = 0;
            scoreEl.innerHTML = score;
            mouse.x = width / 2;
            mouse.y = height - 100;
            
            // Create background stars
            stars = [];
            for(let i=0; i<100; i++) stars.push(new Star());
        }

        function spawnEnemies() {
            // Increase difficulty over time
            const spawnRate = Math.max(30, 100 - Math.floor(score / 500) * 10);
            
            if (frameCount % spawnRate === 0) {
                const radius = Math.random() * (30 - 15) + 15;
                const x = Math.random() * (width - radius * 2) + radius;
                const y = -radius;
                const colors = ['#ff003c', '#ff00ea', '#ffaa00'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                const speedMult = 1 + (score / 2000); // gets faster
                const velocity = {
                    x: (Math.random() - 0.5) * 2,
                    y: (Math.random() * 2 + 2) * speedMult
                };
                
                enemies.push(new Enemy(x, y, radius, color, velocity));
            }
        }

        function createExplosion(x, y, color, amount) {
            for (let i = 0; i < amount; i++) {
                particles.push(new Particle(
                    x, y,
                    { x: (Math.random() - 0.5) * (Math.random() * 10), y: (Math.random() - 0.5) * (Math.random() * 10) },
                    Math.random() * 3,
                    color
                ));
            }
        }

        // Main Game Loop
        function animate() {
            if (!gameActive) return;
            animationId = requestAnimationFrame(animate);
            
            // Slight motion blur background
            ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
            ctx.fillRect(0, 0, width, height);

            stars.forEach(star => star.update());

            player.update();
            frameCount++;

            // Auto-fire
            if (frameCount % 10 === 0) {
                projectiles.push(new Projectile(player.x, player.y - player.radius));
            }

            spawnEnemies();

            // Update Particles
            particles.forEach((particle, index) => {
                if (particle.alpha <= 0) {
                    particles.splice(index, 1);
                } else {
                    particle.update();
                }
            });

            // Update Projectiles
            projectiles.forEach((projectile, index) => {
                projectile.update();
                // Remove off-screen
                if (projectile.y + projectile.radius < 0) {
                    setTimeout(() => projectiles.splice(index, 1), 0);
                }
            });

            // Update Enemies & Collisions
            enemies.forEach((enemy, index) => {
                enemy.update();

                // Hit Player (Game Over)
                const distPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                if (distPlayer - enemy.radius - player.radius < 1) {
                    endGame();
                }

                // Remove off-screen
                if (enemy.y - enemy.radius > height || enemy.x + enemy.radius < 0 || enemy.x - enemy.radius > width) {
                    setTimeout(() => enemies.splice(index, 1), 0);
                }

                // Hit by Projectile
                projectiles.forEach((projectile, pIndex) => {
                    const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
                    if (dist - enemy.radius - projectile.radius < 1) {
                        // Create explosion
                        createExplosion(enemy.x, enemy.y, enemy.color, enemy.radius);
                        
                        // Score
                        score += 100;
                        scoreEl.innerHTML = score;

                        setTimeout(() => {
                            enemies.splice(index, 1);
                            projectiles.splice(pIndex, 1);
                        }, 0);
                    }
                });
            });
        }

        function startGame() {
            startScreen.classList.add('hidden');
            gameOverScreen.classList.add('hidden');
            init();
            gameActive = true;
            animate();
        }

        function endGame() {
            gameActive = false;
            cancelAnimationFrame(animationId);
            createExplosion(player.x, player.y, player.color, 50); // Player explodes
            
            // Draw last frame state without player
            ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
            ctx.fillRect(0, 0, width, height);
            particles.forEach(p => p.draw());
            
            setTimeout(() => {
                finalScoreEl.innerText = score;
                gameOverScreen.classList.remove('hidden');
            }, 800);
        }

        // Button Listeners
        startBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', startGame);

    </script>
</body>
</html>`;

    const game3Code = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Memory Match</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');

        :root {
            --bg-color: #0b0f19;
            --primary-gradient: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
            --card-front-bg: rgba(30, 41, 59, 0.8);
            --glass-bg: rgba(255, 255, 255, 0.05);
            --glass-border: rgba(255, 255, 255, 0.1);
            --text-color: #f8fafc;
            --accent-color: #38bdf8;
            --success-color: #10b981;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Poppins', sans-serif;
            background-color: var(--bg-color);
            background-image: 
                radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.15), transparent 25%),
                radial-gradient(circle at 85% 30%, rgba(168, 85, 247, 0.15), transparent 25%);
            color: var(--text-color);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
        }

        .game-container {
            width: 100%;
            max-width: 600px;
            padding: 20px;
            position: relative;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            background: var(--glass-bg);
            padding: 15px 25px;
            border-radius: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass-border);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        h1 {
            font-size: 1.5rem;
            font-weight: 800;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .stats {
            display: flex;
            gap: 20px;
            font-weight: 600;
            font-size: 1rem;
        }

        .stats span {
            color: var(--accent-color);
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            perspective: 1000px;
        }

        .card {
            aspect-ratio: 3/4;
            cursor: pointer;
            position: relative;
            transform-style: preserve-3d;
            transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
        }

        .card.flipped {
            transform: rotateY(180deg);
        }

        .card.matched {
            transform: rotateY(180deg) scale(0.95);
            opacity: 0.8;
            pointer-events: none;
        }

        .card-face {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            transition: box-shadow 0.3s ease;
        }

        .card-back {
            background: var(--primary-gradient);
            background-size: 200% 200%;
            animation: gradientShift 5s ease infinite;
            border: 2px solid transparent;
        }

        .card-back::after {
            content: '';
            position: absolute;
            inset: 2px;
            background: var(--bg-color);
            border-radius: 10px;
            z-index: 0;
        }

        .card-back::before {
            content: '✨';
            position: relative;
            z-index: 1;
            font-size: 1.5rem;
            opacity: 0.5;
        }

        .card:hover .card-back {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
        }

        .card-front {
            background: var(--card-front-bg);
            transform: rotateY(180deg);
            border: 1px solid var(--glass-border);
            backdrop-filter: blur(5px);
            filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.3));
        }

        .card.matched .card-front {
            border-color: var(--success-color);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }

        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* Modal / Overlay */
        .modal {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.4s ease;
            z-index: 100;
        }

        .modal.active {
            opacity: 1;
            pointer-events: all;
        }

        .modal-content {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            transform: translateY(20px);
            transition: transform 0.4s cubic-bezier(0.4, 0.2, 0.2, 1);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .modal.active .modal-content {
            transform: translateY(0);
        }

        .modal-content h2 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .modal-content p {
            margin-bottom: 25px;
            font-size: 1.1rem;
            color: #cbd5e1;
        }

        button {
            background: var(--primary-gradient);
            color: white;
            border: none;
            padding: 12px 30px;
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            font-size: 1.1rem;
            border-radius: 50px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            background-size: 200% 200%;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(168, 85, 247, 0.4);
            animation: gradientShift 2s ease infinite;
        }

        button:active {
            transform: translateY(1px);
        }

        @media (max-width: 480px) {
            header { flex-direction: column; gap: 10px; }
            .grid { gap: 10px; }
            .card-face { font-size: 2rem; }
        }
    </style>
</head>
<body>

    <div class="game-container">
        <header>
            <h1>Memory Match</h1>
            <div class="stats">
                <div>Moves: <span id="moves">0</span></div>
                <div>Time: <span id="time">0:00</span></div>
            </div>
        </header>

        <div class="grid" id="grid">
            <!-- Cards will be generated by JS -->
        </div>
    </div>

    <div class="modal" id="winModal">
        <div class="modal-content">
            <h2>You Won! 🎉</h2>
            <p>Completed in <strong id="finalMoves">0</strong> moves and <strong id="finalTime">0:00</strong>.</p>
            <button onclick="startGame()">Play Again</button>
        </div>
    </div>

    <script>
        const grid = document.getElementById('grid');
        const movesEl = document.getElementById('moves');
        const timeEl = document.getElementById('time');
        const winModal = document.getElementById('winModal');
        const finalMovesEl = document.getElementById('finalMoves');
        const finalTimeEl = document.getElementById('finalTime');

        const emojis = ['💎', '🔮', '👑', '🌟', '🚀', '🔥', '⚡', '🌙'];
        let cards = [];
        let hasFlippedCard = false;
        let lockBoard = false;
        let firstCard, secondCard;
        let moves = 0;
        let matchedPairs = 0;
        let timer;
        let seconds = 0;
        let gameStarted = false;

        function initTimer() {
            seconds = 0;
            timeEl.innerText = '0:00';
            clearInterval(timer);
        }

        function startTimer() {
            if (!gameStarted) {
                gameStarted = true;
                timer = setInterval(() => {
                    seconds++;
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    timeEl.innerText = \`\${mins}:\${secs < 10 ? '0' : ''}\${secs}\`;
                }, 1000);
            }
        }

        function stopTimer() {
            clearInterval(timer);
        }

        function updateMoves() {
            moves++;
            movesEl.innerText = moves;
        }

        function shuffle(array) {
            let currentIndex = array.length, randomIndex;
            while (currentIndex !== 0) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;
                [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
            }
            return array;
        }

        function startGame() {
            winModal.classList.remove('active');
            grid.innerHTML = '';
            moves = 0;
            matchedPairs = 0;
            movesEl.innerText = moves;
            gameStarted = false;
            hasFlippedCard = false;
            lockBoard = false;
            firstCard = null;
            secondCard = null;
            initTimer();

            // Create pairs and shuffle
            cards = [...emojis, ...emojis];
            cards = shuffle(cards);

            // Generate DOM elements
            cards.forEach((emoji, index) => {
                const card = document.createElement('div');
                card.classList.add('card');
                card.dataset.icon = emoji;

                card.innerHTML = \`
                    <div class="card-face card-back"></div>
                    <div class="card-face card-front">\${emoji}</div>
                \`;

                card.addEventListener('click', flipCard);
                grid.appendChild(card);
            });
        }

        function flipCard() {
            if (lockBoard) return;
            if (this === firstCard) return;

            startTimer();

            this.classList.add('flipped');

            if (!hasFlippedCard) {
                hasFlippedCard = true;
                firstCard = this;
                return;
            }

            secondCard = this;
            updateMoves();
            checkForMatch();
        }

        function checkForMatch() {
            let isMatch = firstCard.dataset.icon === secondCard.dataset.icon;

            isMatch ? disableCards() : unflipCards();
        }

        function disableCards() {
            firstCard.removeEventListener('click', flipCard);
            secondCard.removeEventListener('click', flipCard);
            
            // Add matched class for premium styling
            firstCard.classList.add('matched');
            secondCard.classList.add('matched');

            matchedPairs++;
            
            if (matchedPairs === emojis.length) {
                setTimeout(winGame, 500);
            }

            resetBoard();
        }

        function unflipCards() {
            lockBoard = true;

            setTimeout(() => {
                firstCard.classList.remove('flipped');
                secondCard.classList.remove('flipped');
                resetBoard();
            }, 1000);
        }

        function resetBoard() {
            [hasFlippedCard, lockBoard] = [false, false];
            [firstCard, secondCard] = [null, null];
        }

        function winGame() {
            stopTimer();
            finalMovesEl.innerText = moves;
            finalTimeEl.innerText = timeEl.innerText;
            winModal.classList.add('active');
        }

        // Initialize the game on load
        startGame();
    </script>
</body>
</html>`;

    const game4Code = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neon Runner</title>
    <style>
        :root {
            --bg-color: #0b0f19;
            --container-bg: #131a2a;
            --primary-glow: #00f2fe;
            --danger-glow: #ff0844;
            --text-color: #ffffff;
            --text-muted: #94a3b8;
        }

        body {
            margin: 0;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--bg-color);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
        }

        #gameWrapper {
            position: relative;
            width: 800px;
            height: 300px;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
            overflow: hidden;
            background: linear-gradient(180deg, var(--container-bg) 0%, var(--bg-color) 100%);
        }

        canvas {
            display: block;
            cursor: pointer;
        }

        #overlay {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(11, 15, 25, 0.75);
            backdrop-filter: blur(6px);
            z-index: 20;
            transition: opacity 0.3s ease;
        }

        h1 {
            color: var(--text-color);
            margin: 0 0 15px;
            font-size: 42px;
            text-transform: uppercase;
            letter-spacing: 6px;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
        }

        .score-text {
            color: var(--text-muted);
            font-size: 20px;
            margin-bottom: 35px;
            letter-spacing: 2px;
            font-weight: 500;
        }

        button {
            background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
            border: none;
            padding: 14px 40px;
            border-radius: 30px;
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 10px 20px rgba(79, 172, 254, 0.3);
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        button:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 15px 25px rgba(79, 172, 254, 0.5);
        }

        button:active {
            transform: translateY(0) scale(0.98);
        }

        #scoreDisplay {
            position: absolute;
            top: 25px;
            right: 35px;
            color: var(--text-color);
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 3px;
            font-family: 'Courier New', Courier, monospace;
            text-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
            z-index: 10;
        }

        /* Responsive scaling */
        @media (max-width: 850px) {
            #gameWrapper { width: 95vw; height: 35vw; }
        }
    </style>
</head>
<body>

    <div id="gameWrapper">
        <div id="scoreDisplay">00000</div>
        <canvas id="gameCanvas" width="800" height="300"></canvas>
        <div id="overlay">
            <h1 id="title">Neon Runner</h1>
            <div class="score-text" id="finalScore" style="display: none;">Score: 0</div>
            <button id="startBtn">Play</button>
        </div>
    </div>

    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const overlay = document.getElementById('overlay');
        const startBtn = document.getElementById('startBtn');
        const scoreDisplay = document.getElementById('scoreDisplay');
        const title = document.getElementById('title');
        const finalScore = document.getElementById('finalScore');

        // Game Configuration
        const BASE_Y = 250;
        let frames = 0;
        let score = 0;
        let gameSpeed = 6;
        let isPlaying = false;
        let animationId;

        // Player (The Neon Cube)
        const dino = {
            x: 60,
            y: BASE_Y - 40,
            width: 40,
            height: 40,
            dy: 0,
            gravity: 0.85,
            jumpPower: -14,
            grounded: false,
            
            draw() {
                ctx.save();
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00f2fe';
                ctx.fillStyle = '#00f2fe';
                
                // Subtle breathing animation when on the ground
                let currentHeight = this.height;
                if (this.grounded) {
                    currentHeight -= Math.sin(frames * 0.1) * 2; 
                }
                
                ctx.beginPath();
                ctx.roundRect(this.x, this.y + (this.height - currentHeight), this.width, currentHeight, 8);
                ctx.fill();
                ctx.restore();
            },
            
            update() {
                this.dy += this.gravity;
                this.y += this.dy;

                if (this.y + this.height >= BASE_Y) {
                    this.y = BASE_Y - this.height;
                    this.dy = 0;
                    this.grounded = true;
                } else {
                    this.grounded = false;
                }
            },
            
            jump() {
                if (this.grounded) {
                    this.dy = this.jumpPower;
                    this.grounded = false;
                }
            }
        };

        // Obstacles Array & Class
        const obstacles = [];
        class Obstacle {
            constructor() {
                this.width = 20 + Math.random() * 20;
                this.height = 35 + Math.random() * 45;
                this.x = canvas.width;
                this.y = BASE_Y - this.height;
                this.passed = false;
            }
            
            draw() {
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ff0844';
                
                const grad = ctx.createLinearGradient(0, this.y, 0, this.y + this.height);
                grad.addColorStop(0, '#ff0844');
                grad.addColorStop(1, '#ffb199');
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.width, this.height, [6, 6, 0, 0]);
                ctx.fill();
                ctx.restore();
            }
            
            update() {
                this.x -= gameSpeed;
                this.draw();
            }
        }

        function handleObstacles() {
            // Logic to spawn obstacles randomly but safely apart
            if (frames % 90 === 0 || (frames > 100 && Math.random() < 0.015 && frames % 40 === 0)) {
                if (obstacles.length === 0 || canvas.width - obstacles[obstacles.length - 1].x > 300) {
                     obstacles.push(new Obstacle());
                }
            }

            for (let i = 0; i < obstacles.length; i++) {
                obstacles[i].update();

                // Hitbox Collision Detection
                // Shrunk hitboxes slightly for a more forgiving/premium feel
                const hitBuffer = 4;
                if (
                    dino.x + hitBuffer < obstacles[i].x + obstacles[i].width - hitBuffer &&
                    dino.x + dino.width - hitBuffer > obstacles[i].x + hitBuffer &&
                    dino.y + hitBuffer < obstacles[i].y + obstacles[i].height - hitBuffer &&
                    dino.y + dino.height - hitBuffer > obstacles[i].y + hitBuffer
                ) {
                    gameOver();
                }

                // Increment score when passing an obstacle
                if (obstacles[i].x + obstacles[i].width < dino.x && !obstacles[i].passed) {
                    score += 15;
                    obstacles[i].passed = true;
                    // Dynamically increase speed
                    if (score % 150 === 0) gameSpeed += 0.4;
                }
            }

            // Cleanup off-screen obstacles to prevent memory leaks
            if (obstacles.length > 0 && obstacles[0].x < -100) {
                obstacles.shift();
            }
        }

        // Background Particles (Parallax Speed Effect)
        const particles = [];
        class Particle {
            constructor() {
                this.x = canvas.width + Math.random() * canvas.width;
                this.y = Math.random() * BASE_Y;
                this.size = Math.random() * 2 + 1;
                this.speed = Math.random() * 2 + gameSpeed * 0.4;
                this.opacity = Math.random() * 0.4 + 0.1;
            }
            update() {
                this.x -= this.speed;
                if (this.x < 0) {
                    this.x = canvas.width;
                    this.y = Math.random() * BASE_Y;
                }
                ctx.fillStyle = \`rgba(255, 255, 255, \${this.opacity})\`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        for (let i = 0; i < 40; i++) particles.push(new Particle());

        function drawEnvironment() {
            // Draw Ground Line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, BASE_Y);
            ctx.lineTo(canvas.width, BASE_Y);
            ctx.stroke();
            
            // Draw Grid Floor (Perspective illusion)
            const offset = (frames * gameSpeed) % 50;
            for (let i = 0; i < canvas.width + 50; i += 50) {
                ctx.beginPath();
                ctx.moveTo(i - offset, BASE_Y);
                ctx.lineTo((i - offset) - 30, canvas.height);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        function formatScore(s) {
            return s.toString().padStart(5, '0');
        }

        // Main Game Loop
        function animate() {
            if (!isPlaying) return;
            
            // Clear Canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Update & Draw Background Particles
            particles.forEach(p => {
                p.speed = p.size + gameSpeed * 0.4; 
                p.update();
            });

            drawEnvironment();
            
            dino.update();
            dino.draw();
            
            handleObstacles();
            
            // Passive score increment
            if (frames % 10 === 0) score += 1;
            
            scoreDisplay.innerText = formatScore(score);
            frames++;
            
            animationId = requestAnimationFrame(animate);
        }

        function startGame() {
            isPlaying = true;
            score = 0;
            frames = 0;
            gameSpeed = 6.5;
            dino.y = BASE_Y - 40;
            dino.dy = 0;
            obstacles.length = 0;
            scoreDisplay.innerText = "00000";
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; }, 300);
            animate();
        }

        function gameOver() {
            isPlaying = false;
            cancelAnimationFrame(animationId);
            overlay.style.display = 'flex';
            // Slight delay for fade-in effect
            setTimeout(() => { overlay.style.opacity = '1'; }, 10);
            title.innerText = "SYSTEM FAILURE";
            finalScore.style.display = 'block';
            finalScore.innerText = \`Final Score: \${formatScore(score)}\`;
            startBtn.innerText = "Reboot System";
        }

        // Controls
        window.addEventListener('keydown', (e) => {
            if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW')) {
                if (isPlaying) {
                    e.preventDefault();
                    dino.jump();
                } else if (overlay.style.display !== 'none') {
                    e.preventDefault();
                    startGame();
                }
            }
        });

        // Mouse & Touch Controls
        canvas.addEventListener('mousedown', () => { if (isPlaying) dino.jump(); });
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if (isPlaying) dino.jump(); }, { passive: false });
        startBtn.addEventListener('click', startGame);

        // Render initial static background
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawEnvironment();
    </script>
</body>
</html>`;

    const games = [
        {
            id: '00000000-0000-0000-0000-000000000001',
            user_email: 'admin@example.com',
            name: 'Flappy Flight',
            code: game1Code,
            prompt: 'Create a Flappy Bird clone with a premium design.',
            genre: 'arcade',
            visual_style: 'minimalist',
            created_at: daysAgo(2),
            updated_at: daysAgo(2)
        },
        {
            id: '00000000-0000-0000-0000-000000000002',
            user_email: 'admin@example.com',
            name: 'Neon Void',
            code: game2Code,
            prompt: 'A neon-themed space shooter where you collect gems to upgrade your ship.',
            genre: 'shooter',
            visual_style: 'retro-neon',
            created_at: daysAgo(3),
            updated_at: daysAgo(3)
        },
        {
            id: '00000000-0000-0000-0000-000000000003',
            user_email: 'admin@example.com',
            name: 'Memory Match',
            code: game3Code,
            prompt: 'Design a card memory matching game with a clean minimalist UI and smooth animations.',
            genre: 'puzzle',
            visual_style: 'glassmorphism',
            created_at: daysAgo(4),
            updated_at: daysAgo(4)
        },
        {
            id: '00000000-0000-0000-0000-000000000004',
            user_email: 'admin@example.com',
            name: 'Neon Runner',
            code: game4Code,
            prompt: 'Create a side-scrolling endless runner game similar to the Chrome Dino game but with a desert fantasy theme.',
            genre: 'arcade',
            visual_style: 'synthwave',
            created_at: daysAgo(5),
            updated_at: daysAgo(5)
        }
    ];

    // Duplicate for demo user
    const demoGames = games.map((g, idx) => ({
        ...g,
        id: `00000000-0000-0000-0000-00000000000${idx + 5}`,
        user_email: 'user@demo.com'
    }));

    const { error } = await supabaseAdmin.from('games').upsert([...games, ...demoGames], { onConflict: 'id' });
    if (error) throw new Error(`Seed games failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// STEP 14.5: Seed Premium Presentations
// ---------------------------------------------------------------------------
async function seedPresentations() {
    const presentations = [
        {
            id: 'b1b1b1b1-0000-0000-0000-000000000001',
            user_email: 'admin@example.com',
            name: 'AI Suite - Ultimate Enterprise Pitch',
            slides: [
                {
                    slideNumber: 1,
                    type: 'title',
                    badge: 'INVESTOR DECK',
                    title: 'AI Suite: <span style="background: linear-gradient(to right, #818cf8, #c084fc, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">The Multimodal OS</span>',
                    subtitle: 'Supercharge your business with 100+ fine-tuned AI tools, autonomous work agents, and collaborative RAG spaces.',
                    image: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/presentations/2.png',
                    backgroundGradient: 'linear-gradient(135deg, #f5f3ff 0%, #fae8ff 50%, #ffffff 100%)',
                    layout: 'image-right',
                    metrics: [
                        { label: 'Active Seats', value: '45k+' },
                        { label: 'ARR Growth', value: '340% YoY' },
                        { label: 'API Requests', value: '1.2B' }
                    ]
                },
                {
                    slideNumber: 2,
                    type: 'problem',
                    badge: 'MARKET FRICTION',
                    title: 'The Fragmentation of Enterprise AI',
                    subtitle: 'SaaS sprawl and siloed tools cost companies billions in license fees and lost productivity.',
                    cards: [
                        { title: 'Siloed Workflows', description: 'Employees waste up to 4 hours per day copy-pasting data between separate chat interfaces, translation hubs, and graphic generators.' },
                        { title: 'Exploding Tool Costs', description: 'Paying individual licenses for Jasper, Midjourney, OpenAI, and v0 leads to massive, unchecked IT budget overhead.' },
                        { title: 'Security Hazards', description: 'Sensitive company files are uploaded to external tools without unified audit logging, RAG boundaries, or network isolation.' }
                    ]
                },
                {
                    slideNumber: 3,
                    type: 'solution',
                    badge: 'THE AI SUITE SOLUTION',
                    title: 'A Unified Cognitive Ecosystem',
                    subtitle: 'One secure workspace containing every essential AI model, agent, and document index.',
                    points: [
                        '<strong>Unified Workspace:</strong> Instantly switch between advanced chat, vector document pools (RAG), and high-fidelity image or website generation.',
                        '<strong>Smart Token System:</strong> Single subscription grants access to GPT-4o, Claude 3.5 Sonnet, Gemini 1.5, and Llama 3, minimizing overhead.',
                        '<strong>Enterprise Shield:</strong> Role-based access controls, dedicated database isolation, and security compliance to protect critical IP.'
                    ]
                },
                {
                    slideNumber: 4,
                    type: 'market',
                    badge: 'MARKET DYNAMICS',
                    title: 'Capturing the $1.3 Trillion AI Opportunity',
                    subtitle: 'Global enterprise IT budgets are rapidly reallocating toward generative solutions.',
                    stats: [
                        { value: '$1.3T', label: 'Generative TAM by 2032', desc: 'Bloomberg intelligence forecast' },
                        { value: '86%', label: 'Enterprise Adoption Rate', desc: 'Fortune 500 companies run active POCs' },
                        { value: '$14B+', label: 'Venture Inflow in Q1', desc: 'Capital invested in enterprise platforms' }
                    ]
                },
                {
                    slideNumber: 5,
                    type: 'business_model',
                    badge: 'SAAS PRICING MATRIX',
                    title: 'Scalable Workspace Tiers',
                    subtitle: 'Monetization structured by seat size, database usage, and computational bandwidth.',
                    tiers: [
                        { name: 'Starter Tier', price: '$9/seat', features: ['1 User license', '5,000 monthly tokens', 'Standard templates', 'Web playground'] },
                        { name: 'Pro Workspace', price: '$29/seat', features: ['Up to 5 team seats', '25,000 monthly tokens', 'Custom RAG indexing', 'Advanced API access'], popular: true },
                        { name: 'Enterprise Hub', price: 'Custom / Vol', features: ['Unlimited seats', 'Dedicated RAG storage', 'SSO integration', 'Custom SLA support'] }
                    ]
                },
                {
                    slideNumber: 6,
                    type: 'traction',
                    badge: 'PERFORMANCE METRICS',
                    title: 'Validated Market Traction',
                    subtitle: 'High customer retention and continuous platform expansion.',
                    stats: [
                        { value: '99.98%', label: 'API SLA Uptime' },
                        { value: '12 mins', label: 'Avg Team Set-up Time' },
                        { value: '$1.4M', label: 'ARR Reached in 7 Months' },
                        { value: '88%', label: 'Platform Net Retention' }
                    ]
                },
                {
                    slideNumber: 7,
                    type: 'team',
                    badge: 'PRODUCT HORIZONS',
                    title: 'The Strategic Product Roadmap',
                    subtitle: 'Our trajectory to build autonomous, multi-agent workspaces.',
                    cards: [
                        { title: 'Autonomous Agents (Q3)', role: 'Product Development', description: 'Transition from passive prompting to active multi-agent chains that plan and execute complex work.' },
                        { title: 'Secure Zero-Knowledge RAG (Q4)', role: 'Enterprise Security', description: 'Allow military-grade document matching where data is decrypted solely inside local sandboxes.' }
                    ]
                },
                {
                    slideNumber: 8,
                    type: 'ask',
                    badge: 'JOIN THE WAVE',
                    title: 'Partnering with AI Suite',
                    subtitle: 'Unlock organizational efficiency gains with the next generation of software.',
                    points: [
                        '<strong>Schedule an Audit:</strong> Book a free cognitive audit with our solutions architects to identify workflow bottlenecks.',
                        '<strong>Start a Pilot:</strong> Launch a 14-day zero-risk trial for up to 50 active team members within your organization.',
                        '<strong>Consolidate Tools:</strong> Replace outdated single-purpose accounts to save 40% on immediate SaaS overhead.'
                    ]
                }
            ],
            messages: [
                { role: 'user', content: 'Create a highly professional series A investor pitch deck for AI Suite.' },
                { role: 'model', content: 'I have generated a clean, structured pitch deck covering the problem, solution, market size, business model, and strategic roadmap. The design features a modern dark aesthetic with neon indigo gradients.' },
                { role: 'user', content: 'Add Unsplash imagery to the title slide and style the title text with a gradient look.' },
                { role: 'model', content: 'I have updated the title slide to use a premium abstract Unsplash image and applied a gradient text style to the title.' }
            ],
            created_at: daysAgo(2),
            updated_at: daysAgo(2)
        },
        {
            id: 'b1b1b1b1-0000-0000-0000-000000000002',
            user_email: 'admin@example.com',
            name: 'Quantum-Edge Compute - Next Horizon',
            slides: [
                {
                    slideNumber: 1,
                    type: 'title',
                    badge: 'DEEP TECH DECK',
                    title: 'Quantum-Edge: <span style="background: linear-gradient(to right, #22d3ee, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">The Co-Processor Era</span>',
                    subtitle: 'Bringing room-temperature topological quantum computing to local network nodes.',
                    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
                    backgroundGradient: 'linear-gradient(135deg, #ecfeff 0%, #e0f2fe 50%, #ffffff 100%)',
                    layout: 'image-left',
                    metrics: [
                        { label: 'Topological Qubits', value: '1,200 Physical' },
                        { label: 'Coherence time', value: '250μs SOTA' },
                        { label: 'System Latency', value: '<1.8ms' }
                    ]
                },
                {
                    slideNumber: 2,
                    type: 'problem',
                    badge: 'PHYSICAL LIMITS',
                    title: 'The Approaching Death of Silicon',
                    subtitle: 'Classical processors cannot handle high-dimension AI models and molecular simulations.',
                    cards: [
                        { title: 'Dennard Scaling Limits', description: 'Transistor size reduction is reaching sub-nanometer bounds, causing quantum leakage issues.' },
                        { title: 'Datacenter Grid Strains', description: 'Advanced LLM and diffusion training consumes vast power, threatening regional electrical infrastructure.' },
                        { title: 'Legacy Security Vulnerability', description: 'Imminent quantum hardware breaks RSA/ECC cryptographic systems, threatening global information security.' }
                    ]
                },
                {
                    slideNumber: 3,
                    type: 'solution',
                    badge: 'THE ARCHITECTURE',
                    title: 'Topological Room-Temp Processors',
                    subtitle: 'Co-processors operating under ambient conditions without cryogenic refrigeration.',
                    points: [
                        '<strong>Topological Protection:</strong> Braided Majorana fermion qubits protect quantum information from local thermal fluctuations.',
                        '<strong>GPU Hybrid Nodes:</strong> Plugs directly into PCIe Gen 6 slots, bypassing traditional cloud queue delays.',
                        '<strong>Post-Quantum Cryptography:</strong> Integrated post-quantum cryptographic (PQC) chips delivering zero-latency hardware handshakes.'
                    ]
                },
                {
                    slideNumber: 4,
                    type: 'market',
                    badge: 'MARKET SCOPE',
                    title: 'A $120B Computation Shift',
                    subtitle: 'Replacing high-energy classical clusters with dense quantum edge modules.',
                    stats: [
                        { value: '$120B+', label: 'Quantum TAM by 2030', desc: 'McKinsey Advanced Computing Forecast' },
                        { value: '42%', label: 'CAGR Growth Rate', desc: 'Accelerated edge computation demand' },
                        { value: '95%', label: 'National Security Priority', desc: 'Governments allocating dedicated tech development funds' }
                    ]
                },
                {
                    slideNumber: 5,
                    type: 'business_model',
                    badge: 'MONETIZATION MATRIX',
                    title: 'Commercial Quantum Deployment',
                    subtitle: 'From virtual simulators to custom physical installation kits.',
                    tiers: [
                        { name: 'Sandbox Simulator', price: '$0.05/sec', features: ['24 Simulated qubits', 'Web IDE access', 'Shared network queue'] },
                        { name: 'Hybrid Cloud Node', price: '$2.20/sec', features: ['128 Physical qubits', 'Direct execution access', 'SLA latency guarantee'], popular: true },
                        { name: 'Dedicated Rack', price: 'On-Premises', features: ['Room-temp edge rack', 'Dedicated site engineers', 'Hardware co-design'] }
                    ]
                },
                {
                    slideNumber: 6,
                    type: 'traction',
                    badge: 'TRACTION BENCHMARKS',
                    title: 'Computational Efficiency Boost',
                    subtitle: 'Real-world hardware benchmarks versus high-end server clusters.',
                    stats: [
                        { value: '15,000x', label: 'Simulation Speedup' },
                        { value: '99.8%', label: 'Thermal Efficiency Gain' },
                        { value: '0.15W', label: 'Edge Module Energy Draw' },
                        { value: '99.9%', label: 'System Gate Fidelity' }
                    ]
                },
                {
                    slideNumber: 7,
                    type: 'team',
                    badge: 'ENGINEERING ROADMAP',
                    title: 'Milestones to Scalability',
                    subtitle: 'Our upcoming hardware fabrication and software release plan.',
                    cards: [
                        { title: 'Quantum Error Correction (Q2)', role: 'Hardware Engineering', description: 'Implement real-time hardware error correction to push error thresholds past 10^-6.' },
                        { title: 'Developer SDK 2.0 (Q3)', role: 'Software Infrastructure', description: 'Launch python libraries with native integration for PyTorch and TensorFlow networks.' }
                    ]
                },
                {
                    slideNumber: 8,
                    type: 'ask',
                    badge: 'CALL TO ACTION',
                    title: 'Enter the Processing Future',
                    subtitle: 'Apply to our developer pilot or schedule a hardware evaluation.',
                    points: [
                        '<strong>Apply for Sandbox Beta:</strong> Research institutions can apply for 100 free hours of hybrid cloud node computation.',
                        '<strong>Feasibility Assessment:</strong> Partner with our engineers to simulate your current data processing workloads.',
                        '<strong>Pre-order Edge Kit:</strong> Reserve a physical Development Rack v1 for shipping next autumn.'
                    ]
                }
            ],
            messages: [
                { role: 'user', content: 'Generate a presentation about room-temperature quantum computing at the edge.' },
                { role: 'model', content: 'Here is a deck presenting Quantum-Edge Compute. It details the silicon compute bottleneck, room-temperature topological architectures, performance benchmarks, and our service model.' }
            ],
            created_at: daysAgo(3),
            updated_at: daysAgo(3)
        },
        {
            id: 'b1b1b1b1-0000-0000-0000-000000000003',
            user_email: 'admin@example.com',
            name: 'NexaFlow - Last Mile Logistics',
            slides: [
                {
                    slideNumber: 1,
                    type: 'title',
                    badge: 'MERCHANT STRATEGY',
                    title: 'NexaFlow: <span style="background: linear-gradient(to right, #34d399, #059669); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Autonomous Delivery</span>',
                    subtitle: 'Orchestrating smart electric drone swarms for zero-congestion last-mile distribution.',
                    image: 'https://raw.githubusercontent.com/mounikaibusiness-commits/storage/refs/heads/main/presentations/1.png',
                    backgroundGradient: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #ffffff 100%)',
                    layout: 'image-right',
                    metrics: [
                        { label: 'Avg Delivery Time', value: '14 Mins' },
                        { label: 'Per-Drop Cost', value: '$0.85 Flat' },
                        { label: 'Carbon Reduction', value: '94% Carbon' }
                    ]
                },
                {
                    slideNumber: 2,
                    type: 'problem',
                    badge: 'LOGISTICAL FRICTION',
                    title: 'The Crisis in Last-Mile Distribution',
                    subtitle: 'Traffic gridlock and high courier turnover make traditional package delivery expensive and slow.',
                    cards: [
                        { title: 'Urban Congestion Stalls', description: 'Delivery trucks spend over a third of their shift idling in traffic, raising operational costs.' },
                        { title: 'Courier Shortage Inflation', description: 'High recruitment costs and turnover rates force logistics providers to continually raise delivery fees.' },
                        { title: 'Strict Green Regulations', description: 'Cities are enforcing zero-emission zones, requiring fleets to completely retire internal combustion engines.' }
                    ]
                },
                {
                    slideNumber: 3,
                    type: 'solution',
                    badge: 'THE TECHNOLOGY',
                    title: 'Autonomous Flight Swarms',
                    subtitle: 'Electric flight networks coordinated by real-time spatial swarm logic.',
                    points: [
                        '<strong>Battery Swap Hubs:</strong> Micro-hubs with automated robotic trays swap depleted drone batteries in under 45 seconds.',
                        '<strong>Swarm Navigation:</strong> Drones dynamically communicate to avoid structures, vehicles, and weather hazards in real-time.',
                        '<strong>Secure Drop Lockers:</strong> Integrated micro-landing pads that open only for authorized customer mobile codes.'
                    ]
                },
                {
                    slideNumber: 4,
                    type: 'market',
                    badge: 'MARKET SCALING',
                    title: 'A $420B Instant Delivery TAM',
                    subtitle: 'Fulfillment expectations are shifting to sub-hour timeframes.',
                    stats: [
                        { value: '$420B', label: 'Instant Delivery Market TAM', desc: 'Estimated total by 2030' },
                        { value: '24%', label: 'Yearly CAGR Increase', desc: 'Fulfillment automation acceleration' },
                        { value: '3.2B', label: 'Annual Shipments', desc: 'Global package volume suited for drones' }
                    ]
                },
                {
                    slideNumber: 5,
                    type: 'business_model',
                    badge: 'SERVICE TIERS',
                    title: 'Swarm Logistics API',
                    subtitle: 'Simple transaction-based fees tailored to retail hubs and local food services.',
                    tiers: [
                        { name: 'Local Merchant', price: '$1.50/drop', features: ['15 Daily deliveries', '5km Radius limit', 'Dynamic tracking link'] },
                        { name: 'Enterprise Hub', price: '$0.85/drop', features: ['Unlimited daily drops', '15km Radius limit', 'White-label software dashboard'], popular: true },
                        { name: 'Medical Logistics', price: 'Custom SLA', features: ['Temperature controlled bays', 'Priority flight paths', '24/7 manual control override'] }
                    ]
                },
                {
                    slideNumber: 6,
                    type: 'traction',
                    badge: 'PERFORMANCE LOG',
                    title: 'Operational Fleet Performance',
                    subtitle: 'Key performance markers from our initial metropolitan pilot markets.',
                    stats: [
                        { value: '1.2M', label: 'Swarm Flight Miles' },
                        { value: '99.98%', label: 'Delivery Safety Rating' },
                        { value: '14 mins', label: 'Avg Doorstep Duration' },
                        { value: '$2.1M', label: 'Platform Net Revenue' }
                    ]
                },
                {
                    slideNumber: 7,
                    type: 'team',
                    badge: 'OPERATIONAL ROADMAP',
                    title: 'Swarm Network Expansion',
                    subtitle: 'Our planned development schedule for global hub operations.',
                    cards: [
                        { title: 'FAA BVLOS Waiver (Q4)', role: 'Regulatory Compliance', description: 'Secure full regulatory certification for beyond-visual-line-of-sight flight operations.' },
                        { title: 'Metropolitan Hubs (Q1)', role: 'Infrastructure Deployment', description: 'Construct and launch 15 automated micro-hubs across prime coastal cities.' }
                    ]
                },
                {
                    slideNumber: 8,
                    type: 'ask',
                    badge: 'GET IN TOUCH',
                    title: 'Optimize Your Distribution',
                    subtitle: 'Get in touch to deploy autonomous delivery at your warehouse nodes.',
                    points: [
                        '<strong>Logistics Simulation:</strong> Provide your coordinates for a simulated analysis of swarm density requirements.',
                        '<strong>API Integration:</strong> Consult our guides to connect NexaFlow directly into your Shopify or ERP database.',
                        '<strong>Flight Center Visit:</strong> Schedule a tour of our active flight and drone swarm operations center.'
                    ]
                }
            ],
            messages: [
                { role: 'user', content: 'Create a pitch deck for an autonomous drone logistics startup named NexaFlow.' },
                { role: 'model', content: 'I have generated a slide presentation for NexaFlow. It covers urban congestion issues, drone swarm battery swap solutions, price scales, and regional expansions.' }
            ],
            created_at: daysAgo(4),
            updated_at: daysAgo(4)
        }
    ];

    // Duplicate for demo user
    const demoPresentations = presentations.map((p, idx) => ({
        ...p,
        id: `b1b1b1b1-0000-0000-0000-00000000000${idx + 4}`,
        user_email: 'user@demo.com'
    }));

    const allPresentations = [...presentations, ...demoPresentations];
    const { error } = await supabaseAdmin.from('presentations').upsert(allPresentations, { onConflict: 'id' });
    if (error) throw new Error(`Seed presentations failed: ${error.message}`);
    return allPresentations.length;
}

// ---------------------------------------------------------------------------
// STEP 15: Seed Voice Agent and Call Logs
// ---------------------------------------------------------------------------
async function seedVoiceCalls() {
    const configIdAdmin = 'a0a0a0a0-0000-0000-0000-000000000001';
    const configIdDemo = 'd0d0d0d0-0000-0000-0000-000000000002';

    const configs = [
        {
            id: configIdAdmin,
            user_email: 'admin@example.com',
            agent_name: 'Nova',
            personality: 'Professional, warm, and extremely helpful corporate AI assistant.',
            system_prompt: 'You are Nova, an AI voice calling assistant for AI Suite. Keep answers concise, friendly, and structured.',
            greeting_message: "Hello! I'm Nova, your AI assistant. How can I help you today?",
            language: 'en-US',
            voice_id: 'Polly.Joanna-Neural',
            call_objective: 'General purpose AI assistant',
            max_call_duration: 600,
            silence_timeout: 5,
            end_call_phrases: ['goodbye', 'bye', 'end call', 'hang up', 'that is all'],
            is_active: true,
            created_at: daysAgo(5),
            updated_at: daysAgo(5)
        },
        {
            id: configIdDemo,
            user_email: 'user@demo.com',
            agent_name: 'Nova',
            personality: 'Professional, warm, and extremely helpful corporate AI assistant.',
            system_prompt: 'You are Nova, an AI voice calling assistant for AI Suite. Keep answers concise, friendly, and structured.',
            greeting_message: "Hello! I'm Nova, your AI assistant. How can I help you today?",
            language: 'en-US',
            voice_id: 'Polly.Joanna-Neural',
            call_objective: 'General purpose AI assistant',
            max_call_duration: 600,
            silence_timeout: 5,
            end_call_phrases: ['goodbye', 'bye', 'end call', 'hang up', 'that is all'],
            is_active: true,
            created_at: daysAgo(5),
            updated_at: daysAgo(5)
        }
    ];

    const { error: configError } = await supabaseAdmin.from('voice_agent_config').upsert(configs, { onConflict: 'user_email' });
    if (configError) throw new Error(`Seed voice_agent_config failed: ${configError.message}`);

    const callTemplates = [
        {
            callOffset: 1,
            direction: 'outbound',
            phoneNumber: '+14155550198',
            fromNumber: 'Twilio',
            toNumber: '+14155550198',
            status: 'completed',
            duration: 142,
            startedAtHoursAgo: 2,
            endedAtHoursAgo: 2,
            transcripts: [
                { role: 'agent', content: "Hello! I'm Nova, your AI assistant. How can I help you today?" },
                { role: 'caller', content: "Hi Nova, I wanted to ask about custom models training. Can I import my own custom weights?" },
                { role: 'agent', content: "Currently, AI Suite supports fine-tuning of supported models using your own structured datasets via our RAG and fine-tuning pipelines. Direct import of external custom model weights is not available on standard plans, but our Enterprise custom model setups can support this. Would you like me to connect you with an integration specialist?" },
                { role: 'caller', content: "Yes, that would be great. Can you schedule a call for tomorrow at 3 PM?" },
                { role: 'agent', content: "I would be happy to. I have marked a follow-up ticket for our integrations team to contact you tomorrow at 3 PM. Is there any specific email address you prefer they use?" },
                { role: 'caller', content: "Please use admin@example.com." },
                { role: 'agent', content: "Got it! I have updated the ticket with admin@example.com. Expect an email confirmation shortly. Is there anything else I can help you with today?" },
                { role: 'caller', content: "No, that's everything. Thank you!" },
                { role: 'agent', content: "You're very welcome! Have a wonderful day. Goodbye." },
                { role: 'caller', content: "Goodbye." }
            ]
        },
        {
            callOffset: 2,
            direction: 'inbound',
            phoneNumber: '+447700900077',
            fromNumber: '+447700900077',
            toNumber: 'Twilio',
            status: 'in-progress',
            duration: 48,
            startedAtHoursAgo: 1,
            endedAtHoursAgo: 1,
            transcripts: [
                { role: 'agent', content: "Hello! I'm Nova, your AI assistant. How can I help you today?" },
                { role: 'caller', content: "Hey Nova, I'm trying to set up the website builder, but the deployment seems stuck on compiling assets." },
                { role: 'agent', content: "I understand that can be frustrating. Let me check the deployment log status. Could you tell me the project name?" },
                { role: 'caller', content: "It's called Premium Portfolio Design." },
                { role: 'agent', content: "Thank you. I see the project 'Premium Portfolio Design' under active deployments. The compilation is indeed taking slightly longer due to a high queue density on the rendering server. It is currently at seventy percent and should complete in under two minutes. Would you like me to send a system notification when it is live?" },
                { role: 'caller', content: "Yes, that would be perfect, thanks!" }
            ]
        },
        {
            callOffset: 3,
            direction: 'outbound',
            phoneNumber: '+491705551234',
            fromNumber: 'Twilio',
            toNumber: '+491705551234',
            status: 'completed',
            duration: 85,
            startedAtHoursAgo: 3,
            endedAtHoursAgo: 3,
            transcripts: [
                { role: 'agent', content: "Hello! I'm Nova, your AI assistant. How can I help you today?" },
                { role: 'caller', content: "Hi! I wanted to check my active token balance. I received an alert saying it was low." },
                { role: 'agent', content: "Let me check that for you. I see your account has an active balance of 750 tokens, down from your monthly quota. You can easily purchase token add-on packages directly from the billing section or upgrade to the Pro plan for a larger monthly quota of twenty-five thousand tokens." },
                { role: 'caller', content: "Ah, okay. I think I'll upgrade to Pro. Can I do it right now?" },
                { role: 'agent', content: "Yes! You can upgrade instantly by navigating to the pricing page under your settings dashboard. The upgrade is processed securely and the tokens are added to your balance immediately." },
                { role: 'caller', content: "Great! Thanks for your help." },
                { role: 'agent', content: "You're very welcome! Have a fantastic day. Goodbye!" },
                { role: 'caller', content: "Bye!" }
            ]
        },
        {
            callOffset: 4,
            direction: 'inbound',
            phoneNumber: '+61491570156',
            fromNumber: '+61491570156',
            toNumber: 'Twilio',
            status: 'completed',
            duration: 110,
            startedAtHoursAgo: 5,
            endedAtHoursAgo: 5,
            transcripts: [
                { role: 'agent', content: "Hello! I'm Nova, your AI assistant. How can I help you today?" },
                { role: 'caller', content: "Hello, my name is Arthur. I'm calling to report an issue with the AI Image Generator. It keeps saying 'safety filter triggered' even when I'm generating landscapes." },
                { role: 'agent', content: "Hello Arthur. I'm sorry to hear that the safety filters are interfering with your landscape prompts. Sometimes, specific words or combinations can inadvertently trigger the classifier. Could you share one of the prompts you were using?" },
                { role: 'caller', content: "I was trying to generate 'a peaceful cabin surrounded by misty red forests'." },
                { role: 'agent', content: "Ah, the word 'red' in combination with certain adjectives can sometimes trigger a false positive in the color classification rules. I recommend rephrasing to 'autumn-colored forests' or 'crimson foliage' which should bypass the false positive. Meanwhile, I've logged this prompt with our engineering team to improve the classifier's accuracy." },
                { role: 'caller', content: "Oh, that makes sense. I'll try that right away. Thanks Nova!" },
                { role: 'agent', content: "It's my absolute pleasure, Arthur! Feel free to call back if you run into any more issues. Goodbye!" },
                { role: 'caller', content: "Goodbye!" }
            ]
        },
        {
            callOffset: 5,
            direction: 'outbound',
            phoneNumber: '+16045550124',
            fromNumber: 'Twilio',
            toNumber: '+16045550124',
            status: 'failed',
            duration: 0,
            startedAtHoursAgo: 8,
            endedAtHoursAgo: 8,
            transcripts: []
        },
        {
            callOffset: 6,
            direction: 'inbound',
            phoneNumber: '+33600000000',
            fromNumber: '+33600000000',
            toNumber: 'Twilio',
            status: 'busy',
            duration: 0,
            startedAtHoursAgo: 12,
            endedAtHoursAgo: 12,
            transcripts: []
        }
    ];

    const voiceCallsToInsert: any[] = [];
    const voiceTranscriptsToInsert: any[] = [];

    const targetUsers = [
        { email: 'admin@example.com', suffix: '1111', prefix: 'admin', configId: configIdAdmin },
        { email: 'user@demo.com', suffix: '2222', prefix: 'demo', configId: configIdDemo }
    ];

    for (const u of targetUsers) {
        for (const t of callTemplates) {
            const callId = `c1c1c1c1-1111-1111-${u.suffix}-${t.callOffset.toString().padStart(12, '0')}`;
            const callSid = `CA${u.prefix.slice(0, 4).padEnd(4, 'x')}${t.callOffset.toString().padStart(28, '0')}`;
            const startedAt = hoursAgo(t.startedAtHoursAgo);
            let endedAt = null;
            if (t.duration > 0) {
                const startDate = new Date(startedAt);
                endedAt = new Date(startDate.getTime() + t.duration * 1000).toISOString();
            }

            voiceCallsToInsert.push({
                id: callId,
                call_sid: callSid,
                user_email: u.email,
                direction: t.direction,
                from_number: t.fromNumber,
                to_number: t.toNumber,
                status: t.status,
                duration: t.duration,
                agent_config_id: u.configId,
                started_at: startedAt,
                ended_at: endedAt,
                created_at: startedAt
            });

            // Transcripts
            t.transcripts.forEach((tr, trIdx) => {
                const trId = `f1f1f1f1-1111-1111-${u.suffix}-${t.callOffset.toString().padStart(2, '0')}${trIdx.toString().padStart(10, '0')}`;
                const startedDate = new Date(startedAt);
                const trTimestamp = new Date(startedDate.getTime() + trIdx * 10 * 1000).toISOString();

                voiceTranscriptsToInsert.push({
                    id: trId,
                    call_id: callId,
                    role: tr.role,
                    content: tr.content,
                    timestamp: trTimestamp
                });
            });
        }
    }

    const { error: callsError } = await supabaseAdmin.from('voice_calls').upsert(voiceCallsToInsert, { onConflict: 'id' });
    if (callsError) throw new Error(`Seed voice_calls failed: ${callsError.message}`);

    const { error: transcriptsError } = await supabaseAdmin.from('voice_transcripts').upsert(voiceTranscriptsToInsert, { onConflict: 'id' });
    if (transcriptsError) throw new Error(`Seed voice_transcripts failed: ${transcriptsError.message}`);

    return {
        configs: configs.length,
        calls: voiceCallsToInsert.length,
        transcripts: voiceTranscriptsToInsert.length
    };
}

// ---------------------------------------------------------------------------
// STEP 16: Seed Notifications and Conversation Threads
// ---------------------------------------------------------------------------
async function seedNotifications() {
    const notifications = [
        {
            id: 'e1a1a1a1-0000-0000-0000-000000000001',
            title: 'Welcome to AI Suite v7.6! 🚀',
            description: 'Explore the brand new interactive widgets, voice agent workspaces, and optimized tools.',
            content: `<div class="space-y-4">
  <p>We are thrilled to welcome you to the latest release of <strong>AI Suite (v7.6)</strong>! This update brings massive performance improvements and state-of-the-art updates to our AI workflows:</p>
  <ul class="list-disc pl-5 space-y-1">
    <li><strong>Voice Agent workspace:</strong> Build and test custom-voiced AI phone agents in seconds with natural greeting text and customizable objective parameters.</li>
    <li><strong>Reels Creator:</strong> Generate fully narrated, scene-based marketing reels using AI-driven script writing and image generators.</li>
    <li><strong>Unified Notification Hub:</strong> Send announcements, receive feedback, and handle support conversations directly in your inbox.</li>
  </ul>
  <p>Check out the documentation or head to the dashboard to begin creating!</p>
</div>`,
            severity: 'info',
            icon: 'sparkles',
            is_global: true,
            is_pinned: true,
            allow_replies: false,
            created_by: 'admin@example.com',
            status: 'sent',
            created_at: daysAgo(10),
            updated_at: daysAgo(10)
        },
        {
            id: 'e1a1a1a1-0000-0000-0000-000000000002',
            title: 'AI Reel Generation Complete! 🎥',
            description: 'Your marketing campaign reel "Tech Launch 2026" has been processed.',
            content: `<div class="space-y-4">
  <p>Your request to generate a marketing reel for <strong>"Tech Launch 2026"</strong> has succeeded!</p>
  <div class="p-3 bg-violet-500/10 rounded-lg border border-violet-500/20 text-xs">
    <strong>Generation Summary:</strong><br/>
    - Scenes: 4 scenes processed<br/>
    - Duration: 35 seconds<br/>
    - Voice Model: Joanna (Neural)<br/>
    - Token Cost: 250 tokens
  </div>
  <p>You can preview the finished MP4 asset and export it to your social media calendar directly in the Reels studio. Let us know if you want to tweak the scripting or voiceover parameters!</p>
</div>`,
            severity: 'success',
            icon: 'image',
            is_global: false,
            is_pinned: false,
            allow_replies: true,
            created_by: 'admin@example.com',
            status: 'sent',
            created_at: daysAgo(3),
            updated_at: daysAgo(3)
        },
        {
            id: 'e1a1a1a1-0000-0000-0000-000000000003',
            title: 'Token Quota Threshold Alert ⚡',
            description: 'You have consumed 85% of your monthly plan tokens.',
            content: `<div class="space-y-4">
  <p>This is an automated alert to notify you that your active token balance has dropped below <strong>15%</strong> of your plan allocation.</p>
  <div class="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs text-amber-300">
    <strong>Quota Statistics:</strong><br/>
    - Allocated: 25,000 tokens<br/>
    - Consumed: 21,250 tokens<br/>
    - Remaining: 3,750 tokens
  </div>
  <p>To prevent any service interruption in your active RAG documents or Voice Agent processes, we recommend upgrading to the <strong>Enterprise Plan</strong> or purchasing an on-demand token add-on bundle under the billing settings page.</p>
</div>`,
            severity: 'warning',
            icon: 'zap',
            is_global: false,
            is_pinned: false,
            allow_replies: true,
            created_by: 'admin@example.com',
            status: 'sent',
            created_at: daysAgo(1),
            updated_at: daysAgo(1)
        },
        {
            id: 'e1a1a1a1-0000-0000-0000-000000000004',
            title: 'Webhook Delivery Failure ⚠️',
            description: 'Your configured endpoint failed to acknowledge multiple call-log events.',
            content: `<div class="space-y-4">
  <p>Our integration gateway has registered multiple delivery failures for your webhook endpoint:</p>
  <code class="block p-2 bg-rose-950/20 rounded border border-rose-500/20 text-rose-400 text-xs overflow-x-auto">
    POST https://api.userdomain.com/webhooks/voice-logs -> 502 Bad Gateway
  </code>
  <p>We have temporarily paused automated retries for this endpoint to prevent network flooding. Please verify that your backend server is responsive and acknowledge events with a <code>200 OK</code> response code.</p>
</div>`,
            severity: 'error',
            icon: 'activity',
            is_global: false,
            is_pinned: false,
            allow_replies: true,
            created_by: 'admin@example.com',
            status: 'sent',
            created_at: hoursAgo(5),
            updated_at: hoursAgo(5)
        }
    ];

    const { error: notifError } = await supabaseAdmin.from('notifications').upsert(notifications, { onConflict: 'id' });
    if (notifError) throw new Error(`Seed notifications failed: ${notifError.message}`);

    // Seed recipients
    const { data: usersData, error: usersError } = await supabaseAdmin.from('users').select('email');
    if (usersError || !usersData) throw new Error(`Failed to fetch users for notification recipients: ${usersError?.message}`);
    
    const allEmails = usersData.map((u: any) => u.email.toLowerCase());
    const recipients: any[] = [];

    // Global Welcome notification goes to ALL users
    allEmails.forEach((email) => {
        recipients.push({
            notification_id: 'e1a1a1a1-0000-0000-0000-000000000001',
            user_email: email,
            is_read: false,
            created_at: daysAgo(10)
        });
    });

    // Success notification goes to user@demo.com, admin@example.com, and sarah.chen@techcorp.io
    const successRecipients = ['user@demo.com', 'admin@example.com', 'sarah.chen@techcorp.io'];
    successRecipients.forEach((email, idx) => {
        recipients.push({
            notification_id: 'e1a1a1a1-0000-0000-0000-000000000002',
            user_email: email,
            is_read: idx === 0 ? false : true, // unread for demo user, read for others
            created_at: daysAgo(3)
        });
    });

    // Warning notification goes to user@demo.com and lisa.wang@creative.studio
    const warningRecipients = ['user@demo.com', 'lisa.wang@creative.studio'];
    warningRecipients.forEach((email) => {
        recipients.push({
            notification_id: 'e1a1a1a1-0000-0000-0000-000000000003',
            user_email: email,
            is_read: false, // unread
            created_at: daysAgo(1)
        });
    });

    // Error notification goes to user@demo.com and sarah.chen@techcorp.io
    const errorRecipients = ['user@demo.com', 'sarah.chen@techcorp.io'];
    errorRecipients.forEach((email) => {
        recipients.push({
            notification_id: 'e1a1a1a1-0000-0000-0000-000000000004',
            user_email: email,
            is_read: false, // unread
            created_at: hoursAgo(5)
        });
    });

    const { error: recError } = await supabaseAdmin.from('notification_recipients').upsert(recipients, { onConflict: 'notification_id,user_email' });
    if (recError) throw new Error(`Seed notification_recipients failed: ${recError.message}`);

    // Seed conversation messages for threads
    const messages = [
        // Reel Generation Completed Thread
        {
            id: 'e1a1a1a1-0000-0000-0000-000000000021',
            notification_id: 'e1a1a1a1-0000-0000-0000-000000000002',
            sender_email: 'user@demo.com',
            sender_role: 'user',
            message: 'This looks fantastic! Can I change the voice model to a male voice like Matthew?',
            is_read: true,
            created_at: daysAgo(2.5)
        },
        {
            id: 'e1a1a1a1-0000-0000-0000-000000000022',
            notification_id: 'e1a1a1a1-0000-0000-0000-000000000002',
            sender_email: 'admin@example.com',
            sender_role: 'admin',
            message: "Yes, you can! Open the project settings in the Reel Studio, select 'Matthew (Neural)' from the voice options, and click regenerate. It will use the cached scene visual prompts to save your tokens.",
            is_read: true,
            created_at: daysAgo(2)
        },
        {
            id: 'e1a1a1a1-0000-0000-0000-000000000023',
            notification_id: 'e1a1a1a1-0000-0000-0000-000000000002',
            sender_email: 'user@demo.com',
            sender_role: 'user',
            message: 'Perfect, doing it now. Thanks for the quick response!',
            is_read: false,
            created_at: daysAgo(1.8)
        },

        // Token Warning Thread
        {
            id: 'e1a1a1a1-0000-0000-0000-000000000031',
            notification_id: 'e1a1a1a1-0000-0000-0000-000000000003',
            sender_email: 'user@demo.com',
            sender_role: 'user',
            message: 'If I purchase a token add-on bundle, will those tokens expire at the end of the month?',
            is_read: true,
            created_at: daysAgo(0.8)
        },
        {
            id: 'e1a1a1a1-0000-0000-0000-000000000032',
            notification_id: 'e1a1a1a1-0000-0000-0000-000000000003',
            sender_email: 'admin@example.com',
            sender_role: 'admin',
            message: 'No, token add-on bundles do not expire! Only your monthly plan quota resets at the end of your billing cycle. Add-on tokens are always consumed last and carry over indefinitely.',
            is_read: false,
            created_at: daysAgo(0.5)
        },

        // Webhook Delivery Failure Thread
        {
            id: 'e1a1a1a1-0000-0000-0000-000000000041',
            notification_id: 'e1a1a1a1-0000-0000-0000-000000000004',
            sender_email: 'user@demo.com',
            sender_role: 'user',
            message: 'We had a database lock issue that crashed the server. It is back online now and processing requests correctly.',
            is_read: true,
            created_at: hoursAgo(4)
        },
        {
            id: 'e1a1a1a1-0000-0000-0000-000000000042',
            notification_id: 'e1a1a1a1-0000-0000-0000-000000000004',
            sender_email: 'admin@example.com',
            sender_role: 'admin',
            message: 'Thank you for the update! We have re-enabled the webhook queue. The failed events will be redelivered automatically over the next few minutes. Let us know if you see any further issues.',
            is_read: false,
            created_at: hoursAgo(3.5)
        }
    ];

    const { error: msgError } = await supabaseAdmin.from('notification_messages').upsert(messages, { onConflict: 'id' });
    if (msgError) throw new Error(`Seed notification_messages failed: ${msgError.message}`);

    return {
        notifications: notifications.length,
        recipients: recipients.length,
        messages: messages.length
    };
}

// ---------------------------------------------------------------------------
// STEP 17: Seed WhatsApp Agent and Chat Logs
// ---------------------------------------------------------------------------
async function seedWhatsAppData() {
    const agents = [
        {
            user_email: 'admin@example.com',
            is_active: true,
            phone_number: '14155550198',
            reply_target: 'all',
            target_numbers: '{}',
            system_prompt: 'You are a professional, helpful support assistant for AI Suite.',
            model_id: 'gemini-2.5-flash',
            tone: 'friendly',
            personality: 'professional',
            reply_behavior: 'auto',
            response_delay: 0,
            created_at: daysAgo(10),
            updated_at: daysAgo(10)
        },
        {
            user_email: 'user@demo.com',
            is_active: true,
            phone_number: '14155550199',
            reply_target: 'all',
            target_numbers: '{}',
            system_prompt: 'You are a helpful and friendly AI assistant.',
            model_id: 'gemini-2.5-flash',
            tone: 'friendly',
            personality: 'professional',
            reply_behavior: 'auto',
            response_delay: 0,
            created_at: daysAgo(10),
            updated_at: daysAgo(10)
        }
    ];

    const { error: agentError } = await supabaseAdmin.from('whatsapp_agents').upsert(agents, { onConflict: 'user_email' });
    if (agentError) throw new Error(`Seed whatsapp_agents failed: ${agentError.message}`);

    const targetEmails = ['admin@example.com', 'user@demo.com'];
    const logsToInsert: any[] = [];

    targetEmails.forEach((email) => {
        // Conversation 1: Sarah Jenkins
        logsToInsert.push(
            {
                user_email: email,
                sender_number: '14155552671@s.whatsapp.net',
                sender_name: 'Sarah Jenkins',
                message_text: 'Hi there! I saw your website and wanted to inquire about your product design services. Do you have availability this month?',
                reply_text: 'Hello Sarah! Thanks for reaching out. Yes, we do have a few openings for product design consults this month. I\'d love to learn more about your project. What kind of product are you designing?',
                tokens_consumed: 15,
                status: 'success',
                created_at: daysAgo(4)
            },
            {
                user_email: email,
                sender_number: '14155552671@s.whatsapp.net',
                sender_name: 'Sarah Jenkins',
                message_text: 'We are building a new SaaS platform for workflow automation and need help with UX/UI design.',
                reply_text: 'That sounds exciting! We have extensive experience designing complex SaaS workflows. I recommend booking a brief 30-minute discovery call so we can discuss your requirements in detail. Here is our calendar link: cal.com/acme/30min',
                tokens_consumed: 18,
                status: 'success',
                created_at: new Date(new Date(daysAgo(4)).getTime() + 15 * 60 * 1000).toISOString()
            },
            {
                user_email: email,
                sender_number: '14155552671@s.whatsapp.net',
                sender_name: 'Sarah Jenkins',
                message_text: 'Awesome, I just booked a slot for Thursday at 2 PM. Looking forward to it!',
                reply_text: 'Perfect! We\'ve received your booking for Thursday at 2 PM. You should receive a calendar invite and link shortly. Have a wonderful day!',
                tokens_consumed: 12,
                status: 'success',
                created_at: new Date(new Date(daysAgo(4)).getTime() + 30 * 60 * 1000).toISOString()
            }
        );

        // Conversation 2: Marcus Vance
        logsToInsert.push(
            {
                user_email: email,
                sender_number: '447700900077@s.whatsapp.net',
                sender_name: 'Marcus Vance',
                message_text: 'Hey, I keep getting a 429 Rate Limit error when sending payloads to the translation endpoint. Can you check my quota?',
                reply_text: 'Hello Marcus! I\'m sorry to hear you\'re hitting rate limits. Let me check your account. It looks like you\'ve consumed 95% of your Starter plan\'s API token limit. I can guide you on upgrading to the Pro plan or purchasing a token add-on bundle to lift this limit immediately.',
                tokens_consumed: 22,
                status: 'success',
                created_at: daysAgo(2)
            },
            {
                user_email: email,
                sender_number: '447700900077@s.whatsapp.net',
                sender_name: 'Marcus Vance',
                message_text: 'Okay, how much is the Pro plan upgrade?',
                reply_text: 'The Pro plan is $29/month and includes 25,000 monthly tokens, custom RAG document storage, and higher API limits. You can upgrade instantly in your Billing tab.',
                tokens_consumed: 16,
                status: 'success',
                created_at: new Date(new Date(daysAgo(2)).getTime() + 5 * 60 * 1000).toISOString()
            },
            {
                user_email: email,
                sender_number: '447700900077@s.whatsapp.net',
                sender_name: 'Marcus Vance',
                message_text: '',
                reply_text: 'Hi Marcus, this is Alex from support. I noticed you were asking about this and have temporarily added 1,000 tokens to your account for free so you can complete your current translation tasks. Let me know if you need help upgrading!',
                tokens_consumed: 0,
                status: 'manual',
                created_at: new Date(new Date(daysAgo(2)).getTime() + 10 * 60 * 1000).toISOString()
            },
            {
                user_email: email,
                sender_number: '447700900077@s.whatsapp.net',
                sender_name: 'Marcus Vance',
                message_text: 'Wow, that is amazing support! Thank you so much, Alex. The extra tokens worked. I will talk to my team about upgrading to Pro this afternoon.',
                reply_text: 'You\'re very welcome, Marcus! We are glad to hear the extra tokens helped. If you need anything else or have questions during the upgrade, just let us know. Have a great day!',
                tokens_consumed: 14,
                status: 'success',
                created_at: new Date(new Date(daysAgo(2)).getTime() + 20 * 60 * 1000).toISOString()
            }
        );

        // Conversation 3: Elena Rostova
        logsToInsert.push(
            {
                user_email: email,
                sender_number: '491705551234@s.whatsapp.net',
                sender_name: 'Elena Rostova',
                message_text: 'Hello, do you support third-party integrations with Salesforce and HubSpot? We need to sync our CRM contacts.',
                reply_text: 'Hello Elena! Yes, we support webhooks and a fully-featured REST API that allows you to integrate with third-party tools like Salesforce and HubSpot. You can configure webhook triggers for contact updates under settings.',
                tokens_consumed: 20,
                status: 'success',
                created_at: daysAgo(1)
            },
            {
                user_email: email,
                sender_number: '491705551234@s.whatsapp.net',
                sender_name: 'Elena Rostova',
                message_text: 'Perfect. Do you have API documentation I can share with my developers?',
                reply_text: 'Absolutely! You can access our full API documentation here: docs.aisuite.com/api. It includes code samples in Node.js, Python, and cURL.',
                tokens_consumed: 15,
                status: 'success',
                created_at: new Date(new Date(daysAgo(1)).getTime() + 5 * 60 * 1000).toISOString()
            },
            {
                user_email: email,
                sender_number: '491705551234@s.whatsapp.net',
                sender_name: 'Elena Rostova',
                message_text: 'Great, thanks! I will pass this along to our tech lead.',
                reply_text: 'Thanks',
                tokens_consumed: 0,
                status: 'success',
                created_at: new Date(new Date(daysAgo(1)).getTime() + 10 * 60 * 1000).toISOString()
            }
        );
    });

    const { error: logsError } = await supabaseAdmin.from('whatsapp_logs').insert(logsToInsert);
    if (logsError) throw new Error(`Seed whatsapp_logs failed: ${logsError.message}`);

    return {
        agents: agents.length,
        logs: logsToInsert.length
    };
}

async function seedInstagramData() {
    const agents = [
        {
            user_email: 'admin@example.com',
            is_active: true,
            instagram_business_account_id: '17841400000000001',
            page_access_token: 'EAAGxxxxxxxxxx_mock_token_admin',
            username: 'aisuite_official',
            system_prompt: 'You are a professional, helpful support assistant for AI Suite.',
            model_id: 'gemini-2.5-flash',
            tone: 'friendly',
            personality: 'professional',
            dm_reply_behavior: 'auto',
            comment_reply_behavior: 'auto',
            response_delay: 0,
            created_at: daysAgo(10),
            updated_at: daysAgo(10)
        },
        {
            user_email: 'user@demo.com',
            is_active: true,
            instagram_business_account_id: '17841400000000002',
            page_access_token: 'EAAGxxxxxxxxxx_mock_token_demo',
            username: 'demo_creator',
            system_prompt: 'You are a helpful and friendly AI assistant for Instagram.',
            model_id: 'gemini-2.5-flash',
            tone: 'friendly',
            personality: 'professional',
            dm_reply_behavior: 'auto',
            comment_reply_behavior: 'auto',
            response_delay: 0,
            created_at: daysAgo(10),
            updated_at: daysAgo(10)
        }
    ];

    const { error: agentError } = await supabaseAdmin.from('instagram_agents').upsert(agents, { onConflict: 'user_email' });
    if (agentError) throw new Error(`Seed instagram_agents failed: ${agentError.message}`);

    const targetEmails = ['admin@example.com', 'user@demo.com'];
    const postsToInsert: any[] = [];
    const dmLogsToInsert: any[] = [];
    const commentsLogsToInsert: any[] = [];

    const mockPostId1 = '18023456789012345';

    targetEmails.forEach((email) => {
        // Seed Scheduled Posts
        postsToInsert.push(
            {
                user_email: email,
                media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600',
                caption: 'Launching our brand new AI Marketing Studio today! 🚀 Create video reels, flyers, and logos in seconds. #AI #Marketing #SaaS',
                scheduled_at: daysAgo(1),
                published_at: daysAgo(1),
                status: 'published',
                created_at: daysAgo(2)
            },
            {
                user_email: email,
                media_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=600',
                caption: 'Automation is the key to scaling your business. See how AI Voice agent handles customer calls 24/7. 📞 #Business #Automation',
                scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'scheduled',
                created_at: daysAgo(0)
            },
            {
                user_email: email,
                media_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600',
                caption: 'Weekly Analytics Update! 📊 Check out your token usage patterns inside the Dashboard.',
                scheduled_at: daysAgo(3),
                status: 'failed',
                error_message: 'Invalid Media URL format (size too large or unsupported format)',
                created_at: daysAgo(4)
            }
        );

        // Seed DM Logs
        dmLogsToInsert.push(
            {
                user_email: email,
                sender_id: 'instagram_user_john',
                sender_username: 'john_design',
                message_text: 'Hey! Is the Website Builder included in the Starter plan, or do I need Pro?',
                reply_text: 'Hi John! The Website Builder is part of our Pro plan ($29/mo), which also includes AI Agents and RAG Document searches. The Starter plan covers basic chat, content writer, and image/code generator tools.',
                tokens_consumed: 15,
                status: 'success',
                created_at: daysAgo(3)
            },
            {
                user_email: email,
                sender_id: 'instagram_user_john',
                sender_username: 'john_design',
                message_text: 'Got it. Can I connect my custom domain to the website I build?',
                reply_text: 'Yes, absolutely! On the Pro and Enterprise plans, you can map your own custom domain directly to your AI-generated website. It serves instantly.',
                tokens_consumed: 14,
                status: 'success',
                created_at: new Date(new Date(daysAgo(3)).getTime() + 10 * 60 * 1000).toISOString()
            },
            {
                user_email: email,
                sender_id: 'instagram_user_lucy',
                sender_username: 'lucy_bakes',
                message_text: 'Hi, I need help with resetting my password. I did not get the OTP email.',
                reply_text: 'Hello Lucy! I apologize for the delay. Please check your spam folder first. If it is still missing, let me know your account email so Alex from our support team can verify your email and assist you manually.',
                tokens_consumed: 18,
                status: 'success',
                created_at: daysAgo(1)
            }
        );

        // Seed Comment Logs
        commentsLogsToInsert.push(
            {
                user_email: email,
                post_id: mockPostId1,
                post_caption: 'Launching our brand new AI Marketing Studio today! 🚀',
                comment_id: 'comment_111',
                commenter_username: 'sam_tech',
                comment_text: 'This is a game changer! Does it support Kling AI for video generation?',
                reply_text: 'Thanks Sam! Yes, it does! The Video Generator utilizes both Kling AI and Grok-Imagine models to produce high-quality cinematic reels. Try it out!',
                tokens_consumed: 16,
                status: 'success',
                created_at: daysAgo(1)
            },
            {
                user_email: email,
                post_id: mockPostId1,
                post_caption: 'Launching our brand new AI Marketing Studio today! 🚀',
                comment_id: 'comment_222',
                commenter_username: 'anna_marketer',
                comment_text: 'Is there a free trial for the marketing studio?',
                reply_text: 'Hi Anna! Yes, our Free tier provides 500 complimentary tokens per month, which you can use to test out the Marketing Studio tools and other features!',
                tokens_consumed: 14,
                status: 'success',
                created_at: new Date(new Date(daysAgo(1)).getTime() + 2 * 60 * 60 * 1000).toISOString()
            }
        );
    });

    const { error: postsError } = await supabaseAdmin.from('instagram_posts').insert(postsToInsert);
    if (postsError) throw new Error(`Seed instagram_posts failed: ${postsError.message}`);

    const { error: dmError } = await supabaseAdmin.from('instagram_dm_logs').insert(dmLogsToInsert);
    if (dmError) throw new Error(`Seed instagram_dm_logs failed: ${dmError.message}`);

    const { error: commentError } = await supabaseAdmin.from('instagram_comments_logs').insert(commentsLogsToInsert);
    if (commentError) throw new Error(`Seed instagram_comments_logs failed: ${commentError.message}`);

    return {
        agents: agents.length,
        posts: postsToInsert.length,
        dms: dmLogsToInsert.length,
        comments: commentsLogsToInsert.length
    };
}


// ============================================================================
// MAIN GET HANDLER
// ============================================================================
export async function GET(request: Request) {
    try {
        const host = request.headers.get('host') || '';
        if (!host.includes('mounikai') && !host.includes('localhost')) {
            return NextResponse.json({ error: 'Only works in the mounikai or localhost domain' }, { status: 401 });
        }

        const startTime = Date.now();

        // ---- STEP 1: Clear all existing data ----
        await truncateAllTables();

        // ---- STEP 2: Seed data in correct FK order ----
        // Users MUST be seeded first — many tables have FK references to users(email)
        const userMap = await seedUsers();                    // 8 users
        await seedUserBalances();                              // 8 balances
        await seedSystemSettings();                            // 1 settings row
        await seedPricingPlans();                              // 4 plans
        await seedSubscriptions();                             // 8 subscriptions
        const paymentCount = await seedPayments(userMap);                           // 20 payments
        const tokenLogCount = await seedTokenLogs();           // ~100+ token logs
        await seedWebsites();                                  // websites
        const ragResult = await seedRAGDocuments();             // real PDF with embeddings
        await seedMeetings();                                  // demo meetings
        await seedAnnouncementBanners();                       // announcement banners
        const marketingResult = await seedMarketingData();     // marketing data (avatars, assets, etc)
        await seedGames();                                     // demo games for game-maker
        const presentationCount = await seedPresentations();    // seed premium presentations
        const voiceCallsResult = await seedVoiceCalls();       // voice agents call logs
        const notificationsResult = await seedNotifications(); // notifications and conversation threads
        const whatsappResult = await seedWhatsAppData();       // whatsapp agent and logs
        const instagramResult = await seedInstagramData();     // instagram agent, posts and logs
        await seedLanguagesAndTranslations();                  // languages + translations (large, runs last)

        const elapsed = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            message: 'Database seeded successfully',
            duration: `${elapsed}ms`,
            summary: {
                users: 8,
                user_balances: 8,
                system_settings: 1,
                pricing_plans: 4,
                subscriptions: 8,
                payments: paymentCount,
                token_logs: tokenLogCount,
                websites: 12,
                presentations: presentationCount,
                documents: ragResult.docCount,
                document_chunks: ragResult.chunkCount,
                languages: 5,
                translations: Object.keys(translationsData).length * 5,
                meetings: 5,
                announcement_banners: 1,
                marketing_avatars: marketingResult.avatars,
                marketing_assets: marketingResult.assets,
                marketing_products: marketingResult.products,
                marketing_tasks: marketingResult.tasks,
                marketing_reels: marketingResult.reels,
                games: 8,
                voice_agent_config: voiceCallsResult.configs,
                voice_calls: voiceCallsResult.calls,
                voice_transcripts: voiceCallsResult.transcripts,
                notifications: notificationsResult.notifications,
                notification_recipients: notificationsResult.recipients,
                notification_messages: notificationsResult.messages,
                whatsapp_agents: whatsappResult.agents,
                whatsapp_logs: whatsappResult.logs,
                instagram_agents: instagramResult.agents,
                instagram_posts: instagramResult.posts,
                instagram_dm_logs: instagramResult.dms,
                instagram_comments_logs: instagramResult.comments,
            },
        });
    } catch (error: any) {
        console.error('Database seed error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Unknown error during seeding',
            },
            { status: 500 }
        );
    }
}

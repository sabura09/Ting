
-- Enable extensions
create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- 1. Users Table (Updated to match db.ts)
create table if not exists users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text,         -- Matches db.ts
  role text default 'user',   -- Matches db.ts
  status text default 'active', -- Matches db.ts
  password text,     -- Matches db.ts
  disabled_features text[] default '{}', -- Matches db.ts
  avatar_url text,
  billing_address jsonb,
  payment_method jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Fix for existing users table if it uses full_name
do $$
begin
    if exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'full_name') then
        alter table users rename column full_name to name;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'name') then
        alter table users add column name text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'role') then
        alter table users add column role text default 'user';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'status') then
        alter table users add column status text default 'active';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'password') then
        alter table users add column password text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'disabled_features') then
        alter table users add column disabled_features text[] default '{}';
    end if;
end $$;

alter table users enable row level security;

-- Password Reset Tokens
create table if not exists reset_tokens (
    id uuid default uuid_generate_v4() primary key,
    email text references users(email) on delete cascade on update cascade,
    otp text not null,
    expires_at timestamptz not null,
    created_at timestamptz default now()
);
alter table reset_tokens enable row level security;



-- 2. System Settings
create table if not exists system_settings (
    id int primary key,
    default_tokens int,
    ai_limits jsonb,
    payment_enabled boolean,
    payment_gateway text default 'stripe',
    stripe_public_key text,
    stripe_secret_key text,
    paypal_client_id text,
    paypal_client_secret text,
    paypal_mode text default 'sandbox',
    flutterwave_public_key text,
    flutterwave_secret_key text,
    flutterwave_encryption_key text,
    flutterwave_webhook_secret text,
    razorpay_key_id text,
    razorpay_key_secret text,
    paystack_secret_key text,
    paystack_currency text default 'NGN',

    site_name text,
    site_url text,
    smtp_config jsonb,
    show_ai_settings boolean default true,
    show_demo_mode boolean default true,
    metadata jsonb,
    updated_at timestamptz default now()
);

-- Fix for existing system_settings table
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'site_name') then
        alter table system_settings add column site_name text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'site_url') then
        alter table system_settings add column site_url text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'smtp_config') then
        alter table system_settings add column smtp_config jsonb;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'updated_at') then
        alter table system_settings add column updated_at timestamptz default now();
    end if;
    -- Payment gateway columns
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'payment_gateway') then
        alter table system_settings add column payment_gateway text default 'stripe';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'paypal_client_id') then
        alter table system_settings add column paypal_client_id text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'paypal_client_secret') then
        alter table system_settings add column paypal_client_secret text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'paypal_mode') then
        alter table system_settings add column paypal_mode text default 'sandbox';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'show_ai_settings') then
        alter table system_settings add column show_ai_settings boolean default true;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'show_demo_mode') then
        alter table system_settings add column show_demo_mode boolean default true;
    else
        alter table system_settings alter column show_demo_mode set default true;
    end if;
    
    -- Ensure the default record has show_demo_mode = true
    update system_settings set show_demo_mode = true where show_demo_mode is null or id = 1;

    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'flutterwave_public_key') then
        alter table system_settings add column flutterwave_public_key text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'flutterwave_secret_key') then
        alter table system_settings add column flutterwave_secret_key text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'flutterwave_encryption_key') then
        alter table system_settings add column flutterwave_encryption_key text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'flutterwave_webhook_secret') then
        alter table system_settings add column flutterwave_webhook_secret text;
    end if;
    -- Razorpay gateway columns
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'razorpay_key_id') then
        alter table system_settings add column razorpay_key_id text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'razorpay_key_secret') then
        alter table system_settings add column razorpay_key_secret text;
    end if;
    -- Paystack gateway columns
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'paystack_secret_key') then
        alter table system_settings add column paystack_secret_key text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'system_settings' and column_name = 'paystack_currency') then
        alter table system_settings add column paystack_currency text default 'NGN';
    end if;


end $$;

alter table system_settings enable row level security;

-- 3. User Balances
create table if not exists user_balances (
    email text primary key references users(email) on delete cascade on update cascade,
    balance int default 0,
    updated_at timestamptz default now()
);

-- Trigger to initialize user balance
create or replace function handle_new_user_balance()
returns trigger as $$
declare
    v_default_tokens int;
begin
    -- Try to get default tokens from system_settings
    select default_tokens into v_default_tokens from system_settings where id = 1;
    
    -- Fallback to 1000 if not found or null
    if v_default_tokens is null then
        v_default_tokens := 1000;
    end if;
    
    insert into user_balances (email, balance)
    values (new.email, v_default_tokens)
    on conflict (email) do nothing;
    
    return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists to avoid errors on re-run
drop trigger if exists on_user_created_balance on users;

create trigger on_user_created_balance
    after insert on users
    for each row execute procedure handle_new_user_balance();

-- Backfill missing balances for existing users
insert into user_balances (email, balance)
select email, coalesce((select default_tokens from system_settings where id = 1), 1000)
from users 
where email not in (select email from user_balances)
on conflict (email) do nothing;

alter table user_balances enable row level security;

-- 4. Token Logs
create table if not exists token_logs (
    id uuid default uuid_generate_v4() primary key,
    email text references users(email) on delete cascade on update cascade,
    amount int,
    action text,
    feature text,
    model text,
    timestamp timestamptz default now()
);

-- Fix for existing token_logs table
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'token_logs' and column_name = 'model') then
        alter table token_logs add column model text;
    end if;
end $$;

alter table token_logs enable row level security;

-- 5. Pricing Plans
create table if not exists pricing_plans (
    id text primary key,
    name text,
    price int,
    tokens int,
    interval text,
    features text[],
    ai_tools text[] default '{}',
    is_active boolean,
    description text,
    popular boolean default false,
    cta text
);

-- Fix for existing pricing_plans table
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'pricing_plans' and column_name = 'ai_tools') then
        alter table pricing_plans add column ai_tools text[] default '{}';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'pricing_plans' and column_name = 'description') then
        alter table pricing_plans add column description text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'pricing_plans' and column_name = 'popular') then
        alter table pricing_plans add column popular boolean default false;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'pricing_plans' and column_name = 'cta') then
        alter table pricing_plans add column cta text;
    end if;
end $$;

alter table pricing_plans enable row level security;

-- 6. Payments
create table if not exists payments (
    id text primary key,
    user_id uuid references users(id) on delete set null,
    user_email text references users(email) on delete set null on update cascade,
    plan_id text references pricing_plans(id) on delete set null,
    amount int,
    status text,
    payment_gateway text default 'stripe',
    created_at timestamptz default now()
);

-- Fix for existing payments table
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'payments' and column_name = 'payment_gateway') then
        alter table payments add column payment_gateway text default 'stripe';
    end if;

    -- Update constraints for existing payments table
    alter table payments drop constraint if exists payments_plan_id_fkey;
    alter table payments add constraint payments_plan_id_fkey foreign key (plan_id) references pricing_plans(id) on delete set null;
    
    alter table payments drop constraint if exists payments_user_id_fkey;
    alter table payments add constraint payments_user_id_fkey foreign key (user_id) references users(id) on delete set null;

    alter table payments drop constraint if exists payments_user_email_fkey;
    alter table payments add constraint payments_user_email_fkey foreign key (user_email) references users(email) on delete set null on update cascade;
end $$;

alter table payments enable row level security;

-- 7. Subscriptions (referenced in getUserPlan)
create table if not exists subscriptions (
    id text primary key,
    user_email text references users(email) on delete cascade on update cascade,
    plan_id text references pricing_plans(id) on delete cascade,
    status text,
    gateway text,
    created_at timestamptz default now()
);
alter table subscriptions enable row level security;

-- Fix for existing subscriptions constraints
do $$
begin
    alter table subscriptions drop constraint if exists subscriptions_plan_id_fkey;
    alter table subscriptions add constraint subscriptions_plan_id_fkey foreign key (plan_id) references pricing_plans(id) on delete cascade;
    
    alter table subscriptions drop constraint if exists subscriptions_user_email_fkey;
    alter table subscriptions add constraint subscriptions_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;

    if not exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'gateway') then
        alter table subscriptions add column gateway text;
    end if;
end $$;

-- 8. Websites
create table if not exists websites (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    name text,
    code text,
    subdomain text unique,
    messages jsonb,
    preview_image text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Fix for existing websites table
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'websites' and column_name = 'subdomain') then
        alter table websites add column subdomain text unique;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'websites' and column_name = 'user_email') then
        -- Add user_email column
        alter table websites add column user_email text;
        
        -- Try to populate user_email from user_id if it exists
        if exists (select 1 from information_schema.columns where table_name = 'websites' and column_name = 'user_id') then
            update websites w set user_email = u.email from users u where w.user_id = u.id;
        end if;
        
        -- Add foreign key
        alter table websites add constraint websites_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;
    else
        -- Ensure update cascade is active
        alter table websites drop constraint if exists websites_user_email_fkey;
        alter table websites add constraint websites_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;
    end if;

    -- Drop old user_id and its constraint if they exist
    if exists (select 1 from information_schema.columns where table_name = 'websites' and column_name = 'user_id') then
        -- We don't drop it immediately to avoid data loss if migration fails, 
        -- but for this project's style we can be bold or just leave it.
        -- Let's drop the constraint at least to stop the error.
        alter table websites drop constraint if exists websites_user_id_fkey;
    end if;
end $$;

alter table websites enable row level security;



-- 9. Documents (RAG)
create table if not exists documents (
  id uuid default uuid_generate_v4() primary key,
  user_email text references users(email) on delete cascade on update cascade,
  name text not null,
  status text not null check (status in ('processing', 'completed', 'error')) default 'processing',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_documents_user on documents(user_email);
alter table documents enable row level security;

-- 10. Document Chunks (RAG)
create table if not exists document_chunks (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references documents(id) on delete cascade,
  content text,
  embedding vector(768),
  fts tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz default now()
);

-- Ensure columns exist for older installations
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name='document_chunks' and column_name='fts') then
    alter table document_chunks add column fts tsvector generated always as (to_tsvector('english', content)) stored;
  end if;
end $$;

create index if not exists idx_document_chunks_fts on document_chunks using gin(fts);
drop index if exists idx_document_chunks_embedding;
create index if not exists idx_document_chunks_embedding on document_chunks using hnsw (embedding vector_cosine_ops);
alter table document_chunks enable row level security;


-- 11. Languages (i18n)
create table if not exists languages (
    id uuid default uuid_generate_v4() primary key,
    code text unique not null,
    name text not null,
    direction text default 'ltr' check (direction in ('ltr', 'rtl')),
    is_enabled boolean default true,
    created_at timestamptz default now()
);
alter table languages enable row level security;

-- 12. Translations (i18n)
create table if not exists translations (
    id uuid default uuid_generate_v4() primary key,
    translation_key text not null,
    language_code text references languages(code) on delete cascade,
    value text not null default '',
    updated_at timestamptz default now(),
    unique(translation_key, language_code)
);
create index if not exists idx_translations_key on translations(translation_key);
create index if not exists idx_translations_lang on translations(language_code);
alter table translations enable row level security;

-- RLS Policies for i18n tables (allow service role full access)
do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'languages' and policyname = 'Allow full access on languages') then
        create policy "Allow full access on languages" on languages for all using (true) with check (true);
    end if;
    if not exists (select 1 from pg_policies where tablename = 'translations' and policyname = 'Allow full access on translations') then
        create policy "Allow full access on translations" on translations for all using (true) with check (true);
    end if;
end $$;



-- 13. Matching Function
create or replace function match_document_chunks(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_email text
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query
    select
      dc.id,
      dc.document_id,
      dc.content,
      (1 - (dc.embedding <=> query_embedding))::float as similarity
    from document_chunks dc
    join documents d on d.id = dc.document_id
    where LOWER(d.user_email) = LOWER(p_user_email)
      and (1 - (dc.embedding <=> query_embedding)) > match_threshold
    order by dc.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- Keyword search fallback
create or replace function keyword_search_chunks(
  query_text text,
  match_count int,
  p_user_email text
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query(
    select
      dc.id,
      dc.document_id,
      dc.content,
      ts_rank(dc.fts, websearch_to_tsquery('english', query_text)) as similarity
    from document_chunks dc
    join documents d on d.id = dc.document_id
    where LOWER(d.user_email) = LOWER(p_user_email)
    and dc.fts @@ websearch_to_tsquery('english', query_text)
    order by similarity desc
    limit match_count
  );
end;
$$;

-- 14. Meetings (AI Meeting - Real-time Video/Chat)
create table if not exists meetings (
    id text primary key,
    title text not null default 'Untitled Meeting',
    host_email text references users(email) on delete set null on update cascade,
    status text default 'active' check (status in ('active', 'ended')),
    max_participants int default 8,
    created_at timestamptz default now(),
    ended_at timestamptz
);
create index if not exists idx_meetings_host on meetings(host_email);
create index if not exists idx_meetings_status on meetings(status);
alter table meetings enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'meetings' and policyname = 'Allow full access on meetings') then
        create policy "Allow full access on meetings" on meetings for all using (true) with check (true);
    end if;
end $$;

-- 15. Announcement Banners
create table if not exists announcement_banners (
    id uuid default uuid_generate_v4() primary key,
    message text not null,
    start_date timestamptz not null,
    end_date timestamptz not null,
    bg_gradient text, -- CSS gradient string
    text_color text default '#ffffff',
    is_enabled boolean default true,
    is_dismissible boolean default true,
    button_text text,
    button_link text,
    priority int default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table announcement_banners enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'announcement_banners' and policyname = 'Allow full access on announcement_banners') then
        create policy "Allow full access on announcement_banners" on announcement_banners for all using (true) with check (true);
    end if;
end $$;
-- 16. AI Marketing Tables
create table if not exists marketing_avatars (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    name text not null,
    image_url text not null,
    type text default 'generated', -- 'generated' or 'uploaded'
    created_at timestamptz default now()
);
create index if not exists idx_marketing_avatars_user on marketing_avatars(user_email);
alter table marketing_avatars enable row level security;

create table if not exists marketing_assets (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    type text not null check (type in ('image', 'video', 'avatar', 'text', 'music', 'logo', 'thumbnail', 'manga', 'reel', 'flyer', 'business-card', 'brochure')),
    url text, -- For images/videos
    content text, -- For ad copy/social posts
    prompt text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);
create index if not exists idx_marketing_assets_user on marketing_assets(user_email);
alter table marketing_assets enable row level security;

create table if not exists marketing_tasks (
    id uuid default uuid_generate_v4() primary key,
    task_id text unique not null,
    user_email text references users(email) on delete cascade on update cascade,
    type text not null,
    status text default 'processing' check (status in ('processing', 'success', 'failed')),
    result_url text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_marketing_tasks_user on marketing_tasks(user_email);
create index if not exists idx_marketing_tasks_id on marketing_tasks(task_id);
alter table marketing_tasks enable row level security;

-- RLS Policies for Marketing Tables
do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'marketing_avatars' and policyname = 'Allow user access on marketing_avatars') then
        create policy "Allow user access on marketing_avatars" on marketing_avatars for all using (true) with check (true);
    end if;
    if not exists (select 1 from pg_policies where tablename = 'marketing_assets' and policyname = 'Allow user access on marketing_assets') then
        create policy "Allow user access on marketing_assets" on marketing_assets for all using (true) with check (true);
    end if;
    if not exists (select 1 from pg_policies where tablename = 'marketing_tasks' and policyname = 'Allow user access on marketing_tasks') then
        create policy "Allow user access on marketing_tasks" on marketing_tasks for all using (true) with check (true);
    end if;

    -- Update marketing_assets type check constraint for existing tables
    alter table marketing_assets drop constraint if exists marketing_assets_type_check;
    alter table marketing_assets add constraint marketing_assets_type_check check (type in ('image', 'video', 'avatar', 'text', 'music', 'logo', 'thumbnail', 'manga', 'reel', 'flyer', 'business-card', 'brochure'));
end $$;

-- 17. AI Marketing Reels
create table if not exists marketing_reels (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    prompt text not null,
    script jsonb, -- [{scene: 1, text: "...", image_prompt: "...", voiceover_url: "...", video_url: "..."}]
    voiceover_url text,
    music_url text,
    status text default 'draft' check (status in ('draft', 'processing', 'success', 'failed')),
    result_url text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_marketing_reels_user on marketing_reels(user_email);
alter table marketing_reels enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'marketing_reels' and policyname = 'Allow user access on marketing_reels') then
        create policy "Allow user access on marketing_reels" on marketing_reels for all using (true) with check (true);
    end if;
end $$;

-- 18. AI Marketing Products
create table if not exists marketing_products (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    name text not null,
    image_url text not null,
    created_at timestamptz default now()
);
create index if not exists idx_marketing_products_user on marketing_products(user_email);
alter table marketing_products enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'marketing_products' and policyname = 'Allow user access on marketing_products') then
        create policy "Allow user access on marketing_products" on marketing_products for all using (true) with check (true);
    end if;
end $$;

-- 18. Games
create table if not exists games (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    name text,
    code text,
    prompt text,
    genre text,
    visual_style text,
    preview_image text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Ensure column prompt exists if the table already existed (for robustness)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'games' and column_name = 'prompt') then
        alter table games add column prompt text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'games' and column_name = 'genre') then
        alter table games add column genre text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'games' and column_name = 'visual_style') then
        alter table games add column visual_style text;
    end if;
end $$;

alter table games enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'games' and policyname = 'Allow user access on games') then
        create policy "Allow user access on games" on games for all using (true) with check (true);
    end if;
end $$;

-- 19. Voice Agent Config
create table if not exists voice_agent_config (
    id uuid default uuid_generate_v4() primary key,
    user_email text unique references users(email) on delete cascade on update cascade,
    agent_name text not null default 'Nova',
    personality text default 'Professional, warm, and helpful.',
    system_prompt text,
    greeting_message text default 'Hello! I''m Nova, your AI assistant. How can I help you today?',
    language text default 'en-US',
    voice_id text default 'Polly.Joanna-Neural',
    call_objective text default 'General purpose AI phone assistant',
    max_call_duration int default 600,
    silence_timeout int default 5,
    end_call_phrases text[] default '{"goodbye","bye","end call","hang up","that is all"}',
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_voice_agent_config_user on voice_agent_config(user_email);
alter table voice_agent_config enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'voice_agent_config' and policyname = 'Allow full access on voice_agent_config') then
        create policy "Allow full access on voice_agent_config" on voice_agent_config for all using (true) with check (true);
    end if;
end $$;

-- 20. Voice Calls
create table if not exists voice_calls (
    id uuid default uuid_generate_v4() primary key,
    call_sid text unique not null,
    user_email text references users(email) on delete set null on update cascade,
    direction text not null check (direction in ('inbound', 'outbound')),
    from_number text,
    to_number text,
    status text default 'ringing' check (status in ('queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled')),
    duration int default 0,
    agent_config_id uuid references voice_agent_config(id) on delete set null,
    started_at timestamptz,
    ended_at timestamptz,
    created_at timestamptz default now()
);
create index if not exists idx_voice_calls_sid on voice_calls(call_sid);
create index if not exists idx_voice_calls_user on voice_calls(user_email);
create index if not exists idx_voice_calls_status on voice_calls(status);
alter table voice_calls enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'voice_calls' and policyname = 'Allow full access on voice_calls') then
        create policy "Allow full access on voice_calls" on voice_calls for all using (true) with check (true);
    end if;
end $$;

-- Fix check constraint on voice_calls for older installations
do $$
begin
    alter table voice_calls drop constraint if exists voice_calls_status_check;
    alter table voice_calls add constraint voice_calls_status_check check (status in ('queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled'));
exception
    when others then
        null;
end $$;

-- 21. Voice Transcripts
create table if not exists voice_transcripts (
    id uuid default uuid_generate_v4() primary key,
    call_id uuid references voice_calls(id) on delete cascade,
    role text not null check (role in ('caller', 'agent')),
    content text not null,
    timestamp timestamptz default now()
);
create index if not exists idx_voice_transcripts_call on voice_transcripts(call_id);
alter table voice_transcripts enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'voice_transcripts' and policyname = 'Allow full access on voice_transcripts') then
        create policy "Allow full access on voice_transcripts" on voice_transcripts for all using (true) with check (true);
    end if;
end $$;

-- 22. Browser Control default token limit
UPDATE system_settings 
SET ai_limits = COALESCE(ai_limits, '{}'::jsonb) || '{"browser-control": 25}'::jsonb 
WHERE id = 1;

-- 23. Add migration and update block for ON UPDATE CASCADE constraints
do $$
begin
    -- 1. Alter constraints for reset_tokens
    alter table reset_tokens drop constraint if exists reset_tokens_email_fkey;
    alter table reset_tokens add constraint reset_tokens_email_fkey foreign key (email) references users(email) on delete cascade on update cascade;

    -- 2. Alter constraints for user_balances
    alter table user_balances drop constraint if exists user_balances_email_fkey;
    alter table user_balances add constraint user_balances_email_fkey foreign key (email) references users(email) on delete cascade on update cascade;

    -- 3. Alter constraints for token_logs
    alter table token_logs drop constraint if exists token_logs_email_fkey;
    alter table token_logs add constraint token_logs_email_fkey foreign key (email) references users(email) on delete cascade on update cascade;

    -- 4. Alter constraints for payments
    alter table payments drop constraint if exists payments_user_email_fkey;
    alter table payments add constraint payments_user_email_fkey foreign key (user_email) references users(email) on delete set null on update cascade;

    -- 5. Alter constraints for subscriptions
    alter table subscriptions drop constraint if exists subscriptions_user_email_fkey;
    alter table subscriptions add constraint subscriptions_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;

    -- 6. Alter constraints for websites
    alter table websites drop constraint if exists websites_user_email_fkey;
    alter table websites add constraint websites_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;

    -- 7. Alter constraints for documents
    alter table documents drop constraint if exists documents_user_email_fkey;
    alter table documents add constraint documents_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;

    -- 8. Alter constraints for meetings
    alter table meetings drop constraint if exists meetings_host_email_fkey;
    alter table meetings add constraint meetings_host_email_fkey foreign key (host_email) references users(email) on delete set null on update cascade;

    -- 9. Alter constraints for marketing_avatars
    alter table marketing_avatars drop constraint if exists marketing_avatars_user_email_fkey;
    alter table marketing_avatars add constraint marketing_avatars_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;

    -- 10. Alter constraints for marketing_assets
    alter table marketing_assets drop constraint if exists marketing_assets_user_email_fkey;
    alter table marketing_assets add constraint marketing_assets_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;

    -- 11. Alter constraints for marketing_tasks
    alter table marketing_tasks drop constraint if exists marketing_tasks_user_email_fkey;
    alter table marketing_tasks add constraint marketing_tasks_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;

    -- 12. Alter constraints for marketing_reels
    alter table marketing_reels drop constraint if exists marketing_reels_user_email_fkey;
    alter table marketing_reels add constraint marketing_reels_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;

    -- 13. Alter constraints for marketing_products
    alter table marketing_products drop constraint if exists marketing_products_user_email_fkey;
    alter table marketing_products add constraint marketing_products_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;

    -- 14. Alter constraints for games
    alter table games drop constraint if exists games_user_email_fkey;
    alter table games add constraint games_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;

    -- 15. Alter constraints for voice_agent_config
    alter table voice_agent_config drop constraint if exists voice_agent_config_user_email_fkey;
    alter table voice_agent_config add constraint voice_agent_config_user_email_fkey foreign key (user_email) references users(email) on delete cascade on update cascade;

    -- 16. Alter constraints for voice_calls
    alter table voice_calls drop constraint if exists voice_calls_user_email_fkey;
    alter table voice_calls add constraint voice_calls_user_email_fkey foreign key (user_email) references users(email) on delete set null on update cascade;

    -- 17. Update all user emails to lowercase (this will cascade to all child tables)
    update users set email = lower(email) where email != lower(email);

exception
    when others then
        raise notice 'Error migrating constraints to ON UPDATE CASCADE: %', sqlerrm;
end $$;

-- 24. Custom Domains
create table if not exists custom_domains (
    id uuid default uuid_generate_v4() primary key,
    domain text unique not null,
    website_id uuid references websites(id) on delete cascade,
    status text default 'pending' check (status in ('pending', 'active', 'failed')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_custom_domains_domain on custom_domains(domain);
create index if not exists idx_custom_domains_website on custom_domains(website_id);
alter table custom_domains enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'custom_domains' and policyname = 'Allow full access on custom_domains') then
        create policy "Allow full access on custom_domains" on custom_domains for all using (true) with check (true);
    end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 24. Two-Factor Authentication & Email Verification
-- ═══════════════════════════════════════════════════════════════════════════

-- Add 2FA and email verification columns to users table
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'two_factor_secret') then
        alter table users add column two_factor_secret text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'two_factor_enabled') then
        alter table users add column two_factor_enabled boolean default false;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'email_verified') then
        -- Default true so existing users are not locked out
        alter table users add column email_verified boolean default true;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'email_verification_token') then
        alter table users add column email_verification_token text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'email_verification_expires_at') then
        alter table users add column email_verification_expires_at timestamptz;
    end if;
end $$;

-- 2FA Recovery Codes
create table if not exists two_factor_recovery_codes (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    code text not null,
    used boolean default false,
    created_at timestamptz default now()
);
create index if not exists idx_2fa_recovery_user on two_factor_recovery_codes(user_email);
alter table two_factor_recovery_codes enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'two_factor_recovery_codes' and policyname = 'Allow full access on two_factor_recovery_codes') then
        create policy "Allow full access on two_factor_recovery_codes" on two_factor_recovery_codes for all using (true) with check (true);
    end if;
end $$;

-- 2FA Audit Log
create table if not exists two_factor_audit_log (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    action text not null,
    ip_address text,
    user_agent text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);
create index if not exists idx_2fa_audit_user on two_factor_audit_log(user_email);
create index if not exists idx_2fa_audit_action on two_factor_audit_log(action);
alter table two_factor_audit_log enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'two_factor_audit_log' and policyname = 'Allow full access on two_factor_audit_log') then
        create policy "Allow full access on two_factor_audit_log" on two_factor_audit_log for all using (true) with check (true);
    end if;
end $$;

-- Login Attempts (brute-force tracking)
create table if not exists login_attempts (
    id uuid default uuid_generate_v4() primary key,
    email text,
    ip_address text,
    success boolean default false,
    created_at timestamptz default now()
);
create index if not exists idx_login_attempts_email on login_attempts(email);
create index if not exists idx_login_attempts_ip on login_attempts(ip_address);
create index if not exists idx_login_attempts_created on login_attempts(created_at);
alter table login_attempts enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'login_attempts' and policyname = 'Allow full access on login_attempts') then
        create policy "Allow full access on login_attempts" on login_attempts for all using (true) with check (true);
    end if;
end $$;

-- Cleanup old login attempts (keep last 30 days)
delete from login_attempts where created_at < now() - interval '30 days';

-- ═══════════════════════════════════════════════════════════════════════════
-- 25. Webhook Events (Idempotency Tracking)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists webhook_events (
    event_id text primary key,
    gateway text not null,
    event_type text not null,
    status text default 'processed',
    created_at timestamptz default now()
);

alter table webhook_events enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'webhook_events' and policyname = 'Allow full access on webhook_events') then
        create policy "Allow full access on webhook_events" on webhook_events for all using (true) with check (true);
    end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 26. Push Notifications & Messaging System
-- ═══════════════════════════════════════════════════════════════════════════

-- Notifications (admin-created notifications)
create table if not exists notifications (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    content text not null,
    description text,
    severity text default 'info' check (severity in ('info', 'success', 'warning', 'error')),
    icon text default 'info',
    icon_url text,
    is_global boolean default false,
    is_pinned boolean default false,
    allow_replies boolean default true,
    created_by text references users(email) on delete set null on update cascade,
    scheduled_at timestamptz,
    expires_at timestamptz,
    status text default 'draft' check (status in ('draft', 'sent', 'scheduled')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_notifications_status on notifications(status);
create index if not exists idx_notifications_created_by on notifications(created_by);
create index if not exists idx_notifications_scheduled on notifications(scheduled_at) where status = 'scheduled';
alter table notifications enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'Allow full access on notifications') then
        create policy "Allow full access on notifications" on notifications for all using (true) with check (true);
    end if;
end $$;

-- Notification Recipients (per-user delivery and read tracking)
create table if not exists notification_recipients (
    id uuid default uuid_generate_v4() primary key,
    notification_id uuid references notifications(id) on delete cascade,
    user_email text references users(email) on delete cascade on update cascade,
    is_read boolean default false,
    is_deleted boolean default false,
    read_at timestamptz,
    created_at timestamptz default now(),
    unique(notification_id, user_email)
);

create index if not exists idx_notification_recipients_user on notification_recipients(user_email);
create index if not exists idx_notification_recipients_notification on notification_recipients(notification_id);
create index if not exists idx_notification_recipients_unread on notification_recipients(user_email) where is_read = false and is_deleted = false;
alter table notification_recipients enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'notification_recipients' and policyname = 'Allow full access on notification_recipients') then
        create policy "Allow full access on notification_recipients" on notification_recipients for all using (true) with check (true);
    end if;
end $$;

-- Notification Messages (two-way conversation threads)
create table if not exists notification_messages (
    id uuid default uuid_generate_v4() primary key,
    notification_id uuid references notifications(id) on delete cascade,
    sender_email text references users(email) on delete set null on update cascade,
    sender_role text default 'user' check (sender_role in ('admin', 'user')),
    message text not null,
    is_read boolean default false,
    created_at timestamptz default now()
);

create index if not exists idx_notification_messages_notification on notification_messages(notification_id);
create index if not exists idx_notification_messages_sender on notification_messages(sender_email);
alter table notification_messages enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'notification_messages' and policyname = 'Allow full access on notification_messages') then
        create policy "Allow full access on notification_messages" on notification_messages for all using (true) with check (true);
    end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 27. Trading Watchlists
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists trading_watchlists (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    name text not null default 'My Watchlist',
    symbols jsonb default '[]'::jsonb,
    is_default boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_watchlists_user on trading_watchlists(user_email);
alter table trading_watchlists enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'trading_watchlists' and policyname = 'Allow full access on trading_watchlists') then
        create policy "Allow full access on trading_watchlists" on trading_watchlists for all using (true) with check (true);
    end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 28. Trading Signals History
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists trading_signals (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    symbol text not null,
    market_type text not null check (market_type in ('stock', 'crypto', 'forex')),
    direction text not null check (direction in ('BUY', 'SELL', 'HOLD')),
    confidence int check (confidence between 0 and 100),
    entry_price decimal(20, 8),
    stop_loss decimal(20, 8),
    take_profit decimal(20, 8),
    timeframe text,
    strategy text,
    reasoning text,
    status text default 'active' check (status in ('active', 'hit_tp', 'hit_sl', 'expired', 'cancelled')),
    result_pnl decimal(20, 8),
    created_at timestamptz default now(),
    resolved_at timestamptz
);
create index if not exists idx_signals_user on trading_signals(user_email);
create index if not exists idx_signals_symbol on trading_signals(symbol);
create index if not exists idx_signals_status on trading_signals(status);
alter table trading_signals enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'trading_signals' and policyname = 'Allow full access on trading_signals') then
        create policy "Allow full access on trading_signals" on trading_signals for all using (true) with check (true);
    end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 29. Trading Alerts
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists trading_alerts (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    symbol text not null,
    market_type text not null,
    condition text not null check (condition in ('price_above', 'price_below', 'rsi_above', 'rsi_below', 'macd_cross', 'ema_cross', 'volume_spike')),
    threshold decimal(20, 8),
    is_triggered boolean default false,
    is_active boolean default true,
    triggered_at timestamptz,
    created_at timestamptz default now()
);
create index if not exists idx_alerts_user on trading_alerts(user_email);
create index if not exists idx_alerts_active on trading_alerts(is_active) where is_active = true;
alter table trading_alerts enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'trading_alerts' and policyname = 'Allow full access on trading_alerts') then
        create policy "Allow full access on trading_alerts" on trading_alerts for all using (true) with check (true);
    end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 30. Trading Portfolio (Paper Trading)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists trading_portfolio (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    symbol text not null,
    market_type text not null,
    quantity decimal(20, 8) not null,
    avg_entry_price decimal(20, 8) not null,
    current_value decimal(20, 8),
    pnl decimal(20, 8),
    pnl_percent decimal(10, 4),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_portfolio_user on trading_portfolio(user_email);
alter table trading_portfolio enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'trading_portfolio' and policyname = 'Allow full access on trading_portfolio') then
        create policy "Allow full access on trading_portfolio" on trading_portfolio for all using (true) with check (true);
    end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 31. Presentations (PPT Playground)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists presentations (
    id uuid default uuid_generate_v4() primary key,
    user_email text references users(email) on delete cascade on update cascade,
    name text,
    slides jsonb,
    messages jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index if not exists idx_presentations_user on presentations(user_email);
alter table presentations enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'presentations' and policyname = 'Allow full access on presentations') then
        create policy "Allow full access on presentations" on presentations for all using (true) with check (true);
    end if;
end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 32. WhatsApp AI Auto-Responder
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists whatsapp_agents (
    id uuid default uuid_generate_v4() primary key,
    user_email text not null unique references users(email) on delete cascade on update cascade,
    is_active boolean default false,
    phone_number text,
    reply_target text default 'all' check (reply_target in ('all', 'select')),
    target_numbers text[] default '{}',
    system_prompt text default 'You are a helpful and friendly AI assistant.',
    model_id text default 'gemini-2.5-flash',
    tone text default 'friendly',
    personality text default 'professional',
    reply_behavior text default 'auto',
    response_delay int default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Ensure columns exist if the table already existed (for robustness)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'whatsapp_agents' and column_name = 'phone_number') then
        alter table whatsapp_agents add column phone_number text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'whatsapp_agents' and column_name = 'tone') then
        alter table whatsapp_agents add column tone text default 'friendly';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'whatsapp_agents' and column_name = 'personality') then
        alter table whatsapp_agents add column personality text default 'professional';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'whatsapp_agents' and column_name = 'reply_behavior') then
        alter table whatsapp_agents add column reply_behavior text default 'auto';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'whatsapp_agents' and column_name = 'response_delay') then
        alter table whatsapp_agents add column response_delay int default 0;
    end if;
end $$;
create index if not exists idx_whatsapp_agents_email on whatsapp_agents(user_email);
alter table whatsapp_agents enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'whatsapp_agents' and policyname = 'Allow full access on whatsapp_agents') then
        create policy "Allow full access on whatsapp_agents" on whatsapp_agents for all using (true) with check (true);
    end if;
end $$;

create table if not exists whatsapp_sessions (
    id uuid default uuid_generate_v4() primary key,
    user_email text not null unique references users(email) on delete cascade on update cascade,
    creds_data text not null,
    keys_data text,
    updated_at timestamptz default now()
);
create index if not exists idx_whatsapp_sessions_email on whatsapp_sessions(user_email);
alter table whatsapp_sessions enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'whatsapp_sessions' and policyname = 'Allow full access on whatsapp_sessions') then
        create policy "Allow full access on whatsapp_sessions" on whatsapp_sessions for all using (true) with check (true);
    end if;
end $$;

create table if not exists whatsapp_logs (
    id uuid default uuid_generate_v4() primary key,
    user_email text not null references users(email) on delete cascade on update cascade,
    sender_number text not null,
    sender_name text,
    message_text text,
    reply_text text,
    tokens_consumed int default 0,
    status text default 'success',
    error_message text,
    created_at timestamptz default now()
);
create index if not exists idx_whatsapp_logs_user on whatsapp_logs(user_email);
alter table whatsapp_logs enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'whatsapp_logs' and policyname = 'Allow full access on whatsapp_logs') then
        create policy "Allow full access on whatsapp_logs" on whatsapp_logs for all using (true) with check (true);
    end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 33. Instagram AI Automation & Post Scheduler
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists instagram_agents (
    id uuid default uuid_generate_v4() primary key,
    user_email text not null unique references users(email) on delete cascade on update cascade,
    is_active boolean default false,
    instagram_business_account_id text,
    page_access_token text,
    username text default 'mock_instagram_user',
    system_prompt text default 'You are a helpful and friendly AI assistant for Instagram.',
    model_id text default 'gemini-2.5-flash',
    tone text default 'friendly',
    personality text default 'professional',
    dm_reply_behavior text default 'auto' check (dm_reply_behavior in ('auto', 'manual')),
    comment_reply_behavior text default 'auto' check (comment_reply_behavior in ('auto', 'manual')),
    response_delay int default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Check for column existence in case of incremental updates
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'instagram_agents' and column_name = 'username') then
        alter table instagram_agents add column username text default 'mock_instagram_user';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'instagram_agents' and column_name = 'dm_reply_behavior') then
        alter table instagram_agents add column dm_reply_behavior text default 'auto';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'instagram_agents' and column_name = 'comment_reply_behavior') then
        alter table instagram_agents add column comment_reply_behavior text default 'auto';
    end if;
end $$;

create index if not exists idx_instagram_agents_email on instagram_agents(user_email);
alter table instagram_agents enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'instagram_agents' and policyname = 'Allow full access on instagram_agents') then
        create policy "Allow full access on instagram_agents" on instagram_agents for all using (true) with check (true);
    end if;
end $$;

create table if not exists instagram_posts (
    id uuid default uuid_generate_v4() primary key,
    user_email text not null references users(email) on delete cascade on update cascade,
    media_url text not null,
    caption text,
    scheduled_at timestamptz not null,
    published_at timestamptz,
    status text default 'scheduled' check (status in ('scheduled', 'published', 'failed')),
    error_message text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_instagram_posts_user on instagram_posts(user_email);
create index if not exists idx_instagram_posts_status on instagram_posts(status);
alter table instagram_posts enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'instagram_posts' and policyname = 'Allow full access on instagram_posts') then
        create policy "Allow full access on instagram_posts" on instagram_posts for all using (true) with check (true);
    end if;
end $$;

create table if not exists instagram_dm_logs (
    id uuid default uuid_generate_v4() primary key,
    user_email text not null references users(email) on delete cascade on update cascade,
    sender_id text not null,
    sender_username text not null,
    message_text text not null,
    reply_text text,
    tokens_consumed int default 0,
    status text default 'success' check (status in ('success', 'failed')),
    error_message text,
    created_at timestamptz default now()
);

create index if not exists idx_instagram_dm_logs_user on instagram_dm_logs(user_email);
alter table instagram_dm_logs enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'instagram_dm_logs' and policyname = 'Allow full access on instagram_dm_logs') then
        create policy "Allow full access on instagram_dm_logs" on instagram_dm_logs for all using (true) with check (true);
    end if;
end $$;

create table if not exists instagram_comments_logs (
    id uuid default uuid_generate_v4() primary key,
    user_email text not null references users(email) on delete cascade on update cascade,
    post_id text not null,
    post_caption text,
    comment_id text not null,
    commenter_username text not null,
    comment_text text not null,
    reply_text text,
    tokens_consumed int default 0,
    status text default 'success' check (status in ('success', 'failed')),
    error_message text,
    created_at timestamptz default now()
);

create index if not exists idx_instagram_comments_logs_user on instagram_comments_logs(user_email);
alter table instagram_comments_logs enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'instagram_comments_logs' and policyname = 'Allow full access on instagram_comments_logs') then
        create policy "Allow full access on instagram_comments_logs" on instagram_comments_logs for all using (true) with check (true);
    end if;
end $$;



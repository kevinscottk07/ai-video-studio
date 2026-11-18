-- AI Video Studio Database Schema
-- This migration creates the initial database structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE project_status AS ENUM ('draft', 'generating', 'completed', 'failed');
CREATE TYPE video_resolution AS ENUM ('standard', 'hd', 'ultra');
CREATE TYPE video_style AS ENUM ('cinematic', 'advertisement', 'social_media', 'educational', 'vr');
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed', 'canceled');
CREATE TYPE operation_type AS ENUM ('script_generation', 'video_generation', 'music_generation', 'voiceover_generation', 'video_editing');
CREATE TYPE transaction_type AS ENUM ('purchase', 'deduction', 'refund', 'subscription_grant');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'unpaid');
CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'pro', 'ultra');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    auth_provider_id VARCHAR(255) UNIQUE NOT NULL, -- Auth0 or Firebase ID
    display_name VARCHAR(255) NOT NULL,
    profile_image TEXT,
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    credit_balance INTEGER DEFAULT 0,
    total_credits_ever INTEGER DEFAULT 0,
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Subscription plans table (reference data)
CREATE TABLE subscription_plans (
    id subscription_plan PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price INTEGER NOT NULL, -- in cents
    interval VARCHAR(20) DEFAULT 'month',
    credits_included INTEGER DEFAULT 0,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id subscription_plan NOT NULL REFERENCES subscription_plans(id),
    payment_processor_id VARCHAR(255), -- LemonSqueezy/Paddle subscription ID
    status subscription_status DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    credits_included INTEGER DEFAULT 0,
    credits_used_this_period INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL, -- can be negative for deductions
    description TEXT NOT NULL,
    operation_id UUID, -- Link to generation job if applicable
    aws_cost_covered DECIMAL(10,4), -- AWS cost this transaction covered
    platform_profit DECIMAL(10,4), -- Platform profit from this transaction
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}', -- ProjectSettings JSON
    status project_status DEFAULT 'draft',
    is_public BOOLEAN DEFAULT false,
    community_metrics JSONB DEFAULT '{"likes": 0, "comments": 0, "shares": 0, "views": 0}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media assets for projects
CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    url TEXT NOT NULL, -- S3 URL
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generation jobs
CREATE TABLE generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_type operation_type NOT NULL,
    request_data JSONB NOT NULL, -- GenerationRequest JSON
    status job_status DEFAULT 'queued',
    progress INTEGER DEFAULT 0, -- 0-100
    credits_required INTEGER NOT NULL,
    credits_deducted INTEGER DEFAULT 0,
    estimated_aws_cost DECIMAL(10,4),
    actual_aws_cost DECIMAL(10,4),
    platform_profit DECIMAL(10,4),
    result_url TEXT, -- S3 URL for result
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Community posts (shared projects)
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    allow_comments BOOLEAN DEFAULT true,
    allow_downloads BOOLEAN DEFAULT false,
    metrics JSONB DEFAULT '{"likes": 0, "comments": 0, "shares": 0, "views": 0}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community post likes
CREATE TABLE community_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Community post comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community post shares
CREATE TABLE community_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'twitter', 'facebook', 'linkedin', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video styles reference table
CREATE TABLE video_styles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_credits INTEGER DEFAULT 25,
    multiplier DECIMAL(3,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Music genres reference table
CREATE TABLE music_genres (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supported languages reference table
CREATE TABLE supported_languages (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community tags reference table
CREATE TABLE community_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- hex color
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration table
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generation_jobs_updated_at BEFORE UPDATE ON generation_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update community metrics
CREATE OR REPLACE FUNCTION update_community_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'community_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE community_posts 
            SET metrics = jsonb_set(metrics, '{likes}', (COALESCE((metrics->>'likes')::int, 0) + 1)::text::jsonb)
            WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE community_posts 
            SET metrics = jsonb_set(metrics, '{likes}', GREATEST(0, COALESCE((metrics->>'likes')::int, 0) - 1)::text::jsonb)
            WHERE id = OLD.post_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'comments' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE community_posts 
            SET metrics = jsonb_set(metrics, '{comments}', (COALESCE((metrics->>'comments')::int, 0) + 1)::text::jsonb)
            WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE community_posts 
            SET metrics = jsonb_set(metrics, '{comments}', GREATEST(0, COALESCE((metrics->>'comments')::int, 0) - 1)::text::jsonb)
            WHERE id = OLD.post_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'community_shares' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE community_posts 
            SET metrics = jsonb_set(metrics, '{shares}', (COALESCE((metrics->>'shares')::int, 0) + 1)::text::jsonb)
            WHERE id = NEW.post_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

-- Apply community metrics triggers
CREATE TRIGGER update_likes_metrics AFTER INSERT OR DELETE ON community_likes FOR EACH ROW EXECUTE FUNCTION update_community_metrics();
CREATE TRIGGER update_comments_metrics AFTER INSERT OR DELETE ON comments FOR EACH ROW EXECUTE FUNCTION update_community_metrics();
CREATE TRIGGER update_shares_metrics AFTER INSERT ON community_shares FOR EACH ROW EXECUTE FUNCTION update_community_metrics();

-- Create function to update user credit balance
CREATE OR REPLACE FUNCTION update_user_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET 
        credit_balance = credit_balance + NEW.amount,
        total_credits_ever = CASE 
            WHEN NEW.type = 'purchase' OR NEW.type = 'subscription_grant' 
            THEN total_credits_ever + NEW.amount 
            ELSE total_credits_ever 
        END
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply credit balance trigger
CREATE TRIGGER update_credit_balance AFTER INSERT ON credit_transactions FOR EACH ROW EXECUTE FUNCTION update_user_credit_balance();

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_provider_id ON users(auth_provider_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_operation_id ON credit_transactions(operation_id);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_is_public ON projects(is_public);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_updated_at ON projects(updated_at);

CREATE INDEX idx_media_assets_project_id ON media_assets(project_id);
CREATE INDEX idx_media_assets_mime_type ON media_assets(mime_type);

CREATE INDEX idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_project_id ON generation_jobs(project_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_generation_jobs_operation_type ON generation_jobs(operation_type);
CREATE INDEX idx_generation_jobs_created_at ON generation_jobs(created_at);

CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_is_public ON community_posts(is_public);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at);
CREATE INDEX idx_community_posts_tags ON community_posts USING GIN(tags);

CREATE INDEX idx_community_likes_post_id ON community_likes(post_id);
CREATE INDEX idx_community_likes_user_id ON community_likes(user_id);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);

CREATE INDEX idx_community_shares_post_id ON community_shares(post_id);
CREATE INDEX idx_community_shares_user_id ON community_shares(user_id);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create full-text search indexes
CREATE INDEX idx_projects_search ON projects USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_community_posts_search ON community_posts USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Create composite indexes for common queries
CREATE INDEX idx_projects_user_status ON projects(user_id, status);
CREATE INDEX idx_generation_jobs_user_status ON generation_jobs(user_id, status);
CREATE INDEX idx_community_posts_public_created ON community_posts(is_public, created_at DESC) WHERE is_public = true;
-- Initial seed data for AI Video Studio

-- Insert sample users (these will be created via Auth0/authentication flow in real usage)
-- This is just for development testing

-- Insert subscription plans
INSERT INTO subscription_plans (id, name, price, interval, credits_included, features) VALUES
('free', 'Free', 0, 'month', 0, '{"maxDuration": 60, "maxResolution": "standard", "vrSupport": false, "prioritySupport": false, "customBranding": false}'),
('starter', 'Starter', 2900, 'month', 100, '{"maxDuration": 300, "maxResolution": "standard", "vrSupport": false, "prioritySupport": false, "customBranding": false}'),
('pro', 'Pro', 9900, 'month', 500, '{"maxDuration": 7200, "maxResolution": "hd", "vrSupport": false, "prioritySupport": true, "customBranding": true}'),
('ultra', 'Ultra', 29900, 'month', 2000, '{"maxDuration": 7200, "maxResolution": "ultra", "vrSupport": true, "prioritySupport": true, "customBranding": true}');

-- Insert sample video styles
INSERT INTO video_styles (id, name, description, base_credits) VALUES
('social_media', 'Social Media', 'Optimized for social media platforms with engaging visuals', 25),
('advertisement', 'Advertisement', 'Professional advertising content with compelling messaging', 50),
('educational', 'Educational', 'Clear and informative content for learning purposes', 35),
('cinematic', 'Cinematic', 'High-quality cinematic production with dramatic effects', 75),
('vr', 'VR Experience', 'Immersive virtual reality content', 150);

-- Insert sample music genres
INSERT INTO music_genres (id, name, description) VALUES
('ambient', 'Ambient', 'Atmospheric and mood-setting background music'),
('corporate', 'Corporate', 'Professional and business-appropriate music'),
('electronic', 'Electronic', 'Modern electronic and synthesized music'),
('acoustic', 'Acoustic', 'Natural acoustic instruments and organic sounds'),
('cinematic', 'Cinematic', 'Dramatic and orchestral music for storytelling'),
('upbeat', 'Upbeat', 'Energetic and motivational music'),
('relaxing', 'Relaxing', 'Calm and soothing background music');

-- Insert sample languages
INSERT INTO supported_languages (code, name, native_name, enabled) VALUES
('en', 'English', 'English', true),
('es', 'Spanish', 'Español', true),
('fr', 'French', 'Français', true),
('de', 'German', 'Deutsch', true),
('it', 'Italian', 'Italiano', true),
('pt', 'Portuguese', 'Português', true),
('ru', 'Russian', 'Русский', true),
('ja', 'Japanese', '日本語', true),
('ko', 'Korean', '한국어', true),
('zh', 'Chinese', '中文', true);

-- Insert sample community tags
INSERT INTO community_tags (name, description, color) VALUES
('tutorial', 'Educational and how-to content', '#3B82F6'),
('business', 'Business and corporate content', '#059669'),
('creative', 'Creative and artistic content', '#DC2626'),
('tech', 'Technology and innovation content', '#7C3AED'),
('lifestyle', 'Lifestyle and personal content', '#EA580C'),
('entertainment', 'Fun and entertaining content', '#DB2777'),
('news', 'News and current events', '#0F172A'),
('sports', 'Sports and fitness content', '#16A34A');

-- Insert system configuration
INSERT INTO system_config (key, value, description) VALUES
('credit_price_cents', '5', 'Price per credit in cents'),
('max_file_size_mb', '500', 'Maximum file size for uploads in MB'),
('max_concurrent_jobs', '5', 'Maximum concurrent generation jobs per user'),
('maintenance_mode', 'false', 'Whether the system is in maintenance mode'),
('enable_community', 'true', 'Whether community features are enabled'),
('enable_realtime', 'true', 'Whether real-time features are enabled'),
('default_language', 'en', 'Default language for new users'),
('max_project_assets', '50', 'Maximum assets per project');

-- Insert sample admin user (for development only)
-- In production, admin users should be created through proper authentication flow
-- This is commented out as it should be handled by the authentication system
-- INSERT INTO users (id, email, auth_provider_id, display_name, role, credit_balance, language, timezone, is_active) VALUES
-- ('admin-dev-user', 'admin@aivideostudio.com', 'auth0|admin', 'Admin User', 'admin', 1000, 'en', 'UTC', true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider_id ON users(auth_provider_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_project_id ON generation_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON generation_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_is_public ON community_posts(is_public);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at);

-- Enable Row Level Security (RLS) on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic examples - should be refined based on specific requirements)
-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = auth_provider_id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = auth_provider_id);

-- Projects are owned by users
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_provider_id = auth.uid()::text));
CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE auth_provider_id = auth.uid()::text));
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (user_id = (SELECT id FROM users WHERE auth_provider_id = auth.uid()::text));
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (user_id = (SELECT id FROM users WHERE auth_provider_id = auth.uid()::text));

-- Public projects are viewable by everyone
CREATE POLICY "Public projects are viewable" ON projects FOR SELECT USING (is_public = true);

-- Community posts follow similar patterns
CREATE POLICY "Users can view public community posts" ON community_posts FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create community posts" ON community_posts FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE auth_provider_id = auth.uid()::text));
CREATE POLICY "Users can update own community posts" ON community_posts FOR UPDATE USING (user_id = (SELECT id FROM users WHERE auth_provider_id = auth.uid()::text));

-- Admin policies (admins can access everything)
CREATE POLICY "Admins can access all users" ON users FOR ALL USING ((SELECT role FROM users WHERE auth_provider_id = auth.uid()::text) = 'admin');
CREATE POLICY "Admins can access all projects" ON projects FOR ALL USING ((SELECT role FROM users WHERE auth_provider_id = auth.uid()::text) = 'admin');
CREATE POLICY "Admins can access all generation jobs" ON generation_jobs FOR ALL USING ((SELECT role FROM users WHERE auth_provider_id = auth.uid()::text) = 'admin');

-- Insert sample data for development (commented out - should be added via API in real usage)
-- This would typically be created through the application's user registration flow
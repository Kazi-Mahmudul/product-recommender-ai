-- Enable Row Level Security (RLS) on all public tables
-- This script should be run in your Supabase SQL editor

-- Enable RLS on phones table (read-only for public)
ALTER TABLE public.phones ENABLE ROW LEVEL SECURITY;

-- Policy for phones: Allow public read access
CREATE POLICY "Allow public read access on phones" ON public.phones
    FOR SELECT USING (true);

-- Enable RLS on users table (users can only access their own data)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for users: Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Enable RLS on email_verifications table (users can only access their own)
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Policy for email_verifications: Users can only access their own verifications
CREATE POLICY "Users can access own email verifications" ON public.email_verifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = email_verifications.user_id 
            AND auth.uid()::text = users.id::text
        )
    );

-- Enable RLS on comparison_sessions table
ALTER TABLE public.comparison_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for comparison_sessions: Allow access to session owners
-- Since sessions are anonymous, we'll allow access based on session_id knowledge
CREATE POLICY "Allow access to comparison sessions" ON public.comparison_sessions
    FOR ALL USING (true); -- We'll handle security at application level for anonymous sessions

-- Enable RLS on comparison_items table
ALTER TABLE public.comparison_items ENABLE ROW LEVEL SECURITY;

-- Policy for comparison_items: Allow access based on session ownership or user ownership
CREATE POLICY "Allow access to own comparison items" ON public.comparison_items
    FOR ALL USING (
        -- If user is authenticated, they can access their own items
        (user_id IS NOT NULL AND auth.uid()::text = user_id::text)
        OR
        -- For anonymous sessions, allow access (we'll handle security at app level)
        (session_id IS NOT NULL AND user_id IS NULL)
    );

-- Enable RLS on alembic_version table (system table, restrict access)
ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;

-- Policy for alembic_version: Only allow service role access
CREATE POLICY "Restrict alembic_version access" ON public.alembic_version
    FOR ALL USING (false); -- No public access, only service role can access

-- Grant necessary permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant specific table permissions
GRANT SELECT ON public.phones TO anon, authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.email_verifications TO authenticated;
GRANT ALL ON public.comparison_sessions TO anon, authenticated;
GRANT ALL ON public.comparison_items TO anon, authenticated;

-- Grant sequence permissions for auto-incrementing IDs
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
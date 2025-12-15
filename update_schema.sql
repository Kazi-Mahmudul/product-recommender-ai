-- Helper SQL for Supabase / PostgreSQL

-- 1. Create the guest_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS guest_usage (
    id SERIAL PRIMARY KEY,
    guest_uuid VARCHAR(50) NOT NULL UNIQUE,
    chat_count INTEGER DEFAULT 0 NOT NULL,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(50),
    user_agent_hash VARCHAR(64)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS ix_guest_usage_guest_uuid ON guest_usage (guest_uuid);

-- 2. Update existing users to ensure usage_stats has the correct structure
-- This sets default values if null, or merges defaults if keys are missing
UPDATE users
SET usage_stats = 
  CASE 
    WHEN usage_stats IS NULL THEN '{"total_chats": 0, "total_searches": 0, "total_comparisons": 0}'::jsonb
    ELSE usage_stats::jsonb || '{"total_chats": 0, "total_searches": 0, "total_comparisons": 0}'::jsonb
  END
WHERE usage_stats IS NULL OR NOT (usage_stats::jsonb ? 'total_chats');

-- Verification query (Optional - Run to check)
-- SELECT id, email, usage_stats FROM users LIMIT 5;

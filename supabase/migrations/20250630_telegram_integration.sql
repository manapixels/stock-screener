-- Add Telegram integration fields to user profiles
-- This allows users to link their Telegram account to their web app account

-- Add telegram fields to profiles table (assuming you have a profiles table)
-- If you don't have profiles table, this will create the necessary structure

DO $$ 
BEGIN
    -- Check if profiles table exists, if not create it
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE TABLE profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            email TEXT,
            full_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view own profile" ON profiles
            FOR SELECT USING (auth.uid() = id);
            
        CREATE POLICY "Users can update own profile" ON profiles
            FOR UPDATE USING (auth.uid() = id);
            
        CREATE POLICY "Users can insert own profile" ON profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Add missing columns to existing profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_username TEXT,
ADD COLUMN IF NOT EXISTS telegram_first_name TEXT,
ADD COLUMN IF NOT EXISTS telegram_last_name TEXT,
ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS telegram_active BOOLEAN DEFAULT FALSE;

-- Create index for fast telegram lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id ON profiles(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_username ON profiles(telegram_username);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a table to store temporary telegram linking tokens
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    telegram_chat_id TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on telegram_link_tokens
ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for telegram_link_tokens
CREATE POLICY "Users can view own link tokens" ON telegram_link_tokens
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own link tokens" ON telegram_link_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for telegram_link_tokens
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_token ON telegram_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_user_id ON telegram_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_expires_at ON telegram_link_tokens(expires_at);

-- Cleanup function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM telegram_link_tokens 
    WHERE expires_at < NOW() AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to link telegram account
CREATE OR REPLACE FUNCTION link_telegram_account(
    p_token TEXT,
    p_chat_id TEXT,
    p_username TEXT DEFAULT NULL,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_token_record telegram_link_tokens%ROWTYPE;
    v_existing_user_id UUID;
BEGIN
    -- Find and validate token
    SELECT * INTO v_token_record
    FROM telegram_link_tokens
    WHERE token = p_token 
      AND expires_at > NOW() 
      AND used_at IS NULL;
      
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid or expired token'
        );
    END IF;
    
    v_user_id := v_token_record.user_id;
    
    -- Check if telegram account is already linked to another user
    SELECT id INTO v_existing_user_id
    FROM profiles
    WHERE telegram_chat_id = p_chat_id 
      AND id != v_user_id;
      
    IF FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'This Telegram account is already linked to another user'
        );
    END IF;
    
    -- Update user profile with telegram info
    UPDATE profiles SET
        telegram_chat_id = p_chat_id,
        telegram_username = p_username,
        telegram_first_name = p_first_name,
        telegram_last_name = p_last_name,
        telegram_linked_at = NOW(),
        telegram_active = true
    WHERE id = v_user_id;
    
    -- Mark token as used
    UPDATE telegram_link_tokens SET
        used_at = NOW(),
        telegram_chat_id = p_chat_id
    WHERE id = v_token_record.id;
    
    RETURN json_build_object(
        'success', true,
        'user_id', v_user_id,
        'message', 'Telegram account linked successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlink telegram account
CREATE OR REPLACE FUNCTION unlink_telegram_account(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
    UPDATE profiles SET
        telegram_chat_id = NULL,
        telegram_username = NULL,
        telegram_first_name = NULL,
        telegram_last_name = NULL,
        telegram_linked_at = NULL,
        telegram_active = false
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Telegram account unlinked successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON telegram_link_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION link_telegram_account TO authenticated;
GRANT EXECUTE ON FUNCTION unlink_telegram_account TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_telegram_tokens TO authenticated; 
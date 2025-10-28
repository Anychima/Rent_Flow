-- ============================================
-- RentFlow: Multi-Wallet Support
-- Date: 2025-10-28
-- Purpose: Allow users to manage multiple Arc wallets
-- ============================================

-- Create user_wallets table
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('circle', 'external')),
  circle_wallet_id TEXT, -- NULL for external wallets
  label TEXT, -- Optional user-friendly label
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_wallet_per_user UNIQUE(user_id, wallet_address),
  CONSTRAINT valid_circle_wallet CHECK (
    (wallet_type = 'circle' AND circle_wallet_id IS NOT NULL) OR
    (wallet_type = 'external' AND circle_wallet_id IS NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_primary ON public.user_wallets(user_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON public.user_wallets(wallet_address);

-- Create trigger to ensure only one primary wallet per user
CREATE OR REPLACE FUNCTION ensure_one_primary_wallet()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a wallet as primary, unset all other wallets for this user
  IF NEW.is_primary = TRUE THEN
    UPDATE public.user_wallets
    SET is_primary = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_one_primary_wallet ON public.user_wallets;
CREATE TRIGGER trigger_ensure_one_primary_wallet
  BEFORE INSERT OR UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION ensure_one_primary_wallet();

-- Migrate existing wallet data from users table (if any)
-- This will create wallet records for users who already have wallets
INSERT INTO public.user_wallets (user_id, wallet_address, wallet_type, circle_wallet_id, is_primary)
SELECT 
  id as user_id,
  wallet_address,
  CASE 
    WHEN circle_wallet_id IS NOT NULL THEN 'circle'
    ELSE 'external'
  END as wallet_type,
  circle_wallet_id,
  TRUE as is_primary
FROM public.users
WHERE wallet_address IS NOT NULL
ON CONFLICT (user_id, wallet_address) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_wallets_updated_at ON public.user_wallets;
CREATE TRIGGER trigger_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own wallets
CREATE POLICY user_wallets_select_own ON public.user_wallets
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own wallets
CREATE POLICY user_wallets_insert_own ON public.user_wallets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own wallets
CREATE POLICY user_wallets_update_own ON public.user_wallets
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own wallets
CREATE POLICY user_wallets_delete_own ON public.user_wallets
  FOR DELETE
  USING (user_id = auth.uid());

-- Service role can do everything
CREATE POLICY user_wallets_service_all ON public.user_wallets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify
SELECT '✅ user_wallets table created successfully!' AS status;
SELECT COUNT(*) AS migrated_wallets FROM public.user_wallets;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Align merchant_deals.deal_type constraint with TypeScript enum
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEM:
--   Migration 20260401152000_fix_capital_transfers_cache.sql added:
--     CHECK (deal_type IN ('loan', 'investment', 'general', 'capital_transfer', 'profit_share'))
--
--   The application TypeScript DealType enum uses different names:
--     'lending' | 'arbitrage' | 'partnership' | 'capital_placement' | 'general' | 'capital_transfer'
--
--   This means any deal created via the app with type 'arbitrage', 'partnership',
--   'lending', or 'capital_placement' will be rejected by the DB constraint.
--
-- SOLUTION:
--   Replace the constraint to include all active TypeScript enum values plus
--   the legacy DB values to preserve backward compatibility with any existing rows.
--
-- SAFE: Uses DROP CONSTRAINT IF EXISTS — idempotent, no data loss.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.merchant_deals
  DROP CONSTRAINT IF EXISTS merchant_deals_deal_type_check;

ALTER TABLE public.merchant_deals
  ADD CONSTRAINT merchant_deals_deal_type_check
  CHECK (deal_type IN (
    -- Active values: match TypeScript DealType enum in src/types/domain.ts
    'lending',
    'arbitrage',
    'partnership',
    'capital_placement',
    'general',
    'capital_transfer',
    -- Legacy DB values: retained for backward compatibility with any existing rows
    -- that were written before the TypeScript enum was introduced.
    'loan',         -- maps to legacy 'lending'
    'investment',   -- maps to legacy 'capital_placement'
    'profit_share'  -- legacy financial deal type
  ));

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

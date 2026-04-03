-- Ledger Import System Tables
-- Supports parsing and importing order data from multiple file formats (text, spreadsheet, image with OCR)

-- ═══════════════════════════════════════════════════════════════
-- LEDGER IMPORT BATCHES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ledger_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_merchant_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pasted_text', 'text_file', 'spreadsheet', 'image')),
  source_file_name TEXT,
  total_rows INT NOT NULL DEFAULT 0,
  parsed_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  needs_review_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.ledger_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own batches" ON public.ledger_import_batches FOR SELECT USING (auth.uid() = uploader_user_id);
CREATE POLICY "Users can insert own batches" ON public.ledger_import_batches FOR INSERT WITH CHECK (auth.uid() = uploader_user_id);
CREATE POLICY "Users can update own batches" ON public.ledger_import_batches FOR UPDATE USING (auth.uid() = uploader_user_id);
CREATE POLICY "Admins can view all batches" ON public.ledger_import_batches FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_ledger_batches_uploader ON public.ledger_import_batches(uploader_user_id, created_at DESC);
CREATE INDEX idx_ledger_batches_status ON public.ledger_import_batches(status, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- LEDGER IMPORT ROWS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ledger_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.ledger_import_batches(id) ON DELETE CASCADE,
  uploader_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line_index INT NOT NULL,
  raw_line TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  normalized_hash TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_file_name TEXT,
  parsed_type TEXT NOT NULL DEFAULT 'unsupported' CHECK (parsed_type IN ('merchant_deal', 'unsupported')),
  direction TEXT CHECK (direction IN ('merchant_to_me', 'me_to_merchant', NULL)),
  usdt_amount NUMERIC(18,6),
  rate NUMERIC(18,6),
  computed_qar_amount NUMERIC(18,6),
  selected_merchant_id TEXT,
  selected_merchant_name TEXT,
  intermediary TEXT,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'parsed' CHECK (status IN ('parsed', 'skipped', 'needs_review')),
  parse_result TEXT,
  skip_reason TEXT,
  save_enabled BOOLEAN NOT NULL DEFAULT false,
  saved_to_deal_id UUID REFERENCES public.merchant_deals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ledger_import_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own rows" ON public.ledger_import_rows FOR SELECT USING (auth.uid() = uploader_user_id);
CREATE POLICY "Users can insert own rows" ON public.ledger_import_rows FOR INSERT WITH CHECK (auth.uid() = uploader_user_id);
CREATE POLICY "Users can update own rows" ON public.ledger_import_rows FOR UPDATE USING (auth.uid() = uploader_user_id);
CREATE POLICY "Admins can view all rows" ON public.ledger_import_rows FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_ledger_rows_batch ON public.ledger_import_rows(batch_id, line_index);
CREATE INDEX idx_ledger_rows_uploader ON public.ledger_import_rows(uploader_user_id, created_at DESC);
CREATE INDEX idx_ledger_rows_status ON public.ledger_import_rows(status);
CREATE INDEX idx_ledger_rows_hash ON public.ledger_import_rows(normalized_hash) WHERE status = 'parsed';

-- Comments for clarity
COMMENT ON TABLE public.ledger_import_batches IS 'Tracks import batches from various sources (text, spreadsheet, OCR image)';
COMMENT ON TABLE public.ledger_import_rows IS 'Individual rows parsed from ledger imports, awaiting validation and save';
COMMENT ON COLUMN public.ledger_import_rows.normalized_hash IS 'Hash of normalized text for deduplication';
COMMENT ON COLUMN public.ledger_import_rows.confidence IS 'Confidence score from parser/OCR (0.0-1.0)';
COMMENT ON COLUMN public.ledger_import_rows.saved_to_deal_id IS 'References merchant_deals if row was saved as a deal';

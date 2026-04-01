
-- ═══════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- ═══════════════════════════════════════════════════════════════
-- USER ROLES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- MERCHANT PROFILES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.merchant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  merchant_id TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT,
  region TEXT,
  default_currency TEXT NOT NULL DEFAULT 'USDT',
  merchant_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own merchant profile" ON public.merchant_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own merchant profile" ON public.merchant_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own merchant profile" ON public.merchant_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can view all merchant profiles" ON public.merchant_profiles FOR SELECT TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- MERCHANT RELATIONSHIPS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.merchant_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_a_id TEXT NOT NULL,
  merchant_b_id TEXT NOT NULL,
  invite_id UUID,
  relationship_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'active',
  shared_fields TEXT[] DEFAULT '{}',
  approval_policy JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_relationships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_relationship_member(rel_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.merchant_relationships r
    JOIN public.merchant_profiles mp ON mp.user_id = auth.uid()
    WHERE r.id = rel_id AND (r.merchant_a_id = mp.merchant_id OR r.merchant_b_id = mp.merchant_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_my_merchant_id()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT merchant_id FROM public.merchant_profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE POLICY "Members can view relationships" ON public.merchant_relationships FOR SELECT TO authenticated USING (
  merchant_a_id = public.get_my_merchant_id() OR merchant_b_id = public.get_my_merchant_id()
);
CREATE POLICY "Members can insert relationships" ON public.merchant_relationships FOR INSERT TO authenticated WITH CHECK (
  merchant_a_id = public.get_my_merchant_id() OR merchant_b_id = public.get_my_merchant_id()
);
CREATE POLICY "Members can update relationships" ON public.merchant_relationships FOR UPDATE TO authenticated USING (
  merchant_a_id = public.get_my_merchant_id() OR merchant_b_id = public.get_my_merchant_id()
);

-- ═══════════════════════════════════════════════════════════════
-- MERCHANT INVITES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.merchant_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_merchant_id TEXT NOT NULL,
  to_merchant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  purpose TEXT NOT NULL DEFAULT '',
  requested_role TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  requested_scope TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invite participants can view" ON public.merchant_invites FOR SELECT TO authenticated USING (
  from_merchant_id = public.get_my_merchant_id() OR to_merchant_id = public.get_my_merchant_id()
);
CREATE POLICY "Merchants can create invites" ON public.merchant_invites FOR INSERT TO authenticated WITH CHECK (
  from_merchant_id = public.get_my_merchant_id()
);
CREATE POLICY "Invite participants can update" ON public.merchant_invites FOR UPDATE TO authenticated USING (
  from_merchant_id = public.get_my_merchant_id() OR to_merchant_id = public.get_my_merchant_id()
);

-- ═══════════════════════════════════════════════════════════════
-- MERCHANT DEALS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.merchant_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.merchant_relationships(id) ON DELETE CASCADE,
  deal_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL DEFAULT '',
  amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDT',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  issue_date TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  close_date TIMESTAMPTZ,
  expected_return NUMERIC(18,6),
  realized_pnl NUMERIC(18,6),
  settlement_cadence TEXT DEFAULT 'monthly',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationship members can view deals" ON public.merchant_deals FOR SELECT TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can insert deals" ON public.merchant_deals FOR INSERT TO authenticated WITH CHECK (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can update deals" ON public.merchant_deals FOR UPDATE TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Admins can view all deals" ON public.merchant_deals FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- MERCHANT SETTLEMENTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.merchant_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.merchant_deals(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES public.merchant_relationships(id),
  amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDT',
  settled_by UUID NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationship members can view settlements" ON public.merchant_settlements FOR SELECT TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can insert settlements" ON public.merchant_settlements FOR INSERT TO authenticated WITH CHECK (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can update settlements" ON public.merchant_settlements FOR UPDATE TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Admins can view all settlements" ON public.merchant_settlements FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- MERCHANT PROFITS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.merchant_profits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.merchant_deals(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES public.merchant_relationships(id),
  amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDT',
  recorded_by UUID NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_profits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationship members can view profits" ON public.merchant_profits FOR SELECT TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can insert profits" ON public.merchant_profits FOR INSERT TO authenticated WITH CHECK (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can update profits" ON public.merchant_profits FOR UPDATE TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Admins can view all profits" ON public.merchant_profits FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- MERCHANT MESSAGES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.merchant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.merchant_relationships(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_merchant_id TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  message_type TEXT NOT NULL DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationship members can view messages" ON public.merchant_messages FOR SELECT TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can insert messages" ON public.merchant_messages FOR INSERT TO authenticated WITH CHECK (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can update messages" ON public.merchant_messages FOR UPDATE TO authenticated USING (public.is_relationship_member(relationship_id));

-- ═══════════════════════════════════════════════════════════════
-- MERCHANT APPROVALS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.merchant_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.merchant_relationships(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  target_entity_type TEXT NOT NULL DEFAULT '',
  target_entity_id TEXT NOT NULL DEFAULT '',
  proposed_payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_by_user_id UUID NOT NULL,
  submitted_by_merchant_id TEXT NOT NULL,
  reviewer_user_id UUID,
  resolution_note TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationship members can view approvals" ON public.merchant_approvals FOR SELECT TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can insert approvals" ON public.merchant_approvals FOR INSERT TO authenticated WITH CHECK (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can update approvals" ON public.merchant_approvals FOR UPDATE TO authenticated USING (public.is_relationship_member(relationship_id));

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  body TEXT,
  category TEXT NOT NULL DEFAULT 'system',
  read_at TIMESTAMPTZ,
  conversation_id UUID,
  message_id UUID,
  entity_type TEXT,
  entity_id TEXT,
  anchor_id TEXT,
  actor_id TEXT,
  target_path TEXT,
  target_tab TEXT,
  target_focus TEXT,
  target_entity_type TEXT,
  target_entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ═══════════════════════════════════════════════════════════════
-- TRACKER SNAPSHOTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.tracker_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  state JSONB,
  preferences JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tracker_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tracker" ON public.tracker_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own tracker" ON public.tracker_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tracker" ON public.tracker_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trackers" ON public.tracker_snapshots FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- P2P SNAPSHOTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.p2p_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_p2p_market_fetched ON public.p2p_snapshots(market, fetched_at DESC);
ALTER TABLE public.p2p_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view p2p" ON public.p2p_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service can insert p2p" ON public.p2p_snapshots FOR INSERT TO authenticated WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- ADMIN AUDIT LOGS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- CAPITAL TRANSFERS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.capital_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.merchant_deals(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.merchant_relationships(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  cost_basis NUMERIC(18,6) NOT NULL DEFAULT 0,
  total_cost NUMERIC(18,6) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDT',
  transferred_by UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.capital_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationship members can view transfers" ON public.capital_transfers FOR SELECT TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can insert transfers" ON public.capital_transfers FOR INSERT TO authenticated WITH CHECK (public.is_relationship_member(relationship_id));

-- ═══════════════════════════════════════════════════════════════
-- DEAL CAPITAL LEDGER
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.deal_capital_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.merchant_deals(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.merchant_relationships(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDT',
  period_id UUID,
  initiated_by UUID NOT NULL,
  pool_balance_after NUMERIC(18,6) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_capital_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationship members can view ledger" ON public.deal_capital_ledger FOR SELECT TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can insert ledger" ON public.deal_capital_ledger FOR INSERT TO authenticated WITH CHECK (public.is_relationship_member(relationship_id));

-- ═══════════════════════════════════════════════════════════════
-- CASH ACCOUNTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'hand',
  currency TEXT NOT NULL DEFAULT 'QAR',
  bank_name TEXT,
  branch TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own accounts" ON public.cash_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.cash_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.cash_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.cash_accounts FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- CASH LEDGER
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.cash_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID NOT NULL REFERENCES public.cash_accounts(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'in',
  amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'deposit',
  source TEXT,
  note TEXT,
  reference_id TEXT,
  batch_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ledger" ON public.cash_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ledger" ON public.cash_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ledger" ON public.cash_ledger FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ledger" ON public.cash_ledger FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- SETTLEMENT PERIODS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.settlement_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.merchant_deals(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.merchant_relationships(id) ON DELETE CASCADE,
  cadence TEXT NOT NULL DEFAULT 'monthly',
  period_key TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  trade_count INT NOT NULL DEFAULT 0,
  gross_volume NUMERIC(18,6) NOT NULL DEFAULT 0,
  total_cost NUMERIC(18,6) NOT NULL DEFAULT 0,
  net_profit NUMERIC(18,6) NOT NULL DEFAULT 0,
  total_fees NUMERIC(18,6) NOT NULL DEFAULT 0,
  partner_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  merchant_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  settled_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  settlement_id UUID,
  resolution TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settlement_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationship members can view periods" ON public.settlement_periods FOR SELECT TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can insert periods" ON public.settlement_periods FOR INSERT TO authenticated WITH CHECK (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can update periods" ON public.settlement_periods FOR UPDATE TO authenticated USING (public.is_relationship_member(relationship_id));

-- ═══════════════════════════════════════════════════════════════
-- SETTLEMENT DECISIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.settlement_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_period_id UUID NOT NULL,
  agreement_id UUID NOT NULL,
  merchant_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  profit_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  decision TEXT NOT NULL DEFAULT 'pending',
  default_behavior TEXT NOT NULL DEFAULT 'reinvest',
  decision_due_at TIMESTAMPTZ,
  decision_confirmed_at TIMESTAMPTZ,
  reinvested_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  withdrawn_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  effective_capital_before NUMERIC(18,6) NOT NULL DEFAULT 0,
  effective_capital_after NUMERIC(18,6) NOT NULL DEFAULT 0,
  finalization_snapshot JSONB,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settlement_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants can view own decisions" ON public.settlement_decisions FOR SELECT TO authenticated USING (merchant_id = public.get_my_merchant_id());
CREATE POLICY "Authenticated can insert decisions" ON public.settlement_decisions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Merchants can update own decisions" ON public.settlement_decisions FOR UPDATE TO authenticated USING (merchant_id = public.get_my_merchant_id());
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlement_decisions;

-- ═══════════════════════════════════════════════════════════════
-- MERCHANT LIQUIDITY PROFILES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.merchant_liquidity_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  publish_cash_enabled BOOLEAN NOT NULL DEFAULT false,
  publish_usdt_enabled BOOLEAN NOT NULL DEFAULT false,
  published_cash_amount NUMERIC(18,6),
  published_usdt_amount NUMERIC(18,6),
  cash_publish_mode TEXT NOT NULL DEFAULT 'status',
  usdt_publish_mode TEXT NOT NULL DEFAULT 'status',
  cash_range_min NUMERIC(18,6),
  cash_range_max NUMERIC(18,6),
  usdt_range_min NUMERIC(18,6),
  usdt_range_max NUMERIC(18,6),
  cash_status TEXT NOT NULL DEFAULT 'unavailable',
  usdt_status TEXT NOT NULL DEFAULT 'unavailable',
  reserve_buffer_cash NUMERIC(18,6) NOT NULL DEFAULT 0,
  reserve_buffer_usdt NUMERIC(18,6) NOT NULL DEFAULT 0,
  reserved_cash_commitments NUMERIC(18,6) NOT NULL DEFAULT 0,
  reserved_usdt_commitments NUMERIC(18,6) NOT NULL DEFAULT 0,
  visibility_scope TEXT NOT NULL DEFAULT 'relationships',
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  last_published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_liquidity_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view liquidity" ON public.merchant_liquidity_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can upsert own liquidity" ON public.merchant_liquidity_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own liquidity" ON public.merchant_liquidity_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- PROFIT SHARE AGREEMENTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.profit_share_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.merchant_relationships(id) ON DELETE CASCADE,
  partner_ratio NUMERIC(5,2) NOT NULL DEFAULT 0,
  merchant_ratio NUMERIC(5,2) NOT NULL DEFAULT 0,
  settlement_cadence TEXT NOT NULL DEFAULT 'monthly',
  invested_capital NUMERIC(18,6),
  settlement_way TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  agreement_type TEXT NOT NULL DEFAULT 'standard',
  operator_ratio NUMERIC(5,2),
  operator_merchant_id TEXT,
  operator_contribution NUMERIC(18,6),
  lender_contribution NUMERIC(18,6),
  terms_snapshot JSONB,
  operator_default_profit_handling TEXT NOT NULL DEFAULT 'reinvest',
  counterparty_default_profit_handling TEXT NOT NULL DEFAULT 'reinvest',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profit_share_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationship members can view agreements" ON public.profit_share_agreements FOR SELECT TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can insert agreements" ON public.profit_share_agreements FOR INSERT TO authenticated WITH CHECK (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can update agreements" ON public.profit_share_agreements FOR UPDATE TO authenticated USING (public.is_relationship_member(relationship_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.profit_share_agreements;

-- ═══════════════════════════════════════════════════════════════
-- ORDER ALLOCATIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.order_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_group_id UUID NOT NULL,
  order_id TEXT NOT NULL,
  relationship_id UUID NOT NULL REFERENCES public.merchant_relationships(id) ON DELETE CASCADE,
  merchant_id TEXT NOT NULL,
  family TEXT NOT NULL DEFAULT 'profit_share',
  profit_share_agreement_id UUID REFERENCES public.profit_share_agreements(id),
  allocated_usdt NUMERIC(18,6) NOT NULL DEFAULT 0,
  merchant_cost_per_usdt NUMERIC(18,6) NOT NULL DEFAULT 0,
  sell_price NUMERIC(18,6) NOT NULL DEFAULT 0,
  fee_share NUMERIC(18,6) NOT NULL DEFAULT 0,
  allocation_revenue NUMERIC(18,6) NOT NULL DEFAULT 0,
  allocation_cost NUMERIC(18,6) NOT NULL DEFAULT 0,
  allocation_fee NUMERIC(18,6) NOT NULL DEFAULT 0,
  allocation_net NUMERIC(18,6) NOT NULL DEFAULT 0,
  partner_share_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  merchant_share_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  partner_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  merchant_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
  agreement_ratio_snapshot TEXT,
  deal_terms_snapshot JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationship members can view allocations" ON public.order_allocations FOR SELECT TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can insert allocations" ON public.order_allocations FOR INSERT TO authenticated WITH CHECK (public.is_relationship_member(relationship_id));
CREATE POLICY "Relationship members can update allocations" ON public.order_allocations FOR UPDATE TO authenticated USING (public.is_relationship_member(relationship_id));
CREATE POLICY "Merchants can view own allocations" ON public.order_allocations FOR SELECT TO authenticated USING (merchant_id = public.get_my_merchant_id());

-- ═══════════════════════════════════════════════════════════════
-- CHAT: OS ROOMS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.os_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'standard',
  lane TEXT NOT NULL DEFAULT 'Personal',
  relationship_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.os_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view rooms" ON public.os_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create rooms" ON public.os_rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update rooms" ON public.os_rooms FOR UPDATE TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- CHAT: OS MESSAGES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.os_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.os_rooms(id) ON DELETE CASCADE,
  sender_merchant_id TEXT,
  content TEXT NOT NULL DEFAULT '',
  body_json JSONB DEFAULT '{}',
  message_type TEXT NOT NULL DEFAULT 'text',
  client_nonce TEXT,
  reply_to_message_id UUID,
  expires_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_os_messages_room ON public.os_messages(room_id, created_at);
ALTER TABLE public.os_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view messages" ON public.os_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert messages" ON public.os_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update messages" ON public.os_messages FOR UPDATE TO authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.os_messages;

-- ═══════════════════════════════════════════════════════════════
-- CHAT: BUSINESS OBJECTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.os_business_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.os_rooms(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL DEFAULT '',
  object_id TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.os_business_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view biz objects" ON public.os_business_objects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert biz objects" ON public.os_business_objects FOR INSERT TO authenticated WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- CHAT: TRACKER LINKS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.chat_tracker_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.os_rooms(id) ON DELETE CASCADE,
  tracker_entity_type TEXT NOT NULL DEFAULT '',
  tracker_entity_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_tracker_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view tracker links" ON public.chat_tracker_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tracker links" ON public.chat_tracker_links FOR INSERT TO authenticated WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- CHAT: ACTION ITEMS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.chat_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.os_rooms(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.os_messages(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view action items" ON public.chat_action_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert action items" ON public.chat_action_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update action items" ON public.chat_action_items FOR UPDATE TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- CHAT: MESSAGE REACTIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.os_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  merchant_id TEXT,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view reactions" ON public.message_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add reactions" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove reactions" ON public.message_reactions FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- CHAT: TYPING PRESENCE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.typing_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.os_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  merchant_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.typing_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view typing" ON public.typing_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can set typing" ON public.typing_presence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can clear typing" ON public.typing_presence FOR DELETE USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_presence;

-- ═══════════════════════════════════════════════════════════════
-- CHAT VIEW: Room summary
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.chat_room_summary_v WITH (security_invoker = on) AS
SELECT
  r.id,
  r.name,
  r.type,
  r.lane,
  r.relationship_id,
  r.updated_at,
  (SELECT m.content FROM public.os_messages m WHERE m.room_id = r.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_content,
  (SELECT m.created_at FROM public.os_messages m WHERE m.room_id = r.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
  (SELECT COUNT(*) FROM public.os_messages m WHERE m.room_id = r.id AND m.read_at IS NULL) AS unread_count
FROM public.os_rooms r;

-- ═══════════════════════════════════════════════════════════════
-- CHAT VIEW: Call history (placeholder)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.call_history_v WITH (security_invoker = on) AS
SELECT
  id,
  room_id,
  sender_merchant_id AS caller_id,
  created_at AS started_at,
  created_at AS ended_at,
  'completed' AS status
FROM public.os_messages
WHERE message_type = 'call';

-- ═══════════════════════════════════════════════════════════════
-- REALTIME for key tables
-- ═══════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_messages;

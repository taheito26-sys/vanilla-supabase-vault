import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackerState } from '@/lib/useTrackerState';
import {
  fmtQWithUnit, fmtU, fmtQ, fmtPct, fmtP,
  fmtTotal, fmtPrice,
  kpiFor, totalStock, stockCostQAR, getWACOP,
  rangeLabel, num, startOfDay,
  deriveCashQAR, fmtQRaw,
} from '@/lib/tracker-helpers';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { useQuery } from '@tanstack/react-query';
import { CashBoxManager } from '@/features/dashboard/components/CashBoxManager';
import { buildDealRowModel } from '@/features/orders/utils/dealRowModel';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
} from 'recharts';
import '@/styles/tracker.css';

interface DashboardPageProps {
  adminUserId?: string;
  adminMerchantId?: string;
  adminTrackerState?: any;
  isAdminView?: boolean;
}

export default function DashboardPage({ adminUserId, adminMerchantId, adminTrackerState, isAdminView: isAdminViewProp }: DashboardPageProps = {}) {
  const { settings } = useTheme();
  const t = useT();
  const navigate = useNavigate();
  const { user, merchantProfile } = useAuth();

  // 🛡️ ROLE VERIFICATION: Fetch real-time roles from public.user_roles
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      return (data || []).map(r => r.role);
    },
    enabled: !!user?.id,
  });

  const isAdmin = userRoles?.includes('admin') || isAdminViewProp;

  const { state, derived, applyState } = useTrackerState({
    lowStockThreshold: settings.lowStockThreshold,
    priceAlertThreshold: settings.priceAlertThreshold,
    range: settings.range,
    currency: settings.currency,
    preloadedState: adminTrackerState || undefined,
  });

  const dM = kpiFor(state, derived, 'this_month');
  const dL = kpiFor(state, derived, 'last_month');
  const d1 = kpiFor(state, derived, 'today');
  const d7 = kpiFor(state, derived, '7d');
  const d30 = kpiFor(state, derived, '30d');
  const dR = kpiFor(state, derived, settings.range);
  const stk = totalStock(derived);
  const stCost = stockCostQAR(derived);
  const wacop = getWACOP(derived);
  const rLabel = rangeLabel(settings.range);

  const allTrades = state.trades.filter(t => !t.voided);
  const allMargins = allTrades.map(tr => {
    const c = derived.tradeCalc.get(tr.id);
    if (!c?.ok) return null;
    if (tr.linkedDealId || tr.linkedRelId) {
      const myPct = tr.merchantPct ?? 100;
      const myNet = c.netQAR * myPct / 100;
      const rev = tr.amountUSDT * tr.sellPriceQAR;
      return rev > 0 ? (myNet / rev) * 100 : 0;
    }
    return c.margin;
  }).filter((x): x is number => x !== null);
  const avgM = allMargins.length ? allMargins.reduce((s, v) => s + v, 0) / allMargins.length : 0;

  const cycleHours = useMemo(() => {
    const tradesSorted = [...allTrades].sort((a, b) => a.ts - b.ts);
    const deltas: number[] = [];
    for (const tr of tradesSorted) {
      const c = derived.tradeCalc.get(tr.id);
      if (!c?.ok || !c.slices?.length) continue;
      for (const sl of c.slices) {
        const batch = state.batches.find(b => b.id === sl.batchId);
        if (batch) {
          const delta = (tr.ts - batch.ts) / (1000 * 60 * 60);
          if (delta > 0 && delta < 10000) deltas.push(delta);
        }
      }
    }
    return deltas.length ? deltas.reduce((s, v) => s + v, 0) / deltas.length : null;
  }, [allTrades, derived, state.batches]);

  const LOW = num(state.settings?.lowStockThreshold, 5000);
  const isLow = stk <= 0 || (LOW > 0 && stk < LOW);

  const [showCashBox, setShowCashBox] = useState(false);
  const [expandedNewKpi, setExpandedNewKpi] = useState<string | null>(null);
  const [roiPeriod, setRoiPeriod] = useState<'7d' | '30d'>('7d');
  
  const userId = adminUserId || user?.id;
  const workspaceMerchantId = adminMerchantId || merchantProfile?.merchant_id;

  // Merchant deals KPIs
  const { data: merchantDealKpis } = useQuery({
    queryKey: ['dashboard-merchant-deals', userId, workspaceMerchantId, isAdmin],
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!userId || !workspaceMerchantId) return null;
      let relsQuery = supabase.from('merchant_relationships').select('id, merchant_a_id, merchant_b_id').eq('status', 'active');
      if (!isAdmin) {
          relsQuery = relsQuery.or(`merchant_a_id.eq.${workspaceMerchantId},merchant_b_id.eq.${workspaceMerchantId}`);
      }
      const relsRes = await relsQuery;
      if (relsRes.error) throw relsRes.error;
      const relIds = (relsRes.data || []).map(r => r.id);
      
      const { data: deals } = relIds.length > 0
        ? await supabase
            .from('merchant_deals')
            .select('id, amount, status, created_by, notes, deal_type, relationship_id, title')
            .in('relationship_id', relIds)
            .order('created_at', { ascending: false })
        : { data: [] as any[] };
      if (!deals || deals.length === 0) return null;

      const activeDeals = deals.filter(d => d.status !== 'cancelled' && d.status !== 'voided');
      const dealRelIds = [...new Set(activeDeals.map(d => d.relationship_id))];
      const { data: rels } = await supabase.from('merchant_relationships').select('id, merchant_a_id, merchant_b_id').in('id', dealRelIds);

      const allMerchantIds = new Set<string>();
      for (const r of (rels || [])) { allMerchantIds.add(r.merchant_a_id); allMerchantIds.add(r.merchant_b_id); }

      const { data: mProfiles } = await supabase.from('merchant_profiles').select('merchant_id, display_name, user_id').in('merchant_id', [...allMerchantIds]);
      const profileMap = new Map<string, { name: string; userId: string }>();
      for (const p of (mProfiles || [])) profileMap.set(p.merchant_id, { name: p.display_name, userId: p.user_id });

      const relMap = new Map<string, { merchant_a_id: string; merchant_b_id: string }>();
      for (const r of (rels || [])) relMap.set(r.id, r);

      let outCount = 0, outVol = 0, outNet = 0, inCount = 0, inVol = 0, inNet = 0;
      let totalMyShare = 0, totalPartnerShare = 0;
      const dealDetails: any[] = [];

      for (const d of activeDeals) {
        const direction = d.created_by === userId ? 'outgoing' as const : 'incoming' as const;
        const row = buildDealRowModel({ deal: d, perspective: direction, locale: t.isRTL ? 'ar' : 'en' });
        const vol = row.volume;
        const dealNet = row.fullNet ?? 0;
        const myShare = direction === 'outgoing' ? (row.creatorNet ?? 0) : (row.partnerNet ?? 0);
        const partnerShare = direction === 'outgoing' ? (row.partnerNet ?? 0) : (row.creatorNet ?? 0);

        const rel = relMap.get(d.relationship_id);
        let merchantName = 'Unknown';
        if (rel) {
          const counterId = workspaceMerchantId === rel.merchant_a_id ? rel.merchant_b_id : rel.merchant_a_id;
          merchantName = profileMap.get(counterId)?.name || 'Unknown';
        }

        if (direction === 'outgoing') { outCount++; outVol += vol; outNet += dealNet; }
        else { inCount++; inVol += vol; inNet += dealNet; }
        totalMyShare += myShare; totalPartnerShare += partnerShare;
        dealDetails.push({ id: d.id, title: d.title, merchantName, net: dealNet, myShare, partnerShare, vol, status: d.status, direction, dealType: d.deal_type });
      }

      return { totalDeals: activeDeals.length, outCount, outVol, outNet, inCount, inVol, inNet, totalVol: outVol + inVol, totalNet: outNet + inNet, totalMyShare, totalPartnerShare, dealDetails };
    },
    enabled: !!userId && !!workspaceMerchantId,
  });

  const handleCashSave = useCallback((newCash: number, owner: string, history?: any[]) => {
    applyState({ ...state, cashQAR: newCash, cashOwner: owner, cashHistory: history ?? state.cashHistory ?? [] });
  }, [state, applyState]);

  const p2pAvgs = useMemo(() => {
    const sellTrades = allTrades.filter(t => t.usesStock && t.sellPriceQAR > 0);
    const avgSell = sellTrades.length ? sellTrades.reduce((s, t) => s + t.sellPriceQAR, 0) / sellTrades.length : null;
    const batches = state.batches.filter(b => b.buyPriceQAR > 0);
    const avgBuy = batches.length ? batches.reduce((s, b) => s + b.buyPriceQAR, 0) / batches.length : null;
    return { avgSell, avgBuy };
  }, [allTrades, state.batches]);

  const tradeNet = (tr: any) => {
    const c = derived.tradeCalc.get(tr.id);
    let fullNet = 0;
    if (c?.ok) fullNet = c.netQAR;
    else if (tr.manualBuyPrice) fullNet = tr.amountUSDT * tr.sellPriceQAR - tr.amountUSDT * tr.manualBuyPrice - tr.feeQAR;
    if (tr.linkedDealId || tr.linkedRelId) return fullNet * (tr.merchantPct ?? 100) / 100;
    return fullNet;
  };

  const trendData = useMemo(() => {
    const sorted = [...allTrades].sort((a, b) => a.ts - b.ts).slice(-14);
    return sorted.map((tr, i) => ({
      idx: i + 1,
      date: new Date(tr.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      revenue: Math.round(tr.amountUSDT * tr.sellPriceQAR),
      profit: Math.round(tradeNet(tr)),
    }));
  }, [allTrades, derived]);

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--panel2)', border: '1px solid var(--line)', borderRadius: 6, padding: '6px 10px', fontSize: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 3 }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <span>{p.name}</span>
            <span className="mono" style={{ fontWeight: 700 }}>{fmtTotal(Number(p.value))} QAR</span>
          </div>
        ))}
      </div>
    );
  };

  const badgeStyle = (condition: string) => {
    const color = condition === 'good' ? 'var(--good)' : condition === 'bad' ? 'var(--bad)' : 'var(--warn)';
    return { color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` };
  };

  return (
    <div className="tracker-root" dir={t.isRTL ? 'rtl' : 'ltr'} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      {/* 🔐 Admin Banner */}
      {isAdmin && (
        <div style={{ padding: '6px 12px', background: 'var(--brand3)', border: '1px solid var(--brand)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)' }}>🛡️ ADMIN MODE ACTIVE ({user?.email})</span>
          <span className="mono" style={{ fontSize: 9, opacity: 0.7 }}>PROMOTED TO ROLE: ADMIN</span>
        </div>
      )}

      {/* ── ROW 1: KPI Bands (This Month / Last Month) ── */}
      <div className="kpi-band-grid">
        <div className="kpi-band">
          <div className="kpi-band-title">{t('tradingVolume')}</div>
          <div className="kpi-band-cols">
            <div>
              <div className="kpi-period">{t('thisMonth')}</div>
              <div className="kpi-cell-val t1v">{fmtQWithUnit(dM.rev)}</div>
              <div className="kpi-cell-sub">{dM.count} {t('trades')} · {fmtU(dM.qty, 0)} USDT</div>
            </div>
            <div>
              <div className="kpi-period">{t('lastMonth')}</div>
              <div className="kpi-cell-val t1v">{fmtQWithUnit(dL.rev)}</div>
              <div className="kpi-cell-sub">{dL.count} {t('trades')} · {fmtU(dL.qty, 0)} USDT</div>
            </div>
          </div>
        </div>
        <div className="kpi-band">
          <div className="kpi-band-title">{t('netProfit')}</div>
          <div className="kpi-band-cols">
            <div>
              <div className="kpi-period">{t('thisMonth')}</div>
              <div className={`kpi-cell-val ${dM.net >= 0 ? 'good' : 'bad'}`}>{fmtQWithUnit(dM.net)}</div>
              <div className="kpi-cell-sub">{t('fees')} {fmtQWithUnit(dM.fee)}</div>
            </div>
            <div>
              <div className="kpi-period">{t('lastMonth')}</div>
              <div className={`kpi-cell-val ${dL.net >= 0 ? 'good' : 'bad'}`}>{fmtQWithUnit(dL.net)}</div>
              <div className="kpi-cell-sub">{t('fees')} {fmtQWithUnit(dL.fee)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Trading Intelligence ── */}
      <div className="kpis">
        <div className="kpi-card">
          <div className="kpi-head"><span className="kpi-badge" style={badgeStyle(dR.net >= 0 ? 'good' : 'bad')}>{rLabel}</span></div>
          <div className="kpi-lbl">{t('netProfitLabel')}</div>
          <div className={`kpi-val ${dR.net >= 0 ? 'good' : 'bad'}`}>{fmtQWithUnit(dR.net)}</div>
          <div className="kpi-sub">{dR.count} {t('trades')} · {fmtQ(dR.rev)} {t('revSuffix')}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head"><span className="kpi-badge" style={badgeStyle(avgM >= 1 ? 'good' : avgM >= 0 ? 'warn' : 'bad')}>{allTrades.length} {t('trades')}</span></div>
          <div className="kpi-lbl">{t('avgMargin')}</div>
          <div className={`kpi-val ${avgM >= 1 ? 'good' : avgM >= 0 ? 'warn' : 'bad'}`}>{fmtPct(avgM)}</div>
          <div className="kpi-sub">{dR.count} in range · avg {fmtPct(dR.avgMgn)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head"><span className="kpi-badge" style={badgeStyle(isLow ? 'bad' : 'good')}>{isLow ? t('low') : t('ok')}</span></div>
          <div className="kpi-lbl">{t('availableUsdt')}</div>
          <div className={`kpi-val ${isLow ? 'bad' : 'good'}`} style={isLow ? { animation: 'tracker-blink 1.5s infinite' } : undefined}>{fmtU(stk, 0)}</div>
          <div className="kpi-sub">{t('liquidUsdt')} ready for deployment</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head"><span className="kpi-badge" style={{ color: 'var(--brand)', borderColor: 'color-mix(in srgb,var(--brand) 30%,transparent)', background: 'var(--brand3)' }}>{t('avPrice')}</span></div>
          <div className="kpi-lbl">{t('avPriceSpread')}</div>
          <div className="kpi-val" style={{ fontSize: 16, color: 'var(--t2)' }}>{wacop ? fmtP(wacop) + ' QAR' : t('noStock')}</div>
          <div className="kpi-sub">
            {(() => {
              const sp = wacop && p2pAvgs.avgSell ? fmtPrice((p2pAvgs.avgSell - wacop) / wacop * 100) : null;
              return sp !== null ? <span className={Number(sp) >= 0 ? 'good' : 'bad'} style={{ fontWeight: 700 }}>{Number(sp) >= 0 ? '+' : ''}{sp}% vs P2P</span> : t('sellAboveAvPrice');
            })()}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Liquidity & Position ── */}
      <div className="kpis" style={{ marginTop: 0 }}>
        <div className="kpi-card" style={{ cursor: !isAdminViewProp ? 'pointer' : 'default' }} onClick={!isAdminViewProp ? () => navigate('/trading/stock?tab=cash') : undefined}>
          <div className="kpi-head"><span className="kpi-badge" style={{ color: 'var(--warn)', background: 'color-mix(in srgb,var(--warn) 10%,transparent)' }}>💰 {t('cash')}</span></div>
          <div className="kpi-lbl">{t('cashAvailable')}</div>
          <div className="kpi-val" style={{ color: 'var(--warn)' }}>{fmtQWithUnit(deriveCashQAR(state.cashAccounts || [], state.cashLedger || []) || num(state.cashQAR, 0))}</div>
          <div className="kpi-sub">{!isAdminViewProp && <span style={{ fontSize: 9, color: 'var(--brand)', fontWeight: 600 }}>→ {t('openCashMgmt')}</span>}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head"><span className="kpi-badge" style={{ color: 'var(--t5)', background: 'color-mix(in srgb,var(--t5) 10%,transparent)' }}>@{t('avPrice')}</span></div>
          <div className="kpi-lbl">{t('buyingPower')}</div>
          <div className="kpi-val" style={{ color: 'var(--t5)' }}>{wacop && (num(state.cashQAR, 0) > 0) ? fmtU(num(state.cashQAR, 0) / wacop, 0) + ' USDT' : fmtQ(num(state.cashQAR, 0))}</div>
          <div className="kpi-sub">@ {wacop ? fmtP(wacop) : '3.7'} QAR</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head"><span className="kpi-badge" style={{ color: 'var(--good)', background: 'color-mix(in srgb,var(--good) 10%,transparent)' }}>{t('net')}</span></div>
          <div className="kpi-lbl">{t('netPosition')}</div>
          <div className="kpi-val good">{fmtQWithUnit(stCost + num(state.cashQAR, 0))}</div>
          <div className="kpi-sub">{t('stock')} {fmtQRaw(stCost)} QAR + {t('cash')} {fmtQRaw(num(state.cashQAR, 0))} QAR</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head"><span className="kpi-badge" style={{ color: 'var(--muted)', background: 'color-mix(in srgb,var(--muted) 10%,transparent)' }}>{state.batches.length} {t('batchSuffix')}</span></div>
          <div className="kpi-lbl">{t('stockCostEst')}</div>
          <div className="kpi-val" style={{ color: 'var(--text)' }}>{fmtQWithUnit(stCost)}</div>
          <div className="kpi-sub">{t('avPrice')} {wacop ? fmtP(wacop) : '3.7'} QAR</div>
        </div>
      </div>

      {/* ── ROW 4: ROI · Cycle Time · Merchant Net ── */}
      <div className="kpis" style={{ marginTop: 0 }}>
        {(() => {
          const roiData = roiPeriod === '7d' ? d7 : d30;
          const roiVal = stCost > 0 ? (roiData.net / stCost) * 100 : 0;
          const isExpanded = expandedNewKpi === 'roi';
          return (
            <div className="kpi-card" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setExpandedNewKpi(isExpanded ? null : 'roi')}>
              <div className="kpi-head"><span className="kpi-badge" style={{ color: 'var(--good)', background: 'color-mix(in srgb,var(--good) 10%,transparent)' }}>💹</span></div>
              <div className="kpi-lbl">{t('roiLabel') || 'ROI'}</div>
              <div className={`kpi-val ${roiVal >= 0 ? 'good' : 'bad'}`}>{fmtPrice(roiVal)}%</div>
              <div className="kpi-sub">Net profit + total invested</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4, alignItems: 'center' }}>
                <span className="kpi-badge" style={{ fontSize: 9, padding: '1px 6px', opacity: roiPeriod === '7d' ? 1 : 0.5 }} onClick={(e) => { e.stopPropagation(); setRoiPeriod('7d'); }}>7D</span>
                <span className="kpi-badge" style={{ fontSize: 9, padding: '1px 6px', opacity: roiPeriod === '30d' ? 1 : 0.5 }} onClick={(e) => { e.stopPropagation(); setRoiPeriod('30d'); }}>30D</span>
                <span style={{ fontSize: 9, color: 'var(--warn)', marginLeft: 'auto' }}>💡 {isExpanded ? 'collapse' : 'tap to expand'}</span>
              </div>
            </div>
          );
        })()}
        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => setExpandedNewKpi(expandedNewKpi === 'cycle' ? null : 'cycle')}>
          <div className="kpi-head"><span className="kpi-badge" style={{ color: 'var(--warn)', background: 'color-mix(in srgb,var(--warn) 10%,transparent)' }}>⏱️</span></div>
          <div className="kpi-lbl">{t('avgCycleTime') || 'AVG CYCLE TIME'}</div>
          <div className="kpi-val" style={{ color: 'var(--warn)' }}>{cycleHours !== null ? `${fmtTotal(cycleHours)}h` : '—'}</div>
          <div className="kpi-sub">Batch purchase → FIFO sell</div>
        </div>
        {merchantDealKpis && (
          <>
            <div className="kpi-card">
              <div className="kpi-head"><span className="kpi-badge" style={{ color: 'var(--brand)', background: 'var(--brand3)' }}>📤 {merchantDealKpis.outCount} deals</span></div>
              <div className="kpi-lbl">{t('outgoingNet') || 'OUTGOING NET'}</div>
              <div className={`kpi-val ${merchantDealKpis.outNet >= 0 ? 'good' : 'bad'}`}>{fmtQWithUnit(merchantDealKpis.outNet)}</div>
              <div className="kpi-sub">My cut: {fmtQRaw(merchantDealKpis.totalMyShare)} QAR</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-head"><span className="kpi-badge" style={{ color: 'var(--good)', background: 'color-mix(in srgb,var(--good) 10%,transparent)' }}>📥 {merchantDealKpis.inCount} deals</span></div>
              <div className="kpi-lbl">{t('incomingNet') || 'INCOMING NET'}</div>
              <div className={`kpi-val ${merchantDealKpis.inNet >= 0 ? 'good' : 'bad'}`}>{fmtQWithUnit(merchantDealKpis.inNet)}</div>
              <div className="kpi-sub">My cut: {fmtQRaw(merchantDealKpis.totalMyShare)} QAR</div>
            </div>
          </>
        )}
      </div>

      <div className="dash-bottom">
        <div className="panel">
          <div className="panel-head"><h2>{t('profitRevenueTrend')}</h2><span className="pill">{t('last14Trades')}</span></div>
          <div className="panel-body" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" name={t('volume')} stroke="#6366f1" fill="#6366f133" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="profit" name={t('netProfitLabel')} stroke="#22c55e" fill="#22c55e33" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showCashBox && !isAdminViewProp && <CashBoxManager currentCash={num(state.cashQAR, 0)} currentOwner={state.cashOwner || ''} cashHistory={state.cashHistory || []} onSave={handleCashSave} onClose={() => setShowCashBox(false)} />}
    </div>
  );
}

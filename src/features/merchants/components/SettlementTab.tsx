import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { useSettlementPeriods, useSyncSettlementPeriods, type SettlementPeriod } from '@/hooks/useSettlementPeriods';
import { useDealCapital, useReinvestProfit, usePayoutProfit } from '@/hooks/useDealCapital';
import { useSettlements, useApproveSettlement, type Settlement } from '@/hooks/useSettlements';
import { fmtU } from '@/lib/tracker-helpers';
import { toast } from 'sonner';
import type { Cadence } from '@/lib/settlement-periods';
import { DecisionCard } from './DecisionCard';
import '@/styles/tracker.css';

interface DealInfo {
  id: string;
  title: string;
  deal_type: string;
  settlement_cadence: string;
  amount: number;
  created_at: string;
}

interface Props {
  relationshipId: string;
  deals: DealInfo[];
  isPartner: boolean;
  trades: Array<{
    id: string;
    ts: number;
    linkedDealId?: string;
    amountUSDT: number;
    sellPriceQAR: number;
    feeQAR: number;
    voided: boolean;
  }>;
  tradeCalc: Map<string, any>;
}

function PeriodCard({ period, dealAmount, relationshipId, isPartner, dealType }: {
  period: SettlementPeriod;
  dealAmount: number;
  relationshipId: string;
  isPartner: boolean;
  dealType: string;
}) {
  const t = useT();
  const { data: capital } = useDealCapital(period.deal_id, dealAmount);
  const reinvest = useReinvestProfit();
  const payout = usePayoutProfit();

  const statusCls = period.status === 'settled' ? 'good'
    : period.status === 'overdue' ? 'bad'
    : period.status === 'due' ? 'warn'
    : '';

  const poolBalance = capital?.reinvestedPool || 0;

  const handlePayout = async () => {
    if (period.partner_amount <= 0) return;
    try {
      await payout.mutateAsync({
        deal_id: period.deal_id,
        relationship_id: relationshipId,
        period_id: period.id,
        amount: period.partner_amount,
        currency: 'USDT',
        current_pool_balance: poolBalance,
      });
      toast.success(t('paidOutToPartner'));
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReinvest = async () => {
    if (period.partner_amount <= 0) return;
    try {
      await reinvest.mutateAsync({
        deal_id: period.deal_id,
        relationship_id: relationshipId,
        period_id: period.id,
        amount: period.partner_amount,
        currency: 'USDT',
        current_pool_balance: poolBalance,
      });
      toast.success(t('reinvestedToPool'));
    } catch (err: any) { toast.error(err.message); }
  };

  const showActions = (period.status === 'due' || period.status === 'overdue') && period.partner_amount > 0;

  const renderActions = () => {
    if (!showActions) return null;

    if (dealType === 'arbitrage') {
      // Sales Deal: merchant (non-partner) settles
      if (!isPartner) {
        return (
          <button className="btn" onClick={handlePayout} disabled={payout.isPending} style={{ fontSize: 10 }}>
            💰 {t('settleAmount')} {fmtU(period.partner_amount)}
          </button>
        );
      }
      return (
        <div style={{ fontSize: 10, color: 'var(--muted)' }}>
          {t('waitingForMerchantToSettle')}
        </div>
      );
    }

    if (dealType === 'partnership') {
      // Profit Share: lender (partner) decides
      if (isPartner) {
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" onClick={handlePayout} disabled={payout.isPending} style={{ fontSize: 10 }}>
              💰 {t('takeProfit')} {fmtU(period.partner_amount)}
            </button>
            <button className="btn" onClick={handleReinvest} disabled={reinvest.isPending} style={{ fontSize: 10 }}>
              🔄 {t('addToCapital')} {fmtU(period.partner_amount)}
            </button>
          </div>
        );
      }
      return (
        <div style={{ fontSize: 10, color: 'var(--muted)' }}>
          {t('waitingForLenderDecision')}
        </div>
      );
    }

    // Fallback for other types
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn" onClick={handlePayout} disabled={payout.isPending} style={{ fontSize: 10 }}>
          💰 {t('payOut')} {fmtU(period.partner_amount)}
        </button>
        <button className="btn" onClick={handleReinvest} disabled={reinvest.isPending} style={{ fontSize: 10 }}>
          🔄 {t('reinvest')} {fmtU(period.partner_amount)}
        </button>
      </div>
    );
  };

  return (
    <div className="panel" style={{ padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{period.deal_title || '—'}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            {period.period_key} · {period.cadence === 'per_order' ? t('perTrade') : period.cadence === 'weekly' ? t('weekly') : t('monthly')}
          </div>
        </div>
        <span className={`pill ${statusCls}`}>
          {period.status === 'overdue' && '⚠️ '}{period.status}
        </span>
      </div>

      {/* Trade metrics */}
      <div style={{ display: 'flex', gap: 16, fontSize: 10, marginBottom: 8 }}>
        <div><span style={{ color: 'var(--muted)' }}>{t('periodTrades')}:</span> <span className="mono">{period.trade_count}</span></div>
        <div><span style={{ color: 'var(--muted)' }}>{t('periodVolume')}:</span> <span className="mono">{fmtU(period.gross_volume)}</span></div>
        <div><span style={{ color: 'var(--muted)' }}>{t('periodProfit')}:</span> <span className="mono" style={{ color: period.net_profit >= 0 ? 'var(--good)' : 'var(--bad)' }}>{fmtU(period.net_profit)}</span></div>
      </div>

      {/* Capital context */}
      {capital && (
        <div style={{ display: 'flex', gap: 16, fontSize: 10, marginBottom: 8, color: 'var(--muted)' }}>
          <div>{t('originalPrincipal')}: <span className="mono">{fmtU(capital.originalPrincipal)}</span></div>
          <div>{t('reinvestedPool')}: <span className="mono">{fmtU(capital.reinvestedPool)}</span></div>
          <div>{t('workingCapital')}: <span className="mono" style={{ fontWeight: 700, color: 'var(--fg)' }}>{fmtU(capital.workingCapital)}</span></div>
        </div>
      )}

      {/* Allocation */}
      <div style={{ display: 'flex', gap: 16, fontSize: 10, marginBottom: 8 }}>
        <div>{t('partnerShare')}: <span className="mono" style={{ fontWeight: 700 }}>{fmtU(period.partner_amount)}</span></div>
        <div>{t('merchantShareDist')}: <span className="mono">{fmtU(period.merchant_amount)}</span></div>
      </div>

      {/* Actions or resolution */}
      {period.status === 'settled' ? (
        <div style={{ fontSize: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="pill good">
            {period.resolution === 'payout'
              ? '💰 ' + t('paidOutToPartner')
              : period.resolution === 'withdrawal'
                ? '📤 ' + t('withdrawnByPartner')
                : '🔄 ' + t('reinvestedToPool')}
          </span>
          <span className="mono" style={{ color: 'var(--good)' }}>{fmtU(period.settled_amount)}</span>
        </div>
      ) : (
        renderActions()
      )}

      {period.status === 'overdue' && (
        <div style={{ fontSize: 9, color: 'var(--bad)', marginTop: 4 }}>⚠️ {t('graceExpired')}</div>
      )}

      {/* Monthly profit handling decisions (operator priority only) */}
      {dealType === 'partnership' && (period.status === 'due' || period.status === 'overdue' || period.status === 'settled') && (
        <DecisionCard periodId={period.id} periodKey={period.period_key} />
      )}
    </div>
  );
}

// ─── Settlement Record Row ───────────────────────────────────────────
// Displays a single merchant_settlements record with approve/reject lifecycle.
function SettlementRecordRow({ record, relationshipId, isPartner, periodIdForRecord }: {
  record: Settlement;
  relationshipId: string;
  isPartner: boolean;
  /** settlement_periods.id linked to this record (needed for period reopening on rejection) */
  periodIdForRecord?: string;
}) {
  const t = useT();
  const approve = useApproveSettlement();

  const statusCls = record.status === 'approved' ? 'good'
    : record.status === 'rejected' ? 'bad'
    : 'warn'; // pending

  const handleApprove = async () => {
    try {
      await approve.mutateAsync({ id: record.id, approved: true, relationship_id: relationshipId });
      toast.success(t('settlementApproved') || 'Settlement approved');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async () => {
    try {
      await approve.mutateAsync({
        id: record.id,
        approved: false,
        period_id: periodIdForRecord,
        relationship_id: relationshipId,
      });
      toast.success(t('settlementRejected') || 'Settlement rejected — period reopened');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderBottom: '1px solid var(--line)', fontSize: 11 }}>
      <span className={`pill ${statusCls}`} style={{ minWidth: 64, textAlign: 'center', flexShrink: 0 }}>
        {record.status}
      </span>
      <span className="mono" style={{ fontWeight: 700, flexShrink: 0 }}>
        {fmtU(record.amount)} {record.currency}
      </span>
      <span style={{ color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {record.deal_title || record.deal_id?.slice(0, 8)} {record.notes ? `· ${record.notes}` : ''}
      </span>
      <span style={{ color: 'var(--muted)', flexShrink: 0, fontSize: 10 }}>
        {record.created_at ? new Date(record.created_at).toLocaleDateString() : ''}
      </span>
      {record.status === 'pending' && !isPartner && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            className="btn"
            onClick={handleApprove}
            disabled={approve.isPending}
            style={{ fontSize: 9, padding: '2px 8px', background: 'var(--good)', border: 'none' }}
          >
            ✓ {t('approve') || 'Approve'}
          </button>
          <button
            className="btn"
            onClick={handleReject}
            disabled={approve.isPending}
            style={{ fontSize: 9, padding: '2px 8px', background: 'var(--bad)', border: 'none' }}
          >
            ✕ {t('reject') || 'Reject'}
          </button>
        </div>
      )}
    </div>
  );
}

export function SettlementTab({ relationshipId, deals, isPartner, trades, tradeCalc }: Props) {
  const t = useT();
  const { data: periods, isLoading } = useSettlementPeriods(relationshipId);
  const syncPeriods = useSyncSettlementPeriods(relationshipId);
  const { data: settlementRecords } = useSettlements(relationshipId);
  const [filterDealId, setFilterDealId] = useState<string>('all');
  const [showHistory, setShowHistory] = useState(false);

  // Build a map: settlement.id → period.id (for period reopening on rejection)
  const settlementToPeriodMap = new Map<string, string>();
  (periods || []).forEach(p => {
    if ((p as any).settlement_id) {
      settlementToPeriodMap.set((p as any).settlement_id, p.id);
    }
  });

  // Sync periods on mount with real trade data
  useEffect(() => {
    if (deals.length > 0) {
      syncPeriods.mutate({
        deals: deals.map(d => ({
          id: d.id,
          settlement_cadence: (d.settlement_cadence || 'monthly') as Cadence,
          created_at: d.created_at,
        })),
        trades,
        tradeCalc,
      });
    }
  }, [deals.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = (periods || []).filter(p =>
    filterDealId === 'all' || p.deal_id === filterDealId
  );

  const dueCount = filtered.filter(p => p.status === 'due').length;
  const overdueCount = filtered.filter(p => p.status === 'overdue').length;
  const settledCount = filtered.filter(p => p.status === 'settled').length;
  const totalSettled = filtered.filter(p => p.status === 'settled').reduce((s, p) => s + Number(p.settled_amount), 0);

  const dealAmountMap = new Map(deals.map(d => [d.id, d.amount]));
  const dealTypeMap = new Map(deals.map(d => [d.id, d.deal_type]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* KPI summary */}
      <div className="kpi-band">
        <div className="kpi-band-title">{t('settlementTracker')}</div>
        <div className="kpi-band-cols">
          <div>
            <div className="kpi-period">{t('dueNow')}</div>
            <div className="kpi-cell-val" style={{ color: dueCount > 0 ? 'var(--warn-text, orange)' : 'var(--muted)' }}>{dueCount}</div>
          </div>
          <div>
            <div className="kpi-period">{t('overdueSettlement')}</div>
            <div className="kpi-cell-val" style={{ color: overdueCount > 0 ? 'var(--bad)' : 'var(--muted)' }}>{overdueCount}</div>
          </div>
          <div>
            <div className="kpi-period">{t('settled')}</div>
            <div className="kpi-cell-val">{settledCount}</div>
          </div>
          <div>
            <div className="kpi-period">{t('totalSettled')}</div>
            <div className="kpi-cell-val" style={{ color: 'var(--good)' }}>{fmtU(totalSettled)}</div>
          </div>
        </div>
      </div>

      {/* Deal filter */}
      {deals.length > 1 && (
        <select
          value={filterDealId}
          onChange={e => setFilterDealId(e.target.value)}
          className="w-full p-2 text-xs border rounded bg-background text-foreground"
          style={{ maxWidth: 300 }}
        >
          <option value="all">{t('allDeals') || 'All Deals'}</option>
          {deals.map(d => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
      )}

      {/* Period cards */}
      {isLoading ? (
        <div className="empty"><div className="empty-t">{t('loading') || '...'}</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-t">{t('noDeals')}</div>
          <div className="empty-s">{t('createDealsFromWorkspace')}</div>
        </div>
      ) : (
        filtered.map(p => (
          <PeriodCard
            key={p.id}
            period={p}
            dealAmount={dealAmountMap.get(p.deal_id) || 0}
            relationshipId={relationshipId}
            isPartner={isPartner}
            dealType={dealTypeMap.get(p.deal_id) || p.deal_type || 'partnership'}
          />
        ))
      )}

      {/* ─── Settlement Records Lifecycle ──────────────────────────── */}
      {/* Renders merchant_settlements records with approve/reject actions.
          This closes the lifecycle gap for records created by:
          - addTrade(settleImmediately=true)
          - usePayoutProfit() (payout path)
          - useWithdrawFromPool() (partner withdrawal)
      */}
      {(settlementRecords && settlementRecords.length > 0) && (() => {
        const pending = settlementRecords.filter(r => r.status === 'pending');
        const history = settlementRecords.filter(r => r.status !== 'pending');
        return (
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div className="panel-head">
              <span style={{ fontSize: 11, fontWeight: 700 }}>
                {t('settlementRecords') || 'Settlement Records'}
                {pending.length > 0 && (
                  <span className="pill warn" style={{ marginLeft: 6, fontSize: 9 }}>
                    {pending.length} {t('pending') || 'pending'}
                  </span>
                )}
              </span>
              {history.length > 0 && (
                <button
                  className="pill"
                  onClick={() => setShowHistory(h => !h)}
                  style={{ fontSize: 9, cursor: 'pointer' }}
                >
                  {showHistory ? (t('hideHistory') || 'Hide history') : `${t('viewHistory') || 'History'} (${history.length})`}
                </button>
              )}
            </div>
            <div>
              {pending.length === 0 && !showHistory && (
                <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--muted)' }}>
                  {t('noSettlementsPending') || 'No pending settlements.'}
                </div>
              )}
              {pending.map(r => (
                <SettlementRecordRow
                  key={r.id}
                  record={r}
                  relationshipId={relationshipId}
                  isPartner={isPartner}
                  periodIdForRecord={settlementToPeriodMap.get(r.id)}
                />
              ))}
              {showHistory && history.map(r => (
                <SettlementRecordRow
                  key={r.id}
                  record={r}
                  relationshipId={relationshipId}
                  isPartner={isPartner}
                />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

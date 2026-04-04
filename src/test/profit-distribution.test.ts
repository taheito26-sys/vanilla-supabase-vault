import { describe, expect, it } from 'vitest';

import { resolveDealDistributionAmounts } from '@/hooks/useProfitDistribution';

describe('resolveDealDistributionAmounts', () => {
  it('falls back to settlement period totals when realized_pnl is null for profit-share deals', () => {
    const result = resolveDealDistributionAmounts({
      allocationBase: 'net_profit',
      partnerPct: 40,
      realizedPnl: null,
      totalOrderVolume: 100,
      periodTotals: {
        totalNetProfit: 50,
        totalPartnerAmount: 20,
        totalMerchantAmount: 30,
      },
    });

    expect(result.totalNetProfit).toBe(50);
    expect(result.partnerOwed).toBe(20);
    expect(result.merchantOwed).toBe(30);
  });

  it('prefers settlement period totals when profit-share period data exists', () => {
    const result = resolveDealDistributionAmounts({
      allocationBase: 'net_profit',
      partnerPct: 40,
      realizedPnl: 0,
      totalOrderVolume: 100,
      periodTotals: {
        totalNetProfit: 50,
        totalPartnerAmount: 20,
        totalMerchantAmount: 30,
      },
    });

    expect(result.totalNetProfit).toBe(50);
    expect(result.partnerOwed).toBe(20);
    expect(result.merchantOwed).toBe(30);
  });

  it('uses sale economics for sales-deal allocations', () => {
    const result = resolveDealDistributionAmounts({
      allocationBase: 'sale_economics',
      partnerPct: 60,
      realizedPnl: null,
      totalOrderVolume: 150,
    });

    expect(result.totalNetProfit).toBe(0);
    expect(result.partnerOwed).toBe(90);
    expect(result.merchantOwed).toBe(60);
  });
});

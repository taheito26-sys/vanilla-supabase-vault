// Production-ready tracker state bootstrap — loads imported/local state first, then cloud
import { computeFIFO, type TrackerState, type DerivedState } from './tracker-helpers';
import { getCurrentTrackerState } from './tracker-backup';

interface StateOverrides {
  lowStockThreshold?: number;
  priceAlertThreshold?: number;
  range?: string;
  currency?: 'QAR' | 'USDT';
}

function readTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function getStateEntityCount(state: Partial<TrackerState> | null): number {
  if (!state) return 0;
  return (state.trades?.length ?? 0)
    + (state.batches?.length ?? 0)
    + (state.customers?.length ?? 0)
    + (state.cashAccounts?.length ?? 0)
    + (state.cashLedger?.length ?? 0)
    + (state.cashHistory?.length ?? 0);
}

function getLatestActivityTs(state: Partial<TrackerState> | null): number {
  if (!state) return 0;

  let latest = 0;
  const scan = (items: unknown[] | undefined, fields: string[]) => {
    for (const item of items || []) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      for (const field of fields) {
        latest = Math.max(latest, readTimestamp(row[field]));
      }
    }
  };

  scan(state.trades, ['ts', 'updated_at', 'created_at']);
  scan(state.batches, ['ts', 'updated_at', 'created_at']);
  scan(state.customers, ['updated_at', 'created_at']);
  scan(state.cashAccounts, ['updated_at', 'created_at', 'lastReconciled']);
  scan(state.cashLedger, ['ts', 'updated_at', 'created_at']);
  scan(state.cashHistory, ['ts', 'updated_at', 'created_at']);

  return latest;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function loadStoredTrackerState(): Partial<TrackerState> | null {
  if (typeof window === 'undefined') return null;

  const stored = getCurrentTrackerState(window.localStorage);
  if (!stored || typeof stored !== 'object') return null;

  const candidate = stored as Partial<TrackerState>;
  if (!Array.isArray(candidate.batches) && !Array.isArray(candidate.trades) && !Array.isArray(candidate.customers)) {
    return null;
  }

  return candidate;
}

/** Build a TrackerState from a source (local or cloud), with overrides */
export function buildStateFrom(
  stored: Partial<TrackerState> | null,
  overrides?: StateOverrides,
): { state: TrackerState; derived: DerivedState } {
  const now = new Date();

  const state: TrackerState = {
    currency: overrides?.currency ?? (stored?.currency === 'USDT' ? 'USDT' : 'QAR'),
    range: overrides?.range ?? (typeof stored?.range === 'string' ? stored.range : '7d'),
    batches: Array.isArray(stored?.batches) ? stored.batches : [],
    trades: Array.isArray(stored?.trades) ? stored.trades : [],
    customers: Array.isArray(stored?.customers) ? stored.customers : [],
    cashQAR: asNumber(stored?.cashQAR, 0),
    cashOwner: typeof stored?.cashOwner === 'string' ? stored.cashOwner : '',
    cashHistory: Array.isArray(stored?.cashHistory) ? stored.cashHistory : [],
    cashAccounts: Array.isArray(stored?.cashAccounts) ? stored.cashAccounts : [],
    cashLedger: Array.isArray(stored?.cashLedger) ? stored.cashLedger : [],
    settings: {
      lowStockThreshold: overrides?.lowStockThreshold ?? asNumber(stored?.settings?.lowStockThreshold, 5000),
      priceAlertThreshold: overrides?.priceAlertThreshold ?? asNumber(stored?.settings?.priceAlertThreshold, 2),
    },
    cal: {
      year: asNumber(stored?.cal?.year, now.getFullYear()),
      month: asNumber(stored?.cal?.month, now.getMonth()),
      selectedDay: typeof stored?.cal?.selectedDay === 'number' ? stored.cal.selectedDay : null,
    },
  };

  const derived = computeFIFO(state.batches, state.trades);
  return { state, derived };
}

/** Pick the freshest source first, then fall back to richer state. */
export function mergeLocalAndCloud(
  local: Partial<TrackerState> | null,
  cloud: Partial<TrackerState> | null,
): Partial<TrackerState> | null {
  if (!cloud && !local) return null;
  if (!cloud) return local;
  if (!local) return cloud;

  const localLatest = getLatestActivityTs(local);
  const cloudLatest = getLatestActivityTs(cloud);
  if (cloudLatest !== localLatest) {
    return cloudLatest > localLatest ? cloud : local;
  }

  const localCount = getStateEntityCount(local);
  const cloudCount = getStateEntityCount(cloud);

  return cloudCount >= localCount ? cloud : local;
}

export function createEmptyState(overrides?: StateOverrides): { state: TrackerState; derived: DerivedState } {
  const stored = loadStoredTrackerState();
  return buildStateFrom(stored, overrides);
}

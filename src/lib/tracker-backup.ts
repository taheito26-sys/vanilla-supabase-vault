const TRACKER_STATE_KEYS = [
  'tracker_state',
  'p2p_tracker_state',
  'p2p_tracker',
  'taheito_tracker_state',
  'taheito_state',
] as const;

const TRACKER_STATE_PREFIXES = ['taheito', 'p2p_tracker'] as const;

const TRACKER_CLEAR_EXACT_KEYS = [
  'tracker_state',
  'tracker_settings',
  'tracker_logs',
  'p2p_tracker_state',
  'p2p_tracker',
  'taheito_tracker_state',
  'taheito_state',
  'p2p_tracker_vault_meta',
] as const;
const TRACKER_STORAGE_SCHEMA_VERSION = '2026-04-04-orders-cache-reset-v1';
const TRACKER_STORAGE_SCHEMA_VERSION_KEY = 'tracker_storage_schema_version';

const IMPORT_STATE_CANDIDATE_KEYS = [
  'state',
  'trackerState',
  'tracker_state',
  'data',
  'payload',
  'appState',
  'backup',
  'snapshot',
  'content',
] as const;

export const AUTO_BACKUP_KEYS = ['gasAutoSave', 'trackerAutoBackup', 'taheitoAutoBackup'] as const;
const CANONICAL_TRACKER_STATE_KEY = TRACKER_STATE_KEYS[0];

export type TrackerState = Record<string, unknown>;

function storageKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key) keys.push(key);
  }
  return keys;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function looksLikeTrackerState(value: unknown): value is TrackerState {
  if (!isObject(value)) return false;
  if (Array.isArray(value.trades) || Array.isArray(value.batches) || Array.isArray(value.customers)) return true;
  return false;
}

function extractFromSnapshots(value: Record<string, unknown>): TrackerState | null {
  if (Array.isArray(value.snapshots)) {
    for (const snap of value.snapshots) {
      if (isObject(snap) && looksLikeTrackerState(snap.state)) {
        return snap.state;
      }
    }
  }
  if (Array.isArray(value.versions)) {
    for (const version of value.versions) {
      if (isObject(version) && looksLikeTrackerState(version.state)) return version.state;
      if (isObject(version) && isObject(version.content) && looksLikeTrackerState(version.content.state)) return version.content.state;
    }
  }
  return null;
}

function getStateEntityCount(value: TrackerState): number {
  const trades = Array.isArray(value.trades) ? value.trades.length : 0;
  const batches = Array.isArray(value.batches) ? value.batches.length : 0;
  const customers = Array.isArray(value.customers) ? value.customers.length : 0;
  const cashAccounts = Array.isArray(value.cashAccounts) ? value.cashAccounts.length : 0;
  const cashLedger = Array.isArray(value.cashLedger) ? value.cashLedger.length : 0;
  return trades + batches + customers + cashAccounts + cashLedger;
}

function readTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function getMostRecentActivityTs(value: TrackerState): number {
  let latest = 0;

  const scan = (items: unknown[] | undefined, fields: string[]) => {
    for (const item of items || []) {
      if (!isObject(item)) continue;
      for (const field of fields) {
        latest = Math.max(latest, readTimestamp(item[field]));
      }
    }
  };

  scan(Array.isArray(value.trades) ? value.trades : undefined, ['ts', 'updated_at', 'created_at']);
  scan(Array.isArray(value.batches) ? value.batches : undefined, ['ts', 'updated_at', 'created_at']);
  scan(Array.isArray(value.customers) ? value.customers : undefined, ['updated_at', 'created_at']);
  scan(Array.isArray(value.cashLedger) ? value.cashLedger : undefined, ['ts', 'updated_at', 'created_at']);
  scan(Array.isArray(value.cashAccounts) ? value.cashAccounts : undefined, ['updated_at', 'created_at', 'lastReconciled']);
  scan(Array.isArray(value.cashHistory) ? value.cashHistory : undefined, ['ts', 'updated_at', 'created_at']);

  return latest;
}

type TrackerStorageCandidate = {
  key: string;
  state: TrackerState;
  entityCount: number;
  latestActivityTs: number;
};

function getTrackerStorageCandidates(storage: Storage): TrackerStorageCandidate[] {
  const candidates: TrackerStorageCandidate[] = [];

  for (const key of storageKeys(storage)) {
    const isTrackerKey =
      TRACKER_STATE_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
      TRACKER_STATE_KEYS.includes(key as any);
    if (!isTrackerKey) continue;

    const rawValue = storage.getItem(key);
    if (!rawValue) continue;

    try {
      const state = normalizeImportedTrackerState(JSON.parse(rawValue));
      candidates.push({
        key,
        entityCount: getStateEntityCount(state),
        latestActivityTs: getMostRecentActivityTs(state),
        state,
      });
    } catch {
      // Ignore malformed legacy cache blobs.
    }
  }

  return candidates.sort((a, b) => {
    if (b.entityCount !== a.entityCount) return b.entityCount - a.entityCount;
    if (b.latestActivityTs !== a.latestActivityTs) return b.latestActivityTs - a.latestActivityTs;
    if (a.key === CANONICAL_TRACKER_STATE_KEY) return -1;
    if (b.key === CANONICAL_TRACKER_STATE_KEY) return 1;
    return a.key.localeCompare(b.key);
  });
}

export function normalizeImportedTrackerState(raw: unknown): TrackerState {
  if (looksLikeTrackerState(raw)) return raw;
  if (!isObject(raw)) throw new Error('Invalid backup format');

  const fromSnapshots = extractFromSnapshots(raw);
  if (fromSnapshots) return fromSnapshots;

  for (const key of IMPORT_STATE_CANDIDATE_KEYS) {
    const candidate = raw[key];
    if (looksLikeTrackerState(candidate)) return candidate;
    if (isObject(candidate)) {
      for (const nestedKey of IMPORT_STATE_CANDIDATE_KEYS) {
        const nested = candidate[nestedKey];
        if (looksLikeTrackerState(nested)) return nested;
      }
    }
  }

  throw new Error('Invalid backup format');
}

export function findTrackerStorageKey(storage: Storage): string {
  const [bestCandidate] = getTrackerStorageCandidates(storage);
  return bestCandidate?.key || CANONICAL_TRACKER_STATE_KEY;
}

export function getCurrentTrackerState(storage: Storage): TrackerState {
  try {
    const [bestCandidate] = getTrackerStorageCandidates(storage);
    return bestCandidate?.state ?? {};
  } catch {
    return {};
  }
}

export function loadAutoBackupFromStorage(storage: Storage): boolean {
  for (const key of AUTO_BACKUP_KEYS) {
    const value = storage.getItem(key);
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return false;
}

export function saveAutoBackupToStorage(storage: Storage, value: boolean): void {
  for (const key of AUTO_BACKUP_KEYS) storage.setItem(key, String(value));
}

export function listTrackerKeysToClear(storage: Storage): string[] {
  const keys = new Set<string>([
    ...TRACKER_CLEAR_EXACT_KEYS,
    ...AUTO_BACKUP_KEYS,
  ]);

  for (const key of storageKeys(storage)) {
    if (TRACKER_STATE_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.add(key);
    if (key.startsWith('tracker_')) keys.add(key);
  }

  return Array.from(keys);
}

export function clearTrackerStorage(storage: Storage): void {
  for (const key of listTrackerKeysToClear(storage)) {
    storage.removeItem(key);
  }
}

export function enforceTrackerStorageSchema(storage: Storage): boolean {
  try {
    const current = storage.getItem(TRACKER_STORAGE_SCHEMA_VERSION_KEY);
    if (current === TRACKER_STORAGE_SCHEMA_VERSION) return false;
    clearTrackerStorage(storage);
    storage.setItem(TRACKER_STORAGE_SCHEMA_VERSION_KEY, TRACKER_STORAGE_SCHEMA_VERSION);
    return true;
  } catch {
    return false;
  }
}

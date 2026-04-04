import { describe, expect, it } from 'vitest';
import { findTrackerStorageKey, getCurrentTrackerState } from '@/lib/tracker-backup';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('tracker-backup cache selection', () => {
  it('prefers the richer tracker state instead of the first legacy key', () => {
    const storage = new MemoryStorage();

    storage.setItem('taheito_state', JSON.stringify({
      trades: [{ id: 'old-trade', ts: Date.parse('2026-03-01T00:00:00Z') }],
      batches: [],
      customers: [],
    }));

    storage.setItem('tracker_state', JSON.stringify({
      trades: [
        { id: 'new-trade-1', ts: Date.parse('2026-04-04T10:00:00Z') },
        { id: 'new-trade-2', ts: Date.parse('2026-04-04T11:00:00Z') },
      ],
      batches: [{ id: 'batch-1', ts: Date.parse('2026-04-04T09:00:00Z') }],
      customers: [{ id: 'customer-1' }],
    }));

    expect(findTrackerStorageKey(storage)).toBe('tracker_state');
    expect((getCurrentTrackerState(storage).trades as unknown[])).toHaveLength(2);
  });

  it('breaks equal-count ties using the most recent activity timestamp', () => {
    const storage = new MemoryStorage();

    storage.setItem('taheito_tracker_state', JSON.stringify({
      trades: [{ id: 'older', ts: Date.parse('2026-04-03T08:00:00Z') }],
      batches: [],
      customers: [],
    }));

    storage.setItem('p2p_tracker_state', JSON.stringify({
      trades: [{ id: 'newer', ts: Date.parse('2026-04-04T08:00:00Z') }],
      batches: [],
      customers: [],
    }));

    expect(findTrackerStorageKey(storage)).toBe('p2p_tracker_state');
    expect((getCurrentTrackerState(storage).trades as Array<{ id: string }>)[0]?.id).toBe('newer');
  });
});

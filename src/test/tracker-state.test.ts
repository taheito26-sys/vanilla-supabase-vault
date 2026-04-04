import { describe, expect, it } from 'vitest';
import { mergeLocalAndCloud } from '@/lib/tracker-state';

describe('mergeLocalAndCloud', () => {
  it('prefers fresher cloud activity even when local has more rows', () => {
    const local = {
      trades: [
        { id: 'local-old-1', ts: Date.parse('2026-04-01T08:00:00Z') },
        { id: 'local-old-2', ts: Date.parse('2026-04-01T09:00:00Z') },
      ],
      batches: [{ id: 'batch-old', ts: Date.parse('2026-04-01T07:00:00Z') }],
      customers: [{ id: 'customer-old' }],
    };

    const cloud = {
      trades: [{ id: 'cloud-new', ts: Date.parse('2026-04-04T12:00:00Z') }],
      batches: [],
      customers: [],
    };

    expect(mergeLocalAndCloud(local as any, cloud as any)).toEqual(cloud);
  });

  it('falls back to richer cloud state when timestamps tie or are absent', () => {
    const local = {
      trades: [{ id: 'local-1' }],
      batches: [],
      customers: [],
    };

    const cloud = {
      trades: [{ id: 'cloud-1' }, { id: 'cloud-2' }],
      batches: [{ id: 'cloud-batch' }],
      customers: [],
    };

    expect(mergeLocalAndCloud(local as any, cloud as any)).toEqual(cloud);
  });
});

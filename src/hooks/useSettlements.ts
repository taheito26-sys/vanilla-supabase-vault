import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { useEffect } from 'react';

export interface Settlement {
  id: string;
  deal_id: string;
  relationship_id: string | null;
  amount: number;
  currency: string;
  settled_by: string;
  notes: string | null;
  status: string;
  created_at: string;
  deal_title?: string;
  deal_type?: string;
}

export function useSettlements(relationshipId?: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['settlements', relationshipId],
    queryFn: async (): Promise<Settlement[]> => {
      let q = supabase
        .from('merchant_settlements')
        .select('*')
        .order('created_at', { ascending: false });

      if (relationshipId) {
        q = q.eq('relationship_id', relationshipId);
      }

      const { data, error } = await q;
      if (error) throw error;

      const dealIds = [...new Set((data || []).map(s => s.deal_id))];
      const dealMap = new Map<string, { title: string; deal_type: string }>();
      if (dealIds.length > 0) {
        const { data: deals } = await supabase
          .from('merchant_deals')
          .select('id, title, deal_type')
          .in('id', dealIds);
        (deals || []).forEach(d => dealMap.set(d.id, { title: d.title, deal_type: d.deal_type }));
      }

      return (data || []).map(s => ({
        ...s,
        deal_title: dealMap.get(s.deal_id)?.title,
        deal_type: dealMap.get(s.deal_id)?.deal_type,
      }));
    },
    enabled: !!userId,
  });

  // Realtime
  useEffect(() => {
    if (!relationshipId) return;
    const channel = supabase
      .channel(`settlements:${relationshipId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'merchant_settlements', filter: `relationship_id=eq.${relationshipId}` }, () => {
        qc.invalidateQueries({ queryKey: ['settlements', relationshipId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relationshipId, qc]);

  return query;
}
export function useSubmitSettlement() {
  const qc = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      deal_id: string;
      relationship_id: string;
      amount: number;
      currency: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('merchant_settlements')
        .insert({
          deal_id: input.deal_id,
          relationship_id: input.relationship_id as any,
          amount: input.amount,
          currency: input.currency,
          settled_by: userId!,
          notes: input.notes || null,
          status: 'pending' as any,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['settlements', vars.relationship_id] });
      qc.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}

export function useApproveSettlement() {
  const qc = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      approved: boolean;
      /** When provided and approved=false, reopen the linked settlement period */
      period_id?: string;
      relationship_id?: string;
    }) => {
      // Idempotency guard: only act on pending settlements
      const { data: existing, error: fetchErr } = await supabase
        .from('merchant_settlements')
        .select('status')
        .eq('id', input.id)
        .single();
      if (fetchErr) throw fetchErr;
      if ((existing as any)?.status !== 'pending') {
        throw new Error(`Settlement is already ${(existing as any)?.status} — cannot modify.`);
      }

      const newStatus = input.approved ? 'approved' : 'rejected';

      const { error } = await supabase
        .from('merchant_settlements')
        .update({ status: newStatus } as any)
        .eq('id', input.id);
      if (error) throw error;

      // Reconciliation: on rejection, reverse ledger entries and reopen the linked period
      if (!input.approved && input.period_id) {
        // Fetch all ledger entries linked to this period
        const { data: ledgerEntries, error: ledgerErr } = await supabase
          .from('deal_capital_ledger')
          .select('*')
          .eq('period_id', input.period_id)
          .in('type', ['payout', 'reinvest', 'withdrawal']);
        if (ledgerErr) throw ledgerErr;

        // Create compensating reversal entries for each ledger entry
        if (ledgerEntries && ledgerEntries.length > 0) {
          for (const entry of ledgerEntries) {
            const reversalAmount = -(entry as any).amount;
            let newPoolBalance = (entry as any).pool_balance_after;

            // Calculate the pool balance after reversal, accounting for operation type
            if ((entry as any).type === 'payout') {
              // Payouts do not change the pool balance, so the reversal should preserve it.
              newPoolBalance = (entry as any).pool_balance_after;
            } else if ((entry as any).type === 'reinvest') {
              // Reinvest reversal removes the reinvested amount
              newPoolBalance = (entry as any).pool_balance_after - (entry as any).amount;
            } else if ((entry as any).type === 'withdrawal') {
              // Withdrawal reversal restores the withdrawn amount
              newPoolBalance = (entry as any).pool_balance_after + (entry as any).amount;
            }

            const { error: reversalErr } = await supabase
              .from('deal_capital_ledger')
              .insert({
                deal_id: (entry as any).deal_id,
                relationship_id: (entry as any).relationship_id,
                type: 'reversal',
                amount: reversalAmount,
                currency: (entry as any).currency,
                period_id: (entry as any).period_id,
                initiated_by: userId!,
                pool_balance_after: newPoolBalance,
                note: `Reversal of rejected ${(entry as any).type}`,
              } as any);
            if (reversalErr) throw reversalErr;
          }
        }

        // Reopen the linked period so it can be settled again
        const { error: periodErr } = await supabase
          .from('settlement_periods')
          .update({
            status: 'due',
            resolution: null,
            resolved_by: null,
            resolved_at: null,
            settlement_id: null,
            settled_amount: 0,
          } as any)
          .eq('id', input.period_id);
        if (periodErr) throw periodErr;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['settlements'] });
      if (vars.relationship_id) {
        qc.invalidateQueries({ queryKey: ['settlement-periods', vars.relationship_id] });
        qc.invalidateQueries({ queryKey: ['settlements', vars.relationship_id] });
      }
    },
  });
}

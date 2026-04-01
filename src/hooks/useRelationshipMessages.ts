import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { useEffect } from 'react';

export interface Message {
  id: string;
  relationship_id: string;
  sender_user_id: string;
  sender_merchant_id: string;
  sender_id: string; // alias for sender_merchant_id
  body: string;
  content: string; // alias for body
  message_type: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null; // derived from is_read
  created_at: string;
  expires_at?: string | null;
}

export function useRelationshipMessages(relationshipId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', relationshipId],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('merchant_messages')
        .select('*')
        .eq('relationship_id', relationshipId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((m: any) => ({
        ...m,
        sender_id: m.sender_merchant_id,
        content: m.body,
        read_at: m.is_read ? m.created_at : null,
      })) as Message[];
    },
    enabled: !!relationshipId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!relationshipId) return;

    const channel = supabase
      .channel(`messages:${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'merchant_messages',
          filter: `relationship_id=eq.${relationshipId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['messages', relationshipId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [relationshipId, qc]);

  return query;
}

export function useSendMessage() {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { relationship_id: string; content: string }) => {
      const { error } = await supabase
        .from('merchant_messages')
        .insert({
          relationship_id: input.relationship_id,
          sender_id: userId!,
          content: input.content,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['messages', vars.relationship_id] });
    },
  });
}
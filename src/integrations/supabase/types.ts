export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          reason: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      capital_transfers: {
        Row: {
          amount: number
          cost_basis: number
          created_at: string
          currency: string
          deal_id: string
          direction: string
          id: string
          note: string | null
          relationship_id: string
          total_cost: number
          transferred_by: string
        }
        Insert: {
          amount?: number
          cost_basis?: number
          created_at?: string
          currency?: string
          deal_id: string
          direction: string
          id?: string
          note?: string | null
          relationship_id: string
          total_cost?: number
          transferred_by: string
        }
        Update: {
          amount?: number
          cost_basis?: number
          created_at?: string
          currency?: string
          deal_id?: string
          direction?: string
          id?: string
          note?: string | null
          relationship_id?: string
          total_cost?: number
          transferred_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_transfers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "merchant_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_transfers_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "merchant_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_accounts: {
        Row: {
          bank_name: string | null
          branch: string | null
          created_at: string
          currency: string
          id: string
          name: string
          notes: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_name?: string | null
          branch?: string | null
          created_at?: string
          currency?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_name?: string | null
          branch?: string | null
          created_at?: string
          currency?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_ledger: {
        Row: {
          account_id: string
          amount: number
          batch_id: string | null
          created_at: string
          direction: string
          id: string
          note: string | null
          reference_id: string | null
          source: string | null
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount?: number
          batch_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          source?: string | null
          type?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          batch_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          source?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_action_items: {
        Row: {
          assigned_to: string | null
          created_at: string
          due_at: string | null
          id: string
          message_id: string | null
          room_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          message_id?: string | null
          room_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          message_id?: string | null
          room_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_action_items_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "call_history_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_action_items_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "os_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_action_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_room_summary_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_action_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "os_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_tracker_links: {
        Row: {
          created_at: string
          id: string
          room_id: string | null
          tracker_entity_id: string
          tracker_entity_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id?: string | null
          tracker_entity_id?: string
          tracker_entity_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string | null
          tracker_entity_id?: string
          tracker_entity_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_tracker_links_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_room_summary_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_tracker_links_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "os_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_capital_ledger: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deal_id: string
          id: string
          initiated_by: string
          note: string | null
          period_id: string | null
          pool_balance_after: number
          relationship_id: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id: string
          id?: string
          initiated_by: string
          note?: string | null
          period_id?: string | null
          pool_balance_after?: number
          relationship_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id?: string
          id?: string
          initiated_by?: string
          note?: string | null
          period_id?: string | null
          pool_balance_after?: number
          relationship_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_capital_ledger_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "merchant_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_capital_ledger_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "merchant_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_approvals: {
        Row: {
          created_at: string
          id: string
          proposed_payload: Json | null
          relationship_id: string
          resolution_note: string | null
          resolved_at: string | null
          reviewer_user_id: string | null
          status: string
          submitted_at: string | null
          submitted_by_merchant_id: string
          submitted_by_user_id: string
          target_entity_id: string
          target_entity_type: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposed_payload?: Json | null
          relationship_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          reviewer_user_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_merchant_id: string
          submitted_by_user_id: string
          target_entity_id?: string
          target_entity_type?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          proposed_payload?: Json | null
          relationship_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          reviewer_user_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_merchant_id?: string
          submitted_by_user_id?: string
          target_entity_id?: string
          target_entity_type?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_approvals_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "merchant_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_deals: {
        Row: {
          amount: number
          close_date: string | null
          created_at: string
          created_by: string
          currency: string
          deal_type: string
          due_date: string | null
          expected_return: number | null
          id: string
          issue_date: string | null
          metadata: Json | null
          notes: string | null
          realized_pnl: number | null
          relationship_id: string
          settlement_cadence: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          close_date?: string | null
          created_at?: string
          created_by: string
          currency?: string
          deal_type?: string
          due_date?: string | null
          expected_return?: number | null
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          notes?: string | null
          realized_pnl?: number | null
          relationship_id: string
          settlement_cadence?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          close_date?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          deal_type?: string
          due_date?: string | null
          expected_return?: number | null
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          notes?: string | null
          realized_pnl?: number | null
          relationship_id?: string
          settlement_cadence?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_deals_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "merchant_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_invites: {
        Row: {
          created_at: string
          expires_at: string | null
          from_merchant_id: string
          id: string
          message: string
          purpose: string
          requested_role: string
          requested_scope: string[] | null
          status: string
          to_merchant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          from_merchant_id: string
          id?: string
          message?: string
          purpose?: string
          requested_role?: string
          requested_scope?: string[] | null
          status?: string
          to_merchant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          from_merchant_id?: string
          id?: string
          message?: string
          purpose?: string
          requested_role?: string
          requested_scope?: string[] | null
          status?: string
          to_merchant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      merchant_liquidity_profiles: {
        Row: {
          auto_sync_enabled: boolean
          cash_publish_mode: string
          cash_range_max: number | null
          cash_range_min: number | null
          cash_status: string
          created_at: string
          expires_at: string | null
          id: string
          last_published_at: string | null
          merchant_id: string
          publish_cash_enabled: boolean
          publish_usdt_enabled: boolean
          published_cash_amount: number | null
          published_usdt_amount: number | null
          reserve_buffer_cash: number
          reserve_buffer_usdt: number
          reserved_cash_commitments: number
          reserved_usdt_commitments: number
          status: string
          updated_at: string
          usdt_publish_mode: string
          usdt_range_max: number | null
          usdt_range_min: number | null
          usdt_status: string
          user_id: string
          visibility_scope: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          cash_publish_mode?: string
          cash_range_max?: number | null
          cash_range_min?: number | null
          cash_status?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_published_at?: string | null
          merchant_id: string
          publish_cash_enabled?: boolean
          publish_usdt_enabled?: boolean
          published_cash_amount?: number | null
          published_usdt_amount?: number | null
          reserve_buffer_cash?: number
          reserve_buffer_usdt?: number
          reserved_cash_commitments?: number
          reserved_usdt_commitments?: number
          status?: string
          updated_at?: string
          usdt_publish_mode?: string
          usdt_range_max?: number | null
          usdt_range_min?: number | null
          usdt_status?: string
          user_id: string
          visibility_scope?: string
        }
        Update: {
          auto_sync_enabled?: boolean
          cash_publish_mode?: string
          cash_range_max?: number | null
          cash_range_min?: number | null
          cash_status?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_published_at?: string | null
          merchant_id?: string
          publish_cash_enabled?: boolean
          publish_usdt_enabled?: boolean
          published_cash_amount?: number | null
          published_usdt_amount?: number | null
          reserve_buffer_cash?: number
          reserve_buffer_usdt?: number
          reserved_cash_commitments?: number
          reserved_usdt_commitments?: number
          status?: string
          updated_at?: string
          usdt_publish_mode?: string
          usdt_range_max?: number | null
          usdt_range_min?: number | null
          usdt_status?: string
          user_id?: string
          visibility_scope?: string
        }
        Relationships: []
      }
      merchant_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          metadata: Json | null
          relationship_id: string
          sender_merchant_id: string
          sender_user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          metadata?: Json | null
          relationship_id: string
          sender_merchant_id: string
          sender_user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          metadata?: Json | null
          relationship_id?: string
          sender_merchant_id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_messages_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "merchant_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_profiles: {
        Row: {
          bio: string | null
          created_at: string
          default_currency: string
          display_name: string
          id: string
          merchant_code: string | null
          merchant_id: string
          nickname: string
          region: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          default_currency?: string
          display_name?: string
          id?: string
          merchant_code?: string | null
          merchant_id: string
          nickname?: string
          region?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          default_currency?: string
          display_name?: string
          id?: string
          merchant_code?: string | null
          merchant_id?: string
          nickname?: string
          region?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      merchant_profits: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deal_id: string
          id: string
          notes: string | null
          recorded_by: string
          relationship_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id: string
          id?: string
          notes?: string | null
          recorded_by: string
          relationship_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id?: string
          id?: string
          notes?: string | null
          recorded_by?: string
          relationship_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_profits_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "merchant_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_profits_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "merchant_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_relationships: {
        Row: {
          approval_policy: Json | null
          created_at: string
          id: string
          invite_id: string | null
          merchant_a_id: string
          merchant_b_id: string
          relationship_type: string
          shared_fields: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          approval_policy?: Json | null
          created_at?: string
          id?: string
          invite_id?: string | null
          merchant_a_id: string
          merchant_b_id: string
          relationship_type?: string
          shared_fields?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          approval_policy?: Json | null
          created_at?: string
          id?: string
          invite_id?: string | null
          merchant_a_id?: string
          merchant_b_id?: string
          relationship_type?: string
          shared_fields?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      merchant_settlements: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deal_id: string
          id: string
          notes: string | null
          relationship_id: string | null
          settled_by: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id: string
          id?: string
          notes?: string | null
          relationship_id?: string | null
          settled_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id?: string
          id?: string
          notes?: string | null
          relationship_id?: string | null
          settled_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_settlements_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "merchant_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_settlements_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "merchant_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          merchant_id: string | null
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          message_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "os_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "call_history_v"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          anchor_id: string | null
          body: string | null
          category: string
          conversation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message_id: string | null
          read_at: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          target_focus: string | null
          target_path: string | null
          target_tab: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          anchor_id?: string | null
          body?: string | null
          category?: string
          conversation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_focus?: string | null
          target_path?: string | null
          target_tab?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          anchor_id?: string | null
          body?: string | null
          category?: string
          conversation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_focus?: string | null
          target_path?: string | null
          target_tab?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_allocations: {
        Row: {
          agreement_ratio_snapshot: string | null
          allocated_usdt: number
          allocation_cost: number
          allocation_fee: number
          allocation_net: number
          allocation_revenue: number
          created_at: string
          deal_terms_snapshot: Json | null
          family: string
          fee_share: number
          id: string
          merchant_amount: number
          merchant_cost_per_usdt: number
          merchant_id: string
          merchant_share_pct: number
          note: string | null
          order_id: string
          partner_amount: number
          partner_share_pct: number
          profit_share_agreement_id: string | null
          relationship_id: string
          sale_group_id: string
          sell_price: number
          status: string
          updated_at: string
        }
        Insert: {
          agreement_ratio_snapshot?: string | null
          allocated_usdt?: number
          allocation_cost?: number
          allocation_fee?: number
          allocation_net?: number
          allocation_revenue?: number
          created_at?: string
          deal_terms_snapshot?: Json | null
          family?: string
          fee_share?: number
          id?: string
          merchant_amount?: number
          merchant_cost_per_usdt?: number
          merchant_id: string
          merchant_share_pct?: number
          note?: string | null
          order_id: string
          partner_amount?: number
          partner_share_pct?: number
          profit_share_agreement_id?: string | null
          relationship_id: string
          sale_group_id: string
          sell_price?: number
          status?: string
          updated_at?: string
        }
        Update: {
          agreement_ratio_snapshot?: string | null
          allocated_usdt?: number
          allocation_cost?: number
          allocation_fee?: number
          allocation_net?: number
          allocation_revenue?: number
          created_at?: string
          deal_terms_snapshot?: Json | null
          family?: string
          fee_share?: number
          id?: string
          merchant_amount?: number
          merchant_cost_per_usdt?: number
          merchant_id?: string
          merchant_share_pct?: number
          note?: string | null
          order_id?: string
          partner_amount?: number
          partner_share_pct?: number
          profit_share_agreement_id?: string | null
          relationship_id?: string
          sale_group_id?: string
          sell_price?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_allocations_profit_share_agreement_id_fkey"
            columns: ["profit_share_agreement_id"]
            isOneToOne: false
            referencedRelation: "profit_share_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_allocations_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "merchant_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      os_business_objects: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          object_id: string
          object_type: string
          room_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          object_id?: string
          object_type?: string
          room_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          object_id?: string
          object_type?: string
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_business_objects_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "os_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      os_messages: {
        Row: {
          body_json: Json | null
          client_nonce: string | null
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          expires_at: string | null
          id: string
          message_type: string
          reactions: Json | null
          read_at: string | null
          reply_to_message_id: string | null
          room_id: string
          sender_merchant_id: string | null
          updated_at: string
        }
        Insert: {
          body_json?: Json | null
          client_nonce?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          expires_at?: string | null
          id?: string
          message_type?: string
          reactions?: Json | null
          read_at?: string | null
          reply_to_message_id?: string | null
          room_id: string
          sender_merchant_id?: string | null
          updated_at?: string
        }
        Update: {
          body_json?: Json | null
          client_nonce?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          expires_at?: string | null
          id?: string
          message_type?: string
          reactions?: Json | null
          read_at?: string | null
          reply_to_message_id?: string | null
          room_id?: string
          sender_merchant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "os_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      os_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lane: string
          name: string
          relationship_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lane?: string
          name?: string
          relationship_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lane?: string
          name?: string
          relationship_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      p2p_snapshots: {
        Row: {
          created_at: string
          data: Json
          fetched_at: string
          id: string
          market: string
        }
        Insert: {
          created_at?: string
          data?: Json
          fetched_at?: string
          id?: string
          market: string
        }
        Update: {
          created_at?: string
          data?: Json
          fetched_at?: string
          id?: string
          market?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string | null
          id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profit_share_agreements: {
        Row: {
          agreement_type: string
          approved_at: string | null
          approved_by: string | null
          counterparty_default_profit_handling: string
          created_at: string
          created_by: string
          effective_from: string
          expires_at: string | null
          id: string
          invested_capital: number | null
          lender_contribution: number | null
          merchant_ratio: number
          notes: string | null
          operator_contribution: number | null
          operator_default_profit_handling: string
          operator_merchant_id: string | null
          operator_ratio: number | null
          partner_ratio: number
          relationship_id: string
          settlement_cadence: string
          settlement_way: string | null
          status: string
          terms_snapshot: Json | null
          updated_at: string
        }
        Insert: {
          agreement_type?: string
          approved_at?: string | null
          approved_by?: string | null
          counterparty_default_profit_handling?: string
          created_at?: string
          created_by: string
          effective_from?: string
          expires_at?: string | null
          id?: string
          invested_capital?: number | null
          lender_contribution?: number | null
          merchant_ratio?: number
          notes?: string | null
          operator_contribution?: number | null
          operator_default_profit_handling?: string
          operator_merchant_id?: string | null
          operator_ratio?: number | null
          partner_ratio?: number
          relationship_id: string
          settlement_cadence?: string
          settlement_way?: string | null
          status?: string
          terms_snapshot?: Json | null
          updated_at?: string
        }
        Update: {
          agreement_type?: string
          approved_at?: string | null
          approved_by?: string | null
          counterparty_default_profit_handling?: string
          created_at?: string
          created_by?: string
          effective_from?: string
          expires_at?: string | null
          id?: string
          invested_capital?: number | null
          lender_contribution?: number | null
          merchant_ratio?: number
          notes?: string | null
          operator_contribution?: number | null
          operator_default_profit_handling?: string
          operator_merchant_id?: string | null
          operator_ratio?: number | null
          partner_ratio?: number
          relationship_id?: string
          settlement_cadence?: string
          settlement_way?: string | null
          status?: string
          terms_snapshot?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profit_share_agreements_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "merchant_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_decisions: {
        Row: {
          agreement_id: string
          created_at: string
          decision: string
          decision_confirmed_at: string | null
          decision_due_at: string | null
          default_behavior: string
          effective_capital_after: number
          effective_capital_before: number
          finalization_snapshot: Json | null
          finalized_at: string | null
          id: string
          merchant_id: string
          profit_amount: number
          reinvested_amount: number
          role: string
          settlement_period_id: string
          updated_at: string
          withdrawn_amount: number
        }
        Insert: {
          agreement_id: string
          created_at?: string
          decision?: string
          decision_confirmed_at?: string | null
          decision_due_at?: string | null
          default_behavior?: string
          effective_capital_after?: number
          effective_capital_before?: number
          finalization_snapshot?: Json | null
          finalized_at?: string | null
          id?: string
          merchant_id: string
          profit_amount?: number
          reinvested_amount?: number
          role?: string
          settlement_period_id: string
          updated_at?: string
          withdrawn_amount?: number
        }
        Update: {
          agreement_id?: string
          created_at?: string
          decision?: string
          decision_confirmed_at?: string | null
          decision_due_at?: string | null
          default_behavior?: string
          effective_capital_after?: number
          effective_capital_before?: number
          finalization_snapshot?: Json | null
          finalized_at?: string | null
          id?: string
          merchant_id?: string
          profit_amount?: number
          reinvested_amount?: number
          role?: string
          settlement_period_id?: string
          updated_at?: string
          withdrawn_amount?: number
        }
        Relationships: []
      }
      settlement_periods: {
        Row: {
          cadence: string
          created_at: string
          deal_id: string
          due_at: string | null
          gross_volume: number
          id: string
          merchant_amount: number
          net_profit: number
          partner_amount: number
          period_end: string
          period_key: string
          period_start: string
          relationship_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          settled_amount: number
          settled_at: string | null
          settlement_id: string | null
          status: string
          total_cost: number
          total_fees: number
          trade_count: number
          updated_at: string
        }
        Insert: {
          cadence?: string
          created_at?: string
          deal_id: string
          due_at?: string | null
          gross_volume?: number
          id?: string
          merchant_amount?: number
          net_profit?: number
          partner_amount?: number
          period_end: string
          period_key: string
          period_start: string
          relationship_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          settled_amount?: number
          settled_at?: string | null
          settlement_id?: string | null
          status?: string
          total_cost?: number
          total_fees?: number
          trade_count?: number
          updated_at?: string
        }
        Update: {
          cadence?: string
          created_at?: string
          deal_id?: string
          due_at?: string | null
          gross_volume?: number
          id?: string
          merchant_amount?: number
          net_profit?: number
          partner_amount?: number
          period_end?: string
          period_key?: string
          period_start?: string
          relationship_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          settled_amount?: number
          settled_at?: string | null
          settlement_id?: string | null
          status?: string
          total_cost?: number
          total_fees?: number
          trade_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_periods_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "merchant_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_periods_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "merchant_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_snapshots: {
        Row: {
          id: string
          preferences: Json | null
          state: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          preferences?: Json | null
          state?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          preferences?: Json | null
          state?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      typing_presence: {
        Row: {
          id: string
          merchant_id: string | null
          room_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          id?: string
          merchant_id?: string | null
          room_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          id?: string
          merchant_id?: string | null
          room_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_presence_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            isOneToOne: false
            referencedRelation: "os_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      call_history_v: {
        Row: {
          caller_id: string | null
          ended_at: string | null
          id: string | null
          room_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          caller_id?: string | null
          ended_at?: string | null
          id?: string | null
          room_id?: string | null
          started_at?: string | null
          status?: never
        }
        Update: {
          caller_id?: string | null
          ended_at?: string | null
          id?: string | null
          room_id?: string | null
          started_at?: string | null
          status?: never
        }
        Relationships: [
          {
            foreignKeyName: "os_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_room_summary_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "os_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_summary_v: {
        Row: {
          id: string | null
          lane: string | null
          last_message_at: string | null
          last_message_content: string | null
          name: string | null
          relationship_id: string | null
          type: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          lane?: string | null
          last_message_at?: never
          last_message_content?: never
          name?: string | null
          relationship_id?: string | null
          type?: string | null
          unread_count?: never
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          lane?: string | null
          last_message_at?: never
          last_message_content?: never
          name?: string | null
          relationship_id?: string | null
          type?: string | null
          unread_count?: never
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_merchant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_relationship_member: { Args: { rel_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

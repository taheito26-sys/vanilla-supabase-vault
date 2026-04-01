# Project Memory

## Core
Do NOT modify the Supabase database schema — tables, columns, RLS policies, etc. are locked.
merchant_messages uses: body (not content), sender_merchant_id (not sender_id), is_read (not read_at).
admin_audit_logs uses: actor_id (not admin_user_id).

## Memories
- [DB constraint](mem://constraints/no-db-changes) — Never alter database schema

-- Migration 045: Composite indexes for high-frequency queries
-- Optimizes multi-column filtering and sorting across high-traffic tables.
-- Each statement uses IF NOT EXISTS for idempotency.

-- ============================================================================
-- 1. CONVERSATIONS
-- ============================================================================

-- Inbox filter: account + status (e.g. open vs closed tickets)
CREATE INDEX IF NOT EXISTS idx_conversations_account_status
  ON conversations(account_id, status);

-- Inbox filter: assigned agent within account
CREATE INDEX IF NOT EXISTS idx_conversations_account_agent
  ON conversations(account_id, assigned_agent_id)
  WHERE assigned_agent_id IS NOT NULL;

-- Inbox sort: recent conversations by last_message_at
CREATE INDEX IF NOT EXISTS idx_conversations_account_last_msg
  ON conversations(account_id, last_message_at DESC NULLS LAST);

-- ============================================================================
-- 2. CONTACTS
-- ============================================================================

-- Fast lookup by normalized phone within account
CREATE INDEX IF NOT EXISTS idx_contacts_account_phone
  ON contacts(account_id, phone_normalized);

-- Filter contacts by linked company within account
CREATE INDEX IF NOT EXISTS idx_contacts_account_company
  ON contacts(account_id, company_id)
  WHERE company_id IS NOT NULL;

-- Paginated contacts list sorted by created_at
CREATE INDEX IF NOT EXISTS idx_contacts_account_created
  ON contacts(account_id, created_at DESC);

-- ============================================================================
-- 3. AUTOMATIONS
-- ============================================================================

-- Webhook inbound hot path: active automations by trigger type
CREATE INDEX IF NOT EXISTS idx_automations_account_active_trigger
  ON automations(account_id, trigger_type)
  WHERE is_active = true;

-- ============================================================================
-- 4. MESSAGES
-- ============================================================================

-- Message thread pagination and fetch
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);

-- ============================================================================
-- 5. BROADCASTS & RECIPIENTS
-- ============================================================================

-- Aggregation of recipient status per broadcast
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_status
  ON broadcast_recipients(broadcast_id, status);

-- Resuming pending/failed broadcast recipients
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_pending
  ON broadcast_recipients(broadcast_id, id)
  WHERE status IN ('pending', 'processing');

-- ============================================================================
-- 6. PIPELINES & DEALS
-- ============================================================================

-- Pipeline kanban board: deals grouped by pipeline and stage
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_stage
  ON deals(pipeline_id, stage_id);

-- Pipeline deals by status
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_status
  ON deals(pipeline_id, status);

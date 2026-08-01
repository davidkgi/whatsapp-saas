-- ============================================================================
-- Adds `n8n` to the integration_provider enum so a workspace can route the
-- agent "brain" to an external n8n workflow (see
-- src/features/inbox/services/n8n-agent.ts).
--
-- Additive + idempotent. Kept in its OWN migration on purpose: a new enum value
-- cannot be used in the same transaction it is added in, so no row referencing
-- 'n8n' may be inserted here — the workspace integration row is created later
-- from the app (or the SQL snippet in IMPLEMENTACION-n8n-y-deploy.md).
-- ============================================================================

ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'n8n';

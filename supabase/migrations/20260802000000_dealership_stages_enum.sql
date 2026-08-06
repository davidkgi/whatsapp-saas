-- ============================================================================
-- Adds the dealership pipeline stages to the contact_stage enum.
-- Additive + idempotent. Kept in its OWN migration: new enum values cannot be
-- used in the same transaction they're added in, so the remap lives in the
-- next migration file (which runs as a separate transaction).
-- Legacy values (new/engaged/qualified/customer/lost) are kept for compatibility.
-- ============================================================================

ALTER TYPE contact_stage ADD VALUE IF NOT EXISTS 'nuevo';
ALTER TYPE contact_stage ADD VALUE IF NOT EXISTS 'contactado';
ALTER TYPE contact_stage ADD VALUE IF NOT EXISTS 'calificado';
ALTER TYPE contact_stage ADD VALUE IF NOT EXISTS 'cotizacion';
ALTER TYPE contact_stage ADD VALUE IF NOT EXISTS 'test_drive';
ALTER TYPE contact_stage ADD VALUE IF NOT EXISTS 'negociacion';
ALTER TYPE contact_stage ADD VALUE IF NOT EXISTS 'ganado';
ALTER TYPE contact_stage ADD VALUE IF NOT EXISTS 'perdido';

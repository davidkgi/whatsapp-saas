-- ============================================================================
-- New contacts default to 'nuevo', and any existing legacy-valued rows are
-- remapped to the dealership stages. Safe to run once the enum values above
-- are committed (separate migration = separate transaction).
-- ============================================================================

ALTER TABLE contacts ALTER COLUMN stage SET DEFAULT 'nuevo';

UPDATE contacts SET stage = 'nuevo'      WHERE stage = 'new';
UPDATE contacts SET stage = 'contactado' WHERE stage = 'engaged';
UPDATE contacts SET stage = 'calificado' WHERE stage = 'qualified';
UPDATE contacts SET stage = 'ganado'     WHERE stage = 'customer';
UPDATE contacts SET stage = 'perdido'    WHERE stage = 'lost';
